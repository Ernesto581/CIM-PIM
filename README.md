# jMDA · Módulo CIM-PIM (v4)

Herramienta CASE para **Arquitectura Dirigida por Modelos (MDA)**. Genera el **Modelo Independiente de la Plataforma (PIM)** a partir de una idea de sistema de información descrita en **lenguaje natural (CIM)**, usando **IA generativa** y una **metódica de conversión CIM→PIM**.

## Metódica CIM→PIM

| Etapa | Nivel | Entrada | Salida |
|---|---|---|---|
| Modelo de Requisitos en Texto | CIM | Idea en lenguaje natural | Documento de requisitos |
| Modelo de Casos de Uso | CIM→PIM | Requisitos | Actores + CU + diagrama PlantUML |
| Modelo de Clases | PIM | Requisitos/CU | Clases, atributos, métodos + PlantUML |
| Modelo de Secuencia | PIM | CU/Clases | Interacciones + PlantUML |
| Modelo de Actividades | PIM | CU | Flujos + PlantUML |

La metódica (prompts) vive en:
- `web/api/method.js` → función serverless de Vercel (usada en producción).
- `supabase/functions/generate/method.ts` → alternativa con Edge Function de Supabase.
- `llm_integration/prompts/method.json` → versión Docker (fuente de referencia).

## Estructura

- **`web/`** → App React (Vercel) + función serverless `/api/generate` (llama a la IA).
- **`supabase/`** → Esquema SQL (`migrations/`) y Edge Function opcional (`functions/generate`).
- Raíz (Docker) → `client_app/`, `manager_service/`, `llm_integration/`, `api_gateway/`, `docker-compose.yml` → alternativa local/offline.

---

## Despliegue en producción (Supabase + Vercel)

### 1. Supabase (base de datos + autenticación)
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta el esquema: **SQL Editor** → pega `supabase/migrations/0001_schema.sql` → *Run* (crea `profiles`, `projects`, RLS y el trigger de perfil).
3. **Authentication → Providers → Email**: habilítalo.
4. Para probar sin correo: **Authentication → Settings** → desactiva **Confirm email** (o crea usuarios desde *Authentication → Users → Add user* marcando *Auto Confirm User*).
5. Copia **Project URL** y **Publishable key** desde **Project Settings → API**.

### 2. Vercel (frontend + función de IA)
1. Importa este repo en [vercel.com](https://vercel.com).
2. **Root Directory** = `web`.
3. Variables de entorno (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = tu publishable key (`sb_publishable_...`)
   - `VITE_PLANTUML_URL` = `https://www.plantuml.com/plantuml` (opcional)
   - `LLM_API_KEY` = tu clave de IA
   - `LLM_BASE_URL` = `https://api.openai.com/v1` (o tu gateway)
   - `LLM_MODEL` = `gpt-4o`
4. Deploy.

> La función `/api/generate` se despliega automáticamente con Vercel y mantiene la clave de IA en secreto.

### Alternativa: Edge Function de Supabase
Si prefieres la IA dentro de Supabase:
```bash
npm i -g supabase
supabase login
supabase link --project-ref <tu_ref>
supabase functions deploy generate --no-verify-jwt
supabase secrets set LLM_BASE_URL=... LLM_MODEL=... LLM_API_KEY=...
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
- Los secretos nunca se suben al repo (`.env` está en `.gitignore`).
- En Vercel los diagramas usan el PlantUML público (requiere internet); en Docker se usa un servidor PlantUML local.
