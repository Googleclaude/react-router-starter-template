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
  const client = new Anthropic({ apiKey });

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
    throw new Error(
      `Falha ao parsear JSON retornado pelo Claude: ${(err as Error).message}\nConteúdo: ${textBlock.text.slice(0, 500)}`,
    );
  }

  return parsed;
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)),
    );
  }
  return btoa(binary);
}
