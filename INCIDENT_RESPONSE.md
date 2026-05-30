# Resposta a Incidentes — Decisões STF

Conforme art. 48 da LGPD.

## 1. Definição

Incidente de segurança = qualquer evento que comprometa **confidencialidade, integridade ou disponibilidade** de dados pessoais tratados pelo sistema.

Exemplos:
- Acesso não autorizado ao Worker, painel Cloudflare ou banco D1.
- Vazamento da senha em `APP_PASSWORD` ou da chave em `ANTHROPIC_API_KEY`.
- Comprometimento de subprocessador (Anthropic ou Cloudflare).
- Erro de configuração que exponha dados publicamente.

## 2. Árvore de decisão

```
Houve acesso a dado pessoal por agente não autorizado?
├── Não → Registrar. Reforçar controle. Fim.
└── Sim → Há risco ou dano relevante ao titular?
         ├── Não → Documentar internamente. Avaliar comunicação preventiva.
         └── Sim → Notificar ANPD em até 2 dias úteis (art. 48).
                  Comunicar titulares em paralelo.
```

## 3. Fluxo operacional

1. **Detecção** — quem identificou abre issue interna com label `incident`.
2. **Contenção** — em até 1h:
   - `wrangler secret put APP_PASSWORD` (rotacionar);
   - Se chave da Anthropic comprometida: revogar no console + rotacionar;
   - Bloquear IP/região suspeita via WAF se aplicável.
3. **Avaliação** — em até 24h: classificar gravidade, escopo, dados envolvidos.
4. **Notificação** — em até 2 dias úteis se houver risco ao titular:
   - ANPD via gov.br/anpd;
   - Titulares afetados (e-mail ou aviso público).
5. **Erradicação e recuperação** — corrigir vulnerabilidade, restaurar serviço.
6. **Post-mortem** — em até 7 dias: `incidents/AAAAMMDD-titulo.md` com timeline, causa raiz, ações.

## 4. Template de comunicação ao titular

```
Assunto: Comunicação de incidente de segurança — Decisões STF

Prezado(a) titular,

Em [DATA], identificamos um incidente envolvendo o tratamento de dados pessoais
no sistema Decisões STF.

Natureza do incidente: [DESCRIÇÃO]
Dados envolvidos: [LISTA]
Riscos potenciais: [LISTA]
Medidas tomadas: [LISTA]
Medidas recomendadas ao titular: [LISTA]

Encarregado: [NOME], [E-MAIL]

Esta comunicação atende ao art. 48 da LGPD.
```

## 5. Alertas recomendados (a configurar)

| Métrica | Condição | Canal |
|---|---|---|
| Taxa de 5xx no Worker | > 1% em 5 min | Cloudflare Notifications → e-mail |
| Tentativas 401 | > 50 em 1 min | TODO Fase 2 (audit_log) |
| Erros de Anthropic API | > 10 em 5 min | TODO Fase 2 |

## 6. Contatos

- Encarregado: [A DEFINIR]
- Suporte Cloudflare: console.cloudflare.com → Support
- Suporte Anthropic: support@anthropic.com
- ANPD: gov.br/anpd → Comunicação de Incidente
