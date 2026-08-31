# jMDA · Módulo CIM-PIM (v4)

Herramienta CASE para **Arquitectura Dirigida por Modelos (MDA)**. Este módulo genera el **Modelo Independiente de la Plataforma (PIM)** a partir de una idea de sistema de información descrita en **lenguaje natural (CIM)**, usando **IA generativa** y una **metódica de conversión CIM→PIM**.

## Metódica CIM→PIM

| Etapa | Nivel | Entrada | Salida |
|---|---|---|---|
| Modelo de Requisitos en Texto | CIM | Idea en lenguaje natural | Documento de requisitos |
| Modelo de Casos de Uso | CIM→PIM | Requisitos | Actores + CU + diagrama PlantUML |
| Modelo de Clases | PIM | Requisitos/CU | Clases, atributos, métodos + PlantUML |
| Modelo de Secuencia | PIM | CU/Clases | Interacciones + PlantUML |
| Modelo de Actividades | PIM | CU | Flujos + PlantUML |

La metódica está definida en dos lugares equivalentes:
- `llm_integration/prompts/method.json` (versión Docker)
- `supabase/functions/generate/method.ts` (versión Supabase)
- `web/src/lib/method.js` (campos de presentación para la UI)

## Estructura del repositorio

- **`web/`** → Aplicación React (despliegue en Vercel) que usa Supabase.
- **`supabase/`** → Esquema SQL, políticas RLS y Edge Function `generate`.
- Raíz (Docker) → `client_app/`, `manager_service/`, `llm_integration/`, `api_gateway/`, `docker-compose.yml` → alternativa local/offline con microservicios.

---

## Opción A — Desplegar en Vercel + Supabase (en línea)

### 1. Crear el proyecto en Supabase
1. Entra a [supabase.com](https://supabase.com) → **New project** (elige organización, nombre y región).
2. Espera a que se despliegue (1-2 min).

### 2. Crear el esquema de base de datos
Abre **SQL Editor** y ejecuta el contenido de `supabase/migrations/0001_schema.sql` (o usa la CLI: `supabase db push`).

### 3. Configurar autenticación
En **Authentication → Providers → Email**: habilita Email.
Para pruebas, en **Authentication → Settings**, desactiva **Confirm email**.

### 4. Desplegar la Edge Function (llama a la IA)
Instala la CLI de Supabase y despliega:
```bash
npm i -g supabase
supabase login
supabase init
supabase link --project-ref <TU_PROJECT_REF>
supabase functions deploy generate --no-verify-jwt
```
Configura los secretos de la función (tu clave de IA):
```bash
supabase secrets set LLM_BASE_URL=https://api.openai.com/v1
supabase secrets set LLM_MODEL=gpt-4o
supabase secrets set LLM_API_KEY=<TU_CLAVE>
```

### 5. Desplegar el frontend en Vercel
1. Importa el repo en [vercel.com](https://vercel.com).
2. En **Root Directory** selecciona `web`.
3. Configura las variables de entorno (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = tu Project URL (`https://xxxx.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
   - (opcional) `VITE_PLANTUML_URL` = `https://www.plantuml.com/plantuml`
4. Deploy.

> Los valores de Project URL y anon key están en **Project Settings → API**.

---

## Opción B — Ejecutar local con Docker

```bash
# copiar .env de ejemplo y configurar
cp llm_integration/.env.example llm_integration/.env
cp manager_service/.env.example manager_service/.env
# editar llm_integration/.env con tu LLM_API_KEY

docker compose up --build
```

- Cliente: http://localhost:3000
- API Gateway: http://localhost:3001
- LLM integration: http://localhost:3002
- Manager: http://localhost:3003
- PlantUML (local): http://localhost:8080
- Usuario por defecto: `admin` / `admin123`

---

## Notas
- Las claves y secretos **nunca** se suben al repositorio (archivos `.env` ignorados por git).
- Los diagramas se renderizan en PlantUML; en Docker se usa un servidor local y en Vercel el servicio público de plantuml.com.
