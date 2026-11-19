# Fase 4A — Arquitectura segura (sense canviar les dades)

## Fitxers a pujar (només aquests)
`app.js`, `classroom.js`, `competencial.js`

## Canvis
- **API explícita** (`app.js`): `window.AvaluApp` (`getClassId`, `getClassData`, `getCalculatedActivities`, `getStudentIds`, `getActivityIds`) i esdeveniment `grid-rendered` quan acaba de pintar-se la graella. Els mòduls nous haurien d'usar això en lloc de MutationObserver/window.*.
- **competencial.js**: eliminat el `setInterval` de 500 ms (no s'aturava mai) i l'observer de bloquejos. Tot aquell bloc depenia de `window.currentClassId`, que ningú assignava: feia `return` immediat, per tant no feia res excepte consumir CPU.
- **Fórmules antigues amb noms** (`evalFormulaAsync`): el mapa nom→id es calcula una vegada i es comparteix (abans A lectures per cada alumne).
- **Importació de Classroom** (`classroom.js`):
  - Paginació real (abans es perdia tot el que passava de 100 alumnes/activitats/lliuraments).
  - Una nota de **0** ja no es converteix en "sense nota".
  - Notes escalades a **0–10** segons `maxPoints` (abans es guardaven els punts crus).
  - Lots de 400 (abans fallava amb >500 documents), una sola escriptura per alumne, lliuraments en paral·lel.
  - Si falla a mig camí s'esborra el que s'havia creat.
  - L'email ja no es desa com a "No disponible".

## NO fet (i per què)
- Vite/npm, subcol·leccions i script de migració: descartats a la teva elecció.
- Unificar `competencial.js` + `competencial-config.js` i treure els seus ~8 MutationObserver: depenen de `window.currentClassId` i `window.classActivities` (que ningú assigna), és a dir, part del seu codi és inert avui. Activar-lo canviaria el comportament sense poder provar-ho; cal una sessió amb l'app oberta. Queda per a una 4B.

## No verificat
Només `node --check`. Prova importar un curs de Classroom (idealment amb una nota 0 i activitats sobre 20 o 100 punts).
