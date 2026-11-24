# Etapa 2 de seguretat — cada professor només veu les seves dades

Ara mateix (etapa 1) qualsevol professor actiu pot llegir els alumnes i activitats de qualsevol altre.
L'etapa 2 ho tanca: cada document porta `ownerUid` i només el propietari (o un admin) hi accedeix.

## Ordre (important: no et saltis cap pas)

1. **Puja l'app (fase 59)** al repositori AvaluApp i deixa que Vercel la desplegui.
   Totes les creacions ja escriuen `ownerUid` (classes, alumnes, activitats, importació de Classroom,
   actualització de Classroom, còpia de períodes i restauració de còpies).
2. **Publica `firestore.rules`** (etapa 1 actualitzada): afegeix `admin_log` i permet a l'admin netejar còpies i accessos en esborrar un usuari.
3. **Assigna propietari a les dades existents** (des d'un ordinador teu, amb la clau de servei de Firebase):
   ```
   cd scripts
   npm i firebase-admin
   export GOOGLE_APPLICATION_CREDENTIALS=/ruta/clau-de-servei.json
   node backfill-owner.js                    # simulació: no escriu res; revisa el resum
   node backfill-owner.js --apply            # aplica
   node backfill-owner.js --report-orphans   # opcional: compta documents sense propietari
   ```
   És idempotent: pots repetir-lo. Si surt «ATENCIÓ … referenciats per més d'un professor», revisa-ho abans d'aplicar.
4. **Publica `firestore.stage2.rules`** (copia'n el contingut a Firebase → Firestore → Regles → Publica).
5. **Prova-ho** amb dos professors: cadascun ha de veure només les seves classes, i les teves classes han de continuar funcionant.

## Si alguna cosa va malament
Torna a publicar `firestore.rules` (etapa 1): tot torna a funcionar com ara. Les dades no es perden.

## Esborrat definitiu d'un usuari (Administració)
Esborra el perfil, les còpies, els accessos i les classes, alumnes i activitats **que són només seves**
(les classes compartides amb un altre professor no es toquen). Abans de confirmar, l'app mostra quantes coses s'esborraran.
Encara cal eliminar-ne el compte a Firebase → Authentication, i les plantilles d'Ultracomentator que hagi creat no s'esborren.
