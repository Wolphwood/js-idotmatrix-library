* **[Version anglaise](../en/protocol.md)**
* **[Documentation](./doc.md)**

## Sommaire

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
- [Sécurité](#sécurité)
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

# PROTOCOLE ACTUEL

Cette page décrit les octets réellement émis par la version actuelle de `iDotMatrix.js`. Les valeurs multi-octets indiquées `LE` sont little-endian.

## `screenOn()` / `screenOff()`
`[0x05, 0x00, 0x07, 0x01, state]` — `state`: `1` ON, `0` OFF.

## `setBrightness(level)`
`[0x05, 0x00, 0x04, 0x80, level]` — `level` limité à `5..100`.

## `setFullscreenColor(r, g, b)`
`[0x07, 0x00, 0x02, 0x02, r, g, b]` — RGB `0..255`.

## `setImageMode(mode)`
`[0x05, 0x00, 0x04, 0x01, mode]` — `mode` `0..255`; `0` désactive, `1` active le mode DIY standard.

## `setPixel(x, y, r, g, b)`
`[0x0A, 0x00, 0x05, 0x01, 0x00, r, g, b, x, y]`. `clearPixel()` envoie RGB = 0,0,0.

## `setEffect(style, speed, rgbValues)`
`[(colors*3)+7, 0x00, 0x03, 0x02, style, speed, colors, ...RGB]`. Palette de 2 à 7 couleurs; style 0..6; vitesse 1..100.

## `setScoreboard(score1, score2)`
`[0x08, 0x00, 0x0A, 0x80, score1_LE16, score2_LE16]` — scores `0..999`.

## `setChronograph(mode)`
`[0x05, 0x00, 0x09, 0x80, mode]` — `0` reset, `1` start, `2` pause, `3` resume.

## `setCountdown(mode, minutes, seconds)`
`[0x07, 0x00, 0x08, 0x80, mode, minutes, seconds]` — mode `0..3`, minutes `0..255`, seconds `0..59`.

## `setMicType(type)`
`[0x06, 0x00, 0x0B, 0x80, type]` — `0` micro interne, `1` source distante.

## `sendCustomRythm(style, rawHeights)`
`[0x21, 0x00, 0x01, 0x02, style, ...16 packed bytes]`. Les 32 hauteurs 0..15 sont compactées deux par octet (nibbles haut/bas).

## `sendImageRythm(animIndex, frame)`
`[0x06, 0x00, 0x00, 0x02, frame, animIndex]` — frame `0..7`, animation `0..5`. `stopMusicRythm()` envoie `(0, 0)`.

## `setClockTime(date)`
`[0x0B, 0x00, 0x01, 0x80, YY, MM, DD, weekday, hh, mm, ss]`. `weekday`: Monday=`1` ... Sunday=`7`.

## `setClockStyle(style, visibleDate, hour24, r, g, b)`
`[0x08, 0x00, 0x06, 0x01, flags, r, g, b]`, où `flags = style | (visibleDate ? 0x80 : 0) | (hour24 ? 0x40 : 0)` et style est limité à 0..7.

## `setTimeIndicator(enabled)`
`[0x05, 0x00, 0x07, 0x80, enabled ? 0x01 : 0x00]`. ⚠️ Expérimental.

## `flipScreen(enabled)`
`[0x05, 0x00, 0x06, 0x80, enabled ? 0x01 : 0x00]`.

## `freezeScreen()`
`[0x04, 0x00, 0x03, 0x00]`. ⚠️ Expérimental; aucun booléen n'est actuellement transmis.

## Sécurité
`setPassword("123456")` → `[0x08, 0x00, 0x04, 0x02, 0x01, 12, 34, 56]`

`resetPassword("123456")` → `[0x08, 0x00, 0x04, 0x02, 0x00, 12, 34, 56]`

`verifyPassword("123456")` → `[0x07, 0x00, 0x05, 0x02, 12, 34, 56]`

Le PIN doit contenir exactement 6 chiffres. ⚠️ Expérimental.

## `readScreenLight()`
`[0x05, 0x00, 0x0F, 0x80, 0xFF]`. ⚠️ La réponse arrive par notification.

## `askStatus()`
`[0x04, 0x00, 0x03, 0x00]`. Réponse connue : mode 0 = horloge/widget, 1 = animation interne, 3 = DIY/live pixel.

## `deleteDeviceData()`
`[0x04, 0x00, 0x03, 0x80]`. ⚠️ Commande destructive / reset des données.

## `setEcoMode(flag, startH, startM, endH, endM, light)`
`[0x0A, 0x00, 0x02, 0x80, active, startH, startM, endH, endM, brightness]`. Hours `0..23`, minutes `0..59`, brightness `5..100`.

## `sendJoint(mode)`
`[0x05, 0x00, 0x0C, 0x80, mode & 0xFF]`. ⚠️ Expérimental.

# TRANSFERTS BINAIRES

## CRC32
`sendText()`, `sendImage()` et `sendGif()` utilisent le CRC32 standard (polynôme réfléchi `0xEDB88320`) et sérialisent le résultat en `uint32 LE`.

## `sendText(...)`
Le payload interne commence par :

`[numChars_LE16, 0x00, 0x01, textMode, speed, textColorMode, R, G, B, textBgMode, bgR, bgG, bgB, ...bitmaps]`

Il est encapsulé par :

`[totalLen_LE16, 0x03, 0x00, 0x00, innerLen_LE32, crc32_LE32, 0x00, 0x00, slotIndex, ...innerPayload]`

Le slot par défaut est 12. Le flux final est envoyé avec un délai de 25 ms entre fragments BLE.

## `sendDIYImage(buffer)`
Le PNG est découpé en blocs de 4096 octets. Chaque bloc :

`[chunkLenPlus9_BE16, 0x00, 0x00, continuation, totalLen_BE32, ...chunk]`

`continuation = 0x00` pour le premier bloc, sinon `0x02`. Délai d'envoi : 35 ms entre fragments BLE.

## `sendImage(buffer, mode = 12)`
Le PNG est découpé en blocs de 4096 octets. Chaque bloc :

`[chunkLenPlus16_LE16, 0x02, 0x00, continuation, totalLen_LE32, crc32_LE32, duration_LE16, mode, ...chunk]`

`continuation = 0x00` pour le premier bloc, sinon `0x02`. `mode=12` → duration `0`; modes `1..4` → `10`, `30`, `60`, `300` seconds.

## `sendGif(buffer)`
Le GIF est découpé en blocs de 4096 octets. Chaque bloc :

`[chunkLenPlus16_LE16, 0x01, 0x00, continuation, totalLen_LE32, crc32_LE32, 0x05, 0x00, 0x0D, ...chunk]`

Après chaque bloc logique, la classe attend en plus 150 ms.

# BLE

- Service UUID: `0x00FA`
- Write characteristic: `0xFA02`
- Notification characteristic: `0xFA03`
- `send()` / `sendAsync()` fragmentent actuellement les payloads en blocs de 20 octets.
- `detectMaxMtu()` sonde 512/244/128/64/20 mais ne modifie pas cette valeur de 20 octets.
