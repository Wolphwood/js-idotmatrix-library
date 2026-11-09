# Adaptateurs Bluetooth BLE - version intégrée

Les deux transports `WebBluetoothAdapter` et `NodeWebBluetoothAdapter` partagent le moteur `GattAdapter` : découverte séparée, connexion/reconnexion GATT, un seul listener de notification, écriture séquentielle, événements de déconnexion et lecture optionnelle des descripteurs.

## Protocole et limites

| Élément | UUID |
|---|---|
| Service iDotMatrix | `0x00FA` |
| Caractéristique d'écriture | `0xFA02` |
| Caractéristique de notifications par défaut | `0xFA03` |

La caractéristique de notification `0xFA03` est configurable et, si absente, l'adapter cherche **une caractéristique unique** avec `notify` ou `indicate` sous le service attendu. Le SDK ne garantit pas qu'elle soit correcte sur chaque firmware ; préciser le UUID si la découverte est ambiguë.

`fragmentSize=20` représente la quantité maximale de données transmise par appel d'écriture côté SDK et non le MTU négocié. `ble.attMtu` est `null` tant que le runtime ne l'expose pas. La taille de fragment est configurable sans probe dangereuse ; les contraintes de la plate-forme restent applicables.

## Web

```js
import { iDotMatrix } from './iDotMatrix.js';
import { WebBluetoothAdapter } from './bluetooth/WebBluetoothAdapter.js';
const ble = new WebBluetoothAdapter();
const matrix = new iDotMatrix({ bluetoothadapter: ble, fragmentSize: 20 });
await matrix.connect(); // À appeler lors d'un clic utilisateur, sur navigateur compatible HTTPS
```

Le filtre Web par défaut cherche `IDM-`. `scan({prefix:''})` demande tous les appareils et autorise le service attendu. `scan()` renvoie l'objet natif sélectionné, pas un tableau.

## Node

```js
import { createNodeMatrix } from './node.js';
const matrix = createNodeMatrix();
const devices = await matrix.ble.scan({ duration: 4000, prefix: 'IDM-', firstOnly: false });
if (devices.length) await matrix.connect(devices[0].id);
```

`scan()` retourne des entrées `{ id, name, raw }`. La connexion accepte l'ID, le nom (si connu) ou l'objet natif. Le backend `webbluetooth` est importé au moment du scan ; le package doit être installé sur la machine Node.

## Événements et durée des opérations

`ble.startNotifications(callback)` déduplique la même fonction et ne réinstalle pas plusieurs listeners sur une connexion. `ble.stopNotifications()` désenregistre tous les callbacks. `ble.onDisconnect(callback)` retourne une fonction de désinscription.

Les transferts médias sérialisent leurs fragments et attendent le statut applicatif par famille (`image`, `gif`, `text`, `diy`). Les commandes simples `send()` ne garantissent que les écritures locales. Si la liaison tombe pendant un transfert, la Promise est rejetée ; une commande ultérieure peut se reconnecter automatiquement, mais **pas** le bloc interrompu. `disconnect()` explicite empêche toute reconnexion automatique jusqu'à `connect()`.

`matrix.getDeviceInfo()` lit `0x2901` si disponible, conserve les informations déjà reçues et synchronise les dimensions Canvas. `matrix.requestDeviceInfo()` transmet `04 00 01 80` puis attend une réponse `01 80` de 9 octets.

**Validation :** tests simulés uniquement, à confronter aux trois modèles physiques et firmwares ciblés.
