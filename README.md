# InfraInventory

> **NOC & Infraestructure managment**

InfraInventory es una plataforma integral para el inventario, monitorización y gestión de infraestructura IT y centros de operaciones de red (NOC). Diseñada para operar de forma totalmente contenerizada, segura y desacoplada mediante Docker y Portainer.

---

## 🌟 Características Principales

* **🖥️ Inventario y Gestión de Máquinas:** Registro técnico detallado de servidores físicos, máquinas virtuales, appliances de red y puestos de trabajo.
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

## 🚀 Despliegue Rápido con Portainer (Recomendado)

InfraInventory está preparado para desplegarse directamente en Portainer sin compilar código en el host.

### Paso a paso en Portainer:

1. Inicia sesión en tu panel de **Portainer**.
2. Dirígete a **Stacks** en el menú lateral y haz clic en **Add stack**.
3. Selecciona el método **Repository** (Git Repository).
4. Configura los siguientes datos:
   * **Repository URL:** `https://github.com/adrianpalma/InfraInventory`
   * **Repository reference:** `refs/heads/main` (o un tag de versión como `refs/tags/v11.0.0`)
   * **Compose path:** `docker-compose.portainer.yml`
5. En la sección **Environment variables**, define las siguientes variables:
   ```env
   GHCR_NAMESPACE=loquequieras
   IMAGE_TAG=latest
   HTTP_PORT=3000
   POSTGRES_DB=infrainventory_db
   POSTGRES_USER=infrainventory_user
   POSTGRES_PASSWORD=tu_contraseña_segura_de_postgres
   JWT_SECRET=tu_clave_secreta_jwt_de_al_menos_32_caracteres
   COOKIE_SECRET=tu_clave_secreta_cookie_de_al_menos_32_caracteres
   ```
6. Haz clic en **Deploy the stack**.
7. Espera unos segundos a que los contenedores inicien y alcancen el estado `healthy`.
8. Abre tu navegador web en:
   ```
   http://IP_DE_TU_SERVIDOR:3000
   ```
9. Sigue el asistente de bienvenida **/setup** para crear tu cuenta de administrador e iniciar sesión.

---

## 🐳 Despliegue con Docker Compose CLI

Si prefieres desplegar utilizando la terminal de tu servidor:

```bash
# 1. Clonar el repositorio
git clone https://github.com/adrianpalma/InfraInventory.git
cd InfraInventory

# 2. Configurar variables de entorno
cp .env.example .env
nano .env  # Configura tus contraseñas seguras y puertos

# 3. Iniciar la aplicación mediante imágenes precompiladas (Portainer / Prod)
docker compose -f docker-compose.portainer.yml up -d

# (O si deseas compilar el código localmente)
docker compose up -d --build
```

Accede a `http://localhost:3000` (o la IP de tu servidor) y completa el asistente inicial.

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
   APP_VERSION=11.0.0
   ```
2. Vuelve a desplegar el stack.

---

## 💾 Copias de Seguridad (Backup de PostgreSQL)

Toda la información reside en PostgreSQL y su volumen persistente.

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
| `GHCR_NAMESPACE` | Usuario o namespace de GitHub para descarga de imágenes GHCR | `Loquequieras` |
| `IMAGE_TAG` | Tag de imagen Docker a desplegar (`latest`, `11.0.0`, etc.) | `latest` |
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
