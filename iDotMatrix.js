import { WebBluetoothAdapter } from "./bluetooth/WebBluetoothAdapter.js";
import { WebCanvasAdapter } from "./canvas/WebCanvasAdapter.js";
import { encodeMediaBlocks, encodeDIYBlocks, decodeNotification } from "./protocol/frames.js";

export class iDotMatrix {
  #SERVICE_UUID = 0x00fa;
  #WRITE_CHAR_UUID = 0xfa02;
  #NOTIFY_CHAR_UUID = 0xfa03;

  #MIN_VALUE = -128;
  #CHUNK_SIZE = 20;
  #ackTimeoutMs = 5000;
  #operationTail = Promise.resolve();
  #activeTransfer = null;
  #listeners = new Map();

  #crcTable;

  constructor(options = {}) {
    for (const key of ['bluetooth', 'canvas']) {
      if (Object.hasOwn(options, key)) {
        throw new TypeError(`Use ${key}adapter instead of ${key}`);
      }
    }
    this.ble = options.bluetoothadapter ?? new WebBluetoothAdapter();
    // Keep explicitly configured UUIDs (some hardware variants differ).
    this.ble.service_uuid ??= this.#SERVICE_UUID;
    this.ble.write_uuid   ??= this.#WRITE_CHAR_UUID;
    this.ble.notify_uuid  ??= this.#NOTIFY_CHAR_UUID;
    
    // Node.js has no DOM; users can inject NodeCanvasAdapter or use createNodeMatrix().
    this.canvas = options.canvasadapter ??
      ((typeof document !== 'undefined' || typeof OffscreenCanvas !== 'undefined')
        ? new WebCanvasAdapter({ width: options.width ?? 16, height: options.height ?? 16 })
        : null);
    this.width = options.width ?? this.canvas?.width ?? 16;
    this.height = options.height ?? this.canvas?.height ?? 16;
    this._notificationHandler = buffer => this.#event_characteristicvaluechanged(buffer);
    this._disconnectHandler = () => {
      this.#rejectTransfer(new Error('[Matrix] BLE link lost during transfer'));
      this.emit('disconnected');
    };
    this._offBLEDisconnect = typeof this.ble.onDisconnect === 'function'
      ? this.ble.onDisconnect(this._disconnectHandler) : null;
    this._allowReconnect = true;

    this.throwErrors = options.throwErrors ?? true;
    // ATT payload capacity is not the negotiated MTU. Use an adapter-safe limit.
    this.#CHUNK_SIZE = options.fragmentSize ?? 20;
    if (!Number.isInteger(this.#CHUNK_SIZE) || this.#CHUNK_SIZE < 1) {
      throw new RangeError('fragmentSize must be a positive integer');
    }
    this.#ackTimeoutMs = options.ackTimeoutMs ?? 5000;
    if (!Number.isFinite(this.#ackTimeoutMs) || this.#ackTimeoutMs <= 0) {
      throw new RangeError('ackTimeoutMs must be a positive number');
    }
  }

  /**
   * Method to clamp a value
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Method to Wait N millisecond(s)
   * @param {number} ms - time to wait
   * @returns {Promise<void>}
   */
  #delay(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Subscribe to typed SDK events. Returns an unsubscribe function. */
  on(name, callback) {
    if (typeof callback !== 'function') throw new TypeError('Event handler must be a function');
    if (!this.#listeners.has(name)) this.#listeners.set(name, new Set());
    this.#listeners.get(name).add(callback);
    return () => this.off(name, callback);
  }

  off(name, callback) {
    this.#listeners.get(name)?.delete(callback);
  }

  emit(name, detail) {
    for (const handler of this.#listeners.get(name) ?? []) {
      try { handler(detail); } catch (error) { console.error('[Matrix] Event listener failed:', error); }
    }
  }

  #enqueueOperation(action) {
    const running = this.#operationTail.then(action);
    this.#operationTail = running.catch(() => {});
    return running;
  }

  #rejectTransfer(error) {
    const state = this.#activeTransfer;
    if (!state) return;
    state.failure = error;
    if (state.waiting) {
      const { reject } = state.waiting;
      state.waiting = null;
      reject(error);
    }
  }

  #receiveTransferAck(message) {
    const state = this.#activeTransfer;
    if (!state || message.family !== state.family) return false;
    if (state.waiting) {
      const { resolve } = state.waiting;
      state.waiting = null;
      resolve(message);
    } else if (state.responses.length < 8) {
      state.responses.push(message);
    }
    return true;
  }

