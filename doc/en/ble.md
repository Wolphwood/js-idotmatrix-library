# BLE adapters - integrated revision

`WebBluetoothAdapter` and `NodeWebBluetoothAdapter` share `GattAdapter`: separate discovery, GATT connection/reconnection, a single notification listener per connection, sequential writes, disconnect callbacks and optional descriptor reads.

## Protocol and limitations

| Item | UUID |
|---|---|
| iDotMatrix service | `0x00FA` |
| Write characteristic | `0xFA02` |
| Default notification characteristic | `0xFA03` |

The notify characteristic is configurable. If `0xFA03` is unavailable, the adapter only accepts **a unique** notify/indicate characteristic under the expected service. This fallback is not proven compatible with every firmware; supply an explicit UUID when needed.

`fragmentSize=20` is an SDK write-value limit, **not a measured ATT MTU**. `ble.attMtu` stays `null` when the runtime does not expose it. No arbitrary MTU probe commands are sent.

## Browser

```js
import { iDotMatrix } from './iDotMatrix.js';
const matrix = new iDotMatrix({ fragmentSize: 20 });
await matrix.connect(); // User gesture required (HTTPS, compatible browser)
```

The default Web picker filters by `IDM-`, and `scan({prefix:''})` permits all devices. The browser `scan()` returns the selected native device (not an array).

## Node.js

```js
import { createNodeMatrix } from './node.js';
const matrix = createNodeMatrix();
const devices = await matrix.ble.scan({ duration: 4000, prefix: 'IDM-' });
if (devices.length) await matrix.connect(devices[0].id);
```

Node `scan()` returns `{id, name, raw}` entries and supports `duration`, `prefix`, `suffix` and `firstOnly`. The `webbluetooth` dependency is lazily imported on scan.

## Notifications, writes and device info

`startNotifications(callback)` registers a callback only once; `stopNotifications()` cleans up listeners and callbacks. `onDisconnect(callback)` returns an unsubscribe function. Media uploads serialize fragments and await protocol-specific continuation/terminal ACKs; regular `send()` resolve after local BLE writes only. Interrupted media operations reject, while a later command may reconnect. Explicit `disconnect()` disables auto-reconnection until `connect()` is called.

`getDeviceInfo()` reads the optional `0x2901` descriptor and synchronizes the Canvas dimensions when a supported model is identified. `requestDeviceInfo()` sends `04 00 01 80` and awaits a nine-byte firmware information notification.

**Validation:** automated mocks only, not a firmware/device conformance claim.
