# Fase 1 — Bugs que perden dades

## Fitxers nous
- `html-utils.js`: `esc()` (escapat HTML) i `aiGenerate()` (crida a la IA amb token; substitueix el nom de l'alumne per marcadors abans d'enviar-lo i el restaura a la resposta).

## Canvis
- **Login únic** (`app.js`): tot passa per `onAuthStateChanged → enterApp()`, que comprova suspès/eliminat. `logins` només s'escriu en login explícit (no a cada recàrrega).
- **Alumnes**: llista ordenada amb lectura en paral·lel; esborrat per ID (no per posició); un sol handler del mode eliminar (abans n'hi havia dos que duplicaven checkboxes).
- **Cascades**: esborrar classe → alumnes + activitats + classe + referència al professor; esborrar activitat → de tots els grups, `calculatedActivities`, notes i doc; esborrar grup → activitats, notes i càlculs.
- **Enganxar estructura** (`terms.js`): afegeix (ja no substitueix) i remapeja els `__ACT__id` de les fórmules i `calculatedActivities` cap a les noves activitats.
- **XSS**: `esc()` a app.js, tutoria*.js, ultracomentator.js, administrador.js.
- **Admin**: crear usuari amb app secundària (l'admin ja no perd la sessió), llista inclou usuaris sense `createdAt`, `appId` corregit, simulació d'enviament de correu eliminada, missatge d'"eliminat" corregit. `administrador-enhancements.js` ja pot accedir a `db`/`deleteUser` (bug que feia que "eliminar" no fes res).
- **Errors de desat** visibles (`saveNote` mostra un avís vermell).
- **sw.js**: ignora peticions no http(s)/no GET (error `chrome-extension`); cache `avaluapp-v2-fase1`.

## No verificat
Només `node --check` de sintaxi. No s'ha provat contra Firebase real: prova login, esborrar classe/activitat/alumnes, enganxar estructura i crear usuari des de l'admin.
