* **[ French Version ](../fr/protocol.md)**
* **[ Documentation ](./doc.md)**

---

# TABLE OF CONTENTS
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
  * [HARDWARE SECURITY PAYLOADS (`setPassword` / `resetPassword` / `verifyPassword`)](#hardware-security-payloads-setpassword--resetpassword--verifypassword)
  * [DEVICE LIFECYCLE PAYLOAD (`deleteDeviceData`)](#device-lifecycle-payload-deletedevicedata)
  * [BUILTIN EFFECT PAYLOAD](#builtin-effect-payload)
  * [FULLSCREEN COLOR PAYLOAD](#fullscreen-color-payload)
  * [STOP RHYTHM PAYLOAD](#stop-rhythm-payload)
  * [CUSTOM RHYTHM PAYLOAD (`sendCustomRythm`)](#custom-rhythm-payload-sendcustomrythm)
  * [NATIVE HARDWARE RHYTHM PAYLOAD (`sendImageRythm`)](#native-hardware-rhythm-payload-sendimagerythm)
  * [MULTI-SCREEN JOINT DISPLAY PAYLOAD (`sendJoint`)](#multi-screen-joint-display-payload-sendjoint)
  * [SCOREBOARD PAYLOAD](#scoreboard-payload)

---

# PROTOCOL

## SCREEN POWER PAYLOAD (`screenOn` / `screenOff`)
Controls the power state of the LED matrix panel.
* **JS Methods:** `matrix.screenOn()` / `matrix.screenOff()`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet length (5 bytes) | NO |
| `0x00` | Constant / Header prefix | NO |
| `0x07` | Screen power command | NO |
| `0x01` | Sub-command | NO |
| `0x00` / `0x01` | State (`0x00` = Off, `0x01` = On) | YES |

---

## BRIGHTNESS PAYLOAD (`setBrightness`)
Modifies the global hardware brightness of the panel. Safely limited between 5 and 100 within the SDK.
* **JS Method:** `matrix.setBrightness(level)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet length (5 bytes) | NO |
| `0x00` | Constant / Header prefix | NO |
| `0x04` | Brightness command | NO |
| `0x80` | Protocol padding (`this.#MIN_VALUE`) | NO |
| `5 - 100` | Brightness intensity level byte | YES |

---

## SCREEN ROTATION PAYLOAD (`setRotation` / `flipScreen`)
Handles changing the screen display coordinates. The hardware treats axial 90° rotation and geometric 180° mirroring as separate rendering layers.
* **JS Methods:** `matrix.setRotation(angle)` / `matrix.flipScreen(enabled)`

### 1. Standard 90-Degree Pivot (`setRotation`)
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet length (5 bytes) | NO |
| `0x00` | Constant / Header prefix | NO |
| `0x03` | Configuration mode | NO |
| `0x01` | Sub-command | NO |
| `0` / `1` | Rotation angle (`0` = 0°, `1` = 90°) | YES |

### 2. Full 180-Degree Flip / Mirror Effect (`flipScreen`)
| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet length (5 bytes) | NO |
| `0x00` | Constant / Header prefix | NO |
| `0x06` | Clock display / Layout command | NO |
| `0x80` | Protocol padding (`this.#MIN_VALUE`) | NO |
| `0x00` / `0x01` | Flip state (`0x00` = Normal, `0x01` = Flipped 180°) | YES |

---

## BULK DATA STREAMING SUBSYSTEM (`sendText` / `sendImage` / `drawGif`)
Manages sending complex and large binary structures (fonts, bitmap images, optimized assets) using an embedded chunk-based streaming pipeline before physical BLE fragmentation.

### 1. Main Transport Header (16 bytes)
Every large asset stream must be prefixed with this 16-byte framing block.

| BYTE INDEX | TYPE | DESCRIPTION |
|---|---|---|
| `0 - 1` | `uint16` (LE) | Total packet length (Internal payload length + 16-byte header) |
| `2` | `uint8` | Fixed Opcode context (`0x03` = Target flash file write / bulk storage) |
| `3 - 4` | `uint16` | Padding constant / Subsystem markers (`0x00, 0x00`) |
| `5 - 8` | `uint32` (LE) | Internal payload length (Raw byte size of target resource) |
| `9 - 12` | `uint32` (LE) | Standard CRC32 checksum computed on raw internal payload bytes |
| `13 - 14` | `uint16` | System footer constants (`0x00, 0x00`) |
| `15` | `uint8` | Target hardware memory slot index (Defaults to `12` / Live display buffer) |

### 2. Logical Chunking Structure (PNG/GIF)
Large binaries are sliced into logical chunks of up to 4096 bytes. Each chunk uses the following envelope structure embedded inside BLE fragments:

| BYTE INDEX | TYPE | DESCRIPTION |
|---|---|---|
| `0 - 1` | `int16` (LE) | Calculated length tracker (`Total file length + total number of chunks`) |
| `2 - 3` | `uint16` | Sequence spacing constants (`0x00, 0x00` for first packet, or `0x02, 0x00` for subsequent packets) |
| `4 - 7` | `uint32` (LE) | Overall expected payload length |
| `8 - 11` | `uint32` (LE) | Duplicate CRC32 signature validation |
| `12 - 14` | `uint8` [3] | Internal firmware routing header (`0x05, 0x00, 0x0d`) |
| `15+` | `bytes` | Raw binary data segment |

---

## GRAFFITI PAYLOAD (`drawImage`)
Allows direct streaming of a full uncompressed RGB matrix grid for instant real-time canvas rendering.
* **JS Method:** `matrix.drawImage(rgbBuffer)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `Varies` | Dynamic size based on matrix hardware dimensions | NO |
| `0x00` | Initialization constant | NO |
| `0x05` | Low-level graphic display command | NO |
| `0x01` | Direct frame injection mode | NO |
| `0x00` | Destination animation frame index byte | NO |
| `0x01` | Total frames sent in session (`1`) | NO |
| `0x00, 0x00` | X-coordinate rendering offset (Horizontal) | YES |
| `0x00, 0x00` | Y-coordinate rendering offset (Vertical) | YES |
| `Width` | Total width of display area (e.g., `16` or `32`) | NO |
| `Height` | Total height of display area (e.g., `16` or `32`) | NO |
| `0x00` | Compression status flag (`0x00` = Raw RGB) | NO |
| `0x00` | Padding constant | NO |
| `12` | Target live view context mode channel index (Live Graffiti) | NO |
| `0-255` [ ] | Flat sequential array of raw RGB color channels (`[R, G, B, R, G, B...]`) | YES |

---

## CUSTOM EFFECT PAYLOAD
Configures rhythm animations combined with custom background lighting effects.
* **JS Method:** `matrix.setCustomEffect(flags, r, g, b)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x08` | Packet length (8 bytes) | NO |
| `0x00` | Constant | NO |
| `0x06` | Global audio / visual command | NO |
| `0x01` | Custom effect sub-command | NO |
| `0-255` | Visual rendering mode configuration flags | YES |
| `0-255` | Effect background Red channel | YES |
| `0-255` | Effect background Green channel | YES |
| `0-255` | Effect background Blue channel | YES |

---

## FREEZE SCREEN PAYLOAD
Toggles the freeze display state of the matrix screen, temporarily pausing the current frame rendering loop.
* **JS Method:** `matrix.setScreenFreeze(enabled)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet length (5 bytes) | NO |
| `0x00` | Constant | NO |
| `0x04` | Screen system command | NO |
| `0x02` | Refresh control sub-command | NO |
| `0x00` / `0x01` | Freeze state (`0x00` = Fluid/Normal, `0x01` = Frozen) | YES |

---

## TIME SYNC PAYLOAD
Updates the matrix's internal real-time clock (RTC) registers with the host's current temporal parameters.
* **JS Method:** `matrix.setClockTime(date)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x0a` | Packet length (10 bytes) | NO |
| `0x00` | Constant / Header prefix | NO |
| `0x01` | Time management command | NO |
| `0x01` | Temporal update sub-command | NO |
| `0 - 99` | Year (Two-digit representation of the current year, e.g., `26` for 2026) | YES |
| `1 - 12` | Month of the year | YES |
| `1 - 31` | Day of the month | YES |
| `0 - 23` | Current hour | YES |
| `0 - 59` | Current minute | YES |
| `0 - 59` | Current second | YES |

---

## CHRONOGRAPH PAYLOAD
Manages states for the built-in hardware Stopwatch tool widget.
* **JS Method:** `matrix.setStopwatch(status)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x06` | Packet length (6 bytes) | NO |
| `0x00` | Constant | NO |
| `0x02` | Tool widgets command | NO |
| `0x01` | Stopwatch sub-command | NO |
| `1` / `2` / `3` | State indicator (`1` = Reset, `2` = Start, `3` = Pause) | YES |
| `0x00` | Mandatory padding | NO |

---

## CLOCK CONFIGURATION PAYLOAD
Configures the visual layout, color palette, and format metrics of the system Clock widget.
* **JS Method:** `matrix.setClockStyle(style, visibleDate, hour24, r, g, b, colonBlink)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x0d` | Packet length (13 bytes) | NO |
| `0x00` | Constant | NO |
| `0x01` | Clock display command | NO |
| `0x02` | Visual style sub-command | NO |
| `0 - 7` | Clock face layout index | YES |
| `0x00` / `0x01` | Date block visibility (`0x00` = Hidden, `0x01` = Displayed) | YES |
| `0x00` / `0x01` | Time display format (`0x00` = 12-hour, `0x01` = 24-hour) | YES |
| `0 - 255` | Red channel for clock digits | YES |
| `0 - 255` | Green channel for clock digits | YES |
| `0 - 255` | Blue channel for clock digits | YES |
| `0x00` / `0x01` | Blinking of the separating colon (`:`) | YES |
| `0x00, 0x00` | Additional closing padding | NO |

---

## COUNTDOWN PAYLOAD
Configures and pilots the internal countdown timer routine.
* **JS Method:** `matrix.setCountdown(status, minutes, seconds)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x09` | Packet length (9 bytes) | NO |
| `0x00` | Constant | NO |
| `0x02` | Tool widgets command | NO |
| `0x02` | Countdown sub-command | NO |
| `1` / `2` / `3` | State indicator (`1` = Reset, `2` = Start, `3` = Pause) | YES |
| `0 - 59` | Initial minutes value | YES |
| `0 - 59` | Initial seconds value | YES |
| `0x00, 0x00` | Completion padding | NO |

---

## ECO MODE PAYLOAD (`setEcoMode`)
Schedules a power-saving curfew window, implementing a timed automatic shutdown or dimmed panel state.
* **JS Method:** `matrix.setEcoMode(flag, startH, startM, endH, endM, light)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x0b` | Packet length (11 bytes) | NO |
| `0x00` | Constant / Header prefix | NO |
| `0x09` | Power saving command | NO |
| `0x01` | Schedule activation sub-command | NO |
| `0x00` / `0x01` | Global activation state (`0x00` = Disabled, `0x01` = Scheduled) | YES |
| `0 - 23` | Activation trigger hour block | YES |
| `0 - 59` | Activation trigger minute block | YES |
| `0 - 23` | Deactivation trigger hour block | YES |
| `0 - 59` | Deactivation trigger minute block | YES |
| `5 - 100` | Restricted panel brightness intensity during curfew | YES |

---

## DEVICE STATUS INTERROGATION (`askStatus`)
**⚠️ Experimental Feature** Queries the microcontroller to pull its current execution runtime context. The device replies asynchronously via a GATT notification specifying its current operating mode (Clock, Storage Animation, Live Sketch, etc.).
* **JS Method:** `matrix.askStatus()`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x04` | Packet length (4 bytes) | NO |
| `0x00` | Constant | NO |
| `0x04` | System interrogation command | NO |
| `0x01` | Volatile status read sub-command | NO |

---

## SCREEN SLEEP TIMEOUT READ (`readScreenLight`)
**⚠️ Experimental Feature** Queries the matrix to return its configured automatic display standby sleep timer threshold. The response must be intercepted on the notification characteristic.
* **JS Method:** `matrix.readScreenLight()`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x04` | Packet length (4 bytes) | NO |
| `0x00` | Constant | NO |
| `0x0b` | Power configuration command | NO |
| `0x01` | Sleep timeout read sub-command | NO |

---

## HARDWARE SECURITY PAYLOADS (`setPassword` / `resetPassword` / `verifyPassword`)
**⚠️ Experimental Feature** *Note: The internal hardware microcontroller processes incoming BLE primitives directly without strict cryptographic sessions. Access control and validation locks are primarily established and validated at the client application layer.*

### 1. Set / Reset PIN Lock (`setPassword` / `resetPassword`)
* **JS Methods:** `matrix.setPassword(pincode)` / `matrix.resetPassword(pincode)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `Dynamic` | Packet length (4 + number of PIN code bytes) | NO |
| `0x00` | Constant | NO |
| `0x0d` | Security register command | NO |
| `0x01` / `0x02` | Sub-command (`0x01` = Set, `0x02` = Reset) | NO |
| `Bytes` | Converted numeric characters composing the lock PIN code | YES |

### 2. Validate Session PIN (`verifyPassword`)
* **JS Method:** `matrix.verifyPassword(pincode)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `Dynamic` | Packet length (4 + number of PIN code bytes) | NO |
| `0x00` | Constant | NO |
| `0x0d` | Security register command | NO |
| `0x03` | Session authentication / verification sub-command | NO |
| `Bytes` | Numeric characters composing the session authentication PIN | YES |

---

## DEVICE LIFECYCLE PAYLOAD (`deleteDeviceData`)
**⚠️ Experimental Feature** Triggers a total hardware factory clear on the device, formatting flash memory partitions and forcing a firmware reboot.
* **JS Method:** `matrix.deleteDeviceData()`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x04` | Packet length (4 bytes) | NO |
| `0x00` | Constant | NO |
| `0xa0` | Hardware lifecycle command | NO |
| `0x55` | Data wipe validation sub-command | NO |

---

## BUILTIN EFFECT PAYLOAD
Triggers one of the factory-preset animations baked directly into the device's firmware memory.
* **JS Method:** `matrix.setBuiltInEffect(index)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x05` | Packet length (5 bytes) | NO |
| `0x00` | Constant | NO |
| `0x04` | Animation system mode | NO |
| `0x03` | Builtin effect sub-command | NO |
| `0 - 255` | Internal hardware preset animation index map | YES |

---

## FULLSCREEN COLOR PAYLOAD
Instantly fills the entirety of the LED matrix panel with a uniform, solid static color.
* **JS Method:** `matrix.setSolidColor(r, g, b)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x07` | Packet length (7 bytes) | NO |
| `0x00` | Constant | NO |
| `0x04` | Animation system mode | NO |
| `0x05` | Solid color sub-command | NO |
| `0 - 255` | Global background Red channel | YES |
| `0 - 255` | Global background Green channel | YES |
| `0 - 255` | Global background Blue channel | YES |

---

## STOP RHYTHM PAYLOAD
Terminates any active audio-reactive animations, music sync pulses, or spectrum capture loops immediately.
* **JS Method:** `matrix.stopRhythm()`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x06` | Packet length (6 bytes) | NO |
| `0x00` | Constant | NO |
| `0x06` | Global audio / visual command | NO |
| `0x02` | Audio routines stop sub-command | NO |

---

## CUSTOM RHYTHM PAYLOAD (`sendCustomRythm`)
Sends a raw calculated audio spectrum stream. The 32 vertical equalizer bands (values from 0 to 15) are compressed into 16 bytes using a 4-bit-per-column packing system.
* **JS Method:** `matrix.sendCustomRythm(style, matrixData)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `20` / `0x14` | Total packet length (20 bytes) | NO |
| `0x00` | Constant | NO |
| `0x06` | Audio / Rhythm system command | NO |
| `0x01` | Sub-command (Custom spectrum) | NO |
| `0-4` | Equalizer visual rendering style index | YES |
| `16 bytes` | Compressed spectrum data (2 columns per byte) | YES |

---

## NATIVE HARDWARE RHYTHM PAYLOAD (`sendImageRythm`)
Triggers an animation pulse or configures the status of one of the pre-recorded rhythm presets found in the hardware micrologiciel.
* **JS Method:** `matrix.sendImageRythm(type, mode)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `6` | Packet length (6 bytes) | NO |
| `0x00` | Constant | NO |
| `0x06` | Audio / Rhythm system command | NO |
| `0x03` | Sub-command (Native rhythm animation) | NO |
| `1-5` | Target rhythm animation preset index | YES |
| `1-7` | Intensity configuration or frame pose index | YES |

---

## MULTI-SCREEN JOINT DISPLAY PAYLOAD (`sendJoint`)
**⚠️ Experimental Feature** Configures the hardware setup and positioning when stitching multiple matrix units serially to act as a unified large modular display wall.
* **JS Method:** `matrix.sendJoint(mode)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `5` | Packet length (5 bytes) | NO |
| `0x00` | Constant | NO |
| `0x04` | Animation system mode | NO |
| `0x0c` | Juxtaposition configuration sub-command | NO |
| `0-255` | Geometric layout index or screen transition mode | YES |

---

## SCOREBOARD PAYLOAD
Updates and displays the built-in score tracking widget layout for two competing rival teams (A and B).
* **JS Method:** `matrix.setScoreboard(scoreA, scoreB)`

| VALUE | DESCRIPTION | CAN BE CHANGED |
|---|---|---|
| `0x08` | Packet length (8 bytes) | NO |
| `0x00` | Constant | NO |
| `0x02` | Tool widgets command | NO |
| `0x03` | Scoreboard sub-command | NO |
| `0 - 99` | Team A Score | YES |
| `0 - 99` | Team B Score | YES |
| `0x00, 0x00` | Mandatory final padding | NO |