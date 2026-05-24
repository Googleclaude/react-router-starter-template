# Registro de Operações de Tratamento (ROPA)

Última revisão: 2026-05-24
Conforme art. 37 da LGPD.

## Identificação

- **Controlador**: [A DEFINIR]
- **Encarregado**: [A DEFINIR] · [a-definir]@exemplo.com.br
- **Sistema**: decisoes-stf

## Operações de tratamento

| ID | Operação | Finalidade | Base legal | Tipos de dado | Origem | Retenção | Destinatários |
|----|----------|-----------|-----------|---------------|--------|----------|---------------|
| OP-01 | Recebimento de PDF | Catalogação | Art. 7º IX | Conteúdo da decisão (pode conter PII) | Upload de usuário autenticado | Enquanto necessário | Anthropic (EUA), Cloudflare (EUA) |
| OP-02 | Extração estruturada via LLM | Catalogação | Art. 7º IX | Idem OP-01 | Conteúdo do PDF | Apenas durante a chamada à API | Anthropic |
| OP-03 | Persistência em D1 | Pesquisa posterior | Art. 7º IX | Campos estruturados + ementa/resumo/tese | LLM | Enquanto necessário | Cloudflare |
| OP-04 | Listagem e detalhe | Acesso pelos usuários autenticados | Art. 7º IX | Idem OP-03 | D1 | — | — |
| OP-05 | Exclusão | Direito do titular / decisão do controlador | Art. 18, VI | — | Comando do usuário | imediata | — |

## Subprocessadores

| Subprocessador | Função | DPA |
|---|---|---|
| Anthropic, PBC | Processamento LLM | https://www.anthropic.com/legal/dpa |
| Cloudflare, Inc. | Hospedagem + D1 | https://www.cloudflare.com/cloudflare-customer-dpa/ |

## Trilha de auditoria

A partir da Fase 2, todas as operações são gravadas em `audit_log` (`migrations/0003_audit_log.sql`, a ser criada).

## Periodicidade de revisão

Trimestral, ou a cada mudança material no escopo do tratamento.
