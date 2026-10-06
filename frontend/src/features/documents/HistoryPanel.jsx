import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { backendClient } from '../../api/backendClient.js';
import { GuillocheSeal } from '../../components/Guilloche.jsx';
import { DocumentCard } from './DocumentCard.jsx';
import { CollectionCard } from './CollectionCard.jsx';
import { CollectionViewer } from './CollectionViewer.jsx';
import { InvoiceViewer } from './InvoiceViewer.jsx';
import {
  COLLECTION_STATUS,
  formatMoney,
  markVoidedInvoices,
  normalizeCollection,
  normalizeCreditNote,
  normalizeInvoice,
} from './documentModel.js';
import './HistoryPanel.css';

const NOTICE_TIMEOUT_MS = 12000;

const COLLECTIONS_TAB = { id: 'collections', label: 'Recaudos' };
// Facturas y notas solo se listan cuando vienen de Factus real (MOCK_MODE=false):
// en modo simulado no hay un registro que consultar.
const FACTUS_TABS = [
  { id: 'invoices', label: 'Facturas' },
  { id: 'creditNotes', label: 'Notas crédito' },
];

/**
 * Panel secundario (la llamada es el centro de la app). Los recaudos se
 * consultan siempre en Factus Pay; facturas y notas credito, en Factus,
 * solo cuando el backend no esta en modo simulado.
 */
