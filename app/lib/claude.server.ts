import { Buffer } from "node:buffer";
import Anthropic from "@anthropic-ai/sdk";
import type { DecisaoExtracted } from "./types";

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    numero_processo: {
      type: ["string", "null"],
      description: "Número do processo (ex.: RE 1.234.567/SP). null se não identificado.",
    },
    classe_processual: {
      type: ["string", "null"],
      description: "Classe processual (RE, ARE, ADI, ADPF, HC, MS, etc.).",
    },
    turma: {
      type: ["string", "null"],
      description:
        "Órgão julgador: 'Pleno', 'Primeira Turma', 'Segunda Turma', 'Decisão Monocrática', etc.",
    },
    ministro_relator: {
      type: ["string", "null"],
      description: "Nome do ministro relator (sem o prefixo 'Min.').",
    },
    data_decisao: {
      type: ["string", "null"],
      description: "Data da decisão/julgamento no formato ISO-8601 (YYYY-MM-DD).",
    },
    data_publicacao: {
      type: ["string", "null"],
      description: "Data da publicação no DJe no formato ISO-8601 (YYYY-MM-DD).",
    },
    resultado: {
      type: ["string", "null"],
      description:
        "Resultado do julgamento: 'Provido', 'Improvido', 'Parcialmente provido', 'Conhecido em parte', 'Não conhecido', 'Procedente', 'Improcedente' etc.",
    },
    valor_nominal: {
      type: ["string", "null"],
      description:
        "Valor nominal/monetário envolvido na decisão (ex.: 'R$ 1.500.000,00', '50 salários mínimos'). null se não houver.",
    },
    ementa: {
      type: ["string", "null"],
      description:
        "Ementa integral da decisão, transcrita literalmente do documento, preservando quebras de parágrafo.",
    },
    resumo: {
      type: "string",
      description:
        "Resumo objetivo da decisão em 4 a 8 linhas, em português jurídico, identificando: matéria, controvérsia, fundamentos centrais e dispositivo.",
    },
    tese_juridica: {
      type: "string",
      description:
        "Tese jurídica extraída da decisão para uso em peças processuais por quem vai ingressar com demanda análoga. Deve ser objetiva, citável, com 1 a 3 parágrafos, indicando o entendimento firmado pelo STF e os requisitos para sua aplicação. Quando houver, indique tema de repercussão geral.",
    },
  },
  required: [
    "numero_processo",
    "classe_processual",
    "turma",
    "ministro_relator",
    "data_decisao",
    "data_publicacao",
    "resultado",
    "valor_nominal",
    "ementa",
    "resumo",
    "tese_juridica",
  ],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `Você é um analista jurídico especializado em jurisprudência do Supremo Tribunal Federal.
Sua tarefa é ler decisões do STF (acórdãos, decisões monocráticas, etc.) e extrair, com precisão, os dados estruturados solicitados, além de produzir um resumo e uma tese jurídica utilizável em peças processuais.

Regras:
- Transcreva a ementa LITERALMENTE como aparece no documento, sem reescrever.
- Para datas, normalize sempre para o formato ISO YYYY-MM-DD.
- Se um campo não estiver presente no documento, retorne null (NÃO invente).
- O resumo deve ser objetivo, técnico e em português jurídico.
- A tese jurídica deve ser direta, citável e identificar a ratio decidendi. Inclua o número do tema de repercussão geral quando houver.
- Não inclua observações de sua parte fora dos campos solicitados.`;

export async function extractDecisaoFromPdf(
  apiKey: string,
  pdfBase64: string,
): Promise<DecisaoExtracted> {
  // maxRetries: 3 — o SDK já faz exponential backoff com jitter para 408,
  // 409, 429 e erros 5xx (>= 500). Picos transientes da Anthropic (rate
  // limit momentâneo, overloaded) param de derrubar uploads do lote.
  const client = new Anthropic({ apiKey, maxRetries: 3 });

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    output_config: {
      format: {
        type: "json_schema",
        schema: EXTRACTION_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: "Extraia os dados estruturados desta decisão do STF e gere o resumo e a tese jurídica conforme as instruções do sistema.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta do Claude não contém bloco de texto.");
  }

  let parsed: DecisaoExtracted;
  try {
    parsed = JSON.parse(textBlock.text) as DecisaoExtracted;
  } catch (err) {
    // Não propagamos err.message: o texto do modelo pode conter PII (nomes,
    // CPF, valores) e o SyntaxError do JSON.parse do Node embute um trecho
    // do input que falhou na mensagem. Emitimos apenas err.name + tamanho da
    // resposta como sinal operacional; o correlation ID em upload.server.ts
    // amarra o erro à requisição.
    const name = err instanceof Error ? err.name : "Error";
    throw new Error(
      `Falha ao parsear JSON retornado pelo Claude (${name}; ${textBlock.text.length} chars).`,
    );
  }

  return parsed;
}

export async function fileToBase64(file: File): Promise<string> {
  // nodejs_compat is enabled in wrangler.jsonc, so node:buffer is available
  // in the Worker runtime. Buffer's native base64 encoder is dramatically
  // faster than the JS chunked-btoa approach for files in the megabyte range.
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
