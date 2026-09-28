# IMP
> **Infrastructure Management Platform**

IMP (Infrastructure Management Platform) es una plataforma integral para el inventario, monitorización y gestión de infraestructura IT y centros de operaciones de red (NOC). Diseñada para operar de forma totalmente contenerizada, segura y desacoplada mediante Docker, GHCR y Portainer.

---

## 🌟 Características Principales

* **💾 Sistema Integral de Backups (v13.0.0):** Respaldo completo del sistema y base de datos con verificación criptográfica SHA-256, políticas de retención (`Daily`, `Weekly`, `Monthly`), protección contra borrado accidental (`isProtected`) y restauración segura con snapshot preventivo automático.
* **📦 Importación y Exportación Avanzada (v13.0.0):** Exportación integral a formatos CSV, JSON, Excel (.xlsx) y Migración estructurada con protección contra ataques de inyección de fórmulas CSV/Excel; Importación interactiva con previsualización, detección de conflictos (Keep/Overwrite/Skip) y ejecución transaccional con rollback.
* **📊 Dashboard NOC de Alta Visibilidad (v12.0.0):** Centro de supervisión unificado con cálculo transparente de Health Score, cola inteligente de atención por severidad, telemetría agregada de recursos, rankings de consumo, alertas críticas y streaming en tiempo real.
* **🖥️ Inventario y Gestión de Máquinas:** Registro técnico detallado de servidores físicos, máquinas virtuales, appliances de red y puestos de trabajo.
* **🔍 Advanced Network Discovery (Agentless):** Descubrimiento autónomo de redes sin agente mediante ICMP, ARP, TCP, DNS, SNMP v2c/v3, SSH y WinRM, con clasificación basada en evidencias y auditoría de deltas.
* **🌐 Módulo IPAM & Subredes:** Gestión centralizada de direccionamiento IPv4/IPv6, asignaciones, conflictos de red y calculadoras CIDR.
* **⚡ Monitorización en Tiempo Real:** Métricas de latencia, disponibilidad ICMP/TCP, telemetría continua y detección de anomalías.
* **🗺️ Topología de Red:** Visualización interactiva de mapas de red, dependencias y enlaces entre nodos.
* **📦 Gestión de Activos (ITAM):** Control de ciclo de vida de hardware, garantías, proveedores, contratos de compra y licencias.
* **🎫 Operaciones & Tickets:** Gestión de incidencias, solicitudes de cambio, SLAs y ventanas de mantenimiento programadas.
* **🔄 Automatización & Workflows:** Ejecución de runbooks, pipelines de operaciones, principio de cuatro ojos (Four-Eyes Approval) y circuit breakers.
* **🤖 Asistente de IA Local:** Diagnóstico asistido y generación de propuestas operacionales basado en LLMs locales (Ollama/OpenAI compatible).
* **🛡️ Agentes Distribuidos:** Telemetría y monitorización perimetral mediante agentes ligeros con latido seguro.
* **✨ Asistente de Primera Instalación (/setup):** Asistente interactivo en el primer inicio para definir credenciales de administrador de forma segura sin datos de prueba ni contraseñas por defecto.

---

## 📊 Dashboard NOC (Centro de Operaciones de Red)

