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

## Rotas

| Rota              | Função                                                        |
| ----------------- | ------------------------------------------------------------- |
| `/`               | Lista todas as decisões, ordenadas por data DESC.             |
| `/upload`         | Formulário de upload do PDF.                                  |
| `/decisao/:id`    | Detalhe: metadados, resumo, tese jurídica e ementa integral.  |

## Schema do banco (D1)

`migrations/0001_init.sql` cria a tabela `decisoes`:

| Coluna             | Tipo  | Descrição                                            |
| ------------------ | ----- | ---------------------------------------------------- |
| id                 | INT   | PK auto-incremento                                   |
| numero_processo    | TEXT  | ex.: 1.234.567                                       |
| classe_processual  | TEXT  | ex.: RE, ARE, ADI                                    |
| turma              | TEXT  | Pleno, Primeira Turma, Segunda Turma, Monocrática    |
| ministro_relator   | TEXT  | Nome do relator                                      |
| data_decisao       | TEXT  | ISO-8601 (YYYY-MM-DD)                                |
| data_publicacao    | TEXT  | ISO-8601                                             |
| resultado          | TEXT  | Provido / Improvido / Parcialmente Provido / etc.    |
| valor_nominal      | TEXT  | Valor monetário envolvido (texto livre)              |
| ementa             | TEXT  | Transcrição literal                                  |
| resumo             | TEXT  | Resumo gerado por IA                                 |
| tese_juridica      | TEXT  | Tese para uso em peças processuais                   |
| pdf_filename       | TEXT  | Nome do arquivo enviado                              |
| raw_text           | TEXT  | Reservado para auditoria                             |
| created_at         | TEXT  | datetime                                             |

## Como funciona a extração

`app/lib/claude.server.ts` envia o PDF como bloco `document` (base64) numa única
chamada `messages.create` com `output_config.format = json_schema`. O schema
força o modelo a retornar exatamente os campos esperados, evitando parsing
frágil. Adaptive thinking está habilitado.

## Próximos passos sugeridos

- Busca/filtro por ministro, turma, intervalo de datas.
- Exportação CSV/JSON para uso em planilhas.
- Lote: envio de múltiplos PDFs de uma vez.
- Autenticação via Cloudflare Access.
