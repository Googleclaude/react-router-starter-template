import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/upload-lote";
import { MAX_PDF_BYTES, type ProcessResult } from "~/lib/upload.shared";

export const meta: Route.MetaFunction = () => [
  { title: "Upload em lote · Decisões STF" },
];

type ItemStatus = "pending" | "processing" | "success" | "error";
type Item = {
  key: string;
  file: File;
  status: ItemStatus;
  decisaoId?: number;
  error?: string;
};

const DEFAULT_CONCURRENCY = 3;
const MAX_CONCURRENCY = 10;

function fmtBytes(n: number): string {
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function uploadOne(file: File): Promise<ProcessResult> {
  const fd = new FormData();
  fd.append("pdf", file);
  let res: Response;
  try {
    res = await fetch("/api/decisao", { method: "POST", body: fd });
  } catch (err) {
    return {
      ok: false,
      error: `Falha de rede: ${(err as Error).message}`,
      pdf_filename: file.name,
    };
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: `Resposta inválida do servidor (HTTP ${res.status}).`,
      pdf_filename: file.name,
    };
  }
  return json as ProcessResult;
}

export default function UploadLote(_: Route.ComponentProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [concurrency, setConcurrency] = useState(DEFAULT_CONCURRENCY);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (running) return;
      const picked = Array.from(e.target.files ?? []);
      const next: Item[] = picked.map((file, i) => ({
        key: `${Date.now()}-${i}-${file.name}`,
        file,
        status:
          file.size > MAX_PDF_BYTES
            ? "error"
            : file.type && file.type !== "application/pdf"
            ? "error"
            : "pending",
        error:
          file.size > MAX_PDF_BYTES
            ? `Arquivo maior que ${fmtBytes(MAX_PDF_BYTES)}.`
            : file.type && file.type !== "application/pdf"
            ? "Não é PDF."
            : undefined,
      }));
      setItems(next);
      e.target.value = "";
    },
    [running],
  );

  const updateItem = useCallback((key: string, patch: Partial<Item>) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    );
  }, []);

  const startQueue = useCallback(async () => {
    if (running) return;
    cancelRef.current = false;
    setRunning(true);

    const pending = items.filter((it) => it.status === "pending");
    let cursor = 0;

    const worker = async () => {
      while (!cancelRef.current) {
        const idx = cursor++;
        if (idx >= pending.length) return;
        const it = pending[idx];
        updateItem(it.key, { status: "processing" });
        const result = await uploadOne(it.file);
        if (cancelRef.current) return;
        if (result.ok) {
          updateItem(it.key, { status: "success", decisaoId: result.id });
        } else {
          updateItem(it.key, { status: "error", error: result.error });
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, pending.length) },
      () => worker(),
    );
    await Promise.all(workers);
    setRunning(false);
  }, [items, concurrency, running, updateItem]);

  const cancelQueue = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const success = items.filter((i) => i.status === "success").length;
    const errored = items.filter((i) => i.status === "error").length;
    const processing = items.filter((i) => i.status === "processing").length;
    const pending = items.filter((i) => i.status === "pending").length;
    return { total, success, errored, processing, pending };
  }, [items]);

  const allDone =
    stats.total > 0 && stats.pending === 0 && stats.processing === 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-slate-600 hover:underline">
        ← Voltar para a lista
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">Upload em lote</h1>
      <p className="mt-1 text-sm text-slate-600">
        Selecione vários PDFs de decisões. O navegador vai despachar até{" "}
        <strong>{concurrency}</strong> em paralelo. Cada arquivo é processado
        de forma independente — falhas individuais não interrompem o lote.
      </p>

      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Aviso de privacidade:</strong> os PDFs enviados são processados
        pela API da Anthropic (Claude) e armazenados em banco de dados na
        Cloudflare. Não envie decisões em <em>segredo de justiça</em> ou outros
        documentos sigilosos. CPF/CNPJ no nome do arquivo são removidos
        automaticamente.
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="pdfs"
              className="block text-sm font-medium text-slate-700"
            >
              Arquivos PDF
            </label>
            <input
              id="pdfs"
              type="file"
              accept="application/pdf"
              multiple
              disabled={running}
              onChange={onPick}
              className="mt-2 block w-full cursor-pointer rounded-md border border-slate-300 bg-slate-50 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
            />
            <p className="mt-1 text-xs text-slate-500">
              Máx {fmtBytes(MAX_PDF_BYTES)} por arquivo. Sem limite na
              quantidade — só rate limits da Anthropic.
            </p>
          </div>
          <div>
            <label
              htmlFor="concurrency"
              className="block text-sm font-medium text-slate-700"
            >
              Paralelismo
            </label>
            <input
              id="concurrency"
              type="number"
              min={1}
              max={MAX_CONCURRENCY}
              value={concurrency}
              disabled={running}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n))
                  setConcurrency(Math.min(MAX_CONCURRENCY, Math.max(1, n)));
              }}
              className="mt-2 block w-24 rounded-md border border-slate-300 bg-slate-50 p-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Quantos PDFs processar ao mesmo tempo (1–{MAX_CONCURRENCY}).
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={running || stats.pending === 0}
            onClick={startQueue}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? "Processando…" : `Processar ${stats.pending} pendente(s)`}
          </button>
          {running ? (
            <button
              type="button"
              onClick={cancelQueue}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          ) : null}
          {stats.total > 0 ? (
            <span className="text-sm text-slate-600">
              {stats.success} ok · {stats.errored} erro
              {stats.processing > 0 ? ` · ${stats.processing} ativo` : ""}
              {stats.pending > 0 ? ` · ${stats.pending} aguardando` : ""}
              {" / "}
              {stats.total} total
            </span>
          ) : null}
        </div>

        {allDone ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Lote concluído. {stats.success} decisões importadas com sucesso.
            {stats.errored > 0
              ? ` ${stats.errored} falharam — veja a lista abaixo.`
              : ""}{" "}
            <Link to="/" className="font-medium underline">
              Abrir lista
            </Link>
            .
          </div>
        ) : null}
      </section>

      {items.length > 0 ? (
        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Arquivo
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Tamanho
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((it) => (
                <tr key={it.key}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {it.file.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {fmtBytes(it.file.size)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={it.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {it.status === "success" && it.decisaoId ? (
                      <Link
                        to={`/decisao/${it.decisaoId}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        Ver decisão #{it.decisaoId} →
                      </Link>
                    ) : it.status === "error" && it.error ? (
                      <span className="text-red-700">{it.error}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const styles: Record<ItemStatus, string> = {
    pending: "bg-slate-100 text-slate-700",
    processing: "bg-amber-100 text-amber-900",
    success: "bg-emerald-100 text-emerald-900",
    error: "bg-red-100 text-red-900",
  };
  const labels: Record<ItemStatus, string> = {
    pending: "Aguardando",
    processing: "Processando",
    success: "OK",
    error: "Erro",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
