import { Link } from "react-router";
import type { Route } from "./+types/_index";
import { listDecisoes } from "~/lib/db.server";
import { formatDate } from "~/lib/format";

export const meta: Route.MetaFunction = () => [
  { title: "Decisões STF" },
  {
    name: "description",
    content: "Repositório de decisões do STF com resumo e tese jurídica.",
  },
];

export async function loader({ context }: Route.LoaderArgs) {
  const decisoes = await listDecisoes(context.cloudflare.env.DB);
  return { decisoes };
}

export default function Index({ loaderData }: Route.ComponentProps) {
  const { decisoes } = loaderData;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Decisões STF
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {decisoes.length === 0
              ? "Nenhuma decisão cadastrada ainda."
              : `${decisoes.length} ${decisoes.length === 1 ? "decisão cadastrada" : "decisões cadastradas"}, ordenadas pela data da decisão (mais recentes primeiro).`}
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
        >
          + Nova decisão (PDF)
        </Link>
      </header>

      {decisoes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">
            Nenhuma decisão ainda. Faça upload do primeiro PDF.
          </p>
          <Link
            to="/upload"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Enviar PDF
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Data</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Processo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Turma</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Ministro</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Resultado</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {decisoes.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                    {formatDate(d.data_decisao)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {d.classe_processual ? `${d.classe_processual} ` : ""}
                    {d.numero_processo ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{d.turma ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{d.ministro_relator ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{d.resultado ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{d.valor_nominal ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/decisao/${d.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      Ver →
                    </Link>
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
