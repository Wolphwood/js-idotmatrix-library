# Documentation de la classe IDotMatrix

La classe `IDotMatrix` permet de piloter les matrices LED iDotMatrix via le protocole Bluetooth Low Energy (Web Bluetooth API). Elle prend en charge la configuration de l'affichage, du texte défilant, l'envoi d'images, de GIFs, ainsi que la gestion des fonctionnalités intégrées (chronomètre, compte à rebours, widgets).

---

* **[ Version anglaise ](../en/doc.md)**
* **[ Protocoles ](./protocol.md)**

---

## Sommaire
- [Initialisation et Connexion](#initialisation-et-connexion)
- [Propriétés et Getters](#propriétés-et-getters)
- [Contrôle de l'Écran et Affichage](#contrôle-de-lécran-et-affichage)
- [Widgets et Outils (Score, Chrono, Compte à rebours)](#widgets-et-outils-score-chrono-compte-à-rebours)
- [Animations Rythmiques et Audio](#animations-rythmiques-et-audio)
- [Affichage de Texte défilant](#affichage-de-texte-défilant)
- [Images et GIFs](#images-et-gifs)
- [Administration et Paramètres Avancés](#administration-et-paramètres-avancés)

---

## Initialisation et Connexion

### `constructor()`
Initialise l'instance, prépare les propriétés BLE et crée un canvas de rendu interne.

### `connect()`
Déclenche la recherche et l'appairage avec un appareil Bluetooth dont le nom commence par `IDM-`. Tente de se connecter aux services et caractéristiques de l'appareil avec un mécanisme de 5 essais en cas d'échec.
* **Retour :** `Promise<void>`

### `disconnect()`
Se déconnecte proprement de l'appareil actif et supprime les écouteurs d'événements.
* **Retour :** `Promise<void>`

**Exemple d'utilisation :**
```javascript
import { IDotMatrix } from './IDotMatrix.js';

const matrix = new IDotMatrix();

// Connexion lors d'une action utilisateur (ex: clic bouton)
document.getElementById('connectBtn').addEventListener('click', async () => {
  await matrix.connect();
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

* **Paramètre :** `level` (`number`) : Valeur de luminosité de `5` à `100`.

### `setFullscreenColor(r, g, b)`

Rempli la totalité de l'écran avec une couleur unie.

* **Paramètres :** `r`, `g`, `b` (`number`) : Valeurs RVB de `0` à `255`.

### `setImageMode(mode)`

Active ou désactive le mode DIY / Dessin en direct sur la matrice.

* **Paramètre :** `mode` (`number`) : `0` = désactivé, `1` = activé (par défaut).

### `setPixel(x, y, r, g, b, asyncMode)`

Modifie la couleur d'un pixel unique sur la matrice.

* **Paramètres :**
* `x`, `y` (`number`) : Coordonnées du pixel.
* `r`, `g`, `b` (`number`) : Composantes de la couleur (`0` à `255`).
* `asyncMode` (`boolean`) : Si `true`, utilise la transmission sans attente stricte (`sendAsync`).



### `clearPixel(x, y)`

Éteint un pixel spécifique (équivalent à appliquer la couleur noire `0, 0, 0`).

### `setEffect(style, speed, rgbValues)`

Active une animation procédurale intégrée avec une palette de couleurs personnalisée.

* **Paramètres :**
* `style` (`number`) : Index de l'effet (`0` à `6`).
* `speed` (`number`) : Vitesse de l'animation (`1` à `100`).
* `rgbValues` (`Array<Array<number>>`) : Tableau contenant entre 2 et 7 sous-tableaux RVB (ex: `[[255,0,0], [0,255,0]]`).



---

## Widgets et Outils (Score, Chrono, Compte à rebours)

### `setScoreboard(score1, score2)`

Met à jour le widget de tableau des scores affiché à l'écran.

* **Paramètres :** `score1`, `score2` (`number`) : Scores des deux équipes (de `0` à `999`).

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

* **Paramètre :** `type` (`number`) : `0` = Microphone interne de la matrice, `1` = Mode distant (Application/PC).

### `sendRhythmSimulation(globalMode, currentVolumeIntensity)`

Méthode unifiée pour envoyer des flux de rythmes (égaliseur) à la matrice.

* **Paramètres :**
* `globalMode` (`number`) : Mode de `0` à `9`. `0-4` activent un égaliseur logiciel adaptatif, `5-9` déclenchent des animations matérielles internes.
* `currentVolumeIntensity` (`number`) : Intensité ou volume simulé entre `0` et `1`.



### `stopMusicRhythm()`

Arrête immédiatement l'affichage des animations musicales ou des égaliseurs.

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

### `sendImage(arrayBuffer)`

Découpe et téléverse un fichier image au format **PNG** brut vers la mémoire de la matrice.

* **Paramètre :** `arrayBuffer` (`Uint8Array`) : Buffer binaire du fichier PNG.

### `sendGif(buffer)`

Traite et transfère un fichier au format **GIF** (animé ou non) vers la matrice à l'aide d'un découpage par blocs (chunks) adapté au protocole.

* **Paramètre :** `buffer` (`ArrayBuffer|Uint8Array`) : Contenu binaire du fichier `.gif`.

---

## Administration et Paramètres Avancés

### `setClockTime(date)`

Synchronise l'horloge interne de la matrice avec une date précise.

* **Paramètre :** `date` (`Date`) : Instance de Date JavaScript (par défaut `new Date()`).

### `setClockStyle(style, visibleDate, hour24, r, g, b)`

Configure l'apparence visuelle du widget Horloge.

* **Paramètres :**
* `style` (`number`) : Index du style visuel (`0` à `7`).
* `visibleDate` (`boolean`) : Affiche ou masque le bloc de la date.
* `hour24` (`boolean`) : Format 24h (`true`) ou 12h (`false`).
* `r`, `g`, `b` (`number`) : Couleur d'affichage des chiffres.



### `flipScreen(enabled)`

Applique une rotation à 180 degrés de l'affichage de l'écran (effet miroir/renversé).

* **Paramètre :** `enabled` (`boolean`) : `true` pour renverser, `false` pour l'orientation normale.

### `setEcoMode(flag, startH, startM, endH, endM, light)`

Planifie une plage horaire pour le mode économie d'énergie (mise en veille ou baisse de luminosité automatique).

* **Paramètres :**
* `flag` (`number`|`boolean`) : Activation du mode.
* `startH`, `startM` (`number`) : Heure et minute de début.
* `endH`, `endM` (`number`) : Heure et minute de fin.
* `light` (`number`) : Luminosité réduite appliquée durant la plage (`5` à `100`).



### `deleteDeviceData()`

Effectue une réinitialisation d'usine complète de l'appareil (suppression des données et redémarrage de la matrice).

* **Retour :** `Promise<void>`
