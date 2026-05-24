// Reutilizado em /upload e /upload-lote — qualquer ajuste no texto fica em um
// único lugar e não pode divergir entre as duas rotas.
export function PrivacyNotice() {
  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <strong>Aviso de privacidade:</strong> os PDFs enviados são processados
      pela API da Anthropic (Claude, EUA) e armazenados em banco de dados na
      Cloudflare. Não envie decisões em <em>segredo de justiça</em> ou outros
      documentos sigilosos. CPF/CNPJ no nome do arquivo são removidos
      automaticamente. Política completa em <code>PRIVACY.md</code>.
    </div>
  );
}
