# Guia de Migracion y Control de Versiones

## Parte 1: Mover el Proyecto a Otro Equipo (Local)

### Paso 1 - Preparar para copiar

```bash
# Opcional: eliminar node_modules para reducir tamano
# (se reinstalan con npm install)
rmdir /s /q backend\node_modules
rmdir /s /q frontend\node_modules
```

### Paso 2 - Copiar la carpeta

Copia toda la carpeta `Web IA Contratacion` al nuevo equipo via USB, red, o servicio en la nube.

> **IMPORTANTE**: Evita tener el proyecto dentro de Google Drive o OneDrive. Estos servicios de sincronizacion causan problemas con `node_modules` y pueden colgar `npm install`. Usa una ruta local como `C:\Proyectos\`.

### Paso 3 - Instalar Node.js

Descarga e instala Node.js v18+ desde [nodejs.org](https://nodejs.org/).

Verifica la instalacion:
```bash
node --version   # Debe ser v18 o superior
npm --version    # Debe ser v9 o superior
```

### Paso 4 - Instalar dependencias

```bash
cd backend
npm install

cd ..\frontend
npm install
```

### Paso 5 - Configurar credenciales

Edita `backend/.env` con las credenciales AWS del nuevo entorno:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
DYNAMODB_TABLE_NAME=n8n_table_state_users
DYNAMODB_GSI_NAME=email
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Paso 6 - Ejecutar

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

Abre http://localhost:5173 en el navegador.

---

## Parte 2: Subir a GitHub

### Requisitos previos

- Tener una cuenta en [GitHub](https://github.com)
- Tener Git instalado: [git-scm.com](https://git-scm.com/downloads)

### Paso 1 - Verificar .gitignore

El proyecto ya incluye un `.gitignore` que excluye:
- `node_modules/` (dependencias, se reinstalan con npm install)
- `.env` (credenciales, NUNCA subir a git)
- `*.log` (archivos de log)

Verifica que tu `.env` con credenciales **NO** se suba:

```bash
# Desde la raiz del proyecto
type .gitignore
# Debe incluir: .env
```

### Paso 2 - Inicializar repositorio Git

```bash
cd "C:\ruta\a\Web IA Contratacion"

git init
git add .
git commit -m "Commit inicial: Sistema de Contratacion IA - Grupo Cinte"
```

### Paso 3 - Crear repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre del repositorio: `web-ia-contratacion` (o el que prefieras)
3. Visibilidad: **Private** (recomendado, contiene logica de negocio)
4. **NO** marcar "Add a README" (ya tenemos uno)
5. Click en **Create repository**

### Paso 4 - Conectar y subir

GitHub mostrara los comandos. Ejecuta:

```bash
git remote add origin https://github.com/TU_USUARIO/web-ia-contratacion.git
git branch -M main
git push -u origin main
```

Si te pide autenticacion, usa un **Personal Access Token** (PAT):
1. Ve a GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Genera un nuevo token con permisos `repo`
3. Usa el token como contrasena cuando Git lo pida

### Paso 5 - Verificar

Ve a `https://github.com/TU_USUARIO/web-ia-contratacion` y confirma que:
- Los archivos estan subidos
- **NO** aparece `backend/.env` (esta en .gitignore)
- **NO** aparecen carpetas `node_modules`

---

## Parte 3: Clonar en Otro Equipo desde GitHub

```bash
# Clonar
git clone https://github.com/TU_USUARIO/web-ia-contratacion.git
cd web-ia-contratacion

# Instalar dependencias
cd backend && npm install
cd ..\frontend && npm install

# Configurar credenciales (crear .env manualmente)
cd ..\backend
copy .env.example .env
# Editar .env con las credenciales reales

# Ejecutar
cd backend && npm run dev
# (nueva terminal)
cd frontend && npm run dev
```

---

## Parte 4: Flujo de Trabajo con Git

### Guardar cambios

```bash
git add .
git commit -m "Descripcion breve del cambio"
git push
```

### Traer cambios de otro equipo

```bash
git pull
```

### Crear una rama para cambios grandes

```bash
git checkout -b nombre-de-la-rama
# Hacer cambios...
git add .
git commit -m "Descripcion del cambio"
git push -u origin nombre-de-la-rama
```

Luego en GitHub, crear un Pull Request para fusionar la rama con `main`.

---

## Archivos que NO se Suben a Git

| Archivo | Razon |
|---------|-------|
| `backend/.env` | Contiene credenciales AWS |
| `frontend/.env` | Configuracion local |
| `node_modules/` | Se reinstalan con `npm install` |
| `*.log` | Archivos temporales |
| `dist/`, `build/` | Se regeneran con `npm run build` |

Para compartir la configuracion sin exponer credenciales, usa `backend/.env.example` como plantilla.
