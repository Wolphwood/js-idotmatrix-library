import { WebBluetoothAdapter } from "./bluetooth/WebBluetoothAdapter.js";
import { WebCanvasAdapter } from "./canvas/WebCanvasAdapter.js";

export class iDotMatrix {
  #SERVICE_UUID = 0x00fa;
  #WRITE_CHAR_UUID = 0xfa02;
  #NOTIFY_CHAR_UUID = 0xfa03;

  #MIN_VALUE = -128;
  #CHUNK_SIZE = 20;

  #crcTable;

  constructor(options = {}) {
    this.ble = options.bluetoothadapter ?? options.bluetooth ?? new WebBluetoothAdapter();
    this.ble.service_uuid = this.#SERVICE_UUID;
    this.ble.write_uuid   = this.#WRITE_CHAR_UUID;
    this.ble.notify_uuid  = this.#NOTIFY_CHAR_UUID;
    
    this.canvas = options.canvasadapter ?? options.canvas ?? new WebCanvasAdapter();

    this.throwErrors = options.throwErrors ?? true;
  }

  /**
   * Gets the 2D rendering context of the internal canvas
   * @type {CanvasRenderingContext2D}
   */
  get ctx() {
    return this.canvas.ctx;
  }

  /**
   * Clears the internal canvas by resetting its dimensions
   * @returns {void}
   */
  clearInternalCanvas() {
    if (!this.canvas) return;
    this.canvas.clear();
  }

