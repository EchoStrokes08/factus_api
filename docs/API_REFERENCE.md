# Factus Voz: Especificación y Referencia de APIs

Esta especificación documenta detalladamente todos los endpoints expuestos por el backend de **Factus Voz**, así como la interacción y consumo de las APIs de **Factus v2** y **Factus Pay v1**.

---

## 1. Arquitectura de Endpoints del Backend

Base URL local: `http://localhost:4000/api`  
Base URL producción (Vercel): `https://<tu-app>.vercel.app/api`

### Resumen de Rutas

| Método | Endpoint | Descripción | Consumo Externo |
|---|---|---|---|
| `GET` | `/health` | Diagnóstico del backend y estado de `MOCK_MODE` | N/A |
| `GET` | `/catalogs/municipalities` | Lista de municipios con codificación DANE DIVIPOLA | DANE / DIAN |
| `GET` | `/catalogs/payment-methods` | Catálogo de medios y formas de pago DIAN | DIAN |
| `GET` | `/invoices` | Listar facturas electrónicas emitidas | Factus API `/v2/bills` |
| `POST` | `/invoices` | Crear factura electrónica validada ante DIAN + recaudo Factus Pay | Factus `/v2/bills/validate` + Pay `/v1/collections` |
| `GET` | `/invoices/:referenceCode` | Consultar detalle de una factura, CUFE, QR y recaudo | Factus API `/v2/bills` |
| `DELETE` | `/invoices/:referenceCode` | Eliminar factura borrador o anular con Nota Crédito si está validada | Factus `/v2/bills/destroy` o `/v2/credit-notes` |
| `GET` | `/credit-notes` | Listar notas crédito emitidas | Factus API `/v2/credit-notes` |
| `POST` | `/credit-notes` | Crear y validar nota crédito ante la DIAN | Factus `/v2/credit-notes/validate` |
| `DELETE` | `/credit-notes/:referenceCode`| Eliminar nota crédito no validada | Factus `/v2/credit-notes/destroy` |
| `POST` | `/agent/message` | Enviar mensaje en lenguaje natural al asistente de voz | Claude / Fallback Engine |
| `DELETE`| `/agent/session/:sessionId` | Finalizar sesión conversacional y liberar borrador | N/A |

---

## 2. Especificación Detallada de Endpoints

### 2.1 Catálogo DANE DIVIPOLA: `GET /catalogs/municipalities`
Devuelve los municipios principales de Colombia con su respectivo código oficial de 5 dígitos del DANE (DIVIPOLA), departamento y país.

**Respuesta exitosa (`200 OK`):**
```json
{
  "status": "success",
  "data": [
    {
      "code": "11001",
      "name": "Bogotá D.C.",
      "department": "Bogotá D.C.",
      "country_code": "CO"
    },
    {
      "code": "05001",
      "name": "Medellín",
      "department": "Antioquia",
      "country_code": "CO"
    },
    {
      "code": "76001",
      "name": "Cali",
      "department": "Valle del Cauca",
      "country_code": "CO"
    },
    {
      "code": "08001",
      "name": "Barranquilla",
      "department": "Atlántico",
      "country_code": "CO"
    },
    {
      "code": "68001",
      "name": "Bucaramanga",
      "department": "Santander",
      "country_code": "CO"
    }
  ]
}
```

---

### 2.2 Crear Factura Electrónica: `POST /invoices`
Crea el documento, valida el esquema tributario colombiano (código DANE DIVIPOLA, IVA, formas de pago), transmite la factura a **Factus API** para validación síncrona ante la **DIAN**, y registra automáticamente el recaudo en **Factus Pay**.

**Headers:**
```http
Content-Type: application/json
```

