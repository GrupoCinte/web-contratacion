# Guia de Troubleshooting - Web IA Contratacion

Guia completa de errores conocidos, diagnostico y solucion para el sistema de contratacion IA.

---

## Indice

1. [Errores de n8n - Workflows](#errores-de-n8n---workflows)
2. [Errores de DynamoDB](#errores-de-dynamodb)
3. [Errores de SharePoint y Archivos](#errores-de-sharepoint-y-archivos)
4. [Errores de Contrato (docxtemplater)](#errores-de-contrato-docxtemplater)
5. [Errores de Microsoft Teams](#errores-de-microsoft-teams)
6. [Errores del Dashboard (Frontend/Backend)](#errores-del-dashboard-frontendbackend)
7. [Errores de Entorno Local](#errores-de-entorno-local)
8. [Historial de Incidentes](#historial-de-incidentes)
9. [Comandos Utiles de Diagnostico](#comandos-utiles-de-diagnostico)

---

## Errores de n8n - Workflows

### "Referenced node doesn't exist"

**Sintomas**: Un nodo Code o expresion falla indicando que el nodo referenciado no existe.

**Causa**: Un nodo fue eliminado o renombrado, pero otros nodos aun lo referencian via `$('NombreViejo')`.

**Ejemplo real**: `Code prepare WhatsApp Excel` referenciaba `$('Code check subcarpeta Excel')` que fue eliminado durante una migracion.

**Solucion**:
1. Buscar todas las expresiones que referencian el nodo eliminado
2. Reemplazar con el nodo correcto, ej: `$('Get DynamoDB candidato Excel')`
3. Ajustar el acceso a datos segun el formato del nuevo nodo (ej: `.S`, `.N` para DynamoDB)

### "Paired item data unavailable"

**Sintomas**: Error al acceder a datos entre nodos conectados.

**Causa**: Mismatch de items entre nodos (uno produce 1 item, el siguiente espera multiples).

**Solucion**: Cambiar `.item` por `.first()` en la expresion:
```
# Antes (falla):
$('Agente').item.json.output

# Despues (funciona):
$('Agente').first().json.output
```

### Corrupcion de nodos por MCP

**Sintomas**:
- Nodos DynamoDB fallan con "Bad request" incluso con datos hardcodeados
- Otros workflows con los mismos nodos SI funcionan
- Logs de Docker: `Cannot read properties of undefined (reading 'toString')`

**Causa**: La herramienta MCP `n8n_update_partial_workflow` puede corromper expresiones (agregar prefijos `=`, reemplazar expresiones por valores estaticos).

**Solucion**:
1. Copiar un nodo funcional del mismo workflow que NO haya sido tocado por MCP
2. Reconectarlo en el flujo y eliminar el corrupto
3. Alternativamente, recrear el nodo manualmente desde la UI de n8n

**Prevencion**: No usar MCP para modificar nodos con expresiones complejas. Hacer cambios manuales en la UI de n8n.

---

## Errores de DynamoDB

### "Bad request" en GSI Query

**Sintomas**: `AWS error response [undefined]: Bad request - please check your parameters`

**Causas comunes**:
1. `indexName` no coincide con el nombre real del GSI
2. Tipo de dato incorrecto (String en vez de Number)
3. Telefono con caracteres no numericos (`+57...`)

**Solucion**:
1. Verificar `indexName` = `whatsapp_numerico-index`
2. Tipo del Expression Attribute Value = `N` (Number)
3. Limpiar el telefono: `{{ $json.telefono.replace(/\D/g, '') }}`

### DynamoDB sobrescribe campos con valores vacios

**Causa**: `PutItem` reemplaza TODO el registro. Si no envias un campo, se borra.

**Solucion**: Siempre escribir todos los campos en cada nodo PutItem. Para campos sin valor nuevo, pasar el valor actual desde el GetItem previo:
```
{{ $('Get an item').first().json['nombre y apellido'].S }}
```

### GSI Query no encuentra registros

**Verificar**:
1. El GSI tiene `Projection: ALL`
2. El campo `whatsapp_numerico` existe y es tipo Number en los registros
3. El GSI puede tardar segundos en propagarse despues de un PutItem

---

## Errores de SharePoint y Archivos

### Archivos descargados con nombre `$value.bin`

**Causa**: El endpoint `/$value` de SharePoint REST API no incluye metadata del archivo.

**Solucion**: Agregar un Code node despues de la descarga:
```javascript
const item = $input.first();
const binary = item.binary.data;
binary.fileName = 'Plantilla Contrato.docx';
binary.fileExtension = 'docx';
binary.mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
return [{ json: item.json, binary: { data: binary } }];
```

### Archivo se sube en blanco a SharePoint

**Causa**: El nodo de upload no recibe el binario correctamente.

**Solucion**: Verificar en el nodo `SP Upload`:
- `Send Body` = true
- `Body Content Type` = Binary Data
- `Input Data Field Name` = la key del binario de salida del nodo anterior (verificar con ejecucion previa)

---

## Errores de Contrato (docxtemplater)

### "Error while rendering"

**Causa comun**: Los placeholders en Word estan fragmentados. Por ejemplo, Word puede dividir `{nombre_trabajador}` en multiples "runs" XML internos: `{nombre`, `_` y `trabajador}`.

**Solucion**:
1. Abrir la plantilla .docx en Word
2. Borrar completamente el placeholder (ej: `{nombre_trabajador}`)
3. Reescribirlo de corrido, sin copiar/pegar y sin aplicar formato parcial
4. Guardar y volver a subir la plantilla a SharePoint

**Tambien verificar**: Que todos los campos esperados en la plantilla tengan datos. Si un placeholder no tiene dato, docxtemplater puede fallar.

---

## Errores de Microsoft Teams

### URL no clickable en notificacion

**Causa**: El Content Type del nodo Teams esta configurado como "Text" (no interpreta HTML).

**Solucion**: Cambiar `Content Type` a `HTML` y usar etiquetas:
```html
<a href="{{ $json.d.LinkingUri }}">Ver contrato aqui</a>
```

---

## Errores del Dashboard (Frontend/Backend)

### CORS - Frontend no conecta con Backend

**Sintomas**: Error en consola del navegador:
```
Access to XMLHttpRequest at 'http://localhost:3001' from origin 'http://localhost:5174'
has been blocked by CORS policy
```

**Causa**: El frontend inicio en un puerto diferente al configurado en `FRONTEND_URL` del backend `.env`.

**Solucion**:
1. Matar el proceso que ocupa el puerto 5173:
   ```powershell
   netstat -ano | findstr :5173
   taskkill /PID <PID> /F
   ```
2. Verificar `FRONTEND_URL=http://localhost:5173` en `backend/.env`
3. Reiniciar ambos servidores

### Dashboard no muestra candidatos

**Verificar**:
1. Backend corriendo: `http://localhost:3001/api/health`
2. DynamoDB accesible: `http://localhost:3001/api/monitor`
3. Credenciales AWS correctas en `backend/.env`
4. WebSocket conectado (indicador verde en la barra superior del dashboard)

---

## Errores de Entorno Local

### Puerto en uso

```powershell
# Encontrar proceso en el puerto
netstat -ano | findstr :5173
netstat -ano | findstr :3001

# Matar proceso
taskkill /PID <PID> /F
```

### npm install cuelga

**Causa comun**: El proyecto esta dentro de Google Drive / OneDrive. Estos servicios sincronizan `node_modules/` y bloquean archivos.

**Solucion**: Mover el proyecto a una ruta local como `C:\Proyectos\`.

### PowerShell - Ruta con caracteres especiales

Si la ruta tiene espacios o caracteres como `ó`, usar comillas:
```powershell
cd "C:\Users\USER\Downloads\Web IA Contratación"
```

---

## Historial de Incidentes

| Fecha | Error | Workflow/Componente | Solucion |
|-------|-------|---------------------|----------|
| 2026-02-10 | DynamoDB Bad request (corrupcion MCP) | Accion Email Dev | Copiar nodo funcional no afectado por MCP |
| 2026-02-10 | CORS mismatch 5173 vs 5174 | Dashboard | Matar proceso en 5173, reiniciar frontend |
| 2026-02-10 | npm cuelga en Google Drive | Frontend/Backend | Migrar a disco local |
| 2026-02-10 | "Referenced node doesn't exist" | Accion Email Dev | Actualizar referencias de nodos eliminados |
| 2026-02-16 | docxtemplater "Error while rendering" | Accion Email Dev | Reescribir placeholders en plantilla Word |
| 2026-02-16 | Contrato subido en blanco a SP | Accion Email Dev | Corregir Input Data Field Name en SP Upload |
| 2026-02-16 | URL no clickable en Teams | Accion Email Dev | Cambiar Content Type a HTML |
| 2026-02-16 | GSI Bad request (Number vs String) | Contactacion Dev | Cambiar tipo a N, limpiar telefono |

---

## Comandos Utiles de Diagnostico

### Verificar backend

```powershell
# Health check
Invoke-WebRequest -Uri http://localhost:3001/api/health -UseBasicParsing

# Listar candidatos
Invoke-WebRequest -Uri http://localhost:3001/api/monitor -UseBasicParsing
```

### Verificar puertos

```powershell
netstat -ano | findstr :5173
netstat -ano | findstr :3001
```

### Verificar DynamoDB (AWS CLI)

```bash
# Listar registros
aws dynamodb scan --table-name n8n_table_state_users --max-items 5

# Buscar por email (PK)
aws dynamodb get-item --table-name n8n_table_state_users \
  --key '{"whatsapp_number": {"S": "email@ejemplo.com"}}'

# Buscar por telefono (GSI)
aws dynamodb query --table-name n8n_table_state_users \
  --index-name whatsapp_numerico-index \
  --key-condition-expression "whatsapp_numerico = :tel" \
  --expression-attribute-values '{":tel": {"N": "573001234567"}}'
```

### Logs de n8n (Docker)

```bash
docker logs n8n_app --tail 100 -f
docker logs n8n_app --tail 100 2>&1 | grep -i "error\|bad request\|dynamodb"
```

---

*Ultima actualizacion: 2026-02-17*
