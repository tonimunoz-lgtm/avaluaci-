# Fase 8 — Comentaris per grup d'avaluació i ajustos

## Fitxers a substituir
index.html, style.css, app.js, vistes.js, tutoria.js, tutoria-comentaris.js, competencial-config.js,
classroom-ui.js, auto-recalc.js, administrador.js, administrador.css, sw.js  +  nou `img/classroom.png`

## Comentaris per grup d'avaluació (trimestre)
- Nou camp a Firestore: `alumnes/{id}.comentarisTrim.{classId}.{termId}`. El comentari antic
  (`comentarios.{classId}`) es mostra com a comentari del PRIMER grup de la classe (no es perd res).
- «Moment d'avaluació» dels dos generadors d'IA = els grups creats a la classe (si en té un, només n'hi surt un).
- El generador del botó «Comentaris» ara té «Desar com a comentari de l'alumne»: tria l'alumne (es preselecciona pel nom)
  i es desa al grup triat al formulari.
- El modal de comentaris indica el grup («Comentaris: Nom · 1r Trimestre»); la graella mostra el del grup actiu;
  la pestanya Comentaris té selector de grup; Resum i Informes també filtren per grup.
- «Comentaris pendents» (resum i campana) = alumnes sense comentari en cada grup amb activitats.
- Exportar comentaris a Excel exporta els del grup actiu.

## Altres
- Notes amb màxim 1 decimal (en desar, en mostrar i en recalcular fórmules). Pas de 0,1 als camps.
- Eliminat el botó «+ Alumne» (queda a «Alumnes ▾») i el ressalt d'«Afegir activitat».
- Icones noves (SVG) a Comentaris, Config Competencial, candaus, refrescar i Excel; Classroom amb el seu logo.
- Campana i menú de perfil ja no queden per darrere del contingut.
- Admin: les columnes Admin / Suspès / Eliminat mostren insígnies de color; filtres ben maquetats.
