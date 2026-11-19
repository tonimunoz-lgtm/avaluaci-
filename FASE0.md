# Fase 0 — Contenció de seguretat

## Què canvia
| Fitxer | Canvi |
| --- | --- |
| `firestore.rules` (nou) | **Etapa 1.** Ningú no es pot fer admin ni treure's `suspended`/`deleted`; els comptes suspesos/eliminats queden bloquejats a les dades; les plantilles ja no es poden enumerar i els membres/convidats només poden tocar membres/invitacions. |
| `firestore.stage2.rules` (nou) | **Etapa 2.** A més, `classes`, `alumnes` i `activitats` només són del seu `ownerUid` (o d'un admin). |
| `api/tutoria.js` | Exigeix token de Firebase, comprova que el compte no és suspès/eliminat, CORS només per `ALLOWED_ORIGINS`, prompt ≤ 8.000 caràcters, 20 peticions/10 min per usuari. |
| `tutoria.js`, `tutoria-comentaris.js`, `ultracomentator.js` | Envien el token a `/api/tutoria` i mostren l'error real. Invitacions: si no es pot cercar el professor per email, queda invitació pendent. |
| `app.js`, `classroom.js`, `terms.js`, `competencial.js`, `competencial-config.js` | Tot document nou porta `ownerUid`; les consultes d'activitats competencials filtren per `ownerUid`. |
| `scripts/backfill-owner.js` (nou) | Assigna `ownerUid` als documents existents (simulació per defecte). |
| `rules-tests/` (nou) | Proves per a l'emulador de Firestore (no executades encara, vegeu avall). |
| `functions/` (eliminat) | Credencials de mostra i funció que no es cridava enlloc. |

## Ordre de desplegament
0. **Còpia de seguretat** de Firestore (Console → Import/Export, o `gcloud firestore export gs://<bucket>/backup-AAAA-MM-DD --project gestornotes-cc6d0`).
1. **Revisa qui és admin ara**: amb les regles antigues qualsevol usuari es podia posar `isAdmin: true`. A Firestore → `professors`, comprova que només són admin els que ho han de ser (i que cap `suspended`/`deleted` ha estat tocat).
2. Desplega **l'app i `api/`** junts (l'API ja exigeix token). A Vercel: `GROQ_API_KEY` ja hi és; opcional `ALLOWED_ORIGINS=https://el-teu-domini` només si el front es serveix des d'un altre origen que l'API.
3. Publica **`firestore.rules`** (Console → Firestore → Rules, o `firebase deploy --only firestore:rules`).
4. Prova ràpida amb un usuari normal: entrar, obrir classe, posar una nota, generar un comentari amb IA, importar un CSV, crear una activitat competencial.
5. `cd scripts && npm i firebase-admin`, `export GOOGLE_APPLICATION_CREDENTIALS=<clau-de-servei.json>`, `node backfill-owner.js` (simulació). Revisa conflictes i recomptes; després `node backfill-owner.js --apply`. Opcional: `--report-orphans`.
6. Publica **`firestore.stage2.rules`** i repeteix la prova del punt 4. **Reversió**: torna a publicar l'etapa 1 des de l'historial de Rules.

## Fora del codi (Google Cloud / Firebase Console)
- *APIs & Services → Credentials*: restringeix la clau d'API web per **HTTP referrers** (el teu domini, `*.firebaseapp.com`, `localhost` per a proves).
- Activa **App Check** (reCAPTCHA v3) en mode "monitoritza" i, quan hi hagi dades, en mode "fes complir".

## Limitacions conegudes
- **Les regles no s'han pogut executar a l'emulador** en l'entorn on s'han escrit (no es podia baixar el jar). Executa `rules-tests` abans de publicar: `cd rules-tests && npm i && npm run test:stage1` i `npm run test:stage2`.
- Etapa 1 deixa `alumnes` i `activitats` oberts a qualsevol usuari actiu; el forat es tanca amb l'etapa 2.
- Pestanyes obertes amb l'app antiga no posaran `ownerUid`: amb l'etapa 2 hauran de recarregar.
- El límit de peticions de l'API és en memòria per instància (és un fre, no una garantia).
- Cercar un professor per email ja no és possible (abans només funcionava per a admins): les invitacions queden pendents fins que l'invitat entra. Treure un membre ja acceptat des de la UI no pot esborrar el seu uid.
- `Function()` de fórmules, XSS, sessions suspeses al client i Gmail segueixen a la fase 1/3.
