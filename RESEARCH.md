# sendImage

## "mode === 12"

Dans l'application voici le code qui crée ces deux octets :
```java
if (i == 12) {
  bArr3[13] = 0;
  bArr3[14] = 0;
} else {
  byte[] bArrShort2Bytes2 = ByteUtils.short2Bytes((short) DeviceMaterialTimeConvert.ConvertTime(AppData.getInstance().getTimeSign()));
  bArr3[13] = bArrShort2Bytes2[1];
  bArr3[14] = bArrShort2Bytes2[0];
}
```

et `DeviceMaterialTimeConvert` :
```java
package com.tech.idotmatrix.core.data;

/* JADX INFO: loaded from: classes2.dex */
public class DeviceMaterialTimeConvert {
  public static int ConvertTime(int i) {
    if (i == 1) {
      return 10;
    }
    if (i == 2) {
      return 30;
    }
    if (i != 3) {
      return i != 4 ? 5 : 300;
    }
    return 60;
  }
}
```
traduisible par :
```js
{ 1: 10, 2: 30, 3: 60, 4: 300 }
```

Dans les notes de décompilation initiales, `timeSign` n'était défini qu'à deux endroits dans l'application :

dans `com.tech.matrix.ui.pattern.DeviceMaterialChildFragment` ligne 538 :
```java
AppData.getInstance().setTimeSign(deviceMaterialTime);
```

et la mention est faite dans `NewDeviceMaterialChildFragment` à la ligne 532 :
```java
r0.setTimeSign(r6)
```
On voit comment la durée est calculée, mais son effet exact sur l’écran reste à comprendre. Il faudrait repartir de ces deux appels et suivre le réglage depuis l’interface de l’application. Les numéros de ligne ci-dessus viennent de la décompilation initiale ; il manque encore la version et l’empreinte de l’APK pour retrouver exactement le même code.

Le nom `mode` prêtait à confusion : l’index du contenu et sa durée sont deux champs distincts. Le SDK utilise maintenant `{ slotIndex, durationValue }`, avec 12 et 0 par défaut pour les images comme pour les GIF. Ce choix ne prouve pas que le slot 12 fonctionne partout.

Il reste à comprendre ce que représentent les autres slots, notamment le 13 utilisé auparavant pour les GIF. Est-ce une place dans une playlist, un type de contenu, un emplacement persistant ? Que remplace-t-on lorsqu’on réutilise le même index ? Accepter un octet côté SDK ne veut pas dire que l’appareil dispose de 256 emplacements.

Pour la durée, les valeurs de l’application font penser à des secondes. À vérifier sur l’écran, surtout pour zéro, les grandes valeurs et l’interaction avec les délais des frames GIF. Il faut aussi vérifier si le contenu survit à une déconnexion ou à une extinction.

# sendImage / sendGif / sendDIYImage / sendText

## Les blocs de 4096 octets

Dans [frames.js](protocol/frames.js), les médias sont découpés en blocs de 4096 octets de contenu maximum. L’enveloppe fait 16 octets pour image/GIF/texte, avec un CRC32 portant sur tout le contenu, et 9 octets sans CRC pour le DIY.

Les longueurs sont maintenant encodées en little-endian, y compris pour le DIY. C’est ce que produit le SDK ; il reste à comparer avec des captures réelles sur les différents firmwares.

Le premier bloc porte l’indicateur `00`, les suivants `02`. Est-ce qu’il existe d’autres valeurs ? Un marqueur de dernier bloc ? Il faudrait essayer un petit fichier, exactement 4096 octets, plusieurs blocs complets et un dernier bloc incomplet.

On ne connaît pas non plus les limites réelles de taille des fichiers ou de mémoire. Le champ uint32 décrit le format, pas la capacité de l’écran.

## Les réponses de transfert

Le décodeur applique actuellement ceci :

```text
image  02 00 : 1 = continuer, 3 = terminé, 2 = erreur
GIF    01 00 : 1 = continuer, 3 = terminé, 0 ou 2 = erreur
texte  03 00 : 1 = continuer, 3 = terminé, 2 = erreur
DIY    00 00 : 2 = continuer, 0 ou 1 = terminé
```

Les deux octets indiqués sont aux positions 2 et 3 de la notification ; le statut est à la position 4. Ces interprétations viennent des travaux précédents et restent à confirmer par modèle. Pour le DIY, aucun statut d’erreur précis n’est identifié.