IMP incorpora un Dashboard NOC profesional enfocado en la detección de incidencias en menos de 10 segundos:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ IMP NOC                                 [LIVE STREAM 🟢] [Auto Refresh: 1m] [Actualizar]│
│ Filtros: [📁 Grupos] [📍 Ubicaciones] [⚡ Estados] [🏷️ Tags]          [Periodo: 24h]    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ 🔴 2 CRITICAL ALERTS ] ───► SRV-DB01 (Disk usage 97%) | PROXMOX01 (Node unreachable)│
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│    HEALTH SCORE: 94%           │ TOTAL: 42   🟢 38 ONLINE   🟠 2 WARNING   🔴 2 OFFLINE│
│    [ÓPTIMO / SALUDABLE]        │ ──────────────────────────────────────────────────────│
│    (40% Disp + 30% Alertas     │ Segmented Distribution Bar: [███████████████░░░░░░]   │
│     + 20% Serv + 10% Rec)      │                                                       │
├────────────────────────────────┴───────────────────────────────────────────────────────┤
│ RECURSOS GLOBALES:  CPU Media: 43% (Pico 92%) │ RAM: 61% │ Disco: 72% │ Latencia: 18ms │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ TOP CONSUMIDORES               │ DISPOSITIVOS QUE REQUIEREN ATENCIÓN                   │
│ • CPU: 1. SRV-DB01 (92%)       │ 🔴 SRV-DB01   Disco C: > 95%                          │
│ • RAM: 1. SRV-APP01 (94%)      │ 🔴 PROXMOX01  Nodo no responde                        │
│ • Disco: 1. SRV-BACKUP (96%)   │ 🟠 SW-CORE01  SNMP timeout                            │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ SERVICIOS MONITORIZADOS        │ ALERTAS & ANOMALÍAS ACTIVAS                           │
│ 🟢 124 Healthy 🟠 4 Warn 🔴 2 Down│ 🔴 SRV-DB01: Disk > 95% (hace 18m)                    │
│ 🔴 SQL Server (Port 1433)      │ 🟠 PROXMOX01: RAM > 85% (hace 42m)                    │
├────────────────────────────────┴───────────────────────────────────────────────────────┤
│ RENDIMIENTO HISTÓRICO (Área 24h): CPU, RAM, Disco y Latencia con Bucketing Inteligente │
├────────────────────────────────┬───────────────────────────────┬───────────────────────┤
│ DISCOVERY ENGINE               │ MONITORING WORKER             │ ACTIVIDAD RECIENTE    │
│ Último Scan: 192.168.1.0/24    │ 🟢 ONLINE (Ciclos: 1.248)     │ 12:21 🔴 SRV-DB01 Off │
│ +2 nuevos | -1 faltante        │ Checks: 42 hosts cada 30s     │ 12:18 🟢 SRV-WEB01 On │
└────────────────────────────────┴───────────────────────────────┴───────────────────────┘
```

### Cálculo Transparente de Health Score
El Health Score se computa en el backend de forma matemática y determinista sin inventar datos:
* **Disponibilidad (40% de peso):** Ratio de hosts Online / Total.
* **Alertas Activas (30% de peso):** Penalización de 15 pts por anomalía crítica y 5 pts por advertencia.
* **Salud de Servicios (20% de peso):** Ratio de puertos TCP/HTTP respondiendo correctamente.
* **Saturación de Recursos (10% de peso):** Penalización si existen servidores con CPU/RAM/Disco > 90%.

---

## 🔍 Advanced Network Discovery (Descubrimiento Autónomo sin Agente)

InfraInventory 12.0.0 incluye un motor de descubrimiento modular de alta precisión diseñado para auditar redes de cualquier tamaño sin requerir instalación de agentes en los equipos cliente:

```
InfraInventory Discovery Engine
            │
            ▼
    Subred CIDR Objetivo
            │
            ├── ICMP ──────────► Verificación de actividad & Latencia (RTT)
            ├── ARP ───────────► Dirección MAC & Fabricante (OUI IEEE)
            ├── TCP ───────────► Sondeo de puertos abiertos & Banners
            ├── DNS ───────────► Resolución de nombres inversa (PTR)
            ├── SNMP v2c/v3 ───► sysName, sysDescr, Interfaces & Telemetría
            ├── SSH ───────────► Auditoría remota de sistemas Linux / UNIX
            └── WinRM/WMI ─────► Auditoría remota de sistemas Windows
            │
            ▼
Identificación & Clasificación Basada en Evidencias
(Virtualization Host [Proxmox], Docker Host, Server, Switch, Router, Firewall, etc.)
            │
            ▼
