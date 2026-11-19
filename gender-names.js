// gender-names.js — endevina si un nom de pila és de noi o de noia (català, castellà i noms habituals a les aules).
// Retorna 'noi', 'noia' o null (si no ho sap: el formulari deixa la tria com estava).
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const NOIS = `adria adrian adria aaron abdel abdellah abdul abraham adam ahmed aitor alan albert alberto alejandro alex alexandre alfons alfonso alfred alfredo alonso aleix alessandro amadeu andreu andres angel angelo anselm anton antoni antonio arnau arnald artur arturo aron arnaud asier bartomeu bartolome benet benjamin bernat biel blai boris bruno carles carlos cesar christian cristian cristofol cristobal damia daniel dani dario david davide denis diego domenec dylan edgar eduard eduardo eloi eric erik ernest esteve eugeni eusebi fabian fabio felip felipe feliu ferran fernando francesc francisco franc gabriel gerard gerardo german gil gonzalo guillem guillermo gustau hamza hector hugo humbert ian ibai ignasi ignacio ilyas isaac isaias ismael ivan izan jaime jaume javier jan jesus joan joaquim joel jofre jonathan jordi jorge jose josep josue juan julian julio kevin lamine leandre leo leonardo lluc lluis lucas luis luka manel manuel marc marcel marcos mario martin marti mateo mateu matias max maxim miguel miquel mohamed mohammed muhammad nacho nasser nelson nestor nil noah nol nuno oriol oscar oleguer omar pablo pau paulino pedro pere pol pablo quim quimet rafael rafel ramon raul raimon ricard ricardo roc rodrigo roger roman ruben ruy salvador samuel santi santiago saul sebastia sergi sergio shaun simon stefan sylvain tadeu teo thiago thomas tiago tito toni tomas tomeu uriel valentin vicenc vicent victor xavier xavi yassin yeray youssef yusuf zacaries zaid luca nicolau nicolas andrei bogdan florin gheorghe marius mihai razvan stefan vlad adil ali amir bilal hassan hicham ilias karim khalid mehdi mustapha nabil rachid reda saad said samir tarik yahya yassir zakaria wei jun ming li chen hao bernabe baltasar cebria cosme damian emili emilio enric enrique ezequiel fidel genis gregori gregorio guifre hilari ivo lleonard llorenc lorenzo magi marian mauro maurici mauricio melcior moises narcis nicasi nolasc octavi oliver orland pasqual patrici patricio pelai placid primitiu quintí quirze reinald robert roberto rosend ruperto sadurni sever severo silvestre silvio telm teodor tomàs valeri vidal wifred zenon`.split(/\s+/);

const NOIES = `abril adela adelina adriana africa agata agnes agustina aida aina ainara ainhoa aitana alba alejandra alena alessandra alexandra alicia alina alis alma almudena amanda amaia amalia amelia amparo ana anabel anaïs anais andrea angela angels angelina anna annabel anne antonia aran arantxa ariadna arlet arlette astrid atenea aurora ayla ariana azahara barbara beatriu beatriz begonya belen berta bianca blanca bruna camila candela carla carlota carme carmen carolina cataleya catalina caterina cecilia celia celeste chantal clara clàudia claudia clotilde concepcio concha consol constança cristina dafne dalia dana daniela dànae daria dayana delia desiree diana dolors dolores donya duna edurne elena elisa elisabet elisenda elna eloisa elsa emma ester estefania estel estela eugenia eva evelyn fabiola fatima fatiha fiona flavia flor francesca gabriela gala gemma georgina gisela gloria graciela greta guadalupe helena hortensia iaia ida imma ines irene iris irina isabel isabela isidora ivet iva jana janira jasmina jenifer jennifer jessica joana joaquima jordina josefa josefina judit julia julieta juliana june karen karina katia katherine kenza khadija laia lara laura laia lea leire leyre lia lidia lila liliana lilian lina lisa lluisa lola lorena lourdes lucia lucía luisa luna lydia mabel magdalena maia maite malak malika mara marcela margalida margarida margarita maria mariam marina mariona marta martina maryam mathilde matilde maya mayte meritxell merce mercedes mia mireia miriam mirta moira moni monica montserrat montse muriel nadia nadine nahia naiara nara natalia natalie nayara nerea nieves nina nora noelia noemi nuria olalla olga olivia oriana orsola paloma pamela paola patricia paula penelope pepa pilar queralt rachel raquel rebeca regina reyes rita roser rosa rosalia rosario rosina rosalina ruth sabina salma salome samanta sandra sara sarai selena serena silvia simona sofia sol sonia sonya soraya stella susana susanna tamara tania tatiana teresa thais tona tecla triana trinitat uxue valentina valeria vanesa vanessa vera veronica victoria violeta virginia vivian wendy xenia xenya yaiza yasmina yasmin yolanda zaida zahra zoe zulema aya amira fatoumata aicha amina hanane hafsa houda imane ikram jamila latifa leila loubna meryem naima noura nour rajae rania safia salima samira sanaa soukaina yasmine zineb ioana ruxandra mihaela andreea mei lin yan xia ying jing` .split(/\s+/);

// Noms acabats en -a que són de noi, i viceversa (excepcions a la regla de la terminació)
const NOI_EN_A = new Set(['luca', 'nicola', 'josua', 'bernabe', 'andrea_es', 'mica', 'ilia', 'kalifa', 'jota', 'musa', 'issa', 'baba', 'moussa', 'hamdi']);
const NOIA_NO_A = new Set(['mar', 'montserrat', 'carmen', 'pilar', 'nuria', 'raquel', 'ester', 'isabel', 'rut', 'ruth', 'beatriz', 'beatriu', 'dolors', 'mercedes', 'rocio', 'sol', 'luz', 'nil_', 'noor', 'nour', 'iris', 'ines', 'maite', 'blanca', 'roser', 'meritxell', 'queralt', 'carmeta', 'lourdes', 'consol', 'neus', 'nieves', 'ainhoa', 'irene', 'judit', 'edurne', 'leire', 'leyre', 'amel']);

const SET_NOI = new Set(NOIS.map(norm));
const SET_NOIA = new Set(NOIES.map(norm));
// Noms que s'usen per als dos gèneres: no s'endevina (l'usuari ho tria)
const AMBIGUS = new Set(['alex', 'sasha', 'ariel', 'nil', 'pau', 'jordan', 'noa', 'nicola', 'claudi', 'cris', 'ale', 'dani', 'yan', 'jun', 'li', 'wei']);
// A les aules aquests són majoritàriament de noia
const MAJORIA_NOIA = new Set(['julia', 'andrea', 'ona', 'mar']);

export function guessGender(firstName) {
  const n = norm((firstName || '').split(/\s+/)[0]);
  if (n.length < 2) return null;
  if (MAJORIA_NOIA.has(n)) return 'noia';
  if (AMBIGUS.has(n)) return null;
  const inNoi = SET_NOI.has(n), inNoia = SET_NOIA.has(n);
  if (inNoi !== inNoia) return inNoi ? 'noi' : 'noia';
  if (inNoi && inNoia) return null;
  // Regla per terminació (menys fiable)
  if (NOI_EN_A.has(n)) return 'noi';
  if (NOIA_NO_A.has(n)) return 'noia';
  if (n.length > 2 && n.endsWith('a')) return 'noia';
  if (n.length > 2 && /[ou]$/.test(n)) return 'noi';
  return null;
}
