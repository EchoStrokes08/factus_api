# Factus Voz: Stakeholders y Flujo de Trabajo

Este documento define la estructura de actores clave (**Stakeholders**), el rol fundamental del **DANE** y la **DIAN**, el modelado del **Comprador** como iniciador del flujo comercial, y los diagramas de secuencia y flujo de estados del sistema para la creación, recaudo y eliminación/anulación de facturas electrónicas.

---

## 1. Identificación y Matriz de Stakeholders

En el ecosistema de facturación electrónica en Colombia convergen entidades gubernamentales, plataformas tecnológicas, comercios y ciudadanos.

| Stakeholder | Tipo de Actor | Rol Principal | Interés / Valor Recibido | Relación con la API / Sistema |
|---|---|---|---|---|
| **DANE** (Depto. Administrativo Nacional de Estadística) | Gubernamental / Estadístico | Entidad que regula la codificación geográfica (**DIVIPOLA**) y actividades económicas (**CIIU**). | Monitoreo en tiempo real de la economía nacional (IPC, ISE, PIB, comercio minorista) a través del cruce de datos fiscales con la DIAN. | Proveedor del catálogo de municipios (`municipality_code`) y departamentos. Factus Voz traduce el nombre dicho por el usuario al código DIVIPOLA oficial. |
| **DIAN** (Dirección de Impuestos y Aduanas Nacionales) | Gubernamental / Fiscal | Máxima autoridad tributaria y fiscal en Colombia. | Control de evasión, recaudo de IVA (19%, 5%, 0%), trazabilidad de transacciones comerciales. | Validador síncrono del documento electrónico XML (UBL 2.1). Genera el **CUFE** (Código Único de Facturación Electrónica), firma digital y código QR. |
| **Comprador / Adquirente** | Usuario Final / Iniciador | Persona natural o jurídica que adquiere los bienes o servicios. | Recibir un comprobante fiscal legal (PDF y XML con validez DIAN), agilidad en la atención y facilidades de pago digital. | Suministra datos de identificación (Cédula/NIT, nombre, correo, municipio DANE) y realiza el pago mediante Factus Pay. |
| **Facturador / Emisor (Comercio / Vendedor)** | Operativo / Negocio | Empresa, profesional independiente o comerciante que realiza la venta. | Facturar sin fricción administrativa, evitar digitación manual repetitiva, cobrar más rápido y cumplir la ley DIAN sin sanciones. | Usuario principal de la interfaz de voz o REST API. Dicta o envía los datos de la venta y autoriza la emisión. |
| **Factus API** | Proveedor Tecnológico Autorizado | Plataforma API intermediaria certificada ante la DIAN. | Proveer infraestructura RESTful para emisión, validación, timbrado y custodia de facturas electrónicas y notas crédito. | Recibe el payload JSON en `/v2/bills/validate`, construye el XML UBL 2.1, lo firma, lo transmite a la DIAN y retorna el CUFE y PDF. |
| **Factus Pay** | Pasarela Financiera / Recaudos | Plataforma de cobros y recaudos electrónicos. | Centralizar los pagos de las facturas emitidas, conciliación automática y dispersión de fondos. | Recibe la orden de cobro en `POST /v1/collections` con el mismo `reference_code` y genera de forma asíncrona el código QR de pago (`started → ready → paid`). |

---

## 2. El Rol Estratégico del DANE en la Facturación Electrónica

### ¿Por qué el DANE es un Stakeholder Fundamental?
A menudo se asocia la facturación electrónica únicamente con la DIAN; sin embargo, en Colombia el **DANE** es un actor indispensable en dos dimensiones:

1. **Estandarización Geográfica (DIVIPOLA):**
   - El DANE es el custodio de la **División Político-Administrativa de Colombia (DIVIPOLA)**.
   - Cada municipio colombiano posee un código oficial de 5 dígitos (ejemplo: `11001` para Bogotá D.C., `05001` para Medellín, `76001` para Cali, `08001` para Barranquilla).
   - El campo `customer.municipality_code` de Factus usa la codificación DIVIPOLA del DANE.
   - En **Factus Voz**, el sistema resuelve automáticamente el nombre común de la ciudad (ej: "Bogotá", "Medellín") al código oficial sin obligar al usuario a memorizar códigos.
   - Si la ciudad no está en el catálogo incluido, el campo **se omite** (Factus lo admite como opcional) en lugar de inventar un código: un dato geográfico falso en un documento fiscal contaminaría justamente la estadística que el DANE construye con él.

