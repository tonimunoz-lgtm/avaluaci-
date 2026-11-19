# Fase 7 — Disseny fidel als mockups + alumnes dins la graella + Informes

## Fitxers (substitueixen o s'afegeixen)
`index.html`, `style.css`, `app.js`, `sw.js`, **nou** `vistes.js`, **nova** carpeta `img/` (SVG d'emergència:
`logo.svg`, `card-*.svg`, `quote-books.svg`). Si afegeixes PNG amb el mateix nom (`img/logo.png`, `img/card-robot.png`…),
s'usen en lloc dels SVG (vegeu PROMPTS_IMATGES.md; afegeix també `img/quote-books.png`).

## Novetats
- Disseny: barra lateral amb icones, targetes amb ona i il·lustració, resum ràpid, citació, campana, perfil, pestanyes
  Notes/Comentaris/Resum, cel·les de nota acolorides sencera, modal de comentaris amb capçalera degradada.
- **Alumnes dins la graella** (s'ha eliminat el panell lateral): per fila ⠿ arrossegar per reordenar, ⋮ Editar nom /
  Introduir email / Enviar notes / Eliminar. Botó «Alumnes ▾» (i ⋮ de la capçalera «Alumne»): Afegir alumne,
  Enviar notes (massiu), Eliminar alumnes (massiu).
- **Informes** (nou): KPI, histograma de mitjanes, aprovats/suspesos, resultats per activitat, alumnes en risc,
  millors resultats, comparativa entre classes, exportació CSV i impressió.
- **Alumnes** (nou): llistat global amb cerca. **Configuració**: pantalla «Pròximament».
- Pestanya **Comentaris** (llista per alumne, només pendents, editar) i **Resum** (informe de la classe).
- Filtre per activitat, selector d'ordre amb etiqueta, filtre/ordre de classes, Exportar i Imprimir a la classe.
- Campana: classes amb alumnes sense comentari.

## Pendent / no fet
- Pesos (%) i columna Mitjana (descartats). «Tancar classe», «Tots els criteris» i historial de comentaris
  per alumne (el model guarda un únic comentari per classe) no s'han fet.
