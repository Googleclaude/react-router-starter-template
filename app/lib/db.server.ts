import type { Decisao, DecisaoExtracted } from "./types";

export async function listDecisoes(db: D1Database): Promise<Decisao[]> {
  const { results } = await db
    .prepare(
      `SELECT id, numero_processo, classe_processual, turma, ministro_relator,
              data_decisao, data_publicacao, resultado, valor_nominal,
              ementa, resumo, tese_juridica, pdf_filename, raw_text, created_at
         FROM decisoes
        ORDER BY COALESCE(data_decisao, '0000-00-00') DESC, id DESC`,
    )
    .all<Decisao>();
  return results;
}

export async function getDecisao(
  db: D1Database,
  id: number,
): Promise<Decisao | null> {
  const result = await db
    .prepare(`SELECT * FROM decisoes WHERE id = ?`)
    .bind(id)
    .first<Decisao>();
  return result ?? null;
}

export async function insertDecisao(
  db: D1Database,
  data: DecisaoExtracted & { pdf_filename: string | null; raw_text?: string | null },
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO decisoes
        (numero_processo, classe_processual, turma, ministro_relator,
         data_decisao, data_publicacao, resultado, valor_nominal,
         ementa, resumo, tese_juridica, pdf_filename, raw_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.numero_processo,
      data.classe_processual,
      data.turma,
      data.ministro_relator,
      data.data_decisao,
      data.data_publicacao,
      data.resultado,
      data.valor_nominal,
      data.ementa,
      data.resumo,
      data.tese_juridica,
      data.pdf_filename,
      data.raw_text ?? null,
    )
    .run();

  const id = result.meta.last_row_id;
  if (typeof id !== "number") {
    throw new Error("Falha ao obter id da decisão recém-inserida.");
  }
  return id;
}

export async function deleteDecisao(db: D1Database, id: number): Promise<void> {
  await db.prepare(`DELETE FROM decisoes WHERE id = ?`).bind(id).run();
}
