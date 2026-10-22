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
| `castVote`          | Mutation | Registra um voto (candidato, branco ou nulo)                     |

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

## Validação do CPF

Nenhum órgão do governo oferece API **gratuita** para confirmar que um CPF existe (a do SERPRO é paga). A verificação é plugável via `CPF_VERIFICATION_PROVIDER`:

- `local`: só dígitos verificadores. Sem custo, mas aceita CPFs gerados.
- `cpfhub`: [CPFHub.io](https://www.cpfhub.io) confirma que o CPF existe **e** que a data de nascimento bate (50 consultas grátis; só cobra quando o CPF é encontrado).

Outro provedor: implemente `CpfVerificationProvider` em `src/modules/cpf-verification/providers/` e registre-o em `cpf-verification.module.ts`.

## Segurança e privacidade

- **Um voto por CPF:** `UNIQUE` sobre o hash do CPF, gravado na mesma transação do voto (resiste a requisições simultâneas).
- **CPF nunca armazenado:** só HMAC-SHA256 com chave secreta (`CPF_HASH_SECRET`); um hash comum seria revertido por força bruta (~10⁹ CPFs). A data de nascimento não é armazenada.
- **Voto secreto:** `tb_voters` (quem votou) e `tb_votes` (em quem) não têm ligação; o voto guarda só a hora truncada.
- **Rate limit** compartilhado entre instâncias (Postgres) e **bloqueio** após 5 falhas por IP e por CPF.
- **Anti-robô:** Cloudflare Turnstile, obrigatório em produção.
- **API fechada:** em produção só aceita chamadas do BFF (`INTERNAL_API_SECRET`). IPs só como HMAC.
- **Hardening:** helmet, corpo limitado a 10 KB, whitelist de campos, introspecção desligada em produção, erros internos não vazam, CPFs redigidos de logs.

## Migrations

Rodam no boot (local e produção) por `MigrationsRunnerService`, numa única transação protegida por `pg_advisory_xact_lock`. Assim, várias instâncias subindo juntas na Vercel não aplicam a mesma migration duas vezes, inclusive pelo endpoint _pooled_ do Neon. Desligue com `DB_MIGRATIONS_RUN=false`.

## Deploy (Vercel)

O workflow `deploy.yml` publica após o CI passar na `master`.

- **Secrets do GitHub:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- **Variáveis de ambiente na Vercel:** `NODE_ENV=production`, `DATABASE_URL`, `FRONTEND_URL`, `CPF_HASH_SECRET`, `INTERNAL_API_SECRET`, `TURNSTILE_SECRET_KEY`, `CPF_VERIFICATION_PROVIDER`, `CPFHUB_API_KEY` (se usar `cpfhub`) e `DB_SSL=true`.

> ⚠️ `CPF_HASH_SECRET` nunca deve mudar depois que a votação começar: isso apagaria o controle de quem já votou.
