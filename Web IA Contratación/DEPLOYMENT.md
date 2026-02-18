# Guia de Despliegue en AWS EC2 - Sistema de Contratacion IA

Guia paso a paso para desplegar el sistema completo en una instancia EC2 de AWS con Ubuntu, Docker y Docker Compose.

---

## Indice

1. [Arquitectura de Produccion](#arquitectura-de-produccion)
2. [Crear Instancia EC2](#crear-instancia-ec2)
3. [Configurar Ubuntu](#configurar-ubuntu)
4. [Instalar Docker y Docker Compose](#instalar-docker-y-docker-compose)
5. [Desplegar n8n](#desplegar-n8n)
6. [Configurar Cloudflare Tunnel](#configurar-cloudflare-tunnel)
7. [Docker Compose Completo (n8n + Tunnel)](#docker-compose-completo-n8n--tunnel)
8. [Desplegar Dashboard (Backend + Frontend)](#desplegar-dashboard-backend--frontend)
9. [Consideraciones de Recursos (t2.micro)](#consideraciones-de-recursos-t2micro)
10. [Mantenimiento y Operaciones](#mantenimiento-y-operaciones)
11. [Seguridad](#seguridad)
12. [Troubleshooting de Produccion](#troubleshooting-de-produccion)

---

## Arquitectura de Produccion

```
Internet
    |
    v
+---------------------------------------------+
|  Cloudflare (DNS + Tunnel)                  |
|  automatizacion.grupocinte.com --> n8n:5678  |
|  (futuro: dashboard.grupocinte.com --> :3001)|
+---------------------------------------------+
    |
    v
+---------------------------------------------+
|  AWS EC2 (t2.micro - Ubuntu)                |
|                                             |
|  +------ Docker Compose ------+             |
|  |                            |             |
|  |  n8n_app (container)       |             |
|  |  - Puerto 5678             |             |
|  |  - CPU: 0.80 / Mem: 850M  |             |
|  |                            |             |
|  |  cloudflare_tunnel         |             |
|  |  - Expone n8n al dominio   |             |
|  |                            |             |
|  +----------------------------+             |
|                                             |
|  Dashboard (futuro):                        |
|  - Backend Express :3001 (PM2)              |
|  - Frontend build estatico (Nginx/Caddy)    |
|                                             |
+---------------------------------------------+
    |
    v
+---------------------------------------------+
|  AWS DynamoDB (n8n_table_state_users)       |
|  AWS Bedrock (Agentes IA)                   |
|  AWS Social Messaging (WhatsApp)            |
+---------------------------------------------+
```

---

## Crear Instancia EC2

### 1. Ir a AWS Console > EC2 > Launch Instance

| Parametro | Valor |
|-----------|-------|
| Nombre | `contratacion-ia-server` |
| AMI | Ubuntu Server 24.04 LTS (o 22.04 LTS) |
| Tipo de instancia | `t2.micro` (1 vCPU, 1 GB RAM) |
| Key pair | Crear o seleccionar una existente (.pem) |
| Almacenamiento | 20-30 GB gp3 (SSD) |

### 2. Security Group (Firewall)

| Tipo | Protocolo | Puerto | Origen | Descripcion |
|------|-----------|--------|--------|-------------|
| SSH | TCP | 22 | Tu IP | Acceso SSH |
| Custom TCP | TCP | 5678 | 0.0.0.0/0 | n8n (opcional si solo usas tunnel) |
| Custom TCP | TCP | 3001 | 0.0.0.0/0 | Backend dashboard (futuro) |
| Custom TCP | TCP | 80 | 0.0.0.0/0 | Frontend dashboard (futuro) |
| Custom TCP | TCP | 443 | 0.0.0.0/0 | HTTPS (futuro) |

> **Nota**: Si usas Cloudflare Tunnel exclusivamente, solo necesitas el puerto 22 (SSH). El tunnel hace todo el routing sin necesidad de abrir puertos adicionales.

### 3. Elastic IP (recomendado)

Asignar una Elastic IP a la instancia para que la IP publica no cambie al reiniciar:

1. EC2 > Elastic IPs > Allocate Elastic IP address
2. Actions > Associate Elastic IP address > Seleccionar tu instancia

### 4. Conectarse por SSH

```bash
# Dar permisos al archivo .pem (solo la primera vez)
chmod 400 tu-clave.pem

# Conectarse
ssh -i tu-clave.pem ubuntu@TU_IP_PUBLICA
```

Desde Windows (PowerShell):
```powershell
ssh -i "C:\ruta\tu-clave.pem" ubuntu@TU_IP_PUBLICA
```

---

## Configurar Ubuntu

### Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar utilidades basicas

```bash
sudo apt install -y curl wget git htop nano unzip
```

### Configurar swap (importante para t2.micro con 1 GB RAM)

La t2.micro solo tiene 1 GB de RAM. Agregar swap evita que los procesos se maten por falta de memoria:

```bash
# Crear archivo de swap de 2 GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Hacer permanente (persiste despues de reboot)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verificar
free -h
# Debe mostrar: Swap: 2.0G
```

### Configurar timezone

```bash
sudo timedatectl set-timezone America/Bogota
timedatectl
```

---

## Instalar Docker y Docker Compose

### Instalar Docker Engine

```bash
# Agregar repositorio oficial de Docker
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar
docker --version
docker compose version
```

### Permitir usar Docker sin sudo

```bash
sudo usermod -aG docker ubuntu
# Cerrar sesion y volver a conectar para que aplique
exit
```

Reconectar por SSH y verificar:

```bash
docker ps
# Debe funcionar sin sudo
```

---

## Desplegar n8n

### Crear directorio del proyecto

```bash
mkdir -p /home/ubuntu/n8n
cd /home/ubuntu/n8n
```

### Crear Dockerfile

n8n usa un Dockerfile custom para instalar paquetes npm adicionales (docxtemplater, pizzip):

```bash
nano Dockerfile
```

Contenido:

```dockerfile
FROM n8nio/n8n:latest

USER root

# Instalar paquetes npm que se usan en Code nodes
RUN npm install -g docxtemplater pizzip

USER node
```

### Crear docker-compose.yml

```bash
nano docker-compose.yml
```

Contenido:

```yaml
services:
  n8n:
    build: .
    container_name: n8n_app
    restart: always
    environment:
      - NODE_ENV=production
      - N8N_PROTOCOL=https
      - N8N_SECURE_COOKIE=false
      - N8N_HOST=automatizacion.grupocinte.com
      - WEBHOOK_URL=https://automatizacion.grupocinte.com/
      - N8N_EXECUTIONS_DATA_MAX_AGE=72
      - N8N_EXECUTIONS_DATA_PRUNE_MAX_COUNT=300
      - NODE_FUNCTION_ALLOW_EXTERNAL=docxtemplater,pizzip
      - NODE_PATH=/usr/local/lib/node_modules
      - N8N_BLOCK_EXTERNAL_STORAGE_FUNCTIONS=false
      - N8N_TASKS_EVALUATOR=internal
      - N8N_TASKS_RUNNER_ENABLED=false
    deploy:
      resources:
        limits:
          cpus: '0.80'
          memory: 850M
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n

  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare_tunnel
    restart: always
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}

volumes:
  n8n_data:
```

### Crear archivo .env para el token del tunnel

```bash
nano .env
```

Contenido:

```env
CLOUDFLARE_TUNNEL_TOKEN=tu_token_de_cloudflare_aqui
```

> **SEGURIDAD**: Nunca incluyas el token directamente en el docker-compose.yml ni lo subas a Git. Usa variables de entorno o el archivo `.env`.

### Construir y levantar

```bash
cd /home/ubuntu/n8n

# Construir imagen custom de n8n
docker compose build

# Levantar en segundo plano
docker compose up -d

# Verificar que estan corriendo
docker compose ps
```

Salida esperada:

```
NAME                IMAGE                           STATUS
n8n_app             n8n-n8n                         Up
cloudflare_tunnel   cloudflare/cloudflared:latest   Up
```

### Verificar n8n

```bash
# Logs en tiempo real
docker logs n8n_app -f

# Verificar que responde
curl -s http://localhost:5678/healthz
```

Desde el navegador, ir a `https://automatizacion.grupocinte.com` y verificar que carga n8n.

---

## Configurar Cloudflare Tunnel

### Prerequisitos

1. Dominio registrado y gestionado por Cloudflare (DNS)
2. Cuenta Cloudflare con acceso a Zero Trust

### Crear el tunnel en Cloudflare

1. Ir a [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) > Networks > Tunnels
2. Click en **Create a tunnel**
3. Seleccionar **Cloudflared** como tipo
4. Nombre: `contratacion-ia` (o el que prefieras)
5. Copiar el **token** que te da Cloudflare
6. Guardarlo en `/home/ubuntu/n8n/.env` como `CLOUDFLARE_TUNNEL_TOKEN`

### Configurar ruta publica

En la pagina del tunnel en Cloudflare:

1. **Public Hostnames** > Add a public hostname
2. Configurar:

| Campo | Valor |
|-------|-------|
| Subdomain | `automatizacion` |
| Domain | `grupocinte.com` |
| Type | `HTTP` |
| URL | `n8n_app:5678` |

> **Nota**: Usa el nombre del container (`n8n_app`) como hostname porque el tunnel corre en la misma red Docker.

### Agregar ruta para el dashboard (futuro)

Cuando despliegues el dashboard, agregar otra ruta:

| Campo | Valor |
|-------|-------|
| Subdomain | `dashboard` (o el que prefieras) |
| Domain | `grupocinte.com` |
| Type | `HTTP` |
| URL | `host.docker.internal:3001` (o IP del host) |

---

## Docker Compose Completo (n8n + Tunnel)

### Variables de entorno explicadas

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Modo produccion |
| `N8N_PROTOCOL` | `https` | Protocolo del dominio (Cloudflare maneja SSL) |
| `N8N_SECURE_COOKIE` | `false` | Desactivar secure cookie (Cloudflare maneja HTTPS) |
| `N8N_HOST` | `automatizacion.grupocinte.com` | Dominio publico |
| `WEBHOOK_URL` | `https://automatizacion.grupocinte.com/` | URL base para webhooks |
| `N8N_EXECUTIONS_DATA_MAX_AGE` | `72` | Borrar ejecuciones > 72 horas |
| `N8N_EXECUTIONS_DATA_PRUNE_MAX_COUNT` | `300` | Maximo 300 ejecuciones guardadas |
| `NODE_FUNCTION_ALLOW_EXTERNAL` | `docxtemplater,pizzip` | Paquetes npm permitidos en Code nodes |
| `NODE_PATH` | `/usr/local/lib/node_modules` | Ruta de modulos npm globales |
| `N8N_BLOCK_EXTERNAL_STORAGE_FUNCTIONS` | `false` | Permitir acceso a storage externo |
| `N8N_TASKS_EVALUATOR` | `internal` | Evaluador de tareas interno |
| `N8N_TASKS_RUNNER_ENABLED` | `false` | Task runner desactivado (ahorra recursos) |

### Limites de recursos

| Recurso | Limite | Razon |
|---------|--------|-------|
| CPU | 0.80 (80%) | Evita que n8n sature el unico vCPU de la t2.micro |
| Memoria | 850M | Deja ~150M para el OS, Docker y otros procesos |

---

## Desplegar Dashboard (Backend + Frontend)

> **Estado actual**: El dashboard aun NO esta en produccion. Esta seccion documenta como desplegarlo cuando sea necesario.

### Opcion A: PM2 + Nginx (Recomendada para t2.micro)

Esta opcion no usa Docker para el dashboard, ahorrando recursos.

#### 1. Instalar Node.js en el servidor

```bash
# Instalar Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node --version
npm --version
```

#### 2. Instalar PM2

```bash
sudo npm install -g pm2
```

#### 3. Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

#### 4. Clonar el proyecto

```bash
cd /home/ubuntu
git clone https://github.com/TU_USUARIO/web-ia-contratacion.git
cd web-ia-contratacion
```

Si no usas Git, copiar la carpeta via SCP:

```bash
# Desde tu PC local (PowerShell)
scp -i "tu-clave.pem" -r "C:\Users\USER\Downloads\Web IA Contratación\*" ubuntu@TU_IP:/home/ubuntu/web-ia-contratacion/
```

#### 5. Configurar el backend

```bash
cd /home/ubuntu/web-ia-contratacion/backend
npm install

# Crear .env de produccion
nano .env
```

Contenido del `.env` de produccion:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key

DYNAMODB_TABLE_NAME=n8n_table_state_users
DYNAMODB_GSI_NAME=email

PORT=3001
FRONTEND_URL=https://dashboard.grupocinte.com
```

> **Nota**: `FRONTEND_URL` debe coincidir con el dominio publico del frontend para que CORS funcione.

#### 6. Iniciar backend con PM2

```bash
cd /home/ubuntu/web-ia-contratacion/backend
pm2 start server.js --name contratacion-backend
pm2 save
pm2 startup
# Ejecutar el comando que PM2 muestra en pantalla
```

Verificar:

```bash
pm2 status
# Debe mostrar: contratacion-backend | online

curl http://localhost:3001/api/health
# Debe responder: {"status":"ok",...}
```

#### 7. Construir el frontend

```bash
cd /home/ubuntu/web-ia-contratacion/frontend

# Configurar URL del backend de produccion
echo "VITE_API_URL=https://dashboard.grupocinte.com/api" > .env.production

npm install
npm run build
# Genera la carpeta dist/ con archivos estaticos
```

#### 8. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/dashboard
```

Contenido:

```nginx
server {
    listen 80;
    server_name dashboard.grupocinte.com;

    # Frontend - archivos estaticos
    root /home/ubuntu/web-ia-contratacion/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API - reverse proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket - reverse proxy
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Activar y reiniciar:

```bash
# Activar el sitio
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/

# Verificar config
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

#### 9. Configurar Cloudflare Tunnel para el dashboard

En Cloudflare Zero Trust > Tunnels > Tu tunnel > Public Hostnames:

| Campo | Valor |
|-------|-------|
| Subdomain | `dashboard` |
| Domain | `grupocinte.com` |
| Type | `HTTP` |
| URL | `localhost:80` |

Ahora `https://dashboard.grupocinte.com` apunta al Nginx local que sirve el frontend y proxea al backend.

### Opcion B: Todo en Docker Compose (requiere mas RAM)

> **Advertencia**: La t2.micro tiene 1 GB de RAM. n8n ya usa 850M. Para correr todo en Docker se recomienda minimo una **t3.small** (2 GB RAM) o **t3.medium** (4 GB RAM).

Agregar al `docker-compose.yml` existente:

```yaml
services:
  # ... n8n y tunnel existentes ...

  dashboard-backend:
    image: node:20-alpine
    container_name: dashboard_backend
    restart: always
    working_dir: /app
    volumes:
      - ./web-ia-contratacion/backend:/app
    environment:
      - AWS_REGION=us-east-1
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - DYNAMODB_TABLE_NAME=n8n_table_state_users
      - PORT=3001
      - FRONTEND_URL=https://dashboard.grupocinte.com
    command: node server.js
    ports:
      - "3001:3001"
    deploy:
      resources:
        limits:
          memory: 128M

  dashboard-frontend:
    image: nginx:alpine
    container_name: dashboard_frontend
    restart: always
    volumes:
      - ./web-ia-contratacion/frontend/dist:/usr/share/nginx/html:ro
    ports:
      - "80:80"
    deploy:
      resources:
        limits:
          memory: 32M
```

---

## Consideraciones de Recursos (t2.micro)

### Capacidad de la t2.micro

| Recurso | Disponible | Usado por n8n | Disponible para dashboard |
|---------|-----------|---------------|--------------------------|
| vCPU | 1 | 0.80 (limite) | 0.20 |
| RAM | 1 GB | 850 MB (limite) | ~150 MB |
| Swap | 2 GB (configurado) | Overflow | Overflow |
| Almacenamiento | 20-30 GB | ~5 GB (datos n8n) | ~5 GB |

### Es suficiente la t2.micro para todo?

**Para n8n + tunnel**: Si, funciona bien con los limites configurados.

**Para n8n + tunnel + dashboard**: Justo pero posible si:
- El backend Express usa ~50-80 MB de RAM
- El frontend se sirve como archivos estaticos (Nginx usa ~5 MB)
- Se configura swap de 2 GB como respaldo

**Recomendacion si el dashboard se vuelve lento o inestable**:
- Subir a **t3.small** (2 GB RAM, ~$15/mes) o **t3.medium** (4 GB RAM, ~$30/mes)
- O separar el dashboard en otra EC2 t2.micro dedicada

### Monitorear uso de recursos

```bash
# Uso en tiempo real
htop

# Uso de memoria de Docker
docker stats

# Uso de disco
df -h
```

### Creditos de CPU (t2.micro)

Las instancias t2 usan **creditos de CPU**:
- Acumulas creditos cuando el CPU esta idle
- Consumes creditos cuando el CPU supera el baseline (10% para t2.micro)
- Si se agotan los creditos, el CPU se limita al 10%

Para workloads constantes, considerar **t3.micro** con modo `unlimited` (cobra por uso extra de CPU).

---

## Mantenimiento y Operaciones

### Actualizar n8n

```bash
cd /home/ubuntu/n8n

# Reconstruir imagen con ultima version
docker compose build --no-cache

# Reiniciar
docker compose down
docker compose up -d

# Verificar version
docker exec n8n_app n8n --version
```

### Backups de n8n

Los datos de n8n (workflows, credenciales, ejecuciones) estan en el volumen Docker `n8n_data`:

```bash
# Backup del volumen
docker run --rm -v n8n_n8n_data:/data -v /home/ubuntu/backups:/backup alpine \
  tar czf /backup/n8n-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restaurar (CUIDADO: sobrescribe datos actuales)
docker compose down
docker run --rm -v n8n_n8n_data:/data -v /home/ubuntu/backups:/backup alpine \
  tar xzf /backup/n8n-backup-FECHA.tar.gz -C /data
docker compose up -d
```

### Backup automatico (cron)

```bash
# Crear directorio de backups
mkdir -p /home/ubuntu/backups

# Editar cron
crontab -e
```

Agregar linea (backup diario a las 3 AM):

```cron
0 3 * * * docker run --rm -v n8n_n8n_data:/data -v /home/ubuntu/backups:/backup alpine tar czf /backup/n8n-backup-$(date +\%Y\%m\%d).tar.gz -C /data . && find /home/ubuntu/backups -name "n8n-backup-*.tar.gz" -mtime +7 -delete
```

Esto crea un backup diario y elimina backups de mas de 7 dias.

### Actualizar el dashboard (despues de cambios)

```bash
cd /home/ubuntu/web-ia-contratacion

# Traer cambios de Git
git pull

# Backend
cd backend
npm install
pm2 restart contratacion-backend

# Frontend
cd ../frontend
npm install
npm run build
# Nginx sirve automaticamente los nuevos archivos estaticos
```

### Ver logs

```bash
# n8n
docker logs n8n_app --tail 100 -f

# Cloudflare tunnel
docker logs cloudflare_tunnel --tail 50

# Backend (PM2)
pm2 logs contratacion-backend

# Nginx
sudo tail -f /var/log/nginx/error.log
```

### Reiniciar servicios

```bash
# n8n + tunnel
cd /home/ubuntu/n8n
docker compose restart

# Solo n8n
docker restart n8n_app

# Backend dashboard
pm2 restart contratacion-backend

# Nginx
sudo systemctl restart nginx

# Todo (despues de reboot del servidor)
cd /home/ubuntu/n8n && docker compose up -d
pm2 resurrect
```

---

## Seguridad

### Archivos que NUNCA deben subirse a Git

| Archivo | Contenido sensible |
|---------|-------------------|
| `backend/.env` | Credenciales AWS |
| `/home/ubuntu/n8n/.env` | Token Cloudflare Tunnel |
| Archivos `.pem` | Clave SSH de la EC2 |

### Buenas practicas

1. **Token de Cloudflare**: Usar variable de entorno `${CLOUDFLARE_TUNNEL_TOKEN}` en docker-compose.yml, guardar el token en `.env` y no en el compose directamente
2. **Credenciales AWS**: Usar IAM roles en la EC2 (mejor) o archivos `.env` (aceptable)
3. **SSH**: Deshabilitar acceso por contrasena, usar solo key pairs:
   ```bash
   sudo nano /etc/ssh/sshd_config
   # PasswordAuthentication no
   sudo systemctl restart sshd
   ```
4. **Firewall UFW** (opcional, adicional al Security Group):
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
5. **Actualizaciones automaticas de seguridad**:
   ```bash
   sudo apt install -y unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

---

## Troubleshooting de Produccion

### n8n no arranca

```bash
# Ver logs detallados
docker logs n8n_app --tail 200

# Verificar que el puerto no esta ocupado
sudo netstat -tlnp | grep 5678

# Reconstruir imagen
docker compose build --no-cache && docker compose up -d
```

### Tunnel no conecta

```bash
# Ver logs del tunnel
docker logs cloudflare_tunnel --tail 50

# Verificar token
cat /home/ubuntu/n8n/.env

# Reiniciar solo el tunnel
docker restart cloudflare_tunnel
```

### Servidor sin memoria (OOM Killer)

```bash
# Verificar si el kernel mato algun proceso
dmesg | grep -i "oom\|killed"

# Ver uso de memoria
free -h

# Verificar swap
swapon --show

# Si no hay swap, crearlo (ver seccion "Configurar swap")
```

### n8n lento o CPU al 100%

```bash
# Ver consumo de Docker
docker stats

# Verificar creditos de CPU de t2
# Si los creditos se agotan, el CPU se limita al 10%
# Solucion: esperar que se regeneren o cambiar a t3 unlimited
```

### No se puede hacer SSH

1. Verificar Security Group: puerto 22 abierto para tu IP
2. Verificar que la instancia esta corriendo en AWS Console
3. Verificar Elastic IP (si la instancia se reinicio sin Elastic IP, la IP cambio)
4. Verificar el archivo .pem correcto y permisos (`chmod 400`)

### Dashboard no carga despues de deploy

```bash
# Verificar backend
pm2 status
curl http://localhost:3001/api/health

# Verificar frontend (archivos estaticos)
ls -la /home/ubuntu/web-ia-contratacion/frontend/dist/

# Verificar Nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Verificar tunnel routing
# En Cloudflare Zero Trust > Tunnels > Public Hostnames
```

---

*Ultima actualizacion: 2026-02-17*
