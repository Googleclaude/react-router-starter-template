# Política de Privacidade e Tratamento de Dados — `decisoes-stf`

> **Versão**: 0.1 (rascunho técnico)
> **Última revisão**: 2026-05-24
>
> ⚠️ Este documento é um **rascunho técnico** elaborado pelo time de desenvolvimento. Antes de uso operacional, **deve ser revisado por advogado(a) com competência em LGPD** e adequado à realidade jurídica do controlador.

## 1. Controlador

- **Nome / razão social**: [PREENCHER]
- **CNPJ ou identificação profissional (OAB)**: [PREENCHER]
- **Encarregado de dados (DPO)**: [PREENCHER — nome, email]

## 2. Categorias de dados tratados

| Categoria | Origem | Finalidade | Base legal (LGPD) |
|-----------|--------|------------|-------------------|
| Conteúdo de decisões judiciais do STF (acórdãos, decisões monocráticas) | Upload manual pelo controlador | Catalogação, extração de ementa, geração de resumo e tese jurídica para uso em peças processuais análogas | Art. 7º, IX (legítimo interesse do advogado em organizar jurisprudência pública para defesa de cliente) e/ou Art. 7º, VI (procedimentos preparatórios a contratos) |
| Identificadores eventualmente presentes em decisões (nomes de partes, ministros, advogados, números de processo) | Conteúdo do PDF | Tratamento incidental — vinculado à finalidade jurídica acima | Art. 7º, II (cumprimento de obrigação legal/regulatória do exercício da advocacia, Lei 8.906/94) e Art. 4º, IV (uso exclusivo do controlador para defesa de interesses do cliente) |
| Nome de arquivo do PDF enviado | Upload | Identificação interna da decisão; **CPF/CNPJ são removidos automaticamente antes da persistência** | — (após sanitização não é dado pessoal) |

## 3. Dados NÃO tratados

O sistema **não solicita, armazena ou processa**:
- Senha do controlador além da hash imposta por HTTP Basic Auth (a senha em si nunca é persistida)
- Dados pessoais de terceiros sem vínculo com a decisão judicial enviada
- Dados de menores de idade fora do contexto da decisão
- Categorias de dados pessoais sensíveis (art. 5º, II) **exceto quando inerentes à decisão judicial pública**

## 4. Princípios aplicados (art. 6º)

| Princípio | Aplicação |
|-----------|-----------|
| Finalidade | Catalogar jurisprudência pública para uso em peças processuais. Sem reuso para fins diversos. |
| Adequação | Tratamento limitado ao necessário para extração de ementa e tese jurídica. |
| Necessidade | Apenas decisões selecionadas pelo controlador são tratadas. Nenhuma coleta automatizada de bases externas. |
| Livre acesso | Controlador tem acesso integral via `/`, `/decisao/:id`, `/admin/export`. |
| Qualidade | Dados originados diretamente do STF (fonte oficial, autoridade pública). |
| Transparência | Este documento + disclaimer no formulário de upload. |
| Segurança | HTTPS forçado, HTTP Basic Auth com senha forte, CSP/COOP/CORP, sanitização de filename. Detalhes em `docs/AUDIT.md`. |
| Prevenção | Validação de magic bytes em uploads, rejeição de Content-Length excessivo, retry com backoff em chamadas externas. |
| Não discriminação | Geração de tese jurídica baseada em ratio decidendi pública, não em características pessoais de partes. |
| Responsabilização | Registro de auditoria estruturado (a implementar — vide `docs/AUDIT.md`). Política de rotação de credenciais. |

## 5. Compartilhamento e transferência internacional

Dados são processados por **operadores terceiros** sediados fora do Brasil:

| Operador | Função | Jurisdição | Base de transferência (art. 33) |
|----------|--------|------------|----------------------------------|
| Anthropic, PBC | Extração estruturada via API Claude | Estados Unidos | DPA padrão Anthropic; modelo no plano API **não treina com dados do cliente** |
| Cloudflare, Inc. | Hospedagem do Worker e banco D1 | Multi-jurisdição (configurável) | DPA padrão Cloudflare; criptografia em repouso AES-256 |

**Aviso ao controlador**: o uso deste sistema implica transferência internacional de conteúdo de decisão. Decisões em **segredo de justiça** (art. 189 do CPC) **não devem ser submetidas ao sistema**.

## 6. Tempo de retenção

- **Decisões cadastradas**: indeterminado até remoção pelo controlador
- **Soft-delete (lixeira)**: indeterminado até hard-delete via `/lixeira`
- **Logs do Cloudflare Workers**: política padrão da Cloudflare (ver [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/))
- **Backup manual**: responsabilidade do controlador (rota `/admin/export`)

## 7. Direitos do titular (art. 18)

Titulares de dados (partes mencionadas em decisões cadastradas) podem exercer seus direitos contatando o encarregado (DPO) indicado na seção 1. Direitos disponíveis:

- Confirmação da existência de tratamento (art. 18, I)
- Acesso aos dados (art. 18, II)
- Correção de dados (art. 18, III)
- Anonimização, bloqueio ou eliminação (art. 18, IV)
- Portabilidade (art. 18, V)
- Eliminação dos dados tratados com consentimento (art. 18, VI — quando aplicável)
- Informação sobre operadores com quem houve compartilhamento (art. 18, VII)
- Revisão de decisões automatizadas (art. 20) — **não aplicável**: o sistema não toma decisões com efeitos jurídicos sobre o titular

**Prazo de resposta**: 15 dias (art. 19, § 1º).

## 8. Incidentes

Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, o controlador notificará a ANPD em prazo razoável (art. 48) — atualmente entendido como **até 72 horas**, conforme orientação da ANPD.

Procedimento detalhado: `docs/INCIDENT_RESPONSE.md` (a elaborar).

## 9. Atualizações desta política

Mudanças materiais nesta política serão documentadas no histórico do repositório (`git log -- docs/PRIVACY.md`) e refletidas em aviso no app na próxima sessão do controlador.

---

## ⚠️ Áreas críticas a serem preenchidas antes do uso operacional

- [ ] Seção 1: identificação do controlador e DPO
- [ ] Validar com advogado(a) a base legal escolhida na seção 2
- [ ] Implementar canal real de contato com o DPO
- [ ] Implementar `docs/INCIDENT_RESPONSE.md` com fluxo de notificação à ANPD
- [ ] Implementar log de auditoria estruturado (vide `docs/AUDIT.md`)
- [ ] Reforçar disclaimer no `/upload` com aceite explícito de transferência internacional (art. 33, V)
