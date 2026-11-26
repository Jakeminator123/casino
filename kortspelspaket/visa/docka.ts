// En docka ur avatar-pipelinen i paketets rörelser: standarddockans man eller kvinna (samma skelett som varje dealer
// pipelinen bygger, ../avatar-auto-pipeline/new_docka.md avsnitt 7) i stället för paketets egen figur vid bordet.
// Sidan (visa.ts) väljer figur med ?figur=man|kvinna och använder bara det som står här:
// - `figur()` lämnar en ny kopia av dockan för en plats vid bordet. Sidan ställer och skalar den precis som paketets
//   figur (bord.ts: skala 0,01 och en förskjutning i paketets ram), så kopians egen ram ska vara paketets: centimeter,
//   y upp, vänd mot plus z, och mitten där paketets ram har sin mitt.
// - `rorelse(clip)` räknar om en av paketets rörelser till ett klipp för dockans skelett. Klippet som kommer in är det
//   `fit` i visa.ts har gjort: ett quaternion-spår per led med paketets lednamn (Unreals standardskelett), och
//   `pelvis.position` i paketets ram (centimeter, z upp, under figurens rot som reser den till y upp).
import * as T from 'three';

export type Docka = {figur(): T.Object3D; rorelse(clip: T.AnimationClip): T.AnimationClip};

/** Läser dockan. `paket.figur` är paketets figur i vila (mallen sidan har läst), för dess skelett och vilställning. */
export async function laddaDocka(vilken: 'man' | 'kvinna', paket: {figur: T.Object3D}): Promise<Docka> {
  void vilken; void paket;
  throw Error('Dockan är inte inkopplad än.');
}