Motor de Detección de Cambios (Diff Engine)
(Nuevos dispositivos, Delas de IP/MAC/Hostname/SO/Puertos/Hardware, Dispositivos Offline)
            │
            ▼
Aprobación e Incorporación al Inventario Oficial
```

### Métodos de Descubrimiento y Credenciales

| Método | Información Obtenida | ¿Requiere Credenciales? | Notas de Seguridad |
| :--- | :--- | :---: | :--- |
| **ICMP** | Disponibilidad (Online/Offline), Latencia RTT | **No** | No agresivo, usa timeout configurable |
| **ARP** | IP, Dirección MAC, Fabricante hardware (OUI) | **No** | Lectura de `/proc/net/arp` y tabla de vecinos |
| **TCP Port Scan** | Puertos abiertos, Banners de servicio (HTTP, SSH, Proxmox, Portainer, etc.) | **No** | Modos Básico (12P), Completo (30P) o Personalizado |
| **DNS** | Hostname inverso (FQDN / PTR) | **No** | Resolución DNS asíncrona no bloqueante |
| **SNMP (v2c / v3)** | `sysName`, `sysDescr`, `sysObjectID`, `sysUpTime`, interfaces, estado de enlaces, fabricante y modelo | **Sí** | Requiere community string (v2c) o credenciales USM (v3). Almacenadas de forma segura. |
| **SSH** | Hostname, distribución SO, kernel, CPU, memoria RAM, discos, interfaces | **Sí** | Opcional para hosts Linux/UNIX. Si no está disponible, el descubrimiento continúa sin error. |
| **WinRM / WMI** | Hostname, versión Windows, CPU, RAM, discos, dominio/workgroup | **Sí** | Opcional para hosts Windows. Si no está disponible, reporta `unavailable` sin error. |

### Clasificación Basada en Evidencias

El clasificador asigna a cada dispositivo su rol exacto a partir de firmas comprobadas sin inventar datos:
* **Virtualization Host:** Proxmox VE (puerto 8006, banner PVE, API console), VMware ESXi (puertos 902/443), Hyper-V.
* **Docker Host:** Portainer (puertos 9000/9443), firmas de Docker proxy y daemon.
* **Printer:** Impresoras de red vía RAW JetDirect (9100), IPP (631), LPD (515) y fabricantes (HP, Epson, Brother, Canon, Xerox).
* **Router:** MikroTik RouterOS, Cisco IOS, pfSense, OpenWrt, VyOS, DNS + pasarela.
* **Firewall:** Fortinet FortiGate, pfSense, OPNsense, Palo Alto, CheckPoint, Sophos.
* **Switch:** Cisco Catalyst/Nexus, HP ProCurve, Aruba, Ubiquiti Switch, TP-Link JetStream, Juniper.
* **Access Point:** Ubiquiti UniFi AP, Aruba AP, Cisco Aironet AP.
* **NAS & Storage:** Synology DSM (5000/5001), QNAP QTS (8080), TrueNAS/FreeNAS, iSCSI targets (3260).
* **IP Camera:** Flujos RTSP (554), ONVIF (8000), Dahua (37777), Hikvision, Axis.
* **IoT & Smart Home:** MQTT (1883), Home Assistant (8123), Google Cast (8008/8009).
* **Server / Workstation:** Servidores corporativos (Linux/Windows Server) y puestos de trabajo cliente.
* **Unknown:** Dispositivos sin firmas suficientes para garantizar certeza técnica.

### Detección de Cambios (Diff Engine) y Seguridad

1. **Nuevos Dispositivos (`NEW_DEVICE_DETECTED`):** Todo host no registrado previamente ingresa con estado `Pending Review` para ser auditado antes de incorporarse al inventario de producción.
2. **Dispositivos Desaparecidos / Offline (`DEVICE_OFFLINE`):** Si un host de inventario no responde en su subred, se marca automáticamente como `OFFLINE` y se genera una alerta. **InfraInventory nunca elimina automáticamente equipos del inventario**.
3. **Auditoría de Modificaciones:** Compara y registra deltas en:
   * IP modificada
   * MAC modificada
   * Hostname modificado
   * Fabricante modificado
   * Sistema operativo actualizado
   * Puertos nuevos abiertos / cerrados
   * Cambios de hardware (ampliación de memoria RAM, sustitución de CPU)

---

## 🚀 Despliegue en Producción con Portainer (Recomendado)

InfraInventory está preparado para desplegarse directamente en Portainer mediante Stacks conectados a Git o imágenes GHCR.

### Opción A: Despliegue Gestionado por Tags de Versión (Muestra `Deployed Version: v12.0.0` en Portainer)

1. En tu panel de **Portainer**, ve a **Stacks** $\rightarrow$ **Add stack**.
2. Selecciona **Repository** (Git Repository).
3. Configura:
   * **Repository URL:** `https://github.com/adrianpalma360-create/InfraInventory`
   * **Repository reference:** `refs/tags/v12.0.0` (o el tag semántico que desees desplegar)
   * **Compose path:** `docker-compose.portainer.yml`
