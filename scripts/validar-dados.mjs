import { readFileSync } from 'node:fs';

const errors = [];
let data;

try {
  data = JSON.parse(readFileSync(new URL('../data/resultados.json', import.meta.url), 'utf8'));
} catch (error) {
  console.error(`Não foi possível ler data/resultados.json: ${error.message}`);
  process.exit(1);
}

const isPoints = (value) => Number.isInteger(value) && value >= 0;
const fail = (message) => errors.push(message);

if (typeof data.atualizadoEm !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(data.atualizadoEm) || Number.isNaN(new Date(data.atualizadoEm).getTime())) fail('atualizadoEm precisa ter data, hora e fuso, por exemplo 2026-10-09T13:20:00-03:00.');
if (!Array.isArray(data.esportes)) fail('A raiz precisa conter uma lista "esportes".');

for (const sport of Array.isArray(data.esportes) ? data.esportes : []) {
  const label = sport.nome || sport.id || 'Esporte sem nome';
  const teams = Array.isArray(sport.times) ? sport.times : [];
  const matches = Array.isArray(sport.partidas) ? sport.partidas : [];
  const teamIds = new Set();
  const playerIds = new Set();

  for (const team of teams) {
    if (!team.id || teamIds.has(team.id)) fail(`${label}: equipe com ID ausente ou duplicado (${team.id || 'vazio'}).`);
    teamIds.add(team.id);
    if (!['feminino', 'masculino'].includes(team.categoria)) fail(`${label}: categoria inválida na equipe ${team.id}.`);
    if (team.nomeTabela != null && (typeof team.nomeTabela !== 'string' || !team.nomeTabela.trim())) fail(`${label}: nomeTabela inválido na equipe ${team.id}.`);
    if (team.grupo != null && (typeof team.grupo !== 'string' || !team.grupo.trim())) fail(`${label}: o grupo da equipe ${team.id} deve ser um nome não vazio quando informado.`);
    if (sport.id === 'basquete' && team.categoria !== 'masculino') fail(`${label}: o basquete 3x3 deve ser masculino.`);
    if (!Array.isArray(team.jogadores)) { fail(`${label}: a equipe ${team.id} precisa de uma lista de jogadores.`); continue; }
    for (const player of team.jogadores) {
      if (!player.id || playerIds.has(player.id)) fail(`${label}: atleta com ID ausente ou duplicado (${player.id || 'vazio'}).`);
      playerIds.add(player.id);
      if (!player.nome) fail(`${label}: atleta ${player.id} está sem nome.`);
    }
  }

  const matchIds = new Set();
  for (const match of matches) {
    const name = `${label} / ${match.id || 'partida sem ID'}`;
    if (!match.id || matchIds.has(match.id)) fail(`${name}: ID ausente ou duplicado.`);
    matchIds.add(match.id);
    const home = teams.find((team) => team.id === match.mandante);
    const away = teams.find((team) => team.id === match.visitante);
    if (!home || !away) fail(`${name}: mandante ou visitante não existe em times.`);
    if (home && away && (home.categoria !== match.categoria || away.categoria !== match.categoria)) fail(`${name}: a categoria da partida não coincide com as equipes.`);
    if (!['a_definir', 'grupos', 'eliminatoria'].includes(match.fase)) fail(`${name}: fase deve ser "a_definir", "grupos" ou "eliminatoria".`);
    if (match.numero != null && (!Number.isInteger(match.numero) || match.numero < 1)) fail(`${name}: numero deve ser um inteiro positivo.`);
    if (match.rodada != null && (typeof match.rodada !== 'string' || !match.rodada.trim())) fail(`${name}: rodada deve ser um texto não vazio.`);
    if (match.fase === 'grupos' && home && away && (!home.grupo || !away.grupo || home.grupo !== away.grupo)) fail(`${name}: as equipes de uma partida de grupos precisam ter o mesmo grupo definido.`);
    if (!['agendada', 'encerrada'].includes(match.status)) fail(`${name}: status deve ser "agendada" ou "encerrada".`);
    if (match.fase === 'grupos' && match.status === 'encerrada' && (!match.pontosClassificacao || !isPoints(match.pontosClassificacao.mandante) || !isPoints(match.pontosClassificacao.visitante))) fail(`${name}: informe os pontosClassificacao de mandante e visitante.`);
    if (!Array.isArray(match.periodos) || !Array.isArray(match.pontosAtletas)) { fail(`${name}: periodos e pontosAtletas precisam ser listas.`); continue; }
    if (match.status === 'encerrada' && match.periodos.length === 0) fail(`${name}: partida encerrada sem placar.`);
    if (sport.id === 'basquete' && match.status === 'encerrada' && match.periodos.length !== 1) fail(`${name}: basquete 3x3 usa um único período até 21 pontos.`);
    for (const period of match.periodos) {
      if (!isPoints(period.mandante) || !isPoints(period.visitante)) fail(`${name}: placar precisa ter números inteiros não negativos.`);
    }
    if (sport.id === 'basquete' && match.status === 'encerrada' && match.periodos.length === 1) {
      const period = match.periodos[0];
      if (Math.max(period.mandante, period.visitante) !== 21) fail(`${name}: o vencedor do basquete 3x3 deve ter 21 pontos.`);
    }
    const eligible = new Set([...(home?.jogadores || []), ...(away?.jogadores || [])].map((player) => player.id));
    const scored = new Set();
    for (const entry of match.pontosAtletas) {
      if (!eligible.has(entry.atletaId)) fail(`${name}: atleta ${entry.atletaId} não pertence à partida.`);
      if (scored.has(entry.atletaId)) fail(`${name}: atleta ${entry.atletaId} aparece duas vezes em pontosAtletas.`);
      scored.add(entry.atletaId);
      if (!isPoints(entry.pontos)) fail(`${name}: pontos de ${entry.atletaId} devem ser inteiros não negativos.`);
      if (entry.estatisticas && (typeof entry.estatisticas !== 'object' || Array.isArray(entry.estatisticas) || Object.values(entry.estatisticas).some((value) => !isPoints(value)))) fail(`${name}: estatisticas de ${entry.atletaId} devem ser um objeto de números inteiros não negativos.`);
    }
    if (sport.id === 'basquete' && match.status === 'encerrada' && home && away && match.periodos.length === 1) {
      for (const [team, score] of [[home, match.periodos[0].mandante], [away, match.periodos[0].visitante]]) {
        const ids = new Set(team.jogadores.map((player) => player.id));
        const sum = match.pontosAtletas.filter((entry) => ids.has(entry.atletaId)).reduce((total, entry) => total + entry.pontos, 0);
        if (sum !== score) fail(`${name}: soma dos atletas de ${team.nome} (${sum}) difere do placar (${score}).`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `• ${error}`).join('\n'));
  process.exit(1);
}

console.log('Dados válidos: equipes, categorias, partidas e pontuações conferidas.');
