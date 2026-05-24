import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/lixeira";
import {
  hardDeleteDecisao,
  listDeletedDecisoes,
  restoreDecisao,
} from "~/lib/db.server";
import { formatDate } from "~/lib/format";

export const meta: Route.MetaFunction = () => [
  { title: "Lixeira · Decisões STF" },
];

export async function loader({ context }: Route.LoaderArgs) {
  const decisoes = await listDeletedDecisoes(context.cloudflare.env.DB);
  return { decisoes };
}

export async function action({ context, request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = form.get("intent");
  const idRaw = form.get("id");
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    throw new Response("ID inválido", { status: 400 });
  }
  if (intent === "restore") {
    await restoreDecisao(context.cloudflare.env.DB, id);
    return redirect(`/decisao/${id}`);
  }
  if (intent === "hard-delete") {
    await hardDeleteDecisao(context.cloudflare.env.DB, id);
    return redirect("/lixeira");
  }
  throw new Response("Intent desconhecido", { status: 400 });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  // SQLite datetime('now') gera "YYYY-MM-DD HH:MM:SS" em UTC.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]} UTC`;
}

export default function Lixeira({ loaderData }: Route.ComponentProps) {
  const { decisoes } = loaderData;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-slate-600 hover:underline">
        ← Voltar para a lista
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Lixeira
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {decisoes.length === 0
            ? "Nenhuma decisão removida."
            : `${decisoes.length} ${decisoes.length === 1 ? "decisão removida" : "decisões removidas"}. Restaurar volta para a lista; excluir definitivamente apaga do banco.`}
        </p>
      </header>

      {decisoes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">A lixeira está vazia.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Removido em
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Processo
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Turma
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Ministro
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Data da decisão
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {decisoes.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                    {formatDateTime(d.deleted_at)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {d.classe_processual ? `${d.classe_processual} ` : ""}
                    {d.numero_processo ?? `#${d.id}`}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.turma ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.ministro_relator ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(d.data_decisao)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Form method="post">
                        <input type="hidden" name="intent" value="restore" />
                        <input type="hidden" name="id" value={d.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
                        >
                          Restaurar
                        </button>
                      </Form>
                      <Form
                        method="post"
                        onSubmit={(e) => {
                          if (
                            !confirm(
                              "Apagar definitivamente? Esta ação não pode ser desfeita.",
                            )
                          )
                            e.preventDefault();
                        }}
                      >
                        <input
                          type="hidden"
                          name="intent"
                          value="hard-delete"
                        />
                        <input type="hidden" name="id" value={d.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          Apagar definitivamente
                        </button>
                      </Form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
