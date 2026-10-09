import { timingSafeEqual } from 'node:crypto';

const repo = 'drianomelo/festival-de-esportes-2026';
const branch = 'master';
const contentsUrl = `https://api.github.com/repos/${repo}/contents/data/resultados.json`;
const headers = (token) => ({
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'festival-de-esportes-2026',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});
const json = (value, status = 200, cache = 'no-store') => Response.json(value, { status, headers: { 'Cache-Control': cache } });
const validPoints = (value) => Number.isInteger(value) && value >= 0 && value <= 200;
const samePassword = (received, expected) => {
  if (typeof received !== 'string' || typeof expected !== 'string' || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

async function latestData(token) {
  const response = await fetch(`${contentsUrl}?ref=${branch}`, { headers: headers(token), cache: 'no-store' });
  if (!response.ok) throw new Error(`GitHub respondeu ${response.status} ao ler os resultados.`);
  const file = await response.json();
  if (!file.content || !file.sha) throw new Error('O arquivo de resultados não foi encontrado no GitHub.');
  return { data: JSON.parse(Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8')), sha: file.sha };
}

function validateUpdate(input, data) {
  const sport = data.esportes.find((item) => item.id === input.sportId);
  const match = sport?.partidas.find((item) => item.id === input.matchId);
  if (!match) throw new Error('Partida não encontrada. Atualize a página e tente novamente.');
  if (!['agendada', 'ao_vivo', 'encerrada'].includes(input.status)) throw new Error('Situação da partida inválida.');
  if (!Array.isArray(input.periodos) || input.periodos.length > (sport.id === 'basquete' ? 1 : 5)) throw new Error('Quantidade de sets ou períodos inválida.');
  if (input.status !== 'agendada' && input.periodos.length === 0) throw new Error('Informe o placar antes de iniciar ou encerrar a partida.');
  if (input.status === 'agendada' && input.periodos.length) throw new Error('Para salvar um placar, marque a partida como ao vivo ou encerrada.');
  for (const period of input.periodos) {
    if (!validPoints(period.mandante) || !validPoints(period.visitante)) throw new Error('O placar deve conter números inteiros não negativos.');
    if (sport.id === 'volei' && input.status === 'encerrada' && period.mandante === period.visitante) throw new Error('Um set encerrado não pode terminar empatado.');
  }
  if (sport.id === 'basquete' && input.status === 'encerrada' && Math.max(input.periodos[0].mandante, input.periodos[0].visitante) !== 21) throw new Error('No basquete, o placar final precisa ter um vencedor com 21 pontos.');
  if (sport.id === 'basquete' && input.periodos.some((period) => period.mandante > 21 || period.visitante > 21)) throw new Error('No basquete, cada equipe pode marcar até 21 pontos.');
  if (!Array.isArray(input.pontosAtletas)) throw new Error('Pontuação dos atletas inválida.');
  if (input.status === 'agendada' && input.pontosAtletas.length) throw new Error('Partida agendada não deve ter pontuação individual.');
  const home = sport.times.find((team) => team.id === match.mandante);
  const away = sport.times.find((team) => team.id === match.visitante);
  const athleteIds = new Set([...(home?.jogadores || []), ...(away?.jogadores || [])].map((athlete) => athlete.id));
  const seen = new Set();
  for (const entry of input.pontosAtletas) {
    if (!athleteIds.has(entry.atletaId) || seen.has(entry.atletaId) || !validPoints(entry.pontos)) throw new Error('Pontuação de atleta inválida ou duplicada.');
    seen.add(entry.atletaId);
    if (entry.estatisticas && (typeof entry.estatisticas !== 'object' || Array.isArray(entry.estatisticas) || Object.values(entry.estatisticas).some((value) => !validPoints(value)))) throw new Error('Estatísticas individuais inválidas.');
  }
  if (sport.id === 'basquete' && input.status === 'encerrada') {
    for (const [team, score] of [[home, input.periodos[0].mandante], [away, input.periodos[0].visitante]]) {
      const ids = new Set(team.jogadores.map((athlete) => athlete.id));
      const total = input.pontosAtletas.filter((entry) => ids.has(entry.atletaId)).reduce((sum, entry) => sum + entry.pontos, 0);
      if (total !== score) throw new Error(`A soma dos pontos dos atletas de ${team.nome} deve ser ${score}.`);
    }
  }
  if (input.status === 'encerrada' && match.fase === 'grupos' && (!input.pontosClassificacao || !validPoints(input.pontosClassificacao.mandante) || !validPoints(input.pontosClassificacao.visitante))) throw new Error('Informe os pontos da classificação das duas equipes.');
  return { sport, match };
}

export default {
  async fetch(request) {
    if (request.method === 'GET') {
      try {
        const { data } = await latestData(process.env.GITHUB_TOKEN);
        return json(data, 200, 'public, s-maxage=10, stale-while-revalidate=10');
      } catch (error) {
        return json({ erro: error.message }, 502);
      }
    }
    if (request.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405);
    if (!process.env.ADMIN_PASSWORD || !process.env.GITHUB_TOKEN) return json({ erro: 'A edição ainda não foi configurada na Vercel.' }, 503);
    if (Number(request.headers.get('content-length') || 0) > 50000) return json({ erro: 'Envio muito grande.' }, 413);
    let input;
    try { input = await request.json(); } catch { return json({ erro: 'Envio inválido.' }, 400); }
    if (!samePassword(input?.password, process.env.ADMIN_PASSWORD)) return json({ erro: 'Senha incorreta.' }, 401);
    try {
      const { data, sha } = await latestData(process.env.GITHUB_TOKEN);
      const { sport, match } = validateUpdate(input, data);
      match.status = input.status;
      match.periodos = input.periodos.map((period, index) => ({ nome: sport.id === 'basquete' ? 'Jogo' : `${index + 1}º set`, mandante: period.mandante, visitante: period.visitante }));
      match.pontosAtletas = input.pontosAtletas.map((entry) => ({ atletaId: entry.atletaId, pontos: entry.pontos, ...(entry.estatisticas && Object.keys(entry.estatisticas).length ? { estatisticas: entry.estatisticas } : {}) }));
      if (input.status === 'encerrada' && match.fase === 'grupos') match.pontosClassificacao = input.pontosClassificacao;
      else delete match.pontosClassificacao;
      data.atualizadoEm = new Date().toISOString();
      const content = Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8').toString('base64');
      const saved = await fetch(contentsUrl, {
        method: 'PUT',
        headers: { ...headers(process.env.GITHUB_TOKEN), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Atualizar placar: ${match.id}`, content, sha, branch }),
      });
      if (!saved.ok) {
        if ([409, 422].includes(saved.status)) return json({ erro: 'Os resultados mudaram durante a edição. Recarregue a partida e tente novamente.' }, 409);
        return json({ erro: `Não foi possível gravar no GitHub (HTTP ${saved.status}).` }, 502);
      }
      return json({ ok: true, data });
    } catch (error) {
      return json({ erro: error.message }, error.message.includes('GitHub respondeu') ? 502 : 400);
    }
  },
};
