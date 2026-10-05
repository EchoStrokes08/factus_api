# Factus Voz

Aplicación web para crear y eliminar **facturas electrónicas** y **notas crédito** a través de las APIs de [Factus](https://developers.factus.com.co) y [Factus Pay](https://pay-developers.factus.com.co) — pero en vez de un dashboard con formularios, la facturación se hace **hablando con un agente de IA**, como si fuera una llamada telefónica.

Cada factura creada queda además registrada como un **recaudo (collection)** en Factus Pay, que es como termina siendo cobrable en `pay-api-sandbox.factus.com.co/collections`.

## Idea del proyecto

En vez de dashboard clásico: una pantalla de "llamada" con un botón circular. Al tocarlo, el navegador escucha al usuario (Web Speech API), un agente de IA (Claude, con *tool-calling*) va pidiendo los datos de la factura uno por uno, y responde hablando (text-to-speech). Cuando el usuario confirma, el agente ejecuta las llamadas reales a Factus y a Factus Pay, y el documento aparece en un panel secundario de historial, donde también se puede eliminar manualmente (o pidiéndoselo al agente por voz: *"elimina la factura FACT-123"*).

## Arquitectura

El objetivo explícito es que **el acceso a las APIs de Factus nunca se mezcle con la lógica de negocio**, para que un error se pueda ubicar de inmediato por la capa en la que ocurre.

```
backend/
  src/
    api/            Clientes HTTP puros a Factus / Factus Pay (axios).
                     No conocen reglas de negocio, solo saben hacer la llamada.
                     Soportan MOCK_MODE para simular respuestas sin credenciales.
    services/        Lógica de negocio: arma los payloads de Factus (documentBuilder),
                     decide el orden de llamadas (invoiceService crea la factura Y
                     el recaudo en Factus Pay), gestiona tokens (tokenManager).
    agent/           El agente conversacional: tools.js (puente agente -> services),
                     agentService.js (Claude + tool-calling), fallbackAgent.js
                     (modo sin IA, guiado por pasos), sessionStore.js (estado de
                     cada "llamada").
    controllers/     Capa HTTP: traduce request/response de Express a llamadas de services.
    routes/          Definición de endpoints Express.
    middleware/      Manejo de errores centralizado (errorHandler marca de qué
                     capa vino el error: factus.bills, factusPay.collections,
                     documentBuilder, agentService, etc).
    config/          Variables de entorno y catálogos de códigos DIAN (impuestos,
                     tipos de documento, formas de pago).

frontend/
  src/
    api/backendClient.js       Único punto de contacto con nuestro backend
                                (el frontend NUNCA llama a Factus directamente).
    features/voiceAgent/       Pantalla de "llamada": hooks de reconocimiento y
                                síntesis de voz (Web Speech API) + CallScreen.
    features/documents/        Panel de historial de facturas/notas crédito con
                                opción de eliminar.
    components/                Layout general.
```

Si algo falla, el mensaje de error indica la capa (`source`): por ejemplo `factus.bills` (la API real respondió mal), `documentBuilder` (el borrador no tenía los datos mínimos) o `agentService` (falló la conversación con Claude) — así no hay que adivinar dónde mirar.

## Requisitos

- Node.js 18+
- Credenciales de Factus (sandbox) y Factus Pay (sandbox) — opcionales si usas `MOCK_MODE=true`
- Una API key de Anthropic (Claude) — opcional; si no la pones, se activa un **agente de respaldo** guiado por pasos que no necesita IA externa, para que la app funcione igual.

## Puesta en marcha

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Edita `backend/.env`:

- `MOCK_MODE=true` (por defecto) — no llama a Factus de verdad, usa datos simulados con la misma forma que la API real. Ideal para desarrollar/probar sin credenciales.
- Para usar Factus real: pon `MOCK_MODE=false` y completa `FACTUS_CLIENT_ID`, `FACTUS_CLIENT_SECRET`, `FACTUS_USERNAME`, `FACTUS_PASSWORD` (API principal) y `FACTUS_PAY_EMAIL`, `FACTUS_PAY_PASSWORD` (Factus Pay).
- Para que el agente use Claude en vez del modo guiado: pon tu `ANTHROPIC_API_KEY`.

El backend queda en `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. El reconocimiento de voz (Web Speech API) funciona mejor en Chrome/Edge; si el navegador no lo soporta, queda un campo de texto como alternativa para "hablar" con el agente escribiendo.

## Flujo de uso

1. Toca el botón de llamada 📞.
2. El agente saluda (se escucha) y pregunta por el cliente, luego los productos/servicios, luego la forma de pago.
3. Antes de crear el documento, el agente lee un resumen y pide confirmación.
4. Al confirmar, se crea la factura en Factus **y** el recaudo en Factus Pay; el resultado aparece en el panel de "Facturas" a la derecha.
5. Para una nota crédito, dile al agente el número de la factura a corregir y el motivo.
6. Para eliminar: dilo por voz ("elimina la factura FACT-123") o usa el botón "Eliminar" en el panel de historial. Solo se pueden eliminar documentos que **no** hayan sido validados aún por la DIAN (regla de Factus).

## Endpoints del backend

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del backend y si está en modo mock |
| POST | `/api/agent/message` | Envía un turno de conversación `{ sessionId, text }` |
| DELETE | `/api/agent/session/:sessionId` | Termina una sesión de llamada |
| GET/POST | `/api/invoices` | Listar / crear factura |
| DELETE | `/api/invoices/:referenceCode` | Eliminar factura no validada |
| GET/POST | `/api/credit-notes` | Listar / crear nota crédito |
| DELETE | `/api/credit-notes/:referenceCode` | Eliminar nota crédito no validada |

## Notas

- Los montos de ejemplo usan IVA del 19% por defecto si no se especifica otro porcentaje.
- `MOCK_MODE` vive en la capa `api/` (es una decisión de infraestructura, no de negocio): cada cliente HTTP decide ahí mismo si llama a Factus real o devuelve datos simulados con la misma forma que la respuesta real, así que `services/`, `agent/` y el frontend no necesitan saber en qué modo está corriendo la app.

