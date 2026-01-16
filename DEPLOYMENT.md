# Guía de Despliegue en Producción - Selcom IoT Hub

## Archivos Modificados para Producción

### 🔒 Seguridad Implementada

1. **Variables de Entorno** (`.env`)
   - Credenciales movidas fuera del código
   - Archivo `.env` protegido en `.gitignore`
   - Plantilla `.env.example` incluida

2. **CORS Restringido**
   - Solo permite: `https://selcom.cl` y `localhost` (desarrollo)
   - Protección contra accesos no autorizados

3. **Errores de PHP Ocultos**
   - En producción no se muestran detalles técnicos
   - Logs de debug eliminados

## Pasos para Desplegar

### 1. Subir Archivos al Servidor

**Opciones para subir a Webempresa**:

#### Opción A: Panel de Control (cPanel)
1. Accede al cPanel de Webempresa
2. Ve a "Administrador de archivos"
3. Navega a `public_html` (o la carpeta de tu dominio)
4. Sube los archivos modificados

#### Opción B: FTP (FileZilla, WinSCP)
1. Conéctate vía FTP con tus credenciales de Webempresa
2. Navega a la carpeta del proyecto
3. Sube los archivos

#### Opción C: Git (si tienes acceso SSH)
```bash
git pull
```

**Archivos a subir**:
- `api/db.php` (actualizado)
- `api/iot_backend.php` (sin logs de debug)
- `api/.env.example` (plantilla)
- `.gitignore` (actualizado)
- `services/geminiService.ts` (generación local)

### 2. Crear `.env` en el Servidor

**IMPORTANTE**: El archivo `.env` NO se sube a Git. Debes crearlo manualmente en el servidor.

```bash
# En el servidor, dentro de la carpeta api/
nano .env
```

Copia este contenido y ajusta si es necesario:

```env
DB_HOST=localhost
DB_NAME=selcomc1_iot
DB_USER=selcomc1_sel-iot
DB_PASS=Dan15223.,
GEMINI_API_KEY=AIzaSyD5hZQgQUsTV7J7S9ydHlW2UeWV_q-TLYg
ALLOWED_ORIGIN=https://selcom.cl
ENVIRONMENT=production
```

### 3. Compilar Frontend

```bash
npm run build
```

Esto genera la carpeta `dist/` con los archivos optimizados.

### 4. Verificar Permisos

```bash
chmod 600 api/.env  # Solo el propietario puede leer
```

## Verificación Post-Despliegue

✅ **Checklist**:
- [ ] Login funciona correctamente
- [ ] No se muestran errores de PHP en pantalla
- [ ] CORS solo permite selcom.cl
- [ ] Generación de sketches funciona (local)
- [ ] `.env` no es accesible públicamente

## Notas Importantes

⚠️ **Nunca subas el archivo `.env` a Git**
⚠️ **Cambia las contraseñas en producción si este código es público**
⚠️ **Habilita HTTPS en tu servidor (SSL)**

## Soporte de Desarrollo Local

Para trabajar localmente, crea un `.env` en `api/` con:
```env
ENVIRONMENT=development
ALLOWED_ORIGIN=http://localhost:5173
```
