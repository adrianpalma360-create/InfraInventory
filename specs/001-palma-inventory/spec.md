# Especificación de Funcionalidad: Palma Inventory Platform

**ID**: SPEC-001  
**Estado**: Implementado / Aprobado  
**Versión**: 1.0.0  
**Fecha de Creación**: 2026-09-10  
**Última Actualización**: 2026-09-10  

---

## 1. Resumen Ejecutivo

**Palma Inventory** es una plataforma web para la gestión centralizada, auditoría y consulta del inventario de infraestructura tecnológica de la empresa (servidores físicos, máquinas virtuales, PCs, routers, switches, firewalls, NAS, direccionamiento IP, interfaces de red, VLANs, puertos y catálogo de servicios).

---

## 2. Requisitos Funcionales & Módulos

### 2.1. Gestión de Máquinas (Hosts)
- **RF-01**: Registro de equipos físicos y virtuales con atributos de hostname, tipo, estado operativo, sistema operativo, fabricante, modelo, número de serie, ubicación, VLAN, gateway, DNS y descripción.
- **RF-02**: Filtros dinámicos por tipo de nodo, estado (ONLINE, WARNING, OFFLINE, UNCHECKED) y búsqueda de texto en tiempo real.
- **RF-03**: Ficha técnica detallada por host con subpestañas para interfaces de red, puertos/servicios y timeline de auditoría.

### 2.2. Segmentación de Redes, VLANs e IPs
- **RF-04**: Definición de rangos CIDR con puertas de enlace y servidores DNS asignados.
- **RF-05**: Gestión de VLANs (IEEE 802.1Q) vinculadas a subredes.
- **RF-06**: Pool de direcciones IPv4 vinculables a interfaces de red de hosts específicos.

### 2.3. Matriz de Puertos y Catálogo de Servicios
- **RF-07**: Registro y mapeo de puertos TCP/UDP abiertos, cerrados o filtrados.
- **RF-08**: Catálogo estandarizado de servicios de red (HTTP, HTTPS, SSH, RDP, PostgreSQL, SQL Server, Proxmox API, DNS, SNMP, SMB).

### 2.4. Ubicaciones Físicas y Centros de Datos
- **RF-09**: Registro de centros de procesamiento de datos (CPD), edificios, salas y armarios rack.

### 2.5. Auditoría y Registro de Cambios (ChangeLog)
- **RF-10**: Inmutabilidad y registro automático de toda acción `CREATE`, `UPDATE` o `DELETE` realizada sobre cualquier recurso.

---

## 3. Requisitos No Funcionales & Arquitectura

- **RNF-01 (Cloud-Native)**: Contenedorización mediante Docker y Docker Compose con healthchecks `/healthz`, `/livez` y `/readyz`.
- **RNF-02 (Seguridad)**: Ejecución bajo usuarios no privilegiados en contenedores (`non-root`), consultas parametrizadas con Prisma ORM (prevención de SQL Injection) y separación de credenciales en `.env.example`.
- **RNF-03 (Observabilidad)**: Logs estructurados en stdout/stderr y documentación Swagger interactiva expuesta en `/docs`.
- **RNF-04 (Diseño Visual NOC)**: Interfaz oscura (#0B0F14, #0F141B, #151B23, #252D38) con tipografía Inter y monoespaciada para datos técnicos.

---

## 4. Trazabilidad con la Constitución del Proyecto

| Principio Constitucional | Evidencia de Cumplimiento en el Código |
|---|---|
| **I. Cloud-Native & Kubernetes** | `/healthz`, `/livez`, `/readyz` en `backend/src/app.ts`, multi-stage Dockerfiles non-root. |
| **II. Observabilidad & Auditabilidad** | Tabla `ChangeLog`, Swagger `/docs`, logs estructurados. |
| **III. SemVer** | Versión 1.0.0 en package.json y changelog.md. |
| **V. Idempotencia y Validaciones** | Validaciones Zod (IPv4, MAC, CIDR, Port 1-65535), seeds idempotentes con `upsert`. |
| **VI. Control de Commits** | Cero commits autónomos por la IA, `changelog.md` bajo *Keep a Changelog*. |
| **VII. Seguridad por Defecto** | Sin secretos en git, `.env.example`, consultas Prisma parametrizadas. |
| **Idioma del Código** | Clases, métodos, interfaces y comentarios 100% en inglés. |
