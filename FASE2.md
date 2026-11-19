# Fase 2 — Neteja

## Eliminats
- `improvements.js` (460 línies): no es carregava a `index.html`, només es cachejava al `sw.js`.
- `pau.html`: pàgina d'una altra app, sense cap referència.
- `stylebueno`: còpia vella d'estils, no enllaçada.

## app.js (-~190 línies)
Funcions mortes: `getStudentRowById`, `markActivityAsCalculated`, `removeActivity`, `updateCalculatedCells`, `applyRounding`, `computeStudentAverageText`.
Bloc `exportExcel` comentat (i havia dues funcions amb el mateix nom; queda la que funciona).
Bloc duplicat `attachGlobalStudentsMenuOption`.

## Globals
`window.loadClassData`, `window.renderNotesGrid` i `window.applyCellColor` ara s'assignen (competencial.js, tutoria-comentaris.js i auto-recalc.js ja els cridaven però no existien).
⚠ Efecte visible: després de desar competències, la classe es recarrega (era la intenció original).

## sw.js
Eliminada la referència a improvements.js.

## No verificat
Només `node --check`; prova obrir classe, exportar, mode "Enviar notes".
