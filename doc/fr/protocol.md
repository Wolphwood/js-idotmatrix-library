

* **[ Version anglaise ](../en/protocol.md)**
* **[ Documentation ](./doc.md)**

---

# SOMMAIRE
* [PROTOCOLE](#protocole)
  * [CHARGE UTILE D'ALIMENTATION DE L'ÉCRAN (`screenOn` / `screenOff`)](#charge-utile-dalimentation-de-lécran-screenon--screenoff)
  * [CHARGE UTILE DE LUMINOSITÉ (`setBrightness`)](#charge-utile-de-luminosité-setbrightness)
  * [CHARGE UTILE DE ROTATION DE L'ÉCRAN (`setRotation` / `flipScreen`)](#charge-utile-de-rotation-de-lécran-setrotation--flipscreen)
  * [SOUS-SYSTÈME DE STREAMING DE DONNÉES EN MASSE (`sendText` / `sendImage` / `drawGif`)](#sous-système-de-streaming-de-données-en-masse-sendtext--sendimage--drawgif)
  * [CHARGE UTILE GRAFFITI (`drawImage`)](#charge-utile-graffiti-drawimage)
  * [CHARGE UTILE D'EFFET PERSONNALISÉ](#charge-utile-deffet-personnalisé)
  * [CHARGE UTILE DE FIGEAGE DE L'ÉCRAN](#charge-utile-de-figeage-de-lécran)
  * [CHARGE UTILE DE SYNCHRONISATION DE L'HEURE](#charge-utile-de-synchronisation-de-lheure)
  * [CHARGE UTILE DU CHRONOMÈTRE](#charge-utile-du-chronomètre)
  * [CHARGE UTILE DE CONFIGURATION DE L'HORLOGE](#charge-utile-de-configuration-de-lhorloge)
  * [CHARGE UTILE DU COMPTE À REBOURS](#charge-utile-du-compte-à-rebours)
  * [CHARGE UTILE DU MODE ÉCO (`setEcoMode`)](#charge-utile-du-mode-éco-setecomode)
  * [INTERROGATION DE L'ÉTAT DE L'APPAREIL (`askStatus`)](#interrogation-de-létat-de-lappareil-askstatus)
  * [LECTURE DU DÉLAI DE MISE EN VEILLE DE L'ÉCRAN (`readScreenLight`)](#lecture-du-délai-de-mise-en-veille-de-lécran-readscreenlight)
  * [CHARGE UTILE DE SÉCURITÉ MATÉRIELLE (`setPassword` / `resetPassword` / `verifyPassword`)](#charge-utile-de-sécurité-matérielle-setpassword--resetpassword--verifypassword)
  * [CHARGE UTILE DE CYCLE DE VIE DE L'APPAREIL (`deleteDeviceData`)](#charge-utile-de-cycle-vie-de-lappareil-deletedevicedata)
  * [CHARGE UTILE D'EFFET INTÉGRÉ](#charge-utile-deffet-intégré)
  * [CHARGE UTILE DE COULEUR PLEIN ÉCRAN](#charge-utile-de-couleur-plein-écran)
  * [CHARGE UTILE D'ARRÊT DU RYTHME](#charge-utile-darrêt-du-rythme)
  * [CHARGE UTILE DU TABLEAU DES SCORES](#charge-utile-du-tableau-des-scores)

---

# PROTOCOLE

## CHARGE UTILE D'ALIMENTATION DE L'ÉCRAN (`screenOn` / `screenOff`)
Contrôle l'état d'alimentation du panneau de la matrice LED.
* **Méthodes JS :** `matrix.screenOn()` / `matrix.screenOff()`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x05` | Longueur du paquet (5 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x07` | Commande d'alimentation de l'écran | NON |
| `0x01` | Sous-commande | NON |
| `0x00` / `0x01` | État (`0x00` = Éteint, `0x01` = Allumé) | OUI |

---

## CHARGE UTILE DE LUMINOSITÉ (`setBrightness`)
Modifie la luminosité matérielle globale du panneau. Limité en toute sécurité entre 5 and 100 dans le SDK.
* **Méthode JS :** `matrix.setBrightness(level)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x05` | Longueur du paquet (5 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x04` | Commande de luminosité | NON |
| `this.#MIN_VALUE` | Remplissage (padding) du protocole (`0x80`) | NON |
| `5 - 100` | Octet du niveau d'intensité de la luminosité | OUI |

---

## CHARGE UTILE DE ROTATION DE L'ÉCRAN (`setRotation` / `flipScreen`)
Gère le changement des coordonnées d'affichage de l'écran. Le matériel traite la rotation axiale à 90° et le miroir géométrique à 180° comme des couches de rendu distinctes.
* **Méthodes JS :** `matrix.setRotation(angle)` / `matrix.flipScreen(enabled)`

### 1. Pivot standard à 90 degrés (`setRotation`)
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x05` | Longueur du paquet (5 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x03` | Mode de configuration | NON |
| `0x01` | Sous-commande | NON |
| `0` / `1` | Angle de rotation (`0` = 0°, `1` = 90°) | OUI |

### 2. Retournement complet à 180 degrés / Effet Miroir (`flipScreen`)
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x05` | Longueur du paquet (5 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x06` | Commande d'affichage de l'horloge / de la disposition | NON |
| `this.#MIN_VALUE` | Remplissage (padding) du protocole (`0x80`) | NON |
| `0x00` / `0x01` | État de retournement (`0x00` = Normal, `0x01` = Retourné à 180°) | OUI |

---

## SOUS-SYSTÈME DE STREAMING DE DONNÉES EN MASSE (`sendText` / `sendImage` / `drawGif`)
Gère l'envoi de structures binaires complexes et volumineuses (polices, images binaires, fichiers optimisés) à l'aide d'un pipeline de streaming par blocs (chunks) intégré.

### 1. En-tête de transport principal (16 octets)
Chaque flux de ressource volumineuse doit être précédé de ce bloc de tramage de 16 octets avant la fragmentation BLE physique.

| INDEX DE L'OCTET | TYPE | DESCRIPTION |
|---|---|---|
| `0 - 1` | `uint16` (LE) | Longueur totale du paquet (Longueur de la charge utile interne + en-tête de 16 octets) |
| `2` | `uint8` | Contexte d'Opcode fixe (`0x03` = Écriture flash du fichier cible / stockage en masse) |
| `3 - 4` | `uint16` | Constante de remplissage / Marqueurs de sous-système (`0x00, 0x00`) |
| `5 - 8` | `uint32` (LE) | Longueur de la charge utile interne (Taille brute des données de la ressource ciblée) |
| `9 - 12` | `uint32` (LE) | Somme de contrôle CRC32 standard calculée sur les octets bruts de la charge utile interne |
| `13 - 14` | `uint16` | Constantes de pied de page (footer) du système (`0x00, 0x00`) |
| `15` | `uint8` | Index de l'emplacement mémoire matériel cible (Par défaut `12` / Vitrine en direct) |

### 2. Structure de découpage logique (PNG/GIF)
Les fichiers binaires volumineux sont découpés en blocs (chunks) logiques allant jusqu'à 4096 octets. Chaque bloc utilise la structure d'enveloppe suivante, intégrée dans les couches de fragmentation BLE :

| INDEX DE L'OCTET | TYPE | DESCRIPTION |
|---|---|---|
| `0 - 1` | `int16` (LE) | Traqueur de longueur calculée (`Longueur totale du fichier + nombre total de blocs`) |
| `2 - 3` | `uint16` | Constantes d'espacement de séquence (`0x00, 0x00`) |
| `4` | `uint8` | Drapeau de séquence de paquet (`0x00` = Premier bloc / Initialiser l'écriture Flash, `0x02` = Bloc de continuité) |
| `5 - 8` | `int32` (LE) | Longueur totale du tableau de taille du fichier |
| `9+` | `bytes` | Charge utile brute du flux binaire découpé (Max 4096 octets) |

---

## CHARGE UTILE GRAFFITI (`drawImage`)
Utilisé pour le rendu de trames RGB brutes et non compressées en temps réel. Contourne le traitement standard d'écriture en masse dans la mémoire flash pour une interaction immédiate avec la matrice.
* **Méthode JS :** `matrix.drawImage(rgbaData, mode)`

| INDEX DE L'OCTET | TYPE | DESCRIPTION |
|---|---|---|
| `0 - 1` | `uint16` (LE) | Taille totale du paquet de tramage (`rgbBuffer.length + 16`) |
| `2` | `uint8` | Opcode de dessin en direct (`0x01` = Écriture avec rafraîchissement immédiat du Canvas) |
| `3` | `uint8` | Constante de remplissage (`0x00`) |
| `4` | `uint8` | Drapeau de continuité (`0x00` = Exécution d'un bloc statique unique) |
| `5 - 8` | `uint32` (LE) | Taille totale du tampon d'octets RGB (`pixelCount * 3`) |
| `9 - 12` | `uint32` (LE) | Somme de contrôle CRC32 standard calculée sur les octets RGB bruts |
| `13` | `uint8` | Profil de vitesse (`0x00` for une injection de trame statique) |
| `14` | `uint8` | Constante de remplissage (`0x00`) |
| `15` | `uint8` | Index du canal de mode de contexte de vue en direct cible (ex: `12` = Graffiti en direct) |
| `16+` | `bytes` | Séquence brute à plat des canaux de couleur RGB séquentiels (`[R,G,B,R,G,B...]`) |

---

## CHARGE UTILE D'EFFET PERSONNALISÉ
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `6` | Longueur du paquet | NON |
| `0x00` | Constante | NON |
| `0x05` | Commande Graffiti | NON |
| `0x02` | Sous-commande `Effacer la trame` | NON |
| `0x00` | Constante de remplissage 1 | NON |
| `0x00` | Constante de remplissage 2 | NON |

---

## CHARGE UTILE DE FIGEAGE DE L'ÉCRAN
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `5` | Longueur du paquet | NON |
| `0x00` | Constante | NON |
| `0x03` | Mode de configuration | NON |
| `0x02` | Sous-commande | NON |
| `0` / `1` | État de figeage (`0` = Non figé, `1` = Figé) | OUI |

---

## CHARGE UTILE DE SYNCHRONISATION DE L'HEURE
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `10` | Longueur du paquet | NON |
| `0x00` | Constante | NON |
| `0x01` | Sous-système cible de l'horloge | NON |
| `0x01` | Sous-commande | NON |
| `0-99` | Octet de donnée de l'année (Décalage par rapport à 2000) | OUI |
| `1-12` | Octet de donnée du mois | OUI |
| `1-31` | Octet de donnée du jour | OUI |
| `0-23` | Octet de donnée de l'heure | OUI |
| `0-59` | Octet de donnée des minutes | OUI |
| `0-59` | Octet de donnée des secondes | OUI |

---

## CHARGE UTILE DU CHRONOMÈTRE
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `6` | Longueur du paquet | NON |
| `0x00` | Constante | NON |
| `0x01` | Sous-système cible du chrono | NON |
| `0x02` | Sous-commande | NON |
| `1` / `2` / `3` | Contrôle de l'état (`1` = Réinitialiser, `2` = Démarrer, `3` = Pause) | OUI |
| `0x00` | Remplissage | NON |

---

## CHARGE UTILE DE CONFIGURATION DE L'HORLOGE
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `8` | Longueur du paquet | NON |
| `0x00` | Constante | NON |
| `0x01` | Sous-système cible de l'horloge | NON |
| `0x03` | Sous-commande | NON |
| `0x01` / `0x02` | Index du style de mode de l'horloge | OUI |
| `0` / `1` | Mode de format de l'heure (`0` = 12h, `1` = 24h) | OUI |
| `0` / `1` | Mode de l'unité de température (`0` = °C, `1` = °F) | OUI |
| `0` / `1` | Drapeau d'affichage du capteur ambiant | OUI |

---

## CHARGE UTILE DU COMPTE À REBOURS
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `9` | Longueur du paquet | NON |
| `0x00` | Constante | NON |
| `0x01` | Sous-système cible du compte à rebours | NON |
| `0x04` | Sous-commande | NON |
| `1` / `2` / `3` | Contrôle opérationnel (`1` = Réinitialiser, `2` = Démarrer, `3` = Pause) | OUI |
| `0-59` | Durée totale en minutes | OUI |
| `0-59` | Durée totale en secondes | OUI |
| `0x00` | Octet de remplissage 1 | NON |
| `0x00` | Octet de remplissage 2 | NON |

---

## CHARGE UTILE DU MODE ÉCO (`setEcoMode`)
Configure les limites de planification automatique de l'alimentation matérielle ainsi que les configurations de luminosité minimale de sécurité.
* **Méthode JS :** `matrix.setEcoMode(flag, startH, startM, endH, endM, light)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x0A` | Longueur du paquet (10 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x02` | Sous-système cible de gestion de l'alimentation | NON |
| `this.#MIN_VALUE` | Remplissage du protocole (`0x80`) | NON |
| `0` / `1` | Drapeau actif du mode éco (`0` = Désactivé, `1` = Activé) | OUI |
| `0-23` | Bloc de l'heure de déclenchement de l'activation | OUI |
| `0-59` | Bloc des minutes de déclenchement de l'activation | OUI |
| `0-23` | Bloc de l'heure de déclenchement de la désactivation | OUI |
| `0-59` | Bloc des minutes de déclenchement de la désactivation | OUI |
| `5-100` | Intensité de luminosité restreinte du panneau pendant le couvre-feu actif | OUI |

---

## INTERROGATION DE L'ÉTAT DE L'APPAREIL (`askStatus`)
Trame de requête pure utilisée pour interroger le microcontrôleur de la matrice afin qu'il renvoie l'état de son environnement opérationnel via des notifications GATT.
* **Méthode JS :** `matrix.askStatus()`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x04` | Longueur du paquet (4 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x03` | Sous-système cible du cycle de vie principal | NON |
| `0x00` | Sélecteur de commande de lecture d'état | NON |

### Structure du paquet de notification entrant (`0x03, 0x00`)
L'appareil émet une séquence d'acquittement de 5 octets en retour à la caractéristique `0xfa03` :
`[0x05, 0x00, 0x03, 0x00, MODE]`

* `MODE = 0x00` : L'écran fonctionne actuellement en mode Horloge standard / Widget.
* `MODE = 0x01` : L'écran exécute actuellement des ressources de stockage cloud / des animations internes.
* `MODE = 0x03` : L'écran est actuellement détourné par des primitives de dessin en direct (Mode DIY / Live Pixel).

---

## LECTURE DU DÉLAI DE MISE EN VEILLE DE L'ÉCRAN (`readScreenLight`)
Interroge les paramètres matériels de la mémoire flash interne pour demander la durée de la configuration actuelle de mise en veille automatique de l'écran.
* **Méthode JS :** `matrix.readScreenLight()`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x05` | Longueur du paquet (5 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x0F` | Registre de lecture de la configuration du stockage | NON |
| `this.#MIN_VALUE` | Remplissage du protocole (`0x80`) | NON |
| `0xFF` | Drapeau générique (wildcard) de demande de lecture | NON |

---

## CHARGE UTILE DE SÉCURITÉ MATÉRIELLE (`setPassword` / `resetPassword` / `verifyPassword`)
> ⚠️ **AVERTISSEMENT DE SÉCURITÉ :** Le micrologiciel (firmware) du microcontrôleur interne exécute toutes les primitives BLE entrantes sans tenir compte de l'état de validation de la session. Les couches de sécurité sont entièrement gérées côté client et ne sont appliquées que dans l'application officielle pour smartphone.

### 1. Définir / Modifier le verrouillage par code PIN matériel (`setPassword` / `resetPassword`)
* **Méthodes JS :** `matrix.setPassword(pincode)` / `matrix.resetPassword(pincode)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x08` | Longueur du paquet (8 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x04` | Sous-système de configuration du système | NON |
| `0x02` | Sous-commande de sécurité | NON |
| `0x00` / `0x01` | Mode opérationnel (`0x00` = Désactiver/Supprimer le PIN, `0x01` = Actif/Modifier le PIN) | OUI |
| `0-99` | Premier segment de la paire de chiffres (ex: PIN `"123456"` $\rightarrow$ `12` / `0x0C`) | OUI |
| `0-99` | Deuxième segment de la paire de chiffres (ex: PIN `"123456"` $\rightarrow$ `34` / `0x22`) | OUI |
| `0-99` | Troisième segment de la paire de chiffres (ex: PIN `"123456"` $\rightarrow$ `56` / `0x38`) | OUI |

### 2. Vérifier le code PIN de la session (`verifyPassword`)
* **Méthode JS :** `matrix.verifyPassword(pincode)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x07` | Longueur du paquet (7 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x05` | Registre de validation de session volatile | NON |
| `0x02` | Identifiant d'authentification | NON |
| `0-99` | Premier segment de la paire de chiffres | OUI |
| `0-99` | Deuxième segment de la paire de chiffres | OUI |
| `0-99` | Troisième segment de la paire de chiffres | OUI |

---

## CHARGE UTILE DE CYCLE DE VIE DE L'APPAREIL (`deleteDeviceData`)
Exécution d'une commande interne destructive. Déclenche un effacement complet par formatage de la mémoire flash matérielle, supprimant les configurations stockées, les emplacements (slots) et les données Wi-Fi avant de demander un redémarrage matériel (hard reboot).
* **Méthode JS :** `matrix.deleteDeviceData()`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x04` | Longueur du paquet (4 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x03` | Sous-système cible du cycle de vie principal | NON |
| `this.#MIN_VALUE` | Exécution du paramètre constant d'effacement destructif (`0x80`) | NON |

---

## CHARGE UTILE D'EFFET INTÉGRÉ
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `5` | Longueur du paquet | NON |
| `0x00` | Constante | NON |
| `0x04` | Mode du système d'animation | NON |
| `0x03` | Sous-commande | NON |
| `0-255` | Carte d'index de l'animation prédéfinie interne | OUI |

---

## CHARGE UTILE DE COULEUR PLEIN ÉCRAN
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `7` | Longueur du paquet | NON |
| `0x00` | Constante | NON |
| `0x04` | Mode du système d'animation | NON |
| `0x05` | Sous-commande | NON |
| `0-255` | Canal Rouge de l'arrière-plan global | OUI |
| `0-255` | Canal Vert de l'arrière-plan global | OUI |
| `0-255` | Canal Bleu de l'arrière-plan global | OUI |

---

## CHARGE UTILE D'ARRÊT DU RYTHME
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `6` | Longueur du paquet | NON |
| `0x00` | Constante | NON |
| `0x06` | Commande audio | NON |
| `0x02` | Sous-commande | NON |
| `0x00` | Drapeau d'arrêt 1 | NON |
| `0x00` | Drapeau d'arrêt 2 | NON |

---

## CHARGE UTILE DU TABLEAU DES SCORES
| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `8` | Longueur du paquet | NON |
| `0x00` | Constante | NON |
| `0x0a` | Commande du tableau des scores | NON |
| `0x80` | Sous-commande | NON |
| `0-255` | Octet de poids faible du Score 1 (Little Endian) | OUI |
| `0-255` | Octet de poids fort du Score 1 (Little Endian) | OUI |
| `0-255` | Octet de poids faible du Score 2 (Little Endian) | OUI |
| `0-255` | Octet de poids fort du Score 2 (Little Endian) | OUI |