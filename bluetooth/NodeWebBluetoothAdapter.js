import { Bluetooth } from 'webbluetooth';

export class NodeWebBluetoothAdapter {
  #device = null;
  #server = null;
  #write = null;
  #notify = null;
  
  constructor(options = {}) {
    this.service_uuid = options.service;
    this.write_uuid   = options.write;
    this.notify_uuid  = options.notify;

    this.callbacks = [];

    this.devices = {
      id: new Map(),
      name: new Map(),
    };
  }

  #delay(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  get device() { return this.#device; }
  get connected() { return this.#device?.gatt?.connected; }
  
  async scan({ duration = 4000, prefix = '', suffix = '', firstOnly = false } = {}) {
    this.devices.id.clear();
    this.devices.name.clear();

    const deviceFound = (device) => {
      const id = device.id;
      const name = device.name || 'Inconnu';

      if (prefix && !name.startsWith(prefix)) return false;
      if (suffix && !name.endsWith(suffix)) return false;

      if (!this.devices.name.has(name) || !this.devices.id.has(id)) {
        this.devices.name.set(name, { id, name, raw: device });
        this.devices.id.set(id, { id, name, raw: device });
        
        console.log(`[+] Détecté : ${name} | ID: ${id}`);
      }

      return firstOnly;
    };

    const bluetooth = new Bluetooth({
      deviceFound,
      scanTime: Math.ceil(duration / 1000)
    });

    let timerId;
    const timeoutPromise = new Promise((resolve) => { 
      timerId = setTimeout(() => resolve([]), duration);
    });

    const scanPromise = bluetooth.requestDevice({ acceptAllDevices: true }).then((dev) => [dev]).catch(() => []);

    if (firstOnly) {
      await Promise.race([scanPromise, timeoutPromise]);
    } else {
      await timeoutPromise;
    }

    clearTimeout(timerId);
    
    if (typeof bluetooth.cancelScan === 'function') bluetooth.cancelScan();

    return Array.from(this.devices.id.values());
  }

  async connect(deviceTarget, options = {}) {
    const maxTries = options.maxTries ?? 5;

    // Find device
    const F = () => (this.devices.id.get(deviceTarget) || this.devices.name.get(deviceTarget))?.raw;
    
    if (!F()) await this.scan();
    this.#device = F();
    
    if (!this.#device) throw new Error(`Device ${deviceTarget} not found.`);

    let tries = maxTries;
    let connected = false;
    do {
      tries--;
      try {
        // GATT
        this.#server = await this.#device.gatt.connect();

        // Characteristics
        const service = await this.#server.getPrimaryService(this.service_uuid);
        this.#notify  = await service.getCharacteristic(this.notify_uuid);
        this.#write   = await service.getCharacteristic(this.write_uuid);

        connected = true;        
      } catch (err) {
        console.error("Error during connection :", err);
        
        try {
          if (this.#device?.gatt?.connected) {
            await this.#device.gatt.disconnect();
          }

          this.#server = null;
          this.#notify = null;
          this.#write = null;

          if (tries > 0) {
            console.info("Retrying in one second...");
            await this.#delay(1000);
          }
        } catch (e) {}
      }
    } while (tries > 0 && !connected);

    if (!connected) {
      console.warn(`Failed to connect after ${maxTries} attempts.`);
      throw new Error(`Failed to connect after ${maxTries} attempts`);
    }
    
    return this.#server;
  }

  async disconnect() {
    if (this.#server?.connected) this.#server.disconnect();
    this.#server = null;
    this.#notify = null;
    this.#write = null;
  }

  async writeWithoutResponse(data) {
    await this.#write.writeValueWithoutResponse(data);
  }
  
  registerNotificationCallback(callback) {
    this.callbacks.push(callback);
    return this.callbacks.length - 1;
  }
  unregisterNotificationCallback(index = -1) {
    if (index === -1) {
      this.callbacks.length = 0
    } else
    if (index >= 0 && index < this.callbacks.length) {
      this.callbacks.splice(index, 1);
    }
  }

  async startNotifications(callback) {
    if (callback) this.registerNotificationCallback(callback);

    await this.#notify.startNotifications();

    const listener = (event) => {
      const view = event.target?.value;
      const buffer = new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
      for (let callback of this.callbacks) callback(buffer);
    };
    
    this.#notify.addEventListener('characteristicvaluechanged', listener);
    this.#notify._currentListener = listener;
  }
  
  async stopNotifications() {
    this.unregisterNotificationCallback();
    
    if (this.#notify._currentListener) {
      this.#notify.removeEventListener('characteristicvaluechanged', this.#notify._currentListener);
      delete this.#notify._currentListener;
    }
  }

  async readDescriptor(descriptorUuid) {
    const descriptor = await this.#write.getDescriptor(descriptorUuid);
    const view = await descriptor.readValue();

    return new Uint8Array(view.buffer);
  }
}