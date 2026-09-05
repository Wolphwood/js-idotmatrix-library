# `iDotMatrix` documentation

The `iDotMatrix` class controls iDotMatrix LED panels over Bluetooth Low Energy. Protocol logic is separated from BLE transport through `WebBluetoothAdapter` (browser) and `NodeWebBluetoothAdapter` (Node.js).

> ⚠️ Some commands remain experimental because their firmware behavior is not fully documented.

- **[README](../../README.md)**
- **[Version française](../fr/doc.md)**
- **[Protocol documentation](./protocol.md)**

## Table of contents

- [Adapter documentation](#adapter-documentation)
- [Utilities and properties](#utilities-and-properties)
  - [`clamp()`](#clampvalue-min-max)
  - [`_splitIntoChunks()`](#_splitintochunksarray-chunksize)
  - [`send()` / `sendAsync()`](#sendpayload-delayms-8-/-sendasyncpayload-msdelay-8)
- [Screen and drawing](#screen-and-drawing)
  - [`screenOn()` / `screenOff()`](#screenon-/-screenoff)
  - [`setBrightness()`](#setbrightnesslevel)
  - [`setFullscreenColor()`](#setfullscreencolorr-g-b)
  - [`setImageMode()`](#setimagemodemode-1)
  - [`setPixel()`](#setpixelx-y-r-g-b-asyncmode-false)
  - [`clearPixel()`](#clearpixelx-y)
  - [`setEffect()`](#seteffectstyle-speed-rgbvalues)
  - [`freezeScreen()` ⚠️ Experimental](#freezescreen-experimental)
- [Widgets](#widgets)
  - [`setScoreboard()`](#setscoreboardscore1-0-score2-0)
  - [`setChronograph()` / `chronograph`](#setchronographmode-0-/-chronograph)
  - [`setCountdown()` / `countdown`](#setcountdownmode-0-minutes-0-seconds-0-/-countdown)
- [Rhythm / audio](#rhythm-/-audio)
  - [`setMicType()`](#setmictypetype)
  - [`sendRythmSimulation()`](#sendrythmsimulationglobalmode-currentvolumeintensity-0)
  - [`sendCustomRythm()`](#sendcustomrythmstyle-rawheights)
  - [`sendImageRythm()`](#sendimagerythmanimindex-1-frame-1)
  - [`stopMusicRythm()`](#stopmusicrythm)
- [Clock and settings](#clock-and-settings)
  - [`setClockTime())`](#setclocktimedate-new-date)
  - [`setClockStyle()`](#setclockstylestyle-visibledate-true-hour24-true-r-255-g-255-b-255)
  - [`setTimeIndicator()` ⚠️ Experimental](#settimeindicatorenabled-true-experimental)
  - [`flipScreen()`](#flipscreenenabled-false)
  - [`setEcoMode()`](#setecomodeflag-starth-0-startm-0-endh-0-endm-0-light-10)
  - [`readScreenLight()` ⚠️ Experimental](#readscreenlight-experimental)
  - [`askStatus()`](#askstatus)
  - [`deleteDeviceData()`](#deletedevicedata)
- [Security ⚠️ Experimental](#security-experimental)
- [Text](#text)
  - [`textToBitmaps()`](#texttobitmapstext-targetheight-32-fontconfig-bold-22px-sans-serif)
  - [`sendText()`](#sendtexttextbitmaps-numchars-textmode-1-speed-95-textcolormode-1-textcolor-25500-textbgmode-0-textbgcolor-000-slotindex-12)
- [Images and GIF](#images-and-gif)
  - [`getMaterialDuration()`](#getmaterialdurationtimesign)
  - [`sendDIYImage()`](#senddiyimagebuffer)
  - [`sendImage()`](#sendimagebuffer-mode-12)
  - [`sendGif()`](#sendgifbuffer)
- [Multi-screen](#multi-screen)
  - [`sendJoint()` ⚠️ Experimental](#sendjointmode-experimental)

---

## Adapter documentation

Canvas and Bluetooth layers now have dedicated documentation so this reference can stay focused on the `iDotMatrix` API.

- [CanvasAdapter](./canvas.md) — Web/Node.js rendering, 2D context, resizing, and encoding.
- [BluetoothAdapter](./ble.md) — BLE transport, Web Bluetooth, Node.js, scanning, connection, and notifications.

## Utilities and properties

### `clamp(value, min, max)`
Clamps a number between `min` and `max`.

### `_splitIntoChunks(array, chunkSize)`
Splits a `Uint8Array` into chunks. Publicly reachable but primarily an internal helper.

### `send(payload, delayMs = 8)` / `sendAsync(payload, msDelay = 8)`
Ensure a connection, split the payload into 20-byte BLE fragments, write them sequentially without response, and throttle writes with a delay. In the current version both methods have the same general behavior.

## Screen and drawing

### `screenOn()` / `screenOff()`
Turn the display on or off.

### `setBrightness(level)`
Sets brightness, clamped to `5..100`.

### `setFullscreenColor(r, g, b)`
Fills the display with one RGB color. Components are clamped to `0..255`.

### `setImageMode(mode = 1)`
Configures DIY/drawing mode. The SDK accepts `0..255`; `0` disables and `1` enables the standard mode. Other values are firmware-dependent.

### `setPixel(x, y, r, g, b, asyncMode = false)`
Changes one pixel. Coordinates are clamped to detected dimensions (16×16 fallback when unknown). `asyncMode=true` uses `sendAsync()`.

### `clearPixel(x, y)`
Equivalent to `setPixel(x, y, 0, 0, 0)`.

### `setEffect(style, speed, rgbValues)`
Starts a procedural effect with a custom palette: `style` `0..6`, `speed` `1..100`, and 2 to 7 `[r,g,b]` colors.

### `freezeScreen()` ⚠️ Experimental
Sends `[0x04, 0x00, 0x03, 0x00]`. The method currently takes **no argument** and the exact firmware effect is unconfirmed.

## Widgets

### `setScoreboard(score1 = 0, score2 = 0)`
Sets both scores, clamped to `0..999`.

### `setChronograph(mode = 0)` / `chronograph`
Modes: `0` reset, `1` start, `2` pause, `3` resume. The `chronograph` getter exposes `set()`, `reset()`, `stop()`, `start()`, `pause()`, and `resume()`.

### `setCountdown(mode = 0, minutes = 0, seconds = 0)` / `countdown`
Mode is `0..3`, minutes `0..255`, seconds `0..59`. The getter exposes `disable()`, `stop()`, `reset()`, `start(minutes, seconds)`, `pause()`, and `resume()`, and keeps a local JavaScript timer for pause/resume tracking.

## Rhythm / audio

> The `Rythm` spelling is kept because it is the current public API.

### `setMicType(type)`
`0` = matrix microphone, `1` = remote/application source.

### `sendRythmSimulation(globalMode, currentVolumeIntensity = 0)`
Modes `0..4` generate a 32-column software spectrum; modes `5..9` drive hardware rhythm animations 1..5. Intensity is normally normalized to `0..1`.

### `sendCustomRythm(style, rawHeights)`
Sends 32 heights (`0..15`) packed into 16 bytes, two 4-bit values per byte. `style` is clamped to `0..4`.

### `sendImageRythm(animIndex = 1, frame = 1)`
Drives a hardware rhythm animation. `animIndex` is clamped to `0..5`, `frame` to `0..7`.

### `stopMusicRythm()`
Stops rhythm output through `sendImageRythm(0, 0)`.

Rhythm writes use a one-entry latest-frame queue: while a write is in progress, only the newest pending payload is retained.

## Clock and settings

### `setClockTime(date = new Date())`
Synchronizes year, month, day, weekday, hour, minute, and second from a `Date`.

### `setClockStyle(style, visibleDate = true, hour24 = true, r = 255, g = 255, b = 255)`
Configures style `0..7`, date visibility, 12/24-hour format, and RGB color.

### `setTimeIndicator(enabled = true)` ⚠️ Experimental
Enables/disables the clock time indicator (firmware-dependent, including the separator behavior).

### `flipScreen(enabled = false)`
Enables/disables display flipping.

### `setEcoMode(flag, startH = 0, startM = 0, endH = 0, endM = 0, light = 10)`
Configures an eco-mode schedule. Hours `0..23`, minutes `0..59`, brightness `5..100`.

### `readScreenLight()` ⚠️ Experimental
Requests the screen sleep timeout. The notification response is currently logged to the console.

### `askStatus()`
Requests the active display mode. The notification response is currently logged.

### `deleteDeviceData()`
Sends the device data reset command. Use with care.

## Security ⚠️ Experimental

`setPassword(pincode)`, `resetPassword(pincode)`, and `verifyPassword(pincode)` require exactly **6 decimal digits**. The PIN is encoded as three two-digit decimal values (`"123456"` → `12, 34, 56`).

## Text

### `textToBitmaps(text, targetHeight = 32, fontConfig = "bold 22px sans-serif")`
Renders each character to a monochrome bitmap through an HTML canvas. `targetHeight` is intended for `16`, `32`, or `64` and cannot exceed `matrix.height`.

> This method uses `document.createElement("canvas")` and is therefore **browser-native**. Node.js needs a compatible DOM/canvas implementation or externally generated bitmaps.

### `sendText(textBitmaps, numChars, textMode = 1, speed = 95, textColorMode = 1, textColor = [255,0,0], textBgMode = 0, textBgColor = [0,0,0], slotIndex = 12)`
Builds the text payload, computes CRC32, and uploads it to the selected memory slot. `textMode` is `0..7`, speed `1..100`, text color mode `1..4`, background mode `0..2`, and default slot is `12`.

```js
const text = 'Hello';
const bitmaps = matrix.textToBitmaps(text, 32, 'bold 22px sans-serif');
await matrix.sendText(bitmaps, text.length);
```

## Images and GIF

### `getMaterialDuration(timeSign)`
Maps `1 → 10 s`, `2 → 30 s`, `3 → 60 s`, `4 → 300 s`; other values return `5 s`.

### `sendDIYImage(buffer)`
Uploads PNG data through the DIY protocol in logical 4096-byte blocks.

### `sendImage(buffer, mode = 12)`
Uploads PNG data using the official framing with total length and CRC32. `mode=12` is the default direct display mode; modes `1..4` use `getMaterialDuration()`.

### `sendGif(buffer)`
Uploads compressed GIF data with total length and CRC32 in logical 4096-byte blocks.

All three methods accept `ArrayBuffer` or `Uint8Array`.

## Multi-screen

### `sendJoint(mode)` ⚠️ Experimental
Sends a multi-screen joint/transition mode. Exact values remain firmware-dependent.