Qu’est-ce qu’un ACK confirme réellement : réception, CRC correct, décodage, affichage ou sauvegarde ? Et après le dernier bloc, reçoit-on directement la fin ou encore une continuation avant la fin ? Les délais et l’ordre exact restent à mesurer.

Le statut d’erreur ne permet pas aujourd’hui de distinguer mémoire pleine, CRC invalide, fichier non supporté ou problème de mot de passe. Il faudrait provoquer ces cas séparément et conserver les réponses brutes.

On n’a pas identifié de numéro de transaction, de compteur de bloc ni de commande générale d’annulation ou de reprise. Après un timeout, impossible de savoir simplement où l’appareil en est. Réenvoyer le même bloc pourrait être accepté, dupliqué ou interprété comme le début d’un autre transfert.

## Ce qui reste fragile côté SDK

La réponse est associée au transfert par sa famille seulement. Un ancien ACK reçu en retard pourrait donc terminer le transfert suivant. Le code garde au maximum huit réponses en attente ; cette limite n’a pas encore été justifiée par des mesures.

Une réponse terminale peut aussi faire terminer l’opération avant l’envoi de tous les blocs. Il faut comprendre si ce cas existe vraiment, puis décider si le SDK doit le refuser.

Toutes les opérations passent par la même file : un upload qui attend son ACK bloque les commandes suivantes. Il manque encore une annulation dédiée et un retour de progression. Une coupure fait échouer le transfert ; la reconnexion d’une commande ultérieure ne reprend pas le fichier interrompu.

# PNG et GIF

Le SDK transmet les octets sans vérifier que le fichier est compatible avec le firmware.

À essayer : dimensions différentes de l’écran, images rectangulaires, transparence, alpha partiel, palettes, profondeurs de couleur, variantes de compression et fichiers tronqués. Est-ce que l’écran recadre, redimensionne ou refuse ? Les limites peuvent différer entre DIY et envoi d’image.

Pour les GIF, il reste les boucles, délais des frames, palettes locales, transparence et méthodes de remplacement des frames (« disposal »). On ne connaît pas les limites de nombre de frames ou de mémoire.

Quelques fichiers simples aideraient : damier, coins de quatre couleurs, image transparente et GIF de deux ou trois frames bien distinctes. Cela permettrait aussi de vérifier l’orientation et le rendu des couleurs sans deviner à partir d’une image complexe.

# textToBitmaps / sendText

Le Canvas permet maintenant de générer les glyphes dans le navigateur et sous Node. Ça ne garantit pas que les bitmaps correspondent à ce qu’attend le firmware.

Les largeurs actuelles sont 8, 16 et 32 pixels pour des hauteurs de 16, 32 et 64. L’ordre des bits, le sens de lecture, le seuil monochrome et les octets séparateurs restent à confronter à des glyphes de référence issus de l’application.

Il faut regarder les espaces, retours à la ligne, caractères trop larges, accents, caractères chinois et emoji. `numChars` compte quoi exactement : unités UTF-16, points de code ou glyphes ? Un caractère affiché peut occuper plusieurs éléments dans une chaîne JavaScript.

Le rendu dépend aussi de la police installée et du moteur Canvas. Comparer un même texte sous Node et dans le navigateur, puis sur l’appareil. Les panneaux rectangulaires et les hauteurs autres que 16/32/64 restent à étudier.

Les modes de défilement, couleurs, fonds et vitesse demandent encore un relevé visuel par firmware. Même chose pour les longs textes dépassant 4096 octets : le SDK sait produire plusieurs blocs avec un CRC global, mais le réassemblage doit être confirmé sur l’écran.

# Notifications

## `01 80`

Cet opcode apparaît pour les informations firmware et pour la synchronisation horaire. Le décodeur utilise actuellement la longueur : au moins neuf octets donne `deviceInfo`, cinq à huit donne `timeAck`.

Est-ce valable partout ? Une réponse peut-elle contenir des champs supplémentaires, ou être reçue en plusieurs morceaux ? Le décodeur ne vérifie pas encore la longueur annoncée dans l’en-tête et ne réassemble pas les notifications concaténées ou fragmentées.

