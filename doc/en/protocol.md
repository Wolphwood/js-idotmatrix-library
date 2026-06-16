* **[ French Version ](../fr/protocol.md)**
* **[ Documentation ](./doc.md)**

---

# NAVIGATION
* [PROTOCOL](#protocol)
  * [SCREEN POWER PAYLOAD (`screenOn` / `screenOff`)](#screen-power-payload-screenon--screenoff)
  * [BRIGHTNESS PAYLOAD (`setBrightness`)](#brightness-payload-setbrightness)
  * [SCREEN ROTATION PAYLOAD (`setRotation` / `flipScreen`)](#screen-rotation-payload-setrotation--flipscreen)
  * [BULK DATA STREAMING SUBSYSTEM (`sendText` / `sendImage` / `drawGif`)](#bulk-data-streaming-subsystem-sendtext--sendimage--drawgif)
  * [GRAFFITI PAYLOAD (`drawImage`)](#graffiti-payload-drawimage)
  * [CUSTOM EFFECT PAYLOAD](#custom-effect-payload)
  * [FREEZE SCREEN PAYLOAD](#freeze-screen-payload)
  * [TIME SYNC PAYLOAD](#time-sync-payload)
  * [CHRONOGRAPH PAYLOAD](#chronograph-payload)
  * [CLOCK CONFIGURATION PAYLOAD](#clock-configuration-payload)
  * [COUNTDOWN PAYLOAD](#countdown-payload)
  * [ECO MODE PAYLOAD (`setEcoMode`)](#eco-mode-payload-setecomode)
  * [DEVICE STATUS INTERROGATION (`askStatus`)](#device-status-interrogation-askstatus)
  * [SCREEN SLEEP TIMEOUT READ (`readScreenLight`)](#screen-sleep-timeout-read-readscreenlight)
  * [HARDWARE SECURITY PAYLOAD (`setPassword` / `resetPassword` / `verifyPassword`)](#hardware-security-payload-setpassword--resetpassword--verifypassword)
  * [DEVICE LIFECYCLE PAYLOAD (`deleteDeviceData`)](#device-lifecycle-payload-deletedevicedata)
  * [BUILTIN EFFECT PAYLOAD](#builtin-effect-payload)
  * [FULLSCREEN COLOR PAYLOAD](#fullscreen-color-payload)
  * [STOP RHYTHM PAYLOAD](#stop-rhythm-payload)
  * [SCOREBOARD PAYLOAD](#scoreboard-payload)

---

# PROTOCOL

## SCREEN POWER PAYLOAD (`screenOn` / `screenOff`)
Controls the power state of the LED matrix panel.
* **JS Methods:** `matrix.screenOn()` / `matrix.screenOff()`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet Length (5 bytes) | NO |
| `0x00` | Constant / Header Prefix | NO |
| `0x07` | Screen Power Command | NO |
| `0x01` | Sub-Command | NO |
| `0x00` / `0x01` | State (`0x00` = Off, `0x01` = On) | YES |

---

## BRIGHTNESS PAYLOAD (`setBrightness`)
Changes the global hardware panel brightness. Clamped safely between 5 and 100 in the SDK.
* **JS Method:** `matrix.setBrightness(level)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet Length (5 bytes) | NO |
| `0x00` | Constant / Header Prefix | NO |
| `0x04` | Brightness Command | NO |
| `this.#MIN_VALUE` | Protocol padding (`0x80`) | NO |
| `5 - 100` | Brightness level intensity byte | YES |

---

## SCREEN ROTATION PAYLOAD (`setRotation` / `flipScreen`)
Handles changing the viewing coordinates of the display. The hardware treats 90° axial rotation and 180° geometric mirroring as separate rendering layers.
* **JS Methods:** `matrix.setRotation(angle)` / `matrix.flipScreen(enabled)`

### 1. Standard 90-Degree Pivot (`setRotation`)
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet Length (5 bytes) | NO |
| `0x00` | Constant / Header Prefix | NO |
| `0x03` | Configuration Mode | NO |
| `0x01` | Sub-Command | NO |
| `0` / `1` | Rotation Angle (`0` = 0°, `1` = 90°) | YES |

### 2. Full 180-Degree Flip Mirroring (`flipScreen`)
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet Length (5 bytes) | NO |
| `0x00` | Constant / Header Prefix | NO |
| `0x06` | Clock Display / Layout Command | NO |
| `this.#MIN_VALUE` | Protocol padding (`0x80`) | NO |
| `0x00` / `0x01` | Flip State (`0x00` = Normal, `0x01` = Flipped 180°) | YES |

---

## BULK DATA STREAMING SUBSYSTEM (`sendText` / `sendImage` / `drawGif`)
Handles sending complex, large structured binary structures (fonts, binary images, optimized files) using an embedded chunked streaming pipeline. 

### 1. Main Transport Header (16 bytes)
Every large asset stream must be prefaced by this 16-byte framing block before physical BLE fragmentation.

| BYTE INDEX | TYPE | DESCRIPTION |
|---|---|---|
| `0 - 1` | `uint16` (LE) | Total Packet Length (Inner Payload length + 16-byte header) |
| `2` | `uint8` | Fixed Opcode Context (`0x03` = Target File/Bulk Storage Flash write) |
| `3 - 4` | `uint16` | Constant padding / Subsystem markers (`0x00, 0x00`) |
| `5 - 8` | `uint32` (LE) | Inner Payload Length (Raw size of the targeted asset data) |
| `9 - 12` | `uint32` (LE) | Standard CRC32 Checksum calculated over the raw inner payload bytes |
| `13 - 14` | `uint16` | System Footer constants (`0x00, 0x00`) |
| `15` | `uint8` | Target hardware memory slot index (Defaults to `12` / Live Showcase) |

### 2. Logical Slicing Structure (PNG/GIF)
Large binaries are sliced into logical chunks of up to 4096 bytes. Each block uses the following layout wrapper embedded within the BLE fragmentation layers:

| BYTE INDEX | TYPE | DESCRIPTION |
|---|---|---|
| `0 - 1` | `int16` (LE) | Computed length tracker (`Total file length + total chunk count`) |
| `2 - 3` | `uint16` | Constant sequence spacers (`0x00, 0x00`) |
| `4` | `uint8` | Packet Sequence Flag (`0x00` = First block/Initialize Flash write, `0x02` = Continuity block) |
| `5 - 8` | `int32` (LE) | Total file size array length |
| `9+` | `bytes` | Raw sliced binary stream payload (Max 4096 bytes) |

---

## GRAFFITI PAYLOAD (`drawImage`)
Used for uncompressed real-time raw RGB frame rendering. Circumvents standard flash bulk write processing for immediate matrix interaction.
* **JS Method:** `matrix.drawImage(rgbaData, mode)`

| BYTE INDEX | TYPE | DESCRIPTION |
|---|---|---|
| `0 - 1` | `uint16` (LE) | Total framing packet size (`rgbBuffer.length + 16`) |
| `2` | `uint8` | Live Draw Opcode (`0x01` = Immediate Refresh Canvas write) |
| `3` | `uint8` | Constant padding (`0x00`) |
| `4` | `uint8` | Continuity Flag (`0x00` = Static single block execution) |
| `5 - 8` | `uint32` (LE) | Total RGB byte buffer size (`pixelCount * 3`) |
| `9 - 12` | `uint32` (LE) | Standard CRC32 Checksum calculated over the raw RGB bytes |
| `13` | `uint8` | Speed profile (`0x00` for a static frame injection) |
| `14` | `uint8` | Constant padding (`0x00`) |
| `15` | `uint8` | Target live view context mode channel index (e.g. `12` = Live Graffiti) |
| `16+` | `bytes` | Raw flattened sequential RGB color channels sequence (`[R,G,B,R,G,B...]`) |

---

## CUSTOM EFFECT PAYLOAD
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `6` | Packet Length | NO |
| `0x00` | Constant | NO |
| `0x05` | Graffiti Command | NO |
| `0x02` | Sub-Command `Clear Frame` | NO |
| `0x00` | Padding Constant 1 | NO |
| `0x00` | Padding Constant 2 | NO |

---

## FREEZE SCREEN PAYLOAD
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `5` | Packet Length | NO |
| `0x00` | Constant | NO |
| `0x03` | Configuration Mode | NO |
| `0x02` | Sub-Command | NO |
| `0` / `1` | Freeze State (`0` = Unfrozen, `1` = Frozen) | YES |

---

## TIME SYNC PAYLOAD
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `10` | Packet Length | NO |
| `0x00` | Constant | NO |
| `0x01` | Clock Target Subsystem | NO |
| `0x01` | Sub-Command | NO |
| `0-99` | Year Data Byte (Offset from 2000) | YES |
| `1-12` | Month Data Byte | YES |
| `1-31` | Day Data Byte | YES |
| `0-23` | Hour Data Byte | YES |
| `0-59` | Minute Data Byte | YES |
| `0-59` | Second Data Byte | YES |

---

## CHRONOGRAPH PAYLOAD
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `6` | Packet Length | NO |
| `0x00` | Constant | NO |
| `0x01` | Chrono Target Subsystem | NO |
| `0x02` | Sub-Command | NO |
| `1` / `2` / `3` | State Control (`1` = Reset, `2` = Start, `3` = Pause) | YES |
| `0x00` | Padding | NO |

---

## CLOCK CONFIGURATION PAYLOAD
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `8` | Packet Length | NO |
| `0x00` | Constant | NO |
| `0x01` | Clock Target Subsystem | NO |
| `0x03` | Sub-Command | NO |
| `0x01` / `0x02` | Clock Mode Style Index | YES |
| `0` / `1` | Time Format Mode (`0` = 12h, `1` = 24h) | YES |
| `0` / `1` | Temperature Unit Mode (`0` = °C, `1` = °F) | YES |
| `0` / `1` | Ambient Sensor Display Flag | YES |

---

## COUNTDOWN PAYLOAD
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `9` | Packet Length | NO |
| `0x00` | Constant | NO |
| `0x01` | Countdown Target Subsystem | NO |
| `0x04` | Sub-Command | NO |
| `1` / `2` / `3` | Operational Control (`1` = Reset, `2` = Start, `3` = Pause) | YES |
| `0-59` | Total Duration Minutes | YES |
| `0-59` | Total Duration Seconds | YES |
| `0x00` | Padding Byte 1 | NO |
| `0x00` | Padding Byte 2 | NO |

---

## ECO MODE PAYLOAD (`setEcoMode`)
Configures automated hardware power scheduling limits alongside safety floor brightness configurations.
* **JS Method:** `matrix.setEcoMode(flag, startH, startM, endH, endM, light)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x0A` | Packet Length (10 bytes) | NO |
| `0x00` | Constant / Header Prefix | NO |
| `0x02` | Power Management Target Subsystem | NO |
| `this.#MIN_VALUE` | Protocol padding (`0x80`) | NO |
| `0` / `1` | Eco Mode Active Flag (`0` = Disabled, `1` = Enabled) | YES |
| `0-23` | Activation Trigger Hour Block | YES |
| `0-59` | Activation Trigger Minute Block | YES |
| `0-23` | Deactivation Trigger Hour Block | YES |
| `0-59` | Deactivation Trigger Minute Block | YES |
| `5-100` | Restricted safety panel brightness intensity during active curfew | YES |

---

## DEVICE STATUS INTERROGATION (`askStatus`)
Pure request frame used to query the matrix microcontroller to report its layout operational environment status back via GATT notifications.
* **JS Method:** `matrix.askStatus()`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x04` | Packet Length (4 bytes) | NO |
| `0x00` | Constant / Header Prefix | NO |
| `0x03` | Core Lifecycle Target Subsystem | NO |
| `0x00` | Read Status Command Selector | NO |

### Incoming Notification Packet Shape (`0x03, 0x00`)
The device emits a 5-byte acknowledgement sequence back to the `0xfa03` characteristic:
`[0x05, 0x00, 0x03, 0x00, MODE]`

* `MODE = 0x00`: Screen currently operating in Standard Clock / Widget Mode.
* `MODE = 0x01`: Screen currently running Cloud Storage Assets / Internal Animations.
* `MODE = 0x03`: Screen currently hijacked by live drawing primitives (DIY / Live Pixel Mode).

---

## SCREEN SLEEP TIMEOUT READ (`readScreenLight`)
Queries the internal flash hardware parameters to request the duration of the current screen auto-sleep configuration.
* **JS Method:** `matrix.readScreenLight()`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet Length (5 bytes) | NO |
| `0x00` | Constant / Header Prefix | NO |
| `0x0F` | Storage Configuration Read Register | NO |
| `this.#MIN_VALUE` | Protocol padding (`0x80`) | NO |
| `0xFF` | Read Request Wildcard Flag | NO |

---

## HARDWARE SECURITY PAYLOAD (`setPassword` / `resetPassword` / `verifyPassword`)
> ⚠️ **SECURITY WARNING:** The internal microcontroller firmware executes all incoming BLE primitives regardless of the validation session state. Security layers are fully client-side and only enforced inside the official smartphone client app.

### 1. Set / Modify Hardware Pin Lock (`setPassword` / `resetPassword`)
* **JS Methods:** `matrix.setPassword(pincode)` / `matrix.resetPassword(pincode)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x08` | Packet Length (8 bytes) | NO |
| `0x00` | Constant / Header Prefix | NO |
| `0x04` | System Configuration Subsystem | NO |
| `0x02` | Security Sub-Command | NO |
| `0x00` / `0x01` | Operational Mode (`0x00` = Disable/Delete PIN, `0x01` = Active/Change PIN) | YES |
| `0-99` | Character digit pair segment 1 (e.g. PIN `"123456"` $\rightarrow$ `12` / `0x0C`) | YES |
| `0-99` | Character digit pair segment 2 (e.g. PIN `"123456"` $\rightarrow$ `34` / `0x22`) | YES |
| `0-99` | Character digit pair segment 3 (e.g. PIN `"123456"` $\rightarrow$ `56` / `0x38`) | YES |

### 2. Verify Session PIN code (`verifyPassword`)
* **JS Method:** `matrix.verifyPassword(pincode)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x07` | Packet Length (7 bytes) | NO |
| `0x00` | Constant / Header Prefix | NO |
| `0x05` | Volatile Session Validation Register | NO |
| `0x02` | Authentication Identifier | NO |
| `0-99` | Character digit pair segment 1 | YES |
| `0-99` | Character digit pair segment 2 | YES |
| `0-99` | Character digit pair segment 3 | YES |

---

## DEVICE LIFECYCLE PAYLOAD (`deleteDeviceData`)
Destructive internal command execution. Triggers complete hardware flash format erasing stored configurations, slots, and Wi-Fi data before requesting a hard hardware reboot.
* **JS Method:** `matrix.deleteDeviceData()`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x04` | Packet Length (4 bytes) | NO |
| `0x00` | Constant / Header Prefix | NO |
| `0x03` | Core Lifecycle Target Subsystem | NO |
| `this.#MIN_VALUE` | Destructive wipe constant parameter execution (`0x80`) | NO |

---

## BUILTIN EFFECT PAYLOAD
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `5` | Packet Length | NO |
| `0x00` | Constant | NO |
| `0x04` | Animation System Mode | NO |
| `0x03` | Sub-Command | NO |
| `0-255` | Internal Preset Animation Index Map | YES |

---

## FULLSCREEN COLOR PAYLOAD
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `7` | Packet Length | NO |
| `0x00` | Constant | NO |
| `0x04` | Animation System Mode | NO |
| `0x05` | Sub-Command | NO |
| `0-255` | Global Background Red Channel | YES |
| `0-255` | Global Background Green Channel | YES |
| `0-255` | Global Background Blue Channel | YES |

---

## STOP RHYTHM PAYLOAD
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `6` | Packet Length | NO |
| `0x00` | Constant | NO |
| `0x06` | Audio Command | NO |
| `0x02` | Sub-Command | NO |
| `0x00` | Stop Flag 1 | NO |
| `0x00` | Stop Flag 2 | NO |

---

## SCOREBOARD PAYLOAD
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `8` | Packet Length | NO |
| `0x00` | Constant | NO |
| `0x0a` | Scoreboard Command | NO |
| `0x80` | Sub-Command | NO |
| `0-255` | Score 1 Lower Byte (Little Endian) | YES |
| `0-255` | Score 1 Upper Byte (Little Endian) | YES |
| `0-255` | Score 2 Lower Byte (Little Endian) | YES |
| `0-255` | Score 2 Upper Byte (Little Endian) | YES |