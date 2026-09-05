# CanvasAdapter

`CanvasAdapter` fournit une couche de rendu commune aux environnements Web et Node.js. La classe `iDotMatrix` ne dépend ainsi plus directement du DOM ni d'une implémentation Canvas spécifique.

## Sommaire

- [Architecture](#architecture)
- [CanvasAdapter](#canvasadapter)
  - [Propriétés](#propriétés)
  - [`size`](#size)
  - [`ctx`](#ctx)
  - [`clear()`](#clear)
  - [`resize()`](#resize)
  - [`toBuffer()`](#tobuffer)
- [Web](#web)
- [Node.js](#nodejs)
- [Utilisation avec iDotMatrix](#utilisation-avec-idotmatrix)

---

## Architecture

```text
iDotMatrix
    ↓
CanvasAdapter
├── WebCanvasAdapter
└── NodeCanvasAdapter
```

L'adapter conserve le canvas, son contexte 2D, ses dimensions et le dernier buffer encodé. Les implémentations Web et Node exposent la même interface publique mais utilisent l'API native de leur environnement pour créer et encoder le canvas.

## CanvasAdapter

```js
new CanvasAdapter({
  width: 16,
  height: 16
});
```

Les dimensions par défaut sont `16 × 16`.

### Propriétés

| Propriété | Description |
| --- | --- |
| `width` | Largeur actuelle du canvas |
| `height` | Hauteur actuelle du canvas |
| `canvas` | Instance native du canvas |
| `context` | Contexte de rendu 2D |
| `lastbuffer` | Dernier buffer produit par `toBuffer()` |

### `size`

Retourne les dimensions actuelles :

```js
const { width, height } = canvas.size;
```

### `ctx`

Retourne directement le contexte 2D :

```js
const ctx = canvas.ctx;

ctx.fillStyle = "#ff0000";
ctx.fillRect(0, 0, 8, 8);
```

Le contexte reste l'API Canvas 2D native de l'environnement utilisé.

### `clear()`

Efface l'intégralité du canvas :

```js
canvas.clear();
```

Si aucun contexte n'est disponible, la méthode ne fait rien.

### `resize()`

Redimensionne le canvas :

```js
canvas.resize(32, 32);
```

Les valeurs non numériques, non finies ou inférieures ou égales à zéro sont ignorées. Après redimensionnement, le contexte 2D est récupéré à nouveau.

### `toBuffer()`

Encode le contenu du canvas et retourne ses octets :

```js
const buffer = await canvas.toBuffer();
```

Le résultat est conservé dans `lastbuffer`.

L'encodage dépend de l'adapter concret : le navigateur utilise son API Canvas/Blob tandis que Node.js utilise l'encodeur fourni par son implémentation Canvas.

## Web

`WebCanvasAdapter` crée un canvas avec l'API Canvas du navigateur.

```js
const canvas = new WebCanvasAdapter({
  width: 16,
  height: 16
});

canvas.ctx.fillStyle = "#00ff00";
canvas.ctx.fillRect(0, 0, 16, 16);

const buffer = await canvas.toBuffer();
```

Le Web adapter nécessite un environnement disposant des APIs Canvas du navigateur.

## Node.js

`NodeCanvasAdapter` fournit la même interface dans Node.js à l'aide de l'implémentation Canvas configurée par la bibliothèque.

```js
const canvas = new NodeCanvasAdapter({
  width: 16,
  height: 16
});

canvas.ctx.fillStyle = "#00ff00";
canvas.ctx.fillRect(0, 0, 16, 16);

const buffer = await canvas.toBuffer();
```

Le code de rendu utilisant `ctx` peut ainsi rester identique entre Web et Node.js.

## Utilisation avec iDotMatrix

Le rendu et l'encodage d'image appartiennent désormais au `CanvasAdapter`. Les anciennes API internes de `iDotMatrix` suivantes ont été supprimées :

```text
ctx
clearInternalCanvas()
internalCanvasToBuffer()
```

Utilisez directement l'adapter :

```js
matrix.canvas.clear();

const ctx = matrix.canvas.ctx;
ctx.fillStyle = "#ff0000";
ctx.fillRect(0, 0, 16, 16);

const buffer = await matrix.canvas.toBuffer();
await matrix.sendImage(buffer);
```
