import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from '../api/resultados.mjs';

const originalFetch = globalThis.fetch;
const originalPassword = process.env.ADMIN_PASSWORD;
const originalToken = process.env.GITHUB_TOKEN;
const fixture = JSON.parse(readFileSync(new URL('../data/resultados.json', import.meta.url), 'utf8'));
let stored = structuredClone(fixture);
let commits = 0;
process.env.ADMIN_PASSWORD = 'senha-forte-de-teste';
process.env.GITHUB_TOKEN = 'token-de-teste';
globalThis.fetch = async (_url, options = {}) => {
  if (options.method === 'PUT') {
    const body = JSON.parse(options.body);
    assert.equal(body.sha, `sha-${commits}`);
    stored = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
    commits += 1;
    return Response.json({ commit: { sha: `commit-${commits}` } });
  }
  return Response.json({ sha: `sha-${commits}`, content: Buffer.from(JSON.stringify(stored)).toString('base64') });
};

const send = (body) => handler.fetch(new Request('https://festival.example/api/resultados', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
try {
  const read = await handler.fetch(new Request('https://festival.example/api/resultados'));
  assert.equal(read.status, 200);
  assert.equal((await read.json()).esportes.length, 2);
  const input = { password: 'senha-forte-de-teste', sportId: 'volei', matchId: 'v-2026-10-09-1', status: 'ao_vivo', periodos: [{ mandante: 12, visitante: 9 }], pontosAtletas: [] };
  assert.equal((await send({ ...input, password: 'errada' })).status, 401);
  assert.equal(commits, 0);
  assert.equal((await send(input)).status, 200);
  assert.equal(stored.esportes[0].partidas[0].status, 'ao_vivo');
  assert.equal(stored.esportes[0].partidas[0].periodos[0].mandante, 12);
  assert.equal((await send({ ...input, status: 'encerrada', periodos: [{ mandante: 25, visitante: 19 }] })).status, 400);
  assert.equal(commits, 1);
  assert.equal((await send({ ...input, status: 'encerrada', periodos: [{ mandante: 25, visitante: 19 }], pontosClassificacao: { mandante: 3, visitante: 0 } })).status, 200);
  assert.equal(stored.esportes[0].partidas[0].pontosClassificacao.mandante, 3);
  assert.equal(commits, 2);
  console.log('API: leitura, senha, jogo ao vivo, placar final e gravação conferidos.');
} finally {
  globalThis.fetch = originalFetch;
  if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = originalPassword;
  if (originalToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = originalToken;
}