4. En **Environment variables**, define:
   ```env
   GHCR_NAMESPACE=adrianpalma360-create
   IMAGE_TAG=12.0.0
   HTTP_PORT=3000
   POSTGRES_DB=infrainventory_db
   POSTGRES_USER=infrainventory_user
   POSTGRES_PASSWORD=tu_contraseña_segura_de_postgres
   JWT_SECRET=tu_clave_secreta_jwt_de_al_menos_32_caracteres
   COOKIE_SECRET=tu_clave_secreta_cookie_de_al_menos_32_caracteres
   ```
5. Haz clic en **Deploy the stack**. Portainer mostrará la versión semántica desplegada.

### Opción B: Despliegue Continuo Automatizado (Git $\rightarrow$ GitHub Actions $\rightarrow$ GHCR $\rightarrow$ Portainer)

1. En Portainer, configura **Repository reference:** `refs/heads/main` y activa la opción **Webhook**.
2. Copia la URL del Webhook de Portainer y agrégala en los Secrets de tu repositorio GitHub con el nombre `PORTAINER_WEBHOOK_URL`.
3. Cuando publiques una release en GitHub, GitHub Actions compilará las imágenes en GHCR (`:12.0.0` y `:latest`) y, **una vez que las imágenes estén publicadas**, notificará al webhook de Portainer para actualizar los contenedores automáticamente con `pull_policy: always`.

---

## 🐳 Despliegue con Docker Compose CLI

```bash
# 1. Clonar el repositorio
git clone https://github.com/adrianpalma360-create/InfraInventory.git
cd InfraInventory

# 2. Configurar variables de entorno
cp .env.example .env
nano .env  # Configura tus contraseñas seguras y puertos

# 3. Iniciar la aplicación mediante imágenes precompiladas de GHCR
docker compose -f docker-compose.portainer.yml up -d

# (O si deseas compilar el código localmente)
docker compose up -d --build
```

Accede a `http://localhost:3000` (o la IP de tu servidor) y completa el asistente inicial.

---

## 📦 Sistema de Versiones Semánticas (SemVer)

InfraInventory utiliza versionado semántico estricto `MAJOR.MINOR.PATCH` con sincronización automática en:
- **Acerca de (UI Frontend):** Muestra Versión, Release, Build y Fecha de Compilación.
- **Backend API (`/api/about`):** Proporciona los metadatos institucionales y versión.
- **Git Tags:** Tags semánticos `vX.Y.Z` (ej. `v11.0.0`).
- **GHCR (Docker):** Imágenes inmutables `ghcr.io/adrianpalma360-create/...:11.0.0` y `:latest`.
- **Portainer:** Soporte para despliegue inmutable por tag o continuous deployment vía `:latest`.

