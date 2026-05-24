# Política de Privacidade — Decisões STF

Última atualização: 2026-05-24

## 1. Controlador

O controlador dos dados pessoais tratados por esta aplicação é **[A DEFINIR pelo operador]**.

## 2. Encarregado pelo tratamento de dados (DPO / art. 41)

- **Nome**: [A DEFINIR]
- **E-mail**: [a-definir]@exemplo.com.br

## 3. Dados pessoais tratados

O sistema processa decisões do Supremo Tribunal Federal (STF) submetidas pelo usuário em formato PDF. Decisões publicadas pelo STF são, em regra, públicas, mas podem conter dados pessoais de partes (nome, CPF/CNPJ, valores envolvidos).

Campos extraídos e armazenados em D1:

| Campo | Origem | Pode conter PII? |
|---|---|---|
| número do processo, classe, turma, ministro relator, datas | Cabeçalho da decisão | Não, em regra |
| resultado, valor nominal | Dispositivo | Eventualmente |
| ementa, resumo, tese jurídica | Conteúdo | Sim (nomes de partes, valores) |
| nome do arquivo | Upload do usuário | Sanitizado (CPF/CNPJ removidos automaticamente — ver `app/lib/sanitize.ts`) |

## 4. Base legal (arts. 7º e 11 da LGPD)

O tratamento se ampara em:

- **Art. 7º, IX** — legítimo interesse do controlador para pesquisa jurídica em decisões judiciais públicas; e
- **Art. 7º, II / Art. 11, II, "g"** — quando aplicável, regular exercício de direitos em processo judicial.

A base aplicável é avaliada caso a caso pelo controlador conforme a finalidade do uso.

## 5. Finalidade

Catalogar decisões judiciais públicas do STF, gerar resumos e teses jurídicas para apoio a peças processuais por advogados e pesquisadores. **Não há decisão automatizada com efeito jurídico sobre o titular**.

## 6. Prazo de retenção

Os dados permanecem armazenados enquanto o controlador entender necessário para a finalidade descrita. O titular pode solicitar eliminação a qualquer tempo (item 8).

## 7. Compartilhamento e transferência internacional (arts. 33–36)

| Destinatário | País | Finalidade | Base de transferência |
|---|---|---|---|
| Anthropic, PBC | EUA | Processamento do PDF pelo modelo Claude para extração estruturada | Art. 33, II — cláusulas contratuais (DPA da Anthropic) |
| Cloudflare, Inc. | EUA por padrão | Armazenamento em D1 e hospedagem do Worker | Art. 33, II — DPA da Cloudflare |

O conteúdo do PDF e o nome do arquivo (sanitizado) são enviados à Anthropic. Nenhum outro dado é compartilhado externamente.

## 8. Direitos do titular (art. 18)

O titular pode solicitar:

- confirmação da existência de tratamento;
- acesso aos dados;
- correção de dados incompletos, inexatos ou desatualizados;
- anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;
- portabilidade;
- eliminação dos dados tratados;
- informação sobre compartilhamento;
- revogação do consentimento, quando aplicável.

**Canal de exercício**: e-mail do encarregado (item 2). **SLA**: até 15 dias úteis.

## 9. Segurança

Medidas técnicas em vigor (resumo — ver `workers/app.ts`):

- HTTPS forçado (HSTS + `upgrade-insecure-requests`);
- Basic Auth com senha compartilhada, comparada em **tempo constante**;
- Cabeçalhos: CSP, COOP, CORP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, X-Permitted-Cross-Domain-Policies, X-Download-Options, Referrer-Policy;
- CSRF via `Sec-Fetch-Site`;
- Validação de PDF por **magic bytes** (não confia em MIME do cliente);
- Sanitização de nome de arquivo (remoção de CPF/CNPJ/sequências longas);
- Limite de 15 MB por arquivo;
- Logs de erro com **correlation ID**, sem PII;
- D1 com criptografia em repouso gerenciada pela Cloudflare.

## 10. Incidente de segurança

Em caso de incidente envolvendo dados pessoais com risco ao titular, o controlador notificará a ANPD em até **2 dias úteis** e comunicará os titulares afetados (art. 48). Procedimento detalhado em `INCIDENT_RESPONSE.md`.

## 11. Alterações

Esta política pode ser atualizada. A data no topo indica a última revisão. Mudanças substantivas serão comunicadas.
