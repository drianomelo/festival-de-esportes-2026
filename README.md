# Festival de Esportes 2026 — Nossa Senhora da Glória, SE

Site estático para publicar a programação e os resultados de vôlei feminino e masculino e basquete 3x3 masculino. Não usa banco de dados, servidor ou etapa de build.

O campeonato começa em 9 de outubro de 2026. Os times de basquete e vôlei masculino já estão cadastrados. O vôlei feminino, os grupos, os confrontos e os resultados aguardam confirmação; a tabela de próximos jogos será preenchida quando a programação real for informada.

## Publicar na Vercel

1. Envie esta pasta para um repositório Git ou importe a pasta no painel da Vercel.
2. Selecione **Other** como framework e deixe o comando de build vazio. O diretório de saída é a raiz do projeto.
3. Publique. Cada atualização do arquivo `data/resultados.json` exige uma nova publicação pela Vercel.

Para testar no computador, sirva a pasta com um servidor local, por exemplo `python -m http.server 8000`, e abra `http://localhost:8000`. Abrir `index.html` diretamente como `file://` pode bloquear a leitura do JSON no navegador.

## Atualizar os dados

Edite [data/resultados.json](data/resultados.json). Adicione os times femininos, os grupos e os confrontos quando forem confirmados. Atualize também `atualizadoEm` com data, hora e fuso, por exemplo `"2026-10-09T13:31:00-03:00"`. Esse campo aparece no aviso de atualização do site. O arquivo `logo.png` da raiz é usado no cabeçalho e como ícone da aba.

- Cada modalidade fica em `esportes`. Use `id: "volei"` ou `id: "basquete"`.
- Em `times`, cada equipe precisa de um `id` único, `nome`, `categoria` (`"feminino"` ou `"masculino"`) e uma lista `jogadores`. O campo `grupo` (por exemplo, `"A"`) pode ser adicionado quando os grupos forem definidos; ele será obrigatório para jogos da fase de grupos. Cada atleta precisa de `id` único e `nome`; `numero` é opcional.
- Em `partidas`, use IDs de equipe em `mandante` e `visitante` e a mesma `categoria` das duas equipes. `status` é `"agendada"` ou `"encerrada"`. Jogos agendados aparecem na tabela **Próximos jogos**; os encerrados aparecem em **Resultados**. Use `fase: "grupos"` para jogos que contam na classificação ou `fase: "eliminatoria"` para os demais.
- Em cada partida de grupos encerrada, `pontosClassificacao` define os pontos que cada equipe recebe na tabela, por exemplo `{"mandante": 3, "visitante": 0}`. Assim, você pode usar a regra oficial do festival sem alterar o site. A ordem da classificação é por pontos, depois vitórias e saldo de pontos marcados.
- `periodos` guarda os pontos de cada set no vôlei. No basquete 3x3, use apenas uma entrada para o jogo até 21 pontos. O site calcula o placar final: sets vencidos no vôlei e pontos do jogo no basquete.
- `pontosAtletas` guarda `atletaId` e `pontos` para cada atleta. O ID deve existir em uma das duas equipes da partida. Atletas sem entrada nessa lista não aparecem no resumo de pontuação.
- Cada entrada em `pontosAtletas` pode ter `estatisticas` com números opcionais, por exemplo `{"rebotes": 4, "assistencias": 2}` no basquete ou `{"aces": 3, "bloqueios": 1}` no vôlei. As colunas só aparecem na tabela de atletas quando esses dados existirem.
- A seção **Estatísticas → Equipes** mostra a classificação de cada grupo: jogos, vitórias, derrotas, pontos da classificação, pontos marcados e sofridos. Só as partidas de grupos encerradas contam na tabela.
- A seção **Estatísticas → Atletas** soma os pontos registrados em todas as partidas encerradas da modalidade e categoria, inclusive eliminatórias, e mostra jogos com registro, média e melhor jogo.

Exemplo do formato de uma partida agendada (não é um confronto confirmado):

```json
{
  "id": "v-001",
  "categoria": "masculino",
  "fase": "eliminatoria",
  "data": "2026-10-10",
  "horario": "15:00",
  "local": "Ginásio Municipal",
  "status": "agendada",
  "mandante": "v-lonney-tunes",
  "visitante": "v-sand-volei",
  "periodos": [],
  "pontosAtletas": []
}
```

Depois do jogo, mude o status para `"encerrada"` e preencha `periodos`, `pontosAtletas` e, se for jogo de grupos, `pontosClassificacao`. Confira se o JSON continua válido antes de publicar. No basquete 3x3, a soma dos pontos dos atletas normalmente deve bater com o total da equipe. No vôlei, pode diferir por pontos gerados por erros do adversário.

Para conferir o arquivo antes de publicar, execute `node scripts/validar-dados.mjs` na pasta do projeto. O script aponta erros de JSON, IDs, categorias e placares. `node scripts/verificar-interface.mjs` verifica os elencos, os estados vazios e a tabela de próximos jogos com dados de teste que não são publicados.
