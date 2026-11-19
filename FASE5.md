# Fase 5 — Qualitat i operació

## Canvis
- **Gmail** (`app.js`): el permís `gmail.send` ja no es demana a cada login, sinó en enviar; el token es renova en caducar i és independent del de Classroom (abans Classroom el sobreescrivia amb un token sense permís de Gmail). Assumpte codificat (accents), MIME correcte, protecció contra injecció de capçaleres i validació d'email. L'enviament en lot mostra un resum (enviats / fallits) en comptes d'un alert per alumne.
- **Avisos**: 110 `alert()` substituïts per `notify()` (toasts no bloquejants; vermells si són errors). Xarxa de seguretat global per a promeses rebutjades.
- **Tests i CI**: `tests/formula-engine.test.mjs` (6 tests, passen), `scripts/check-syntax.js`, `npm run ci`, workflow de GitHub Actions.
- **Operació**: `vercel.json` (capçaleres de seguretat, `sw.js` sense cache), `.gitignore`, `README.md`.

## No fet
- Tests de regles amb l'emulador i de la graella (no els vols / no es poden executar aquí).
- CSP estricta: requereix treure els CDN i els scripts inline (Vite, descartat).
- Logger centralitzat i informes d'errors externs (Sentry…): cal decidir servei.

## Nota
`alert` → `notify` és no bloquejant: allà on el codi seguia l'alert amb un canvi de pantalla, l'avís ja no atura l'execució. Revisa el flux de login/alta.
## No verificat
Tests i sintaxi OK. Gmail i toasts no provats en navegador.
