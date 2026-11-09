# Media transfers: experimental reliability update

This document describes the integrated SDK changes. They are **not** validated on physical devices yet.

## Binary framing

- `sendDIYImage()` emits up to 4096 content bytes per block with a 9-byte header: LE16 block length, `00 00`, first/continuation flag `00`/`02`, and LE32 full content length. No CRC.
- `sendImage()`, `sendGif()`, and `sendText()` emit up to 4096 content bytes per block with a 16-byte header: LE16 block length, LE16 type, flag, LE32 full content length, LE32 global CRC32, LE16 duration, and slot index.
- BLE writes are contiguous **fragments** of each logical block. `fragmentSize` is a configured maximum write payload size, **not a negotiated ATT MTU**.
- The special slot index 12 forces the duration field to zero, as in the studied APK constructors.

```js
const matrix = new iDotMatrix({ fragmentSize: 20, ackTimeoutMs: 5000 });
await matrix.sendImage(pngBytes, { slotIndex: 2, durationValue: 300 });
await matrix.sendGif(gifBytes, { slotIndex: 12 });
```

## Completion semantics and events

`send()` completes after local BLE writes, without guaranteeing rendering. Media uploads complete on a terminal application-level acknowledgement, or reject on error, disconnect, or timeout. The result includes `family`, `status`, `raw`, `sentBlocks`, and `totalBlocks`; it **does not prove persistence** across power cycles.

`on(name, callback)` returns an unsubscribe callback. Available events: `notification`, `response`, `deviceInfo`, `passwordRequired`, `displayStatus`, `timeAck`, `passwordOrDrawingResponse`.

Response status mappings: image/GIF/text `1` continue, `3` terminal, `2` error (plus `0` for GIF in studied paths); DIY `2` continue and `0`/`1` terminal. These are based on APK DEX and third-party observations, not a universal firmware guarantee. No generic transaction ID is established. A timeout leaves the device state uncertain; avoid blind retransmissions.

## Migration

This version removes old signatures: `sendImage(data, number)` is rejected; images and GIFs accept only `{slotIndex, durationValue}`, both defaulting to 12 and 0. Unknown keys are rejected. `getMaterialDuration()`, `sendAsync()`, `detectMaxMtu()` and shortcuts `matrix.ctx`, `clearInternalCanvas()`, `internalCanvasToBuffer()` are removed. Use `send()`, `matrix.canvas.ctx`, `matrix.canvas.clear()` and `matrix.canvas.toBuffer()`. `setPixel()` no longer takes `asyncMode`. Constructor options are `bluetoothadapter` and `canvasadapter`; aliases `bluetooth` and `canvas` are rejected.


- Media Promise rejections now reflect application status errors or missing ACKs. Commands without a known ACK still mean local write completion only.
- Long text uses multiple logical blocks and one global CRC. Glyph encoding and display-specific variants still need separate validation.

Validation: unit tests against a fake BLE adapter; physical tests on 16×16, 32×32 and 64×64 devices remain outstanding.

## Integration with BLE and Canvas adapters

In Node, use `createNodeMatrix()` from `node.js`. See [BLE](ble.md) and [Canvas](canvas.md).

`requestDeviceInfo()` is an explicit `04 00 01 80` firmware query. `getDeviceInfo()` reads the optional `0x2901` descriptor without treating its absence as a fatal error. Both sources can resize the Canvas for recognized models, which clears its previous content.
