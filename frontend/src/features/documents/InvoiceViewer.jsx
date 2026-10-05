import { useEffect, useRef } from 'react';
import './InvoiceViewer.css';

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/**
 * Acepta tanto el resumen que devuelve el agente (customer.name) como la
 * factura cruda del listado (customer.names, items[].taxes) y la deja en
 * una sola forma para pintarla.
 */
export function normalizeInvoice(raw = {}) {
  const items = (raw.items || []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const taxRate = Number(item.tax_rate ?? item.taxes?.[0]?.rate ?? 0);
    return { name: item.name, quantity, price, taxRate, subtotal: quantity * price };
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = items.reduce((sum, item) => sum + item.subtotal * (item.taxRate / 100), 0);

  return {
    number: raw.number,
    referenceCode: raw.reference_code,
    cufe: raw.cufe,
    isValidated: Boolean(raw.is_validated),
    isMock: String(raw.cufe || '').startsWith('mock-'),
    createdAt: raw.created_at ? new Date(raw.created_at) : null,
    customerName: raw.customer?.name || raw.customer?.names || raw.customer?.company || 'Cliente',
    customerId: raw.customer?.identification,
    items,
    subtotal: Number(raw.totals?.gross_amount ?? subtotal),
    tax: Number(raw.totals?.tax_amount ?? tax),
    total: Number(raw.totals?.total ?? subtotal + tax),
    publicUrl: raw.public_url ?? raw.links?.public_url ?? null,
    paymentUrl: raw.payment_url ?? null,
  };
}

/**
 * Muestra la factura dentro de la app. En modo simulado Factus no genera
 * una pagina publica, asi que este visor es la forma de "ver la factura";
 * si hay enlaces reales (Factus / Factus Pay) se ofrecen ademas.
 */
export function InvoiceViewer({ invoice, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (invoice && dialog && !dialog.open) dialog.showModal();
  }, [invoice]);

  if (!invoice) return null;
  const view = normalizeInvoice(invoice);

  return (
    <dialog
      ref={dialogRef}
      className="invoice-dialog"
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && dialogRef.current.close()}
      aria-labelledby="invoice-title"
    >
      <article className="invoice-sheet">
        <header className="invoice-head">
          <div>
            <p className="invoice-kicker">Factura electrónica de venta</p>
            <h2 id="invoice-title" className="invoice-number">
              {view.number || view.referenceCode}
            </h2>
            {view.createdAt && (
              <p className="invoice-date">
                {view.createdAt.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <div className="invoice-badges">
            {view.isValidated && <span className="invoice-badge ok">Validada DIAN</span>}
            {view.isMock && <span className="invoice-badge mock">Simulada</span>}
          </div>
        </header>

        <section className="invoice-party">
          <span className="invoice-label">Cliente</span>
          <strong>{view.customerName}</strong>
          {view.customerId && <span className="invoice-muted">ID {view.customerId}</span>}
        </section>

        <table className="invoice-items">
          <thead>
            <tr>
              <th scope="col">Descripción</th>
              <th scope="col" className="num">Cant.</th>
              <th scope="col" className="num">Precio</th>
              <th scope="col" className="num">IVA</th>
              <th scope="col" className="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {view.items.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td className="num">{item.quantity}</td>
                <td className="num">{money.format(item.price)}</td>
                <td className="num">{item.taxRate}%</td>
                <td className="num">{money.format(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="invoice-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{money.format(view.subtotal)}</dd>
          </div>
          <div>
            <dt>IVA</dt>
            <dd>{money.format(view.tax)}</dd>
          </div>
          <div className="grand">
            <dt>Total</dt>
            <dd>{money.format(view.total)}</dd>
          </div>
        </dl>

        {view.cufe && (
          <p className="invoice-cufe">
            <span className="invoice-label">CUFE</span>
            {view.cufe}
          </p>
        )}
        {view.referenceCode && <p className="invoice-muted">Referencia: {view.referenceCode}</p>}

        <footer className="invoice-actions">
          {view.publicUrl && (
            <a className="invoice-btn" href={view.publicUrl} target="_blank" rel="noopener noreferrer">
              Ver en Factus
            </a>
          )}
          {view.paymentUrl && (
            <a className="invoice-btn pay" href={view.paymentUrl} target="_blank" rel="noopener noreferrer">
              Cobrar con Factus Pay
            </a>
          )}
          <button type="button" className="invoice-btn" onClick={() => window.print()}>
            Imprimir / PDF
          </button>
          <button type="button" className="invoice-btn primary" onClick={() => dialogRef.current?.close()} autoFocus>
            Cerrar
          </button>
        </footer>
      </article>
    </dialog>
  );
}
