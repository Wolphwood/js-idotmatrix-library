export class WebBluetoothAdapter {
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
  
  async scan({ prefix = '' } = {}) {
    this.devices.id.clear();
    this.devices.name.clear();

    const selectedDevice = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: prefix || 'IDM-' }
      ],
      optionalServices: [ this.service_uuid ]
    });

    const { id, name } = selectedDevice;
    let device = { id, name, raw: selectedDevice };

    if (device.id) this.devices.id.set(device.id, device);
    if (device.name) this.devices.name.set(device.name, device);
    
    console.log(`[+] Détecté : ${name} | ID: ${id}`);
    
    if (selectedDevice) {
      this.#device = selectedDevice;
      return this.#device;
    }
    
    return null;
  }

  async connect(device = this.#device, options = {}) {
    const maxTries = options.maxTries || 5;

    if (typeof device === 'string') {
      device = (this.devices.id.get(device) || this.devices.name.get(device) || this.devices.id.get(device))?.raw;
    }

    if (!device) device = await this.scan();

    this.#device = device;
    let tries = maxTries;
    let connected = false;

    do {
      tries--;
      try {
        this.#server = await this.#device.gatt.connect();

        const service = await this.#server.getPrimaryService(this.service_uuid);
        this.#notify = await service.getCharacteristic(this.notify_uuid);
        this.#write  = await service.getCharacteristic(this.write_uuid);

        this.#device.addEventListener('gattserverdisconnected', () => this.disconnect(), { once: true });

        connected = true;
      } catch (err) {
        console.error("Error during connection :", err);
        this.disconnect();
        
        if (tries > 0) {
          console.info("Retrying in one second...");
          await this.#delay(1000);
        }
      }
    } while (tries > 0 && !connected);

    if (!connected) {
      console.warn(`Failed to connect after ${maxTries} attempts.`);
      throw new Error(`Failed to connect after ${maxTries} attempts`);
    }

    return this.#server;
  }

  async disconnect() {
    if (this.#server && this.#server?.connected) {
      this.#server.disconnect();
      console.warn('Device disconnected.');
    }
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