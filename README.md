# PDF Viewer — Next.js + Google Drive + Vercel

Aplicacion para servir PDFs privados desde Google Drive, con visor mobile-first y panel admin.

## Stack (todo gratis)

| Servicio | Uso | Tier gratuito |
|---|---|---|
| **Vercel** | Hosting / Serverless | Hobby (ilimitado para proyectos personales) |
| **Google Drive API** | Almacenamiento de PDFs | Gratuito (la API no cobra) |
| **Upstash Redis** | Estado visible/oculto | 10,000 req/dia, 256 MB |

---

## Configuracion previa (REQUERIDA antes de desplegar)

### 1. Google Cloud — Service Account

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un proyecto nuevo (o usa uno existente)
3. Ve a **APIs y servicios → Biblioteca** → busca "Google Drive API" → **Habilitar**
4. Ve a **APIs y servicios → Credenciales** → **Crear credenciales → Cuenta de servicio**
   - Nombre: `pdf-viewer-service`
   - Rol: ninguno (lo dejas en blanco)
5. Haz clic en la cuenta de servicio creada → **Claves → Agregar clave → Crear clave nueva → JSON**
6. Descarga el archivo JSON — guarda el contenido en una sola linea para la variable de entorno
7. **Comparte la carpeta de Google Drive** con el email de la service account:
   - `tu-cuenta@tu-proyecto.iam.gserviceaccount.com`
   - Permiso: **Lector (Viewer)**

### 2. Obtener el ID de la carpeta de Google Drive

La URL de la carpeta es: `https://drive.google.com/drive/folders/FOLDER_ID_AQUI`

El `FOLDER_ID_AQUI` es el valor de `DRIVE_FOLDER_ID`.

### 3. Upstash Redis (gratis)

1. Ve a [upstash.com](https://upstash.com) → Crear cuenta gratuita
2. **Create Database** → elige region (us-east-1 recomendado para Vercel)
3. Copia `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` desde el dashboard

---

## Variables de entorno

Crea `.env.local` en la raiz del proyecto (hay un `.env.local` de ejemplo):

```env
# Google Drive Service Account (JSON completo en una sola linea)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# ID de la carpeta de Google Drive
DRIVE_FOLDER_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tu_contrasena_segura

# JWT Secret (minimo 32 caracteres aleatorios)
# Genera uno con: openssl rand -base64 32
ADMIN_JWT_SECRET=un_secreto_muy_largo_y_aleatorio_de_32_caracteres_minimo

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxE=
```

---

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Deploy en Vercel

```bash
# Instalar Vercel CLI (opcional)
npm i -g vercel

# Deploy
vercel
```

O conecta el repositorio de GitHub en [vercel.com](https://vercel.com) para deploy automatico.

**En Vercel Dashboard → Settings → Environment Variables**, agrega todas las variables del `.env.local`.

---

## Rutas

| Ruta | Descripcion |
|---|---|
| `/` | Lista de PDFs habilitados (publica) |
| `/view/[fileId]` | Visor de PDF con pinch-to-zoom |
| `/admin/login` | Login del admin |
| `/admin` | Dashboard: activar/desactivar PDFs |

---

## Como agregar/quitar PDFs

1. **Agregar**: Sube el PDF directamente a la carpeta de Google Drive configurada. Aparecera automaticamente en el admin.
2. **Mostrar/Ocultar**: En `/admin`, usa el toggle de cada PDF.
3. **Eliminar**: Elimina el archivo desde Google Drive.

Los cambios de visibilidad son instantaneos. La lista publica se actualiza con cache de 5 minutos.
