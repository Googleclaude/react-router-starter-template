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
  created_at: string;
};

export type DecisaoListItem = Pick<
  Decisao,
  | "id"
  | "numero_processo"
  | "classe_processual"
  | "turma"
  | "ministro_relator"
  | "data_decisao"
  | "data_publicacao"
  | "resultado"
  | "valor_nominal"
  | "pdf_filename"
  | "created_at"
>;

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
