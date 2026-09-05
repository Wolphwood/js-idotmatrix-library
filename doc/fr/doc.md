# Documentation de `iDotMatrix`

La classe `iDotMatrix` pilote les matrices LED iDotMatrix en Bluetooth Low Energy. La logique du protocole est indépendante du transport BLE grâce aux adaptateurs `WebBluetoothAdapter` (navigateur) et `NodeWebBluetoothAdapter` (Node.js).

> ⚠️ Certaines commandes restent expérimentales car leur comportement firmware n'est pas totalement documenté.

- **[README](../../README.md)**
- **[English version](../en/doc.md)**
- **[Documentation du protocole](./protocol.md)**

## Sommaire

- [Documentation des adapters](#documentation-des-adapters)
- [Utilitaires et propriétés](#utilitaires-et-propriétés)
  - [`clamp()`](#clampvalue-min-max)
  - [`_splitIntoChunks()`](#_splitintochunksarray-chunksize)
  - [`send()` / `sendAsync()`](#sendpayload-delayms-8-/-sendasyncpayload-msdelay-8)
- [Écran et dessin](#écran-et-dessin)
  - [`screenOn()` / `screenOff()`](#screenon-/-screenoff)
  - [`setBrightness()`](#setbrightnesslevel)
  - [`setFullscreenColor()`](#setfullscreencolorr-g-b)
  - [`setImageMode()`](#setimagemodemode-1)
  - [`setPixel()`](#setpixelx-y-r-g-b-asyncmode-false)
  - [`clearPixel()`](#clearpixelx-y)
  - [`setEffect()`](#seteffectstyle-speed-rgbvalues)
  - [`freezeScreen()` ⚠️ Expérimental](#freezescreen-expérimental)
- [Widgets](#widgets)
  - [`setScoreboard()`](#setscoreboardscore1-0-score2-0)
  - [`setChronograph()`](#setchronographmode-0)
  - [`setCountdown()`](#setcountdownmode-0-minutes-0-seconds-0)
- [Rythme / audio](#rythme-/-audio)
  - [`setMicType()`](#setmictypetype)
  - [`sendRythmSimulation()`](#sendrythmsimulationglobalmode-currentvolumeintensity-0)
  - [`sendCustomRythm()`](#sendcustomrythmstyle-rawheights)
  - [`sendImageRythm()`](#sendimagerythmanimindex-1-frame-1)
  - [`stopMusicRythm()`](#stopmusicrythm)
- [Horloge et paramètres](#horloge-et-paramètres)
  - [`setClockTime())`](#setclocktimedate-new-date)
  - [`setClockStyle()`](#setclockstylestyle-visibledate-true-hour24-true-r-255-g-255-b-255)
  - [`setTimeIndicator()` ⚠️ Expérimental](#settimeindicatorenabled-true-expérimental)
  - [`flipScreen()`](#flipscreenenabled-false)
  - [`setEcoMode()`](#setecomodeflag-starth-0-startm-0-endh-0-endm-0-light-10)
  - [`readScreenLight()` ⚠️ Expérimental](#readscreenlight-expérimental)
  - [`askStatus()`](#askstatus)
  - [`deleteDeviceData()`](#deletedevicedata)
- [Sécurité ⚠️ Expérimental](#sécurité-expérimental)
  - [`setPassword()`](#setpasswordpincode)
  - [`resetPassword()`](#resetpasswordpincode)
  - [`verifyPassword()`](#verifypasswordpincode)
- [Texte](#texte)
  - [`textToBitmaps()`](#texttobitmapstext-targetheight-32-fontconfig-bold-22px-sans-serif)
  - [`sendText()`](#sendtexttextbitmaps-numchars-textmode-1-speed-95-textcolormode-1-textcolor-25500-textbgmode-0-textbgcolor-000-slotindex-12)
- [Images et GIF](#images-et-gif)
  - [`getMaterialDuration()`](#getmaterialdurationtimesign)
  - [`sendDIYImage()`](#senddiyimagebuffer)
  - [`sendImage()`](#sendimagebuffer-mode-12)
  - [`sendGif()`](#sendgifbuffer)
- [Multi-écran](#multi-écran)
  - [`sendJoint()` ⚠️ Expérimental](#sendjointmode-expérimental)

---

## Documentation des adapters

Les couches Canvas et Bluetooth disposent désormais de leur propre documentation afin de garder cette référence centrée sur l'API `iDotMatrix`.

- [CanvasAdapter](./canvas.md) — rendu Web/Node.js, contexte 2D, redimensionnement et encodage.
- [BluetoothAdapter](./ble.md) — transport BLE, Web Bluetooth, Node.js, scan, connexion et notifications.

## Utilitaires et propriétés

### `clamp(value, min, max)`
Contraint une valeur entre `min` et `max`.

### `_splitIntoChunks(array, chunkSize)`
Découpe un `Uint8Array` en blocs. Cette méthode est exposée par la classe mais sert principalement en interne.

### `send(payload, delayMs = 8)` / `sendAsync(payload, msDelay = 8)`
Assurent la connexion, découpent le payload en fragments BLE de 20 octets, les écrivent séquentiellement avec `writeValueWithoutResponse()` et appliquent un délai entre chaque fragment. Dans la version actuelle, les deux méthodes ont le même comportement général.

## Écran et dessin

### `screenOn()` / `screenOff()`
Allument ou éteignent l'écran.

### `setBrightness(level)`
Règle la luminosité. `level` est limité à `5..100`.

### `setFullscreenColor(r, g, b)`
Remplit l'écran d'une couleur RGB. Chaque composante est limitée à `0..255`.

### `setImageMode(mode = 1)`
Configure le mode DIY/dessin. Le SDK accepte `0..255`; `0` désactive et `1` active le mode standard, les autres valeurs étant dépendantes du firmware.

### `setPixel(x, y, r, g, b, asyncMode = false)`
Modifie un pixel. Les coordonnées sont limitées aux dimensions détectées (16×16 par défaut si elles sont inconnues). `asyncMode=true` utilise `sendAsync()`.

### `clearPixel(x, y)`
Équivalent à `setPixel(x, y, 0, 0, 0)`.

### `setEffect(style, speed, rgbValues)`
Lance un effet procédural avec une palette personnalisée.

- `style` : `0..6`
- `speed` : `1..100`
- `rgbValues` : entre 2 et 7 couleurs `[r, g, b]`

### `freezeScreen()` ⚠️ Expérimental
Envoie la commande expérimentale `[0x04, 0x00, 0x03, 0x00]`. La méthode ne prend actuellement **aucun paramètre** et son effet exact n'est pas confirmé.

## Widgets

### `setScoreboard(score1 = 0, score2 = 0)`
Configure les deux scores sur `0..999`.

### `setChronograph(mode = 0)`
- `0` : reset
- `1` : start
- `2` : pause
- `3` : resume

Le getter `chronograph` fournit : `set()`, `reset()`, `stop()`, `start()`, `pause()` et `resume()`.

```js
await matrix.chronograph.start();
await matrix.chronograph.pause();
await matrix.chronograph.resume();
await matrix.chronograph.reset();
```

### `setCountdown(mode = 0, minutes = 0, seconds = 0)`
- `mode` : `0..3`
- `minutes` : `0..255`
- `seconds` : `0..59`

Le getter `countdown` fournit `disable()`, `stop()`, `reset()`, `start(minutes, seconds)`, `pause()` et `resume()`. Il maintient également un timer local JavaScript afin de suivre pause/reprise.

## Rythme / audio

> Le nom `Rythm` est conservé dans l'API actuelle pour compatibilité.

### `setMicType(type)`
`0` = microphone interne, `1` = source distante/application.

### `sendRythmSimulation(globalMode, currentVolumeIntensity = 0)`
- modes `0..4` : génère un spectre logiciel de 32 colonnes ;
- modes `5..9` : pilote les animations rythmiques matérielles 1..5.

`currentVolumeIntensity` représente une intensité normalisée, généralement `0..1`.

### `sendCustomRythm(style, rawHeights)`
Envoie 32 hauteurs `0..15`, compressées en 16 octets (deux valeurs 4 bits par octet). `style` est limité à `0..4`.

### `sendImageRythm(animIndex = 1, frame = 1)`
Pilote une animation rythmique matérielle. `animIndex` est limité à `0..5`, `frame` à `0..7`.

### `stopMusicRythm()`
Arrête le rythme en envoyant `sendImageRythm(0, 0)`.

Les écritures rythmiques utilisent une file à une entrée : si une écriture est en cours, seul le payload le plus récent est conservé afin d'éviter l'accumulation de frames audio.

## Horloge et paramètres

### `setClockTime(date = new Date())`
Synchronise année, mois, jour, jour de semaine, heure, minute et seconde avec un objet `Date`.

### `setClockStyle(style, visibleDate = true, hour24 = true, r = 255, g = 255, b = 255)`
Configure le style `0..7`, la visibilité de la date, le format 12/24 h et la couleur RGB.

### `setTimeIndicator(enabled = true)` ⚠️ Expérimental
Active/désactive l'indicateur temporel (notamment le séparateur de l'horloge selon le firmware).

### `flipScreen(enabled = false)`
Active/désactive le retournement de l'affichage.

### `setEcoMode(flag, startH = 0, startM = 0, endH = 0, endM = 0, light = 10)`
Configure une plage horaire d'économie d'énergie. Heures `0..23`, minutes `0..59`, luminosité `5..100`.

### `readScreenLight()` ⚠️ Expérimental
Demande la valeur du délai de veille. La réponse est reçue via notification BLE et actuellement journalisée dans la console.

### `askStatus()`
Demande le mode d'affichage actif. La réponse est reçue via notification BLE et actuellement journalisée.

### `deleteDeviceData()`
Envoie la commande de réinitialisation/suppression des données de l'appareil. À utiliser avec prudence.

## Sécurité ⚠️ Expérimental

### `setPassword(pincode)`
Définit un PIN de **6 chiffres**. Les chiffres sont transmis par groupes de deux (`"123456"` → `12, 34, 56`).

### `resetPassword(pincode)`
Supprime la protection en validant le PIN actuel, également sur 6 chiffres.

### `verifyPassword(pincode)`
Authentifie la session avec un PIN de 6 chiffres.

## Texte

### `textToBitmaps(text, targetHeight = 32, fontConfig = "bold 22px sans-serif")`
Convertit chaque caractère en bitmap monochrome à l'aide d'un canvas HTML. `targetHeight` est prévu pour `16`, `32` ou `64` et ne peut pas dépasser `matrix.height`.

> Cette méthode dépend de `document.createElement("canvas")` et est donc **nativement destinée au navigateur**. Un environnement Node.js doit fournir une implémentation DOM/canvas compatible ou générer les bitmaps autrement.

### `sendText(textBitmaps, numChars, textMode = 1, speed = 95, textColorMode = 1, textColor = [255,0,0], textBgMode = 0, textBgColor = [0,0,0], slotIndex = 12)`
Construit le payload texte, calcule son CRC32, puis l'envoie dans le slot mémoire demandé.

- `textMode` : `0..7`
- `speed` : limité à `1..100`
- `textColorMode` : `1..4`
- `textBgMode` : `0..2`
- `slotIndex` : `12` par défaut

Exemple :

```js
const text = 'Hello';
const bitmaps = matrix.textToBitmaps(text, 32, 'bold 22px sans-serif');
await matrix.sendText(bitmaps, text.length);
```

## Images et GIF

### `getMaterialDuration(timeSign)`
Convertit un index en durée : `1 → 10 s`, `2 → 30 s`, `3 → 60 s`, `4 → 300 s`; toute autre valeur retourne `5 s`.

### `sendDIYImage(buffer)`
Envoie un PNG via le protocole DIY. Le fichier est découpé en blocs logiques de 4096 octets puis chaque bloc est fragmenté pour le BLE.

### `sendImage(buffer, mode = 12)`
Envoie un PNG avec le protocole officiel, longueur totale et CRC32. `mode=12` correspond au mode d'affichage direct utilisé par défaut ; les modes `1..4` utilisent les durées de `getMaterialDuration()`.

### `sendGif(buffer)`
Envoie un GIF compressé avec longueur totale et CRC32, par blocs logiques de 4096 octets.

Les trois méthodes acceptent `ArrayBuffer` ou `Uint8Array`.

## Multi-écran

### `sendJoint(mode)` ⚠️ Expérimental
Envoie le mode de jointure/transition multi-écran. La signification exacte des valeurs dépend encore du firmware.
