# Registro de Cambios (CHANGELOG)

Todas las modificaciones notables de este proyecto se documentan en este archivo.

---

## [15.0.0] - 2026-09-22

### 🤖 InfraAI — Asistente de Operaciones IT (Estrictamente READ-ONLY)
* **Asistente Inteligente de Operaciones IT:** Motor de IA conectado a datos reales de inventario, telemetría, alertas del NOC, discovery, servicios, puertos, backups, cambios y topología de red.
* **Principio de Cero Alucinación & Fundamentación Determinista (Grounding):** Respuestas generadas a partir de herramientas internas de solo lectura. Si un dato no existe en InfraInventory, responde taxativamente con honestidad técnica sin inventar métricas ni estados.
* **Citas de Fuentes & Enlaces Interactivos:** Respuestas acompañadas de fuentes consultadas (`Fuentes consultadas: Monitoring, Alerts, Inventory`) y chips de navegación interactiva directa a las fichas de los hosts implicados (`[Ver dispositivo]`).
* **Seguridad Estricta & Política READ-ONLY Absoluta:**
  * Prohibición absoluta de generación de SQL libre (`LLM -> SQL -> PostgreSQL`).
  * Sin comandos de shell, SSH, WinRM, PowerShell ni reinicios/modificaciones de infraestructura.
  * Control de acceso basado en roles (RBAC) previo a la invocación de cualquier herramienta.
* **Sanitización Automática de Secretos (AES-256-GCM):** Enmascaramiento y purga automática de contraseñas, hashes, claves privadas, tokens de Telegram y JWTs antes de ser expuestos al modelo de lenguaje o a la UI.
* **Defensa contra Prompt Injection:** Aislamiento de datos de infraestructura en bloques no ejecutables con directivas operativas estrictas.
* **Flexibilidad de Proveedores LLM & Fallback Determinista:** Soporte nativo para Ollama (local-first) y APIs compatibles con OpenAI, con motor de razonamiento fundamentado autónomo capaz de responder aun sin servidor LLM activo.
* **Integración Contextual en la Interfaz:**
  * Botón contextual `[🤖 Analizar con InfraAI]` en el Dashboard NOC.
  * Diagnóstico 360° en un clic desde la ficha técnica de cada Host (`MachineDetailPage.tsx`).
  * Análisis de causa raíz y acciones sugeridas para cada anomalía en la bandeja de Alertas (`AlertsPage.tsx`).
  * Módulo dedicado de Chat, Diagnóstico 360°, Informes Ejecutivos en Markdown y Panel de Control de Consultas IA.
* **Política de Versionado Visual Limpio:** La versión `15.0.0` se preserva exclusivamente en "Acerca de" sin contaminar la UI general ni las respuestas de la IA.

---

## [14.0.0] - 2026-09-22

### 🔔 Sistema de Alertas y Notificaciones por Telegram
* **Integración Nativa con Telegram Bot API:** Emisión en tiempo real de notificaciones formateadas en HTML para eventos operacionales, caídas de hosts, saturación de recursos y tareas críticas.
* **Seguridad de Grado Bancario (AES-256-GCM):** Cifrado en reposo del Token de Bot de Telegram y enmascaramiento estricto (`********abcd` y Chat ID `12****89` / `-100****7890`), garantizando que las credenciales nunca se expongan en logs ni viajen en texto claro a la UI.
* **Filtro Granular de Eventos:** Selector de eventos y severidad mínima (`INFO`, `WARNING`, `CRITICAL`):
  * *Hosts e Infraestructura:* Caída de host (`HOST_OFFLINE`) y restablecimiento (`HOST_RECOVERED`) con cálculo automático de duración de la caída.
  * *Servicios y Procesos:* Detención (`SERVICE_DOWN`) y recuperación (`SERVICE_RECOVERED`).
  * *Telemetría y Recursos:* Saturación de CPU (`HIGH_CPU`), memoria RAM (`HIGH_RAM`), disco (`HIGH_DISK`) y alertas del NOC.
  * *Discovery de Red:* Nuevos dispositivos detectados (`DISCOVERY_NEW_DEVICE`) y cambios en puertos/IP/MAC (`DISCOVERY_CHANGE`).
  * *Backups y Restauraciones:* Notificaciones de finalización o fallo en copias de seguridad (`BACKUP_COMPLETED`, `BACKUP_FAILED`), restauraciones y procesos de importación.
* **Mecanismo Anti-Spam / Cooldown & Rate Limiting:** Deduplicación inteligente de alertas en ventanas configurables (5m, 15m, 30m, 1h) con reseteo instantáneo ante recuperaciones, limitador de tasa a 20 msgs/minuto y 3 reintentos con backoff exponencial.
* **Historial Inmutable de Notificaciones:** Tabla de registro de auditoría de envíos (`NotificationDeliveryLog`) accesible desde la interfaz web con estado, latencia y sanitización de tokens en errores.
* **Probador de Conexión Integrado:** Botón "Enviar Mensaje de Prueba" en la pestaña de configuración para verificar la conectividad de forma inmediata.

### 🧹 Limpieza Completa del Sistema de Versionado Visual
* **Unificación Visual Estricta:** La versión de la plataforma se muestra **exclusivamente** en la sección **"Acerca de"** (`AboutPage.tsx`), eliminando badges y cadenas de versión innecesarias del Dashboard NOC, tablas de backups, modales y mensajes.
* **Mensajes de Alerta Limpios:** Formato de notificaciones de Telegram completamente libre de cadenas o etiquetas de versión de la aplicación.
* **Preservación del Versionado Técnico:** Sincronización exacta y automatizada de versiones para builds, Docker, GHCR, CI/CD de GitHub Actions y endpoints de introspección técnica (`GET /api/version` y `GET /api/about`).

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
