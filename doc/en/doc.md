# IDotMatrix Class Documentation

The `IDotMatrix` class allows you to control iDotMatrix LED matrices via the Bluetooth Low Energy protocol (Web Bluetooth API). It handles display configuration, scrolling text animations, image and GIF uploads, as well as managing built-in hardware widgets like the stopwatch, countdown timer, and scoreboard.

---

* **[ French version ](../fr/doc.md)**
* **[ Protocols ](./protocol.md)**

---

## Table of Contents

* [Initialization and Connection](https://www.google.com/search?q=%23initialization-and-connection)
* [Properties and Getters](https://www.google.com/search?q=%23properties-and-getters)
* [Screen Control and Display](https://www.google.com/search?q=%23screen-control-and-display)
* [Widgets and Tools (Scoreboard, Stopwatch, Countdown)](https://www.google.com/search?q=%23widgets-and-tools-scoreboard-stopwatch-countdown)
* [Rhythm Animations and Audio](https://www.google.com/search?q=%23rhythm-animations-and-audio)
* [Scrolling Text Display](https://www.google.com/search?q=%23scrolling-text-display)
* [Images and GIFs](https://www.google.com/search?q=%23images-and-gifs)
* [Administration and Advanced Settings](https://www.google.com/search?q=%23administration-and-advanced-settings)

---

## Initialization and Connection

### `constructor()`

Initializes the instance, prepares the private BLE properties, and creates an internal rendering canvas.

### `connect()`

Triggers device discovery and pairing with a Bluetooth device whose name starts with `IDM-`. It attempts to connect to the device's GATT services and characteristics, utilizing a 5-retry mechanism in case of failure.

* **Returns:** `Promise<void>`

### `disconnect()`

Cleanly disconnects from the currently active device and removes all registered event listeners.

* **Returns:** `Promise<void>`

**Usage Example:**

```javascript
import { IDotMatrix } from './IDotMatrix.js';

const matrix = new IDotMatrix();

// Connection triggered by a user action (e.g., button click)
document.getElementById('connectBtn').addEventListener('click', async () => {
  await matrix.connect();
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

* **Parameter:** `level` (`number`): Brightness value ranging from `5` to `100`.

### `setFullscreenColor(r, g, b)`

Fills the entire screen with a single solid color.

* **Parameters:** `r`, `g`, `b` (`number`): RGB color components from `0` to `255`.

### `setImageMode(mode)`

Activates or deactivates the DIY drawing / live pixel mode on the matrix.

* **Parameter:** `mode` (`number`): `0` = disabled, `1` = enabled (default).

### `setPixel(x, y, r, g, b, asyncMode)`

Modifies the color of a single pixel on the matrix grid.

* **Parameters:**
* `x`, `y` (`number`): Coordinates of the target pixel.
* `r`, `g`, `b` (`number`): Color components (`0` to `255`).
* `asyncMode` (`boolean`): If `true`, transmits the data packet without awaiting strict acknowledgment (`sendAsync`).



### `clearPixel(x, y)`

Turns off a specific pixel (equivalent to applying a black color layout `0, 0, 0`).

### `setEffect(style, speed, rgbValues)`

Activates a predefined procedural animation effect with a custom color palette.

* **Parameters:**
* `style` (`number`): Index of the effect (`0` to `6`).
* `speed` (`number`): Animation playback speed (`1` to `100`).
* `rgbValues` (`Array<Array<number>>`): An array containing between 2 and 7 RGB sub-arrays (e.g., `[[255,0,0], [0,255,0]]`).



---

## Widgets and Tools (Scoreboard, Stopwatch, Countdown)

### `setScoreboard(score1, score2)`

Updates the real-time scoreboard widget displayed on the screen.

* **Parameters:** `score1`, `score2` (`number`): Scores for both sides (ranging from `0` to `999`).

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

## Rhythm Animations and Audio

### `setMicType(type)`

Configures the audio source processing input for music-reactive animations.

* **Parameter:** `type` (`number`): `0` = Matrix's internal physical microphone, `1` = Remote software mode (App/PC stream).

### `sendRhythmSimulation(globalMode, currentVolumeIntensity)`

A unified routing method to stream audio equalizer rhythm configurations to the matrix.

* **Parameters:**
* `globalMode` (`number`): Mode selection from `0` to `9`. Modes `0-4` activate a software-driven adaptive equalizer, while `5-9` trigger internal hardware-defined animations.
* `currentVolumeIntensity` (`number`): Simulated volume intensity scale between `0` and `1`.



### `stopMusicRhythm()`

Immediately stops displaying any music-reactive animations or equalizer stream effects.

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

### `sendImage(arrayBuffer)`

Slices, chunks, and uploads a raw **PNG** image file buffer to the matrix's hardware memory.

* **Parameter:** `arrayBuffer` (`Uint8Array`): Binary byte buffer representation of the PNG file.

### `sendGif(buffer)`

Processes and transfers a **GIF** file (animated or static) to the matrix using a multi-packet chunking system tailored to the BLE protocol constraints.

* **Parameter:** `buffer` (`ArrayBuffer|Uint8Array`): Raw binary contents of the `.gif` file.

---

## Administration and Advanced Settings

### `setClockTime(date)`

Synchronizes the matrix's internal real-time clock with a specific host date and time context.

* **Parameter:** `date` (`Date`): A JavaScript Date instance (defaults to `new Date()`).

### `setClockStyle(style, visibleDate, hour24, r, g, b)`

Configures the visual layout layout and appearance of the built-in Clock widget.

* **Parameters:**
* `style` (`number`): Visual style layout index (`0` to `7`).
* `visibleDate` (`boolean`): Shows or hides the extra date block component.
* `hour24` (`boolean`): 24-hour layout format (`true`) or 12-hour format (`false`).
* `r`, `g`, `b` (`number`): Display color for the digits.



### `flipScreen(enabled)`

Applies a 180-degree rotation to the full screen display (toggle mirror/reversed orientation layout).

* **Parameter:** `enabled` (`boolean`): `true` to invert/flip the layout, `false` for normal orientation.

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