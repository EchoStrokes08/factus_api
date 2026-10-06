import { useEffect, useRef } from 'react';
import { GuillocheSeal } from '../../components/Guilloche.jsx';
import { CollectionPanel } from './CollectionPanel.jsx';
import { formatMoney } from './documentModel.js';
import './InvoiceViewer.css';

/**
 * Detalle de un recaudo de Factus Pay. CollectionPanel consulta
 * GET /v1/collections/:reference_code (via backend) y pinta el QR de pago.
 */
export function CollectionViewer({ collection, simulated, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (collection && dialog && !dialog.open) dialog.showModal();
  }, [collection]);

  if (!collection) return null;

  return (
    <dialog
      ref={dialogRef}
      className="invoice-dialog"
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && dialogRef.current.close()}
      aria-labelledby="collection-viewer-title"
    >
      <article className="invoice-sheet">
        <header className="invoice-head">
          <GuillocheSeal seed={collection.referenceCode} size={72} className="invoice-seal" />
          <div className="invoice-head-text">
            <h2 id="collection-viewer-title" className="invoice-doc-type">
              Recaudo · Factus Pay
            </h2>
            <p className="invoice-number serial">{collection.referenceCode}</p>
            {collection.createdAt && (
              <p className="invoice-date">
                {collection.createdAt.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <div className="invoice-badges">
            <span className={`invoice-badge ${collection.status === 'paid' ? 'ok' : 'draft'}`}>{collection.statusLabel}</span>
          </div>
        </header>

        <dl className="invoice-totals">
          <div className="grand">
            <dt>Monto</dt>
            <dd>{formatMoney(collection.amount)}</dd>
          </div>
        </dl>

        <CollectionPanel identifier={collection.referenceCode} simulated={simulated} />

        <footer className="invoice-actions">
          <button type="button" className="invoice-btn primary" onClick={() => dialogRef.current?.close()} autoFocus>
            Cerrar
          </button>
        </footer>
      </article>
    </dialog>
  );
}
