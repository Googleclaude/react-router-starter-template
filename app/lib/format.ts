const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formata uma data ISO YYYY-MM-DD como dd/mm/aaaa.
 * Para qualquer string fora do padrão, devolve o valor original; para null/undefined, devolve "—".
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  if (!ISO_DATE_RE.test(iso)) return iso;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : dateFormatter.format(date);
}
