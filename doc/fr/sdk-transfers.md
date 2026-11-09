# Transferts médias : fiabilisation expérimentale

Ce document décrit les changements intégrés au SDK. Ils ne constituent **pas** une validation sur les écrans réels.

## Format des paquets

- `sendDIYImage()` produit des blocs de 4096 octets de données maximum, avec une enveloppe de 9 octets : longueur du bloc LE16, `00 00`, indicateur `00` puis `02`, longueur totale LE32. Aucun CRC.
- `sendImage()`, `sendGif()` et `sendText()` produisent des blocs de 4096 octets de données maximum avec une enveloppe de 16 octets : longueur de bloc LE16, type LE16, indicateur, longueur totale LE32, CRC32 global LE32, durée LE16, index.
- Les paquets BLE sont des **fragments** contigus de ces blocs logiques ; `fragmentSize` est leur taille maximale d'écriture, **pas le MTU ATT**.
- Pour l'index spécial 12, le champ durée est encodé à zéro conformément aux constructeurs APK étudiés.

```js
const matrix = new iDotMatrix({ fragmentSize: 20, ackTimeoutMs: 5000 });
await matrix.sendImage(pngBytes, { slotIndex: 2, durationValue: 300 });
await matrix.sendGif(gifBytes, { slotIndex: 12 });
```

## Retours et événements

Les appels à `send()` se terminent après les écritures locales BLE (aucune garantie de rendu). Les transferts médias se terminent uniquement à la réponse applicative terminale, ou lèvent une erreur en cas de rejet, interruption ou délai dépassé. Le retour contient `family`, `status`, `raw`, `sentBlocks`, `totalBlocks` ; il **ne prouve pas** la persistance après redémarrage.

L'API `on(name, callback)` renvoie une fonction de désabonnement. Événements disponibles : `notification`, `response`, `deviceInfo`, `passwordRequired`, `displayStatus`, `timeAck`, `passwordOrDrawingResponse`.

Le routage applique les statuts : image/GIF/texte `1` continuation, `3` terminal, `2` erreur (ainsi que `0` pour le GIF dans les chemins étudiés) ; DIY `2` continuation, `0` ou `1` terminal. Ces statuts proviennent du DEX et de sources tierces ; ils ne garantissent pas le comportement de chaque firmware. Aucun identifiant de transaction universel n'est connu. En cas de délai dépassé, ne **pas réémettre automatiquement** un bloc : l'état matériel est incertain.

## Migration

Cette version supprime les anciennes signatures : `sendImage(data, nombre)` est rejeté ; image et GIF acceptent uniquement `{slotIndex, durationValue}`, avec les mêmes valeurs par défaut (12 et 0). Les clés inconnues sont rejetées. `getMaterialDuration()`, `sendAsync()`, `detectMaxMtu()` et les raccourcis `matrix.ctx`, `clearInternalCanvas()`, `internalCanvasToBuffer()` sont supprimés. Utiliser `send()`, `matrix.canvas.ctx`, `matrix.canvas.clear()` et `matrix.canvas.toBuffer()`. `setPixel()` ne prend plus de paramètre `asyncMode`. Les options constructeur sont `bluetoothadapter` et `canvasadapter` ; les alias `bluetooth` et `canvas` sont rejetés.


- Les transferts médias peuvent désormais rejeter leur Promise sur une erreur de statut ou une absence d'ACK. Les commandes sans ACK documenté restent des écritures locales.
- Les méthodes de texte très long émettent plusieurs blocs logiques avec un CRC global. Le contenu des glyphes et les variantes de dimensions restent à valider séparément.

Validation : tests unitaires utilisant un faux adapter, non substitut à des tests matériels 16×16, 32×32 et 64×64.

## Intégration des adapters BLE et Canvas

En Node, utiliser `createNodeMatrix()` depuis `node.js`. Voir [BLE](ble.md) et [Canvas](canvas.md).

`requestDeviceInfo()` demande explicitement les informations firmware via `04 00 01 80` ; `getDeviceInfo()` tente de lire le descripteur optionnel `0x2901` sans rendre sa présence obligatoire. Ces informations peuvent redimensionner le Canvas et en effacer le contenu (comportement Canvas normal).
