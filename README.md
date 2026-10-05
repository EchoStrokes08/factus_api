# Factus Voz 🎙️⚡

> **Facturación electrónica DIAN + Recaudos Factus Pay controlados por Inteligencia Artificial y Voz.**  
> *Proyecto desarrollado para la hackathon / evaluación de integración de APIs Factus.*

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Factus API](https://img.shields.io/badge/Factus%20API-v2%20Validated-blue.svg)](https://developers.factus.com.co)
[![Factus Pay](https://img.shields.io/badge/Factus%20Pay-v1%20Collections-emerald.svg)](https://pay-developers.factus.com.co)
[![DIAN](https://img.shields.io/badge/DIAN-UBL%202.1%20CUFE-red.svg)](https://www.dian.gov.co)
[![DANE](https://img.shields.io/badge/DANE-DIVIPOLA%20Codes-orange.svg)](https://www.dane.gov.co)
[![Postman](https://img.shields.io/badge/Postman-Collection%20Ready-FF6C37.svg)](file:///c:/Users/oscar/Documents/factus_api/postman/Factus_API_Voz.postman_collection.json)

---

## 📌 Documentación y Enlaces Clave

Para una evaluación técnica profunda, consulta los documentos de diseño en el directorio [`/docs`](file:///c:/Users/oscar/Documents/factus_api/docs):

- 📋 **[Stakeholders y Flujos de Trabajo](file:///c:/Users/oscar/Documents/factus_api/docs/STAKEHOLDERS_Y_FLUJOS.md)**: El rol del **DANE (DIVIPOLA)** y la **DIAN**, modelado del **Comprador** como iniciador del flujo, y diagramas de secuencia Mermaid.
- 🔌 **[Referencia de APIs y Endpoints](file:///c:/Users/oscar/Documents/factus_api/docs/API_REFERENCE.md)**: Esquemas de request/response, headers, códigos de error y ejemplos cURL.
- 🏆 **[Arquitectura y Matriz de Evaluación](file:///c:/Users/oscar/Documents/factus_api/docs/ARQUITECTURA_Y_EVALUACION.md)**: Justificación técnica, C4 component diagrams, cumplimiento de rúbricas y **Guion de Pitch (3 min)** para jurados.
- 📦 **[Colección de Postman](file:///c:/Users/oscar/Documents/factus_api/postman/Factus_API_Voz.postman_collection.json)**: Archivo listo para importar en Postman con variables de entorno y tests automáticos.

---

## 💡 Idea y Propuesta de Valor

En lugar de los tradicionales formularios con más de 20 campos que ralentizan la atención y provocan errores de digitación, **Factus Voz** permite emitir facturas electrónicas y notas crédito **hablando con un agente de IA en lenguaje natural**, como si fuera una llamada telefónica:

1. **Voz a Texto (Speech-to-Text):** El navegador captura la voz del usuario.
2. **IA con Function Calling:** Un modelo de IA (Claude 3.5 Sonnet o el asistente guiado de respaldo) extrae automáticamente los datos del cliente, productos, tarifas de IVA y medio de pago.
3. **Mapeo Automático DANE DIVIPOLA:** Resuelve automáticamente ciudades colombianas (ej: *"en Medellín"*) a su respectivo código numérico oficial DANE (`05001`).
4. **Validación Previa DIAN:** Transmite a **Factus API v2** para generar el XML UBL 2.1, firma digital y obtención del **CUFE** y código QR oficial.
5. **Recaudo Inmediato en Factus Pay:** Registra síncronamente el cobro en **Factus Pay v1** (`/v1/collections`), generando el enlace de pago y QR para cobrar al comprador en el mismo paso.

---

## 👥 Stakeholders Clave

### 1. DANE (Departamento Administrativo Nacional de Estadística)
- **DIVIPOLA Obligatorio:** Custodio de la codificación oficial de departamentos y municipios (5 dígitos) que exige la DIAN y Factus en `customer.municipality_code`.
- **Inteligencia Macroeconómica:** La facturación electrónica alimenta en tiempo real el cálculo del IPC (inflación), el ISE y las Cuentas Nacionales mediante el cruce institucional DIAN-DANE.

### 2. DIAN (Dirección de Impuestos y Aduanas Nacionales)
- Autoridad tributaria fiscal que valida la factura síncronamente, otorga el **CUFE**, firma el XML UBL 2.1 y previene la evasión de impuestos.

### 3. Comprador / Adquirente (Persona que Inicia el Flujo)
- Disparador de la transacción comercial.
- Suministra datos (Cédula/NIT, correo) y recibe de inmediato su factura electrónica validada (PDF y XML) junto al enlace o QR de pago seguro de Factus Pay.

### 4. Facturador / Emisor (Comercio / Vendedor)
- Profesional independiente o cajero que ahorra minutos valiosos al facturar manos libres por voz.

### 5. Factus & Factus Pay
- Plataformas tecnológicas que facilitan la emisión de documentos fiscales y el recaudo digital sin intermediarios bancarios complejos.

---

## 🔄 Flujo de Trabajo: ¿Eliminar o Anular una Factura?

Uno de los aportes técnicos más rigurosos del proyecto es resolver el **dilema legal colombiano de la eliminación de facturas**:

```
[ Solicitud de Eliminación: DELETE /api/invoices/:referenceCode ]
                        │
         ¿Factura ya validada por la DIAN?
         /                              \
       NO                                SÍ
       │                                  │
[ Eliminación Física ]           [ Anulación Fiscal Obligatoria ]
Factus API: /bills/destroy       Factus API: /credit-notes (Concepto 2)
Borrado en base de datos.        Genera Nota Crédito con CUFE según
                                 Decreto 358 de 2020 de la DIAN.
```

---

## 🏗️ Arquitectura de Software

El acceso a las APIs externas está desacoplado rigurosamente de la lógica de negocio:

```
backend/
  src/
    api/            Clientes HTTP puros (axios) a Factus API y Factus Pay.
                     Soportan MOCK_MODE para desarrollo sin saldo o sin conexión.
    services/        Lógica de negocio: documentBuilder (armado de esquemas DIAN/DANE),
                     invoiceService (orquestación Factura + Recaudo Factus Pay),
                     creditNoteService, tokenManager.
    agent/           Agente conversacional: agentService (Claude tool-calling),
                     fallbackAgent (modo guiado autónomo), tools.js, sessionStore.
    controllers/     Capa de transporte HTTP Express.
    routes/          Enrutamiento REST (/invoices, /credit-notes, /catalogs, /agent).
    config/          daneDivipola.js (Catálogo DANE), catalogs.js, env.js.
    middleware/      errorHandler con trazabilidad de origen (`source`).

frontend/
  src/
    api/backendClient.js       Único cliente de contacto (el frontend NUNCA llama a Factus directo).
    features/voiceAgent/       Pantalla de llamada interactiva con Web Speech API.
    features/documents/        Historial con badges DIAN, código DANE DIVIPOLA y Factus Pay.
```

---

## 🚀 Puesta en Marcha Rápida

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Variables clave en `backend/.env`:
- `MOCK_MODE=true` *(por defecto)*: Simula todas las respuestas de Factus y Factus Pay sin consumir saldo ni requerir credenciales reales.
- `MOCK_MODE=false`: Conecta a Sandbox real de Factus (`FACTUS_CLIENT_ID`, `FACTUS_CLIENT_SECRET`, `FACTUS_USERNAME`, `FACTUS_PASSWORD`) y Factus Pay (`FACTUS_PAY_EMAIL`, `FACTUS_PAY_PASSWORD`).
- `ANTHROPIC_API_KEY`: Para usar Claude 3.5 Sonnet. Si no se provee, se activa automáticamente el **agente guiado de respaldo**.

Backend corriendo en: `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend corriendo en: `http://localhost:5173`.  
*(Recomendado usar Google Chrome o Microsoft Edge para soporte óptimo de Web Speech API).*

---

## 🔌 Matriz de Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del backend y confirmación de `MOCK_MODE` |
| `GET` | `/api/catalogs/municipalities` | Catálogo de municipios oficiales **DANE DIVIPOLA** |
| `GET` | `/api/catalogs` | Catálogos consolidados DANE y DIAN (impuestos, tipos doc) |
| `GET` | `/api/invoices` | Listar facturas electrónicas emitidas |
| `GET` | `/api/invoices/:referenceCode` | Consultar detalle de factura con CUFE, QR y recaudo |
| `POST` | `/api/invoices` | Crear factura electrónica validada DIAN + recaudo Factus Pay |
| `DELETE` | `/api/invoices/:referenceCode` | Eliminar factura borrador o anular con Nota Crédito |
| `GET` | `/api/credit-notes` | Listar notas crédito emitidas |
| `POST` | `/api/credit-notes` | Crear y timbrar nota crédito electrónica ante la DIAN |
| `DELETE` | `/api/credit-notes/:referenceCode` | Eliminar nota crédito no validada |
| `POST` | `/api/agent/message` | Enviar mensaje en lenguaje natural al asistente de voz |
| `DELETE` | `/api/agent/session/:sessionId` | Finalizar sesión conversacional activa |

---

## ⚖️ Licencia y Créditos
Desarrollado como proyecto de alta innovación integrando el ecosistema de APIs de Factus y Factus Pay en Colombia.
