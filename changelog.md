# Registro de Cambios (CHANGELOG)

Todas las modificaciones notables de este proyecto se documentan en este archivo.

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
