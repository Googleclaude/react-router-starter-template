import type {
  Decisao,
  DecisaoExtracted,
  DecisaoListItem,
  DecisaoLixeiraItem,
} from "./types";

export async function listDecisoes(
  db: D1Database,
): Promise<DecisaoListItem[]> {
  // List view doesn't need ementa/resumo/tese/raw_text — keep payload small
  // and let the query plan use idx_decisoes_data_decisao (no expression around
  // the column; SQLite places NULLs last on DESC by default). Soft-deleted
  // rows are excluded; the /lixeira route fetches them separately.
  const { results } = await db
    .prepare(
      `SELECT id, numero_processo, classe_processual, turma, ministro_relator,
              data_decisao, data_publicacao, resultado, valor_nominal,
              pdf_filename, created_at
         FROM decisoes
        WHERE deleted_at IS NULL
        ORDER BY data_decisao DESC, id DESC`,
    )
    .all<DecisaoListItem>();
  return results;
}

export async function listDeletedDecisoes(
  db: D1Database,
): Promise<DecisaoLixeiraItem[]> {
  const { results } = await db
    .prepare(
      `SELECT id, numero_processo, classe_processual, turma, ministro_relator,
              data_decisao, data_publicacao, resultado, valor_nominal,
              pdf_filename, created_at, deleted_at
         FROM decisoes
        WHERE deleted_at IS NOT NULL
        ORDER BY deleted_at DESC, id DESC`,
    )
    .all<DecisaoLixeiraItem>();
  return results;
}

export async function getDecisao(
  db: D1Database,
  id: number,
  opts?: { includeDeleted?: boolean },
): Promise<Decisao | null> {
  // Por padrão /decisao/:id não expoe registros removidos (cair como 404
  // depois do soft delete); a rota /lixeira passa includeDeleted: true.
  const sql = opts?.includeDeleted
    ? `SELECT * FROM decisoes WHERE id = ?`
    : `SELECT * FROM decisoes WHERE id = ? AND deleted_at IS NULL`;
  const result = await db.prepare(sql).bind(id).first<Decisao>();
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

/**
 * Soft delete: marca como removido. O registro continua no banco e pode ser
 * restaurado via /lixeira. Para apagar definitivamente, use hardDeleteDecisao.
 */
export async function deleteDecisao(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(`UPDATE decisoes SET deleted_at = datetime('now') WHERE id = ?`)
    .bind(id)
    .run();
}

export async function restoreDecisao(
  db: D1Database,
  id: number,
): Promise<void> {
  await db
    .prepare(`UPDATE decisoes SET deleted_at = NULL WHERE id = ?`)
    .bind(id)
    .run();
}

/**
 * Apaga permanentemente. Só deve ser chamado a partir de /lixeira em
 * registros já marcados como removidos.
 */
export async function hardDeleteDecisao(
  db: D1Database,
  id: number,
): Promise<void> {
  await db.prepare(`DELETE FROM decisoes WHERE id = ?`).bind(id).run();
}
