# Factus Voz · Referencia de la API

Contrato del backend de Factus Voz y su correspondencia con **Factus API v2** y **Factus Pay v1**.

- Base local: `http://localhost:4000/api`
- Base en Vercel: `https://<tu-app>.vercel.app/api`
- Todas las respuestas son JSON con la forma `{ "status": "success", "data": … }` o `{ "status": "error", "source": "…", "message": "…", "details": … }`.
- `:identifier` acepta el **número DIAN** (`SETP990001042`) o el **código de referencia** (`FACT-20261006-FECB68C8`).

---

## 1. Resumen

| Método | Ruta | Llama a Factus / Factus Pay |
|---|---|---|
| `GET` | `/health` | — |
| `GET` | `/numbering-ranges` | `GET /v2/numbering-ranges` |
| `GET` | `/catalogs` · `/catalogs/municipalities` | — (catálogos locales DIAN/DANE) |
| `GET` | `/invoices` | `GET /v2/bills` |
| `POST` | `/invoices` | `GET /v2/numbering-ranges` (caché) → `POST /v2/bills/validate` → `POST /v1/collections` |
| `GET` | `/invoices/:identifier` | `GET /v2/bills?filter[reference_code]` → `GET /v2/bills/:number` |
| `GET` | `/invoices/:identifier/collection` | `GET /v1/collections/:reference_code` |
| `GET` | `/invoices/:identifier/pdf` | `GET /v2/bills/:number/download-pdf` |
| `DELETE` | `/invoices/:identifier` | `DELETE /v2/bills/destroy/reference/:ref` **o** `POST /v2/credit-notes/validate` (concepto 2) |
| `GET` | `/credit-notes` | `GET /v2/credit-notes` |
| `POST` | `/credit-notes` | `POST /v2/credit-notes/validate` |
| `DELETE` | `/credit-notes/:referenceCode` | `DELETE /v2/credit-notes/reference/:ref` |
| `POST` | `/agent/message` | Claude (si hay `ANTHROPIC_API_KEY`) + las anteriores vía herramientas |
| `DELETE` | `/agent/session/:sessionId` | — |

---

## 2. Sistema

### `GET /health`

```json
{ "status": "ok", "mockMode": true, "agentEngine": "fallback", "factusPay": true }
```

- `agentEngine`: `claude` (conversación libre) o `fallback` (asistente guiado).
- `factusPay`: `false` si faltan credenciales de Factus Pay (las facturas se emiten igual, sin cobro).

### `GET /numbering-ranges`

Consulta Factus en cada llamada (y refresca la caché que usa la emisión). `bill` y `creditNote` son los rangos que se enviarán como `numbering_range_id`; `null` si no hay uno usable.

```json
{
  "status": "success",
  "data": {
    "bill": {
      "id": 8,
      "document": "Factura electrónica de venta",
      "document_code": null,
      "prefix": "SETP",
      "resolution_number": "18760000001",
      "from": 990000000,
      "to": 995000000,
      "current": 990001042,
      "remaining": 4998959,
      "start_date": "2025-01-01",
      "end_date": "2028-10-06",
      "is_active": true,
      "is_expired": false,
      "is_deleted": false
    },
    "creditNote": { "id": 9, "document": "Nota Crédito", "prefix": "NC", "…": "…" },
    "active": [ "…todos los rangos activos normalizados…" ]
  }
}
```

**Regla de elección:** documento correcto (código `21`/`22` o nombre), activo, no vencido, no eliminado, vigente por fechas y con folios libres; si hay varios, el de `end_date` más lejana. `FACTUS_BILL_RANGE_ID` / `FACTUS_CREDIT_NOTE_RANGE_ID` lo fuerzan.

---

## 3. Facturas

### Vista de factura (`InvoiceView`)

Todas las rutas de facturas devuelven esta forma, venga de donde venga la respuesta de Factus:

```json
{
  "number": "SETP990001042",
  "reference_code": "FACT-20261006-FECB68C8",
  "prefix": "SETP",
  "cufe": "9b12a84e…",
  "is_validated": true,
  "created_at": "2026-10-06T01:03:43.937Z",
  "validated_at": "2026-10-06T01:03:43.937Z",
  "customer": { "name": "Ana Pérez", "identification": "1020304050", "email": null, "municipality_code": "05001" },
  "items": [
    {
      "code_reference": "ITEM-1", "name": "Asesoría", "quantity": 2, "price": 50000,
      "discount_rate": 0, "tax_rate": 19, "tax_code": "01", "is_excluded": false,
      "unit_measure_code": "94", "standard_code": "999"
    }
  ],
  "totals": { "subtotal": 130000, "tax": 20500, "total": 150500 },
  "numbering_range": { "prefix": "SETP", "resolution_number": "18760000001" },
  "voided_by": [],
  "public_url": null,
  "dian_qr": null,
  "simulated": false
}
```

