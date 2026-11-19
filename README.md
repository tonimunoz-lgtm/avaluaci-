# AvaluApp

Gestor de classes i avaluació per a docents. JavaScript vanilla (mòduls ES), Firebase (Auth + Firestore), Tailwind per CDN, desplegat a Vercel.

## Estructura
- `index.html` + `app.js`: pantalla de classes i graella de notes.
- `terms.js`: grups (termes) d'una classe. `formula-engine.js`: avaluador de fórmules (sense `eval`).
- `auto-recalc.js`: recàlcul automàtic de fórmules. `competencial*.js`: avaluació per competències.
- `tutoria*.js`, `ultracomentator.js`: comentaris amb IA (via `api/tutoria.js`).
- `classroom*.js`: importació des de Google Classroom. `administrador*`: panell d'administració.
- `html-utils.js`: `esc()` (escapat HTML), `notify()` (avisos), `aiGenerate()` (crida IA amb pseudonimització del nom).
- `firestore.rules` (etapa 1) i `firestore.stage2.rules` (amb propietari); `scripts/backfill-owner.js` per a la migració de `ownerUid`.

## Desenvolupament
```
npm run check   # sintaxi de tots els .js
npm test        # tests del motor de fórmules
npm run ci      # tots dos (el que executa GitHub Actions)
```
No cal instal·lar dependències. Servir els fitxers estàtics amb qualsevol servidor (`npx serve .`).

## Desplegament
- Vercel serveix els estàtics i `api/tutoria.js`. Variables d'entorn: `GROQ_API_KEY`, `ALLOWED_ORIGINS`.
- Firestore: publicar `firestore.rules` (veure `FASE0.md` per a l'ordre: etapa 1 → backfill → etapa 2).
- Al Google Cloud Console: restringir la clau d'API de Firebase per referrer HTTP i activar App Check.
- En canviar fitxers estàtics, incrementar `CACHE_NAME` a `sw.js`.

## Notes
- Gmail: el permís `gmail.send` es demana només en enviar notes; el token es renova sol.
- Errors no capturats es mostren com a avís i es registren a la consola.
