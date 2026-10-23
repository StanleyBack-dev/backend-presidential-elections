# Eleições Presidenciais 2026 · Backend

API da enquete **não oficial** do 2º turno da eleição presidencial de 2026 (Lula × Flávio Bolsonaro): NestJS + GraphQL + TypeORM sobre Postgres (Neon).

- Frontend + BFF: [frontend-presidential-elections](https://github.com/StanleyBack-dev/frontend-presidential-elections)
- Fluxo: `navegador → BFF (/api/elections/*) → este backend (/graphql) → Postgres`

## Rodando localmente

```bash
cp .env.example .env.development   # preencha DATABASE_URL e os segredos
npm install
npm run start:dev                  # as migrations rodam sozinhas ao iniciar
```

Gere segredos com `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

## API (GraphQL)

| Operação            | Tipo     | Descrição                                                        |
| ------------------- | -------- | ---------------------------------------------------------------- |
| `candidates`        | Query    | Candidatos                                                       |
| `electionResults`   | Query    | Totais, % sobre válidos, brancos/nulos e votos por estado        |
| `electionAnalytics` | Query    | Análise com filtros (região, estados, período, líder, ordenação) |
| `signInWithGoogle`  | Mutation | Valida o ID token do Google e devolve a sessão do eleitor        |
| `currentVoter`      | Query    | Quem está conectado e se já votou (sessão via `Authorization`)   |
| `castVote`          | Mutation | Registra o voto (candidato, branco ou nulo) da conta conectada   |

### Filtros de `electionAnalytics`

Todos opcionais e combináveis, aplicados em memória sobre uma única contagem em cache — não geram consultas extras ao banco.

| Campo               | Valores                                                    |
| ------------------- | ---------------------------------------------------------- |
| `region`            | `NORTE`, `NORDESTE`, `CENTRO_OESTE`, `SUDESTE`, `SUL`      |
| `states`            | Lista de UFs (`["SP", "RJ"]`)                              |
| `from` / `to`       | ISO 8601 com fuso (`2026-10-24T00:00:00-03:00`)            |
| `leaderSlug`        | Só estados em que o candidato lidera                       |
| `minVotes`          | Só estados com pelo menos N votos                          |
| `sortBy`            | `TOTAL_VOTES`, `STATE`, `MARGIN`, `CANDIDATE_SHARE`        |
| `sortCandidateSlug` | Candidato usado com `CANDIDATE_SHARE`                      |
| `order`             | `ASC`, `DESC`                                              |
| `granularity`       | `HOUR`, `DAY` (padrão: hora até 72h de período, dia acima) |

## Regras de votação

- **Branco e nulo** são opções da cédula. Como no TSE, contam no total, mas o percentual dos candidatos é calculado sobre os **votos válidos**.
- **Encerramento:** `VOTING_CLOSES_AT` (padrão `2026-10-25T17:00:00-03:00`). É um instante único para todo o país (horário unificado de Brasília); depois dele, votos são recusados. Sempre informe o fuso.

## Login com Google

Cada conta Google vota uma única vez. O frontend mostra o botão oficial do Google na hora de votar; o ID token recebido vai para `signInWithGoogle`, que confere assinatura, validade, _audience_ (`GOOGLE_CLIENT_ID`) e e-mail verificado, e devolve uma sessão (JWT HS256 assinado com `SESSION_SECRET`, válido por `SESSION_TTL_SECONDS`). O BFF guarda essa sessão num cookie httpOnly e a envia como `Authorization: Bearer` em `currentVoter` e `castVote`.

**Configuração no Google Cloud Console** (gratuito):

1. _APIs e serviços → Tela de permissão OAuth_: tipo **Externo**, escopos padrão (`openid`, `email`, `profile`) e status **Em produção**, para qualquer conta Google poder entrar.
2. _Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web_.
3. **Origens JavaScript autorizadas:** `http://localhost:5173` e o domínio de produção (com e sem `www`, se usar os dois). Não é preciso URI de redirecionamento.
4. Use o ID do cliente em `GOOGLE_CLIENT_ID` (backend) e `VITE_GOOGLE_CLIENT_ID` (frontend).

> A primeira versão validava por CPF. A coluna `tb_voters.cpf_hash` foi mantida (sem novas gravações) para que votos já registrados continuem contando.

## Segurança e privacidade

- **Um voto por conta Google:** `UNIQUE` sobre o hash da conta, gravado na mesma transação do voto (resiste a requisições simultâneas).
- **Nenhum dado pessoal armazenado:** só o HMAC-SHA256 do id da conta (`sub`) com chave secreta (`CPF_HASH_SECRET`, nome mantido da versão com CPF). Nome e e-mail ficam apenas na sessão, nunca no banco.
- **Voto secreto:** `tb_voters` (quem votou) e `tb_votes` (em quem) não têm ligação; o voto guarda só a hora truncada.
- **Rate limit** compartilhado entre instâncias (Postgres) e limites próprios para login e voto.
- **Anti-robô:** Cloudflare Turnstile, obrigatório em produção.
- **API fechada:** em produção só aceita chamadas do BFF (`INTERNAL_API_SECRET`). IPs só como HMAC.
- **Hardening:** helmet, corpo limitado a 10 KB, whitelist de campos, introspecção desligada em produção, erros internos não vazam, e-mails e tokens redigidos de logs.

## Migrations

Rodam no boot (local e produção) por `MigrationsRunnerService`, numa única transação protegida por `pg_advisory_xact_lock`. Assim, várias instâncias subindo juntas na Vercel não aplicam a mesma migration duas vezes, inclusive pelo endpoint _pooled_ do Neon. Desligue com `DB_MIGRATIONS_RUN=false`.

## Deploy (Vercel)

O workflow `deploy.yml` publica após o CI passar na `master`.

- **Secrets do GitHub:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- **Variáveis de ambiente na Vercel:** `NODE_ENV=production`, `DATABASE_URL`, `FRONTEND_URL`, `CPF_HASH_SECRET`, `INTERNAL_API_SECRET`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `TURNSTILE_SECRET_KEY` e `DB_SSL=true`.

> ⚠️ `CPF_HASH_SECRET` nunca deve mudar depois que a votação começar: isso apagaria o controle de quem já votou.
