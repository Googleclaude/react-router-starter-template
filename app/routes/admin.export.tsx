import type { Route } from "./+types/admin.export";

/**
 * Backup manual do banco. Retorna TODOS os registros (incluindo soft-deleted)
 * como JSON com Content-Disposition: attachment, pra forcar download.
 *
 * Protegido pela Basic Auth do worker (workers/app.ts) — sem auth = 401
 * antes mesmo da requisição chegar aqui. Sem rotina de backup automatico
 * no D1 Free, este é o caminho oficial pra exportar e guardar offline.
 */
export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const { results } = await db
    .prepare(
      `SELECT * FROM decisoes ORDER BY COALESCE(deleted_at, created_at) ASC, id ASC`,
    )
    .all();

  // YYYY-MM-DDTHH-MM-SS em UTC para compor o nome de arquivo. ISO usa ":"
  // que confunde alguns sistemas de arquivos / encoders de Content-Disposition.
  const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const filename = `decisoes-backup-${ts}.json`;

  const body = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      schema: "decisoes",
      count: results.length,
      decisoes: results,
    },
    null,
    2,
  );

  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Override do Cache-Control padrão do worker para garantir que cada
      // download é fresco (no-cache já estava no withSecurityHeaders, mas
      // explicitar não custa nada).
      "Cache-Control": "private, no-store",
    },
  });
}
