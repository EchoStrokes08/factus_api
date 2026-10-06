import { Eye } from 'lucide-react';
import { GuillocheSeal } from '../../components/Guilloche.jsx';
import { formatMoney } from './documentModel.js';

const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/** Ficha de un recaudo tal como lo devuelve Factus Pay (GET /v1/collections). */
export function CollectionCard({ collection, onView }) {
  const { referenceCode, amount, statusLabel, tone, createdAt } = collection;
  return (
    <article className="document-card collection-card">
      <GuillocheSeal seed={referenceCode} size={52} className="document-seal" />

      <div className="document-main">
        <header className="document-head">
          <h3 className="document-title">
            Recaudo <span className="serial document-folio">{referenceCode}</span>
          </h3>
          <span className="document-total">{formatMoney(amount)}</span>
        </header>

        <ul className="document-tags" aria-label="Estado del recaudo">
          <li className={`tag ${tone}`}>{statusLabel}</li>
          {createdAt && (
            <li className="tag dane">
              <time dateTime={createdAt.toISOString()}>{dateTime.format(createdAt)}</time>
            </li>
          )}
        </ul>

        <div className="document-actions">
          <button type="button" onClick={onView} className="doc-btn primary">
            <Eye size={14} strokeWidth={2} aria-hidden="true" />
            Ver cobro
          </button>
        </div>
      </div>
    </article>
  );
}