export function HistoryPanel({ refreshSignal, onActivity, factusMock, factusPayMock }) {
  const showFactus = factusMock === false;
  const tabs = showFactus ? [COLLECTIONS_TAB, ...FACTUS_TABS] : [COLLECTIONS_TAB];

  const [tab, setTab] = useState(COLLECTIONS_TAB.id);
  const [collections, setCollections] = useState([]);
  const [collectionPage, setCollectionPage] = useState(null); // { current_page, last_page, total }
  const [invoicePage, setInvoicePage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null); // { tone, text }
  const [query, setQuery] = useState('');
  const [openInvoice, setOpenInvoice] = useState(null);
  const [openCollection, setOpenCollection] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [collectionRes, invoiceRes] = await Promise.all([
        backendClient.listCollections({ status: statusFilter }),
        showFactus ? backendClient.listOwnInvoices() : null,
      ]);
      setCollections(collectionRes?.items ?? []);
      setCollectionPage(collectionRes?.pagination ?? null);
      const ownInvoices = invoiceRes?.items ?? [];
      const notes = await notesOf(ownInvoices);
      setCreditNotes(notes);
      setInvoices(markVoidedInvoices(ownInvoices, notes));
      setInvoicePage(invoiceRes?.pagination ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [showFactus, statusFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshSignal]);

  // Si el modo cambia y la pestana activa ya no existe, se vuelve a Recaudos.
  useEffect(() => {
    if (!showFactus && tab !== COLLECTIONS_TAB.id) setTab(COLLECTIONS_TAB.id);
  }, [showFactus, tab]);

  async function loadMoreInvoices() {
    if (!invoicePage) return;
    setLoadingMore(true);
    try {
      const next = await backendClient.listOwnInvoices({ page: invoicePage.current_page + 1 });
      const more = next?.items ?? [];
      const notes = [...creditNotes, ...(await notesOf(more))];
      setCreditNotes(notes);
      setInvoices((prev) => markVoidedInvoices([...prev, ...more], notes));
      setInvoicePage(next?.pagination ?? null);
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setLoadingMore(false);
    }
  }

  async function loadMoreCollections() {
    if (!collectionPage) return;
    setLoadingMore(true);
    try {
      const next = await backendClient.listCollections({ status: statusFilter, page: collectionPage.current_page + 1 });
      setCollections((prev) => [...prev, ...(next?.items ?? [])]);
      setCollectionPage(next?.pagination ?? null);
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setLoadingMore(false);
    }
  }

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

  // Factus Pay no ordena el listado por fecha: lo mas reciente va primero.
  const collectionViews = useMemo(
    () => collections.map(normalizeCollection).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [collections],
  );
  const invoiceViews = useMemo(() => invoices.map((raw) => ({ raw, view: normalizeInvoice(raw) })), [invoices]);
  const noteViews = useMemo(() => creditNotes.map(normalizeCreditNote), [creditNotes]);

  const needle = query.trim().toLowerCase();
  const matches = (...fields) => !needle || fields.some((field) => String(field ?? '').toLowerCase().includes(needle));
  const visible = {
    collections: collectionViews.filter((item) => matches(item.referenceCode, item.statusLabel)),
    invoices: invoiceViews.filter(({ view }) => matches(view.number, view.referenceCode, view.customerName, view.customerId)),
    creditNotes: noteViews.filter((note) => matches(note.number, note.referenceCode, note.billNumber, note.customerName)),
  };
  const counts = {
    collections: collectionPage?.total ?? collections.length,
    invoices: invoices.length,
    creditNotes: creditNotes.length,
  };
  const visibleCount = visible[tab]?.length ?? 0;
  const hasMoreCollections = collectionPage && collectionPage.current_page < collectionPage.last_page;
  const hasMoreInvoices = invoicePage && invoicePage.current_page < invoicePage.last_page;

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
        {tabs.map((item) => (
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

      <div className="history-filters">
        <label className="history-search">
          <Search size={15} strokeWidth={2} aria-hidden="true" />
          <span className="visually-hidden">Buscar documentos</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === 'collections' ? 'Buscar por referencia' : 'Buscar por folio, cliente o referencia'}
            autoComplete="off"
          />
        </label>
        {tab === 'collections' && (
          <label className="history-status">
            <span className="visually-hidden">Filtrar por estado</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(COLLECTION_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

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
            <p>{emptyMessage(tab, needle ? query.trim() : '', statusFilter)}</p>
          </div>
        )}

        {tab === 'collections' && (
          <>
            {visible.collections.map((collection) => (
              <CollectionCard
                key={collection.referenceCode}
                collection={collection}
                onView={() => setOpenCollection(collection)}
              />
            ))}
            {hasMoreCollections && !needle && (
              <button type="button" className="doc-btn history-more" onClick={loadMoreCollections} disabled={loadingMore}>
                {loadingMore ? 'Cargando…' : 'Cargar más recaudos'}
              </button>
            )}
          </>
        )}

        {tab === 'invoices' &&
          visible.invoices.map(({ raw, view }) => (
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
          ))}

        {tab === 'invoices' && hasMoreInvoices && !needle && (
          <button type="button" className="doc-btn history-more" onClick={loadMoreInvoices} disabled={loadingMore}>
            {loadingMore ? 'Cargando…' : 'Cargar más facturas'}
          </button>
        )}

        {tab === 'creditNotes' &&
          visible.creditNotes.map((note) => (
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
      <CollectionViewer collection={openCollection} simulated={factusPayMock} onClose={() => setOpenCollection(null)} />
    </div>
  );
}

/**
 * Notas credito de las facturas propias, pedidas por numero exacto. El
 * listado de Factus no dice a que factura corrige cada nota: se completa aqui.
 */
async function notesOf(invoices) {
  const billByNote = new Map();
  for (const invoice of invoices) {
    for (const number of invoice.credit_note_numbers ?? []) billByNote.set(number, invoice.number);
  }
  if (!billByNote.size) return [];
  const res = await backendClient.listCreditNotesByNumbers([...billByNote.keys()]);
  return (res?.items ?? []).map((note) => ({ ...note, bill_number: note.bill_number ?? billByNote.get(note.number) }));
}

function emptyMessage(tab, search, statusFilter) {
  if (search) return `Nada coincide con "${search}".`;
  if (tab === 'collections') {
    return statusFilter
      ? `No hay recaudos en estado "${COLLECTION_STATUS[statusFilter]?.label ?? statusFilter}".`
      : 'Factus Pay aún no tiene recaudos. Se abren solos al emitir una factura de $10.000 o más.';
  }
  return tab === 'invoices'
    ? 'Aún no hay facturas. Inicia la llamada y dile al agente qué vendiste.'
    : 'Aún no hay notas crédito. Aparecen aquí cuando anulas una factura validada.';
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
