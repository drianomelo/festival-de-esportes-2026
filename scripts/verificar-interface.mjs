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
assert(byId('upcoming-panel').innerHTML.includes('Mestre da Sacada A'), 'Jogo feminino não apareceu na programação do vôlei.');
assert(byId('upcoming-panel').innerHTML.includes('Looney') && byId('upcoming-panel').innerHTML.includes('Carcará Vôlei'), 'Jogos masculinos não apareceram na programação do vôlei.');
assert(byId('upcoming-panel').innerHTML.includes('20:00') && byId('upcoming-panel').innerHTML.includes('21:00'), 'Horários do vôlei não apareceram.');
assert(byId('upcoming-panel').innerHTML.includes('Sexta-feira, 09/10 · 3 jogos'), 'Resumo da programação do vôlei não apareceu.');
assert(byId('match-list').innerHTML.includes('Ainda não há resultados'), 'Estado inicial dos resultados não apareceu.');
assert(byId('update-notice').textContent.includes('9 de outubro de 2026 às 13:46'), 'Aviso de atualização não apareceu.');
assert(data.esportes.every((sport) => sport.partidas.length === 3 && sport.partidas.every((match) => match.status === 'agendada')), 'A programação deve ter três jogos agendados por modalidade.');
assert(data.esportes.every((sport) => sport.partidas.every((match) => match.local === 'Praça da Juventude')), 'Todos os jogos devem ocorrer na Praça da Juventude.');
assert(byId('team-list').innerHTML.includes('Lonney Tunes') && byId('team-list').innerHTML.includes('Carcará Glória'), 'Os times do vôlei masculino não apareceram.');
assert(byId('team-stats').innerHTML.includes('Grupo Único'), 'Classificação do vôlei masculino não apareceu.');
vm.runInContext("state.category = 'feminino'; render()", context);
assert(byId('team-list').innerHTML.includes('Mestre da Sacada A') && byId('team-list').innerHTML.includes('Elenco ainda não divulgado'), 'Equipes femininas sem elenco não apareceram.');
assert(byId('team-list').innerHTML.includes('Volei gloria B') && byId('team-list').innerHTML.includes('Grupo A') && byId('team-list').innerHTML.includes('Grupo B'), 'Equipes ou grupos femininos não apareceram.');
assert(byId('team-stats').innerHTML.includes('Grupo A') && byId('team-stats').innerHTML.includes('Grupo B'), 'Classificação dos grupos femininos não apareceu.');
assert(byId('upcoming-panel').innerHTML.includes('Looney'), 'Filtro de categoria ocultou jogos da programação geral do vôlei.');
vm.runInContext("state.sportId = 'basquete'; state.category = 'masculino'; render()", context);
assert(byId('team-list').innerHTML.includes('Time Guilherme') && byId('team-list').innerHTML.includes('Time Izael'), 'Os times do basquete não apareceram.');
assert(byId('team-stats').innerHTML.includes('Grupo Único'), 'Classificação do basquete não apareceu.');
assert(data.esportes.every((sport) => sport.partidas.every((match) => match.fase === 'grupos')), 'Os jogos informados devem contar na classificação dos grupos.');
assert(byId('upcoming-panel').innerHTML.includes('Time Kauan') && byId('upcoming-panel').innerHTML.includes('R4'), 'Rodada ou equipe do basquete não apareceu.');
assert(byId('upcoming-panel').innerHTML.includes('19:00') && byId('upcoming-panel').innerHTML.includes('19:40'), 'Horários do basquete não apareceram.');
vm.runInContext("state.sportId = 'volei'; state.category = 'feminino'; render()", context);

const volley = data.esportes.find((sport) => sport.id === 'volei');
Object.assign(volley.partidas[0], { status: 'ao_vivo', periodos: [{ nome: '1º set', mandante: 12, visitante: 9 }] });
vm.runInContext('render()', context);
assert(byId('match-list').innerHTML.includes('Ao vivo') && byId('match-detail').innerHTML.includes('12 : 9'), 'Placar ao vivo não apareceu.');
assert(!byId('upcoming-panel').innerHTML.includes('Mestre da Sacada A'), 'Jogo ao vivo continuou nos próximos jogos.');
Object.assign(volley.partidas[0], { status: 'encerrada', periodos: [{ nome: '1º set', mandante: 25, visitante: 19 }] });
vm.runInContext('render()', context);
assert(!byId('upcoming-panel').innerHTML.includes('Mestre da Sacada A'), 'Jogo encerrado continuou nos próximos jogos.');
assert(byId('match-list').innerHTML.includes('Mestre da Sacada A'), 'Jogo encerrado não apareceu nos resultados.');

console.log('Seis jogos, horários, elencos e transição para resultados conferidos.');
