# Festival de Esportes 2026 — Nossa Senhora da Glória, SE

Site para publicar a programação e os resultados de vôlei feminino e masculino e basquete 3x3 masculino. Os dados continuam em `data/resultados.json`, no GitHub, sem banco de dados. Uma função da Vercel lê o arquivo mais recente e permite que a organização atualize os placares por formulário.

O campeonato começa em 9 de outubro de 2026. Os seis jogos de hoje já estão cadastrados na programação. As seis equipes femininas de vôlei estão divididas nos grupos A e B. O vôlei masculino e o basquete 3x3 têm um Grupo Único cada. Os elencos femininos e os resultados ainda não foram informados.

## Publicar na Vercel

1. Conecte o repositório `drianomelo/festival-de-esportes-2026` à Vercel. Selecione **Other** como framework; não é necessário comando de build. A raiz do projeto é o diretório de saída.
2. Configure duas variáveis de ambiente no projeto da Vercel: `ADMIN_PASSWORD` (uma senha forte para o formulário) e `GITHUB_TOKEN` (token fino do GitHub com permissão **Contents: Read and write** somente neste repositório). Nunca grave essas credenciais em arquivos do projeto.
3. Publique novamente após configurar as variáveis. A função em `api/resultados.mjs` publica as edições no ramo `master` e o site consulta o arquivo mais recente a cada 30 segundos. A integração Git com a Vercel pode criar uma nova implantação a cada edição, mas a leitura da API já mostra o novo resultado antes dela.

### Atualizar pelo navegador

Abra `/admin.html` no domínio do site. Essa página não aparece na navegação nem nos mecanismos de busca, mas **o endereço oculto não é a proteção**: somente a senha configurada na Vercel permite gravar. Escolha a partida, informe o placar, os pontos individuais disponíveis e os pontos da classificação ao encerrar o jogo. Salve como **Ao vivo** para atualizações durante a partida ou **Encerrada** ao terminar. Cada salvamento cria um commit em `data/resultados.json` no GitHub. A senha fica apenas na memória da aba e é enviada à função ao salvar; o token do GitHub permanece no servidor.

Se os elencos femininos ainda estiverem vazios, o formulário aceita o placar sem pontos individuais. No basquete encerrado, os pontos individuais informados precisam somar o placar de cada equipe. Se duas pessoas editarem a mesma partida ao mesmo tempo, uma das gravações pode pedir para recarregar os dados e tentar novamente.

Para testar a página pública no computador, sirva a pasta com um servidor local, por exemplo `python -m http.server 8000`, e abra `http://localhost:8000`. A página pública usa o JSON local se a função não estiver disponível. Para testar o formulário de gravação localmente, use o ambiente de desenvolvimento da Vercel com as variáveis configuradas; um servidor estático não executa a função.

## Atualizar os dados

Você ainda pode editar [data/resultados.json](data/resultados.json) manualmente. Complete os elencos femininos quando forem confirmados. Se editar o arquivo à mão, atualize também `atualizadoEm` com data, hora e fuso, por exemplo `"2026-10-09T13:46:00-03:00"`. O formulário faz isso automaticamente. O arquivo `logo.png` da raiz é usado no cabeçalho e como ícone da aba.

- Cada modalidade fica em `esportes`. Use `id: "volei"` ou `id: "basquete"`.
- Em `times`, cada equipe precisa de um `id` único, `nome`, `categoria` (`"feminino"` ou `"masculino"`) e uma lista `jogadores`. `nomeTabela` é opcional para o nome abreviado usado na programação. O campo `grupo` (por exemplo, `"A"`) pode ser adicionado quando os grupos forem definidos; ele será obrigatório para jogos da fase de grupos. Cada atleta precisa de `id` único e `nome`; `numero` é opcional.
- Em `partidas`, use IDs de equipe em `mandante` e `visitante` e a mesma `categoria` das duas equipes. `numero` identifica o jogo na programação e `rodada` guarda valores como `"R1"`. `status` é `"agendada"`, `"ao_vivo"` ou `"encerrada"`. Jogos agendados aparecem em **Próximos jogos**; os demais aparecem em **Resultados**. Use `fase: "a_definir"` até a fase ser confirmada, `"grupos"` para jogos que contam na classificação ou `"eliminatoria"` para os demais.
- Em cada partida de grupos encerrada, `pontosClassificacao` define os pontos que cada equipe recebe na tabela, por exemplo `{"mandante": 3, "visitante": 0}`. Assim, você pode usar a regra oficial do festival sem alterar o site. A ordem da classificação é por pontos, depois vitórias e saldo de pontos marcados.
- `periodos` guarda os pontos de cada set no vôlei. No basquete 3x3, use apenas uma entrada para o jogo até 21 pontos. O site calcula o placar final: sets vencidos no vôlei e pontos do jogo no basquete.
- `pontosAtletas` guarda `atletaId` e `pontos` para cada atleta. O ID deve existir em uma das duas equipes da partida. Atletas sem entrada nessa lista não aparecem no resumo de pontuação.
- Cada entrada em `pontosAtletas` pode ter `estatisticas` com números opcionais, por exemplo `{"rebotes": 4, "assistencias": 2}` no basquete ou `{"aces": 3, "bloqueios": 1}` no vôlei. As colunas só aparecem na tabela de atletas quando esses dados existirem.
- A seção **Estatísticas → Equipes** mostra a classificação de cada grupo: jogos, vitórias, derrotas, pontos da classificação, pontos marcados e sofridos. Só as partidas de grupos encerradas contam na tabela.
- A seção **Estatísticas → Atletas** soma os pontos registrados em todas as partidas encerradas da modalidade e categoria, inclusive eliminatórias, e mostra jogos com registro, média e melhor jogo.

Exemplo de uma partida agendada já cadastrada:

```json
{
  "id": "v-2026-10-09-2",
  "numero": 2,
  "categoria": "masculino",
  "fase": "grupos",
  "data": "2026-10-09",
  "horario": "20:30",
  "local": "Praça da Juventude",
  "status": "agendada",
  "mandante": "v-lonney-tunes",
  "visitante": "v-wendell",
  "periodos": [],
  "pontosAtletas": []
}
```

Depois do jogo, mude o status para `"encerrada"` e preencha `periodos`, `pontosAtletas` e, se for jogo de grupos, `pontosClassificacao`. Confira se o JSON continua válido antes de publicar. No basquete 3x3, a soma dos pontos dos atletas normalmente deve bater com o total da equipe. No vôlei, pode diferir por pontos gerados por erros do adversário.

Para conferir o arquivo antes de publicar, execute `node scripts/validar-dados.mjs` na pasta do projeto. O script aponta erros de JSON, IDs, categorias e placares. `node scripts/verificar-interface.mjs` verifica os elencos, os estados vazios e a tabela de próximos jogos com dados de teste que não são publicados.
