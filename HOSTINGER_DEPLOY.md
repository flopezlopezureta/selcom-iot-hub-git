# 🚀 Guía de Despliegue: Hostinger + GitHub

Tu código ya está en GitHub: **https://github.com/flopezlopezureta/selcom-iot-hub-git**

## Paso 1: Conectar Hostinger con GitHub

### En el Panel de Hostinger (hPanel):

1. **Inicia sesión** en [hostinger.com](https://hostinger.com)
2. Ve a **"Websites"** (Sitios Web)
3. Selecciona tu dominio **selcom.cl**
4. En el menú lateral, busca **"Git"** o **"GitHub"**
5. Haz clic en **"Connect to GitHub"** o **"Conectar con GitHub"**
6. **Autoriza** a Hostinger en la ventana de GitHub que se abre
7. Selecciona el repositorio: **`flopezlopezureta/selcom-iot-hub-git`**
8. Configura:
   - **Branch (Rama)**: `main`
   - **Deploy Path (Ruta)**: `/public_html` (o la carpeta de tu dominio)
9. Haz clic en **"Deploy"** o **"Desplegar"**

---

## Paso 2: Crear el Archivo `.env` en el Servidor

**IMPORTANTE**: El archivo `.env` NO se sube a GitHub (por seguridad). Debes crearlo manualmente en Hostinger.

### En hPanel:

1. Ve a **"File Manager"** (Administrador de Archivos)
2. Navega a la carpeta de tu sitio → **`api/`**
3. Haz clic en **"New File"** (Nuevo Archivo)
4. Nombre: **`.env`**
5. Edita el archivo y pega este contenido:

```env
DB_HOST=localhost
DB_NAME=selcomc1_iot
DB_USER=selcomc1_sel-iot
DB_PASS=Dan15223.,
GEMINI_API_KEY=AIzaSyD5hZQgQUsTV7J7S9ydHlW2UeWV_q-TLYg
ALLOWED_ORIGIN=https://selcom.cl
ENVIRONMENT=production
```

6. **Guarda** el archivo
7. **Permisos**: Clic derecho → Permissions → `600` (solo lectura para propietario)

---

## Paso 3: Compilar el Proyecto en el Servidor

### Opción A: Si Hostinger tiene Terminal SSH

1. En hPanel, busca **"Terminal"** o **"SSH Access"**
2. Abre la terminal
3. Ejecuta:
   ```bash
   cd public_html  # o la carpeta de tu dominio
   npm install
   npm run build
   ```

### Opción B: Si NO tienes Terminal (Plan Básico)

1. En tu PC, la carpeta `dist/` ya está compilada
2. Sube manualmente la carpeta `dist/` vía **File Manager**

---

## Paso 4: Verificar que Funciona

1. Ve a **https://selcom.cl**
2. Deberías ver la página de login
3. Prueba iniciar sesión
4. Verifica que puedes crear dispositivos y generar sketches

---

## 🎉 ¡Listo! Ahora cada vez que hagas:

```bash
git push
```

Hostinger actualizará automáticamente tu sitio web.

---

## Solución de Problemas

### Si ves errores 500:
- Verifica que el archivo `.env` existe en `api/`
- Revisa los permisos del `.env` (deben ser 600)

### Si no carga el frontend:
- Asegúrate de que la carpeta `dist/` está en el servidor
- Verifica que el archivo `.htaccess` está presente

### Si CORS da error:
- Verifica que `ALLOWED_ORIGIN` en `.env` sea exactamente `https://selcom.cl`