`requestDeviceInfo()` attend un événement sans identifiant de requête. Une notification spontanée pourrait donc satisfaire son attente. Il faut aussi tester un échec d’écriture puis le timeout, pour vérifier le nettoyage et les rejets de Promise.

## `03 00` et `05 02`

`03 00` sert au texte mais aussi au statut d’affichage. Le routage dépend du transfert en cours ; une réponse retardée ou spontanée peut rendre cette distinction fausse.

`05 02` semble concerner la vérification du PIN, mais certains chemins étudiés sur le 32×32 l’utilisent aussi pour le dessin. Il manque une règle fiable pour distinguer les deux.

Les autres réponses restent accessibles sous forme générique. Il faudrait garder leur contexte et leurs octets avant de leur donner un nom trop précis.

# getDeviceInfo

Le descripteur `0x2901` permet de reconnaître TR1616, TR1632, TR2306/TR3232 et TR2403/TR6464. Côté réponse firmware, le SDK connaît les types 1 = 16×16, 3 = 32×32 et 4 = 64×64.

Il manque notamment le type du 16×32, les autres modèles, le sens complet des deux octets de version MCU et les capacités réellement associées à chaque profil. Le descripteur est optionnel et peut varier.

Si le descripteur et le firmware ne donnent pas les mêmes dimensions, `getDeviceInfo()` privilégie le descripteur et émet `deviceProfileConflict`. Mais une notification firmware ultérieure peut encore changer les dimensions. Il faut choisir une règle stable et vérifier qu’un changement d’appareil ne conserve pas les informations du précédent. Un changement de taille efface aussi le Canvas.

# freezeScreen / askStatus

Les deux méthodes envoient exactement la même chose :

```text
04 00 03 00
```

Aucun booléen de gel n’est transmis. Le nom `freezeScreen()` est donc à remettre en question : est-ce simplement une demande de statut mal identifiée ? Il faut retrouver l’appel dans l’APK et regarder l’effet réel.

Pour `askStatus()`, les modes connus ne forment pas encore un catalogue complet. À relever en passant d’un widget à une image, un GIF, du texte ou du dessin.

# Les autres commandes encore floues

## setImageMode

0 et 1 servent à désactiver/activer le mode standard. Les valeurs 2 et 3 sont évoquées dans le code, sans effet établi. Les autres valeurs acceptées par le SDK ne sont pas forcément valides sur l’appareil. Regarder les transitions et les commandes qui doivent précéder le dessin.

## setTimeIndicator / readScreenLight

`setTimeIndicator()` est décrit comme le clignotement du séparateur d’horloge, mais son effet selon le style et le firmware reste à vérifier.

Pour `readScreenLight()`, il faut confirmer si on lit bien un délai de veille, son unité et le sens de `0xFF`. Le plus utile serait de changer ce réglage dans l’application et de comparer les notifications `0F 80`.

## sendJoint

Pas encore clair si la valeur décrit une position dans un assemblage, une transition ou un autre réglage. Il faut retrouver l’écran correspondant dans l’application, puis essayer avec plusieurs panneaux.

## deleteDeviceData

La commande est présentée comme un reset, mais l’étendue de l’effacement reste à vérifier : médias, réglages, PIN, appairage ? Est-ce qu’elle redémarre systématiquement l’écran, et quelle réponse précède la coupure ?

## setEcoMode / flipScreen / setEffect

Pour le mode éco, regarder une plage traversant minuit, des horaires identiques et l’interaction avec la veille ou un écran déjà éteint.

Pour `flipScreen()`, une mire asymétrique permettrait de distinguer rotation et miroir, et de voir si tous les widgets et médias réagissent pareil.

Pour les effets, il manque une correspondance visuelle des styles, palettes et vitesses selon le firmware. Les bornes du SDK ne suffisent pas à établir celles du matériel.

# Mot de passe

Le PIN est transmis par groupes de deux chiffres décimaux : `"123456"` devient `12, 34, 56`. Il reste à essayer les zéros initiaux, la modification d’un PIN existant, sa suppression et le comportement après reconnexion ou extinction.

Quelles commandes sont réellement bloquées avant authentification ? Combien d’essais sont permis, et comment récupérer un appareil verrouillé ? Les réponses doivent être distinguées de celles du dessin sur `05 02`.

`passwordRequired` est seulement un événement. Le SDK n’attend pas automatiquement une authentification réussie avant d’autoriser les autres appels.

# Bluetooth