2. **Impacto Macroeconómico e Inteligencia Estadística:**
   - Mediante el convenio interinstitucional DIAN - DANE, los datos agregados y anonimizados de facturación electrónica alimentan en tiempo real:
     * El **Índice de Precios al Consumidor (IPC)** (medición de la inflación).
     * El **Indicador de Seguimiento a la Economía (ISE)**.
     * La **Encuesta Mensual de Comercio al por Menor (EMCM)**.
   - La emisión precisa de facturas con identificación de municipios DANE y tarifas de IVA contribuye directamente a la calidad de la estadística económica del país.

---

## 3. Persona que Inicia el Flujo: El Comprador (Adquirente)

### Modelado del Comprador
El comprador es el disparador de la necesidad transaccional. Puede interactuar en dos modalidades:

```
[ Modalidad 1: Venta Asistida en Punto de Venta (POS) ]
Comprador (Físico/Presencial) ---> Vendedor (Usa Factus Voz) ---> Factus & Factus Pay

[ Modalidad 2: Autoservicio / Kiosco Interactivo ]
Comprador (Habla directamente con el Agente) ---> Factus & Factus Pay
```

### El Viaje del Comprador (Customer Journey)
1. **Intención de Compra:** El comprador solicita uno o más productos o servicios indicando cantidades o especificaciones.
2. **Suministro de Datos Fiscales:**
   - Persona Natural: Cédula de Ciudadanía (`13`), nombres, correo electrónico para recepción de factura.
   - Persona Jurídica: NIT (`31`), razón social, correo de facturación electrónica.
   - Ubicación: Ciudad de residencia/facturación (asociada al DANE DIVIPOLA).
   - Consumidor final (`222222222222`): previsto por la DIAN para ventas no nominadas; **no está implementado** en esta versión (el agente siempre pide identificación).
3. **Validación de la Orden:** El comprador escucha/visualiza el resumen (subtotal, IVA correspondiente del 19%, 5% o 0%, y total a pagar).
4. **Emisión y Entrega:**
   - El sistema emite la factura electrónica con validación previa de la DIAN.
   - Factus envía al correo del comprador (si se dio) el PDF y el XML con su CUFE; el PDF oficial también se puede abrir desde el visor (modo real).
5. **Experiencia de Pago:**
   - El visor de la factura muestra el **QR de Factus Pay** en cuanto se genera; el comprador lo escanea con su app bancaria.

---

## 4. Flujo de Trabajo (Workflows) y Diagramas de Secuencia

### 4.1 Flujo Principal: Creación y Cobro de Factura Electrónica

Este diagrama describe la secuencia síncrona desde que el comprador inicia la compra hasta la validación DIAN y registro en Factus Pay:

```mermaid
sequenceDiagram
    autonumber
    actor Comprador as Comprador / Adquirente
    actor Facturador as Facturador / Asistente Voz
    participant Backend as Backend Gateway (Factus Voz)
    participant DANE as Catálogo DIVIPOLA (DANE)
    participant FactusAPI as Factus API v2 (/bills/validate)
    participant DIAN as DIAN (Validación Previa)
    participant FactusPay as Factus Pay v1 (/collections)

    Comprador->>Facturador: Solicita compra y entrega datos (Cédula/NIT, items, ciudad)
    Facturador->>Backend: Transmite draft de la factura (voz o REST)
    Note over Backend,DANE: Catálogo DIVIPOLA local (ej: "Bogotá" -> 11001)
    Backend->>DANE: Traduce la ciudad a código municipal
    Backend->>FactusAPI: GET /v2/numbering-ranges (caché 5 min)
    FactusAPI-->>Backend: Rangos activos -> se elige el de facturas vigente y con folios
    Backend->>FactusAPI: POST /v2/bills/validate (numbering_range_id + payload)
    Note over FactusAPI,DIAN: Factus genera XML UBL 2.1 y lo firma digitalmente
    FactusAPI->>DIAN: Envío de factura para validación previa
    DIAN-->>FactusAPI: Aprobado (Asigna CUFE + Algoritmo QR + Timestamp)
    FactusAPI-->>Backend: 201 Created (Factura validada, número SETP..., CUFE, links)
    
    Note over Backend,FactusPay: Orquestación automática de recaudo
    Backend->>FactusPay: POST /v1/collections (reference_code, amount)
    FactusPay-->>Backend: 201 Created (estado 'started', qr: null)
    Note over Backend,FactusPay: Si Factus Pay falla o el monto está fuera de límites,<br/>la factura sigue emitida y se informa el motivo

    Backend-->>Facturador: Factura validada + estado del cobro
    loop Cada 3 s hasta tener QR
        Facturador->>Backend: GET /api/invoices/:ref/collection
        Backend->>FactusPay: GET /v1/collections/:ref
        FactusPay-->>Backend: 'ready' + QR (data URI)
    end
    Facturador-->>Comprador: Muestra la factura y el QR de pago
```

