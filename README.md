# Decisões STF

Aplicativo para catalogar decisões do Supremo Tribunal Federal a partir de PDFs.
Para cada decisão enviada, o sistema:

1. Envia o PDF para o **Claude Opus 4.7** (Anthropic API).
2. Extrai dados estruturados: número do processo, classe, turma, ministro
   relator, datas, resultado, valor nominal e ementa.
3. Gera automaticamente um **resumo** e uma **tese jurídica** prontas para uso
   em peças processuais.
4. Persiste tudo em um banco **Cloudflare D1** (SQLite gerenciado).
5. Lista as decisões ordenadas pela data da decisão (mais recentes primeiro).

## Stack

- React Router v7 (SSR) sobre **Cloudflare Workers**
- **Cloudflare D1** para persistência
- **Claude Opus 4.7** via SDK oficial `@anthropic-ai/sdk` (PDF + structured outputs)
- Tailwind CSS v4

## Tratamento de dados pessoais (LGPD)

Esta aplicação trata dados pessoais (decisões judiciais públicas podem conter
nomes, CPF/CNPJ e valores de partes). Conformidade documentada em:

- [`PRIVACY.md`](./PRIVACY.md) — política de privacidade
- [`ROPA.md`](./ROPA.md) — registro de operações (art. 37)
- [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md) — playbook de incidentes (art. 48)

**Controlador**: [A DEFINIR antes de operar]
**Encarregado (DPO)**: [A DEFINIR] · e-mail: [a-definir]@exemplo.com.br
**Base legal**: art. 7º IX (legítimo interesse — pesquisa jurídica em decisões públicas).
**Transferência internacional**: PDFs vão para Anthropic (EUA); dados são armazenados
em Cloudflare D1 (EUA por padrão). Detalhes em `PRIVACY.md` §7.

## Configuração inicial

```bash
npm install

# 1) Crie o banco D1 e cole o database_id em wrangler.jsonc
wrangler d1 create decisoes-db

# 2) Aplique a migration localmente e (depois) no remoto
npm run db:migrate:local
# Para produção: npm run db:migrate

# 3) Configure a chave da Anthropic
#    Local:
cp .dev.vars.example .dev.vars   # edite e cole sua chave
#    Produção (Cloudflare):
wrangler secret put ANTHROPIC_API_KEY

# 4) Configure a senha de acesso (Basic Auth)
wrangler secret put APP_PASSWORD
```

## Desenvolvimento

**Use `npm run preview` no dia-a-dia** — é o único modo com D1 + secrets:

```bash
npm run preview
# Faz o build e roda `wrangler dev` com bindings reais
# (D1 local em .wrangler/state/, secrets de .dev.vars).
# http://localhost:8787
```

`npm run dev` (Vite + React Router HMR) é útil **apenas** para iterar em
componentes que não tocam o banco — ele não tem `context.cloudflare`,
então loaders/actions que acessam `env.DB` ou `env.ANTHROPIC_API_KEY`
vão lançar erro. Como todas as rotas atuais usam o D1, a recomendação é
ficar no `npm run preview`.

## Deploy

```bash
npm run deploy
```

## Qualidade

```bash
npm run lint     # Biome
npm run format   # Biome --write
npm test         # Vitest (testes das funções de segurança)
npm run build    # react-router build
```

## Rotas

| Rota              | Função                                                        |
| ----------------- | ------------------------------------------------------------- |
| `/`               | Lista todas as decisões, ordenadas por data DESC.             |
| `/upload`         | Formulário de upload do PDF.                                  |
| `/upload-lote`    | Upload em lote (paralelo, orquestrado no browser).            |
| `/decisao/:id`    | Detalhe: metadados, resumo, tese jurídica e ementa integral.  |
| `/api/decisao`    | (Resource route) POST multipart, usado pelo upload em lote.   |

## Schema do banco (D1)

`migrations/0001_init.sql` cria a tabela `decisoes`. A coluna `raw_text` foi
removida em `migrations/0002_drop_raw_text.sql` por minimização (LGPD art. 6º III):
ela estava reservada para auditoria mas nunca foi preenchida pela aplicação.

## Como funciona a extração

`app/lib/claude.server.ts` envia o PDF como bloco `document` (base64) numa única
chamada `messages.create` com `output_config.format = json_schema`. O schema
força o modelo a retornar exatamente os campos esperados, evitando parsing
frágil. Adaptive thinking está habilitado.

## Próximos passos sugeridos

- Migrar Basic Auth para **Cloudflare Access (OIDC)** com per-user identity.
- Audit log persistente (Fase 2 do roadmap) — habilita art. 37 plenamente.
- Paginação na listagem.
- Busca/filtro por ministro, turma, intervalo de datas.
- Exportação CSV/JSON (atende art. 18 V — portabilidade).
- Lote: envio de múltiplos PDFs — ✅ implementado em `/upload-lote`.
