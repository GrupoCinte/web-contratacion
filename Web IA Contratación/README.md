# Sistema de Contratacion IA - Grupo Cinte

Sistema automatizado de contratacion que integra n8n, IA (AWS Bedrock), SharePoint, WhatsApp y un dashboard de monitoreo en tiempo real.

---

## Tabla de Contenidos

- [Descripcion](#descripcion)
- [Arquitectura](#arquitectura)
- [Componentes](#componentes)
- [Requisitos Previos](#requisitos-previos)
- [Configuracion de DynamoDB](#configuracion-de-dynamodb)
- [Instalacion del Backend](#instalacion-del-backend)
- [Instalacion del Frontend](#instalacion-del-frontend)
- [Configuracion de n8n](#configuracion-de-n8n)
- [Ejecucion Local](#ejecucion-local)
- [Subir a GitHub](#subir-a-github)
- [Despliegue en Produccion (EC2 + Docker)](#despliegue-en-produccion-ec2--docker)
- [Troubleshooting](#troubleshooting)

---

## Descripcion

Plataforma end-to-end que automatiza el proceso de contratacion:

1. **Recepcion de documentos** via email (Outlook)
2. **Analisis con IA** de documentos del candidato (AWS Bedrock)
3. **Almacenamiento** en SharePoint (carpetas organizadas por candidato)
4. **Generacion automatica de contratos** usando plantillas Word (docxtemplater)
5. **Comunicacion automatica** con el candidato via WhatsApp (chatbot IA)
6. **Filtro de tipos de contrato** especiales antes de contactacion
7. **Monitoreo en tiempo real** del estado de cada candidato via dashboard web

---

## Arquitectura

```
                    +------------------+
                    |  Outlook Email   |
                    +--------+---------+
                             |
                             v
+----------------------------------------------------------------+
|                    n8n (Self-Hosted v2.6.3)                     |
|                                                                |
|  +-----------------------+  +-------------+  +---------------+ |
|  | Accion Email Dev      |  | My workflow |  | Contactacion  | |
|  | (WF1 - ~87 nodos)     |  | 2           |  |               | |
|  |                       |  | (WF2 - 3)   |  |  (WF3 - 24)   | |
|  | - Analisis IA         |  |             |  |               | |
|  | - Validacion docs     |  | - Actualiza |  | - Chatbot WA  | |
|  | - SharePoint upload   |  |   status    |  | - AI Agent    | |
|  | - Email respuesta     |  |   Aceptado  |  | - Contrato    | |
|  | - Sagrilaft           |  |             |  |               | |
|  | - Docxtemplater       |  |             |  |               | |
|  | - Filtro contrato     |  |             |  |               | |
|  +-----------+-----------+  +------+------+  +-------+-------+ |
|              |                     |                 |          |
+----------------------------------------------------------------+
               |                     |                 |
               v                     v                 v
+----------------------------------------------------------------+
|                      AWS DynamoDB                              |
|   Tabla: n8n_table_state_users                                 |
|   PK: whatsapp_number (email)                                  |
|   GSI: whatsapp_numerico-index (telefono, Number)              |
|   17 campos por candidato                                      |
+----------------------------------------------------------------+
               |                                       |
               v                                       v
+----------------------------+         +---------------------------+
|   Dashboard (React/Vite)   |         |  SharePoint (REST API)    |
|   - Candidatos activos     |         |  - Carpetas candidato     |
|   - Historicos             |         |  - Documentos             |
|   - Metricas (Chart.js)   |         |  - SAGRILAFT              |
|   - WebSockets             |         |  - Contratos (auto)       |
+----------------------------+         +---------------------------+
```

---

## Componentes

### n8n Workflows

| Workflow | ID | Funcion |
|----------|----|---------|
| Accion Email Dev NO TOCAR | `fakhNdVX24iEssUn` | Procesamiento de emails con documentos, analisis IA, SharePoint, contratos |
| My workflow 2 Dev NO TOCAR | `8YospYjKdjfGTUXN` | Sub-workflow: marca candidato como "Aceptado" |
| Contactacion Dev NO TOCAR | `bbbMZdyNvKKqzkPg` | Chatbot WhatsApp con IA, gestion de contrato |

> Consultar **[N8N_CONFIGURATION.md](./N8N_CONFIGURATION.md)** para documentacion detallada nodo por nodo.

### Dashboard Web

| Componente | Tecnologia | Funcion |
|-----------|------------|---------|
| Frontend | React + Vite + Tailwind CSS + Chart.js | Dashboard modular de monitoreo |
| Backend | Express + WebSockets | API REST + streaming de datos en tiempo real |
| Base de datos | AWS DynamoDB + DynamoDB Streams | Estado de candidatos con actualizaciones |

### Servicios Cloud

| Servicio | Proveedor | Uso |
|----------|-----------|-----|
| DynamoDB | AWS | Persistencia de estado de candidatos |
| Bedrock (Claude/Nova) | AWS | Agentes de IA para analisis y chatbot |
| Social Messaging | AWS | Envio de mensajes WhatsApp |
| SharePoint | Microsoft 365 | Almacenamiento de documentos y contratos |
| Outlook | Microsoft 365 | Trigger de email entrante |
| Teams | Microsoft 365 | Notificaciones internas al equipo |
| Excel 365 | Microsoft 365 | Datos maestros de candidatos |

---

## Requisitos Previos

- **Node.js** v18+
- **npm** v9+
- **n8n** v2.6.3 (Self-Hosted)
- **Cuenta AWS** con acceso a DynamoDB, Bedrock, Social Messaging
- **Microsoft 365** con acceso a SharePoint, Outlook, Teams, Excel
- **WhatsApp Business API** configurada con AWS Social Messaging
- **Git** (opcional, para control de versiones - ver [MIGRATION.md](./MIGRATION.md))

---

## Configuracion de DynamoDB

### Tabla principal: `n8n_table_state_users`

| Parametro | Valor |
|-----------|-------|
| Partition Key | `whatsapp_number` (String) - almacena email |
| Billing Mode | On-Demand |

### GSI: `whatsapp_numerico-index`

| Parametro | Valor |
|-----------|-------|
| Partition Key | `whatsapp_numerico` (Number) - almacena telefono |
| Projection | ALL |

### Campos por registro

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `whatsapp_number` | S | PK - Email del candidato |
| `nombre y apellido` | S | Nombre completo |
| `edad` | S | Edad |
| `cedula` | N | Numero de cedula |
| `puesto` | S | Cargo al que aplica |
| `status` | S | Estado del proceso |
| `email` | S | Email del candidato |
| `statuses` | S | Flag de control WhatsApp |
| `whatsapp_numerico` | N | Telefono (solo digitos) |
| `documentos` | S | Documentos encontrados |
| `ts_documentos_recibidos` | S | Timestamp inicio |
| `ts_analisis_ia_completado` | S | Timestamp fin analisis IA |
| `ts_validacion_completada` | S | Timestamp fin validacion |
| `direccion` | S | Direccion del candidato |
| `salario_numeros` | S | Salario en formato numerico |
| `salario_letras` | S | Salario en letras |
| `fecha_inicio` | S | Fecha inicio contrato |

### Crear tabla con AWS CLI

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

### Ciclo de vida del status

```
ANALIZANDO --> validado --> comunicando --> Aceptado --> esperando_contrato --> completado
  (WF1)         (WF1)       (WF3)          (WF2)         (WF1)                (WF3)
```

---

## Instalacion del Backend

```bash
cd backend
npm install
cp .env.example .env
```

Editar `backend/.env` con credenciales reales:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key

DYNAMODB_TABLE_NAME=n8n_table_state_users
DYNAMODB_GSI_NAME=email

PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Estructura

```
backend/
  server.js              # Servidor Express + WebSockets + API REST
  websocketServer.js     # Configuracion WebSocket para streaming
  streamPoller.js        # Polling DynamoDB Streams
  enableStreams.js        # Utilidad: habilitar DynamoDB Streams
  seed-history.js        # Utilidad: poblar datos historicos de prueba
  package.json
  .env.example           # Plantilla de credenciales
```

---

## Instalacion del Frontend

```bash
cd frontend
npm install
```

El archivo `.env` ya esta configurado:

```env
VITE_API_URL=http://localhost:3001
```

### Estructura (Arquitectura Modular)

```
frontend/
  src/
    App.jsx                           # Componente raiz con navegacion entre vistas
    hooks/
      useMonitorData.js               # Hook centralizado: API fetch + WebSocket + metricas
    components/
      Layout.jsx                      # Contenedor: sidebar + barra superior + contenido
      Sidebar.jsx                     # Barra lateral colapsable (Activos/Historicos/Metricas)
      ActiveCandidates.jsx            # Vista: tabla de candidatos activos (ordenable)
      HistoryCandidates.jsx           # Vista: tabla de candidatos historicos (ordenable)
      MetricsDashboard.jsx            # Vista: graficos y metricas con Chart.js
      CandidateCard.jsx               # Card reutilizable para candidato
      CandidateModal.jsx              # Modal de detalle con datos completos
      KPICards.jsx                    # Tarjetas KPI reutilizables
  index.html
  vite.config.js
  tailwind.config.js
  postcss.config.js
  package.json
```

### Dashboard - Vistas

| Vista | Descripcion |
|-------|-------------|
| **Activos** | Tabla tipo base de datos con candidatos en proceso. Columnas: Nombre, Email, Cargo, Estado, Inicio, Ultima actualizacion. Columnas ordenables. Click en fila abre modal de detalle. |
| **Historicos** | Tabla tipo base de datos con candidatos finalizados. Columnas: Nombre, Email, Cargo, Estado, Duracion, Finalizado. Ordenable. Click en fila abre modal de detalle. |
| **Metricas** | Graficos Chart.js: distribucion por estado, candidatos por cargo, tiempos de proceso. KPIs completos. |

---

## Configuracion de n8n

Consultar **[N8N_CONFIGURATION.md](./N8N_CONFIGURATION.md)** para configuracion general y **[N8N_WORKFLOWS_TECHNICAL.md](./N8N_WORKFLOWS_TECHNICAL.md)** para documentacion tecnica nodo por nodo:

- Arquitectura de los 3 workflows y sus subflujos
- Configuracion de cada nodo DynamoDB
- Uso del GSI para consultas por telefono
- Integracion con SharePoint REST API
- Generacion automatica de contratos con docxtemplater
- Filtro de tipos de contrato especiales
- Manejo de la ventana de 24h de WhatsApp
- Troubleshooting de errores comunes

### Resumen rapido

1. **Accion Email** recibe correos, analiza documentos con IA, sube a SharePoint, genera contratos, escribe en DynamoDB
2. **Contactacion** recibe mensajes WhatsApp, chatbot IA responde, gestiona aceptacion y contrato
3. **My workflow 2** sub-workflow que marca al candidato como "Aceptado" en DynamoDB
4. Todos los nodos DynamoDB PutItem escriben los **17 campos** para evitar perdida de datos
5. El **email del candidato** es la clave unica (partition key) en DynamoDB
6. El **telefono** se consulta via GSI `whatsapp_numerico-index` desde Contactacion
7. Tipos de contrato especiales se filtran antes de continuar el flujo

---

## Ejecucion Local

### 1. Backend

```bash
cd backend
npm run dev
```

Disponible en `http://localhost:3001`

Endpoints:
- `GET /api/health` - Health check
- `GET /api/monitor` - Lista candidatos de DynamoDB
- WebSocket en `ws://localhost:3001` - Streaming de actualizaciones

### 2. Frontend

```bash
cd frontend
npm run dev
```

Disponible en `http://localhost:5173`

### 3. n8n

Asegurar que n8n esta corriendo y los 3 workflows estan activos.

### Script rapido (PowerShell)

```powershell
# Desde la raiz del proyecto:
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
```

---

## Subir a GitHub

Ver la guia completa en **[MIGRATION.md](./MIGRATION.md)** que incluye:

1. Preparacion del proyecto
2. Creacion de repositorio en GitHub
3. Primer push
4. Clonar en otro equipo
5. Flujo de trabajo con ramas

### Resumen rapido

```bash
git init
git add .
git commit -m "Commit inicial: Sistema de Contratacion IA"
git remote add origin https://github.com/TU_USUARIO/web-ia-contratacion.git
git branch -M main
git push -u origin main
```

> **NUNCA** subas el archivo `backend/.env` con credenciales reales. El `.gitignore` ya lo excluye.

---

## Despliegue en Produccion (EC2 + Docker)

El sistema de produccion corre en **AWS EC2 (t2.micro)** con **Ubuntu**, **Docker** y **Docker Compose**.

| Componente | Tecnologia | Estado |
|-----------|------------|--------|
| n8n | Docker container (`n8n_app`) | En produccion |
| Cloudflare Tunnel | Docker container (`cloudflare_tunnel`) | En produccion |
| Dashboard Backend | PM2 + Express (futuro) | Pendiente |
| Dashboard Frontend | Nginx + build estatico (futuro) | Pendiente |

- **Dominio**: `automatizacion.grupocinte.com` (n8n)
- **Acceso**: Via Cloudflare Tunnel (sin exponer puertos directamente)
- **Recursos**: CPU limitada a 80%, memoria limitada a 850M para n8n

### Guia completa

Consultar **[DEPLOYMENT.md](./DEPLOYMENT.md)** para el paso a paso detallado:

1. Crear instancia EC2 y configurar Ubuntu
2. Instalar Docker y Docker Compose
3. Desplegar n8n con Dockerfile custom (docxtemplater, pizzip)
4. Configurar Cloudflare Tunnel con dominio propio
5. Desplegar dashboard (backend PM2 + frontend Nginx)
6. Backups automaticos, monitoreo y mantenimiento
7. Consideraciones de recursos para t2.micro

---

## Troubleshooting

| Problema | Causa | Solucion |
|----------|-------|----------|
| Dashboard no muestra candidatos | Backend no conecta a DynamoDB | Verificar credenciales AWS en `backend/.env` |
| "Referenced node doesn't exist" en n8n | Nodo renombrado o eliminado | Actualizar expresiones `$('NombreNodo')` |
| "Paired item data unavailable" | Mismatch de items entre nodos | Cambiar `.item` por `.first()` |
| "Bad request" en GSI Query | Tipo de dato incorrecto | Asegurar Number para `whatsapp_numerico`, quitar `+` del telefono |
| Archivos de SharePoint con nombre `$value` | Descarga via REST API sin metadata | Usar Code node para renombrar binario |
| DynamoDB borra campos al actualizar | PutItem sobrescribe todo el registro | Siempre enviar los 17 campos en cada PutItem |
| WhatsApp no responde despues de 24h | Ventana de mensajeria expirada | Usar Template Messages pre-aprobados |
| CORS error en frontend | URL no coincide | Verificar `FRONTEND_URL` en `.env` coincida con puerto del frontend |
| Puerto 5173 en uso | Proceso zombie del frontend | `netstat -ano \| findstr :5173` y matar el PID |
| Contrato se sube en blanco | Binary key incorrecta en upload | Verificar `Input Data Field Name` en nodo SP Upload |
| URL no clickable en Teams | Content type incorrecto | Cambiar Content Type a `HTML` y usar `<a>` tags |
| docxtemplater error "while rendering" | Placeholder fragmentado en Word | Abrir plantilla .docx, borrar tag y reescribirlo sin formato |

---

## Documentacion Adicional

| Archivo | Contenido |
|---------|-----------|
| [N8N_CONFIGURATION.md](./N8N_CONFIGURATION.md) | Configuracion general: DynamoDB, GSI, servicios, status |
| [N8N_WORKFLOWS_TECHNICAL.md](./N8N_WORKFLOWS_TECHNICAL.md) | Documentacion tecnica nodo por nodo de los 3 workflows |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Despliegue en AWS EC2 + Docker + Cloudflare |
| [MIGRATION.md](./MIGRATION.md) | Guia de migracion local y subida a GitHub |
| [SETUP.md](./SETUP.md) | Guia rapida de configuracion inicial |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Guia extendida de resolucion de problemas |

---

## Licencia

MIT

---

## Contacto

Grupo Cinte Colombia - Gerencia Fabrica de Software - Luis Miguel Correa - Arquitecto IA & Data
