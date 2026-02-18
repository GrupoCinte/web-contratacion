# Guia Rapida de Configuracion

## Paso 1: Obtener Credenciales AWS

1. Ve a [AWS Console](https://console.aws.amazon.com)
2. Click en tu nombre de usuario (arriba a la derecha) > **Security Credentials**
3. Baja hasta **Access Keys** > **Create access key**
4. Selecciona **Application running outside AWS** > Next
5. Copia el **Access Key ID** y **Secret Access Key**

> **IMPORTANTE**: Guarda el Secret Access Key inmediatamente, solo se muestra una vez.

---

## Paso 2: Configurar el Backend

Edita el archivo `backend/.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key_aqui
AWS_SECRET_ACCESS_KEY=tu_secret_key_aqui

DYNAMODB_TABLE_NAME=n8n_table_state_users
DYNAMODB_GSI_NAME=email

PORT=3001
FRONTEND_URL=http://localhost:5173
```

Si es primera vez, puedes copiar desde el ejemplo:

```bash
cd backend
cp .env.example .env
```

---

## Paso 3: Instalar Dependencias

```bash
# Backend
cd backend
npm install

# Frontend (en otra terminal)
cd frontend
npm install
```

---

## Paso 4: Ejecutar

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## Verificacion

1. **Backend funcionando**: Visita http://localhost:3001/api/health
   - Deberias ver: `{"status":"ok","timestamp":"..."}`

2. **DynamoDB conectado**: Visita http://localhost:3001/api/monitor
   - Deberias ver: `{"success":true,"count":X,"executions":[...]}`

3. **Dashboard**: Abre http://localhost:5173
   - Deberias ver la barra lateral con 3 secciones: Activos (tabla), Historicos (tabla), Metricas (graficos)

---

## Troubleshooting Rapido

| Error | Solucion |
|-------|----------|
| "Access Denied" o "UnrecognizedClientException" | Verifica credenciales AWS en `backend/.env` |
| "ResourceNotFoundException" | Verifica `DYNAMODB_TABLE_NAME=n8n_table_state_users` |
| CORS Error en el navegador | Verifica que `FRONTEND_URL` en `.env` coincida con el puerto del frontend |
| Puerto en uso | Matar proceso: `netstat -ano \| findstr :5173` luego `taskkill /PID <PID> /F` |
| Dashboard no muestra datos | Verifica que el backend este corriendo y conectado a DynamoDB |

> **Despliegue en produccion?** Consulta [DEPLOYMENT.md](./DEPLOYMENT.md) para la guia completa de EC2 + Docker + Cloudflare.

---

## Estructura del Proyecto

```
Web IA Contratacion/
  backend/
    server.js              # API Express + WebSockets
    websocketServer.js     # Configuracion WebSocket
    streamPoller.js        # Polling DynamoDB Streams
    enableStreams.js        # Utilidad: habilitar streams en DynamoDB
    seed-history.js        # Utilidad: poblar datos de prueba
    .env                   # Credenciales (NO subir a git)
    .env.example           # Plantilla de credenciales
  frontend/
    src/
      App.jsx              # Componente raiz con navegacion
      hooks/
        useMonitorData.js  # Hook centralizado (API + WebSocket + metricas)
      components/
        Layout.jsx         # Contenedor principal (sidebar + contenido)
        Sidebar.jsx        # Barra lateral colapsable
        ActiveCandidates.jsx    # Vista: tabla de candidatos activos (ordenable)
        HistoryCandidates.jsx   # Vista: tabla de candidatos historicos (ordenable)
        MetricsDashboard.jsx    # Vista: graficos y metricas (Chart.js)
        CandidateCard.jsx       # Card reutilizable
        CandidateModal.jsx      # Modal de detalle
        KPICards.jsx            # Tarjetas KPI reutilizables
    .env                   # URL del backend
  README.md                # Documentacion general
  N8N_CONFIGURATION.md     # Documentacion detallada de n8n
  MIGRATION.md             # Guia de migracion y GitHub
```

---

## DynamoDB - Referencia Rapida

| Parametro | Valor |
|-----------|-------|
| Tabla | `n8n_table_state_users` |
| Partition Key | `whatsapp_number` (String) - almacena email |
| GSI | `whatsapp_numerico-index` |
| GSI Partition Key | `whatsapp_numerico` (Number) - almacena telefono |
| Billing | On-Demand (PAY_PER_REQUEST) |

### Campos por registro

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `whatsapp_number` | S | PK - Email del candidato |
| `nombre y apellido` | S | Nombre completo |
| `edad` | S | Edad |
| `cedula` | N | Numero de cedula |
| `puesto` | S | Cargo al que aplica |
| `status` | S | Estado actual del proceso |
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
| `fecha_inicio` | S | Fecha de inicio del contrato |