  /**
   * Converts the current internal canvas state into a compressed PNG byte buffer
   * @returns {Promise<Uint8Array>} A promise that resolves with the raw PNG binary data
   */
  internalCanvasToBuffer() {
    if (!this.canvas) return;
    
    return new Promise(resolve => {
      this.canvas.canvas.toBlob(async (blob) => {
        const arrayBuffer = await blob.arrayBuffer();
        const pngBytes = new Uint8Array(arrayBuffer);
        
        resolve(pngBytes);
      }, 'image/png');
    });
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

  /**
   * Probes and returns the maximum supported MTU payload size by sending trial packets.
   * @returns {Promise<number>} Supported MTU size (e.g., 512, 244, 128, 64, or 20)
   */
  async detectMaxMtu() {
    const MTU_TESTS = [512, 244, 128, 64, 20];
    
    for (const size of MTU_TESTS) {
      try {
        const testBuffer = new Uint8Array(Array(size).fill(255));
        await this.ble.writeWithoutResponse(testBuffer);

        console.log(`MTU successfully validated at: ${size} bytes!`);
        return size;
      } catch (error) {
        console.warn(`Test failed at ${size} bytes, trying lower size...`);
      }
    }
    
    return 20;
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
    if (this.ble.device && this.ble.connected) {
      console.info(`[Matrix] Reconnecting automatically to cached device...`);
      await this.ble.connect(this.ble.device);
      await this.ble.startNotifications(this.#event_characteristicvaluechanged.bind(this));
      return;
    }
    
    try {
      console.info(`[Matrix] Connecting to device: ${deviceId?.id || deviceId?.name || deviceId || 'Unknown'}`);
      await this.ble.connect(deviceId);
      await this.ble.startNotifications(this.#event_characteristicvaluechanged.bind(this));
    } catch (err) {
      this.#error("[Matrix] Connection failed:", err);
    }
  }

  /**
   * Disconnects from the iDotMatrix device and cleans up properties
   */
  async disconnect() {
    if (this.ble.device && this.ble.connected) {
      console.info(`Disconnecting from ${this.ble.device.name}...`);
      
      await this.ble.stopNotifications();
      
      await this.ble.disconnect();
      console.info("Disconnected successfully.");
    } else {
      console.warn("No active device connection found to disconnect.");
    }
  }

  /**
   * Ensures the BLE connection is active, attempting an automatic reconnection if dropped
   * @private
   * @returns {Promise<boolean>} True if connected/reconnected, false otherwise
   */
  async #ensureConnection() {
    if (this.ble.device && this.ble.connected) {
      return true;
    }
    
    if (!this.ble.device) {
      this.#error("[Matrix] Cannot auto-reconnect: No device has been paired yet.");
      return false;
    }

    console.warn("[Matrix] Connection lost or not established. Attempting automatic reconnection...");

    try {
      await this.connect(this.ble.device);
      console.info("[Matrix] Automatic reconnection successful!");
      return true;
    } catch (error) {
      this.#error("[Matrix] Automatic reconnection failed:", error);
      return false;
    }
  }

  /**
   * Retrieves the connected device specifications and updates instance properties
   * @returns {Promise<{ id: string, name: string, model: string, width: number, height: number, mtu: number }|null>}
   */
  async getDeviceInfo() {
    if (!this.ble.device || !this.ble.connected) {
      this.#error("No device connected.");
      return null;
    }

    try {
      const descView = await this.ble.readDescriptor(0x2901);
      const modelString = new TextDecoder('utf-8').decode(descView).replace(/\0/g, '').trim();

      if (['TR2306', 'TR3232'].some(m => modelString.includes(m))) {
        this.width = 32;
        this.height = 32;
      } else
      if (modelString.includes("TR1616")) {
        this.width = 16;
        this.height = 16;
      } else
      if (['TR2403', 'TR6464'].some(m => modelString.includes(m))) {
        this.width = 64;
        this.height = 64;
      } else
      if (modelString.includes("TR1632")) {
        this.width = 16;
        this.height = 32;
      }

      const deviceInfo = {
        id: this.ble.device ? this.ble.device.id : null,
        name: this.ble.device ? this.ble.device.name : 'Unknown Device',
        model: modelString,
        width: this.width,
        height: this.height,
        mtu: this.#CHUNK_SIZE
      };

      return deviceInfo;
    } catch (err) {
      this.#error("Failed to retrieve device info :", err);
      return null;
    }
  }

  /**
   * Handles incoming notification buffers from the matrix
   * @param {Event} event - The characteristic value changed event
   */
  async #event_characteristicvaluechanged(buffer) {
    // Image/Animation upload notification handler (sendImageData & sendDIYImageData)
    if (buffer.length >= 5) {
      const isColorAck = buffer[1] === 0 && buffer[2] === 2 && buffer[3] === 2;
      const isOfficialAck = buffer[1] === 0 && buffer[2] === 2 && buffer[3] === 0;
      const isDiyAck = buffer[1] === 0 && buffer[2] === 0 && buffer[3] === 0;

      if (isColorAck) {
        if (buffer[4] === 1) {
          console.info("[Matrix] Color changed.");
        } else
        console.info(`[Matrix] color ack unknown value '${buffer[4]}'`);

        return;
      } else
      if (isOfficialAck || isDiyAck) {
        if (buffer[4] === 3 || (isDiyAck && buffer[4] === 1) || (isDiyAck && buffer[4] === 0)) {
          console.info("[Matrix] Image transfer completed successfully");
        } else if (buffer[4] === 2) {
          console.info("[Matrix] Target requested next 4K data block");
        } else if (isOfficialAck && buffer[4] === 2) {
          console.error("[Matrix] Hardware error: Memory out of space");
        }
        return;
      }
    }
    
    // Screen On/Off
    if (buffer.length >= 5 && buffer[2] === 7 && buffer[3] === 1) {
      const success = buffer[4] === 1;
      console.info(`[Matrix] Screen change on/off success : ${success}`);
      return;
    }

    // Screen Brightness
    if (buffer.length >= 5 && buffer[2] === 4 && buffer[3] === this.#MIN_VALUE) {
      const success = buffer[4] === 1;
      if (success) console.info(`[Matrix] Screen brightness changed.`);
      else console.info(`[Matrix] Something went wrong with brightness...`, buffer);
      return;
    }

    // Effect / Animation Response (0x03, 0x02)
    if (buffer.length >= 5 && buffer[2] === 3 && buffer[3] === 2) {
      if (buffer[4] === 1) {
        console.info("[Matrix] MULTCPOK : Effect applied");
      } else if (buffer[4] === 0) {
        console.warn("[Matrix] ERROR : Effect Rejected");
      }
      return;
    }

    // Clock Style / Configuration Response (0x06, 0x01)
    if (buffer.length >= 5 && buffer[2] === 6 && buffer[3] === 1) {
      if (buffer[4] === 1) {
        console.info("[Matrix] Clock Style applied successfully");
      } else {
        console.warn("[Matrix] Clock Style application failed or unknown:", buffer[4]);
      }
      return;
    }

    // Calendar / Time Synchronization Response (0x01, 128)
    if (buffer.length >= 5 && buffer[2] === 1 && buffer[3] === 128) {
      console.info("[Matrix] Calendar/Time synced and acknowledged by device");
      return;
    }

    // Active Screen Display Status Response (0x03, 0x00) -> From askStatus()
    if (buffer.length >= 5 && buffer[2] === 3 && buffer[3] === 0) {
      const modes = { 0: "Clock/Widget Mode", 1: "Cloud/Internal Animation", 3: "DIY/Graffiti/Live Pixel Mode" };
      const activeMode = modes[buffer[4]] || `Unknown Mode (${buffer[4]})`;
      console.info(`[Matrix] Current active screen mode is: ${activeMode}`);
      return;
    }

    // Power-Saving Eco Mode Configuration Response (0x02, 128) -> From setEcoMode()
    if (buffer.length >= 5 && buffer[2] === 2 && buffer[3] === 128) {
      if (buffer[4] === 1) console.info("[Matrix] Eco Mode schedule updated");
      return;
    }

    // Device Lifecycle / Factory Reset Response (0x03, 128) -> From deleteDeviceData()
    if (buffer.length >= 4 && buffer[2] === 3 && buffer[3] === 128) {
      console.warn("[Matrix] FACTORY RESET ACKNOWLEDGED : Device is wiping data and rebooting...");
      return;
    }

    // Security / Password Management Response (0x04, 0x02 or 0x05, 0x02) -> From Password system
    if (buffer.length >= 5 && buffer[3] === 2) {
      if (buffer[2] === 4) {
        console.info(`[Matrix] Password Management applied. Action success state: ${buffer[4] === 1 ? "SUCCESS" : "FAILED"}`);
        return;
      }
      if (buffer[2] === 5) {
        if (buffer[4] === 1) {
          console.info("[Matrix] Password Verification: AUTHENTICATED");
        } else {
          this.#error("[Matrix] Password Verification: INVALID PIN CODE");
        }
        return;
      }
    }

    // Screen Sleep Timeout Read Response (0x0F, 128) -> From readScreenLight()
    if (buffer.length >= 5 && buffer[2] === 15 && buffer[3] === 128) {
      if (buffer[4] !== 255) {
        console.info(`[Matrix] Screen sleep timeout buffer received: ${buffer[4]} minutes`);
      } else {
        console.warn("[Matrix] Device returned empty read placeholder (0xFF)");
      }
      return;
    }

    // Handshake / Specs Status Check
    if (buffer.length >= 9 && buffer[2] === 0x01 && buffer[3] === 0x80) {
      const mcuVersionMajor = buffer[4];
      const mcuVersionMinor = buffer[5];
      const isScreenOn = buffer[6] === 1;
      const isPasswordProtected = buffer[8] === 1;
      
      console.log(`[Matrix] Firmware: ${mcuVersionMajor}.${mcuVersionMinor}`);
      console.log(`[Matrix] Screen On: ${isScreenOn}`);
      console.log(`[Matrix] Protected by password: ${isPasswordProtected}`);

      this.isPasswordProtected = isPasswordProtected;
      
      if (isPasswordProtected) {
        this.emit('passwordRequired');
      }
      return;
    }

    console.info("Received Buffer", buffer);
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
    if (!(await this.#ensureConnection())) return this.#error("[Matrix] Device not connected.");

    const packets = this._splitIntoChunks(payload, this.#CHUNK_SIZE);

    for (const packet of packets) {
      await this.ble.writeWithoutResponse(packet);
      await this.#delay(delayMs);
    }
  }

  /**
   * Sends a payload sequentially using async/await promises
   * @param {Uint8Array} payload - Complete command payload
   * @param {number} [msDelay=8] - Throttle delay between packet transmissions
   * @returns {Promise<void>}
   */
  async sendAsync(payload, msDelay = 8) {
    if (!(await this.#ensureConnection())) return this.#error("[Matrix] Device not connected.");

    const packets = this._splitIntoChunks(payload, this.#CHUNK_SIZE);

    for (const packet of packets) {
      await this.ble.writeWithoutResponse(packet);
      await this.#delay(msDelay);
    }
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
   * @param {boolean} asyncMode - use sendAsync instead of send
   * @returns {Promise<void>}
   */
  async setPixel(x = 0, y = 0, r = 127, g = 127, b = 127, asyncMode = false) {
    const payload = new Uint8Array([
      10, 0x00, 0x05, 0x01, 0x00,
      this.clamp(r, 0, 255),
      this.clamp(g, 0, 255),
      this.clamp(b, 0, 255),
      this.clamp(x, 0, (this.width ?? 16) - 1),
      this.clamp(y, 0, (this.height ?? 16) - 1),
    ]);
    return await (asyncMode ? this.sendAsync(payload) : this.send(payload));
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
    const payload = new Uint8Array([
      0x06, 0x00, 0x0B, this.#MIN_VALUE,
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
      await this.sendAsync(payload);
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
   * Configures the clock style using the legacy protocol (Injects the RGB color)
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
   * Convertit l'index de configuration de l'UI en secondes réelles
   * @param {number} timeSign - L'index de durée (1 à 4)
   * @returns {number} Durée en secondes (par défaut 5)
   */
  getMaterialDuration(timeSign) {
    const durations = { 1: 10, 2: 30, 3: 60, 4: 300 };
    return durations[timeSign] || 5;
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

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    canvas.width = charWidth;
    canvas.height = targetHeight;
    
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

    const crcBytes = this.#uint32ToBytesLE(this.#calculateCRC32(innerPayload));
    const innerPayloadLenBytes = this.#uint32ToBytesLE(innerPayload.length);
    const totalLenBytes = this.#uint16ToBytesLE(16 + innerPayload.length);

    const fullPayload = new Uint8Array([
      ...totalLenBytes,
      0x03, 0x00, 0x00,
      ...innerPayloadLenBytes,
      ...crcBytes,
      0x00, 0x00, slotIndex,
      ...innerPayload
    ]);

    await this.sendAsync(fullPayload, 25);
  }

  /**
   * Processes, chunks, and uploads a raw PNG byte buffer to the matrix hardware memory
   * @param {ArrayBuffer|Uint8Array} buffer - Raw binary data of the PNG file
   * @returns {Promise<void>}
   */
  async sendDIYImage(buffer) {
    const pngData = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const len = pngData.length;

    const chunks = this._splitIntoChunks(pngData, 4096).map((chunk, index) => {
      const clen = chunk.length + 9;

      return new Uint8Array([
        (clen >>> 8) & 0xFF,
        clen & 0xFF,
        0x00, 0x00,
        index > 0 ? 0x02 : 0x00,
        
        (len >>> 24) & 0xFF,
        (len >>> 16) & 0xFF,
        (len >>> 8) & 0xFF,
        len & 0xFF,
        
        ...chunk
      ]);
    });

    for (const index in chunks) {
      const chunk = chunks[index];
      
      console.log(`[Matrix] Sending PNG chunk ${Number(index)}/${chunks.length}`);
      await this.sendAsync(chunk, 35);
    }
  }

  /**
   * Processes, chunks, and uploads a raw PNG byte buffer using the official protocol
   * @param {ArrayBuffer|Uint8Array} buffer - Raw binary data of the PNG file
   * @param {number} [mode=12] - Render mode or component ID (default: 12)
   * @returns {Promise<void>}
   */
  async sendImage(buffer, mode = 12) {
    const imageData = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    const crc = this.#uint32ToBytesLE(this.#calculateCRC32(imageData));
    const len = this.#uint32ToBytesLE(imageData.length);

    const chunks = this._splitIntoChunks(imageData, 4096).map((chunk, index) => {
      const length = chunk.length + 16;
      
      const byteLen = this.#uint16ToBytesLE(length);
      
      const timeValue = mode === 12 ? 0 : this.getMaterialDuration(mode);
      const byteTime = this.#uint16ToBytesLE(timeValue);

      return new Uint8Array([
        ...byteLen,
        0x02, 0x00,
        index > 0 ? 0x02 : 0x00,
        ...len,
        ...crc,
        ...byteTime,
        mode,
        ...chunk,
      ]);
    });

    for (const index in chunks) {
      const chunk = chunks[index];
      
      console.log(`[Matrix] Sending PNG chunk ${Number(index) + 1}/${chunks.length}`);
      await this.sendAsync(chunk, 35);
    }
  }
  
  /**
   * Transmits a raw, compressed GIF image file to the matrix
   * @param {ArrayBuffer|Uint8Array} buffer - Raw binary contents of the .gif file
   * @returns {Promise<void>}
   */
  async sendGif(buffer) {
    const gifData = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    
    const crcBytes = this.#uint32ToBytesLE(this.#calculateCRC32(gifData));
    const lenBytes = this.#uint32ToBytesLE(gifData.length);

    const chunks = this._splitIntoChunks(gifData, 4096).map((chunk, index) => {
      const clenBytes = this.#uint16ToBytesLE(chunk.length + 16);

      return new Uint8Array([
        ...clenBytes,
        0x01, 0x00,
        index > 0 ? 0x02 : 0x00,
        ...lenBytes,
        ...crcBytes,
        0x05, 0x00, 0x0d,
        ...chunk
      ]);
    });

    for (const index in chunks) {
      const chunk = chunks[index];
      
      console.log(`[Matrix] Sending GIF chunk ${Number(index) + 1}/${chunks.length}`);
      await this.sendAsync(chunk, 10);
      await this.#delay(150);
    }
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