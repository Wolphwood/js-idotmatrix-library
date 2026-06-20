# sendImage

## "mode === 12"

Dans l'application ceci est le code qui créer ces deux octets :
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

le `timeSign` n'est défini qu'à deux endroit dans l'application :

dans `com.tech.matrix.ui.pattern.DeviceMaterialChildFragment` ligne 538 :
```java
AppData.getInstance().setTimeSign(deviceMaterialTime);
```

et la mention est faite dans `NewDeviceMaterialChildFragment` à la ligne 532 :
```java
r0.setTimeSign(r6)
```
Aucune idée de ce que c'est et ce que ça change