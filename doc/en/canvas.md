# CanvasAdapter

`CanvasAdapter` provides a common rendering layer for Web and Node.js environments. `iDotMatrix` therefore no longer needs to depend directly on the DOM or on a specific Canvas implementation.

## Table of contents

- [Architecture](#architecture)
- [CanvasAdapter](#canvasadapter)
  - [Properties](#properties)
  - [`size`](#size)
  - [`ctx`](#ctx)
  - [`clear()`](#clear)
  - [`resize()`](#resize)
  - [`toBuffer()`](#tobuffer)
- [Web](#web)
- [Node.js](#nodejs)
- [Using it with iDotMatrix](#using-it-with-idotmatrix)

---

## Architecture

```text
iDotMatrix
    ↓
CanvasAdapter
├── WebCanvasAdapter
└── NodeCanvasAdapter
```

The adapter stores the canvas, its 2D context, its dimensions, and the last encoded buffer. Web and Node implementations expose the same public interface while using the native API available in their environment to create and encode the canvas.

## CanvasAdapter

```js
new CanvasAdapter({
  width: 16,
  height: 16
});
```

Default dimensions are `16 × 16`.

### Properties

| Property | Description |
| --- | --- |
| `width` | Current canvas width |
| `height` | Current canvas height |
| `canvas` | Native canvas instance |
| `context` | 2D rendering context |
| `lastbuffer` | Last buffer produced by `toBuffer()` |

### `size`

Returns the current dimensions:

```js
const { width, height } = canvas.size;
```

### `ctx`

Returns the 2D context directly:

```js
const ctx = canvas.ctx;

ctx.fillStyle = "#ff0000";
ctx.fillRect(0, 0, 8, 8);
```

The context remains the native Canvas 2D API exposed by the current environment.

### `clear()`

Clears the entire canvas:

```js
canvas.clear();
```

If no context is available, the method does nothing.

### `resize()`

Resizes the canvas:

```js
canvas.resize(32, 32);
```

Non-numeric, non-finite, zero, or negative values are ignored. The 2D context is acquired again after resizing.

### `toBuffer()`

Encodes the canvas content and returns its bytes:

```js
const buffer = await canvas.toBuffer();
```

The result is stored in `lastbuffer`.

Encoding is implemented by the concrete adapter: browsers use their Canvas/Blob API while Node.js uses the encoder provided by its Canvas implementation.

## Web

`WebCanvasAdapter` creates a canvas using the browser Canvas API.

```js
const canvas = new WebCanvasAdapter({
  width: 16,
  height: 16
});

canvas.ctx.fillStyle = "#00ff00";
canvas.ctx.fillRect(0, 0, 16, 16);

const buffer = await canvas.toBuffer();
```

The Web adapter requires an environment providing browser Canvas APIs.

## Node.js

`NodeCanvasAdapter` exposes the same interface in Node.js through the Canvas implementation configured by the library.

```js
const canvas = new NodeCanvasAdapter({
  width: 16,
  height: 16
});

canvas.ctx.fillStyle = "#00ff00";
canvas.ctx.fillRect(0, 0, 16, 16);

const buffer = await canvas.toBuffer();
```

Rendering code using `ctx` can therefore remain identical between Web and Node.js.

## Using it with iDotMatrix

Image rendering and encoding now belong to `CanvasAdapter`. The following former `iDotMatrix` internal APIs have been removed:

```text
ctx
clearInternalCanvas()
internalCanvasToBuffer()
```

Use the adapter directly:

```js
matrix.canvas.clear();

const ctx = matrix.canvas.ctx;
ctx.fillStyle = "#ff0000";
ctx.fillRect(0, 0, 16, 16);

const buffer = await matrix.canvas.toBuffer();
await matrix.sendImage(buffer);
```
