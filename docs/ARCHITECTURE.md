# Arquitectura de InfraInventory

Este documento describe la arquitectura modular, el flujo de datos y el pipeline de despliegue continuo de **InfraInventory**.

---

## 1. Arquitectura de Despliegue y Distribución

```
GitHub Repository
       │ (Push / Tag v11.x)
       ▼
GitHub Actions CI/CD (docker.yml)
       │ (Multi-arch build & tests)
       ▼
GitHub Container Registry (ghcr.io)
  ├── ghcr.io/adrianpalma/infrainventory-frontend:latest
  └── ghcr.io/adrianpalma/infrainventory-backend:latest
       │
       ▼ (Pull Stack / Git Repository)
Portainer / Docker Host
  ├── 🌐 Frontend (Nginx + React Dark NOC SPA) [:3000 -> :80]
  ├── ⚙️ Backend API (Node.js 20 Fastify + Prisma ORM) [:4000 interno]
  └── 🐘 Base de Datos (PostgreSQL 16 Alpine) [Volume: infrainventory_postgres_data]
```

---

## 2. Diagrama de Flujo de Comunicaciones

```
+-------------------------------------------------------------------+
|                        Navegador del Usuario                      |
+-------------------------------------------------------------------+
                                  │ HTTP / WebSockets (:3000)
                                  ▼
+-------------------------------------------------------------------+
|               Contenedor Frontend (Nginx 1.25 Alpine)             |
|                                                                   |
|  - Sirve SPA estática optimizada (Vite + React + Tailwind)        |
|  - Proxy inverso /api/ -> backend:4000/api/                      |
|  - Proxy inverso /ws/  -> backend:4000/ws/ (Telemetría en vivo)   |
+-------------------------------------------------------------------+
                                  │ Red Interna Docker
                                  ▼
+-------------------------------------------------------------------+
|               Contenedor Backend (Fastify + Prisma)               |
|                                                                   |
|  - Auth & RBAC (JWT + Cookies Seguras + Argon2/Bcrypt)            |
|  - Rutas RESTful (/api/machines, /api/ipam, /api/topology, etc.)  |
|  - Motor de Workflows, Runbooks y Principio de Cuatro Ojos        |
|  - Asistente de IA e integraciones LLM                            |
+-------------------------------------------------------------------+
                                  │ SQL (Puerto 5432 Interno)
                                  ▼
+-------------------------------------------------------------------+
|               Contenedor PostgreSQL 16 Alpine                     |
|                                                                   |
|  - Almacenamiento transaccional ACID                              |
|  - Volumen persistente: infrainventory_postgres_data              |
+-------------------------------------------------------------------+
```

---

## 3. Principios de Seguridad

1. **Aislamiento de Red:** PostgreSQL no expone el puerto 5432 al exterior por defecto en `docker-compose.portainer.yml`. Únicamente se expone el puerto HTTP del frontend.
2. **Setup Interactivo Cero-Confianza:** Las contraseñas de administrador nunca se incluyen en variables de entorno fijas ni código fuente. Se generan en `/setup` mediante bcrypt con 12 rondas.
3. **Persistencia Garantizada:** Las migraciones de Prisma se ejecutan mediante scripts no destructivos respetando los datos y usuarios existentes en el volumen de PostgreSQL.
