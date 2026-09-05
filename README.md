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

### English

- **[API documentation](./doc/en/doc.md)**
- **[Protocol documentation](./doc/en/protocol.md)**

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

Use `NodeWebBluetoothAdapter`, scan for the matrix, then connect using the discovered device ID or name.

```javascript
import { iDotMatrix } from "./iDotMatrix.js";
import { NodeWebBluetoothAdapter } from "./bluetooth/NodeWebBluetoothAdapter.js";

const ble = new NodeWebBluetoothAdapter();

const matrix = new iDotMatrix({
  throwErrors: true,
  bluetoothadapter: ble
});

const devices = await ble.scan({
  duration: 4000,
  prefix: "IDM-"
});

if (!devices.length) {
  throw new Error("No iDotMatrix device found");
}

await matrix.connect(devices[0].id);

const info = await matrix.getDeviceInfo();
console.log(info);

await matrix.screenOn();
await matrix.setBrightness(80);
```

`NodeWebBluetoothAdapter.scan()` supports `duration`, `prefix`, `suffix`, and `firstOnly`.

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

- `detectMaxMtu()` probes supported write sizes but currently does **not** change the 20-byte fragmentation size used by `send()` and `sendAsync()`.
- `textToBitmaps()` uses `document.createElement("canvas")` and is therefore browser-native. Node.js requires externally generated bitmaps or a compatible DOM/canvas implementation.
- The internal canvas API (`ctx`, `clearInternalCanvas()`, `internalCanvasToBuffer()`) exists, but internal canvas initialization is currently disabled.
- Some notification responses and experimental firmware commands are currently logged rather than exposed through a finalized event API.
- Some reverse-engineered protocol details may be incomplete or firmware-dependent.

See the full API and protocol documentation for command-specific details.

---

## 🔬 Reverse Engineering

`RESEARCH.md` contains research notes collected while analyzing the official application and the hardware protocol.

These notes are useful as reverse-engineering references but should not be treated as the canonical public API documentation. The current implementation and files under `doc/` are the primary references for SDK behavior.

---

## ☕ Credits & Acknowledgments / Remerciements

This implementation and protocol reverse-engineering were made possible thanks to the work and tools from the following repositories:

- **[8none1/idotmatrix](https://github.com/8none1/idotmatrix)** and **[derkalle4/python3-idotmatrix-library](https://github.com/derkalle4/python3-idotmatrix-library)** — reference implementations that helped understand GIF features and matrix communication layouts.
- **[skylot/jadx](https://github.com/skylot/jadx)** — decompilation tool used to analyze the original application's bytecode and recover protocol behavior.

---

## 📄 Project Status

The library is under active reverse-engineering and development. Commands marked as experimental should be considered firmware-dependent until their behavior has been validated across more devices.
