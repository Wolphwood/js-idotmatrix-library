# BluetoothAdapter

Les adapters Bluetooth isolent le transport BLE du protocole iDotMatrix. La classe principale peut ainsi utiliser la même logique de commandes dans un navigateur et dans Node.js.

## Sommaire

- [Architecture](#architecture)
- [Ressources BLE](#ressources-ble)
- [WebBluetoothAdapter](#webbluetoothadapter)
- [NodeWebBluetoothAdapter](#nodewebbluetoothadapter)
  - [`scan()`](#scan)
- [Connexion](#connexion)
- [Déconnexion](#déconnexion)
- [Notifications](#notifications)
- [Écriture](#écriture)
- [MTU](#mtu)

---

## Architecture

```text
iDotMatrix
    ↓
BluetoothAdapter
├── WebBluetoothAdapter
└── NodeWebBluetoothAdapter
```

`iDotMatrix` construit les commandes du protocole. L'adapter BLE se charge uniquement de découvrir le périphérique, établir la connexion GATT, écrire sur la caractéristique et recevoir les notifications.

## Ressources BLE

| Ressource | UUID |
| --- | --- |
| Service | `0x00FA` |
| Écriture | `0xFA02` |
| Notifications | `0xFA03` |

## WebBluetoothAdapter

`WebBluetoothAdapter` utilise Web Bluetooth. Il constitue l'adapter navigateur de la bibliothèque.

```js
const matrix = new iDotMatrix({
  bluetoothadapter: new WebBluetoothAdapter()
});

await matrix.connect();
```

Sans identifiant de périphérique, la connexion Web peut ouvrir le sélecteur Bluetooth du navigateur. Le filtrage par défaut cible les périphériques iDotMatrix dont le nom commence par `IDM-`.

## NodeWebBluetoothAdapter

`NodeWebBluetoothAdapter` fournit le transport BLE sous Node.js via le backend Web Bluetooth utilisé par le projet.

```js
const ble = new NodeWebBluetoothAdapter();

const matrix = new iDotMatrix({
  bluetoothadapter: ble
});
```

### `scan()`

Recherche les périphériques disponibles :

```js
const devices = await ble.scan({
  duration: 4000,
  prefix: "IDM-"
});
```

Options supportées :

| Option | Description |
| --- | --- |
| `duration` | Durée de recherche |
| `prefix` | Préfixe du nom |
| `suffix` | Suffixe du nom |
| `firstOnly` | Arrête/limite la recherche au premier résultat correspondant |

Un périphérique découvert peut ensuite être fourni à `connect()` via son identifiant ou son nom selon l'adapter.

## Connexion

La connexion publique reste gérée depuis `iDotMatrix` :

```js
await matrix.connect(deviceId);
```

Une fois connecté, l'adapter conserve le périphérique, le serveur GATT, le service et les caractéristiques nécessaires au protocole.

## Déconnexion

```js
await matrix.disconnect();
```

La déconnexion passe par l'adapter afin de garder la gestion du transport hors de la logique protocolaire.

## Notifications

L'adapter démarre les notifications sur `0xFA03` et transmet les données reçues à la couche `iDotMatrix`.

Les réponses firmware sont ensuite interprétées par la classe principale. Une partie des réponses expérimentales peut encore être journalisée plutôt qu'exposée par une API événementielle stabilisée.

## Écriture

Les commandes sont écrites sur `0xFA02` sans réponse lorsque le protocole le permet.

`iDotMatrix.send()` se charge du découpage des payloads et délègue chaque fragment à l'adapter.

## MTU

`detectMaxMtu()` permet de sonder les tailles d'écriture acceptées par la connexion BLE.

À l'heure actuelle, cette détection ne modifie pas automatiquement la taille de fragmentation utilisée par `send()` / `sendAsync()`, qui reste à 20 octets.