- `voided_by`: números de las notas crédito de anulación (concepto 2) que la anulan.
- En los listados `items` viene vacío y `subtotal`/`tax` en `null` (Factus no los incluye); el detalle los trae completos.
- `simulated`: `true` en `MOCK_MODE`.

### `POST /invoices` — emitir

```json
{
  "reference_code": "FACT-2026-001",
  "observation": "Venta de servicios",
  "customer": {
    "identification": "901234567",
    "dv": "3",
    "company": "Tecnología e Innovación S.A.S.",
    "email": "facturacion@tecnologia.co",
    "address": "Calle 100 # 15-20",
    "city": "Medellín"
  },
  "items": [
    { "name": "Licencia anual", "quantity": 1, "price": 250000, "tax_rate": 19 },
    { "name": "Libro técnico", "quantity": 1, "price": 30000, "tax_rate": 5 }
  ],
  "payment": { "payment_form": "1", "payment_method_code": "42" }
}
```

| Campo | Regla |
|---|---|
| `reference_code` | Opcional. Si se omite se genera `FACT-AAAAMMDD-XXXXXXXX`. Repetirlo devuelve la misma factura (idempotente). |
| `customer.identification` | Obligatorio. Se limpian puntos y guiones. |
| `customer.names` / `company` | Uno de los dos. Con `company` se asume persona jurídica y NIT (`31`); si no, natural y cédula (`13`). `identification_document_code` lo sobrescribe. |
| `customer.city` / `municipality_code` | Opcional. Texto ("Medellín") o código DANE; uno desconocido se omite. |
| `items[].price` | Precio unitario **sin IVA**, mayor que cero. |
| `items[].tax_rate` | 0, 5 o 19 (por defecto 19). `is_excluded: true` para excluidos. |
| `payment.payment_form` | `1` contado, `2` crédito (se añade `due_date` a 30 días). |
| `payment.payment_method_code` | `10` efectivo, `42` transferencia, `48` tarjeta crédito, `49` tarjeta débito. |
| `numbering_range_id` | Opcional; normalmente se resuelve solo. |

Respuesta `201`:

```json
{
  "status": "success",
  "data": {
    "invoice": { "…": "InvoiceView" },
    "collection": {
      "status": "started",
      "reference_code": "FACT-2026-001",
      "amount": 329000,
      "created_at": "2026-10-06T01:03:43.938Z",
      "qr": null,
      "reason": null
    }
  }
}
```

`collection.status`:

| Valor | Significado |
|---|---|
| `started` | Factus Pay creó el recaudo y está generando el QR. |
| `ready` | Hay QR (`qr` es un `data:image/png;base64,…`). |
| `paid` | El cliente ya pagó. |
| `skipped` | Monto fuera de $10.000 – $12.000.000 (límite de Factus Pay). `reason` lo explica. |
| `disabled` | Factus Pay no está configurado. |
| `error` | Factus Pay falló; la factura **sí** quedó emitida. |

### `GET /invoices`

Query opcional: `reference_code`, `number`, `identification`, `names`, `prefix`, `status` (`1` validadas, `0` pendientes), `page`. Se traducen a `filter[...]` de Factus; nada más se reenvía.

```json
{ "status": "success", "data": { "items": [ "InvoiceView…" ], "pagination": { "total": 3, "current_page": 1, "last_page": 1, "…": "…" } } }
```

### `GET /invoices/:identifier`

Detalle completo (`InvoiceView` con ítems). `404` si no existe ni como referencia ni como número.

### `GET /invoices/:identifier/collection`

Estado actual del cobro (misma forma que `collection` arriba). Si la factura no tiene cobro: `{ "status": "none", "reason": "Esta factura no tiene un cobro abierto en Factus Pay." }`.

### `GET /invoices/:identifier/pdf`

Devuelve `application/pdf` (decodificado de `pdf_base_64_encoded`). En modo simulado responde `501`.

### `DELETE /invoices/:identifier` — eliminar o anular

| Situación | Acción en Factus | `outcome` |
|---|---|---|
| Sin CUFE / no validada | `DELETE /v2/bills/destroy/reference/:ref` | `deleted` |
| Validada por la DIAN | `POST /v2/credit-notes/validate` con `correction_concept_code: "2"`, `customization_id: "20"`, `bill_number`, mismos ítems y total, `reference_code: "ANUL-<ref>"` | `voided` |
| Ya anulada | Nada | `already_voided` |

```json
{
  "status": "success",
  "data": {
    "outcome": "voided",
    "message": "La factura SETP990001042 quedó anulada ante la DIAN con la nota crédito NC518.",
    "invoice": { "…": "InvoiceView con voided_by: [\"NC518\"]" },
    "creditNote": {
      "number": "NC518",
      "reference_code": "ANUL-FACT-20261006-FECB68C8",
      "bill_number": "SETP990001042",
      "cufe": "…",
      "is_validated": true,
      "concept_code": "2",
      "concept_label": "Anulación de factura",
      "totals": { "subtotal": 130000, "tax": 20500, "total": 150500 },
      "simulated": false
    },
    "warning": null
  }
}
```

