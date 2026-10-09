import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const data = JSON.parse(readFileSync(new URL('../data/resultados.json', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const elements = new Map();
const makeElement = (dataset = {}) => ({
  dataset,
  innerHTML: '',
  textContent: '',
  hidden: false,
  tabIndex: 0,
  classList: { toggle() {} },
  addEventListener() {},
  setAttribute() {},
  querySelectorAll() { return []; },
  focus() {},
});
const byId = (id) => {
  if (!elements.has(id)) elements.set(id, makeElement());
  return elements.get(id);
};
const sportTabs = [makeElement({ sport: 'volei' }), makeElement({ sport: 'basquete' })];
const categoryTabs = [makeElement({ category: 'feminino' }), makeElement({ category: 'masculino' })];
const document = {
  getElementById: byId,
  querySelectorAll(selector) { return selector === '.sport-tab' ? sportTabs : selector === '.category-tab' ? categoryTabs : []; },
  querySelector: () => makeElement(),
};
const context = vm.createContext({ document, fetch: async () => ({ ok: true, json: async () => data }), console });
vm.runInContext(source, context);
await new Promise((resolve) => setImmediate(resolve));

const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(byId('team-stats').innerHTML.includes('Grupo A'), 'Classificação do vôlei feminino não apareceu.');
assert(byId('athlete-stats').innerHTML.includes('Ana Souza'), 'Estatísticas do vôlei feminino não apareceram.');
assert(byId('athlete-stats').innerHTML.includes('Aces'), 'Métricas opcionais não apareceram.');
assert(byId('update-notice').textContent.includes('9 de outubro de 2026 às 13:20'), 'Aviso de atualização não apareceu.');

vm.runInContext("state.category = 'masculino'; state.matchId = null; render()", context);
assert(byId('team-stats').innerHTML.includes('Amarelo (exemplo)'), 'Classificação do vôlei masculino não apareceu.');
assert(!byId('athlete-stats').innerHTML.includes('Ana Souza'), 'Atleta do feminino apareceu no masculino.');

vm.runInContext("state.sportId = 'basquete'; state.category = 'masculino'; state.matchId = null; render()", context);
assert(byId('team-stats').innerHTML.includes('Grupo A') && byId('team-stats').innerHTML.includes('Grupo B'), 'Grupos do basquete não apareceram.');
assert(byId('athlete-stats').innerHTML.includes('Rebotes'), 'Estatísticas opcionais do basquete não apareceram.');
assert(byId('match-detail').innerHTML.includes('21<span>:</span>17'), 'Placar 3x3 não apareceu corretamente.');

console.log('Renderização das modalidades, grupos e atletas conferida.');
