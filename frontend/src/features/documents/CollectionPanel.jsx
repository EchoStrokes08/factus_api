import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, QrCode } from 'lucide-react';
import { backendClient } from '../../api/backendClient.js';
import { formatMoney } from './documentModel.js';

const POLL_EVERY_MS = 3000;
const MAX_POLLS = 20;

/**
 * Cobro de la factura en Factus Pay. El recaudo nace en estado `started` y
 * Factus Pay genera el QR unos segundos despues (`ready`); este panel lo
 * consulta cada pocos segundos hasta que el QR existe o el cliente pago.
 */
export function CollectionPanel({ identifier, initial, simulated }) {
  const [collection, setCollection] = useState(initial ?? null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!identifier) return undefined;
    const controller = new AbortController();
    let attempts = 0;
    let timer;

    async function poll() {
      try {
        const next = await backendClient.getCollection(identifier, { signal: controller.signal });
        setCollection(next);
        setError(null);
        attempts += 1;
        if (next.status === 'started' && attempts < MAX_POLLS) timer = setTimeout(poll, POLL_EVERY_MS);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      }
    }

    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [identifier]);

  return (
    <section className="collection" aria-labelledby="collection-title" aria-live="polite">
      <h3 id="collection-title" className="invoice-label">
        Cobro · Factus Pay
      </h3>
      <CollectionBody collection={collection} error={error} simulated={simulated} />
    </section>
  );
}

function CollectionBody({ collection, error, simulated }) {
  if (error) return <p className="collection-note">No se pudo consultar el cobro: {error}</p>;
  if (!collection) {
    return (
      <p className="collection-note">
        <LoaderCircle className="spin" size={16} aria-hidden="true" /> Consultando el cobro…
      </p>
    );
  }

  switch (collection.status) {
    case 'started':
      return (
        <p className="collection-note">
          <LoaderCircle className="spin" size={16} aria-hidden="true" /> Factus Pay está generando el QR de cobro por{' '}
          <strong>{formatMoney(collection.amount)}</strong>…
        </p>
      );
    case 'ready':
      return collection.qr ? (
        <div className="collection-ready">
          <img className="collection-qr" src={collection.qr} alt={`QR de cobro por ${formatMoney(collection.amount)}`} />
          <p>
            <strong>{formatMoney(collection.amount)}</strong>
            El cliente escanea este código con su app bancaria para pagar.
          </p>
        </div>
      ) : (
        <p className="collection-note">
          <QrCode size={16} aria-hidden="true" /> Cobro por <strong>{formatMoney(collection.amount)}</strong> listo en Factus
          Pay.{simulated ? ' En modo simulado no se genera un QR real.' : ''}
        </p>
      );
    case 'paid':
      return (
        <p className="collection-note is-paid">
          <CheckCircle2 size={16} aria-hidden="true" /> Pagada en Factus Pay: {formatMoney(collection.amount)}.
        </p>
      );
    default:
      return <p className="collection-note">{collection.reason || 'Esta factura no tiene cobro asociado.'}</p>;
  }
}
