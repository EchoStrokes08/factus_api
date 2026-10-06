# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary audience (confirmed): hackathon judges and technical evaluators of the Factus API integration, watching a live demo or trying the app themselves, usually on a laptop, sometimes on a phone. They judge in minutes whether the voice flow works and whether the fiscal details (DIAN, CUFE, DANE, Factus Pay) are handled correctly.
The story the demo tells is about a merchant or cashier (independent professional, small shop) who issues invoices hands-free by talking instead of filling a 20-field form (from README).

## Product Purpose
Factus Voz issues Colombian electronic invoices (DIAN) and credit notes by holding a "phone call" with an AI agent in natural language. The browser does speech-to-text, the agent extracts customer, items, VAT and payment method, the backend sends the document to Factus API v2 and registers the collection in Factus Pay. Success in the demo: an evaluator watches a spoken request turn into a validated invoice with CUFE, sees it in the history, and can open, print or cancel it.

## Positioning
Voice conversation replaces the invoicing form. Behind it: automatic DANE DIVIPOLA code resolution from spoken city names, automatic DIAN numbering range selection (GET /v2/numbering-ranges), DIAN-validated invoices with CUFE, a Factus Pay collection whose QR appears live in the invoice, and the legally correct delete-vs-annul flow (an unvalidated invoice is destroyed; a validated one is annulled automatically with a concept-2 credit note that replicates it, idempotently).

## Operating Context
- Single page: call screen (main) plus a secondary history panel of invoices and credit notes.
- Web Speech API (STT + TTS, es-CO); typing is the fallback when the browser lacks recognition.
- Two agent engines: Claude ("IA conversacional") or a guided fallback ("Asistente guiado").
- MOCK_MODE is the default: invoices may be simulated (CUFE prefix `mock-`) and must be labeled as such.
- Invoice viewer opens as a modal "paper" document that can be printed / saved as PDF.
- Deployed on Vercel.

## Capabilities and Constraints
- Stack: React 18 + Vite, plain CSS per feature, no UI library. Frontend only talks to its own backend.
- Spanish (Colombia) copy throughout; currency COP.
- Deleting an invoice may mean annulling it with a credit note; the UI must not hide that consequence, and must not offer actions Factus would refuse.
- The collection never blocks the invoice: when Factus Pay is unavailable or the amount is outside its limits ($10.000 – $12.000.000), the reason is shown instead.

## Brand Commitments
- Name: "Factus Voz". Tagline in use: "Factura y anula hablando con el agente".
- Factus and Factus Pay are third-party platforms; their names are used to describe the integration, not as this product's brand.

## Evidence on Hand
- Real flows via mock backend (`backend/src/api/mockData.js`). No customers, metrics or testimonials exist; none may be invented.

## Product Principles
1. The conversation is the interface; the history is support, never the center.
2. Fiscal truth is visible: validation state, CUFE, DANE code, simulated vs real are always legible.
3. Every agent state (idle, connecting, listening, thinking, speaking, error) must be unmistakable at a glance, from across a room during a demo.
4. Voice-first, never voice-only: typing always works.
