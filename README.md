# iDotMatrix & Protocol Control

This project provides a comprehensive solution for controlling iDotMatrix LED matrices using the Bluetooth Low Energy (BLE) protocol via the Web Bluetooth API. It includes a high-level JavaScript SDK (`iDotMatrix.js`) and a complete mapping of the low-level hardware communication protocol.

I tried my best, I swear

---

## 📚 Documentation

Please choose your preferred language to access the full class API documentation and protocol specifications:

* **Français (FR)**
  * **[Documentation](./doc/fr/doc.md)**
  * **[Protocoles](./doc/fr/protocol.md)**
* **English (EN)**
  * **[Documentation](./doc/en/doc.md)**
  * **[Protocols](./doc/en/protocol.md)**

\* Note: Some of protocols specification can be inaccurate.

---

## 🚀 Quick Start / Démarrage Rapide

```javascript
import { iDotMatrix } from './iDotMatrix.js';

const matrix = new iDotMatrix();

// Connect to the LED Matrix on user interaction
document.getElementById('connectBtn').addEventListener('click', async () => {
  await matrix.connect();
  
  // Turn on and clear screen with a solid background color
  await matrix.screenOn();
  await matrix.setFullscreenColor(0, 0, 0); // Black / Clear
  
  // Set brightness level to 80%
  await matrix.setBrightness(80);
});
```

---

## 🛠️ Features

The vast majority of the official smartphone application features are implemented and supported in this repository.

---

## ☕ Credits & Acknowledgments / Remerciements

This implementation and protocol reverse-engineering were made possible thanks to the work and tools from the following repositories:

* **[8none1/idotmatrix](https://github.com/8none1/idotmatrix)** & **[derkalle4/python3-idotmatrix-library](https://github.com/derkalle4/python3-idotmatrix-library)** : Excellent reference implementations that helped a lot to understand gif features and matrix communication layouts.
* **[skylot/jadx](https://github.com/skylot/jadx)** : An invaluable decompilation tool used to analyze the original application's bytecode and extract underlying primitive logic.