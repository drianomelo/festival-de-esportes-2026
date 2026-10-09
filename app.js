const DATA_URL = './data/resultados.json';

const state = { data: null, sportId: 'volei', category: 'masculino', matchId: null };
const el = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const dateText = (date) => {
  if (!date) return 'Data a definir';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
};
const scheduleDayText = (date) => {
  const parsed = new Date(`${date}T12:00:00-03:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const formatted = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', weekday: 'long', day: '2-digit', month: '2-digit' }).format(parsed);
  return formatted[0].toUpperCase() + formatted.slice(1);
};
const updatedText = (timestamp) => {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? 'Atualização não informada' : `Atualizado em ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsed)}`;
};
const currentSport = () => state.data?.esportes.find((sport) => sport.id === state.sportId);
const currentView = (sport) => ({ ...sport, times: sport.times.filter((team) => team.categoria === state.category), partidas: sport.partidas.filter((match) => match.categoria === state.category) });
const teamById = (sport, id) => sport.times.find((team) => team.id === id);
const matchResult = (sport, match) => {
  if (match.status !== 'encerrada') return null;
  const periods = Array.isArray(match.periodos) ? match.periodos : [];
  if (sport.id === 'volei') {
    return [periods.filter((period) => period.mandante > period.visitante).length, periods.filter((period) => period.visitante > period.mandante).length];
  }
  return [periods.reduce((sum, period) => sum + Number(period.mandante || 0), 0), periods.reduce((sum, period) => sum + Number(period.visitante || 0), 0)];
};
const scoreHtml = (result) => result ? `${result[0]}<span>:</span>${result[1]}` : '×';

function renderUpcoming(sport) {
  const fixtures = sport.partidas.filter((match) => match.status === 'agendada').sort((a, b) => `${a.data || ''} ${a.horario || ''}`.localeCompare(`${b.data || ''} ${b.horario || ''}`));
  const sameDay = fixtures.length > 0 && fixtures.every((match) => match.data === fixtures[0].data);
  const summary = fixtures.length ? `${sameDay ? `${scheduleDayText(fixtures[0].data)} · ` : ''}${fixtures.length} ${fixtures.length === 1 ? 'jogo' : 'jogos'}` : 'Nenhum jogo agendado';
  const detailHeading = sport.id === 'volei' ? 'Categoria' : 'Rodada';
  const rows = fixtures.map((match) => {
    const home = teamById(sport, match.mandante);
    const away = teamById(sport, match.visitante);
    const detail = sport.id === 'volei' ? (match.categoria === 'feminino' ? 'Feminino' : 'Masculino') : (match.rodada || '—');
    return `<tr><td>${escapeHtml(match.numero ?? '—')}</td><td>${escapeHtml(dateText(match.data))}</td><td>${escapeHtml(match.horario || 'A definir')}</td><th scope="row">${escapeHtml(home?.nomeTabela || home?.nome || 'Equipe a definir')} <span class="fixture-versus">×</span> ${escapeHtml(away?.nomeTabela || away?.nome || 'Equipe a definir')}</th><td>${escapeHtml(detail)}</td><td>${escapeHtml(match.local || 'A definir')}</td></tr>`;
  }).join('');
  el('upcoming-panel').innerHTML = `<p class="upcoming-summary">${escapeHtml(summary)}</p><div class="upcoming-table-wrap"><table class="upcoming-table" aria-label="Próximos jogos da modalidade selecionada"><thead><tr><th scope="col">Jogo</th><th scope="col">Data</th><th scope="col">Horário</th><th scope="col">Confronto</th><th scope="col">${detailHeading}</th><th scope="col">Local</th></tr></thead><tbody>${rows || '<tr><td class="empty-cell" colspan="6"><div class="upcoming-empty"><strong>Programação em breve.</strong><p>Os próximos confrontos aparecerão aqui assim que forem definidos.</p></div></td></tr>'}</tbody></table></div>`;
}

function renderMatchList(sport) {
  const matches = sport.partidas.filter((match) => match.status === 'encerrada').sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
  el('match-count').textContent = `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}`;
  el('match-list').innerHTML = matches.length ? matches.map((match) => {
    const home = teamById(sport, match.mandante);
    const away = teamById(sport, match.visitante);
    const result = matchResult(sport, match);
    return `<button class="match-row ${match.id === state.matchId ? 'is-selected' : ''}" type="button" data-match="${escapeHtml(match.id)}" aria-pressed="${match.id === state.matchId}">
      <span class="match-meta"><span>${escapeHtml(dateText(match.data))}${match.horario ? ` · ${escapeHtml(match.horario)}` : ''}</span><span class="match-status ${match.status !== 'encerrada' ? 'match-status--scheduled' : ''}">${match.status === 'encerrada' ? 'Encerrada' : 'Agendada'}</span></span>
      <span class="match-score"><strong>${escapeHtml(home?.nomeTabela || home?.nome || 'Equipe não encontrada')}</strong><span class="score-pill">${scoreHtml(result)}</span><strong>${escapeHtml(away?.nomeTabela || away?.nome || 'Equipe não encontrada')}</strong></span>
    </button>`;
  }).join('') : '<p class="match-empty">Ainda não há resultados. Os placares aparecerão após os primeiros jogos.</p>';
  el('match-list').querySelectorAll('[data-match]').forEach((button) => button.addEventListener('click', () => { state.matchId = button.dataset.match; render(); }));
}

function athleteScoreRows(team, match) {
  const points = new Map((match.pontosAtletas || []).map((item) => [item.atletaId, item.pontos]));
  const scorers = (team?.jogadores || []).filter((player) => points.has(player.id)).sort((a, b) => Number(points.get(b.id)) - Number(points.get(a.id)));
  return `<div><p class="athlete-team-name">${escapeHtml(team?.nome || 'Equipe')}</p>${scorers.length ? scorers.map((player) => `<div class="athlete-row"><span>${escapeHtml(player.nome)}</span><strong>${escapeHtml(points.get(player.id))}</strong></div>`).join('') : '<p class="no-score">Pontuação individual ainda não informada.</p>'}</div>`;
}

function renderMatchDetail(sport) {
  const match = sport.partidas.find((item) => item.id === state.matchId && item.status === 'encerrada');
  if (!match) { el('match-detail').innerHTML = '<div class="detail-empty">Selecione um jogo encerrado para ver o placar e a pontuação dos atletas.</div>'; return; }
  const home = teamById(sport, match.mandante);
  const away = teamById(sport, match.visitante);
  const result = matchResult(sport, match);
  const periods = Array.isArray(match.periodos) ? match.periodos : [];
  el('match-detail').innerHTML = `<div class="detail-top"><p class="detail-label">${match.status === 'encerrada' ? 'Resultado final' : 'Próxima partida'}</p><span class="detail-date">${escapeHtml(dateText(match.data))}${match.horario ? ` · ${escapeHtml(match.horario)}` : ''}<br>${escapeHtml(match.local || 'Local a definir')}</span></div>
    <div class="detail-scoreboard"><span class="detail-team">${escapeHtml(home?.nomeTabela || home?.nome || 'Equipe não encontrada')}</span><span class="detail-score">${scoreHtml(result)}</span><span class="detail-team">${escapeHtml(away?.nomeTabela || away?.nome || 'Equipe não encontrada')}</span></div>
    ${match.status === 'encerrada' ? `<div class="detail-divider"></div><h3 class="detail-subtitle">${sport.id === 'volei' ? 'Placar por set' : 'Placar do jogo'}</h3><div class="period-list">${periods.map((period) => `<div class="period-row"><span>${escapeHtml(period.nome)}</span><strong>${escapeHtml(period.mandante)} : ${escapeHtml(period.visitante)}</strong></div>`).join('') || '<p class="no-score">Placar ainda não informado.</p>'}</div><div class="detail-divider"></div><h3 class="detail-subtitle">Pontos por atleta</h3><div class="athlete-grid">${athleteScoreRows(home, match)}${athleteScoreRows(away, match)}</div>${sport.id === 'volei' ? '<p class="detail-note">No vôlei, a soma dos pontos individuais pode diferir do placar por conta de erros do adversário.</p>' : ''}` : '<div class="detail-divider"></div><p class="no-score">O placar e a pontuação dos atletas aparecerão aqui após o jogo. Para registrar o resultado, atualize o JSON e mude o status para “encerrada”.</p>'}`;
}

function renderStats(sport) {
  const completed = sport.partidas.filter((match) => match.status === 'encerrada');
  const groupMatches = completed.filter((match) => match.fase === 'grupos');
  const teamStats = sport.times.map((team) => {
    const stats = { team, games: 0, wins: 0, losses: 0, points: 0, for: 0, against: 0 };
    groupMatches.forEach((match) => {
      if (match.mandante !== team.id && match.visitante !== team.id) return;
      const home = match.mandante === team.id;
      const result = matchResult(sport, match);
      const own = home ? result[0] : result[1];
      const opponent = home ? result[1] : result[0];
      stats.games += 1;
      stats.wins += Number(own > opponent);
      stats.losses += Number(own < opponent);
      stats.points += Number(match.pontosClassificacao?.[home ? 'mandante' : 'visitante'] || 0);
      (match.periodos || []).forEach((period) => { stats.for += Number(home ? period.mandante : period.visitante); stats.against += Number(home ? period.visitante : period.mandante); });
    });
    return stats;
  });
  const groups = [...new Set(teamStats.map((stats) => stats.team.grupo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  el('team-stats').innerHTML = groups.length ? groups.map((group) => {
    const ranking = teamStats.filter((stats) => stats.team.grupo === group).sort((a, b) => b.points - a.points || b.wins - a.wins || (b.for - b.against) - (a.for - a.against) || a.team.nome.localeCompare(b.team.nome, 'pt-BR'));
    return `<div class="group-block"><h4>Grupo ${escapeHtml(group)}</h4><div class="stats-table-wrap"><table><thead><tr><th>Pos.</th><th>Equipe</th><th>J</th><th>V</th><th>D</th><th>Pts</th><th>Pró</th><th>Contra</th></tr></thead><tbody>${ranking.map((stats, index) => `<tr><td>${index + 1}º</td><th scope="row">${escapeHtml(stats.team.nome)}</th><td>${stats.games}</td><td>${stats.wins}</td><td>${stats.losses}</td><td class="ranking-points">${stats.points}</td><td>${stats.for}</td><td>${stats.against}</td></tr>`).join('')}</tbody></table></div></div>`;
  }).join('') : '<p class="stats-empty">A classificação aparecerá após a confirmação das equipes e dos grupos.</p>';

  const athletes = new Map();
  const metricNames = new Set();
  for (const team of sport.times) for (const player of team.jogadores) athletes.set(player.id, { player, team, games: 0, total: 0, best: 0, extra: {} });
  for (const match of completed) for (const entry of match.pontosAtletas || []) {
    const stats = athletes.get(entry.atletaId);
    if (!stats) continue;
    stats.games += 1;
    stats.total += Number(entry.pontos || 0);
    stats.best = Math.max(stats.best, Number(entry.pontos || 0));
    for (const [name, value] of Object.entries(entry.estatisticas || {})) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      metricNames.add(name);
      stats.extra[name] = (stats.extra[name] || 0) + value;
    }
  }
  const ranking = [...athletes.values()].filter((stats) => stats.games > 0).sort((a, b) => b.total - a.total || b.best - a.best || a.player.nome.localeCompare(b.player.nome, 'pt-BR'));
  const metricLabels = { aces: 'Aces', bloqueios: 'Bloqueios', rebotes: 'Rebotes', assistencias: 'Assistências' };
  const metrics = [...metricNames].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  el('athlete-stats').innerHTML = ranking.length ? `<table><thead><tr><th>Atleta</th><th>Equipe</th><th>Jogos com registro</th><th>Pontos</th><th>Média</th><th>Melhor jogo</th>${metrics.map((name) => `<th>${escapeHtml(metricLabels[name] || name.replaceAll('_', ' '))}</th>`).join('')}</tr></thead><tbody>${ranking.map((stats) => `<tr><th scope="row">${escapeHtml(stats.player.nome)}</th><td>${escapeHtml(stats.team.nome)}</td><td>${stats.games}</td><td class="ranking-points">${stats.total}</td><td>${(stats.total / stats.games).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td><td>${stats.best}</td>${metrics.map((name) => `<td>${stats.extra[name] ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="stats-empty">As estatísticas individuais aparecerão após o registro de pontos dos atletas nas partidas encerradas.</p>';
}

function renderTeams(sport) {
  el('team-count').textContent = sport.times.length ? `${sport.times.length} ${sport.times.length === 1 ? 'equipe' : 'equipes'}` : 'Equipes a definir';
  el('team-list').innerHTML = sport.times.length ? sport.times.map((team) => `<article class="team-card"><div class="team-card-head"><div><h3>${escapeHtml(team.nome)}</h3>${team.grupo ? `<p class="team-short-name">Grupo ${escapeHtml(team.grupo)}</p>` : ''}${team.nomeTabela && team.nomeTabela !== team.nome ? `<p class="team-short-name">Na tabela: ${escapeHtml(team.nomeTabela)}</p>` : ''}</div><span class="roster-count">${team.jogadores.length ? `${team.jogadores.length} ${team.jogadores.length === 1 ? 'atleta' : 'atletas'}` : 'Elenco a definir'}</span></div>${team.jogadores.length ? `<ul class="roster-list">${team.jogadores.map((player) => `<li title="${escapeHtml(player.nome)}">${player.numero == null ? '' : `<span class="jersey">#${escapeHtml(player.numero)}</span>`}${escapeHtml(player.nome)}</li>`).join('')}</ul>` : '<p class="roster-pending">Elenco ainda não divulgado.</p>'}</article>`).join('') : `<p class="match-empty">${state.sportId === 'volei' && state.category === 'feminino' ? 'Os elencos femininos' : 'Os elencos'} serão publicados quando as equipes forem confirmadas.</p>`;
}

function render() {
  const selectedSport = currentSport();
  if (!selectedSport) return;
  const sport = currentView(selectedSport);
  document.querySelectorAll('.sport-tab').forEach((button) => { const active = button.dataset.sport === state.sportId; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
  el('category-switch').hidden = state.sportId !== 'volei';
  el('basket-category').hidden = state.sportId !== 'basquete';
  document.querySelectorAll('.category-tab').forEach((button) => { const active = button.dataset.category === state.category; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
  const completed = sport.partidas.filter((match) => match.status === 'encerrada');
  if (!completed.some((match) => match.id === state.matchId)) state.matchId = completed[0]?.id || null;
  el('sport-panel').classList.toggle('is-empty', completed.length === 0);
  renderUpcoming(selectedSport);
  renderMatchList(sport);
  renderMatchDetail(sport);
  renderStats(sport);
  renderTeams(sport);
}

async function loadData() {
  try {
    const response = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.esportes)) throw new Error('Formato inválido: falta a lista de esportes.');
    state.data = data;
    el('update-notice').textContent = updatedText(data.atualizadoEm);
    el('update-notice').hidden = false;
    render();
  } catch (error) {
    el('upcoming-panel').innerHTML = `<div class="error-panel">Não foi possível carregar a programação. Confira o arquivo <strong>data/resultados.json</strong> e tente atualizar a página.<br><small>${escapeHtml(error.message)}</small></div>`;
    el('sport-panel').innerHTML = '';
    el('team-list').innerHTML = '';
  }
}

document.querySelectorAll('.sport-tab').forEach((button) => button.addEventListener('click', () => { state.sportId = button.dataset.sport; state.category = 'masculino'; state.matchId = null; render(); }));
document.querySelectorAll('.category-tab').forEach((button) => button.addEventListener('click', () => { state.category = button.dataset.category; state.matchId = null; render(); }));
document.querySelector('.sport-switch').addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const next = state.sportId === 'volei' ? 'basquete' : 'volei';
  state.sportId = next; state.category = 'masculino'; state.matchId = null; render(); el(`tab-${next}`).focus();
});
document.querySelector('.category-switch').addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  state.category = state.category === 'feminino' ? 'masculino' : 'feminino'; state.matchId = null; render(); el(`category-${state.category}`).focus();
});
loadData();
