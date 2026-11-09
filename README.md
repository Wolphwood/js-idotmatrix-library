# iDotMatrix & Protocol Control

[![wakatime](https://wakatime.com/badge/user/e7de38c3-c624-46fc-bc5f-60a312413e6b/project/da931237-f448-4b27-964a-02b05aafa1dd.svg)](https://wakatime.com/badge/user/e7de38c3-c624-46fc-bc5f-60a312413e6b/project/da931237-f448-4b27-964a-02b05aafa1dd)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![Browser](https://img.shields.io/badge/Browser-Web%20Bluetooth-blue)
![Node.js](https://img.shields.io/badge/Node.js-supported-green)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

JavaScript SDK and reverse-engineered BLE protocol documentation for controlling **iDotMatrix LED matrices**.

The project separates the high-level matrix protocol from the Bluetooth transport layer and currently provides:

- `WebBluetoothAdapter` for browsers using the Web Bluetooth API.
- `NodeWebBluetoothAdapter` for Node.js using the `webbluetooth` package.
- High-level controls for display, drawing, clock, countdown, scoreboard, rhythm effects, images, GIFs, text, settings, and experimental firmware commands.
- Low-level protocol documentation in French and English.

> Some protocol commands are still experimental or only partially understood. Firmware behavior may differ between devices/models.

I tried my best, I swear.

---

## 📜 License
- **[LICENSE](./LICENSE.md)**

---

## 📚 Documentation

### Français

- **[Documentation de l'API](./doc/fr/doc.md)**
- **[Documentation du protocole](./doc/fr/protocol.md)**
- [BLE](./doc/fr/ble.md), [Canvas](./doc/fr/canvas.md), [Transferts et migration](./doc/fr/sdk-transfers.md)

### English

- **[API documentation](./doc/en/doc.md)**
- **[Protocol documentation](./doc/en/protocol.md)**
- [BLE](./doc/en/ble.md), [Canvas](./doc/en/canvas.md), [Transfers and migration](./doc/en/sdk-transfers.md)

---

## 🚀 Quick Start

### Browser

`WebBluetoothAdapter` is used by default, so no adapter needs to be provided explicitly.

```javascript
import { iDotMatrix } from "./iDotMatrix.js";

const matrix = new iDotMatrix({
  throwErrors: true
});

document.getElementById("connectBtn").addEventListener("click", async () => {
  await matrix.connect();

  const info = await matrix.getDeviceInfo();
  console.log(info);

  await matrix.screenOn();
  await matrix.setFullscreenColor(0, 0, 0);
  await matrix.setBrightness(80);
});
```

Calling `connect()` without a device opens the Web Bluetooth device picker. The default browser scan targets devices whose name starts with `IDM-`.

### Node.js

Use the Node entrypoint, which provides BLE and Canvas adapters:

```javascript
import { createNodeMatrix } from "./node.js";

const matrix = createNodeMatrix({ fragmentSize: 20, ackTimeoutMs: 5000 });
const devices = await matrix.ble.scan({ duration: 4000, prefix: "IDM-" });
if (!devices.length) throw new Error("No iDotMatrix device found");
await matrix.connect(devices[0].id);
await matrix.setBrightness(80);
```

Install dependencies with `npm install`. `createNodeMatrix()` requires the native `canvas` package; BLE-only callers can inject `NodeWebBluetoothAdapter` into `iDotMatrix` without a Canvas. Node scanning supports `duration`, `prefix`, `suffix`, and `firstOnly`.

---

## 🛠️ Features

The SDK implements most features exposed by the official iDotMatrix application, including:

- Screen power and brightness.
- Full-screen RGB colors and individual pixel drawing.
- Procedural effects.
- Scoreboard.
- Chronograph and countdown.
- Clock synchronization and clock styles.
- Screen flip and eco mode.
- Rhythm/music visualization modes.
- PNG image upload.
- GIF upload.
- Text bitmap generation and text upload.
- Experimental password/security commands.
- Experimental status, screen timeout, time indicator, freeze, and multi-screen commands.
- Automatic BLE connection checks before writes.

### Image / GIF transfer

Image, GIF, and text transfers use the reverse-engineered iDotMatrix framing protocol, including CRC32 checksums and logical 4096-byte data blocks where required.

Prefer independent media options: `await matrix.sendImage(pngBytes, { slotIndex: 12, durationValue: 0 })`. GIF defaults are slot 12 and duration 0. Slot 12 forces duration to zero. Media methods return `{family, status, raw, sentBlocks, totalBlocks}` after a terminal application ACK; `send()` only await local writes.

### Device detection

`getDeviceInfo()` reads the connected matrix information and detects known panel dimensions.

Currently recognized models include:

| Model | Resolution |
| --- | --- |
| `TR1616` | 16×16 |
| `TR1632` | 16×32 |
| `TR2306` / `TR3232` | 32×32 |
| `TR2403` / `TR6464` | 64×64 |

---

## 🔌 BLE Architecture

The SDK itself contains the iDotMatrix protocol implementation. BLE-specific behavior is delegated to an adapter:

```text
iDotMatrix
└── GattAdapter
    ├── WebBluetoothAdapter
    └── NodeWebBluetoothAdapter
```

The matrix class configures the adapter with:

| BLE resource | UUID |
| --- | --- |
| Service | `0x00FA` |
| Write characteristic | `0xFA02` |
| Notification characteristic | `0xFA03` |

This separation makes it possible to add other transports/adapters without rewriting the matrix protocol implementation.

---

## ⚠️ Current Limitations

- Media ACK mappings remain experimental and require validation on physical 16×16, 32×32 and 64×64 devices.
- Media transfers reject on error status, disconnect or missing ACK. A terminal ACK does not prove persistence across power cycles.
- Text rendering and Canvas encoding work in browsers and Node.js through Canvas adapters.
- Typed notifications are exposed through `on()` / `off()`; `on()` returns an unsubscribe function.
- Explicit `disconnect()` disables automatic reconnection until `connect()` is called.

See the full API and protocol documentation for command-specific details.

---

## 🔬 Reverse Engineering

`RESEARCH.md` contains research notes collected while analyzing the official application and the hardware protocol.

These notes are useful as reverse-engineering references but should not be treated as the canonical public API documentation. The current implementation and files under `doc/` are the primary references for SDK behavior.

---

## ☕ Credits & Acknowledgments / Remerciements

This implementation and protocol reverse-engineering were made possible thanks to the work and tools from the following repositories:

- **[8none1/idotmatrix](https://github.com/8none1/idotmatrix)** and **[derkalle4/python3-idotmatrix-library](https://github.com/derkalle4/python3-idotmatrix-library)** - reference implementations that helped understand GIF features and matrix communication layouts.
- **[skylot/jadx](https://github.com/skylot/jadx)** - decompilation tool used to analyze the original application's bytecode and recover protocol behavior.

---

## 📄 Project Status

The library is under active reverse-engineering and development. Commands marked as experimental should be considered firmware-dependent until their behavior has been validated across more devices.