`warning` trae texto si el cobro de Factus Pay ya estaba pagado (hay que devolver el dinero). Si Factus responde `409/422` al destruir porque la DIAN la validó en el intermedio, se reconsulta y se anula.

---

## 4. Notas crédito

### `POST /credit-notes` — nota parcial

```json
{
  "bill_number": "SETP990001042",
  "correction_concept_code": "1",
  "observation": "Devolución de un libro",
  "items": [ { "name": "Libro técnico", "quantity": 1, "price": 30000, "tax_rate": 5 } ],
  "payment": { "payment_method_code": "10" }
}
```

Conceptos DIAN (Anexo técnico 1.9): `1` devolución parcial, `2` anulación, `3` rebaja o descuento, `4` ajuste de precio, `5` descuento por pronto pago, `6` descuento por volumen. Para anular la factura completa usa `DELETE /invoices/:identifier`, que arma la nota a partir del detalle real. `customer` es opcional: si se omite, Factus usa el de la factura.

Respuesta `201`: la vista de nota crédito (`number`, `reference_code`, `bill_number`, `cufe`, `is_validated`, `concept_code`, `concept_label`, `customer`, `items`, `totals`, `simulated`).

### `GET /credit-notes`

Mismos filtros que facturas. `{ "items": [ … ], "pagination": … }`.

### `DELETE /credit-notes/:referenceCode`

Solo para notas sin validar. Una validada responde:

```json
{
  "status": "error",
  "source": "creditNoteService",
  "message": "La nota crédito NC518 ya fue validada por la DIAN: la ley no permite eliminarla. Si necesitas revertirla, emite una nota débito."
}
```

---

## 5. Agente

### `POST /agent/message`

```json
{ "sessionId": "b4e872d1-…", "text": "Factura para María Gómez, cédula 52123456", "state": { "…": "estado devuelto en el turno anterior" } }
```

Respuesta:

```json
{
  "status": "success",
  "data": {
    "reply": "Listo, María Gómez con cédula 52123456. ¿En qué ciudad está?",
    "engine": "claude",
    "draft": { "customer": { "names": "María Gómez", "identification": "52123456" }, "items": [], "payment": {} },
    "document": null,
    "state": { "messages": [ "…" ], "draft": { "…": "…" }, "flowStep": null, "flowData": null }
  }
}
```

- `state` se reenvía en el siguiente turno: el backend es *stateless* (apto para serverless).
- `document` trae la `InvoiceView` (con `collection`) cuando en ese turno se emitió o anuló una factura.
- Herramientas del agente: `update_customer`, `add_item`, `remove_item`, `set_payment_method`, `get_draft_summary`, `create_invoice`, `create_credit_note` (parcial), `delete_invoice` (elimina o anula), `delete_credit_note`, `start_over`. Si una herramienta falla, el error vuelve a Claude como `tool_result` con `is_error: true` y el agente lo explica en lugar de cortar la llamada.
- Asistente guiado (sin clave): entiende "anular factura SETP…", "eliminar nota crédito NC-…", "resumen" y "cancelar" en cualquier momento.

---

## 6. Errores

| HTTP | `source` típico | Cuándo |
|---|---|---|
| 400 | `documentBuilder`, `invoiceService`, `creditNoteService`, `app` | Faltan datos, precio inválido, JSON mal formado. |
| 404 | `invoiceService`, `factus.*` | Documento inexistente. |
| 409 | `numberingRangeService`, `creditNoteService`, `factus.*` | Sin rango de facturas usable; borrar un documento validado. |
| 413 | `app` | Cuerpo demasiado grande (>1 MB). |
| 422 | `factus.bills`, `factus.creditNotes` | Rechazo de validación de Factus/DIAN; `message` incluye la primera regla incumplida y `details` la respuesta completa. |
| 501 | `factus.sandbox` | PDF pedido en modo simulado. |
| 503 | `config` | Faltan variables de entorno de Factus en modo real. |
| 504 | `factus.*`, `factusPay.*` | Factus no respondió a tiempo. |

---

## 7. cURL rápido

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/numbering-ranges

curl -X POST http://localhost:4000/api/invoices -H "Content-Type: application/json" -d '{
  "customer": { "names": "Ana Pérez", "identification": "1020304050", "city": "Medellín" },
  "items": [ { "name": "Asesoría", "price": 50000, "quantity": 2 } ]
}'

curl http://localhost:4000/api/invoices/SETP990001042/collection
curl -X DELETE http://localhost:4000/api/invoices/SETP990001042   # anula (concepto 2)
curl -X DELETE http://localhost:4000/api/invoices/SETP990001042   # already_voided, sin duplicar
```