**Request Body (JSON):**
```json
{
  "reference_code": "FACT-2026-001",
  "observation": "Venta de servicios de consultoria y software",
  "customer": {
    "identification": "901234567",
    "dv": "3",
    "identification_document_code": "31",
    "company": "Tecnologia e Innovacion S.A.S.",
    "names": "Carlos Rodriguez",
    "email": "facturacion@tecnologia.co",
    "phone": "3101234567",
    "address": "Calle 100 # 15-20 Of 502",
    "municipality_code": "11001",
    "country_code": "CO"
  },
  "items": [
    {
      "code_reference": "SRV-01",
      "name": "Licencia Software Facturacion Cloud",
      "quantity": 1,
      "price": 250000.00,
      "tax_rate": 19
    },
    {
      "code_reference": "SRV-02",
      "name": "Capacitacion y Despliegue",
      "quantity": 2,
      "price": 50000.00,
      "tax_rate": 19
    }
  ],
  "payment": {
    "payment_form": "1",
    "payment_method_code": "10"
  }
}
```

**Respuesta Exitosa (`201 Created`):**
```json
{
  "status": "success",
  "data": {
    "invoice": {
      "status": "success",
      "message": "Factura creada y validada",
      "data": {
        "number": "SETP9900001001",
        "cufe": "9b12a84e3c984920bfe31d04ba90ef4a919313b8f673892",
        "reference_code": "FACT-2026-001",
        "is_validated": true,
        "validated_at": "5/10/2026, 14:15:00",
        "totals": {
          "gross_amount": "350000.00",
          "taxable_amount": "350000.00",
          "tax_amount": "66500.00",
          "total": "416500.00"
        },
        "links": {
          "public_url": "https://factura-sandbox.factus.local/SETP9900001001",
          "qr": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=9b12a84e3c"
        }
      }
    },
    "collection": {
      "status": "success",
      "message": "Recaudo creado",
      "data": {
        "reference_code": "FACT-2026-001",
        "amount": 416500,
        "status": "started",
        "collection_url": "https://pay-api-sandbox.factus.com.co/collections/FACT-2026-001"
      }
    }
  }
}
```

---

### 2.3 Listar Facturas: `GET /invoices`
Obtiene el listado de facturas emitidas registradas en el tenant de Factus.

**Query Params opcionales:**
- `page`: Número de página (default: 1)
- `identification`: Filtrar por cédula/NIT del comprador
- `status`: Estado de validación

**Respuesta Exitosa (`200 OK`):**
```json
{
  "status": "success",
  "data": [
    {
      "number": "SETP9900001001",
      "reference_code": "FACT-2026-001",
      "cufe": "9b12a84e3c984920bfe31d04ba90ef4a919313b8f673892",
      "is_validated": true,
      "customer": {
        "names": "Carlos Rodriguez",
        "identification": "901234567"
      },
      "totals": {
        "total": "416500.00"
      }
    }
  ]
}
```

---

### 2.4 Consultar Detalle de Factura: `GET /invoices/:referenceCode`
Devuelve la información integral de la factura, incluyendo datos del comprador, items, desglose de impuestos, CUFE DIAN y el enlace de cobro asociado en Factus Pay.

**Respuesta Exitosa (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "number": "SETP9900001001",
    "reference_code": "FACT-2026-001",
    "cufe": "9b12a84e3c984920bfe31d04ba90ef4a919313b8f673892",
    "is_validated": true,
    "validated_at": "5/10/2026, 14:15:00",
    "customer": {
      "identification": "901234567",
      "company": "Tecnologia e Innovacion S.A.S.",
      "municipality_code": "11001",
      "email": "facturacion@tecnologia.co"
    },
    "totals": {
      "gross_amount": "350000.00",
      "tax_amount": "66500.00",
      "total": "416500.00"
    },
    "links": {
      "public_url": "https://factura-sandbox.factus.local/SETP9900001001",
      "payment_url": "https://pay-api-sandbox.factus.com.co/collections/FACT-2026-001"
    }
  }
}
```

---

### 2.5 Eliminar o Anular Factura: `DELETE /invoices/:referenceCode`
Aplica la regla de negocio legal colombiana:
1. Si el documento **no está validado ante la DIAN**, ejecuta la eliminación física vía Factus API (`/v2/bills/destroy/reference/:referenceCode`).
2. Si el documento **ya cuenta con validación DIAN y CUFE**, informa que no puede destruirse físicamente por ley y orienta la emisión de la Nota Crédito de anulación.

**Respuesta Exitosa (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "status": "success",
    "message": "Factura eliminada satisfactoriamente"
  }
}
```