`fragmentSize=20` est une taille d’écriture choisie, pas un MTU mesuré. Les adapters fournis ne connaissent pas le MTU ATT réel. Il reste à mesurer les tailles acceptées et les délais utiles entre fragments, sans envoyer de commandes de test inconnues à l’écran.

Si `FA03` manque, l’adapter prend l’unique caractéristique notify/indicate du service attendu. Il faut vérifier ce cas sur un appareil identifié. Même incertitude sur le repli de `writeValueWithoutResponse()` vers `writeValue()` : l’écriture GATT réussie ne confirme ni le traitement applicatif ni le même débit.

Tester les coupures pendant la découverte des caractéristiques, le démarrage des notifications, une écriture et l’attente d’ACK. La file du SDK ne protège pas tous les appels directs concurrents aux adapters. Après reconnexion, faut-il redemander l’état et réappliquer des réglages ?

Le scan Node demande aussi des essais : annulation, premier résultat, noms identiques et erreurs du fournisseur. Certaines erreurs sont absorbées et peuvent ressembler à une absence d’appareil. Il manque enfin des retours reproductibles par navigateur, OS et environnement Node, avec les permissions et dépendances natives utilisées.

# Rythme et microphone

Dans `sendCustomRythm()`, l’en-tête annonce `0x21`, soit 33 octets, mais le tableau construit en contient 21 :

```text
4 octets d’en-tête + 1 style + 16 octets de hauteurs = 21
```

Il faut comparer avec l’APK et une capture avant de décider si la longueur annoncée ou le contenu manque quelque chose.

Les 32 hauteurs sont compactées deux par octet. Le sens des nibbles, le nombre de colonnes sur chaque panneau, les styles, les frames matérielles et l’arrêt `(0, 0)` restent à vérifier. Même chose pour la commande microphone désormais encodée sur cinq octets.

`sendRythmSimulation()` produit une onde synthétique à partir d’une intensité ; ce n’est pas une analyse audio. Le lien exact avec les modes de l’application reste à documenter.

Côté SDK, les appels rythmiques ne permettent pas vraiment d’attendre l’écriture, y compris via `stopMusicRythm()`. La file ne conserve que la dernière frame en attente. Il faut mesurer ce qui se passe quand un upload long occupe déjà la liaison et clarifier la remontée des erreurs.

# Compte à rebours et chronomètre

Les raccourcis `countdown` ne retournent pas la Promise de `setCountdown()`. On ne peut donc pas attendre leur écriture ou récupérer directement son erreur.

`stop()` et `reset()` envoient le mode 1, également utilisé pour démarrer. À vérifier avec l’écran. La pause transforme une échéance en durée restante dans le même champ, puis la reprise réutilise ce champ sans vérifier l’état. Essayer pause/reprise répétées, reprise sans pause et déconnexion pendant le compte à rebours.

Le timer JavaScript donne un état local, pas une lecture du compteur matériel. Les transitions du chronomètre et leur conservation après coupure demandent aussi une vérification sur appareil.

# Encore du travail côté SDK

Les commandes simples peuvent convertir implicitement en octets des nombres non entiers, `NaN`, des valeurs absentes ou des dates invalides. Il faudrait rendre ces validations cohérentes.

Il reste à faire le ménage dans les helpers CRC/conversion après l’extraction de `frames.js`, et dans les commentaires ou types de retour qui décrivent encore un ancien comportement.

Il manque aussi une fin de vie explicite de l’instance : détacher ses callbacks BLE et événements, arrêter ses timers, vérifier le partage d’un adapter entre plusieurs instances.

# Essais à garder avec les notes

Les vérifications sur adapters simulés ne remplacent pas les essais physiques. Il reste à couvrir 16×16, 16×32, 32×32 et 64×64, en notant la version MCU et les différences de firmware.

Pour chaque essai, garder le modèle, le descripteur brut, l’environnement BLE, les octets envoyés et reçus avec leur chronologie, puis ce qui apparaît réellement sur l’écran. Si le sujet concerne le stockage, refaire après reconnexion et extinction.

Ces ajouts viennent de la lecture du SDK et des notes existantes ; aucune nouvelle capture matérielle ou décompilation n’a été faite ici. Pour lever un doute, il faudra rattacher l’observation à une version d’APK ou de firmware précise, puis ajouter le cas de référence au code et à la documentation.
