# iDotMatrix Class Documentation

The `iDotMatrix` class allows you to control iDotMatrix LED matrices via the Bluetooth Low Energy protocol (Web Bluetooth API). It handles display configuration, scrolling text animations, image and GIF uploads, as well as managing built-in hardware widgets like the stopwatch, countdown timer, and scoreboard.

> ⚠️ **Warning:** Some features of this library are still in the experimental stage in the firmware. Their exact behavior and side effects are still somewhat unclear.

---

* **[ French version ](../fr/doc.md)**
* **[ Protocols ](./protocol.md)**

---

## Table of Contents
- [Initialization and Connection](#initialization-and-connection)
  - [`constructor()`](#constructor)
  - [`searchAndConnect()`](#searchandconnect)
  - [`connect()`](#connect)
  - [`getDeviceInfo()`](#getdeviceinfo)
  - [`disconnect()`](#disconnect)
- [Properties and Getters](#properties-and-getters)
  - [`isConnected`](#isconnected)
  - [`width` and `height`](#width-and-height)
  - [`ctx`](#ctx)
- [Screen Control and Display](#screen-control-and-display)
  - [`screenOn()`](#screenon)
  - [`screenOff()`](#screenoff)
  - [`clearInternalCanvas()`](#clearinternalcanvas)
  - [`setBrightness()`](#setbrightness)
  - [`setPixel()`](#setpixel)
  - [`setFullscreenColor()`](#setfullscreencolor)
  - [`freezeScreen()`](#freezescreen)
- [Widgets and Tools (Scoreboard, Stopwatch, Countdown)](#widgets-and-tools-scoreboard-stopwatch-countdown)
  - [`score`](#score)
  - [`chronograph`](#chronograph)
  - [`countdown`](#countdown)
- [Rythm Animations and Audio](#rythm-animations-and-audio)
  - [`sendImageRythm()`](#sendimagerythm)
  - [`sendCustomRythm()`](#sendcustomrythm)
  - [`stopMusicRythm()`](#stopmusicrythm)
- [Scrolling Text Display](#scrolling-text-display)
  - [`sendText()`](#sendtext)
- [Images and GIFs](#images-and-gifs)
  - [`internalCanvasToBuffer()`](#internalcanvastobuffer)
  - [`sendImage()`](#sendimage)
  - [`sendGif()`](#sendgif)
- [Administration and Advanced Settings](#administration-and-advanced-settings)
  - [`setClockTime()`](#setclocktime)
  - [`setClockStyle()`](#setclockstyle)
  - [`flipScreen()`](#flipscreen)
  - [`setEcoMode()`](#setecomode)
  - [`readScreenLight()`](#readscreenlight)
  - [`askStatus()`](#askstatus)
  - [`setPassword()`](#setpassword)
  - [`resetPassword()`](#resetpassword)
  - [`verifyPassword()`](#verifypassword)
  - [`sendJoint()`](#sendjoint)

---

## Initialization and Connection

### `constructor({ throwErrors })`
Initializes the instance, prepares the private BLE properties, and creates an internal rendering canvas.
* **Parameter:** `throwErrors` (`boolean`): Specifies whether errors are simply logged or thrown. Default: `true`

### `connect(deviceId)`
Triggers direct pairing to the specified device. ⚠️ Currently unavailable in the browser
* **Parameters** : `deviceId` (`string`) The device id.
* **Returns:** `Promise<void>`

### `searchAndConnect()`
Triggers device discovery and pairing with a Bluetooth device whose name starts with `IDM-`. It attempts to connect to the device's GATT services and characteristics, utilizing a 5-retry mechanism in case of failure.
* **Returns:** `Promise<void>`

### `disconnect()`
Cleanly disconnects from the currently active device and removes all registered event listeners.
* **Returns:** `Promise<void>`

### `detectMaxMtu()`
Dynamically determines the maximum packet size (MTU) supported by the Bluetooth link by testing several values (512, 244, 128, 64, 20 bytes). Updates the protocol's internal configuration.
* **Return value:** `Promise<number>`: The validated maximum MTU size.
**Usage Example:**

### `getDeviceInfo()`
Retrieves hardware information about the connected device (model, version, and display dimensions). This method also automatically updates the instance's `width` and `height` properties.
* **Returns:** `Promise<{ id: string, name: string, model: string, width: number, height: number, mtu: number } | null>`

```javascript
import { iDotMatrix } from './iDotMatrix.js';

const matrix = new iDotMatrix();

// Connection triggered by a user action (e.g., button click)
document.getElementById('connectBtn').addEventListener('click', async () => {
  await matrix.searchAndConnect();
  console.log(`Matrix dimensions: ${matrix.width}x${matrix.height}`);
});

```

---

## Properties and Getters
* **`ctx`** (`CanvasRenderingContext2D`): Retrieves the 2D rendering context of the internal canvas to draw directly onto it.
* **`width`** (`number`): The width of the detected matrix (defined post-connection, e.g., 16, 32, 64).
* **`height`** (`number`): The height of the detected matrix.

---

## Screen Control and Display

### `screenOn()`
Turns the matrix screen display ON.
* **Returns:** `Promise<void>`

### `screenOff()`
Turns the matrix screen display OFF.
* **Returns:** `Promise<void>`

### `setBrightness(level)`
Adjusts the global display brightness level.
* **Parameter:**
  * `level` (`number`): Brightness value ranging from `5` to `100`.
* **Return:** `Promise<void>`

### `setFullscreenColor(r, g, b)`
Fills the entire screen with a single solid color.
* **Parameters:**
  * `r`, `g`, `b` (`number`): RGB color components from `0` to `255`.
* **Return:** `Promise<void>`

### `setImageMode(mode)`
Activates or deactivates the DIY drawing / live pixel mode on the matrix.
* **Parameter:**
  * `mode` (`number`): `0` = disabled, `1` = enabled (default).

### `setPixel(x, y, r, g, b, asyncMode)`
Modifies the color of a single pixel on the matrix grid.
* **Parameters:**
  * `x`, `y` (`number`): Coordinates of the target pixel.
  * `r`, `g`, `b` (`number`): Color components (`0` to `255`).
  * `asyncMode` (`boolean`): If `true`, transmits the data packet without awaiting strict acknowledgment (`sendAsync`).
* **Return:** `Promise<void>`

### `clearPixel(x, y)`
Turns off a specific pixel (equivalent to applying a black color layout `0, 0, 0`).
* **Return:** `Promise<void>`

### `setEffect(style, speed, rgbValues)`
Activates a predefined procedural animation effect with a custom color palette.
* **Parameters:**
  * `style` (`number`): Index of the effect (`0` to `6`).
  * `speed` (`number`): Animation playback speed (`1` to `100`).
  * `rgbValues` (`Array<Array<number>>`): An array containing between 2 and 7 RGB sub-arrays (e.g., `[[255,0,0], [0,255,0]]`).
* **Return:** `Promise<void>`

### `freezeScreen(enabled)` **⚠️ Experimental**
Instantly freezes the current display of the matrix or returns control to normal refresh.
* **Parameter:**
  * `enabled` (`boolean`): `true` to freeze the screen, `false` to unfreeze it.
* **Return:** `Promise<void>`

### `clearInternalCanvas()`
Clears the instance’s internal 2D rendering canvas by resetting its dimensions based on the detected width and height of the matrix.
* **Return:** `void`

### `internalCanvasToBuffer()`
Compresses the current graphics state of the internal rendering canvas into a PNG-formatted byte buffer, ready for upload.
* **Return:** `Promise<Uint8Array>`: The binary buffer of the PNG image.

---

## Widgets and Tools (Scoreboard, Stopwatch, Countdown)

### `setScoreboard(score1, score2)`
Updates the real-time scoreboard widget displayed on the screen.
* **Parameters:**
  * `score1`, `score2` (`number`): Scores for both sides (ranging from `0` to `999`).

### `chronograph` (Getter)
Returns a control object to manipulate the built-in stopwatch feature:
* `chronograph.start()`: Starts the stopwatch.
* `chronograph.pause()`: Pauses the execution state.
* `chronograph.resume()`: Resumes counting.
* `chronograph.stop()` / `reset()`: Resets the stopwatch to zero.

### `countdown` (Getter)
Returns a control object to manage the device's countdown timer:
* `countdown.start(minutes, seconds)`: Launches a countdown for the specified duration.
* `countdown.pause()`: Pauses the countdown.
* `countdown.resume()`: Resumes from where it was paused.
* `countdown.disable()` / `stop()`: Stops and completely disables the countdown display.

---

## Rythm Animations and Audio

### `setMicType(type)`
Configures the audio source processing input for music-reactive animations.
* **Parameter:**
  * `type` (`number`): `0` = Matrix's internal physical microphone, `1` = Remote software mode (App/PC stream).
* **Return:** `Promise<void>`

### `sendRythmSimulation(globalMode, currentVolumeIntensity)`
A unified routing method to stream audio equalizer rythm configurations to the matrix.
* **Parameters:**
* `globalMode` (`number`): Mode selection from `0` to `9`. Modes `0-4` activate a software-driven adaptive equalizer, while `5-9` trigger internal hardware-defined animations.
* `currentVolumeIntensity` (`number`): Simulated volume intensity scale between `0` and `1`.
* **Return:** `Promise<void>`

### `sendImageRythm(animIndex, frame)`
Triggers a pulse or applies a specific configuration to one of the device's native rythmic animations.
* **Parameters:**
  * `animIndex` (`number`): The index of the target hardware animation (1–5).
  * `frame` (`number`): The configuration or intensity value for the pose (1–7).
* **Return:** `Promise<void>`

### `sendCustomRythm(style, rawHeights)`
Sends a custom audio spectrum to the screen’s equalizer. Compresses an array of 32 vertical bars into an optimized 16-byte structure (4 bits per column).
* **Parameters:**
  * `style` (`number`): The visual mode or rendering style of the equalizer on the matrix (0 to 4).
  * `rawHeights` (`Array<number>`): An array of exactly 32 integers ranging from `0` (minimum height) to `15` (maximum height).
* **Return:** `Promise<void>`

### `stopMusicRythm()`
Immediately stops displaying any music-reactive animations or equalizer stream effects.
* **Return:** `Promise<void>`

---

## Scrolling Text Display

Displaying text involves a two-step process: generating font bitmaps using the HTML5 Canvas API, and then streaming that raw binary layout to the matrix's local hardware storage.

### `textToBitmaps(text, targetHeight, fontConfig)`
Converts a string of characters into a binary font buffer format that the matrix can interpret.
* **Parameters:**
  * `text` (`string`): The input text to convert into bitmaps.
  * `targetHeight` (`number`): Target height of the text rendering block (`16`, `32`, or `64`). Must not exceed the matrix's actual screen height.
  * `fontConfig` (`string`): CSS font configuration string declaration (e.g., `"bold 22px sans-serif"`).
* **Returns:** `Uint8Array`

### `sendText(...)`
Sends the pre-formatted text configurations to the matrix to render and animate it.
* **Key Parameters:**
  * `textBitmaps` (`Uint8Array`): Font data buffer generated by `textToBitmaps`.
  * `numChars` (`number`): Character count of the string.
  * `textMode` (`number`): Scrolling animation type or text style (`0` to `7`).
  * `speed` (`number`): Scrolling animation speed (`1` to `100`).
  * `textColorMode` (`number`): Character color mode (`1` to `4`).
  * `textColor` (`Array<number>`): Text color formatted as `[R, G, B]`.
  * `slotIndex` (`number`): Targeted hardware memory slot allocation (defaults to `12`).
* **Return:** `Promise<void>`

**Usage Example:**

```javascript
const text = "Hello!";
const bitmaps = matrix.textToBitmaps(text, 32, "bold 22px Arial");

await matrix.sendText(
  bitmaps,
  text.length,
  1,               // Normal scrolling effect
  95,              // Animation speed
  1,               // Solid color mode
  [255, 0, 0],     // Red character text
  0,               // Normal/Transparent background
  [0, 0, 0]        // Background color
);

```

---

## Images and GIFs

### `getMaterialDuration(timeSign)`

Converts the application's configuration index (`timeSign`) into an actual duration in seconds, which is used by the matrix to handle the display timeout for stored media assets.

* **Parameter:**
  * `timeSign` (`number`): The duration configuration index (`1` to `4`).
* **Return value:** `number`: The corresponding duration in seconds (`5`, `10`, `30`, `60`, or `300`).

| Index (`timeSign`) | Returned Duration | Typical Usage |
| :--- | :--- | :--- |
| `1` | `10` seconds | Short display |
| `2` | `30` seconds | Medium display |
| `3` | `60` seconds (1 min) | Long display |
| `4` | `300` seconds (5 min) | Extended / Persistent display |
| Other / None | `5` seconds | Firmware default fallback |

> 💡 **Protocol Note:** The resulting duration in seconds is encoded as a 16-bit integer (`short`) and injected into bytes 13 and 14 of the data stream transport header (e.g., in `sendImage`). If the display mode is set to `12` (volatile Live/Graffiti drawing), both bytes must strictly be forced to `0x00, 0x00`.

### `sendDIYImage(arrayBuffer)`
Slices, chunks, and uploads a raw **PNG** image file buffer to the matrix's hardware memory.
⚠️ This sends the image in its raw form; strange effects may occur if the matrix is not in DIY mode.
* **Parameter:**
  * `arrayBuffer` (`Uint8Array`): Binary byte buffer representation of the PNG file.
* **Return:** `Promise<void>`

### `sendImage(arrayBuffer, mode = 12)`
Cuts out and uploads a raw **PNG** image file to the array's memory.
* **Parameters:**
  * `arrayBuffer` (`Uint8Array`): Binary buffer of the PNG file.
  * `mode` (`number`): Image upload mode; currently very poorly documented. Default: 12
* **Return:** `Promise<void>`

### `sendGif(buffer)`
Processes and transfers a **GIF** file (animated or static) to the matrix using a multi-packet chunking system tailored to the BLE protocol constraints.
* **Parameter:**
  * `buffer` (`ArrayBuffer|Uint8Array`): Raw binary contents of the `.gif` file.
* **Return:** `Promise<void>`

---

## Administration and Advanced Settings

### `setClockTime(date)`
Synchronizes the matrix's internal real-time clock with a specific host date and time context.
* **Parameter:**
  * `date` (`Date`): A JavaScript Date instance (defaults to `new Date()`).
* **Return:** `Promise<void>`

### `setClockStyle(style, visibleDate, hour24, r, g, b)`
Configures the visual layout layout and appearance of the built-in Clock widget.
* **Parameters:**
  * `style` (`number`): Visual style layout index (`0` to `7`).
  * `visibleDate` (`boolean`): Shows or hides the extra date block component.
  * `hour24` (`boolean`): 24-hour layout format (`true`) or 12-hour format (`false`).
  * `r`, `g`, `b` (`number`): Display color for the digits.
* **Return:** `Promise<void>`

### `setTimeIndicator(enabled)` **⚠️ Experimental**
Controls whether the two separator colons (`:`) on the clock display are enabled or blinking.
* **Parameter:**
  * `enabled` (`boolean`): `true` to enable/flash, `false` to hide/freeze.
* **Return:** `Promise<void>`

### `flipScreen(enabled)`
Applies a 180-degree rotation to the full screen display (toggle mirror/reversed orientation layout).
* **Parameter:**
  * `enabled` (`boolean`): `true` to invert/flip the layout, `false` for normal orientation.
* **Return:** `Promise<void>`

### `setEcoMode(flag, startH, startM, endH, endM, light)`
Schedules a specific time window for the automatic power-saving eco mode (automatic standby or brightness dimming).
* **Parameters:**
  * `flag` (`number`|`boolean`): Activation status of the eco mode schedule.
  * `startH`, `startM` (`number`): Start hour and minute configuration.
  * `endH`, `endM` (`number`): End hour and minute configuration.
  * `light` (`number`): Reduced brightness level applied during this operational window (`5` to `100`).

### `deleteDeviceData()`
Triggers a complete factory reset on the device, clearing all custom uploaded memory buffers and restarting the matrix.
* **Returns:** `Promise<void>`

### `readScreenLight()` **⚠️ Experimental**
Asks the display to return its current sleep timer. The response is intercepted asynchronously via notification events.
* **Return value:** `Promise<void>`

### `askStatus()` **⚠️ Experimental**
Queries the matrix's microcontroller to retrieve its current operating status. The device will respond asynchronously via a GATT notification indicating whether it is in Clock mode, Storage Animation mode, or has been switched to Live Drawing mode.
* **Return value:** `Promise<void>`

### `setPassword(pincode)` **⚠️ Experimental**
Sets a security PIN on the matrix. The string is converted and split into pairs of digits.
* **Parameter:**
  * `pincode` (`string`): A numeric code (e.g., `“123456”`).
* **Return:** `Promise<void>`

### `resetPassword(pincode)` **⚠️ Experimental**
Removes or resets the device’s lock password.
* **Parameter:**
  * `pincode` (`string`): The current numeric code to be reset.
* **Return:** `Promise<void>`

### `verifyPassword(pincode)` **⚠️ Experimental**
Sends the PIN to the matrix’s volatile verification register to authenticate the current BLE control session.
* **Parameter:**
  * `pincode` (`string`): The session PIN.
* **Return:** `Promise<void>`

### `sendJoint(mode)` **⚠️ Experimental**
Configures the geometric positioning of the display or screen transitions as part of a multi-screen installation (Joint screens).
* **Parameter:**
  * `mode` (`number`): Joint configuration index.
* **Return:** `Promise<void>`