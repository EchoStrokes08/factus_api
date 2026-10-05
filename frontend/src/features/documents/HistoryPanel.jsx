import { useEffect, useState } from 'react';
import { backendClient } from '../../api/backendClient.js';
import { DocumentCard } from './DocumentCard.jsx';
import { InvoiceViewer } from './InvoiceViewer.jsx';
import './HistoryPanel.css';

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

  return (
    <div className="history-panel scrollbar-thin">
      <div className="history-tabs">
        <button type="button" className={tab === 'invoices' ? 'active' : ''} onClick={() => setTab('invoices')}>
          Facturas ({invoices.length})
        </button>
        <button
          type="button"
          className={tab === 'creditNotes' ? 'active' : ''}
          onClick={() => setTab('creditNotes')}
        >
          Notas credito ({creditNotes.length})
        </button>
      </div>

      <button type="button" className="history-refresh" onClick={loadAll} disabled={loading}>
        {loading ? 'Actualizando...' : 'Refrescar'}
      </button>

      {error && <div className="transcript-bubble error">{error}</div>}

      {!loading && items.length === 0 && <p className="history-empty">Aun no hay documentos aqui.</p>}

      {tab === 'invoices'
        ? invoices.map((invoice) => (
            <DocumentCard
              key={invoice.reference_code}
              title={`Factura ${invoice.number || invoice.reference_code}`}
              meta={`${invoice.customer?.names || invoice.customer?.company || 'Cliente'} · Ref: ${invoice.reference_code}`}
              total={invoice.totals?.total}
              cufe={invoice.cufe}
              municipalityCode={invoice.customer?.municipality_code}
              isValidated={invoice.is_validated}
              publicUrl={invoice.public_url || invoice.links?.public_url}
              onView={() => setOpenInvoice(invoice)}
              deleting={deletingCode === invoice.reference_code}
              onDelete={() => removeInvoice(invoice.reference_code)}
            />
          ))
        : creditNotes.map((note) => (
            <DocumentCard
              key={note.reference_code}
              title={`Nota crédito ${note.number || note.reference_code}`}
              meta={`Factura ref. ${note.bill_number} · Ref: ${note.reference_code}`}
              total={note.totals?.total}
              cufe={note.cufe}
              isValidated={note.is_validated}
              deleting={deletingCode === note.reference_code}
              onDelete={() => removeCreditNote(note.reference_code)}
            />
          ))}

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