---

### 2.6 Crear Nota Crédito: `POST /credit-notes`
Emite una Nota Crédito electrónica ante la DIAN referenciando una factura previamente validada.

**Request Body:**
```json
{
  "reference_code": "NC-2026-001",
  "bill_number": "SETP9900001001",
  "correction_concept_code": "2",
  "items": [
    {
      "name": "Licencia Software Facturacion Cloud",
      "quantity": 1,
      "price": 250000.00,
      "tax_rate": 19
    }
  ]
}
```

**Conceptos de Corrección según Catálogo DIAN:**
- `1`: Devolución parcial de los bienes y/o no aceptación parcial del servicio.
- `2`: Anulación de factura electrónica.
- `3`: Rebaja o descuento parcial o total.
- `4`: Ajuste de precio.
- `6`: Otros motivos.

---

### 2.7 Turno de Voz con el Agente de IA: `POST /agent/message`
Permite enviar una transcripción del usuario (`text`) asociada a una sesión (`sessionId`). El backend orquesta el llamado al modelo de lenguaje (Claude con function calling o fallback guiado) y retorna la respuesta procesada.

**Request Body:**
```json
{
  "sessionId": "b4e872d1-9f93-4a11-b0e5-79e0a29f8c12",
  "text": "Crea una factura a nombre de Carlos Rodriguez, cédula 901234567 en Bogotá, por 2 capacitaciones de 50000 pesos cada una"
}
```

**Respuesta Exitosa (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "reply": "Entendido. He registrado a Carlos Rodriguez con identificación 901234567 en Bogotá D.C., y 2 capacitaciones a $50,000 cada una (subtotal $100,000 + IVA 19% $19,000 = Total $119,000). ¿Deseas pagarlo de contado o a crédito?",
    "engine": "claude"
  }
}
```

---

## 3. Códigos de Estado HTTP y Manejo de Errores

El backend implementa la clase `ApiError`, que identifica la capa exacta donde se originó el error:

```json
{
  "status": "error",
  "message": "El item #1 necesita nombre, cantidad y precio",
  "source": "documentBuilder",
  "statusCode": 400
}
```

### Fuentes de Error (`source`):
- `factus.auth`: Error de autenticación OAuth2 con Factus (credenciales inválidas o expiradas).
- `factus.bills`: Rechazo de la API de facturas de Factus o validación rechazada por la DIAN.
- `factusPay.auth`: Error de token en pasarela Factus Pay.
- `factusPay.collections`: Error al crear o consultar el recaudo.
- `documentBuilder`: Faltan datos requeridos (cédula, municipio DANE, items válidos).
- `agentService`: Falla en la interacción con el modelo de IA o ejecución de tools.

---

## 4. Ejemplos Rápidos con cURL

```bash
# 1. Verificar estado de salud
curl -X GET http://localhost:4000/api/health

# 2. Consultar municipios DANE DIVIPOLA
curl -X GET http://localhost:4000/api/catalogs/municipalities

# 3. Listar facturas
curl -X GET http://localhost:4000/api/invoices

# 4. Enviar mensaje de voz al agente
curl -X POST http://localhost:4000/api/agent/message \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-1","text":"Hola, quiero hacer una factura"}'

# 5. Eliminar factura borrador
curl -X DELETE http://localhost:4000/api/invoices/FACT-2026-001
```
