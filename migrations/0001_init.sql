-- Tabela principal de decisões do STF
CREATE TABLE IF NOT EXISTS decisoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_processo TEXT,
  classe_processual TEXT,
  turma TEXT,                  -- Ex.: "Pleno", "Primeira Turma", "Segunda Turma"
  ministro_relator TEXT,
  data_decisao TEXT,           -- ISO-8601 (YYYY-MM-DD) para ordenar como string
  data_publicacao TEXT,
  resultado TEXT,              -- Ex.: "Provido", "Improvido", "Parcialmente Provido"
  valor_nominal TEXT,          -- Valor monetário envolvido (texto livre)
  ementa TEXT,                 -- Ementa integral
  resumo TEXT,                 -- Resumo gerado por IA
  tese_juridica TEXT,          -- Tese jurídica para uso em peças
  pdf_filename TEXT,
  raw_text TEXT,               -- Texto extraído do PDF (para auditoria)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índice para a listagem ordenada por data DESC
CREATE INDEX IF NOT EXISTS idx_decisoes_data_decisao
  ON decisoes (data_decisao DESC);

CREATE INDEX IF NOT EXISTS idx_decisoes_ministro
  ON decisoes (ministro_relator);

CREATE INDEX IF NOT EXISTS idx_decisoes_turma
  ON decisoes (turma);
