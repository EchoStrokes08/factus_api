import { useEffect, useState } from 'react';
import { CreditCard, ExternalLink, Eye, MapPin, Trash2 } from 'lucide-react';
import { GuillocheSeal } from '../../components/Guilloche.jsx';

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/**
 * Ficha de un documento emitido. Todas las fichas comparten la misma escala:
 * cambia el sello y la tinta segun el tipo (factura / nota credito) y el estado.
 */
export function DocumentCard({
  kind = 'invoice',
  label,
  folio,
  customer,
  reference,
  total,
  cufe,
  municipalityCode,
  isValidated,
  publicUrl,
  paymentUrl,
  onView,
  onDelete,
  deleting,
}) {
  const [confirming, setConfirming] = useState(false);
  const isMock = String(cufe || '').startsWith('mock-');
  const amount = Number(total);

  // Una factura validada no se borra: se anula emitiendo una nota credito.
  const deleteLabel = kind === 'invoice' && isValidated ? 'Anular' : 'Eliminar';
  const consequence =
    kind === 'invoice' && isValidated
      ? 'Se emitirá una nota crédito ante la DIAN.'
      : 'Se borrará el documento de Factus.';

  useEffect(() => {
    if (!confirming) return undefined;
    const timer = setTimeout(() => setConfirming(false), 6000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <article className={`document-card ${kind}`}>
      <GuillocheSeal seed={cufe || reference || folio} size={52} className="document-seal" />

      <div className="document-main">
        <header className="document-head">
          <h3 className="document-title">
            {label} <span className="serial document-folio">{folio}</span>
          </h3>
          {Number.isFinite(amount) && total != null && (
            <span className="document-total">{money.format(amount)}</span>
          )}
        </header>

        <p className="document-meta">
          {customer && <span className="document-customer">{customer}</span>}
          {reference && <span className="serial document-ref">Ref. {reference}</span>}
        </p>

        <ul className="document-tags" aria-label="Estado del documento">
          {isValidated && <li className="tag valid">Validada DIAN</li>}
          {!isValidated && <li className="tag draft">Sin validar</li>}
          {isMock && <li className="tag mock">Simulada</li>}
          {municipalityCode && (
            <li className="tag dane" title="Código de municipio DANE DIVIPOLA">
              <MapPin size={12} strokeWidth={2} aria-hidden="true" />
              DANE <span className="serial">{municipalityCode}</span>
            </li>
          )}
        </ul>

        {cufe && (
          <p className="document-cufe serial" title={cufe}>
            <span>CUFE</span>
            {cufe}
          </p>
        )}

        <div className="document-actions">
          {confirming ? (
            <div className="document-confirm" role="alert">
              <span>{consequence}</span>
              <button
                type="button"
                className="doc-btn danger solid"
                onClick={() => {
                  setConfirming(false);
                  onDelete();
                }}
              >
                Sí, {deleteLabel.toLowerCase()}
              </button>
              <button type="button" className="doc-btn" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <>
              {onView && (
                <button type="button" onClick={onView} className="doc-btn primary">
                  <Eye size={14} strokeWidth={2} aria-hidden="true" />
                  Ver factura
                </button>
              )}
              {publicUrl && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="doc-btn">
                  <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                  Ver en Factus
                </a>
              )}
              {paymentUrl && (
                <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="doc-btn pay">
                  <CreditCard size={14} strokeWidth={2} aria-hidden="true" />
                  Factus Pay
                </a>
              )}
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={deleting}
                className="doc-btn danger"
                title={kind === 'invoice' && isValidated ? 'Anular con nota crédito' : 'Eliminar documento'}
              >
                <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                {deleting ? 'Procesando…' : deleteLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
