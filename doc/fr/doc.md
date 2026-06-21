# Documentation de la classe iDotMatrix

La classe `iDotMatrix` permet de piloter les matrices LED iDotMatrix via le protocole Bluetooth Low Energy (Web Bluetooth API). Elle prend en charge la configuration de l'affichage, du texte défilant, l'envoi d'images, de GIFs, ainsi que la gestion des fonctionnalités intégrées (chronomètre, compte à rebours, widgets).

> ⚠️ **Attention :** Certaines fonctionnalités de cette bibliothèque sont encore au stade expérimental dans le micrologiciel. Leur comportement exact et leurs effets secondaires sont encore assez flou.

---

* **[ Version anglaise ](../en/doc.md)**
* **[ Protocoles ](./protocol.md)**

---

## Sommaire
- [Initialisation et Connexion](#initialisation-et-connexion)
  - [`constructor()`](#constructor)
  - [`searchAndConnect()`](#searchandconnect)
  - [`connect()`](#connect)
  - [`getDeviceInfo()`](#getdeviceinfo)
  - [`disconnect()`](#disconnect)
- [Propriétés et Getters](#propriétés-et-getters)
  - [`isConnected`](#isconnected)
  - [`width` et `height`](#width-et-height)
  - [`ctx`](#ctx)
- [Contrôle de l'Écran et Affichage](#contrôle-de-lécran-et-affichage)
  - [`screenOn()`](#screenon)
  - [`screenOff()`](#screenoff)
  - [`clearInternalCanvas()`](#clearinternalcanvas)
  - [`setBrightness()`](#setbrightness)
  - [`setPixel()`](#setpixel)
  - [`setFullscreenColor()`](#setfullscreencolor)
  - [`freezeScreen()`](#freezescreen)
- [Widgets et Outils (Score, Chrono, Compte à rebours)](#widgets-et-outils-score-chrono-compte-à-rebours)
  - [`score`](#score)
  - [`chronograph`](#chronograph)
  - [`countdown`](#countdown)
- [Animations Rythmes et Audio](#animations-rythmes-et-audio)
  - [`sendImageRythm()`](#sendimagerythm)
  - [`sendCustomRythm()`](#sendcustomrythm)
  - [`stopMusicRythm()`](#stopmusicrythm)
- [Affichage de Texte défilant](#affichage-de-texte-défilant)
  - [`sendText()`](#sendtext)
- [Images et GIFs](#images-et-gifs)
  - [`internalCanvasToBuffer()`](#internalcanvastobuffer)
  - [`sendImage()`](#sendimage)
  - [`sendGif()`](#sendgif)
- [Administration et Paramètres Avancés](#administration-et-paramètres-avancés)
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

## Initialisation et Connexion

### `constructor({ throwErrors })`
Initialise l'instance, prépare les propriétés BLE et crée un canvas de rendu interne.
* **Paramètre :**
  * `throwErrors` (`boolean`) : Définis si les erreurs sont juste log ou throw. Default : `true`

### `connect(deviceId)`
Déclenche l'appairage direct à un appareil ⚠️ Indisponible sur navigateur pour le moment.
* **Paramètres :**
  * `deviceId` (`string`) : id de l'appareil.
* **Retour :** `Promise<void>`

### `searchAndConnect()`
Déclenche la recherche et l'appairage avec un appareil Bluetooth dont le nom commence par `IDM-`. Tente de se connecter aux services et caractéristiques de l'appareil avec un mécanisme de 5 essais en cas d'échec.
* **Retour :** `Promise<void>`

### `disconnect()`
Se déconnecte proprement de l'appareil actif et supprime les écouteurs d'événements.
* **Retour :** `Promise<void>`

### `detectMaxMtu()`
Détermine dynamiquement la taille maximale des paquets (MTU) supportée par la liaison Bluetooth en testant plusieurs paliers (512, 244, 128, 64, 20 octets). Met à jour la configuration interne du protocole.
* **Retour :** `Promise<number>` : La taille maximale de MTU validée.
**Exemple d'utilisation :**

### `getDeviceInfo()`
Récupère les informations matérielles de l'appareil connecté (Modèle, version, et dimensions de la matrice). Cette méthode met également à jour automatiquement les propriétés `width` et `height` de l'instance.
* **Retour :** `Promise<{ id: string, name: string, model: string, width: number, height: number, mtu: number } | null>`

```javascript
import { iDotMatrix } from './iDotMatrix.js';

const matrix = new iDotMatrix();

// Connexion lors d'une action utilisateur (ex: clic bouton)
document.getElementById('connectBtn').addEventListener('click', async () => {
  await matrix.searchAndConnect();
  console.log(`Dimensions de la matrice : ${matrix.width}x${matrix.height}`);
});

```

---

## Propriétés et Getters
* **`ctx`** (`CanvasRenderingContext2D`) : Récupère le contexte 2D du canvas interne de la classe pour dessiner directement dessus.
* **`width`** (`number`) : Largeur de la matrice détectée (définie après connexion, ex: 16, 32, 64).
* **`height`** (`number`) : Hauteur de la matrice détectée.

---

## Contrôle de l'Écran et Affichage

### `screenOn()`
Allume l'écran de la matrice.
* **Retour :** `Promise<void>`

### `screenOff()`
Éteint l'écran de la matrice.
* **Retour :** `Promise<void>`

### `setBrightness(level)`
Ajuste la luminosité globale de l'écran.
* **Paramètre :**
  * `level` (`number`) : Valeur de luminosité de `5` à `100`.

### `setFullscreenColor(r, g, b)`
Rempli la totalité de l'écran avec une couleur unie.
* **Paramètres :**
  * `r`, `g`, `b` (`number`) : Valeurs RVB de `0` à `255`.

### `setImageMode(mode)`
Active ou désactive le mode DIY / Dessin en direct sur la matrice.
* **Paramètre :**
  * `mode` (`number`) : `0` = désactivé, `1` = activé (par défaut).
* **Retour :** `Promise<void>`

### `setPixel(x, y, r, g, b, asyncMode)`
Modifie la couleur d'un pixel unique sur la matrice.
* **Paramètres :**
  * `x`, `y` (`number`) : Coordonnées du pixel.
  * `r`, `g`, `b` (`number`) : Composantes de la couleur (`0` à `255`).
  * `asyncMode` (`boolean`) : Si `true`, utilise la transmission sans attente stricte (`sendAsync`).
* **Retour :** `Promise<void>`

### `clearPixel(x, y)`
Éteint un pixel spécifique (équivalent à appliquer la couleur noire `0, 0, 0`).
* **Paramètres :**
  * `x`, `y` (`number`) : Coordonnées du pixel.
* **Retour :** `Promise<void>`

### `setEffect(style, speed, rgbValues)`
Active une animation procédurale intégrée avec une palette de couleurs personnalisée.
* **Paramètres :**
  * `style` (`number`) : Index de l'effet (`0` à `6`).
  * `speed` (`number`) : Vitesse de l'animation (`1` à `100`).
  * `rgbValues` (`Array<Array<number>>`) : Tableau contenant entre 2 et 7 sous-tableaux RVB (ex: `[[255,0,0], [0,255,0]]`).

### `freezeScreen(enabled)` **⚠️ Expérimental**
Fige instantanément l'affichage actuel de la matrice ou redonne le contrôle au rafraîchissement normal.
* **Paramètre :**
  * `enabled` (`boolean`) : `true` pour figer l'écran, `false` pour le libérer.
* **Retour :** `Promise<void>`

### `clearInternalCanvas()`
Efface le canvas de rendu 2D interne de l'instance en réinitialisant ses dimensions par rapport à la largeur et hauteur détectées de la matrice.
* **Retour :** `void`

### `internalCanvasToBuffer()`
Compresse l'état graphique actuel du canvas de rendu interne en un tampon d'octets au format PNG, prêt pour un téléversement.
* **Retour :** `Promise<Uint8Array>` : Le tampon binaire de l'image PNG.

---

## Widgets et Outils (Score, Chrono, Compte à rebours)

### `setScoreboard(score1, score2)`
Met à jour le widget de tableau des scores affiché à l'écran.
* **Paramètres :**
  * `score1`, `score2` (`number`) : Scores des deux équipes (de `0` à `999`).
* **Retour :** `Promise<void>`

### `chronograph` (Getter)
Retourne un objet de contrôle pour manipuler le chronomètre intégré :
* `chronograph.start()` : Démarre le chronomètre.
* `chronograph.pause()` : Met le chronomètre en pause.
* `chronograph.resume()` : Reprend le chronomètre.
* `chronograph.stop()` / `reset()` : Réinitialise le chronomètre à zéro.

### `countdown` (Getter)
Retourne un objet de contrôle pour le compte à rebours de l'appareil :
* `countdown.start(minutes, seconds)` : Lance un compte à rebours pour la durée spécifiée.
* `countdown.pause()` : Met en pause.
* `countdown.resume()` : Reprend là où il s'était arrêté.
* `countdown.disable()` / `stop()` : Arrête et désactive le compte à rebours.

---

## Animations Rythmiques et Audio

### `setMicType(type)`
Configure la source du microphone pour les animations réactives à la musique.
* **Paramètre :**
  * `type` (`number`) : `0` = Microphone interne de la matrice, `1` = Mode distant (Application/PC).
* **Retour :** `Promise<void>`

### `sendRythmSimulation(globalMode, currentVolumeIntensity)`
Méthode unifiée pour envoyer des flux de rythmes (égaliseur) à la matrice.
* **Paramètres :**
  * `globalMode` (`number`) : Mode de `0` à `9`. `0-4` activent un égaliseur logiciel adaptatif, `5-9` déclenchent des animations matérielles internes.
  * `currentVolumeIntensity` (`number`) : Intensité ou volume simulé entre `0` et `1`.
* **Retour :** `Promise<void>`

### `stopMusicRythm()`
Arrête immédiatement l'affichage des animations musicales ou des égaliseurs.

### `sendImageRythm(animIndex, frame)`
Déclenche une impulsion ou applique une configuration spécifique sur l'une des animations rythmées natives de l'appareil.
* **Paramètres :**
  * `animIndex` (`number`) : L'index de l'animation matérielle ciblée (1 à 5).
  * `frame` (`number`) : La valeur de configuration ou d'intensité de la pose (1 à 7).
* **Retour :** `Promise<void>`

### `sendCustomRythm(style, rawHeights)`
Envoie un spectre audio personnalisé à l'égaliseur de l'écran. Compresse un tableau de 32 barres verticales en une structure optimisée de 16 octets (4 bits par colonne).
* **Paramètres :**
  * `style` (`number`) : Le mode visuel ou style de rendu de l'égaliseur sur la matrice (0 à 4).
  * `rawHeights` (`Array<number>`) : Un tableau de exactement 32 entiers compris entre `0` (hauteur minimale) et `15` (hauteur maximale).
* **Retour :** `Promise<void>`

---

## Affichage de Texte défilant

L'affichage de texte se déroule en deux étapes : la génération des bitmaps via le Canvas HTML5, puis l'envoi des données à la mémoire de la matrice.

### `textToBitmaps(text, targetHeight, fontConfig)`
Convertit une chaîne de caractères en un buffer binaire de polices compréhensible par la matrice.
* **Paramètres :**
  * `text` (`string`) : Le texte à convertir.
  * `targetHeight` (`number`) : Hauteur cible du bloc de texte (`16`, `32` ou `64`). Ne doit pas dépasser la hauteur de la matrice.
  * `fontConfig` (`string`) : Configuration CSS de la police (ex: `"bold 22px sans-serif"`).
* **Retour :** `Uint8Array`

### `sendText(...)`
Envoie le texte formaté à la matrice pour l'animer.
* **Paramètres principaux :**
  * `textBitmaps` (`Uint8Array`) : Données générées par `textToBitmaps`.
  * `numChars` (`number`) : Nombre de caractères du texte.
  * `textMode` (`number`) : Mode de défilement / style du texte (`0` à `7`).
  * `speed` (`number`) : Vitesse de défilement (`1` à `100`).
  * `textColorMode` (`number`) : Mode d'application de la couleur (`1` à `4`).
  * `textColor` (`Array<number>`) : Couleur du texte au format `[R, G, B]`.
  * `slotIndex` (`number`) : Emplacement mémoire matériel ciblé (par défaut `12`).


**Exemple d'utilisation :**

```javascript
const text = "Hello!";
const bitmaps = matrix.textToBitmaps(text, 32, "bold 22px Arial");

await matrix.sendText(
  bitmaps,
  text.length,
  1,               // Défilement normal
  95,              // Vitesse
  1,               // Couleur unie
  [255, 0, 0],     // Texte Rouge
  0,               // Fond transparent/normal
  [0, 0, 0]        // Couleur de fond
);

```

---

## Images et GIFs

### `getMaterialDuration(timeSign)`

Convertit l'index de configuration de l'application (`timeSign`) en une durée réelle en secondes, utilisée par la matrice pour gérer le temps d'affichage (timeout) des médias en mémoire.

* **Paramètre :**
  * `timeSign` (`number`) : L'index de durée sélectionné dans l'interface (`1` à `4`).
* **Retour :** `number` : La durée correspondante en secondes (`5`, `10`, `30`, `60` ou `300`).

| Index (`timeSign`) | Durée retournée | Usage constaté |
| :--- | :--- | :--- |
| `1` | `10` secondes | Affichage court |
| `2` | `30` secondes | Affichage moyen |
| `3` | `60` secondes (1 min) | Affichage long |
| `4` | `300` secondes (5 min) | Affichage étendu / persistant |
| Autre / Aucun | `5` secondes | Valeur par défaut du micrologiciel |

> 💡 **Note de protocole :** La valeur en secondes obtenue est encodée sur 16 bits (`short`) et injectée dans les octets 13 et 14 du header de transport des commandes de flux (comme `sendImage`). Si le mode d'affichage est `12` (Graffiti / Live volatile), ces deux octets doivent impérativement être forcés à `0x00, 0x00`.

### `sendDIYImage(arrayBuffer)`
Découpe et téléverse un fichier image au format **PNG** brut vers la mémoire de la matrice.
⚠️ Ca envoi l'image de façon brut, des effets bizarre peuvent survenir si la matrice n'est pas en mode DIY.
* **Paramètre :**
  * `arrayBuffer` (`Uint8Array`) : Buffer binaire du fichier PNG.
* **Retour :** `Promise<void>`

### `sendImage(arrayBuffer, mode = 12)`
Découpe et téléverse un fichier image au format **PNG** brut vers la mémoire de la matrice.
* **Paramètres :**
  * `arrayBuffer` (`Uint8Array`) : Buffer binaire du fichier PNG.
  * `mode` (`number`) : Mode d'envoi de l'image, encore très peu documenté. Par défaut : 12
* **Retour :** `Promise<void>`

### `sendGif(buffer)`
Traite et transfère un fichier au format **GIF** (animé ou non) vers la matrice à l'aide d'un découpage par blocs (chunks) adapté au protocole.
* **Paramètre :**
  * `buffer` (`ArrayBuffer|Uint8Array`) : Contenu binaire du fichier `.gif`.
* **Retour :** `Promise<void>`

---

## Administration et Paramètres Avancés

### `setClockTime(date)`
Synchronise l'horloge interne de la matrice avec une date précise.
* **Paramètre :**
  * `date` (`Date`) : Instance de Date JavaScript (par défaut `new Date()`).
* **Retour :** `Promise<void>`

### `setClockStyle(style, visibleDate, hour24, r, g, b)`
Configure l'apparence visuelle du widget Horloge.
* **Paramètres :**
  * `style` (`number`) : Index du style visuel (`0` à `7`).
  * `visibleDate` (`boolean`) : Affiche ou masque le bloc de la date.
  * `hour24` (`boolean`) : Format 24h (`true`) ou 12h (`false`).
  * `r`, `g`, `b` (`number`) : Couleur d'affichage des chiffres.
* **Retour :** `Promise<void>`

### `setTimeIndicator(enabled)` **⚠️ Experimental**
Contrôle l'activation ou le clignotement des deux points séparateurs (`:`) sur l'affichage de l'horloge.
* **Paramètre :**
  * `enabled` (`boolean`) : `true` pour activer/faire clignoter, `false` pour masquer/figer.
* **Retour :** `Promise<void>`

### `flipScreen(enabled)`
Applique une rotation à 180 degrés de l'affichage de l'écran (effet miroir/renversé).
* **Paramètre :**
  * `enabled` (`boolean`) : `true` pour renverser, `false` pour l'orientation normale.
* **Retour :** `Promise<void>`

### `setEcoMode(flag, startH, startM, endH, endM, light)`
Planifie une plage horaire pour le mode économie d'énergie (mise en veille ou baisse de luminosité automatique).
* **Paramètres :**
  * `flag` (`number`|`boolean`) : Activation du mode.
  * `startH`, `startM` (`number`) : Heure et minute de début.
  * `endH`, `endM` (`number`) : Heure et minute de fin.
  * `light` (`number`) : Luminosité réduite appliquée durant la plage (`5` à `100`).
* **Retour :** `Promise<void>`

### `deleteDeviceData()`
Effectue une réinitialisation d'usine complète de l'appareil (suppression des données et redémarrage de la matrice).
* **Retour :** `Promise<void>`

### `readScreenLight()` **⚠️ Expérimental**
Demande à la matrice de renvoyer son délai de mise en veille actuel. La réponse est interceptée de manière asynchrone dans les événements de notification.
* **Retour :** `Promise<void>`

### `askStatus()` **⚠️ Experimental**
Interroge le microcontrôleur de la matrice pour récupérer son état de fonctionnement actuel. L'appareil répondra de manière asynchrone via une notification GATT indiquant s'il est en mode Horloge, mode Animation Stockage, ou détourné en mode dessin Live.
* **Retour :** `Promise<void>`

### `setPassword(pincode)` **⚠️ Experimental**
Définit un code PIN de sécurité sur la matrice. La chaîne est convertie et découpée en paires de chiffres.
* **Paramètre :**
  * `pincode` (`string`) : Un code numérique (ex: `"123456"`).
* **Retour :** `Promise<void>`

### `resetPassword(pincode)` **⚠️ Experimental**
Supprime ou réinitialise le mot de passe de verrouillage de l'appareil.
* **Paramètre :**
  * `pincode` (`string`) : Le code numérique actuel à réinitialiser.
* **Retour :** `Promise<void>`

### `verifyPassword(pincode)` **⚠️ Experimental**
Envoie le code PIN au registre de validation volatile de la matrice pour authentifier la session de contrôle BLE en cours.
* **Paramètre :**
  * `pincode` (`string`) : Le code PIN de session.
* **Retour :** `Promise<void>`

### `sendJoint(mode)` **⚠️ Experimental**
Configure le positionnement géométrique de l'affichage ou les transitions d'écrans dans le cadre d'une installation multi-écrans reliés (Joint screens).
* **Paramètre :**
  * `mode` (`number`) : Index de configuration de la jointure.
* **Retour :** `Promise<void>`
