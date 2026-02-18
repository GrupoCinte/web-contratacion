# Configuracion de Workflows n8n - Sistema de Contratacion IA

Este documento describe la arquitectura, configuracion y flujo de datos de los 3 workflows de n8n que componen el sistema automatizado de contratacion de Grupo Cinte.

> Para la documentacion tecnica detallada **nodo por nodo** de cada workflow, consultar [N8N_WORKFLOWS_TECHNICAL.md](./N8N_WORKFLOWS_TECHNICAL.md).

---

## Tabla de Contenidos

- [Arquitectura General](#arquitectura-general)
- [Workflows](#workflows)
- [DynamoDB - Tabla de Estado](#dynamodb---tabla-de-estado)
- [Servicios Externos](#servicios-externos)
- [Flujo de Status del Candidato](#flujo-de-status-del-candidato)
- [SharePoint REST API](#sharepoint-rest-api)
- [Generacion Automatica de Contratos](#generacion-automatica-de-contratos)
- [Filtro de Tipos de Contrato](#filtro-de-tipos-de-contrato)
- [Manejo de Ventana WhatsApp 24h](#manejo-de-ventana-whatsapp-24h)
- [Troubleshooting](#troubleshooting)

---

## Arquitectura General

```
Correo electronico                         WhatsApp
       |                                      |
       v                                      v
+------------------+               +---------------------+
| Accion Email Dev |               | Contactacion Dev    |
| (Workflow 1)     |               | (Workflow 3)        |
| ID: fakhNdVX...  |               | ID: bbbMZdyN...     |
+--------+---------+               +----------+----------+
         |                                    |
         |   Escribe/Lee                      |   Lee/Escribe (GSI)
         v                                    v
   +---------------------------------------------+
   |          DynamoDB                            |
   |   Tabla: n8n_table_state_users               |
   |   PK: whatsapp_number (email)                |
   |   GSI: whatsapp_numerico-index (telefono)    |
   +---------------------------------------------+
         ^                                    ^
         |                                    |
   +-----+------+                    +--------+--------+
   |  Dashboard  |                   | My workflow 2   |
   |  React/Vite |                   | (Sub-workflow)  |
   |  WebSockets |                   | ID: 8Yosp...    |
   +-------------+                   +-----------------+
```

---

## Workflows

### Workflow 1: "Accion Email Dev NO TOCAR"

- **ID**: `fakhNdVX24iEssUn`
- **Trigger**: Microsoft Outlook Trigger (correo entrante)
- **Nodos**: ~87
- **Funcion**: Procesa correos con documentos de candidatos, analisis IA, carga a SharePoint y generacion de contratos

#### Subflujos principales:

**Subflujo 1 - Analisis de documentos:**
1. Recibe correo via Outlook Trigger
2. Crea registro inicial en DynamoDB (status: `ANALIZANDO`, PK: email del remitente)
3. Agente Analista (AWS Bedrock) analiza el mensaje
4. Agente Extractor de Ficha extrae datos del candidato
5. Crea carpeta del candidato en SharePoint (REST API)
6. Crea subcarpetas: Afiliaciones, Anexos, Contrato, Lista de Chequeo

**Subflujo 2 - Validacion y carga de documentos:**
1. Agente Validador Documental clasifica cada documento
2. Code node mapea documentos a carpetas SharePoint
3. Sube archivos a SharePoint via REST API
4. Actualiza DynamoDB con resultados de validacion
5. Envia email de respuesta al candidato
6. Notifica por Teams al equipo

**Subflujo 3 - Descarga y envio de Sagrilaft:**
1. Busca archivos Excel en carpeta SAGRILAFT de SharePoint
2. Filtra solo archivos .xlsx/.xls
3. Descarga binarios via SharePoint REST API (/$value)
4. Renombra archivos con Code node (corrige nombre `$value` y MIME type)
5. Agrega como adjuntos al email de respuesta

**Subflujo 4 - Gestion Excel/Contrato:**
1. Detecta si el candidato cargo documentos Excel/SAGRILAFT
2. Busca candidato en DynamoDB (`Get DynamoDB candidato Excel`)
3. Sube archivos a SharePoint
4. Descarga plantilla de contrato segun tipo (`SP Code build plantilla path`)
5. Renombra binario de plantilla (.bin -> .docx)
6. Diligencia plantilla con **docxtemplater** (datos del candidato)
7. Sube contrato diligenciado a carpeta del candidato en SharePoint
8. Notifica por Teams con enlace clickable al contrato
9. Notifica por WhatsApp al candidato
10. Actualiza DynamoDB (status: `esperando_contrato`)

**Subflujo 5 - Filtro de tipo de contrato (If5):**
1. Evalua el tipo de contrato extraido por el agente IA
2. Si es un tipo de contrato especial (ej: "Temporal por obra o labor")
3. Notifica por Teams y **detiene** el flujo (no continua a contactacion)
4. Si es contrato estandar, continua normalmente

#### Nodos DynamoDB en este workflow:

| Nodo | Operacion | Funcion |
|------|-----------|---------|
| Create or update an item4 | PutItem | Registro inicial (status: ANALIZANDO) |
| Create or update an item3 | PutItem | Actualizacion post-validacion |
| Get an item | GetItem | Consulta por email |
| Get an item before 3 | GetItem | Consulta pre-proceso (por email del remitente) |
| Get an item6 | GetItem | Consulta post-extraccion |
| Get an item2 | GetItem | Consulta para subflujo |
| Get DynamoDB candidato Excel | GetItem | Consulta para subflujo Excel/Contrato |
| Create or update esperando contrato | PutItem | Marca esperando_contrato |

#### Nodos de contrato:

| Nodo | Funcion |
|------|---------|
| SP Code build plantilla path | Construye ruta a la plantilla de contrato segun tipo |
| SP Get plantilla contrato | Descarga la plantilla .docx desde SharePoint |
| Code in JavaScript (rename) | Renombra binario de .bin a .docx con MIME correcto |
| Docxtemplater | Diligencia la plantilla con datos del candidato |
| SP Upload plantilla a candidato | Sube contrato diligenciado a SharePoint |
| Teams diligenciar contrato | Notifica al equipo con link al contrato (HTML) |
| If5 | Filtro de tipo de contrato especial |

---

### Workflow 2: "My workflow 2 Dev NO TOCAR"

- **ID**: `8YospYjKdjfGTUXN`
- **Trigger**: Execute Workflow Trigger (llamado desde Contactacion)
- **Nodos**: 3
- **Funcion**: Actualiza status a "Aceptado" cuando el candidato acepta por WhatsApp

#### Flujo:
```
When Executed by Another Workflow (recibe query = email)
    |
    v
Get an item (busca por whatsapp_number = email)
    |
    v
Create or update an item2 (status = "Aceptado", todos los campos)
```

#### Parametro de entrada:
- `query`: Email del candidato (partition key de DynamoDB)

#### Campos escritos:
- Preserva todos los campos del GetItem previo
- Actualiza `status` = "Aceptado"
- Incluye campos adicionales: `ts_analisis_ia_completado`, `direccion`, `fecha_inicio`, `salario_letras`, `salario_numeros`

---

### Workflow 3: "Contactacion Dev NO TOCAR"

- **ID**: `bbbMZdyNvKKqzkPg`
- **Trigger**: Webhook POST (recibe mensajes de WhatsApp via AWS SNS)
- **Nodos**: 24
- **Funcion**: Chatbot WhatsApp para comunicacion con candidatos

#### Flujo principal:
```
Webhook (SNS WhatsApp)
    |
    v
Filter Messages (descarta status updates)
    |
    v
Code in JavaScript3 (parsea mensaje SNS)
    |
    v
Get an item (Query GSI whatsapp_numerico-index por telefono)
    |
    v
Create or update an item2 (status: "comunicando", todos los campos)
    |
    v
If esperando respuesta contrato
    |--- SI --> Code evaluar respuesta --> If recibio contrato
    |                                        |--- SI --> WhatsApp confirmacion --> DynamoDB procesado
    |                                        |--- NO --> Teams escalar
    |
    |--- NO --> AI Agent (Bedrock Nova 2 Lite)
                    |--- Tool: Microsoft Excel 365 (datos candidato)
                    |--- Tool: Date & Time (herramienta IA)
                    |--- Tool: Code Tool (herramienta IA)
                    |--- Tool: Call My workflow 2 (cuando acepta)
                    |
                    v
                Code respuesta WhatsApp --> HTTP Request WhatsApp
                    |
                    v
                Get an item3 --> Create or update an item --> If2
                    |--- Aceptado --> Teams notificar
                    |--- No Aceptado --> Respond to Webhook
```

#### Consulta GSI (nodo "Get an item"):
- **Operacion**: Get Many (Query)
- **Scan**: false
- **Index Name**: `whatsapp_numerico-index`
- **Key Condition Expression**: `whatsapp_numerico = :val`
- **Expression Attribute Values**: `:val` = Number = `{{ $json.telefono.replace(/\D/g, '') }}`
- **Limit**: 1
- **Simple**: false (retorna formato raw DynamoDB con .S, .N)

#### Nodos DynamoDB en este workflow:

| Nodo | Operacion | Funcion |
|------|-----------|---------|
| Get an item | Query (GSI) | Busca candidato por telefono |
| Create or update an item2 | PutItem | Marca "comunicando" |
| Get an item3 | GetItem | Re-consulta post-agente |
| Create or update an item | PutItem | Actualiza status post-agente |
| Create or update procesado WF3 | PutItem | Marca "Contrato Recibido" |

---

## DynamoDB - Tabla de Estado

### Tabla Principal

- **Nombre**: `n8n_table_state_users`
- **Partition Key**: `whatsapp_number` (String) - almacena el **email** del candidato
- **Billing**: On-Demand

### Global Secondary Index (GSI)

- **Nombre**: `whatsapp_numerico-index`
- **Partition Key**: `whatsapp_numerico` (Number) - almacena el **telefono** del candidato
- **Projection**: ALL

> **Nota**: El nombre `whatsapp_number` como PK almacena el email (herencia del diseno inicial). El telefono se almacena en `whatsapp_numerico` (tipo Number) y se consulta exclusivamente via GSI.

### Campos por Registro

Todos los nodos DynamoDB de tipo PutItem deben escribir todos los campos para evitar perdida de datos (DynamoDB PutItem sobrescribe el registro completo):

| # | Campo | Tipo DynamoDB | Descripcion |
|---|-------|---------------|-------------|
| 1 | `whatsapp_number` | String (S) | **Partition Key** - Email del candidato |
| 2 | `nombre y apellido` | String (S) | Nombre completo del candidato |
| 3 | `edad` | String (S) | Edad del candidato |
| 4 | `cedula` | Number (N) | Numero de cedula |
| 5 | `puesto` | String (S) | Cargo al que aplica |
| 6 | `status` | String (S) | Estado actual del proceso |
| 7 | `email` | String (S) | Email del candidato (mismo que PK) |
| 8 | `statuses` | String (S) | Flag para control de flujo WhatsApp |
| 9 | `whatsapp_numerico` | Number (N) | Numero de telefono (sin +, solo digitos) |
| 10 | `documentos` | String (S) | Lista de documentos encontrados |
| 11 | `ts_documentos_recibidos` | String (S) | Timestamp inicio del proceso |
| 12 | `ts_analisis_ia_completado` | String (S) | Timestamp fin de analisis IA |
| 13 | `ts_validacion_completada` | String (S) | Timestamp fin de validacion |
| 14 | `direccion` | String (S) | Direccion del candidato |
| 15 | `salario_numeros` | String (S) | Salario en formato numerico |
| 16 | `salario_letras` | String (S) | Salario en letras |
| 17 | `fecha_inicio` | String (S) | Fecha de inicio del contrato |

### Comando AWS CLI para crear tabla y GSI

```bash
aws dynamodb create-table \
  --table-name n8n_table_state_users \
  --attribute-definitions \
    AttributeName=whatsapp_number,AttributeType=S \
    AttributeName=whatsapp_numerico,AttributeType=N \
  --key-schema \
    AttributeName=whatsapp_number,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[{\"IndexName\": \"whatsapp_numerico-index\",
       \"KeySchema\": [
         {\"AttributeName\": \"whatsapp_numerico\", \"KeyType\": \"HASH\"}
       ],
       \"Projection\": {\"ProjectionType\": \"ALL\"}}]"
```

---

## Servicios Externos

| Servicio | Uso | Credencial en n8n |
|----------|-----|-------------------|
| Microsoft Outlook | Trigger de correo entrante | microsoftOutlookOAuth2Api |
| Microsoft SharePoint | Carpetas y archivos (REST API) | microsoftSharePointOAuth2Api |
| Microsoft Teams | Notificaciones internas (HTML) | microsoftTeamsOAuth2Api |
| Microsoft Excel 365 | Datos maestros de candidatos | microsoftExcelOAuth2Api |
| AWS Bedrock | Agentes IA (Claude, Nova 2 Lite) | aws (IAM) |
| AWS DynamoDB | Estado de candidatos | aws (IAM) |
| AWS Social Messaging | Envio WhatsApp | aws (IAM) |

### SharePoint - Sitio y rutas

- **Sitio**: `https://cintegroup.sharepoint.com/sites/GrupoCinteColombia`
- **Ruta base expedientes**: `/sites/GrupoCinteColombia/Gerencia Capital Humano/Capital Humano/Expedientes/Activos/Consultores/`
- **Carpeta SAGRILAFT**: Dentro de la carpeta del candidato
- **Plantillas de contrato**: `Documentos CH/Formatos de Contratos-Politicas-Convenios/Automatizacion Contratacion/`

---

## Flujo de Status del Candidato

```
Email recibido ──> ANALIZANDO ──> validado ──> comunicando ──> Aceptado ──> esperando_contrato ──> completado
  (WF1)             (WF1)         (WF1)        (WF3)          (WF2)         (WF1)                  (WF3)
```

| Status | Workflow | Momento | Visible en Dashboard |
|--------|----------|---------|---------------------|
| `ANALIZANDO` | Accion Email | Al recibir el correo | Si (con timestamp inicio) |
| `validado` | Accion Email | Documentos validados por IA | Si |
| `comunicando` | Contactacion | Se contacta al candidato por WhatsApp | Si |
| `Aceptado` | My workflow 2 | Candidato acepta el cargo | Si |
| `esperando_contrato` | Accion Email | Contrato generado y enviado | Si |
| `completado` | Contactacion | Candidato confirma recepcion de contrato | Si (con timestamp fin) |

---

## Generacion Automatica de Contratos

### Flujo de generacion

1. El agente IA extrae el **tipo de contrato** del candidato
2. `SP Code build plantilla path` construye la ruta a la plantilla Word correcta en SharePoint
3. `SP Get plantilla contrato` descarga la plantilla via REST API (`/$value`)
4. `Code in JavaScript` renombra el binario de `$value.bin` a `Plantilla Contrato.docx`
5. `Docxtemplater` llena los placeholders de la plantilla con datos del candidato
6. `SP Upload plantilla a candidato` sube el contrato diligenciado a SharePoint
7. Teams envia notificacion con **enlace clickable** al contrato

### Placeholders en la plantilla Word

| Placeholder | Campo DynamoDB | Ejemplo |
|-------------|----------------|---------|
| `{nombre_trabajador}` | `nombre y apellido` (.S) | Juan Perez |
| `{domicilio_trabajador}` | `direccion` (.S) | Calle 123, Bogota |
| `{cedula}` | `cedula` (.N) | 1234567890 |
| `{salario_letras}` | `salario_letras` (.S) | TRES MILLONES |
| `{salario_numeros}` | `salario_numeros` (.S) | 3.000.000 |
| `{cargo}` | `puesto` (.S) | Consultor Senior |
| `{fecha_inicio}` | `fecha_inicio` (.S) | 2026-03-01 |

> **Importante**: Los placeholders en Word deben ser texto plano sin formato parcial. Si Word fragmenta las llaves `{}` en diferentes "runs" XML, docxtemplater falla con "Error while rendering". Solucion: borrar el placeholder y reescribirlo de corrido.

### Notificacion Teams (HTML)

El nodo Teams usa **Content Type: HTML** para que los enlaces sean clickables:

```html
Hola Team, el candidato {{ nombre }} ha completado el cargue de documentos SAGRILAFT.
<br><br>
<a href="{{ $json.d.LinkingUri }}">Ver contrato aqui</a>
```

---

## Filtro de Tipos de Contrato

### Nodo If5 (Accion Email Dev)

Evalua el tipo de contrato extraido por el agente IA. Si el contrato es de un tipo especial que requiere revision manual:

- **True**: Envia notificacion Teams al equipo y **detiene** el flujo (no continua a contactacion)
- **False**: Continua el flujo normalmente hacia contactacion por WhatsApp

Tipos de contrato que activan el filtro:
- Contratos especiales definidos por el equipo de Capital Humano

---

## SharePoint REST API

### Endpoints utilizados

```
# Crear carpeta
POST /_api/web/folders
Body: { "__metadata": { "type": "SP.Folder" }, "ServerRelativeUrl": "/sites/.../NombreCandidato" }

# Subir archivo
POST /_api/web/GetFolderByServerRelativeUrl('ruta')/Files/add(url='nombre.pdf',overwrite=true)
Body: (binary data)

# Listar archivos de una carpeta
GET /_api/web/GetFolderByServerRelativeUrl('ruta')/Files

# Descargar archivo (binario)
GET /_api/web/GetFileByServerRelativeUrl('ruta')/$value
```

### Headers requeridos

```
Accept: application/json;odata=verbose
Content-Type: application/json;odata=verbose
```

### Nota sobre descarga de archivos

Al descargar archivos con `/$value`, el HTTP Request node de n8n nombra el archivo como `$value`. Para corregir esto, se usa un Code node posterior que renombra el binario:

```javascript
const item = $input.first();
const binary = item.binary.data;
binary.fileName = 'Plantilla Contrato.docx';
binary.fileExtension = 'docx';
binary.mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
return [{ json: item.json, binary: { data: binary } }];
```

---

## Manejo de Ventana WhatsApp 24h

### Reglas de WhatsApp Business API

- **Ventana de 24 horas**: Cuando el candidato envia un mensaje, se abre una ventana de 24h para mensajes de texto libre
- **Despues de 24h**: Solo se pueden enviar Template Messages (pre-aprobados por Meta)
- **Template Messages**: Tienen costo adicional y deben aprobarse en Meta Business Manager

### Estrategia recomendada

1. **Guardar timestamp** del ultimo mensaje del candidato en DynamoDB (campo adicional `ts_ultimo_mensaje`)
2. **Workflow programado** (Schedule Trigger cada 4-6h) que:
   - Escanea DynamoDB por candidatos con status "comunicando"
   - Filtra los que llevan >18h sin respuesta
   - Envia Template Message de recordatorio
3. **Umbrales**:
   - 18h: Primer recordatorio (template)
   - 48h: Segundo recordatorio
   - 72h+: Escalar a Teams

### Cierre de comunicacion

Para candidatos con proceso completado (status `completado`):
- Agregar un `If` despues del GSI Query en Contactacion
- Si status = "completado": enviar mensaje de cierre y responder 200 al webhook
- El candidato no se "bloquea", pero el flujo no pasa por el AI Agent
- Respond to Webhook con 200 es **obligatorio** para que SNS no reintente

---

## Troubleshooting

### Error: "Referenced node doesn't exist"
- **Causa**: Un nodo Code o expresion referencia un nodo que fue eliminado o renombrado
- **Ejemplo real**: `Code prepare WhatsApp Excel` referenciaba `Code check subcarpeta Excel` (eliminado)
- **Solucion**: Actualizar la referencia al nodo correcto, ej: `$('Get DynamoDB candidato Excel')`

### Error: "Paired item data unavailable"
- **Causa**: Un nodo produce 1 item pero el downstream procesa multiples
- **Solucion**: Cambiar `.item` por `.first()` en la expresion
- **Ejemplo**: `$('Agente').first().json.output` en vez de `$('Agente').item.json.output`

### Error: "Bad request" en DynamoDB GSI Query
- **Causa**: Tipo de dato incorrecto o nombre de indice mal escrito
- **Solucion**:
  1. Verificar que `indexName` = `whatsapp_numerico-index`
  2. Tipo del valor debe ser `N` (Number), no `S` (String)
  3. Quitar caracteres no numericos del telefono: `{{ $json.telefono.replace(/\D/g, '') }}`

### Error: Archivos descargados de SharePoint con nombre `$value.bin`
- **Causa**: El endpoint `/$value` no incluye metadata del archivo
- **Solucion**: Usar un Code node posterior para renombrar el binario con `fileName`, `fileExtension` y `mimeType` correctos

### Error: DynamoDB sobrescribe campos con valores vacios
- **Causa**: `PutItem` reemplaza TODO el registro, no solo los campos enviados
- **Solucion**: Siempre escribir todos los campos en cada nodo PutItem
- Para campos sin valor nuevo, reenviar el valor actual desde el GetItem previo

### Error: GSI Query no encuentra registros
- Verificar que el GSI tiene Projection: ALL
- Confirmar que el campo `whatsapp_numerico` existe y es de tipo Number en los registros
- El GSI puede tardar unos segundos en propagarse despues de un PutItem

### Error: docxtemplater "Error while rendering"
- **Causa comun**: Placeholder fragmentado en Word (ej: `{nombre` y `_trabajador}` en runs separados)
- **Solucion**: Abrir la plantilla .docx, borrar el placeholder completo, y reescribirlo de corrido sin formato parcial
- Tambien verificar que todos los campos esperados existan en los datos enviados

### Error: Contrato se sube en blanco a SharePoint
- **Causa**: El nodo `SP Upload plantilla a candidato` no recibe el binario correcto
- **Solucion**: Verificar que `Send Body: true`, `Body Content Type: Binary Data`, y `Input Data Field Name` coincida con la key del binario de salida de docxtemplater

### Error: URL no clickable en Teams
- **Causa**: Content Type del nodo Teams esta en "Text" (no interpreta HTML)
- **Solucion**: Cambiar Content Type a `HTML` y usar etiquetas `<a href="...">texto</a>`

---

## Credenciales Requeridas en n8n

| ID | Nombre | Tipo |
|----|--------|------|
| 9CiIvneniGlZsHuA | AWS (IAM) account | aws |
| dD73nY0GSpJgoo85 | Microsoft SharePoint account | microsoftSharePointOAuth2Api |
| kOO9YV1rwcnBw0LA | Microsoft Teams account | microsoftTeamsOAuth2Api |
| GO9tmcxWOovkyxpv | Microsoft Excel account | microsoftExcelOAuth2Api |
| - | Microsoft Outlook account | microsoftOutlookOAuth2Api |

---

## Versionamiento de Workflows

| Workflow | ID | Nodos (aprox) | Ultima actualizacion |
|----------|----|---------------|---------------------|
| Accion Email Dev NO TOCAR | fakhNdVX24iEssUn | ~87 | 2026-02-16 |
| My workflow 2 Dev NO TOCAR | 8YospYjKdjfGTUXN | 3 | 2026-02-10 |
| Contactacion Dev NO TOCAR | bbbMZdyNvKKqzkPg | 24 | 2026-02-10 |

### Workflows QA (copia de referencia)

| Workflow | ID |
|----------|----|
| Accion Email QA | (ver n8n) |
| My workflow 2 QA | OMu0ExeEpLbgRNSU |
| Contactacion QA | (ver n8n) |
