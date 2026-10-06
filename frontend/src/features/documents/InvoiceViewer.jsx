import { useEffect, useRef, useState } from 'react';
import { FileDown, Printer } from 'lucide-react';
import { backendClient } from '../../api/backendClient.js';
import { GuillocheSeal } from '../../components/Guilloche.jsx';
import { CollectionPanel } from './CollectionPanel.jsx';
import { formatMoney, normalizeInvoice } from './documentModel.js';
import './InvoiceViewer.css';

/**
 * Muestra la factura dentro de la app como una hoja de papel de seguridad.
 * Si llega una fila del listado (sin items), pide el detalle a Factus
 * (GET /v2/bills/:number via backend). En modo real ofrece ademas el PDF
 * oficial de la DIAN; en ambos modos se puede imprimir.
 */
export function InvoiceViewer({ invoice, onClose }) {
  const dialogRef = useRef(null);
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    setDetail(invoice);
    setLoadError(null);
    const view = invoice ? normalizeInvoice(invoice) : null;
    if (!view || view.hasDetail || !view.identifier) return undefined;

    const controller = new AbortController();
    backendClient
      .getInvoice(view.identifier, { signal: controller.signal })
      .then((full) => setDetail({ ...full, voided_by: full.voided_by?.length ? full.voided_by : invoice.voided_by }))
      .catch((error) => error.name !== 'AbortError' && setLoadError(error.message));
    return () => controller.abort();
  }, [invoice]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (invoice && dialog && !dialog.open) dialog.showModal();
  }, [invoice]);

  if (!invoice) return null;
  const view = normalizeInvoice(detail ?? invoice);
  const loading = !view.hasDetail && !loadError;

  return (
    <dialog
      ref={dialogRef}
      className="invoice-dialog"
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && dialogRef.current.close()}
      aria-labelledby="invoice-title"
    >
      <article className={`invoice-sheet ${view.isVoided ? 'is-voided' : ''}`} aria-busy={loading}>
        {view.isVoided && (
          <p className="invoice-stamp" aria-label={`Factura anulada con la nota crédito ${view.voidedBy[0]}`}>
            Anulada
            <span className="serial">{view.voidedBy[0]}</span>
          </p>
        )}

        <header className="invoice-head">
          <GuillocheSeal seed={view.cufe || view.identifier} size={72} className="invoice-seal" />
          <div className="invoice-head-text">
            <h2 id="invoice-title" className="invoice-doc-type">
              Factura electrónica de venta
            </h2>
            <p className="invoice-number serial">{view.number || view.referenceCode}</p>
            {view.createdAt && (
              <p className="invoice-date">
                {view.createdAt.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <div className="invoice-badges">
            {view.isValidated ? (
              <span className="invoice-badge ok">Validada DIAN</span>
            ) : (
              <span className="invoice-badge draft">Sin validar</span>
            )}
            {view.isSimulated && <span className="invoice-badge mock">Simulada</span>}
          </div>
        </header>

        <section className="invoice-party">
          <span className="invoice-label">Cliente</span>
          <strong>{view.customerName}</strong>
          {(view.customerId || view.municipalityCode) && (
            <span className="invoice-muted">
              {view.customerId && <>ID <span className="serial">{view.customerId}</span></>}
              {view.customerId && view.municipalityCode && ' · '}
              {view.municipalityCode && <>Municipio DANE <span className="serial">{view.municipalityCode}</span></>}
            </span>
          )}
        </section>

        {loadError && (
          <p className="invoice-error" role="alert">
            No se pudo cargar el detalle desde Factus: {loadError}
          </p>
        )}

        {loading ? (
          <div className="invoice-loading" aria-label="Cargando detalle de la factura">
            <span />
            <span />
            <span />
          </div>
        ) : (
          view.hasDetail && <ItemsTable items={view.items} />
        )}

        <dl className="invoice-totals">
          {view.subtotal != null && (
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(view.subtotal)}</dd>
            </div>
          )}
          {view.tax != null && (
            <div>
              <dt>IVA</dt>
              <dd>{formatMoney(view.tax)}</dd>
            </div>
          )}
          <div className="grand">
            <dt>Total</dt>
            <dd>{formatMoney(view.total)}</dd>
          </div>
        </dl>

        {view.cufe && (
          <p className="invoice-cufe">
            <span className="invoice-label">CUFE · Código Único de Factura Electrónica</span>
            {view.cufe}
          </p>
        )}

        <p className="invoice-muted invoice-refs">
          {view.referenceCode && (
            <span>
              Referencia <span className="serial">{view.referenceCode}</span>
            </span>
          )}
          {view.resolution && (
            <span>
              Resolución DIAN <span className="serial">{view.resolution}</span>
            </span>
          )}
        </p>

        {view.isValidated && !view.isVoided && view.referenceCode && (
          <CollectionPanel identifier={view.referenceCode} initial={view.collection} simulated={view.isSimulated} />
        )}

        <footer className="invoice-actions">
          {view.publicUrl && (
            <a className="invoice-btn" href={view.publicUrl} target="_blank" rel="noopener noreferrer">
              Ver en Factus
            </a>
          )}
          {!view.isSimulated && view.number && (
            <a className="invoice-btn" href={backendClient.invoicePdfUrl(view.number)} target="_blank" rel="noopener noreferrer">
              <FileDown size={16} aria-hidden="true" /> PDF DIAN
            </a>
          )}
          <button type="button" className="invoice-btn" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" /> Imprimir
          </button>
          <button type="button" className="invoice-btn primary" onClick={() => dialogRef.current?.close()} autoFocus>
            Cerrar
          </button>
        </footer>
      </article>
    </dialog>
  );
}

function ItemsTable({ items }) {
  return (
    <table className="invoice-items">
      <thead>
        <tr>
          <th scope="col">Descripción</th>
          <th scope="col" className="num">
            Cant.
          </th>
          <th scope="col" className="num">
            Precio
          </th>
          <th scope="col" className="num">
            IVA
          </th>
          <th scope="col" className="num">
            Subtotal
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={`${item.name}-${index}`}>
            <td>{item.name}</td>
            <td className="num">{item.quantity}</td>
            <td className="num">{formatMoney(item.price)}</td>
            <td className="num">{item.isExcluded ? 'Excl.' : `${item.taxRate}%`}</td>
            <td className="num">{formatMoney(item.subtotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
