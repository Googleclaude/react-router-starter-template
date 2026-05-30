# Relatório de Auditoria — `decisoes-stf`

> Data: 2026-05-24
> Escopo: branch `main`
> Auditoria: segurança (OWASP Top 10 2021, CWE/SANS Top 25 2024), privacidade (LGPD Lei 13.709/2018), qualidade de código.

## Sumário executivo

O aplicativo de catalogação de decisões STF está funcionalmente pronto e tem múltiplas camadas de segurança aplicadas (autenticação HTTP Basic, headers HTTP defensivos — CSP/COOP/CORP/HSTS — sanitização de filename, soft delete, retry com backoff na API externa). A conformidade com LGPD está parcial: bases técnicas de segurança atendem o art. 46, mas falta documentação de tratamento (PRIVACY.md), registro formal de operações (art. 37), plano de incidentes (art. 48) e aviso de transferência internacional (arts. 33-36). Riscos ativos de segurança são baixos; principais lacunas são de governança e processo.

## Achados de segurança (Trilha A — obrigatória)

| ID | Severidade | OWASP / CWE | Status |
|----|:----------:|-------------|:------:|
| Soft delete (recovery de delete acidental) | 🟡 M | CWE-693 | ✅ PR #10 |
| Retry exponencial Anthropic (transientes) | 🟡 M | A04:2021 | ✅ PR #10 |
| Content-Length pre-check (DoS upload) | 🟡 M | CWE-400 | ✅ PR #10 |
| Cache-Control nas respostas autenticadas | 🟡 M | CWE-525 | ✅ PR #10 |
| Log de erro sem payload da SDK | 🟡 M | CWE-532 | ✅ PR #10 |
| Backup export manual | 🟢 B | CWE-1283 | ✅ PR #10 |
| Documentação base legal LGPD | 🟠 A | LGPD art. 7º | ❌ Pendente |
| Log de auditoria estruturado | 🟠 A | LGPD art. 37 | ❌ Pendente |
| Plano de incidentes documentado | 🟠 A | LGPD art. 48 | ❌ Pendente |
| Coluna `raw_text` sem propósito (minimização) | 🟠 A | LGPD art. 6º, III | ❌ Pendente |
| Canal exercício de direitos do titular | 🟠 A | LGPD art. 18 | ❌ Pendente |

## Achados de eficiência (Trilha B — recomendada)

| ID | Severidade | Item | Status |
|----|:----------:|------|:------:|
| gitleaks no CI | 🟢 B | Anti-regressão de secrets | ✅ Este PR |
| `APP_PASSWORD` em `.dev.vars.example` | 🟢 B | Onboarding | ✅ Este PR |
| Testes de unidade `sanitizeFilename` | 🟠 A | Regressão | ✅ Este PR |
| Testes de unidade `hasPdfMagicBytes` | 🟠 A | Regressão | ✅ Este PR |
| Dedup `formatBytes` em rotas | 🟢 B | DRY | ❌ Pendente |
| Dedup disclaimer de privacidade | 🟢 B | DRY | ❌ Pendente |
| Prettier + ESLint configurados | 🟢 B | Padronização | ❌ Pendente |
| Drop coluna `raw_text` | 🟠 A | Mortos + LGPD | ❌ Pendente |

## Histórico de segredos comitados

Auditoria executada em `git log --all --full-history -p` com grep de padrões (`sk-ant-*`, `ghp_*`, `AKIA*`, emails, URLs com credenciais, CPF/CNPJ). **Nenhum segredo real encontrado**. Reescrita de histórico (filter-repo / BFG) **não é necessária**.

Único identificador presente no código é o `database_id` do Cloudflare D1 (`a4fd5346-2bab-4b73-8d09-ea513f4aa11a`), que pela documentação oficial da Cloudflare **não é considerado segredo** (precisa de API Token + Account ID para qualquer acesso real).

## Sumário LGPD

| Bloco | Conforme | Parcial | Não Conforme |
|-------|:--------:|:-------:|:------------:|
| Bases legais (arts. 7º, 11) | | ✅ | |
| Princípios (art. 6º) | 4 | 3 | 2 |
| Direitos do titular (art. 18) | 1 | 2 | 4 |
| Segurança e sigilo (arts. 46–49) | 3 | 3 | 0 |
| Registro de operações (art. 37) | | | ✅ |
| Incidentes (art. 48) | | | ✅ |
| Transferência internacional (arts. 33–36) | | | ✅ |

**Itens conformes:** finalidade, adequação, qualidade dos dados, criptografia em trânsito, controle de acesso, portabilidade.

**Itens não conformes:** minimização (`raw_text` sem uso), responsabilização (sem RoPA/DPO), confirmação/acesso/correção pelo titular, registro de operações, incidentes, transferência internacional.

## Checklist de validação pós-merge

- [ ] CI verde (build + typecheck + tests + gitleaks)
- [ ] Cloudflare deploy preview acessível com Basic Auth
- [ ] Upload de 1 PDF real funciona end-to-end
- [ ] `/lixeira` lista, restaura, hard-deleta corretamente
- [ ] `/admin/export` baixa JSON com todas as decisões
- [ ] Headers de resposta incluem `Cache-Control: private, no-store` em `/`
- [ ] `gitleaks` roda no CI e detecta secret de teste inserido propositalmente
- [ ] `PRIVACY.md` referenciado no README
- [ ] Aceite de transferência internacional aparece no formulário de upload

## Recomendações de processo (anti-regressão)

| Controle | Implementação |
|----------|---------------|
| SAST no CI | gitleaks (✅ este PR) + `npm audit` (pendente) |
| Pre-commit local | `.pre-commit-config.yaml` com gitleaks (pendente) |
| Branch protection | Required: build, typecheck, gitleaks, tests, 1 review |
| Política de revisão | PR template com checklist de LGPD + security |
| Rotação de credenciais | Trimestral: `APP_PASSWORD`, `ANTHROPIC_API_KEY` |
| Dependências | Dependabot configurado (default GitHub) |
