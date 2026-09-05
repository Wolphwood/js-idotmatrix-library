# BluetoothAdapter

Bluetooth adapters isolate BLE transport from the iDotMatrix protocol. The main class can therefore use the same command logic in browsers and Node.js.

## Table of contents

- [Architecture](#architecture)
- [BLE resources](#ble-resources)
- [WebBluetoothAdapter](#webbluetoothadapter)
- [NodeWebBluetoothAdapter](#nodewebbluetoothadapter)
  - [`scan()`](#scan)
- [Connection](#connection)
- [Disconnection](#disconnection)
- [Notifications](#notifications)
- [Writes](#writes)
- [MTU](#mtu)

---

## Architecture

```text
iDotMatrix
    ↓
BluetoothAdapter
├── WebBluetoothAdapter
└── NodeWebBluetoothAdapter
```

`iDotMatrix` builds protocol commands. The BLE adapter is only responsible for discovering the device, establishing the GATT connection, writing to the characteristic, and receiving notifications.

## BLE resources

| Resource | UUID |
| --- | --- |
| Service | `0x00FA` |
| Write | `0xFA02` |
| Notifications | `0xFA03` |

## WebBluetoothAdapter

`WebBluetoothAdapter` uses Web Bluetooth and is the browser transport provided by the library.

```js
const matrix = new iDotMatrix({
  bluetoothadapter: new WebBluetoothAdapter()
});

await matrix.connect();
```

Without a device identifier, Web connection can open the browser Bluetooth picker. The default filter targets iDotMatrix devices whose name starts with `IDM-`.

## NodeWebBluetoothAdapter

`NodeWebBluetoothAdapter` provides BLE transport under Node.js through the Web Bluetooth backend used by the project.

```js
const ble = new NodeWebBluetoothAdapter();

const matrix = new iDotMatrix({
  bluetoothadapter: ble
});
```

### `scan()`

Searches for available devices:

```js
const devices = await ble.scan({
  duration: 4000,
  prefix: "IDM-"
});
```

Supported options:

| Option | Description |
| --- | --- |
| `duration` | Scan duration |
| `prefix` | Device-name prefix |
| `suffix` | Device-name suffix |
| `firstOnly` | Stops/limits discovery to the first matching result |

A discovered device can then be passed to `connect()` using its identifier or name according to the adapter.

## Connection

The public connection API remains on `iDotMatrix`:

```js
await matrix.connect(deviceId);
```

Once connected, the adapter stores the device, GATT server, service, and characteristics required by the protocol.

## Disconnection

```js
await matrix.disconnect();
```

Disconnection is delegated to the adapter so transport management stays outside protocol logic.

## Notifications

The adapter starts notifications on `0xFA03` and forwards received data to the `iDotMatrix` layer.

Firmware responses are then interpreted by the main class. Some experimental responses may still be logged instead of being exposed through a finalized event API.

## Writes

Commands are written to `0xFA02` without response when supported by the protocol.

`iDotMatrix.send()` handles payload fragmentation and delegates each fragment to the adapter.

## MTU

`detectMaxMtu()` probes write sizes accepted by the BLE connection.

At present, this detection does not automatically change the fragmentation size used by `send()` / `sendAsync()`, which remains 20 bytes.
