const byId = (id) => document.getElementById(id);
const clean = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let data;

const selected = () => {
  for (const sport of data?.esportes || []) {
    const match = sport.partidas.find((item) => item.id === byId('match-select').value);
    if (match) return { sport, match, home: sport.times.find((team) => team.id === match.mandante), away: sport.times.find((team) => team.id === match.visitante) };
  }
  return null;
};

function feedback(message, kind = 'error') {
  byId('feedback').textContent = message;
  byId('feedback').dataset.kind = kind;
}

function addPeriod(home = 0, away = 0) {
  const { sport } = selected();
  const number = byId('periods').children.length + 1;
  if (number > (sport.id === 'basquete' ? 1 : 5)) return;
  const row = document.createElement('div');
  row.className = 'period-row';
  row.innerHTML = `<strong>${sport.id === 'basquete' ? 'Jogo' : `${number}º set`}</strong><label><span class="sr-only">Mandante</span><input class="score-home" type="number" min="0" max="200" step="1" value="${home}" required aria-label="Pontos do mandante, ${number}º período"></label><label><span class="sr-only">Visitante</span><input class="score-away" type="number" min="0" max="200" step="1" value="${away}" required aria-label="Pontos do visitante, ${number}º período"></label>${sport.id === 'volei' ? '<button type="button" aria-label="Remover último set" title="Remover último set">×</button>' : '<span></span>'}`;
  row.querySelector('button')?.addEventListener('click', () => {
    if (row !== byId('periods').lastElementChild) { feedback('Remova primeiro o último set.'); return; }
    row.remove();
  });
  byId('periods').append(row);
}

function athleteRows(team, sport, match) {
  const points = new Map((match.pontosAtletas || []).map((entry) => [entry.atletaId, entry]));
  const metricA = sport.id === 'basquete' ? ['rebotes', 'Rebotes'] : ['aces', 'Aces'];
  const metricB = sport.id === 'basquete' ? ['assistencias', 'Assistências'] : ['bloqueios', 'Bloqueios'];
  return `<div class="athlete-team"><h3>${clean(team.nome)}</h3>${team.jogadores.length ? team.jogadores.map((athlete) => {
    const entry = points.get(athlete.id);
    return `<div class="athlete-row" data-athlete="${clean(athlete.id)}"><strong>${clean(athlete.nome)}</strong><label>Pontos<input data-field="pontos" type="number" min="0" max="200" step="1" value="${entry?.pontos ?? ''}" placeholder="—"></label><label>${metricA[1]}<input data-field="${metricA[0]}" type="number" min="0" max="200" step="1" value="${entry?.estatisticas?.[metricA[0]] ?? ''}" placeholder="—"></label><label>${metricB[1]}<input data-field="${metricB[0]}" type="number" min="0" max="200" step="1" value="${entry?.estatisticas?.[metricB[0]] ?? ''}" placeholder="—"></label></div>`;
  }).join('') : '<p>Elenco ainda não divulgado. O placar da equipe pode ser salvo sem pontuação individual.</p>'}</div>`;
}

function renderMatch() {
  const picked = selected();
  if (!picked) return;
  const { sport, match, home, away } = picked;
  byId('match-meta').textContent = `${match.data} · ${match.horario} · ${match.local || 'Local a definir'} · ${match.categoria}`;
  byId('match-status').value = match.status;
  byId('score-heading').innerHTML = `<span>${clean(home.nomeTabela || home.nome)}</span><span>${clean(away.nomeTabela || away.nome)}</span>`;
  byId('periods').replaceChildren();
  (match.periodos || []).forEach((period) => addPeriod(period.mandante, period.visitante));
  if (!match.periodos?.length) addPeriod();
  byId('add-set').hidden = sport.id !== 'volei';
  byId('athletes').innerHTML = athleteRows(home, sport, match) + athleteRows(away, sport, match);
  byId('classification-card').hidden = match.fase !== 'grupos' || match.status !== 'encerrada';
  byId('classification').innerHTML = `<div class="classification-row"><label>${clean(home.nome)}<input id="points-home" type="number" min="0" max="200" step="1" value="${match.pontosClassificacao?.mandante ?? ''}" placeholder="Pontos"></label><label>${clean(away.nome)}<input id="points-away" type="number" min="0" max="200" step="1" value="${match.pontosClassificacao?.visitante ?? ''}" placeholder="Pontos"></label></div>`;
  feedback('');
}

