# Registro de Cambios (CHANGELOG)

Todas las modificaciones notables de este proyecto se documentan en este archivo.

---

## [13.0.0] - 2026-09-21

### 💾 Sistema Integral de Backups de InfraInventory
* **Copias de Seguridad Completas:** Respaldo atómico y estructurado de la base de datos PostgreSQL, configuración del sistema, catálogo de inventario, activos IT, políticas de seguridad, workflows y auditoría.
* **Integridad Garantizada:** Generación y verificación criptográfica de sumas de verificación SHA-256 por cada archivo de copia de seguridad generado.
* **Modos de Ejecución:** Backups manuales bajo demanda y programación automática mediante cron (`Daily`, `Weekly`, `Monthly`).
* **Políticas de Retención Automática:** Purgado automático e inteligente configurable por antigüedad y número máximo de copias conservadas.
* **Protección de Backups Críticos:** Flag `isProtected` que impide el borrado accidental o la poda por políticas de retención de copias maestras.
* **Descarga y Exportación:** Streaming seguro de paquetes `.tar.gz` / `.json.gz` con validación de permisos de operador.
* **Restauración Segura con Pre-Restore Snapshot:** Flujo de restauración transaccional con doble confirmación que genera automáticamente una copia de seguridad de seguridad (`pre-restore-YYYY-MM-DD-HH-mm`) antes de aplicar cambios destructivos sobre la base de datos.
* **Registro de Auditoría:** Historial inmutable de creaciones, descargas, restauraciones y borrados de copias de seguridad.

### 📦 Importación y Exportación del Inventario
* **Formatos de Exportación Múltiples:** Exportación integral o filtrada de la infraestructura a formatos CSV, JSON, Excel (.xlsx) y Paquetes de Migración (`infrainventory-export`).
* **Protección contra Inyección de Fórmulas CSV/Excel:** Sanitización estricta de todos los campos exportados para neutralizar ataques de inyección de fórmulas (prefijos `=`, `+`, `-`, `@`).
* **Exportación de Migración Segura:** Paquete JSON transportable entre instancias de InfraInventory con exclusión automática de contraseñas, hashes, tokens de sesión y secretos de infraestructura.
* **Importación con Previsualización Obligatoria:** Fase de análisis previo que clasifica los registros entrantes en: Nuevos, Actualizaciones, Conflictos de IP/Hostname y Errores sintácticos antes de aplicar cualquier cambio.
* **Resolución Flexible de Conflictos:** Selector de estrategia de importación: Conservar existente (*Keep existing*), Sobrescribir (*Overwrite*) u Omitir con advertencia (*Skip*).
* **Ejecución Transaccional con Rollback:** Motor de importación ACID que revierte la totalidad de las operaciones si ocurre una anomalía crítica durante la inserción.
* **Historial y Trazabilidad IO:** Registro persistente de todas las tareas de importación y exportación con usuario autor, número de filas procesadas, formato y estado.

---

## [12.0.0] - 2026-09-21

### 🚀 Dashboard NOC Centralizado & Monitorización de Infraestructura
* **Centro de Operaciones de Red (NOC):** Transformación completa del panel principal en un verdadero Dashboard NOC profesional de alto contraste para supervisión instantánea de la infraestructura.
* **Infrastructure Health Score Transparente:** Cálculo ponderado y determinista (0-100%) basado en ratios de disponibilidad (40%), penalización por alertas activas (30%), salud de servicios (20%) y saturación de recursos (10%), con panel de desglose interactivo.
* **Alertas Críticas Destacadas:** Banner de alta visibilidad para incidencias críticas activas con enlace directo al dispositivo afectado y tiempo de duración.
* **Cola de Atención Priorizada ("Requieren Atención"):** Clasificación automática e inteligente de máquinas según severidad real (`CRITICAL` > `OFFLINE` > `WARNING`).
* **Telemetría y Métricas Globales de Recursos:** Visualización agregada de CPU, RAM, Disco y Latencia ICMP en modo Media (Avg) y Pico (Max) calculados exclusivamente con telemetría real (mostrando `N/D` si no está disponible).
* **Top Consumidores de Recursos:** Rankings directos de hosts con mayor consumo de CPU, memoria RAM y almacenamiento con barras de progreso y umbrales visuales.
* **Supervisión Unificada de Servicios:** Contadores de estado (`Healthy`, `Warning`, `Down`) y detalle de servicios con latencias o fallos de respuesta.
* **Gráfico de Rendimiento Histórico:** Gráficas de área responsive con selector de ventana temporal (`1h`, `6h`, `24h`, `7d`, `30d`) y métricas de CPU/RAM/Disco/Latencia.
* **Widgets de Discovery & Monitoring Worker:** Información del último escaneo de red (CIDR, dispositivos activos/nuevos/cambios) y estado del worker autónomo de sondeo.
* **Línea de Tiempo de Actividad Unificada:** Feed cronológico combinando eventos de auditoría (ChangeLog), descubrimientos de red y transiciones de alertas.
* **Filtros Globales Interactivos:** Filtrado dinámico por Tag, Grupo, Ubicación física, Estado de máquina y selector centralizado de Auto-Refresh (`OFF`, `30s`, `1m`, `5m`) con soporte de streaming WebSocket.
* **Endpoint de Alto Rendimiento:** `GET /api/dashboard/overview` que consolida todas las consultas en una única llamada optimizada en backend.
* **Compatibilidad Absoluta:** Preservación sin modificaciones destructivas de esquemas de base de datos, usuarios, credenciales, inventario y endpoints legados (`GET /dashboard`).

---

## [11.0.0] - 2026-09-15

### Añadido
* **Asistente de Primera Instalación (/setup):** Flujo de bienvenida y configuración inicial de credenciales de administrador en entornos limpios.
* **Soporte Portainer & GHCR:** Archivo `docker-compose.portainer.yml` para despliegue con 1 clic desde repositorios Git en Portainer.
* **Pipeline GitHub Actions CI/CD:** Flujo automatizado para compilar, validar y publicar imágenes multi-arquitectura en GitHub Container Registry (`ghcr.io`).
* **Seguridad de Base de Datos:** Aislamiento de puerto PostgreSQL por defecto en producción y hashing seguro de contraseñas.
* **Empty States Profesionales:** Vistas amigables cuando no existen máquinas ni datos monitorizados en instalaciones nuevas.

### Mejoras
* Dockerfiles multi-stage optimizados para backend y frontend con etiquetas OCI estandarizadas.
* Manejo de orígenes CORS configurable mediante variable de entorno `CORS_ORIGIN`.
* Actualizaciones no destructivas garantizadas preservando el volumen `infrainventory_postgres_data`.
