# Guía de Contribución a InfraInventory

¡Gracias por tu interés en contribuir a InfraInventory!

---

## 1. Flujo de Trabajo y Desarrollo

1. **Fork** del repositorio en GitHub.
2. Crea una rama descriptiva para tu cambio:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. Realiza tus cambios manteniendo las convenciones de código y TypeScript.
4. Asegúrate de que las pruebas pasen satisfactoriamente:
   ```bash
   npm run build  # En frontend y backend
   ```
5. Realiza un **Pull Request** explicando detalladamente la motivación y solución aportada.

---

## 2. Reglas de Contribución

* **No destructividad:** Los cambios en bases de datos deben ser aditivos y compatibles hacia atrás.
* **Seguridad:** No incluir secretos, credenciales o datos de prueba sensibles en el código.
* **Estilo Visual:** Mantener la coherencia con el diseño Dark NOC (`#0B0F14`, `#151B23`, `#252D38`, Lucide Icons).
