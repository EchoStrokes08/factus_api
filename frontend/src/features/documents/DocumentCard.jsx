export function DocumentCard({
  title,
  meta,
  total,
  cufe,
  municipalityCode,
  isValidated,
  publicUrl,
  paymentUrl,
  onDelete,
  deleting,
}) {
  return (
    <div className="document-card">
      <div className="document-card-header">
        <div className="document-card-title-group">
          <span className="document-card-title">{title}</span>
          {isValidated && <span className="dian-badge">✓ Validada DIAN</span>}
        </div>
        {total && <span className="document-card-total">${total}</span>}
      </div>

      {meta && <span className="document-card-meta">{meta}</span>}

      {municipalityCode && (
        <span className="dane-tag">
          📍 DANE DIVIPOLA: <strong>{municipalityCode}</strong>
        </span>
      )}

      {cufe && (
        <div className="document-cufe" title={cufe}>
          <span className="cufe-label">CUFE:</span> {cufe.slice(0, 16)}...
        </div>
      )}

      <div className="document-card-actions">
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-link"
          >
            Ver Factura
          </a>
        )}
        {paymentUrl && (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pay"
          >
            💳 Factus Pay
          </a>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="btn-delete"
          title="Eliminar borrador o anular documento"
        >
          {deleting ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </div>
  );
}
