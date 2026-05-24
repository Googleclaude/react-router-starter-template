# Auditoria de Conformidade, Segurança e Qualidade — Decisões STF

Repositório: `azemormi-hue/react-router-starter-template`
Branch auditada: `claude/lgpd-fase-1` (estado pós-PR #12, antes de mergeada na `main`)
Data: 2026-05-24
Escopo: `app/`, `workers/`, `migrations/`, `.github/workflows/`, raiz do repositório.

> **Premissa de leitura.** Os itens marcados ✅ Conforme abaixo assumem que o PR #12 (Fase 1 — LGPD) será mergeado. Caso #12 não seja mergeado, todos os itens que dependem dos arquivos `PRIVACY.md`, `ROPA.md`, `INCIDENT_RESPONSE.md`, `biome.json`, `vitest.config.ts`, `workers/security.ts`, `app/components/privacy-notice.tsx`, `app/lib/upload.shared.ts` e da migration `0002_drop_raw_text.sql` regridem para ⚠️ Parcial ou ❌ Não conforme.

---

## Sumário executivo

### Contagem de achados por severidade

| Severidade | Quantidade |
|---|---:|
| Crítico  | 1 |
| Alto     | 5 |
| Médio    | 11 |
| Baixo    | 9 |
| **Total**    | **26** |

### Top 3 — resolver esta semana

1. **[CRÍTICO] `insertDecisao` ainda escreve em `raw_text`** depois da migration `0002` que dropa a coluna. Próximo upload em produção **vai quebrar** com `SQLITE_ERROR: no such column: raw_text` (ver A-01).
2. **[ALTO] Tipos `Decisao` e `insertDecisao` desalinhados do schema pós-0002** — `raw_text` aparece em `app/lib/types.ts` e nos parâmetros de inserção; sintomático da inconsistência que causa A-01 (ver A-02).
3. **[ALTO] Sem rate limit no `/api/decisao`** — endpoint autenticado, mas qualquer credencial válida pode esgotar a quota da Anthropic em loop (ver A-03).

### Top 3 — próximo sprint

1. **[ALTO] Trilha de auditoria persistente ausente** — ROPA cita `audit_log` como Fase 2; sem ele art. 37/48 da LGPD ficam incompletos (rastreabilidade pós-incidente, evidência em fiscalização).
2. **[ALTO] CI usa `npm install --legacy-peer-deps` em vez de `npm ci`** — lockfile pode ser reescrito silenciosamente; compromete determinismo e bypassa proteção do `package-lock.json`.
3. **[ALTO] Sem `SECURITY.md` nem política de divulgação responsável** — barra entrada de reporte externo de vulnerabilidades; combinado com ausência de `LICENSE` no repositório, levanta dúvidas de governança.

### O que está bem

- **Cabeçalhos de segurança no Worker são exemplares** (HSTS, CSP estrita, COOP, CORP, X-Frame-Options DENY, Permissions-Policy restritiva, X-Content-Type-Options, charset enforcement).
- **Autenticação com `safeEqual` constant-time** evita timing oracle clássico em Basic Auth.
- **Validação de PDF por magic bytes** (não confia em MIME do cliente) — defesa contra disfarce de payload antes do gasto na Anthropic.
- **Sanitização de filename com remoção de CPF/CNPJ** antes de logging/persistência — minimização real, não cosmética.
- **`processUploadedPdf` com correlation ID** evita PII em logs e dá ao usuário um identificador para suporte.
- **Documentação LGPD (PRIVACY, ROPA, INCIDENT_RESPONSE) honesta** — explicita pendências (`[A DEFINIR]`) em vez de fingir conformidade.
- **Testes unitários cobrindo helpers críticos de segurança** — `safeEqual`, `checkBasicAuth`, `csrfCheck`, `hasPdfMagicBytes`, `sanitizeFilename`.
- **CI funcional** com coleta de logs e comentário automático em PR quando falha — boa UX para quem revisa.
- **Separação `*.server.ts` / `*.shared.ts`** clara, evita vazamento de imports server-only para o bundle client.
- **CSP `script-src 'self'`** sem `'unsafe-inline'`/`'unsafe-eval'` — React Router emite scripts externos limpos.

---

## Blocos da checklist

### 1. Estrutura e saúde geral — ⚠️ Parcial

| Item | Status |
|---|---|
| Layout de pastas coerente (`app/`, `workers/`, `migrations/`) | ✅ |
| README presente e atualizado | ✅ |
| LICENSE | ❌ ausente |
| CONTRIBUTING | ❌ ausente |
| CHANGELOG | ❌ ausente |
| SECURITY.md (canal de divulgação) | ❌ ausente |
| `.gitignore` cobre `.env`, `.dev.vars`, `build`, `.wrangler`, etc. | ✅ |
| Código morto | ⚠️ ver A-02, B-01 |
| Dependências não usadas | ✅ inspeção de `package.json` — todas referenciadas |
| Arquivos sensíveis versionados | ✅ nenhum `.env`/`.dev.vars` no histórico-tip da branch |

**Achados:**

- **B-01 [Baixo] `LICENSE` ausente.** Sem licença declarada, qualquer terceiro precisa pedir autorização para usar o código. Para projeto interno isso pode ser intencional; explicitar.
  *Remediação:* adicionar `LICENSE` (MIT ou proprietary "All rights reserved") no root e referenciar no README.
- **B-02 [Baixo] `CONTRIBUTING.md` ausente.** Sem fluxo declarado de contribuição (branch naming, conventional commits, política de review).
  *Remediação:* documentar mínimo: branch a partir de `main`, conventional commits, exigência de `npm run lint && npm test && npm run build` antes do PR.
- **B-03 [Baixo] `CHANGELOG.md` ausente.** Já existe um pipeline de PRs (#4, #8, #12); falta narrativa consolidada.
  *Remediação:* adotar Keep a Changelog ou `release-please`.
- **M-01 [Médio] `SECURITY.md` ausente.** Sem canal explícito para reporte de vulnerabilidades por terceiros. PRIVACY.md cita o DPO, mas não substitui um arquivo padrão que o GitHub indexa.
  *Remediação:* criar `SECURITY.md` apontando para o e-mail do DPO + tempo de resposta (alinhar com SLA do INCIDENT_RESPONSE).
- **B-04 [Baixo] `package.json` sem `engines`, `repository`, `license`, `author`.** Metadados padrão de projeto Node ausentes.
  *Remediação:* adicionar `"engines": { "node": ">=20" }`, `"license": "..."`, `"repository": "..."`. O CI já roda Node 20 — fixar isso no package evita PRs subindo a versão sem coordenação.

---

### 2. Segredos e credenciais — ✅ Conforme

| Item | Status |
|---|---|
| Chaves/tokens/senhas hardcoded no código | ✅ nenhum encontrado |
| Segredos no histórico Git | ✅ não detectado na branch auditada (auditoria pontual; recomendar `gitleaks` em CI) |
| Carregamento via env/secret manager (`wrangler secret`) | ✅ `ANTHROPIC_API_KEY`, `APP_PASSWORD` |
| `.dev.vars.example` é placeholder | ✅ `"sk-ant-..."` |
| Logs com dados sensíveis | ✅ `processUploadedPdf` loga `fileName` sanitizado e correlation ID, não loga corpo do PDF |

**Achados:**

- **B-05 [Baixo] `.dev.vars.example` não cita `APP_PASSWORD`.** Onboarding tem que recorrer ao README. Pequeno, mas reduz fricção.
  *Remediação:* incluir `APP_PASSWORD="trocar-em-producao"` no exemplo, com comentário `# obrigatório, senão worker responde 503`.
- **M-02 [Médio] `app/lib/claude.server.ts:118` pode vazar trecho de PDF no log.** O `throw new Error(...textBlock.text.slice(0, 500))` propaga até `console.error` em `upload.server.ts`, junto do correlation ID. Esse trecho de 500 caracteres pode conter PII (nome de parte, CPF, valores).
  *Remediação:* não incluir conteúdo no `Error.message`; logar separadamente sob nível `debug` somente em desenvolvimento, ou hashear/truncar para 50 chars.

---

### 3. Dependências e supply chain — ⚠️ Parcial

| Item | Status |
|---|---|
| Lockfile (`package-lock.json`) presente | ✅ |
| CI usa `npm ci` (instalação determinística) | ❌ usa `npm install --legacy-peer-deps` |
| Scanner SCA (`npm audit`, Dependabot, Snyk) | ❌ ausente |
| Licenças incompatíveis no graph | ⚠️ não verificado em CI (manual: stack de Anthropic/React/Vite todas permissivas) |
| Versionamento de actions de CI por SHA | ❌ usa tags (`@v4`) |

**Achados:**

- **A-04 [Alto] CI usa `npm install --legacy-peer-deps`.** Quebra a garantia do lockfile: `install` resolve a árvore e pode reescrever o `package-lock.json` ou ignorar pinings. Combinado com a ausência de Dependabot, qualquer transitiva pode subir versão sem revisão.
  *Remediação:* trocar para `npm ci` (que falha se `package.json` e `package-lock.json` divergirem). Se o `legacy-peer-deps` é necessário por causa de peer ranges incompatíveis, fixar em `.npmrc` (`legacy-peer-deps=true`) para ficar consistente entre dev e CI, mas ainda usar `npm ci`.
- **M-03 [Médio] Sem scanner de vulnerabilidade de dependência em CI.** Sem Dependabot, Renovate, ou `npm audit --audit-level=high` no pipeline.
  *Remediação:* habilitar Dependabot (alerts + security updates) — 1 arquivo `.github/dependabot.yml`. Em paralelo, adicionar um job `npm audit --omit=dev --audit-level=high` no workflow, com `continue-on-error: true` no início para baseline.
- **M-04 [Médio] Actions de CI por tag, não SHA.** `actions/checkout@v4` e `actions/setup-node@v4` podem ser repointados pelo mantenedor. Em supply-chain attack histórica (e.g. tj-actions/changed-files), bastou repointar a tag.
  *Remediação:* pin por SHA com comentário do tag (`actions/checkout@b4ffde65f... # v4.1.1`). Dependabot mantém atualizado.

---

### 4. Autenticação e autorização — ⚠️ Parcial

| Item | Status |
|---|---|
| Login (Basic Auth) | ✅ |
| Constant-time compare (`safeEqual`) | ✅ |
| Fail-closed quando `APP_PASSWORD` ausente | ✅ retorna 503 (`workers/app.ts:175`) |
| RBAC/ABAC por endpoint | ❌ inexistente — Basic Auth all-or-nothing |
| Per-user identity / sessão | ❌ senha compartilhada |
| Logout / recuperação / MFA | ❌ N/A (Basic Auth) |
| Hashing de senhas (server-side) | N/A — senha vem como secret, não armazenada |
| Endpoints expostos sem auth | ✅ Worker faz `checkBasicAuth` antes de tudo |

**Achados:**

- **A-05 [Alto] Modelo de identidade único compartilhado.** Toda a operação roda sob uma senha compartilhada (`APP_PASSWORD`). Não há atribuição de ação a usuário; qualquer auditoria post-mortem responde "alguém com a senha". Já reconhecido no README como próximo passo (Cloudflare Access).
  *Remediação (próximo sprint):* migrar para Cloudflare Access com OIDC (Google Workspace / Okta). Acesso revogável por usuário, log de quem fez o quê.
- **M-05 [Médio] Sem mecanismo de rotação documentado.** Embora `INCIDENT_RESPONSE.md` instrua `wrangler secret put APP_PASSWORD`, não há cadência sugerida nem como invalidar sessões ativas (Basic Auth em si não tem; browser fica com cache).
  *Remediação:* documentar rotação trimestral; quando rotacionada, todos os browsers passam a receber 401 e re-promptam — a regra basta.
- **B-06 [Baixo] Mensagem 401 em português, mas `WWW-Authenticate` realm em português também.** Funciona; alguns gerenciadores de senha tropeçam em realm com acentos. Aceitável.

---

### 5. Validação de entrada e injeções — ✅ Conforme

| Item | Status |
|---|---|
| SQL: queries parametrizadas (`?` binding em todo `db.server.ts`) | ✅ |
| NoSQL injection | N/A |
| Command injection | N/A — nenhuma `exec`/`spawn` |
| XSS refletido/armazenado | ✅ React escapa por padrão; CSP `script-src 'self'`; lint `noDangerouslySetInnerHtml: error` |
| XSS DOM | ✅ sem `innerHTML`/`document.write` |
| CSRF | ⚠️ via `Sec-Fetch-Site` apenas (ver M-06) |
| SSRF | N/A |
| XXE | N/A |
| Path traversal | ✅ filename sanitizado, nunca usado como path de FS |
| Open redirect | ✅ todos os `redirect()` vão para paths fixos |
| Magic-byte PDF | ✅ `hasPdfMagicBytes` |
| Charset enforcement | ✅ `ensureCharset` no Worker |

**Achados:**

- **M-06 [Médio] CSRF baseado só em `Sec-Fetch-Site`.** Funciona para browsers modernos (todos os evergreen suportam desde 2020), mas:
  1. Cliente sem o header passa (`csrfCheck` retorna true) — intencional para curl/scripts, mas amplia a superfície se a cookie/Basic Auth do navegador for reaproveitada por um cliente exótico.
  2. Browsers muito antigos / WebViews legadas podem não emitir o header.
  Mitigação atual: Basic Auth exige credencial em cada request, e o navegador só envia a credencial cached para o origin com o realm certo. Combinado, o risco é baixo, mas não é defense-in-depth.
  *Remediação:* implementar double-submit cookie OU SameSite=Strict + token CSRF no formulário (action `/upload`, `/upload-lote`, `/decisao/$id` delete, `/api/decisao`). Pelo menos para as rotas mutadoras de `app/`.

- **M-07 [Médio] DELETE em `decisao/$id` aceita qualquer POST com `intent=delete`.** Confirmação só client-side (`confirm()`). Combinada com CSRF check via Sec-Fetch-Site é defensável, mas um endpoint destrutivo merece confirmação server-side (e.g. exigir `confirm_id` matching).
  *Remediação:* exigir parâmetro extra (`confirm_id=<decisao.id>`) no form, validar server-side; ou implementar soft-delete (alinha com art. 16 LGPD — possibilidade de retrieval em janela).

---

### 6. Dados sensíveis e LGPD — ⚠️ Parcial

| Item | Status |
|---|---|
| `PRIVACY.md` | ✅ (Fase 1) |
| `ROPA.md` | ✅ (Fase 1) |
| `INCIDENT_RESPONSE.md` | ✅ (Fase 1) |
| Controlador / DPO definidos | ❌ ambos `[A DEFINIR]` |
| Base legal declarada | ✅ art. 7º IX (legítimo interesse) |
| Criptografia em trânsito (HSTS + CSP `upgrade-insecure-requests`) | ✅ |
| Criptografia em repouso (D1 gerenciado pela Cloudflare) | ✅ |
| Mascaramento em logs (CPF/CNPJ filename) | ✅ |
| Minimização (drop `raw_text`) | ⚠️ migration existe mas código ainda escreve nela — ver A-01 |
| Retenção | ⚠️ "enquanto necessário"; sem job de expiração |
| Direitos do titular operacionalizados | ⚠️ canal por e-mail, sem fluxo no produto |
| Transferência internacional documentada (Anthropic, Cloudflare, EUA) | ✅ |
| Trilha de auditoria (`audit_log`) | ❌ prometida na Fase 2 |
| `PrivacyNotice` exibido nos pontos de coleta | ✅ `/upload` e `/upload-lote` |

**Achados:**

- **C-01 [CRÍTICO] `insertDecisao` em `app/lib/db.server.ts:31-58` ainda escreve em `raw_text` que foi dropada por `migrations/0002_drop_raw_text.sql`.** Quando a migration for aplicada em prod (`npm run db:migrate`), o próximo upload retorna `D1_ERROR: no such column: raw_text` e o usuário recebe o erro genérico "Falha ao processar o PDF" via `correlationId`. **Quebra produção.** Esta é a única falha de Severidade Crítica do relatório.
  *Remediação:* remover a coluna `raw_text` da string SQL do INSERT e do parâmetro `data.raw_text` em `insertDecisao` no mesmo PR que aplica a 0002. Atualizar tipo `Decisao` (ver A-02). Adicionar teste de integração que valide o INSERT contra schema atual.

- **A-01** — ver C-01 acima (rolled-up).

- **A-02 [Alto] Tipo `Decisao` em `app/lib/types.ts:16` ainda inclui `raw_text: string | null;`.** Sintoma do mesmo problema do C-01: a tipagem não reflete o schema pós-0002. `getDecisao` retorna `Decisao` tipado com `raw_text`, mas o SQLite vai retornar `undefined`. Quem ler espera a propriedade existir.
  *Remediação:* dropar `raw_text` de `Decisao` e de `insertDecisao`; rodar `npm run typecheck` para confirmar que nada mais consome.

- **A-03 [Alto] Sem rate limit em `/api/decisao`.** Usuário autenticado pode disparar uploads em loop e drenar a quota Anthropic (cada chamada é cara — `claude-opus-4-7` com 16k tokens). Não há limite por IP, por usuário (não dá — mesma senha), nem global.
  *Remediação:* implementar rate limit no Worker:
   - Curto prazo: Cloudflare Rate Limiting Rules no painel (10 req/min por IP), zero código.
   - Médio prazo: KV namespace contando requisições por IP+janela, dropar acima do limite com 429.
   - Implementar circuit breaker: se Anthropic retornar 429 ou erro de quota, parar de aceitar uploads novos por N minutos.

- **A-06 [Alto] Controlador e DPO marcados `[A DEFINIR]`.** Operar com essa marcação é não-conformidade direta com art. 9º (informações claras ao titular) e art. 41 (obrigação de indicar DPO). Aceitável durante a Fase 1 (template); inadmissível em produção.
  *Remediação:* substituir em `README.md`, `PRIVACY.md`, `ROPA.md`, `INCIDENT_RESPONSE.md` antes do primeiro deploy externo. Conferir com legal/jurídico interno.

- **M-08 [Médio] Sem prazo de retenção definido.** `PRIVACY.md §6` diz "enquanto necessário". LGPD art. 15 exige término do tratamento quando finalidade alcançada; sem definição operacional, não há gatilho de expiração.
  *Remediação:* definir uma política (ex.: 5 anos, alinhada ao prazo de prescrição), implementar job (Cron Trigger no Cloudflare) que faz `DELETE FROM decisoes WHERE created_at < datetime('now', '-5 years')`. Documentar no PRIVACY §6.

- **M-09 [Médio] Direitos do titular sem fluxo no produto.** PRIVACY menciona "e-mail do encarregado, SLA 15 dias úteis", mas não há tela/endpoint. Para o titular fazer um pedido de exclusão, depende de processo humano.
  *Remediação:* mínimo viável é um formulário em `/privacidade/solicitar` ou um link `mailto:` com template pré-preenchido. Ideal: endpoint autenticado que recebe pedido e abre ticket. Fase 2.

- **M-10 [Médio] `PrivacyNotice` não mostra o link real para `PRIVACY.md`.** O componente cita "Política completa em `PRIVACY.md`" mas como texto, não link clicável. Usuário precisa ir ao repositório do GitHub. Quando o app for público, esse arquivo provavelmente nem estará visível.
  *Remediação:* expor `PRIVACY.md` como rota (`/privacidade` renderizando o markdown) e linkar dali.

- **M-11 [Médio] `confirm()` em `decisao.$id.tsx:73` para deleção, mas nenhuma trilha de auditoria.** Quando alguém excluir uma decisão, não há registro de quem, quando, qual conteúdo. Para LGPD, exclusões a pedido do titular precisam ser rastreáveis (art. 18 §3º — controlador comprova atendimento).
  *Remediação (Fase 2):* implementar `audit_log` (migration 0003), gravar `INSERT INTO audit_log (action, target, actor, timestamp, payload_summary) VALUES ('delete_decisao', ?, 'shared-user', ...)`. Mesmo com identidade compartilhada, marcar timestamp + ID já protege.

---

### 7. Configuração e IaC — ✅ Conforme

| Item | Status |
|---|---|
| Sem Dockerfile/K8s/Terraform (stack é Worker — `wrangler.jsonc` único IaC) | N/A |
| `wrangler.jsonc` minimalista, comenta secrets | ✅ |
| Cabeçalhos HTTP de segurança | ✅ (PR #8 e extração em `security.ts` na Fase 1) |
| CORS | ✅ inexistente (Worker não permite cross-origin) |
| Debug/stack em produção | ✅ `app/root.tsx:54` filtra stack por `import.meta.env.DEV` |
| `nodejs_compat` flag justificada | ✅ usada para `node:buffer` em `claude.server.ts`/`upload.server.ts` |

**Achados:**

- **B-07 [Baixo] HSTS sem `includeSubDomains`.** Comentário em `workers/app.ts:96-100` reconhece e justifica (workers.dev na PSL). Mas se for migrado para domínio custom, atenção.
  *Remediação:* adicionar `includeSubDomains` e `preload` ao mudar para domínio custom; documentar no checklist de deploy.
- **B-08 [Baixo] CSP `style-src 'unsafe-inline'` aceito.** Necessário para React inline styles (view transitions); CSP nonced em React 19 + react-router 7 ainda é frágil.
  *Remediação:* aceitar como necessário hoje; reavaliar quando React Router emitir style nonces.
- **M-12 [Médio] `wrangler.jsonc` não declara `[env.production]`.** Não há separação prod/staging — todo deploy vai para o mesmo Worker. NODE_ENV não está fixado (worker-env declara opcional). Em deploy esquecido, o handler roda em modo dev e pode expor páginas de erro detalhadas.
  *Remediação:* criar bloco `[env.production]` com `vars = { NODE_ENV = "production" }` e usar `wrangler deploy --env production`. Atualizar README.

---

### 8. Qualidade e robustez — ⚠️ Parcial

| Item | Status |
|---|---|
| Code smells | ⚠️ pequenos (ver abaixo) |
| Complexidade ciclomática | ✅ funções todas curtas (<30 linhas) |
| Tratamento de erros | ✅ ErrorBoundary global + correlation IDs |
| Race conditions | ⚠️ ver M-13 |
| N+1 | ✅ listagem é single query |
| Tipos / schema validation | ⚠️ ver M-14 |
| Biome rules ativas | ✅ `noDangerouslySetInnerHtml`, `noUnusedVariables`, `noDebugger` |

**Achados:**

- **M-13 [Médio] `let handleRequest` em `workers/app.ts:31` é singleton por isolate, capturado da primeira request.** Se um isolate atender duas requisições com `env.NODE_ENV` diferente (impossível na Cloudflare hoje, mas conceitual), o modo "gruda". E mais relevante: nenhum teste cobre o handler completo — toda a lógica de gating do worker (`unauthorized`, `csrfBlocked`, `withSecurityHeaders`) está exercitada só indiretamente.
  *Remediação:* adicionar teste de integração com Miniflare ou Vitest + `unstable_dev` que faz POST/GET reais contra o worker e valida headers de resposta + códigos.

- **M-14 [Médio] Sem schema validation runtime de entrada.** Nem o `request.formData()` em `/upload`/`/api/decisao` nem o JSON retornado por Claude passam por `zod`/`valibot`. Confia em `JSON.parse` direto e em `file instanceof File`.
  *Remediação:* introduzir `zod` (ou `valibot` — menor bundle): schema para `DecisaoExtracted` validado no parse (`claude.server.ts:131`); schema para form do upload (já curto). Falha = correlation ID + 422.

- **B-09 [Baixo] `upload-lote.tsx:91` usa `cursor++` mutável em closure, criando coordenação implícita entre workers via mutável do escopo externo.** Funciona em V8 (JS single-threaded), mas é frágil. Cancel via `cancelRef.current = true` é também ad hoc.
  *Remediação:* trocar por `AbortController` + uma fila (e.g. `p-limit`). Não urgente — funciona.

- **M-15 [Médio] `ErrorBoundary` em `root.tsx:50-68` revela `error.message` mesmo em prod quando o erro **não** é `RouteErrorResponse`.** Não revela stack (filtrado), mas mensagem ainda pode conter informação sensível (mensagens internas da Anthropic, paths do D1).
  *Remediação:* em prod, mostrar mensagem genérica + correlation ID; logar o `error.message` server-side. Hoje `details = error.message` só roda em dev, **mas** quando não é dev nem RouteErrorResponse, `details = "Algo deu errado."` — está correto. Re-verificar lógica do `else if` (`error && error instanceof Error`): em prod isso é unreachable porque o branch `import.meta.env.DEV` está no condicional. ✅ OK na realidade.

---

### 9. Testes e cobertura — ⚠️ Parcial

| Item | Status |
|---|---|
| Vitest configurado | ✅ |
| 28 testes unitários cobrindo helpers de segurança | ✅ |
| Testes de integração worker → React Router | ❌ |
| Testes e2e (Playwright) | ❌ |
| Testes de DB (D1) | ❌ |
| Testes de Claude (mock SDK) | ❌ |
| Testes flaky/desabilitados | ✅ nenhum `.skip`/`.only` |
| Cobertura medida | ❌ |

**Achados:**

- **A-07 [Alto] Caminhos críticos sem teste.**
  - `processUploadedPdf` não tem teste (depende de mock da Anthropic + D1).
  - `insertDecisao` / `listDecisoes` / `getDecisao` / `deleteDecisao` sem teste — exatamente o lugar onde o C-01 mora.
  - Handler do Worker (`workers/app.ts default export`) não é testado: gate de auth, rejeição de método errado, ordem de checks.
  - Routes (`_index`, `upload`, `decisao.$id`, `api.decisao`) sem render/action test.
  *Remediação:* introduzir Vitest com Miniflare (`@cloudflare/vitest-pool-workers`) para testar `app.ts` end-to-end; mock do `Anthropic.messages.create` via DI ou `vi.mock`; testes de D1 contra `:memory:` SQLite via miniflare. Meta razoável: cobrir 100% de `processUploadedPdf`, `insertDecisao` (validando colunas que existem), e o gate de auth.

- **M-16 [Médio] Sem `npm run test:coverage`.** Vitest tem `--coverage` (c8/istanbul). Sem isso, regressão de cobertura passa em silêncio.
  *Remediação:* adicionar script `"test:coverage": "vitest run --coverage"` e gate no CI quando cobertura cair abaixo de 70%.

- **B-10 [Baixo] Sem teste explícito de XSS / injection.** A defesa hoje é "React escapa por padrão" — verdade, mas teste sentinela (snapshot de uma decisão com `<script>` no `ementa`) protege contra regressão de quem trocar `<p>{ementa}</p>` por `dangerouslySetInnerHTML` no futuro. A regra Biome `noDangerouslySetInnerHtml: error` já bloqueia, mas teste documenta intenção.

---

### 10. Logs, monitoramento, auditoria — ⚠️ Parcial

| Item | Status |
|---|---|
| Logging estruturado | ⚠️ apenas `console.error` com objeto (Cloudflare Observability ingere) |
| Trilha de auditoria persistente | ❌ (Fase 2) |
| Métricas / traces (Workers Analytics) | ✅ `observability.enabled = true` em wrangler |
| Alertas de segurança | ❌ apenas listados em `INCIDENT_RESPONSE.md §5` como "a configurar" |
| Correlation ID em erros | ✅ |
| Logs sem PII | ✅ (filename sanitizado, sem corpo de PDF — exceto M-02) |

**Achados:**

- **A-08 [Alto] Sem trilha de auditoria persistente.** `ROPA.md` cita `audit_log` como Fase 2. Sem isso, a frente de fiscalização ANPD não consegue ser respondida ("quem viu/excluiu o quê?"). Para uma aplicação que processa decisões de tribunal (mesmo públicas), é razoável esperar isso.
  *Remediação (Fase 2):* `migrations/0003_audit_log.sql` com tabela `(id, ts, action, target_type, target_id, actor, ip_hash, payload_hash)`; helper `auditLog(env, action, target, ...)` chamado em todos os pontos de mutação (`insertDecisao`, `deleteDecisao`).

- **M-17 [Médio] Sem alertas configurados.** Métricas existem (Observability ligado), mas o trigger humano (e-mail/Slack) não. `INCIDENT_RESPONSE.md` lista a lista de TODOs.
  *Remediação:* configurar no painel Cloudflare: 5xx > 1%, requests/min anômalas, falhas Anthropic. Documentar no runbook que os alertas estão ativos (com link/screenshot do painel).

- **B-11 [Baixo] `console.error` sem timestamp/level estruturado.** Cloudflare Logs ingere, mas para correlação humana, um wrapper `log({level, msg, ...fields, correlationId})` ajuda.

---

### 11. CI/CD — ⚠️ Parcial

| Item | Status |
|---|---|
| Workflow CI presente | ✅ |
| Lint + Test + Build rodando | ✅ (Fase 1) |
| Comenta no PR em falha | ✅ (PR #4) |
| SAST | ❌ ausente |
| DAST | ❌ ausente |
| SCA (npm audit / Dependabot) | ❌ ausente |
| Secret scanning | ❌ não habilitado em workflow (GitHub native pode estar ligado no settings — não verificado) |
| Branch protection / signed commits | ❓ não verificável via leitura de arquivos |
| `permissions:` mínimas no workflow | ⚠️ `pull-requests: write` (preciso para o auto-comment) |
| Actions pinadas | ❌ por tag (`@v4`) |

**Achados:**

- **A-04** (já listado em #3) — `npm install --legacy-peer-deps` no lugar de `npm ci`.
- **M-04** (já listado em #3) — actions por tag, não SHA.
- **M-03** (já listado em #3) — sem SCA.
- **M-18 [Médio] Sem SAST básico.** `semgrep` ou `codeql-action` rodariam em <2 min sobre o repositório pequeno.
  *Remediação:* habilitar CodeQL (gratuito para repos públicos / via Advanced Security para privados); ou rodar `semgrep --config=auto` no CI.
- **B-12 [Baixo] Sem secret scanning explícito no workflow.** GitHub Push Protection cobre, mas `trufflehog` ou `gitleaks` no CI dá segunda camada.
- **B-13 [Baixo] `pull-requests: write` é o mínimo necessário** para o comentário automático. Aceitável dado o escopo limitado. Se aumentar surface (release-please, sticky comments), reavaliar.

---

### 12. APIs e contratos externos — ⚠️ Parcial

| Item | Status |
|---|---|
| `/api/decisao` documentado | ⚠️ via comentário inline + README, sem OpenAPI |
| Rate limiting / throttling | ❌ ver A-03 |
| Versionamento (`/api/v1`) | ❌ |
| Validação de webhooks externos | N/A (sem webhooks recebidos) |
| Timeouts/retries para Anthropic | ❌ usa default do SDK |
| Retorno consistente (`{ ok: true | false, ... }`) | ✅ |
| Rejeição de método errado (405) | ✅ em `api.decisao.tsx:18` e `loader` |

**Achados:**

- **A-03** (já listado em #6) — rate limit.
- **M-19 [Médio] Sem timeout explícito na chamada Anthropic.** `extractDecisaoFromPdf` chama `client.messages.create` direto. SDK tem defaults razoáveis, mas em Worker o request inteiro pode atingir o CPU limit (30s por request em plano default; 5min com unbound). `streamTimeout = 5_000` em `entry.server.tsx` cobre só o render.
  *Remediação:* `new Anthropic({ apiKey, timeout: 120_000, maxRetries: 1 })`; documentar comportamento esperado.
- **B-14 [Baixo] Sem versionamento de API.** Cliente é único (este front), mudança breaking é safe. Anotar como decisão (`/api/decisao` vs `/api/v1/decisao`).

---

### 13. Frontend — ✅ Conforme

| Item | Status |
|---|---|
| Armazenamento de tokens | ✅ N/A — Basic Auth, sem JWT em localStorage |
| Vars de ambiente no bundle | ✅ tudo server-side (`.server.ts` enforce) |
| Clickjacking | ✅ `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| Tabnabbing | ✅ React Router 7 emite `rel="noopener"` por padrão para externos (verificar quando adicionar links externos) |
| Deps client-side | ✅ React 19 / react-router 7 / Tailwind 4 — todas atuais |
| `target="_blank"` sem `rel` | ✅ nenhum no código atual |

**Achados:**

- **B-15 [Baixo] Carregamento de Google Fonts via `<link>` cross-origin.** CSP permite (`font-src https://fonts.gstatic.com`), e o privacy-statement reconhece transferência apenas Anthropic+Cloudflare. Google Fonts adiciona Google como subprocessador implícito.
  *Remediação:* hospedar as fontes Inter via `@fontsource-variable/inter` (self-hosted), elimina a transferência e melhora performance no Worker (sem DNS lookup extra). Atualizar `PRIVACY.md §7` se mantiver Google Fonts: adicionar Google como destinatário.

---

### 14. Documentação técnica/operacional — ⚠️ Parcial

| Item | Status |
|---|---|
| Arquitetura / diagrama | ⚠️ texto no README, sem diagrama |
| ADRs (decisões arquiteturais) | ❌ |
| Runbook de incidente | ✅ `INCIDENT_RESPONSE.md` |
| Onboarding | ✅ README cobre setup local + deploy |
| Notas de operação | ✅ README explica `npm run preview` vs `npm run dev` |

**Achados:**

- **B-16 [Baixo] Sem ADRs.** Decisões importantes — "Basic Auth em vez de OIDC", "json_schema em vez de tool use no Claude", "concorrência client-side em vez de server-orchestrated" — vivem em comentários inline e PR bodies. Em 6 meses ninguém vai achar.
  *Remediação:* pasta `docs/adr/`, formato Michael Nygard. Backfill dos 4-5 mais importantes via PR.
- **B-17 [Baixo] Diagrama de arquitetura ausente.** Texto bem feito, mas um diagrama (cliente → Worker → {D1, Anthropic}) cabe em 10 linhas Mermaid no README e melhora pickup.

---

### 15. Relatório final (consolidação)

#### Achados ≥ Médio com remediação e esforço estimado

| ID | Sev | Achado | Esforço | Sprint |
|---|---|---|---|---|
| C-01 | Crítico | `insertDecisao` escreve em `raw_text` dropada pela migration 0002 | S (≤1h) | **Já** |
| A-01 | Alto | Mesmo bug visto pela ótica de runtime (rolled-up em C-01) | — | — |
| A-02 | Alto | Tipo `Decisao` e parâmetros de `insertDecisao` ainda com `raw_text` | S (≤1h) | Já |
| A-03 | Alto | Sem rate limit em `/api/decisao` — abuso de quota Anthropic | M (1d) | Esta semana |
| A-04 | Alto | CI usa `npm install --legacy-peer-deps` em vez de `npm ci` | S (≤1h) | Esta semana |
| A-05 | Alto | Modelo de identidade único compartilhado (sem RBAC) | XL (1+ sprint) | Roadmap |
| A-06 | Alto | Controlador e DPO marcados `[A DEFINIR]` — não-conformidade LGPD em prod | S (≤1h, dep. legal) | Antes do primeiro deploy externo |
| A-07 | Alto | Caminhos críticos sem teste (handler do Worker, DB, processUploadedPdf) | L (3-5d) | Próximo sprint |
| A-08 | Alto | Sem trilha de auditoria persistente | M (2d) | Fase 2 |
| M-01 | Médio | `SECURITY.md` ausente | S (≤1h) | Próximo sprint |
| M-02 | Médio | `claude.server.ts:118` pode vazar trecho de PDF no log | S (≤1h) | Esta semana |
| M-03 | Médio | Sem scanner SCA em CI (Dependabot/`npm audit`) | S (≤1h) | Esta semana |
| M-04 | Médio | Actions de CI por tag, não SHA | S (≤1h) | Próximo sprint |
| M-05 | Médio | Rotação de credencial sem cadência documentada | S (≤30min) | Próximo sprint |
| M-06 | Médio | CSRF só via Sec-Fetch-Site (sem token CSRF defense-in-depth) | M (1d) | Próximo sprint |
| M-07 | Médio | DELETE sem confirmação server-side | S (≤1h) | Próximo sprint |
| M-08 | Médio | Sem prazo de retenção operacional | M (1d, dep. legal) | Fase 2 |
| M-09 | Médio | Direitos do titular sem fluxo no produto | M (1-2d) | Fase 2 |
| M-10 | Médio | `PrivacyNotice` não linka `PRIVACY.md` real | S (≤1h) | Próximo sprint |
| M-11 | Médio | Exclusão sem trilha de auditoria (LGPD art. 18 §3º) | M (1d) | Fase 2 (depende A-08) |
| M-12 | Médio | `wrangler.jsonc` sem `[env.production]` separado | S (≤1h) | Próximo sprint |
| M-13 | Médio | Handler do Worker sem teste de integração | M (1-2d) | Próximo sprint |
| M-14 | Médio | Sem schema validation runtime (zod/valibot) | M (1d) | Próximo sprint |
| M-15 | Médio | `ErrorBoundary` mostra `error.message` em alguns paths | S (≤1h) | Próximo sprint |
| M-16 | Médio | Sem `vitest --coverage` em CI | S (≤1h) | Próximo sprint |
| M-17 | Médio | Alertas Cloudflare não configurados | S (≤2h) | Esta semana |
| M-18 | Médio | Sem SAST básico (CodeQL/semgrep) | S (≤1h) | Próximo sprint |
| M-19 | Médio | Sem timeout explícito na chamada Anthropic | S (≤30min) | Próximo sprint |

Esforços: S ≤ 1 dia; M = 1-2 dias; L = 3-5 dias; XL > 1 sprint.

#### Achados Baixos (lista compacta)

B-01 LICENSE · B-02 CONTRIBUTING · B-03 CHANGELOG · B-04 `package.json` metadados · B-05 `.dev.vars.example` sem APP_PASSWORD · B-06 realm acentuado · B-07 HSTS sem `includeSubDomains` · B-08 CSP `style-src 'unsafe-inline'` · B-09 `upload-lote.tsx` concorrência ad hoc · B-10 sem teste anti-XSS sentinela · B-11 logs sem level estruturado · B-12 sem secret scanning explícito · B-13 perm CI `pull-requests: write` (aceitável) · B-14 sem versionamento de API · B-15 Google Fonts adiciona Google como subprocessador · B-16 sem ADRs · B-17 sem diagrama de arquitetura.

---

## Anexo A — Mapa de cobertura da Fase 1 vs. estado anterior

| Bloco | Antes da Fase 1 | Pós-Fase 1 |
|---|---|---|
| 1 Estrutura | README só técnico | + PRIVACY/ROPA/INCIDENT, melhor README |
| 2 Segredos | OK | OK |
| 3 Dependências | sem CI test | + biome + vitest no CI |
| 4 Auth | Basic Auth + safeEqual (PR #8) | igual + testes |
| 5 Validação | magic bytes, sanitize (PR #8) | + testes unitários |
| 6 LGPD | nada | + 3 docs + migration 0002 + PrivacyNotice |
| 7 Configuração | headers (PR #8) | + extração para `security.ts` |
| 8 Qualidade | mínimo | + biome lint, vitest config |
| 9 Testes | nenhum | + 28 testes unitários |
| 10 Logs | console básico | + correlation ID, sem PII |
| 11 CI/CD | install→build (PR #4) | install→lint→test→build |
| 12 APIs | sem doc | sem mudança |
| 13 Frontend | OK | + PrivacyNotice dedupe |
| 14 Docs | README | + 3 docs LGPD |
| 15 Relatório | — | — |

A Fase 1 fechou o vácuo de documentação LGPD e introduziu a base de testes/lint. As lacunas restantes são predominantemente operacionais (rate limit, audit log, controlador definido) e supply chain (npm ci, SCA, SAST).

---

## Anexo B — Verificação cruzada das alegações da Fase 1

| Alegação (PR #12) | Verificação | Resultado |
|---|---|---|
| `workers/app.ts` importa de `./security` | `workers/app.ts:6 — import { checkBasicAuth, csrfCheck } from "./security"` | ✅ confirmado |
| Migration 0002 dropa `raw_text` | `migrations/0002_drop_raw_text.sql` existe e usa `ALTER TABLE … DROP COLUMN raw_text` | ✅ confirmado, mas **código de inserção não foi atualizado** (C-01) |
| `app/components/privacy-notice.tsx` dedupe | usado em `upload.tsx:3` e `upload-lote.tsx:4` | ✅ confirmado |
| `bytesToMB()` em `upload.shared.ts` dedupe | usado em `upload.server.ts`, `upload.tsx`, `upload-lote.tsx` | ✅ confirmado |
| `workers/security.ts` extraído de `workers/app.ts` | arquivo existe, `app.ts` importa dele | ✅ confirmado |
| `biome.json` linter only | `"formatter": { "enabled": false }` | ✅ confirmado |
| `vitest.config.ts` | existe, glob `**/__tests__/**/*.test.ts` | ✅ confirmado |
| 28 testes unitários | `workers/__tests__/security.test.ts` (~22 cases) + `app/lib/__tests__/{sanitize,format,upload}.test.ts` (~17 cases) — ordem de grandeza confere; conta exata depende de quantos `it` por `describe` | ✅ confirmado |
| CI roda install→lint→test→build | `.github/workflows/ci.yml` tem todos os 4 steps com `continue-on-error` + comment | ✅ confirmado |
| Controlador/DPO com placeholders | README, PRIVACY, ROPA todos mostram `[A DEFINIR]` | ✅ confirmado — risco A-06 |

A Fase 1 entregou tudo que prometeu. O único item sintomático é a migration sem atualização correspondente do código (C-01).

---

## Anexo C — Itens fora de escopo deliberados

- **Inspeção de histórico Git em todas as branches** — fora do escopo (auditoria pontual sobre `claude/lgpd-fase-1`). Recomendação: rodar `gitleaks detect --source . --no-banner` localmente e habilitar GitHub Push Protection.
- **Pentest dinâmico do Worker em produção** — não há ambiente de prod auditável no momento.
- **Avaliação dos DPAs de Anthropic e Cloudflare** — referenciados em ROPA, conteúdo jurídico não auditado.
- **Validação do schema com dados reais** — D1 não foi acessado.

Fim do relatório.
