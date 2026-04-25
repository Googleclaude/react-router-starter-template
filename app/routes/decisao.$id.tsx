import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/decisao.$id";
import { deleteDecisao, getDecisao } from "~/lib/db.server";
import { formatDate } from "~/lib/format";

export const meta: Route.MetaFunction = ({ data }) => {
  const numero =
    (data && "decisao" in data && data.decisao?.numero_processo) || "Decisão";
  return [{ title: `${numero} · Decisões STF` }];
};

export async function loader({ context, params }: Route.LoaderArgs) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    throw new Response("ID inválido", { status: 400 });
  }
  const decisao = await getDecisao(context.cloudflare.env.DB, id);
  if (!decisao) {
    throw new Response("Decisão não encontrada", { status: 404 });
  }
  return { decisao };
}

export async function action({ context, params, request }: Route.ActionArgs) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    throw new Response("ID inválido", { status: 400 });
  }
  const form = await request.formData();
  if (form.get("intent") === "delete") {
    await deleteDecisao(context.cloudflare.env.DB, id);
    return redirect("/");
  }
  return null;
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

export default function DecisaoDetail({ loaderData }: Route.ComponentProps) {
  const { decisao } = loaderData;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-slate-600 hover:underline">
        ← Voltar para a lista
      </Link>

      <header className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {decisao.classe_processual ? `${decisao.classe_processual} ` : ""}
            {decisao.numero_processo ?? `Decisão #${decisao.id}`}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {[decisao.turma, decisao.ministro_relator]
              .filter(Boolean)
              .join(" · ") || "Metadados parciais"}
          </p>
        </div>
        <Form
          method="post"
          onSubmit={(e) => {
            if (!confirm("Excluir esta decisão?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <button
            type="submit"
            className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Excluir
          </button>
        </Form>
      </header>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Metadados
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Data da decisão" value={formatDate(decisao.data_decisao)} />
          <Field label="Data de publicação" value={formatDate(decisao.data_publicacao)} />
          <Field label="Turma" value={decisao.turma} />
          <Field label="Ministro relator" value={decisao.ministro_relator} />
          <Field label="Resultado" value={decisao.resultado} />
          <Field label="Valor nominal" value={decisao.valor_nominal} />
          <Field label="Arquivo" value={decisao.pdf_filename} />
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Resumo
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-800">
          {decisao.resumo ?? "—"}
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
          Tese jurídica (para uso em peças)
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-amber-950">
          {decisao.tese_juridica ?? "—"}
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Ementa
        </h2>
        <p className="mt-3 whitespace-pre-line font-serif text-sm leading-relaxed text-slate-800">
          {decisao.ementa ?? "—"}
        </p>
      </section>
    </main>
  );
}
