import { useEffect, useState } from 'react';
import { Ban, ExternalLink, Eye, MapPin, Trash2 } from 'lucide-react';
import { GuillocheSeal } from '../../components/Guilloche.jsx';
import { formatMoney } from './documentModel.js';

const CONFIRM_TIMEOUT_MS = 8000;

/**
 * Ficha de un documento emitido. Todas comparten la misma escala: cambia el
 * sello y la tinta segun el tipo (factura / nota credito) y el estado.
 *
 * `destructive` describe la accion irreversible disponible, si la hay:
 *   { label, verb, consequence, run }  — p. ej. Anular / Eliminar.
 * Si es null no se ofrece ninguna: nunca se muestra un boton condenado a fallar.
 */
export function DocumentCard({
  kind = 'invoice',
  label,
  folio,
  subtitle,
  reference,
  total,
  cufe,
  municipalityCode,
  isValidated,
  isSimulated,
  voidedBy,
  publicUrl,
  onView,
  destructive,
  busy,
}) {
  const [confirming, setConfirming] = useState(false);
  const isVoided = Boolean(voidedBy?.length);

  useEffect(() => {
    if (!confirming) return undefined;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <article className={`document-card ${kind} ${isVoided ? 'is-voided' : ''}`} aria-busy={busy}>
      <GuillocheSeal seed={cufe || reference || folio} size={52} className="document-seal" />

      <div className="document-main">
        <header className="document-head">
          <h3 className="document-title">
            {label} <span className="serial document-folio">{folio}</span>
          </h3>
          {total != null && <span className="document-total">{formatMoney(total)}</span>}
        </header>

        <p className="document-meta">
          {subtitle && <span className="document-customer">{subtitle}</span>}
          {reference && reference !== folio && <span className="serial document-ref">Ref. {reference}</span>}
        </p>

        <ul className="document-tags" aria-label="Estado del documento">
          {isVoided && (
            <li className="tag voided">
              Anulada · <span className="serial">{voidedBy[0]}</span>
            </li>
          )}
          {isValidated ? <li className="tag valid">Validada DIAN</li> : <li className="tag draft">Sin validar</li>}
          {isSimulated && <li className="tag mock">Simulada</li>}
          {municipalityCode && (
            <li className="tag dane" title="Código de municipio DANE DIVIPOLA">
              <MapPin size={12} strokeWidth={2} aria-hidden="true" />
              DANE <span className="serial">{municipalityCode}</span>
            </li>
          )}
        </ul>

        {cufe && (
          <p className="document-cufe serial" title={cufe}>
            <span>{kind === 'invoice' ? 'CUFE' : 'CUDE'}</span>
            {cufe}
          </p>
        )}

        {(onView || publicUrl || destructive) && (
          <div className="document-actions">
            {confirming && destructive ? (
              <div className="document-confirm" role="alertdialog" aria-label={`Confirmar: ${destructive.label}`}>
                <span>{destructive.consequence}</span>
                <button
                  type="button"
                  className="doc-btn danger solid"
                  autoFocus
                  onClick={() => {
                    setConfirming(false);
                    destructive.run();
                  }}
                >
                  Sí, {destructive.verb}
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
                    Ver
                  </button>
                )}
                {publicUrl && (
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="doc-btn">
                    <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                    Ver en Factus
                  </a>
                )}
                {destructive && (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    disabled={busy}
                    className="doc-btn danger"
                    title={destructive.consequence}
                  >
                    {destructive.verb === 'anular' ? (
                      <Ban size={14} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                    )}
                    {busy ? 'Procesando…' : destructive.label}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
