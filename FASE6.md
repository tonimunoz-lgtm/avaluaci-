# Fase 6 — Nou disseny + canvis funcionals

## Fitxers a pujar (substitueixen els existents)
`index.html`, `style.css`, `app.js`, `html-utils.js`, `tutoria.js`, `tutoria-comentaris.js`,
`administrador.html`, `administrador.css`, `administrador.js`, `sw.js`

## Fitxers a ELIMINAR
`ultracomentator.js`

## Fitxers a crear (opcional, imatges — veure PROMPTS_IMATGES.md)
Carpeta `img/` amb: `logo.png`, `card-robot.png`, `card-book.png`, `card-flask.png`, `card-compass.png`, `card-chart.png`, `card-default.png`.
Si no hi són, la web funciona igual (es mostren icones/emojis).

## Canvis
- **Login**: «Gestor d'avaluació», només «Inicia sessió amb Google» (amb la G). Eliminats email/contrasenya, registre i «He oblidat la contrasenya» (i «Canviar contrasenya» del menú d'usuari).
- **Disseny** segons els mockups: barra lateral, benvinguda amb avatar de Google, targetes de classes amb degradat (vista targetes/llista, cercador, resum ràpid, cita), graella amb avatars d'inicials i colors per rang (≥9 verd, 7–8,9 verd clar, 5–6,9 groc, <5 vermell; abans els llindars eren 2,5/5/7), modals, generador de comentaris i panell d'administració.
- **Ordenar**: menú amb Nom A→Z / Z→A i Cognom A→Z / Z→A (accepta «Nom Cognom1 Cognom2» i «Cognoms, Nom»). L'ordre es desa a la classe (com abans).
- **Avisos propis**: `confirm()` i `prompt()` del navegador substituïts per diàlegs de l'app (`confirmDialog`/`promptDialog`); els `alert()` ja eren toasts.
- **Ultracomentator eliminat** (fitxer, botó i integració). La col·lecció `ultracomentator_plantilles` de Firestore queda com està (pots esborrar-la i treure el bloc corresponent de `firestore.rules`).
- **Botó «💬 Comentaris»** (abans «Tutoria»): obre el generador de comentaris amb IA.
- **Admin**: sense «Reset PW»; «Crear nou usuari» → «Fer admin per email» (els usuaris es creen sols amb el primer login amb Google).

## No fet / límits
- Els elements del mockup que no existeixen a l'app (Alumnes, Informes, Configuració, notificacions, pestanyes Notes/Comentaris/Resum, pesos %, columna Mitjana per alumne, «Comentaris nous») NO s'han inventat.
- Els usuaris que només tenien email/contrasenya poden entrar amb Google amb el mateix email (Firebase els enllaça al mateix compte si l'opció «una compte per email» és activa).
- No s'ha pogut provar en navegador: revisa login, targetes, graella, modals i admin.
