* **[French version](../fr/protocol.md)**
* **[Documentation](./doc.md)**

## Table of contents

- [`screenOn()` / `screenOff()`](#screenon-screenoff)
- [`setBrightness()`](#setbrightnesslevel)
- [`setFullscreenColor()`](#setfullscreencolorr-g-b)
- [`setImageMode()`](#setimagemodemode)
- [`setPixel()`](#setpixelx-y-r-g-b)
- [`setEffect()`](#seteffectstyle-speed-rgbvalues)
- [`setScoreboard()`](#setscoreboardscore1-score2)
- [`setChronograph()`](#setchronographmode)
- [`setCountdown()`](#setcountdownmode-minutes-seconds)
- [`setMicType()`](#setmictypetype)
- [`sendCustomRythm()`](#sendcustomrythmstyle-rawheights)
- [`sendImageRythm()`](#sendimagerythmanimindex-frame)
- [`setClockTime()`](#setclocktimedate)
- [`setClockStyle()`](#setclockstylestyle-visibledate-hour24-r-g-b)
- [`setTimeIndicator()`](#settimeindicatorenabled)
- [`flipScreen()`](#flipscreenenabled)
- [`freezeScreen()`](#freezescreen)
- [Security](#security)
- [`readScreenLight()`](#readscreenlight)
- [`askStatus()`](#askstatus)
- [`deleteDeviceData()`](#deletedevicedata)
- [`setEcoMode()`](#setecomodeflag-starth-startm-endh-endm-light)
- [`sendJoint()`](#sendjointmode)
- [CRC32](#crc32)
- [`sendText()`](#sendtext)
- [`sendDIYImage()`](#senddiyimagebuffer)
- [`sendImage()`](#sendimagebuffer-mode-12)
- [`sendGif()`](#sendgifbuffer)

---

# CURRENT PROTOCOL

This page describes the bytes actually emitted by the current `iDotMatrix.js`. Multi-byte values marked `LE` are little-endian.

## `screenOn()` / `screenOff()`
`[0x05, 0x00, 0x07, 0x01, state]` — `state`: `1` ON, `0` OFF.

## `setBrightness(level)`
`[0x05, 0x00, 0x04, 0x80, level]` — `level` clamped to `5..100`.

## `setFullscreenColor(r, g, b)`
`[0x07, 0x00, 0x02, 0x02, r, g, b]` — RGB `0..255`.

## `setImageMode(mode)`
`[0x05, 0x00, 0x04, 0x01, mode]` — `mode` `0..255`; `0` disables, `1` enables standard DIY mode.

## `setPixel(x, y, r, g, b)`
`[0x0A, 0x00, 0x05, 0x01, 0x00, r, g, b, x, y]`. `clearPixel()` sends RGB = 0,0,0.

## `setEffect(style, speed, rgbValues)`
`[(colors*3)+7, 0x00, 0x03, 0x02, style, speed, colors, ...RGB]`. Palette of 2 to 7 colors; style 0..6; speed 1..100.

## `setScoreboard(score1, score2)`
`[0x08, 0x00, 0x0A, 0x80, score1_LE16, score2_LE16]` — scores `0..999`.

## `setChronograph(mode)`
`[0x05, 0x00, 0x09, 0x80, mode]` — `0` reset, `1` start, `2` pause, `3` resume.

## `setCountdown(mode, minutes, seconds)`
`[0x07, 0x00, 0x08, 0x80, mode, minutes, seconds]` — mode `0..3`, minutes `0..255`, seconds `0..59`.

## `setMicType(type)`
`[0x06, 0x00, 0x0B, 0x80, type]` — `0` internal mic, `1` remote source.

## `sendCustomRythm(style, rawHeights)`
`[0x21, 0x00, 0x01, 0x02, style, ...16 packed bytes]`. The 32 heights 0..15 are packed two per byte (high/low nibbles).

## `sendImageRythm(animIndex, frame)`
`[0x06, 0x00, 0x00, 0x02, frame, animIndex]` — frame `0..7`, animation `0..5`. `stopMusicRythm()` sends `(0, 0)`.

## `setClockTime(date)`
`[0x0B, 0x00, 0x01, 0x80, YY, MM, DD, weekday, hh, mm, ss]`. `weekday`: Monday=`1` ... Sunday=`7`.

## `setClockStyle(style, visibleDate, hour24, r, g, b)`
`[0x08, 0x00, 0x06, 0x01, flags, r, g, b]`, where `flags = style | (visibleDate ? 0x80 : 0) | (hour24 ? 0x40 : 0)` and style is clamped to 0..7.

## `setTimeIndicator(enabled)`
`[0x05, 0x00, 0x07, 0x80, enabled ? 0x01 : 0x00]`. ⚠️ Experimental.

## `flipScreen(enabled)`
`[0x05, 0x00, 0x06, 0x80, enabled ? 0x01 : 0x00]`.

## `freezeScreen()`
`[0x04, 0x00, 0x03, 0x00]`. ⚠️ Experimental; no boolean state is currently transmitted.

## Security
`setPassword("123456")` → `[0x08, 0x00, 0x04, 0x02, 0x01, 12, 34, 56]`

`resetPassword("123456")` → `[0x08, 0x00, 0x04, 0x02, 0x00, 12, 34, 56]`

`verifyPassword("123456")` → `[0x07, 0x00, 0x05, 0x02, 12, 34, 56]`

The PIN must contain exactly 6 digits. ⚠️ Experimental.

## `readScreenLight()`
`[0x05, 0x00, 0x0F, 0x80, 0xFF]`. ⚠️ Response arrives through a notification.

## `askStatus()`
`[0x04, 0x00, 0x03, 0x00]`. Known response modes: 0 = clock/widget, 1 = internal animation, 3 = DIY/live pixel.

## `deleteDeviceData()`
`[0x04, 0x00, 0x03, 0x80]`. ⚠️ Destructive device-data reset command.

## `setEcoMode(flag, startH, startM, endH, endM, light)`
`[0x0A, 0x00, 0x02, 0x80, active, startH, startM, endH, endM, brightness]`. Hours `0..23`, minutes `0..59`, brightness `5..100`.

## `sendJoint(mode)`
`[0x05, 0x00, 0x0C, 0x80, mode & 0xFF]`. ⚠️ Experimental.

# BINARY TRANSFERS

## CRC32
`sendText()`, `sendImage()`, and `sendGif()` use standard CRC32 (reflected polynomial `0xEDB88320`) and serialize the result as `uint32 LE`.

## `sendText(...)`
The inner payload starts with:

`[numChars_LE16, 0x00, 0x01, textMode, speed, textColorMode, R, G, B, textBgMode, bgR, bgG, bgB, ...bitmaps]`

It is wrapped by:

`[totalLen_LE16, 0x03, 0x00, 0x00, innerLen_LE32, crc32_LE32, 0x00, 0x00, slotIndex, ...innerPayload]`

Default slot is 12. The final stream is sent with a 25 ms delay between BLE fragments.

## `sendDIYImage(buffer)`
PNG data is split into 4096-byte blocks. Each block:

`[chunkLenPlus9_BE16, 0x00, 0x00, continuation, totalLen_BE32, ...chunk]`

`continuation = 0x00` for the first block, otherwise `0x02`. Write delay: 35 ms between BLE fragments.

## `sendImage(buffer, mode = 12)`
PNG data is split into 4096-byte blocks. Each block:

`[chunkLenPlus16_LE16, 0x02, 0x00, continuation, totalLen_LE32, crc32_LE32, duration_LE16, mode, ...chunk]`

`continuation = 0x00` for the first block, otherwise `0x02`. `mode=12` → duration `0`; modes `1..4` → `10`, `30`, `60`, `300` seconds.

## `sendGif(buffer)`
GIF data is split into 4096-byte blocks. Each block:

`[chunkLenPlus16_LE16, 0x01, 0x00, continuation, totalLen_LE32, crc32_LE32, 0x05, 0x00, 0x0D, ...chunk]`

After each logical block, the class additionally waits 150 ms.

# BLE

- Service UUID: `0x00FA`
- Write characteristic: `0xFA02`
- Notification characteristic: `0xFA03`
- `send()` / `sendAsync()` currently fragment payloads into 20-byte chunks.
- `detectMaxMtu()` probes 512/244/128/64/20 but does not modify the 20-byte fragmentation size.
