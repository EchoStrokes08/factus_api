export function DocumentCard({ title, meta, total, onDelete, deleting }) {
  return (
    <div className="document-card">
      <div className="document-card-header">
        <span className="document-card-title">{title}</span>
        {total && <span className="document-card-total">${total}</span>}
      </div>
      {meta && <span className="document-card-meta">{meta}</span>}
      <div className="document-card-actions">
        <button type="button" onClick={onDelete} disabled={deleting}>
          {deleting ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </div>
  );
}
