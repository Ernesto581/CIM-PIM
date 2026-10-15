# jMDA · Módulo CIM-PIM (v4)

Herramienta CASE para **Arquitectura Dirigida por Modelos (MDA)**. Genera el **Modelo Independiente de la Plataforma (PIM)** a partir de una idea de sistema de información descrita en **lenguaje natural (CIM)**, usando **Inteligencia Artificial generativa** (DeepSeek, a través de la plataforma OpenCode) y una **metódica de conversión CIM→PIM**.

## Despliegue actual

La aplicación se encuentra desplegada y en funcionamiento en:

- **Producción:** https://web-beta-teal-66.vercel.app/ — frontend en **Vercel**, backend (base de datos y autenticación) en **Supabase**.

## Metódica CIM→PIM

| Etapa | Nivel | Entrada | Salida |
|---|---|---|---|
| Modelo de Requisitos en Texto | CIM | Idea en lenguaje natural | Documento de requisitos |
| Modelo de Casos de Uso | CIM→PIM | Requisitos | Actores + CU + diagrama PlantUML |
| Modelo de Clases | PIM | Requisitos/CU | Clases, atributos, métodos + PlantUML |
| Modelo de Secuencia | PIM | CU/Clases | Interacciones + PlantUML |
| Modelo de Actividades | PIM | CU | Flujos + PlantUML |

## Funcionalidades

- Registro e inicio de sesión de usuarios (Supabase Auth).
- Gestión de proyectos (crear, listar, abrir, editar y eliminar).
- Introducción de la idea del sistema en lenguaje natural.
- Generación de los artefactos del PIM con IA, en tiempo real (streaming).
- Visualización de los diagramas UML mediante PlantUML.
- Edición y guardado del contenido (Markdown) y del código PlantUML de cada modelo.
- Validación automática de la coherencia entre los requisitos y los modelos.
- Corrección automática de los modelos según el informe, con visualización de los cambios (diff).
- Exportación de los artefactos en formatos `.puml`, PNG y Markdown.

## Arquitectura y tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React (Vite) + Material UI |
| Backend | Funciones serverless de Node.js en Vercel (`/api/generate`, `/api/validate`, `/api/fix`) |
| Base de datos y autenticación | Supabase (PostgreSQL + Auth + Row Level Security) |
| Inteligencia artificial | DeepSeek (`deepseek-v4-pro`) a través de OpenCode Go |
| Diagramas | PlantUML |
| Alternativa local/offline | Docker (microservicios + servidor PlantUML local) |

## Estructura del repositorio

- **`web/`** → Aplicación React (despliegue en Vercel) + funciones serverless `/api/generate`, `/api/validate` y `/api/fix`.
- **`supabase/`** → Esquema SQL (`migrations/`) y Edge Function opcional (`functions/generate`).
- Raíz (Docker) → `client_app/`, `manager_service/`, `llm_integration/`, `api_gateway/`, `docker-compose.yml` → alternativa local/offline.

---

## Despliegue en producción (Supabase + Vercel)

### 1. Supabase (base de datos + autenticación)
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta el esquema: **SQL Editor** → pega `supabase/migrations/0001_schema.sql` → *Run* (crea `profiles`, `projects`, RLS y el trigger de perfil).
3. **Authentication → Providers → Email**: habilítalo.
4. Para probar sin correo: **Authentication → Settings** → desactiva **Confirm email**.
5. Copia **Project URL** y **Publishable key** desde **Project Settings → API**.

### 2. Vercel (frontend + funciones de IA)
1. Importa este repo en [vercel.com](https://vercel.com).
2. **Root Directory** = `web`.
3. Variables de entorno (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = tu publishable key (`sb_publishable_...`)
   - `VITE_PLANTUML_URL` = `https://www.plantuml.com/plantuml` (opcional)
   - `LLM_API_KEY` = tu clave de IA (clave de API de OpenCode: `oc_sk_...` para el servicio Console, o la clave de Go)
   - `LLM_BASE_URL` = `https://opencode.ai/inference/v1` (OpenCode Console; para la suscripción Go usa `https://opencode.ai/inference/go/v1`)
   - `LLM_MODEL` = `deepseek-v4-pro`
   - `LLM_REASONING_EFFORT` = `none` (importante: evita el timeout de ~60s)
   - (Las funciones `/api/*` validan la sesión del usuario con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, ya configuradas arriba; no hace falta un secreto adicional.)
   - `RATE_LIMIT_MAX` = `20` (opcional; solicitudes por usuario por ventana)
   - `RATE_LIMIT_WINDOW_MS` = `60000` (opcional; ventana en ms)
4. Deploy.

> Las funciones `/api/generate`, `/api/validate` y `/api/fix` se despliegan automáticamente con Vercel y mantienen la clave de IA en secreto (no llega al navegador).

### Alternativa: Edge Function de Supabase
Si se prefiere la IA dentro de Supabase:
```bash
npm i -g supabase
supabase login
supabase link --project-ref <tu_ref>
supabase functions deploy generate --no-verify-jwt
supabase secrets set LLM_BASE_URL=... LLM_MODEL=... LLM_API_KEY=... LLM_REASONING_EFFORT=none
```
(en ese caso cambia `web/src/pages/Wizard.jsx` para usar `supabase.functions.invoke('generate', ...)`).

---

## Ejecución local (Docker, sin internet para PlantUML)

```bash
cp llm_integration/.env.example llm_integration/.env
cp manager_service/.env.example manager_service/.env
# edita llm_integration/.env con tu LLM_API_KEY
docker compose up --build
```

- Cliente: http://localhost:3000 · API Gateway: 3001 · LLM: 3002 · Manager: 3003 · PlantUML local: 8080
- Usuario por defecto: `admin` / `admin123`

---

## Notas

- Los secretos nunca se suben al repositorio (`.env` está en `.gitignore`; se entregan los `.env.example` con valores `CHANGEME`).
- En Vercel los diagramas usan el PlantUML público (requiere internet); en Docker se usa un servidor PlantUML local.
- El proveedor de IA empleado (OpenCode Go, basado en DeepSeek) es accesible desde Cuba sin necesidad de VPN.
