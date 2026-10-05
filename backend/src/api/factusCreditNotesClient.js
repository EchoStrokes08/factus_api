import { env } from '../config/env.js';
import { createHttpClient } from './httpClientFactory.js';
import { ApiError } from '../utils/ApiError.js';
import { mockCreateCreditNote, mockDeleteCreditNote, mockListCreditNotes } from './mockData.js';

const SOURCE = 'factus.creditNotes';
const http = createHttpClient(env.factus.baseUrl);

export async function createAndValidateCreditNote(accessToken, payload) {
  if (env.mockMode) return mockCreateCreditNote(payload);

  try {
    const { data } = await http.post('/v2/credit-notes/validate', payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  } catch (error) {
    throw ApiError.fromAxiosError(error, SOURCE);
  }
}

export async function deleteCreditNoteByReference(accessToken, referenceCode) {
  if (env.mockMode) return mockDeleteCreditNote(referenceCode);

  try {
    const { data } = await http.delete(
      `/v2/credit-notes/reference/${encodeURIComponent(referenceCode)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return data;
  } catch (error) {
    throw ApiError.fromAxiosError(error, SOURCE);
  }
}

export async function listCreditNotes(accessToken, params = {}) {
  if (env.mockMode) return mockListCreditNotes();

  try {
    const { data } = await http.get('/v2/credit-notes', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });
    return data;
  } catch (error) {
    throw ApiError.fromAxiosError(error, SOURCE);
  }
}