---

### 4.2 Flujo Crítico: ¿Eliminar o Anular una Factura? (El Dilema Legal Colombiano)

En Colombia existe una distinción técnica y regulatoria fundamental establecida por la DIAN (Decreto 358 de 2020 y Resolución 000042):

```mermaid
graph TD
    A["DELETE /api/invoices/:identifier (número o referencia)"] --> B["Detalle real en Factus<br/>GET /v2/bills?filter[reference_code] -> GET /v2/bills/:number"]
    B --> V{"¿Ya tiene nota de anulación?"}
    V -- Sí --> W["already_voided: no se emite otra"]
    V -- No --> C{"¿Validada por la DIAN? (CUFE)"}

    C -- "No" --> D["DELETE /v2/bills/destroy/reference/:ref"]
    D --> E["deleted: el documento desaparece de Factus"]
    D -- "409/422: la DIAN la validó entretanto" --> H

    C -- "Sí" --> G["PROHIBIDO ELIMINAR: se anula"]
    G --> H["POST /v2/credit-notes/validate<br/>correction_concept_code 2 · customization_id 20<br/>bill_number · mismos ítems y total · ref ANUL-…"]
    H --> K["La DIAN valida la nota crédito y reversa los efectos tributarios"]
    K --> L["voided: 'Factura anulada con la nota crédito NC…'"]
    L --> P{"¿El cobro en Factus Pay ya estaba pagado?"}
    P -- Sí --> Q["Aviso: devolver el dinero al comprador"]
```

#### Regla de Negocio Implementada:
1. **Destrucción (`destroy`):** solo mientras la factura no tenga valor fiscal ante la DIAN.
2. **Anulación (nota crédito, concepto 2):** si la factura ya tiene CUFE, el sistema no intenta borrarla: emite automáticamente la **nota crédito de anulación total**, construida desde el detalle real de la factura en Factus.
3. **Idempotencia:** la nota usa la referencia `ANUL-<referencia de la factura>`; Factus devuelve la existente si se repite, así que anular dos veces nunca duplica la nota.
4. **Por qué importa aquí:** Factus Voz emite con `/v2/bills/validate`, de modo que en el sandbox real toda factura nace validada. Sin esta regla, "eliminar" fallaría siempre.

---

## 5. Matriz de Estados de la Factura

```mermaid
stateDiagram-v2
    [*] --> Borrador: Comprador solicita productos
    Borrador --> Validando: Facturador confirma orden
    Validando --> Validada_DIAN: DIAN aprueba (CUFE generado)
    Validando --> Rechazada_DIAN: Error en reglas tributarias
    
    Rechazada_DIAN --> Eliminada: DELETE /v2/bills/destroy (Físico)
    Borrador --> Eliminada: Cancelación antes de validar
    
    Validada_DIAN --> Cobrada: Factus Pay procesa el pago
    Validada_DIAN --> Anulada_Fiscalmente: Emisión Nota Crédito (Concepto 2)
    Cobrada --> Reembolsada: Nota Crédito + Devolución en Factus Pay
    
    Eliminada --> [*]
    Anulada_Fiscalmente --> [*]
    Reembolsada --> [*]
```
