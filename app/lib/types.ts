export type Decisao = {
  id: number;
  numero_processo: string | null;
  classe_processual: string | null;
  turma: string | null;
  ministro_relator: string | null;
  data_decisao: string | null;
  data_publicacao: string | null;
  resultado: string | null;
  valor_nominal: string | null;
  ementa: string | null;
  resumo: string | null;
  tese_juridica: string | null;
  pdf_filename: string | null;
  raw_text: string | null;
  created_at: string;
};

export type DecisaoExtracted = {
  numero_processo: string | null;
  classe_processual: string | null;
  turma: string | null;
  ministro_relator: string | null;
  data_decisao: string | null;
  data_publicacao: string | null;
  resultado: string | null;
  valor_nominal: string | null;
  ementa: string | null;
  resumo: string;
  tese_juridica: string;
};
