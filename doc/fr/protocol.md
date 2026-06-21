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
Modifie la luminosité matérielle globale du panneau. Limité en toute sécurité entre 5 et 100 dans le SDK.
* **Méthode JS :** `matrix.setBrightness(level)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x05` | Longueur du paquet (5 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x04` | Commande de luminosité | NON |
| `0x80` | Remplissage (padding) du protocole (`this.#MIN_VALUE`) | NON |
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
| `0x80` | Remplissage (padding) du protocole (`this.#MIN_VALUE`) | NON |
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
| `2 - 3` | `uint16` | Constantes d'espacement de séquence (`0x00, 0x00` pour le premier paquet, ou `0x02, 0x00` pour les suivants) |
| `4 - 7` | `uint32` (LE) | Longueur de la charge utile globale attendue |
| `8 - 11` | `uint32` (LE) | Répétition de validation de la signature CRC32 |
| `12 - 14` | `uint8` [3] | En-tête de routage interne du micrologiciel (`0x05, 0x00, 0x0d`) |
| `15+` | `bytes` | Segment binaire de données brutes |

---

## CHARGE UTILE GRAFFITI (`drawImage`)
Permet l'envoi direct d'une grille matricielle RGB complète non compressée pour un affichage instantané en temps réel.
* **Méthode JS :** `matrix.drawImage(rgbBuffer)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `Varies` | Taille dynamique basée sur les dimensions matérielles de la matrice | NON |
| `0x00` | Constante d'initialisation | NON |
| `0x05` | Commande d'affichage graphique de bas niveau | NON |
| `0x01` | Mode d'injection de trame directe | NON |
| `0x00` | Octet d'index de trame d'animation de destination | NON |
| `0x01` | Nombre total de trames envoyées dans la session (`1`) | NON |
| `0x00, 0x00` | Décalage (offset) de rendu de coordonnée X (Horizontal) | OUI |
| `0x00, 0x00` | Décalage (offset) de rendu de coordonnée Y (Vertical) | OUI |
| `Width` | Largeur totale de la zone d'affichage (ex: `16` ou `32`) | NON |
| `Height` | Hauteur totale de la zone d'affichage (ex: `16` ou `32`) | NON |
| `0x00` | Indicateur d'état de compression (`0x00` = RVB brut) | NON |
| `0x00` | Constante de remplissage | NON |
| `12` | Index du canal de mode de contexte de vue en direct cible (Graffiti en direct) | NON |
| `0-255` [ ] | Séquence brute à plat des canaux de couleur RGB séquentiels (`[R, G, B, R, G, B...]`) | OUI |

---

## CHARGE UTILE D'EFFET PERSONNALISÉ
Configure les animations rythmiques combinées avec des effets lumineux d'arrière-plan personnalisés.
* **Méthode JS :** `matrix.setCustomEffect(flags, r, g, b)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x08` | Longueur du paquet (8 octets) | NON |
| `0x00` | Constante | NON |
| `0x06` | Commande audio / visuelle globale | NON |
| `0x01` | Sous-commande d'effet personnalisé | NON |
| `0-255` | Drapeaux (flags) de configuration du mode de rendu visuel | OUI |
| `0-255` | Canal Rouge de l'arrière-plan de l'effet | OUI |
| `0-255` | Canal Vert de l'arrière-plan de l'effet | OUI |
| `0-255` | Canal Bleu de l'arrière-plan de l'effet | OUI |

---

## CHARGE UTILE DE FIGEAGE DE L'ÉCRAN
Bascule l'état de gel de l'affichage de l'écran de la matrice, figeant temporairement le rendu en cours.
* **Méthode JS :** `matrix.setScreenFreeze(enabled)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x05` | Longueur du paquet (5 octets) | NON |
| `0x00` | Constante | NON |
| `0x04` | Commande système de l'écran | NON |
| `0x02` | Sous-commande de contrôle du rafraîchissement | NON |
| `0x00` / `0x01` | État de figeage (`0x00` = Fluide/Normal, `0x01` = Figé) | OUI |

---

## CHARGE UTILE DE SYNCHRONISATION DE L'HEURE
Met à jour l'horloge interne de la matrice avec les paramètres temporels actuels de l'hôte.
* **Méthode JS :** `matrix.setClockTime(date)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x0a` | Longueur du paquet (10 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x01` | Commande de gestion du temps | NON |
| `0x01` | Sous-commande de mise à jour temporelle | NON |
| `0 - 99` | Année (Représentation à deux chiffres de l'année en cours, ex: `26` pour 2026) | OUI |
| `1 - 12` | Mois de l'année | OUI |
| `1 - 31` | Jour du mois | OUI |
| `0 - 23` | Heure courante | OUI |
| `0 - 59` | Minute courante | OUI |
| `0 - 59` | Seconde courante | OUI |

---

## CHARGE UTILE DU CHRONOMÈTRE
Gère les états du widget matériel Chronomètre intégré.
* **Méthode JS :** `matrix.setStopwatch(status)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x06` | Longueur du paquet (6 octets) | NON |
| `0x00` | Constante | NON |
| `0x02` | Commande des widgets outils | NON |
| `0x01` | Sous-commande du chronomètre | NON |
| `1` / `2` / `3` | Indicateur de l'état (`1` = Réinitialiser, `2` = Démarrer, `3` = Pause) | OUI |
| `0x00` | Remplissage (padding) obligatoire | NON |

---

## CHARGE UTILE DE CONFIGURATION DE L'HORLOGE
Configure l'apparence visuelle, les couleurs et le format d'affichage du widget de l'horloge système.
* **Méthode JS :** `matrix.setClockStyle(style, visibleDate, hour24, r, g, b, colonBlink)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x0d` | Longueur du paquet (13 octets) | NON |
| `0x00` | Constante | NON |
| `0x01` | Commande d'affichage de l'horloge | NON |
| `0x02` | Sous-commande de style graphique | NON |
| `0 - 7` | Index de la disposition du cadran de l'horloge | OUI |
| `0x00` / `0x01` | Visibilité du bloc de la Date (`0x00` = Masqué, `0x01` = Affiché) | OUI |
| `0x00` / `0x01` | Format d'affichage de l'heure (`0x00` = 12 heures, `0x01` = 24 heures) | OUI |
| `0 - 255` | Canal Rouge pour les chiffres de l'horloge | OUI |
| `0 - 255` | Canal Vert pour les chiffres de l'horloge | OUI |
| `0 - 255` | Canal Bleu pour les chiffres de l'horloge | OUI |
| `0x00` / `0x01` | Clignotement des deux points (colon `:`) séparateurs | OUI |
| `0x00, 0x00` | Remplissage additionnel de fermeture | NON |

---

## CHARGE UTILE DU COMPTE À REBOURS
Configure et pilote la routine interne du temporisateur de compte à rebours.
* **Méthode JS :** `matrix.setCountdown(status, minutes, seconds)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x09` | Longueur du paquet (9 octets) | NON |
| `0x00` | Constante | NON |
| `0x02` | Commande des widgets outils | NON |
| `0x02` | Sous-commande du compte à rebours | NON |
| `1` / `2` / `3` | Indicateur de l'état (`1` = Réinitialiser, `2` = Démarrer, `3` = Pause) | OUI |
| `0 - 59` | Valeur initiale des minutes | OUI |
| `0 - 59` | Valeur initiale des secondes | OUI |
| `0x00, 0x00` | Remplissage de complétion | NON |

---

## CHARGE UTILE DU MODE ÉCO (`setEcoMode`)
Planifie un couvre-feu pour l'économie d'énergie avec une réduction ou coupure programmée de l'affichage.
* **Méthode JS :** `matrix.setEcoMode(flag, startH, startM, endH, endM, light)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x0b` | Longueur du paquet (11 octets) | NON |
| `0x00` | Constante / Préfixe d'en-tête | NON |
| `0x09` | Commande d'économie d'énergie | NON |
| `0x01` | Sous-commande d'activation de planification | NON |
| `0x00` / `0x01` | État d'activation globale (`0x00` = Désactivé, `0x01` = Planifié) | OUI |
| `0 - 23` | Bloc de l'heure de déclenchement de l'activation | OUI |
| `0 - 59` | Bloc des minutes de déclenchement de l'activation | OUI |
| `0 - 23` | Bloc de l'heure de déclenchement de la désactivation | OUI |
| `0 - 59` | Bloc des minutes de déclenchement de la désactivation | OUI |
| `5 - 100` | Intensité de luminosité restreinte du panneau pendant le couvre-feu | OUI |

---

## INTERROGATION DE L'ÉTAT DE L'APPAREIL (`askStatus`)
**⚠️ Fonctionnalité Expérimentale** Interroge le microcontrôleur pour récupérer son état de fonctionnement actuel. L'appareil répond de manière asynchrone via une notification GATT indiquant son mode d'exécution (Horloge, Animation, Dessin en direct, etc.).
* **Méthode JS :** `matrix.askStatus()`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x04` | Longueur du paquet (4 octets) | NON |
| `0x00` | Constante | NON |
| `0x04` | Commande d'interrogation système | NON |
| `0x01` | Sous-commande de lecture du statut volatil | NON |

---

## LECTURE DU DÉLAI DE MISE EN VEILLE DE L'ÉCRAN (`readScreenLight`)
**⚠️ Fonctionnalité Expérimentale** Demande à la matrice de renvoyer la configuration de son temporisateur de mise en veille actuel. La réponse est interceptée de manière asynchrone via les événements de notification.
* **Méthode JS :** `matrix.readScreenLight()`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x04` | Longueur du paquet (4 octets) | NON |
| `0x00` | Constante | NON |
| `0x0b` | Commande de configuration énergétique | NON |
| `0x01` | Sous-commande de lecture du délai d'extinction | NON |

---

## CHARGE UTILE DE SÉCURITÉ MATÉRIELLE (`setPassword` / `resetPassword` / `verifyPassword`)
**⚠️ Fonctionnalité Expérimentale** *Note : Le micrologiciel du microcontrôleur interne exécute toutes les primitives BLE entrantes sans exiger de validation de session stricte au niveau matériel. Les couches de sécurité de session sont essentiellement gérées et appliquées au niveau de l'application cliente officielle.*

### 1. Définir / Modifier le verrouillage par code PIN (`setPassword` / `resetPassword`)
* **Méthodes JS :** `matrix.setPassword(pincode)` / `matrix.resetPassword(pincode)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `Dynamic` | Longueur du paquet (4 + nombre d'octets du code PIN) | NON |
| `0x00` | Constante | NON |
| `0x0d` | Commande du registre de sécurité | NON |
| `0x01` / `0x02` | Sous-commande (`0x01` = Définir, `0x02` = Réinitialiser) | NON |
| `Bytes` | Caractères numériques convertis composant le code PIN de verrouillage | OUI |

### 2. Valider le code PIN pour la session en cours (`verifyPassword`)
* **Méthode JS :** `matrix.verifyPassword(pincode)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `Dynamic` | Longueur du paquet (4 + nombre d'octets du code PIN) | NON |
| `0x00` | Constante | NON |
| `0x0d` | Commande du registre de sécurité | NON |
| `0x03` | Sous-commande de vérification / authentification session | NON |
| `Bytes` | Caractères numériques composant le code PIN d'authentification session | OUI |

---

## CHARGE UTILE DE CYCLE DE VIE DE L'APPAREIL (`deleteDeviceData`)
**⚠️ Fonctionnalité Expérimentale** Déclenche une réinitialisation complète d'usine de la matrice, effaçant les données stockées dans la mémoire flash et forçant un redémarrage du micrologiciel.
* **Méthode JS :** `matrix.deleteDeviceData()`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x04` | Longueur du paquet (4 octets) | NON |
| `0x00` | Constante | NON |
| `0xa0` | Commande de cycle de vie matériel | NON |
| `0x55` | Sous-commande de validation de destruction des données | NON |

---

## CHARGE UTILE D'EFFET INTÉGRÉ
Affiche l'une des animations prédéfinies stockées en interne dans la mémoire d'usine du micrologiciel de l'appareil.
* **Méthode JS :** `matrix.setBuiltInEffect(index)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x05` | Longueur du paquet (5 octets) | NON |
| `0x00` | Constante | NON |
| `0x04` | Mode du système d'animation | NON |
| `0x03` | Sous-commande d'effet intégré | NON |
| `0 - 255` | Carte d'index de l'animation prédéfinie matérielle interne | OUI |

---

## CHARGE UTILE DE COULEUR PLEIN ÉCRAN
Remplit instantanément l'intégralité de la matrice LED avec une couleur statique unie.
* **Méthode JS :** `matrix.setSolidColor(r, g, b)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x07` | Longueur du paquet (7 octets) | NON |
| `0x00` | Constante | NON |
| `0x04` | Mode du système d'animation | NON |
| `0x05` | Sous-commande de couleur unie | NON |
| `0 - 255` | Canal Rouge de l'arrière-plan global | OUI |
| `0 - 255` | Canal Vert de l'arrière-plan global | OUI |
| `0 - 255` | Canal Bleu de l'arrière-plan global | OUI |

---

## CHARGE UTILE D'ARRÊT DU RYTHME
Arrête immédiatement toutes les animations de rythme audio ou les captures de spectre sonore en cours d'exécution.
* **Méthode JS :** `matrix.stopRhythm()`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x06` | Longueur du paquet (6 octets) | NON |
| `0x00` | Constante | NON |
| `0x06` | Commande audio / visuelle globale | NON |
| `0x02` | Sous-commande d'arrêt des routines audio | NON |

---

## CHARGE UTILE DU TABLEAU DES SCORES
Met à jour et affiche le tableau des scores intégré pour le suivi de deux équipes rivales (A et B).
* **Méthode JS :** `matrix.setScoreboard(scoreA, scoreB)`

| VALEUR | DESCRIPTION | MODIFIABLE |
|---|---|---|
| `0x08` | Longueur du paquet (8 octets) | NON |
| `0x00` | Constante | NON |
| `0x02` | Commande des widgets outils | NON |
| `0x03` | Sous-commande du tableau des scores | NON |
| `0 - 99` | Score de l'Équipe A | OUI |
| `0 - 99` | Score de l'Équipe B | OUI |
| `0x00, 0x00` | Remplissage final obligatoire | NON |