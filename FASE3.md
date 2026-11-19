# Fase 3 — Motor de fórmules

## Fitxers a pujar (només aquests)
`formula-engine.js` (NOU), `app.js`, `auto-recalc.js`, `index.html`, `sw.js`

## Canvis
- **`formula-engine.js`**: avaluador propi (parser) que substitueix `Function()`. Admet números, `+ - * / %`, parèntesis, menys unari, `__ACT__id` i `Math.round/floor/ceil/abs/min/max/pow/sqrt`. Qualsevol altra cosa dóna error en lloc d'executar codi (abans una fórmula podia executar JavaScript arbitrari).
- **Resultats no finits** (divisió per zero) ja no es desen com `Infinity`: s'omet aquell alumne.
- **Errors**: `evalFormulaAsync` ja no retorna 0 en silenci quan la fórmula és invàlida; llença error i es veu l'avís. Les fórmules antigues amb noms es converteixen a `__ACT__id` amb els noms llargs primer (abans "Examen" trencava "Examen final").
- **Previsualització**: `simulateFormulaWithExamples` tenia crides async que modificaven la fórmula després de retornar; ara avalua directament.
- **auto-recalc.js**: s'ha tret la sobreescriptura de `console.log`; ara escolta l'esdeveniment `classdata-updated` que dispara `app.js`. Recalcula també les fórmules que depenen d'altres fórmules, en ordre. Errors de desat visibles. Logs només amb `localStorage.autoRecalcDebug='1'`.
- `sw.js`: cache `avaluapp-v3-fase3` + nou fitxer.

## Comportament que NO canvia
Una nota buida compta com a 0 dins les fórmules (com abans).

## No verificat
Motor provat amb 12 casos a Node (inclosos intents d'injecció). Resta només `node --check`; prova crear una activitat calculada, canviar una nota i veure el recàlcul.