  #nextTransferAck(state) {
    if (state.failure) return Promise.reject(state.failure);
    if (state.responses.length) return Promise.resolve(state.responses.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        state.waiting = null;
        reject(new Error(`[Matrix] ${state.family} ACK timeout after ${this.#ackTimeoutMs} ms; device state is uncertain`));
      }, this.#ackTimeoutMs);
      state.waiting = {
        resolve: result => { clearTimeout(timer); resolve(result); },
        reject: error => { clearTimeout(timer); reject(error); },
      };
    });
  }

  async #writeFragments(payload, delayMs) {
    if (!(await this.#ensureConnection())) throw new Error('[Matrix] Device not connected');
    for (const packet of this._splitIntoChunks(payload, this.#CHUNK_SIZE)) {
      if (this.#activeTransfer?.failure) throw this.#activeTransfer.failure;
      await this.ble.writeWithoutResponse(packet);
      if (delayMs > 0) await this.#delay(delayMs);
    }
  }

  /** Serialize a complete media upload, and await firmware continuation/terminal ACKs. */
  #transferBlocks(blocks, family, delayMs) {
    return this.#enqueueOperation(async () => {
      const state = { family, responses: [], waiting: null, failure: null };
      this.#activeTransfer = state; // Register before the first write (fast ACKs).
      let sentBlocks = 0;
      try {
        for (const block of blocks) {
          await this.#writeFragments(block, delayMs);
          sentBlocks++;
          // After the last 'continue', the device may send a separate terminal ACK.
          while (true) {
            const ack = await this.#nextTransferAck(state);
            if (ack.outcome === 'terminal') return { family, status: ack.status, sentBlocks, totalBlocks: blocks.length, raw: ack.raw };
            if (ack.outcome === 'error' || ack.outcome === 'unknown') {
              throw new Error(`[Matrix] ${family} transfer rejected, status=${ack.status}`);
            }
            if (ack.outcome === 'continue' && sentBlocks < blocks.length) break;
          }
        }
        throw new Error(`[Matrix] ${family} transfer ended without a terminal ACK`);
      } finally {
        if (state.waiting) state.waiting.reject(new Error('[Matrix] transfer ended'));
        this.#activeTransfer = null;
      }
    });
  }

  /**
   * Handle Errors
   */
  #error(error, details) {
    const errMessage = details ? `${error} ${details}` : error;
    if (this.throwErrors) {
      if (error instanceof Error) throw error;
      else throw new Error(errMessage);
    } else {
      console.error(errMessage);
    }
  }

  /**
   * Connect to a device directly by MAC address or ID via NodeWebBluetoothAdapter
   * @param {string} deviceId - MAC address or ID of the BLE device
   * @returns {Promise<void>}
   */
  async connect(deviceId) {
    this._allowReconnect = true;
    try {
      if (!this.ble.connected) await this.ble.connect(deviceId ?? this.ble.device);
      // Idempotent adapter notifications; no repeated anonymous handlers.
      await this.ble.startNotifications(this._notificationHandler);
      this.emit('connected', { device: this.ble.device });
      return this.ble.device;
    } catch (error) {
      throw new Error(`[Matrix] Connection failed: ${error.message ?? error}`, { cause: error });
    }
  }

  /** Disconnect and prevent queued commands from silently reconnecting. */
  async disconnect() {
    this._allowReconnect = false;
    this.#rejectTransfer(new Error('[Matrix] Disconnected during transfer'));
    try {
      await this.ble.stopNotifications?.();
    } finally {
      await this.ble.disconnect();
    }
  }

  /**
   * Ensures the BLE connection is active, attempting an automatic reconnection if dropped
   * @private
   * @returns {Promise<boolean>} True if connected/reconnected, false otherwise
   */
  async #ensureConnection() {
    if (this.ble.device && this.ble.connected) return true;
    if (!this._allowReconnect) throw new Error('[Matrix] Explicitly disconnected; call connect() first');
    if (!this.ble.device) {
      throw new Error('[Matrix] Cannot auto-reconnect: no device has been paired yet');
    }

    console.warn("[Matrix] Connection lost or not established. Attempting automatic reconnection...");

    try {
      await this.connect(this.ble.device);
      console.info("[Matrix] Automatic reconnection successful!");
      return true;
    } catch (error) {
      throw new Error('[Matrix] Automatic reconnection failed', { cause: error });
    }
  }

  /**
   * Retrieves the connected device specifications and updates instance properties
   * @returns {Promise<{ id: string, name: string, model: string, width: number, height: number, mtu: null, fragmentSize: number }|null>}
   */
  async getDeviceInfo() {
    if (!this.ble.device || !this.ble.connected) throw new Error('No device connected');
    let model = null;
    let descriptorError = null;
    try {
      const bytes = await this.ble.readDescriptor(0x2901);
      model = new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '').trim();
    } catch (error) {
      // 0x2901 is optional in GATT; preserve firmware info if it was received.
      descriptorError = error;
    }
    let descriptorDimensions;
    if (model?.includes('TR1616')) descriptorDimensions = [16,16];
    else if (model?.includes('TR2306') || model?.includes('TR3232')) descriptorDimensions = [32,32];
    else if (model?.includes('TR2403') || model?.includes('TR6464')) descriptorDimensions = [64,64];
    else if (model?.includes('TR1632')) descriptorDimensions = [16,32];
    const firmwareDimensions = ({ 1: [16,16], 3: [32,32], 4: [64,64] })[this.screenType];
    const dimensionConflict = Boolean(descriptorDimensions && firmwareDimensions &&
      descriptorDimensions.some((size, index) => size !== firmwareDimensions[index]));
    if (dimensionConflict) this.emit('deviceProfileConflict', {
      model, descriptorDimensions, screenType: this.screenType, firmwareDimensions,
    });
    const dimensions = descriptorDimensions ?? firmwareDimensions;
    if (dimensions) this.#updateDimensions(...dimensions);
    return {
      id: this.ble.device.id ?? null,
      name: this.ble.device.name ?? 'Unknown Device',
      model, width: this.width, height: this.height,
      screenType: this.screenType ?? null,
      mcuVersion: this.mcuVersion ?? null,
      descriptorAvailable: descriptorError === null,
      descriptorDimensions: descriptorDimensions ?? null,
      firmwareDimensions: firmwareDimensions ?? null,
      dimensionConflict,
      mtu: this.ble.attMtu ?? null,
      fragmentSize: this.#CHUNK_SIZE,
    };
  }

  #updateDimensions(width, height) {
    this.width = width;
    this.height = height;
    if (this.canvas?.resize && (this.canvas.width !== width || this.canvas.height !== height)) {
      this.canvas.resize(width, height);
    }
  }

  /** Request firmware/device info from 04 00 01 80 and await its typed response. */
  async requestDeviceInfo({ timeoutMs = this.#ackTimeoutMs } = {}) {
    return this.#enqueueOperation(async () => {
      let listener, timer;
      const response = new Promise((resolve, reject) => {
        listener = value => resolve(value);
        this.on('deviceInfo', listener);
        timer = setTimeout(() => reject(new Error('[Matrix] Device info response timed out')), timeoutMs);
      });
      try {
        await this.#writeFragments(Uint8Array.from([4, 0, 1, 0x80]), 8);
        return await response;
      } finally {
        clearTimeout(timer);
        this.off('deviceInfo', listener);
      }
    });
  }

  /**
   * Handles incoming notification buffers from the matrix
   * @param {Event} event - The characteristic value changed event
   */
  async #event_characteristicvaluechanged(buffer) {
    const message = decodeNotification(buffer);
    this.emit('notification', message);
    if (message.kind === 'deviceInfo') {
      this.isPasswordProtected = message.passwordProtected;
      this.screenType = message.screenType;
      this.mcuVersion = message.mcuVersion;
      const dimensions = ({ 1: [16,16], 3: [32,32], 4: [64,64] })[message.screenType];
      if (dimensions) this.#updateDimensions(...dimensions);
      this.emit('deviceInfo', message);
      if (message.passwordProtected) this.emit('passwordRequired', message);
      return;
    }
    if (message.kind === 'transferAck') {
      if (this.#receiveTransferAck(message)) return;
      // 03 00 may also be a response to askStatus, outside a text transfer.
      if (message.family === 'text') this.emit('displayStatus', message);
    }
    if (message.kind === 'timeAck') this.emit('timeAck', message);
    if (message.kind === 'passwordVerificationOrDrawing') {
      // Not always a PIN response: 32x32 firmware may use this key for drawing.
      this.emit('passwordOrDrawingResponse', message);
    }
    this.emit('response', message);
  }

  /**
   * Computes a standard CRC32 checksum for a given byte array
   * @param {Uint8Array} data - Input byte array
   * @returns {number} 32-bit unsigned integer representing the CRC32
   */
  #calculateCRC32(data) {
    const crcTable = this.#getCRC32Table();
    let crc = -1;

    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
    }

    return (crc ^ -1) >>> 0;
  }
  
  #getCRC32Table() {
    if (this.#crcTable) return this.#crcTable;

    const table = [];

    for (let n = 0; n < 256; n++) {
      let c = n;

      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }

      table[n] = c;
    }

    this.#crcTable = table;
    return this.#crcTable;
  }

  #uint32ToBytesLE(i) {
    return new Uint8Array([
      i & 0xFF,
      (i >>> 8) & 0xFF,
      (i >>> 16) & 0xFF,
      (i >>> 24) & 0xFF
    ]);
  }

  #uint16ToBytesLE(s) {
    return new Uint8Array([
      s & 0xFF,
      (s >>> 8) & 0xFF
    ]);
  }

  /**
   * Splits a large Uint8Array into smaller chunks of a specified size
   * @param {Uint8Array} array - The source byte array
   * @param {number} chunkSize - Maximum size of each chunk
   * @returns {Uint8Array[]} Array containing the sliced chunks
   */
  _splitIntoChunks(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Sends a raw payload to the matrix, splitting it into BLE MTU-sized packets
   * @param {Uint8Array} payload - The complete payload to transmit
   * @param {number} [delayMs=8] - Throttle delay between packet transmissions
   * @returns {Promise<void>}
   */
  async send(payload, delayMs = 8) {
    return this.#enqueueOperation(() => this.#writeFragments(payload, delayMs));
  }

  /**
   * Turns the matrix screen display ON
   * @returns {Promise<void>}
   */
  async screenOn() {
    const payload = new Uint8Array([0x05, 0x00, 0x07, 0x01, 0x01]);
    return await this.send(payload);
  }

  /**
   * Turns the matrix screen display OFF
   * @returns {Promise<void>}
   */
  async screenOff() {
    const payload = new Uint8Array([0x05, 0x00, 0x07, 0x01, 0x00]);
    return await this.send(payload);
  }

  /**
   * Adjusts the overall display brightness level
   * @param {number} level - Brightness value ranging from 5 to 100
   * @returns {Promise<void>}
   */
  async setBrightness(level) {
    const payload = new Uint8Array([0x05, 0x00, 0x04, this.#MIN_VALUE, this.clamp(level, 5, 100)]);
    return await this.send(payload);
  }

  /**
   * Fill the screen with one unique color
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Bleu (0-255)
   * @returns {Promise<void>}
   */
  async setFullscreenColor(r, g, b) {
    const payload = new Uint8Array([
      0x07, 0x00, 0x02, 0x02,
      this.clamp(r, 0, 255),
      this.clamp(g, 0, 255),
      this.clamp(b, 0, 255),
    ]);
    return await this.send(payload);
  }

  /**
   * Activates the DIY Drawing/Image mode on the matrix
   * @param {number} mode - 0 = disable DIY, 1 = enable DIY, 2/3 = experimental
   * @returns {Promise<void>}
   */
  async setImageMode(mode = 1) {
    const payload = new Uint8Array([
      0x05, 0x00, 0x04, 0x01, 
      this.clamp(mode, 0, 255)
    ]);
    return await this.send(payload);
  }

  /**
   * Change the color of one pixel
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {Promise<void>}
   */
  async setPixel(x = 0, y = 0, r = 127, g = 127, b = 127) {
    const payload = new Uint8Array([
      10, 0x00, 0x05, 0x01, 0x00,
      this.clamp(r, 0, 255),
      this.clamp(g, 0, 255),
      this.clamp(b, 0, 255),
      this.clamp(x, 0, (this.width ?? 16) - 1),
      this.clamp(y, 0, (this.height ?? 16) - 1),
    ]);
    return await this.send(payload);
  }

  /**
   * Turn of a pixel
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Promise<void>}
   */
  async clearPixel(x, y) {
    return await this.setPixel(x, y, 0, 0, 0);
  }

  /**
   * Activates a predefined procedural animation effect with a custom color palette
   * @param {number} style - Effect index (0 to 6)
   * @param {number} speed - Animation speed (1 to 100)
   * @param {Array<Array<number>>} rgbValues - List of [R, G, B] sub-arrays (between 2 and 7 colors max)
   * @returns {Promise<void>}
   */
  async setEffect(style, speed, rgbValues) {
    if (!(rgbValues.length >= 2 && rgbValues.length <= 7)) return this.#error(`setEffect must have between 2 and 7 colors.`);
    
    const payload = new Uint8Array([
      (rgbValues.length * 3) + 7, 0x00, 0x03, 0x02,
      this.clamp(style, 0, 6),
      this.clamp(speed, 1, 100),
      rgbValues.length,
      ...rgbValues.flat()
    ]);

    return await this.send(payload);
  }

  /**
   * Update Scoreboard widget
   * @param {number} score1 - Score Player/Team #1 (0-999)
   * @param {number} score2 - Score Player/Team #2 (0-999)
   * @returns {Promise<void>}
   */
  async setScoreboard(score1 = 0, score2 = 0) {
    const s1 = this.clamp(score1, 0, 999);
    const s2 = this.clamp(score2, 0, 999);

    const payload = new Uint8Array([
      0x08, 0x00, 0x0A, this.#MIN_VALUE,
      s1 & 0xff, (s1 >> 8) & 0xff,
      s2 & 0xff, (s2 >> 8) & 0xff
    ]);
    return await this.send(payload);
  }

  /**
   * Controls the execution state of the built-in chronograph
   * @param {number} mode - 0 = reset, 1 = start, 2 = pause, 3 = continue
   * @returns {Promise<void>}
   */
  async setChronograph(mode = 0) {
    const payload = new Uint8Array([
      0x05, 0x00, 0x09, this.#MIN_VALUE,
      this.clamp(mode, 0, 3)
    ]);
    return await this.send(payload);
  }
  get chronograph() {
    return {
      set:    () => this.setChronograph(0),
      reset:  () => this.setChronograph(0),
      stop:   () => this.setChronograph(0),
      start:  () => this.setChronograph(1),
      pause:  () => this.setChronograph(2),
      resume: () => this.setChronograph(3),
    }
  }

  /**
   * Configures and starts a countdown on the screen
   * @param {number} mode - 0 = disable, 1 = start, 2 = pause, 3 = restart
   * @param {number} minutes - Number of initial minutes (0-255)
   * @param {number} seconds - Number of initial seconds (0-59)
   * @returns {Promise<void>}
   */
  #_internal_countdown_timeout;
  #_internal_countdown_end_at;
  #_internal_countdown_callback;
  async setCountdown(mode = 0, minutes = 0, seconds = 0) {
    const payload = new Uint8Array([
      0x07, 0x00, 0x08, this.#MIN_VALUE,
      this.clamp(mode, 0, 3),
      this.clamp(minutes, 0, 255),
      this.clamp(seconds, 0, 59),
    ]);
    return await this.send(payload);
  }
  get countdown() {
    const rT = () => {
      if (this.#_internal_countdown_timeout) clearTimeout(this.#_internal_countdown_timeout);
      this.#_internal_countdown_timeout = null;
    };
    const sT = (s = 0) => {
      this.#_internal_countdown_end_at = Math.floor(Date.now() / 1000) + s;
      this.#_internal_countdown_timeout = setTimeout(this.#_internal_countdown_callback ?? (() => console.info(`[Matrix] Countdown ended.`)), s * 1000);
    };

    return {
      disable: () => {
        rT();
        this.setCountdown(0);
      },
      stop: () => {
        rT();
        this.setCountdown(1);
      },
      reset: () => {
        rT();
        this.setCountdown(1);
      },
      start: (minutes = 0, seconds = 0) => {
        rT(); sT((minutes * 60) + seconds);
        this.setCountdown(1, minutes, seconds);
      },
      pause: () => {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (this.#_internal_countdown_end_at > currentTimestamp) {
          rT();
          this.#_internal_countdown_end_at = this.#_internal_countdown_end_at - currentTimestamp;
          this.setCountdown(2);
        }
      },
      resume: () => {
        rT(); sT(this.#_internal_countdown_end_at);
        this.setCountdown(3);
      },
    }
  }

  /**
   * Configures the source type or processing for the physical microphone
   * @param {number} type - 0 = Internal Matrix Mic, 1 = App/PC Remote Mode
   * @returns {Promise<void>}
   */
  async setMicType(type) {
    // Five-byte short microphone command (LE16 length = 5).
    const payload = new Uint8Array([
      0x05, 0x00, 0x0B, this.#MIN_VALUE,
      Math.max(0, Math.min(1, type))
    ]);
    return await this.send(payload);
  }

  #isWritingRythm = false;
  #nextRythmPayload = null;

  /**
   * Unified routing method for rythm simulation (Modeled after the APK)
   * @param {number} globalMode - Mode from 0 to 9 (0-4: Software, 5-9: Hardware)
   * @param {number} currentVolumeIntensity - Global intensity of the simulated volume (0 to 1)
   */
  sendRythmSimulation(globalMode, currentVolumeIntensity = 0) {
    if (globalMode >= 5) {
      const animIndex = globalMode - 4;
      const frame = Math.floor(currentVolumeIntensity * 6) + 1;

      const payload = new Uint8Array([
        0x06, 0x00, 0x00, 0x02,
        Math.max(1, Math.min(7, frame)),
        Math.max(1, Math.min(5, animIndex))
      ]);

      if (this.#isWritingRythm) {
        this.#nextRythmPayload = payload;
        return;
      }
      this.#_executeRythmWrite(payload);

    } else {
      const heights = Array.from({ length: 32 }, (_, i) => {
        const wave = Math.sin(Date.now() * 0.005 + i * 0.4) * 5 + 6;
        return Math.floor(Math.max(0, Math.min(15, wave * currentVolumeIntensity)));
      });

      this.sendCustomRythm(globalMode, heights);
    }
  }

  /**
   * Sends a rythm pulse to the selected hardware animation
   * @param {number} animIndex - The hardware animation index (1 to 5)
   * @param {number} frame - The movement state / pose (1 to 7)
   */
  sendImageRythm(animIndex = 1, frame = 1) {
    const payload = new Uint8Array([
      0x06, 0x00, 0x00, 0x02,
      Math.max(0, Math.min(7, frame)),
      Math.max(0, Math.min(5, animIndex))
    ]);

    if (this.#isWritingRythm) {
      this.#nextRythmPayload = payload;
      return;
    }
    this.#_executeRythmWrite(payload);
  }

  /**
   * Sends the custom fluid wave / equalizer stream (Software)
   * @param {number} style - The equalizer style interpreted by the matrix (0 to 4)
   * @param {Array<number>} rawHeights - Array of 32 heights (values from 0 to 15) for the columns
   */
  sendCustomRythm(style, rawHeights) {
    const heights = Array.from({ length: 32 }, (_, i) => Math.max(0, Math.min(15, rawHeights[i] || 0)));
    
    const bArr = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      const idx = i * 2;
      bArr[i] = (heights[idx] << 4) | heights[idx + 1];
    }

    const payload = new Uint8Array([
      0x21, 0x00, 0x01, 0x02,
      Math.max(0, Math.min(4, style)),
      ...bArr
    ]);

    if (this.#isWritingRythm) {
      this.#nextRythmPayload = payload;
      return;
    }

    this.#_executeRythmWrite(payload);
  }

  /**
   * Internal: Handles the physical transmission loop on the Bluetooth characteristic
   * @private
   */
  async #_executeRythmWrite(payload) {
    this.#isWritingRythm = true;

    try {
      await this.send(payload);
    } catch (err) {
      console.warn("[GATT Bypass] Audio frame dropped to prevent lagging");
      console.error(err);
    } finally {
      this.#isWritingRythm = false;

      if (this.#nextRythmPayload) {
        const nextPayload = this.#nextRythmPayload;
        this.#nextRythmPayload = null;
        this.#_executeRythmWrite(nextPayload);
      }
    }
  }

  /**
   * Immediately stops the display of rythm-related music animations
   * @returns {Promise<void>}
   */
  async stopMusicRythm() {
    return this.sendImageRythm(0, 0);
  }

  /**
   * Global synchronization of the date and calendar
   * Sends the complete date (Year, Month, Day, Day of the week, Hour, Minute, Second)
   * @param {Date} [date=new Date()] - Host Date object
   * @returns {Promise<void>}
   */
  async setClockTime(date = new Date()) {
    const year = date.getFullYear() % 100;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    let weekday = date.getDay();
    if (weekday === 0) weekday = 7;

    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();

    const payload = new Uint8Array([
      11, 0x00, 0x01, 128,
      year, month, day, weekday,
      hour, minute, second
    ]);

    return await this.send(payload);
  }

  /**
   * Configures the clock style with an RGB color
   * @param {number} style - Visual style index (0 to 7)
   * @param {boolean} [visibleDate=true] - Show or hide the date/extra block
   * @param {boolean} [hour24=true] - 24h or 12h format
   * @param {number} [r=255] - Red Channel (0-255)
   * @param {number} [g=255] - Green Channel (0-255)
   * @param {number} [b=255] - Blue Channel (0-255)
   * @returns {Promise<void>}
   */
  async setClockStyle(style, visibleDate = true, hour24 = true, r = 255, g = 255, b = 255) {
    const styleClamp = Math.max(0, Math.min(7, style));
    const flags = styleClamp | (visibleDate ? 128 : 0) | (hour24 ? 64 : 0);
    
    const payload = new Uint8Array([
      0x08, 0x00, 0x06, 0x01, 
      flags, 
      this.clamp(r, 0, 255), 
      this.clamp(g, 0, 255), 
      this.clamp(b, 0, 255)
    ]);
    
    return await this.send(payload);
  }

  /**
   * Enables or disables the blinking of the colon (:) on the clock widget
   * @param {boolean} enabled - True to blink, False for a solid display
   * @returns {Promise<void>}
   */
  async setTimeIndicator(enabled = true) {
    const payload = new Uint8Array([
      0x05, 0x00, 0x07,
      0x80,
      enabled ? 0x01 : 0x00
    ]);
    return await this.send(payload);
  }

  /**
   * Applies a 180-degree rotation (mirrored/upside-down effect) to the full display
   * @param {boolean} enabled - True to flip the screen, False to restore normal orientation
   * @returns {Promise<void>}
   */
  async flipScreen(enabled = false) {
    const payload = new Uint8Array([
      0x05, 0x00, 0x06, this.#MIN_VALUE, enabled ? 0x01 : 0x00
    ]);
    return await this.send(payload);
  }

  /**
   * Freeze/Unfreeze Screen
   * @returns {Promise<void>}
   */
  async freezeScreen() {
    console.warn("[Matrix] Command 'freezeScreen' is experimental.\nIdk what is it...");
    
    const payload = new Uint8Array([
      0x04, 0x00, 0x03, 0x00,
    ]);
    return await this.send(payload);
  }

  /**
   * Sets or modifies a hardware lock password on the device
   * @param {string} pincode - 6-digit PIN code
   * @returns {Promise<void>}
   */
  async setPassword(pincode) {
    console.warn("[Matrix] Command 'setPassword' is experimental.\nUse it at you own risk.");

    if (!/^[0-9]{6}$/.test(pincode ?? '')) throw new Error("Password must be 6 digits [0-9]");
    
    const [p1, p2, p3] = pincode.match(/.{2}/g).map(d => parseInt(d, 10));
    
    const payload = new Uint8Array([
      0x08, 0x00, 0x04, 0x02,
      0x01,
      p1, p2, p3
    ]);
    
    return await this.send(payload);
  }

  /**
   * Removes the hardware lock password (Disables security)
   * @param {string} pincode - The current PIN code required to validate removal
   * @returns {Promise<void>}
   */
  async resetPassword(pincode) {
    console.warn("[Matrix] Command 'resetPassword' is experimental.\nUse it at you own risk.");

    if (!/^[0-9]{6}$/.test(pincode ?? '')) {
      throw new Error("Password must be 6 digits [0-9] to be reset");
    }

    const [p1, p2, p3] = pincode.match(/.{2}/g).map(d => parseInt(d, 10));

    const payload = new Uint8Array([
      0x08, 0x00, 0x04, 0x02,
      0x00,
      p1, p2, p3
    ]);
    
    return await this.send(payload);
  }

  /**
   * Authenticates with the matrix using the current PIN code
   * To be sent right after connecting if a password is active.
   * @param {string} pincode - 6-digit PIN code
   * @returns {Promise<void>}
   */
  async verifyPassword(pincode) {
    console.warn("[Matrix] Command 'verifyPassword' is experimental.\nUse it at you own risk.");

    if (!/^[0-9]{6}$/.test(pincode ?? '')) throw new Error("Password must be 6 digits [0-9]");

    const [p1, p2, p3] = pincode.match(/.{2}/g).map(d => parseInt(d, 10));

    const payload = new Uint8Array([
      0x07, 0x00, 0x05, 0x02,
      p1, p2, p3
    ]);

    return await this.send(payload);
  }

  /**
   * Requests reading the screen sleep timeout (Pure read command)
   * @returns {Promise<void>}
   */
  async readScreenLight() {
    console.warn("[Matrix] Command 'readScreenLight' is experimental.");

    const payload = new Uint8Array([
      0x05, 0x00, 0x0F,
      this.#MIN_VALUE, 0xFF
    ]);

    return await this.send(payload);
  }

  /**
   * Requests current display status
   * @returns {Promise<void>}
   */
  async askStatus() {
    const payload = new Uint8Array([0x04, 0x00, 0x03, 0x00]);
    await this.send(payload);
  }

  /**
   * Performs a full Factory Reset of the matrix (Data wipe + Restart)
   * @returns {Promise<void>}
   */
  async deleteDeviceData() {
    const payload = new Uint8Array([0x04, 0x00, 0x03, this.#MIN_VALUE]);
    return await this.send(payload);
  }

  /**
   * Configures and schedules the time range for the automatic power-saving eco mode
   * @param {number} flag - Activation status of eco mode (0 or 1)
   * @param {number} startH - Eco mode start hour (0-23)
   * @param {number} startM - Eco mode start minute (0-59)
   * @param {number} endH - Eco mode end hour (0-23)
   * @param {number} endM - Eco mode end minute (0-59)
   * @param {number} light - Reduced brightness level applied during this range (1-100)
   * @returns {Promise<void>}
   */
  async setEcoMode(flag, startH = 0, startM = 0, endH = 0, endM = 0, light = 10) {
    const isActive = flag ? 1 : 0;
    const sH = Math.max(0, Math.min(23, startH));
    const sM = Math.max(0, Math.min(59, startM));
    const eH = Math.max(0, Math.min(23, endH));
    const eM = Math.max(0, Math.min(59, endM));
    const brightness = this.clamp(light, 5, 100);

    const payload = new Uint8Array([
      0x0A, 0x00, 0x02, this.#MIN_VALUE,
      isActive,
      sH, sM, eH, eM,
      brightness
    ]);

    return await this.send(payload);
  }

  /**
   * Converts a string into a continuous array of binary font bitmaps using HTML5 Canvas rendering
   * @param {string} text - The input text to convert into bitmaps
   * @param {number} [targetHeight=32] - The matrix rendering height block (16, 32, or 64)
   * @param {string} [fontConfig="bold 22px sans-serif"] - Canvas context font declaration
   * @returns {Uint8Array} Total combined character buffer ready for sendText()
   */
  textToBitmaps(text, targetHeight = 32, fontConfig = "bold 22px sans-serif") {
    let charWidth = 16;
    if (targetHeight === 16) charWidth = 8;
    if (targetHeight === 64) charWidth = 32;

    if (targetHeight > this.height) {
      throw new Error(`[Matrix] targetHeight (${targetHeight}px) can't exceed screen height (${this.height}px).`);
    }

    if (!this.canvas?.createScratchCanvas) {
      throw new Error('textToBitmaps requires a Canvas adapter implementing createScratchCanvas');
    }
    const canvas = this.canvas.createScratchCanvas(charWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable for text rendering');
    
    ctx.font = fontConfig;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const bytesPerChar = (charWidth * targetHeight) / 8;
    
    let separatorByte = 0x02;
    if (targetHeight === 16) {
      separatorByte = (bytesPerChar === 16) ? 0x02 : 0x03;
    } else if (targetHeight === 32) {
      separatorByte = (bytesPerChar === 64) ? 0x05 : 0x06;
    } else if (targetHeight === 64) {
      separatorByte = (bytesPerChar === 256) ? 0x07 : 0x08;
    }

    const totalCharSize = 4 + bytesPerChar; 
    const totalBitmaps = new Uint8Array(text.length * totalCharSize);

    for (let i = 0; i < text.length; i++) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, charWidth, targetHeight);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(text[i], charWidth / 2, targetHeight / 2);

      const imgData = ctx.getImageData(0, 0, charWidth, targetHeight).data;
      const charBuffer = new Uint8Array(totalCharSize);
      
      charBuffer[0] = separatorByte;
      charBuffer[1] = 0xFF;
      charBuffer[2] = 0xFF;
      charBuffer[3] = 0xFF;

      let byteIdx = 4;
      for (let y = 0; y < targetHeight; y++) {
        let currentByte = 0;
        for (let x = 0; x < charWidth; x++) {
          const pixelIndex = (y * charWidth + x) * 4;
          const pixel = imgData[pixelIndex] > 128 ? 1 : 0;

          currentByte |= (pixel & 1) << (x % 8);

          if (x % 8 === 7 || x === charWidth - 1) {
            charBuffer[byteIdx++] = currentByte;
            currentByte = 0;
          }
        }
      }

      totalBitmaps.set(charBuffer, i * totalCharSize);
    }

    return totalBitmaps;
  }

  /**
   * Compresses, formats and streams a scrolling text string with full color and background configuration
   * @param {Uint8Array} textBitmaps - The raw binary font bitmap data
   * @param {number} numChars - Number of characters to render
   * @param {number} textMode - Scrolling type or text style
   * @param {number} speed - Scrolling animation speed (1-255)
   * @param {number} textColorMode - Color application mode on characters
   * @param {Array<number>} textColor - Text color [R, G, B]
   * @param {number} textBgMode - Style or behavior of the text background
   * @param {Array<number>} textBgColor - Background color [R, G, B]
   * @param {number} slotIndex - The target hardware memory slot (defaults to 12)
   * @returns {Promise<void>}
   */
  async sendText(textBitmaps, numChars, textMode = 1, speed = 95, textColorMode = 1, textColor = [255, 0, 0], textBgMode = 0, textBgColor = [0, 0, 0], slotIndex = 12) {
    const numCharsBytes = this.#uint16ToBytesLE(numChars);
    
    const header = new Uint8Array([
      ...numCharsBytes,
      0x00, 0x01,
      Math.max(0, Math.min(7, textMode)),
      Math.max(1, Math.min(100, speed)),
      Math.max(1, Math.min(4, textColorMode)),
      textColor[0], textColor[1],
      textColor.reduce((acc, cu) => acc + cu) === 0 ? 1 : textColor[2],
      Math.max(0, Math.min(2, textBgMode)),
      textBgColor[0], textBgColor[1], textBgColor[2]
    ]);

    const innerPayload = new Uint8Array([
      ...header,
      ...textBitmaps
    ]);

    const frames = encodeMediaBlocks(innerPayload, { type: 3, slotIndex });
    return this.#transferBlocks(frames, 'text', 25);
  }

  /**
   * Processes, chunks, and uploads a raw PNG byte buffer to the matrix hardware memory
   * @param {ArrayBuffer|Uint8Array} buffer - Raw binary data of the PNG file
   * @returns {Promise<void>}
   */
  async sendDIYImage(buffer) {
    return this.#transferBlocks(encodeDIYBlocks(buffer), 'diy', 35);
  }

  /** Uploads PNG data with independent slot and duration options. */
  async sendImage(buffer, options = {}) {
    const { slotIndex = 12, durationValue = 0 } = this.#mediaOptions(options);
    return this.#transferBlocks(encodeMediaBlocks(buffer, {
      type: 2, slotIndex, durationValue,
    }), 'image', 35);
  }

  /** Uploads GIF data with the same option defaults as images. */
  async sendGif(buffer, options = {}) {
    const { slotIndex = 12, durationValue = 0 } = this.#mediaOptions(options);
    return this.#transferBlocks(encodeMediaBlocks(buffer, {
      type: 1, slotIndex, durationValue,
    }), 'gif', 10);
  }

  #mediaOptions(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(options))) {
      throw new TypeError('Media options must be an object with slotIndex and durationValue');
    }
    for (const key of Object.keys(options)) {
      if (key !== 'slotIndex' && key !== 'durationValue') {
        throw new TypeError(`Unknown media option: ${key}`);
      }
    }
    return options;
  }

  /**
   * [EXPERIMENTAL] Configures the joint display positioning or screen transition effects.
   * @param {number} mode - The hardware joint mode index or position configuration
   * @returns {Promise<void>}
   */
  async sendJoint(mode) {
    console.warn("[Matrix] Calling experimental method 'sendJoint()'. Behavior might be unstable.");
    
    const payload = new Uint8Array([5, 0, 12, this.#MIN_VALUE, mode & 0xFF]);
    await this.send(payload);
  }
}