function readNumber(input, label) {
  const value = input.value.trim();
  if (!/^\d+$/.test(value) || Number(value) > 200) throw new Error(`${label}: informe um número inteiro entre 0 e 200.`);
  return Number(value);
}

function payload() {
  const { sport, match } = selected();
  const status = byId('match-status').value;
  const periodos = status === 'agendada' ? [] : [...byId('periods').querySelectorAll('.period-row')].map((row) => ({
    mandante: readNumber(row.querySelector('.score-home'), 'Placar'),
    visitante: readNumber(row.querySelector('.score-away'), 'Placar'),
  }));
  const pontosAtletas = status === 'agendada' ? [] : [...byId('athletes').querySelectorAll('[data-athlete]')].flatMap((row) => {
    const fields = [...row.querySelectorAll('input')];
    if (fields.every((field) => field.value.trim() === '')) return [];
    const estatisticas = {};
    for (const field of fields.slice(1)) if (field.value.trim() !== '') estatisticas[field.dataset.field] = readNumber(field, 'Estatística');
    return [{ atletaId: row.dataset.athlete, pontos: fields[0].value.trim() === '' ? 0 : readNumber(fields[0], 'Pontos do atleta'), ...(Object.keys(estatisticas).length ? { estatisticas } : {}) }];
  });
  const result = { password: byId('admin-password').value, sportId: sport.id, matchId: match.id, status, periodos, pontosAtletas };
  if (status === 'encerrada' && match.fase === 'grupos') result.pontosClassificacao = {
    mandante: readNumber(byId('points-home'), 'Classificação do mandante'),
    visitante: readNumber(byId('points-away'), 'Classificação do visitante'),
  };
  return result;
}

async function loadData(keepId) {
  const response = await fetch(`./api/resultados${keepId ? `?fresh=${Date.now()}` : ''}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível consultar o GitHub. Confira a publicação da função na Vercel.');
  data = await response.json();
  const options = data.esportes.flatMap((sport) => sport.partidas.map((match) => {
    const home = sport.times.find((team) => team.id === match.mandante);
    const away = sport.times.find((team) => team.id === match.visitante);
    return `<option value="${clean(match.id)}">${clean(sport.nome)} · ${clean(match.categoria)} · ${clean(match.horario || 'Sem horário')} · ${clean(home?.nomeTabela || home?.nome)} × ${clean(away?.nomeTabela || away?.nome)}</option>`;
  }));
  byId('match-select').innerHTML = options.join('');
  if (keepId && data.esportes.some((sport) => sport.partidas.some((match) => match.id === keepId))) byId('match-select').value = keepId;
  renderMatch();
}

byId('match-select').addEventListener('change', renderMatch);
byId('match-status').addEventListener('change', () => { const picked = selected(); byId('classification-card').hidden = picked?.match.fase !== 'grupos' || byId('match-status').value !== 'encerrada'; });
byId('add-set').addEventListener('click', () => addPeriod());
byId('game-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  let input;
  try { input = payload(); } catch (error) { feedback(error.message); return; }
  byId('save-button').disabled = true;
  feedback('Salvando no repositório…', 'success');
  try {
    const response = await fetch('./api/resultados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.erro || 'Não foi possível salvar.');
    await loadData(input.matchId);
    feedback('Atualização salva no GitHub. O site público consulta novos placares automaticamente, em cerca de 30 segundos.', 'success');
  } catch (error) { feedback(error.message); }
  finally { byId('save-button').disabled = false; }
});
loadData().catch((error) => feedback(error.message));
