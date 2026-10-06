import * as collectionsApi from '../api/factusPayCollectionsClient.js';
import { withFactusPayToken } from './tokenManager.js';
import { toCollectionView } from './mappers/factusMapper.js';
import { COLLECTION_AMOUNT_LIMITS } from '../config/catalogs.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Recaudos de Factus Pay asociados a cada factura (mismo reference_code).
 *
 * Regla de oro: el cobro NUNCA tumba la factura. Para cuando se abre el
 * recaudo la factura ya esta validada ante la DIAN; si Factus Pay no esta
 * configurado, el monto esta fuera de sus limites o el servicio falla, se
 * devuelve un estado explicito (`disabled`, `skipped`, `error`) que la
 * interfaz muestra, en vez de un 500 que haria creer que no hubo factura.
 */

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function isEnabled() {
  return env.factusPay.mockMode || Boolean(env.factusPay.email && env.factusPay.password);
}

export async function openCollection(referenceCode, amount) {
  if (!isEnabled()) return unavailable('disabled', 'Factus Pay no está configurado en el servidor.');

  const { min, max } = COLLECTION_AMOUNT_LIMITS;
  if (amount < min || amount > max) {
    return unavailable('skipped', `Factus Pay solo cobra montos entre ${money.format(min)} y ${money.format(max)}.`);
  }

  try {
    const response = await withFactusPayToken((token) => collectionsApi.create(token, { reference_code: referenceCode, amount }));
    return toCollectionView(response);
  } catch (error) {
    logger.warn('collectionService', `No se pudo abrir el recaudo de ${referenceCode}`, error.message);
    return unavailable('error', `Factus Pay no abrió el cobro: ${error.message}`);
  }
}

/** Estado actual del recaudo (el QR aparece cuando pasa a `ready`). */
export async function getCollection(referenceCode) {
  if (!isEnabled()) return unavailable('disabled', 'Factus Pay no está configurado en el servidor.');
  try {
    return toCollectionView(await withFactusPayToken((token) => collectionsApi.get(token, referenceCode)));
  } catch (error) {
    if (error.statusCode === 404) return unavailable('none', 'Esta factura no tiene un cobro abierto en Factus Pay.');
    throw error;
  }
}

const COLLECTION_STATUSES = ['started', 'ready', 'paid', 'failed', 'rejected'];

/** Recaudos de la cuenta, tal como los muestra el panel de Factus Pay. */
export async function listCollections({ status, reference_code, page } = {}) {
  if (!isEnabled()) return { items: [], pagination: null, enabled: false };
  const params = {};
  if (COLLECTION_STATUSES.includes(status)) params.status = status;
  if (reference_code) params.reference_code = String(reference_code).slice(0, 100);
  if (Number.isInteger(Number(page)) && Number(page) > 0) params.page = Number(page);

  const response = await withFactusPayToken((token) => collectionsApi.list(token, params));
  const rows = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta ?? null;
  return {
    items: rows.map(toCollectionView),
    pagination: meta && { current_page: meta.current_page, last_page: meta.last_page, per_page: meta.per_page, total: meta.total },
    enabled: true,
  };
}

function unavailable(status, reason) {
  return { status, reference_code: null, amount: null, created_at: null, qr: null, reason };
}
