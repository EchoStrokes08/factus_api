import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { backendClient } from '../../api/backendClient.js';
import { GuillocheSeal } from '../../components/Guilloche.jsx';
import { DocumentCard } from './DocumentCard.jsx';
import { InvoiceViewer } from './InvoiceViewer.jsx';
import './HistoryPanel.css';

const TABS = [
  { id: 'invoices', label: 'Facturas' },
  { id: 'creditNotes', label: 'Notas crédito' },
];

/**
 * Panel secundario (no es el centro de la app) para ver y eliminar
 * facturas/notas credito ya creadas, por si el usuario no quiere hacerlo
 * por voz. Solo habla con backendClient; no conoce Factus directamente.
 */
export function HistoryPanel({ refreshSignal }) {
  const [tab, setTab] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [deletingCode, setDeletingCode] = useState(null);
  const [error, setError] = useState(null);
  const [openInvoice, setOpenInvoice] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [invoiceRes, creditNoteRes] = await Promise.all([
        backendClient.listInvoices(),
        backendClient.listCreditNotes(),
      ]);
      setInvoices(asList(invoiceRes));
      setCreditNotes(asList(creditNoteRes));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  async function removeInvoice(referenceCode) {
    setDeletingCode(referenceCode);
    try {
      await backendClient.deleteInvoice(referenceCode);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingCode(null);
    }
  }

  async function removeCreditNote(referenceCode) {
    setDeletingCode(referenceCode);
    try {
      await backendClient.deleteCreditNote(referenceCode);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingCode(null);
    }
  }

  const items = tab === 'invoices' ? invoices : creditNotes;
  const counts = { invoices: invoices.length, creditNotes: creditNotes.length };

  return (
    <div className="history-panel">
      <header className="history-head">
        <h2>Documentos</h2>
        <button
          type="button"
          className={`history-refresh ${loading ? 'is-loading' : ''}`}
          onClick={loadAll}
          disabled={loading}
          aria-label={loading ? 'Actualizando documentos' : 'Actualizar documentos'}
          title="Actualizar"
        >
          <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      <div className="history-tabs" role="tablist" aria-label="Tipo de documento">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="history-list"
            className={tab === item.id ? 'active' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            <span className="serial history-count">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      <div
        id="history-list"
        className="history-list scrollbar-thin"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        aria-busy={loading}
      >
        {error && (
          <div className="history-error" role="alert">
            <strong>No se pudieron cargar o modificar los documentos.</strong>
            <span>{error}</span>
            <button type="button" className="doc-btn" onClick={loadAll}>
              Reintentar
            </button>
          </div>
        )}

        {loading && !loadedOnce && (
          <div className="history-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}

        {loadedOnce && !loading && !error && items.length === 0 && (
          <div className="history-empty">
            <GuillocheSeal seed={tab} size={88} />
            <p>
              {tab === 'invoices'
                ? 'Aún no hay facturas. Inicia la llamada y dile al agente qué vendiste.'
                : 'Aún no hay notas crédito. Aparecen aquí cuando anulas una factura validada.'}
            </p>
          </div>
        )}

        {tab === 'invoices'
          ? invoices.map((invoice) => (
              <DocumentCard
                key={invoice.reference_code}
                kind="invoice"
                label="Factura"
                folio={invoice.number || invoice.reference_code}
                customer={invoice.customer?.names || invoice.customer?.company || 'Cliente'}
                reference={invoice.reference_code}
                total={invoice.totals?.total}
                cufe={invoice.cufe}
                municipalityCode={invoice.customer?.municipality_code}
                isValidated={invoice.is_validated}
                publicUrl={invoice.public_url || invoice.links?.public_url}
                paymentUrl={invoice.payment_url}
                onView={() => setOpenInvoice(invoice)}
                deleting={deletingCode === invoice.reference_code}
                onDelete={() => removeInvoice(invoice.reference_code)}
              />
            ))
          : creditNotes.map((note) => (
              <DocumentCard
                key={note.reference_code}
                kind="credit-note"
                label="Nota crédito"
                folio={note.number || note.reference_code}
                customer={note.bill_number ? `Factura ref. ${note.bill_number}` : null}
                reference={note.reference_code}
                total={note.totals?.total}
                cufe={note.cufe}
                isValidated={note.is_validated}
                deleting={deletingCode === note.reference_code}
                onDelete={() => removeCreditNote(note.reference_code)}
              />
            ))}
      </div>

      <InvoiceViewer invoice={openInvoice} onClose={() => setOpenInvoice(null)} />
    </div>
  );
}

// El mock devuelve { data: [...] }; Factus real pagina como { data: { data: [...] } }.
function asList(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.data) ? data.data : [];
}
