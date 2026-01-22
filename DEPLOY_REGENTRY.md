# 🚀 Despliegue en regentry.cl (Temporal)

## ✅ Cambios Realizados

He actualizado la configuración para usar **regentry.cl** en lugar de selcom.cl:
- ✅ Archivo `.env.example` actualizado
- ✅ Cambios subidos a GitHub

---

## 📋 Pasos para Completar el Despliegue

### 1. En Hostinger - Crear archivo `.env`

Ve al **File Manager** de Hostinger y crea el archivo `.env` en la carpeta `api/` con este contenido:

```env
DB_HOST=localhost
DB_NAME=selcomc1_iot
DB_USER=selcomc1_sel-iot
DB_PASS=Dan15223.,
GEMINI_API_KEY=AIzaSyD5hZQgQUsTV7J7S9ydHlW2UeWV_q-TLYg
ALLOWED_ORIGIN=https://regentry.cl
ENVIRONMENT=production
```

**IMPORTANTE**: Fíjate que ahora dice `ALLOWED_ORIGIN=https://regentry.cl`

### 2. Permisos del archivo

Clic derecho en `.env` → **Permissions** → `600`

### 3. Verificar el Deploy

Si Hostinger ya terminó de desplegar desde GitHub:
- Ve a **https://regentry.cl**
- Deberías ver la página de login

### 4. Si necesitas actualizar el deploy

En Hostinger, ve a la sección de **Git** y haz clic en **"Pull"** o **"Deploy"** para obtener los últimos cambios.

---

## 🔄 Cuando NIC.cl solucione el problema

Cuando selcom.cl esté disponible nuevamente:

1. Cambia el `.env` en el servidor:
   ```env
   ALLOWED_ORIGIN=https://selcom.cl
   ```

2. Actualiza el código local y sube a GitHub:
   ```bash
   # Editar api/.env.example con selcom.cl
   git add api/.env.example
   git commit -m "Restaurar dominio a selcom.cl"
   git push
   ```

---

## ✅ Resumen

- **Dominio actual**: regentry.cl
- **CORS configurado para**: https://regentry.cl
- **Próximo paso**: Crear `.env` en Hostinger con el contenido de arriba