### Comandos de Versionado

```bash
# Consultar versión actual
node scripts/release.mjs current

# Verificar consistencia de versiones en todos los módulos
npm run version:check

# Incrementar versión PATCH (11.0.0 -> 11.0.1) [Comportamiento por defecto]
npm run version:bump

# Incrementar versión MENOR (11.0.1 -> 11.1.0)
npm run version:minor

# Incrementar versión MAYOR (11.1.0 -> 12.0.0)
npm run version:major

# Definir una versión exacta
node scripts/release.mjs set 15.2.0
```

---

## 🔄 Actualización del Sistema

La base de datos PostgreSQL se almacena en el volumen persistente `infrainventory_postgres_data`, por lo que las actualizaciones preservan el 100% de tus datos e inventario.

### Actualizar desde Portainer:
1. Ve a **Stacks** $\rightarrow$ Selecciona tu stack de InfraInventory.
2. Haz clic en **Editor** o **Pull and redeploy**.
3. Activa la opción **Re-pull image and redeploy**.
4. Haz clic en **Update**.

### Actualizar desde terminal (Docker Compose):
```bash
docker compose -f docker-compose.portainer.yml pull
docker compose -f docker-compose.portainer.yml up -d
```

Las migraciones de base de datos se aplican automáticamente de forma no destructiva al iniciar el backend.

---

## ⏪ Rollback a una Versión Específica

Para fijar o regresar a una versión anterior concreta (por ejemplo `11.0.0`):
1. En Portainer (o en tu archivo `.env`), cambia la variable:
   ```env
   IMAGE_TAG=11.0.0
   ```
2. Vuelve a desplegar el stack.

---

## 💾 Copias de Seguridad (Backup de PostgreSQL)

### Crear un Backup:
```bash
docker exec -t infrainventory-postgres pg_dump -U infrainventory_user infrainventory_db > backup_infrainventory_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar un Backup:
```bash
cat backup_infrainventory_YYYYMMDD_HHMMSS.sql | docker exec -i infrainventory-postgres psql -U infrainventory_user -d infrainventory_db
```

---

## 🔒 Variables de Entorno

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `GHCR_NAMESPACE` | Usuario o namespace de GitHub para descarga de imágenes GHCR | `adrianpalma360-create` |
| `IMAGE_TAG` | Tag de imagen Docker a desplegar (`latest`, `11.0.0`, etc.) | `latest` |
| `APP_VERSION` | Alias alternativo de versión Docker en compose | `latest` |
| `HTTP_PORT` | Puerto HTTP expuesto para la interfaz web | `3000` |
| `POSTGRES_DB` | Nombre de la base de datos PostgreSQL | `infrainventory_db` |
| `POSTGRES_USER` | Usuario de la base de datos | `infrainventory_user` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | *(Requerido en producción)* |
| `JWT_SECRET` | Clave secreta para firma de tokens JWT | *(Requerido en producción)* |
| `COOKIE_SECRET` | Clave secreta para cookies de sesión segura | *(Requerido en producción)* |
| `CORS_ORIGIN` | Orígenes web permitidos para peticiones API | `*` |
| `AI_ENABLED` | Habilitar motor de IA y diagnósticos | `false` |
| `AI_PROVIDER` | Proveedor de LLM (`ollama` o `openai`) | `ollama` |
| `AI_BASE_URL` | Endpoint del servidor de inferencia IA | `http://ollama:11434` |
| `AI_MODEL` | Modelo de lenguaje seleccionado | `llama3:8b` |

---

## 📄 Licencia

Este proyecto está bajo los términos indicados en el archivo [LICENSE](LICENSE).

---

Desarrollado por **Adrian Palma** &bull; © 2026 Adrian Palma &bull; Todos los derechos reservados.
