import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { backendClient } from '../../api/backendClient.js';
import { GuillocheSeal } from '../../components/Guilloche.jsx';
import { DocumentCard } from './DocumentCard.jsx';
import { InvoiceViewer } from './InvoiceViewer.jsx';
import { formatMoney, markVoidedInvoices, normalizeCreditNote, normalizeInvoice } from './documentModel.js';
import './HistoryPanel.css';

const NOTICE_TIMEOUT_MS = 12000;

const TABS = [
  { id: 'invoices', label: 'Facturas' },
  { id: 'creditNotes', label: 'Notas crédito' },
];

/**
 * Panel secundario (la llamada es el centro de la app) para ver, anular o
 * eliminar documentos ya emitidos sin hablar. Solo habla con backendClient.
 */
export function HistoryPanel({ refreshSignal, onActivity }) {
  const [tab, setTab] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null); // { tone, text }
  const [query, setQuery] = useState('');
  const [openInvoice, setOpenInvoice] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoiceRes, creditNoteRes] = await Promise.all([backendClient.listInvoices(), backendClient.listCreditNotes()]);
      const notes = creditNoteRes?.items ?? [];
      setCreditNotes(notes);
      setInvoices(markVoidedInvoices(invoiceRes?.items ?? [], notes));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshSignal]);

  // Los avisos de exito se retiran solos; los errores esperan a que se lean.
  useEffect(() => {
    if (!notice || notice.tone === 'error') return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  async function runAction(id, action, describe) {
    setBusyId(id);
    setNotice(null);
    try {
      const result = await action();
      setNotice(describe(result));
      onActivity?.();
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
  }

  const cancelInvoice = (view) =>
    runAction(view.identifier, () => backendClient.cancelInvoice(view.identifier), (result) => ({
      tone: result.warning ? 'warning' : 'success',
      text: [result.message, result.warning].filter(Boolean).join(' '),
    }));

  const deleteCreditNote = (view) =>
    runAction(view.identifier, () => backendClient.deleteCreditNote(view.referenceCode), (result) => ({
      tone: 'success',
      text: result.message,
    }));

  const invoiceViews = useMemo(() => invoices.map((raw) => ({ raw, view: normalizeInvoice(raw) })), [invoices]);
  const noteViews = useMemo(() => creditNotes.map(normalizeCreditNote), [creditNotes]);

  const needle = query.trim().toLowerCase();
  const matches = (...fields) => !needle || fields.some((field) => String(field ?? '').toLowerCase().includes(needle));
  const visibleInvoices = invoiceViews.filter(({ view }) =>
    matches(view.number, view.referenceCode, view.customerName, view.customerId),
  );
  const visibleNotes = noteViews.filter((note) => matches(note.number, note.referenceCode, note.billNumber, note.customerName));
  const visibleCount = tab === 'invoices' ? visibleInvoices.length : visibleNotes.length;
  const totalCount = tab === 'invoices' ? invoices.length : creditNotes.length;
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

      {totalCount > 0 && (
        <label className="history-search">
          <Search size={15} strokeWidth={2} aria-hidden="true" />
          <span className="visually-hidden">Buscar documentos</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por folio, cliente o referencia"
            autoComplete="off"
          />
        </label>
      )}

      <div className="history-notice-slot" aria-live="polite">
        {notice && (
          <div className={`history-notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso">
              <X size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
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
            <strong>No se pudieron cargar los documentos.</strong>
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

        {loadedOnce && !error && visibleCount === 0 && (
          <div className="history-empty">
            <GuillocheSeal seed={tab} size={88} />
            <p>
              {needle
                ? `Nada coincide con "${query.trim()}".`
                : tab === 'invoices'
                  ? 'Aún no hay facturas. Inicia la llamada y dile al agente qué vendiste.'
                  : 'Aún no hay notas crédito. Aparecen aquí cuando anulas una factura validada.'}
            </p>
          </div>
        )}

        {tab === 'invoices'
          ? visibleInvoices.map(({ raw, view }) => (
              <DocumentCard
                key={view.identifier}
                kind="invoice"
                label="Factura"
                folio={view.number || view.referenceCode}
                subtitle={view.customerName}
                reference={view.referenceCode}
                total={view.total}
                cufe={view.cufe}
                municipalityCode={view.municipalityCode}
                isValidated={view.isValidated}
                isSimulated={view.isSimulated}
                voidedBy={view.voidedBy}
                publicUrl={view.publicUrl}
                onView={() => setOpenInvoice(raw)}
                busy={busyId === view.identifier}
                destructive={view.isVoided ? null : invoiceAction(view, () => cancelInvoice(view))}
              />
            ))
          : visibleNotes.map((note) => (
              <DocumentCard
                key={note.identifier}
                kind="credit-note"
                label="Nota crédito"
                folio={note.number || note.referenceCode}
                subtitle={[note.billNumber && `Corrige ${note.billNumber}`, note.conceptLabel].filter(Boolean).join(' · ')}
                reference={note.referenceCode}
                total={note.total}
                cufe={note.cufe}
                isValidated={note.isValidated}
                isSimulated={note.isSimulated}
                busy={busyId === note.identifier}
                // Validada por la DIAN ya no se puede borrar: no se ofrece.
                destructive={
                  note.isValidated
                    ? null
                    : {
                        label: 'Eliminar',
                        verb: 'eliminar',
                        consequence: 'La nota no está validada: se borrará de Factus.',
                        run: () => deleteCreditNote(note),
                      }
                }
              />
            ))}
      </div>

      <InvoiceViewer invoice={openInvoice} onClose={() => setOpenInvoice(null)} />
    </div>
  );
}

function invoiceAction(view, run) {
  return view.isValidated
    ? {
        label: 'Anular',
        verb: 'anular',
        consequence: `Se emitirá ante la DIAN una nota crédito de anulación por ${formatMoney(view.total)}. No se puede deshacer.`,
        run,
      }
    : {
        label: 'Eliminar',
        verb: 'eliminar',
        consequence: 'La factura no tiene CUFE: se borrará de Factus.',
        run,
      };
}
