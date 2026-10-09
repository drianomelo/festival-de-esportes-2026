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
assert(byId('upcoming-panel').innerHTML.includes('Programação em breve'), 'Estado inicial dos próximos jogos não apareceu.');
assert(byId('match-list').innerHTML.includes('Ainda não há resultados'), 'Estado inicial dos resultados não apareceu.');
assert(byId('update-notice').textContent.includes('9 de outubro de 2026 às 13:31'), 'Aviso de atualização não apareceu.');
assert(data.esportes.every((sport) => sport.partidas.length === 0), 'O JSON publicado contém partidas não confirmadas.');
assert(byId('team-list').innerHTML.includes('Lonney Tunes') && byId('team-list').innerHTML.includes('Carcará Glória'), 'Os times do vôlei masculino não apareceram.');
vm.runInContext("state.category = 'feminino'; render()", context);
assert(byId('team-list').innerHTML.includes('elencos femininos'), 'O aviso genérico do vôlei feminino não apareceu.');
vm.runInContext("state.sportId = 'basquete'; state.category = 'masculino'; render()", context);
assert(byId('team-list').innerHTML.includes('Time Guilherme') && byId('team-list').innerHTML.includes('Time Izael'), 'Os times do basquete não apareceram.');
vm.runInContext("state.sportId = 'volei'; state.category = 'feminino'; render()", context);

const volley = data.esportes.find((sport) => sport.id === 'volei');
volley.times.push(
  { id: 'teste-azul', nome: 'Teste Azul', categoria: 'feminino', grupo: 'A', jogadores: [{ id: 'atleta-azul', nome: 'Atleta Azul' }] },
  { id: 'teste-verde', nome: 'Teste Verde', categoria: 'feminino', grupo: 'A', jogadores: [{ id: 'atleta-verde', nome: 'Atleta Verde' }] },
);
volley.partidas.push({ id: 'teste-jogo', categoria: 'feminino', fase: 'grupos', data: '2026-10-09', horario: '15:00', local: 'Ginásio Teste', status: 'agendada', mandante: 'teste-azul', visitante: 'teste-verde', periodos: [], pontosAtletas: [] });
vm.runInContext('render()', context);
assert(byId('upcoming-panel').innerHTML.includes('Teste Azul') && byId('upcoming-panel').innerHTML.includes('Ginásio Teste'), 'Jogo agendado não apareceu na tabela.');
assert(byId('match-list').innerHTML.includes('Ainda não há resultados'), 'Jogo agendado apareceu entre os resultados.');

Object.assign(volley.partidas[0], { status: 'encerrada', periodos: [{ nome: '1º set', mandante: 25, visitante: 19 }], pontosClassificacao: { mandante: 3, visitante: 0 }, pontosAtletas: [{ atletaId: 'atleta-azul', pontos: 8 }] });
vm.runInContext('render()', context);
assert(byId('upcoming-panel').innerHTML.includes('Programação em breve'), 'Jogo encerrado continuou nos próximos jogos.');
assert(byId('match-list').innerHTML.includes('Teste Azul'), 'Jogo encerrado não apareceu nos resultados.');
assert(byId('athlete-stats').innerHTML.includes('Atleta Azul'), 'Pontuação individual não apareceu.');

vm.runInContext("state.sportId = 'basquete'; state.category = 'masculino'; state.matchId = null; render()", context);
assert(byId('upcoming-panel').innerHTML.includes('Programação em breve'), 'Estado vazio do basquete não apareceu.');

console.log('Elencos, estados vazios, próximos jogos e resultados conferidos.');
