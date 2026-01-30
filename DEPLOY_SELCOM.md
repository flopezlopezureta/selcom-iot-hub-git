# 🚀 Despliegue en selcom.cl (Producción)

Este es el dominio final de producción. He actualizado la configuración necesaria para que el Hub funcione bajo este dominio.

## ✅ Cambios Realizados

1.  **Backend Config**: `public/api/.env` ahora tiene `ALLOWED_ORIGIN=https://selcom.cl`.
2.  **CORS**: La API solo aceptará peticiones desde el dominio selcom.cl por seguridad.

---

## 📋 Pasos en Hostinger (File Manager)

Si el despliegue automático ya terminó, asegúrate de que el archivo `.env` en la carpeta `api/` del servidor tenga estos datos:

```env
DB_HOST=localhost
DB_NAME=u994400602_iot_hub
DB_USER=u994400602_admin
DB_PASS=Dan15223-
GEMINI_API_KEY=AIzaSyCWDR2MkxWMewFg_SsvwDo9PVAPoxHVrPE
ALLOWED_ORIGIN=https://selcom.cl
ENVIRONMENT=production
```

> [!IMPORTANT]
> Si Hostinger utiliza una carpeta distinta para `selcom.cl`, asegúrate de que el repositorio de GitHub esté conectado al directorio correcto.

## 🔄 Verificar Acceso

1. Entra en **https://selcom.cl**
2. Inicia sesión normalmente.
3. Si el login falla, verifica que el `ALLOWED_ORIGIN` en el `.env` del servidor coincida exactamente con la URL que ves en la barra del navegador.

---
🚀 **Selcom IoT Hub está listo para producción.**
