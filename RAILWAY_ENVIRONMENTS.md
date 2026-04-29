# Railway: ambiente Development y Production

Esta app es frontend Vite. Separamos ambientes con `VITE_APP_ENV` para evitar mezclar sesiones/datos locales entre entornos.

## Variables por entorno

- **Development**
  - `VITE_APP_ENV=development`
- **Production**
  - `VITE_APP_ENV=production`

## Setup recomendado en Railway

1. En tu proyecto Railway, crea dos ambientes:
   - `development`
   - `production`
2. En cada ambiente, agrega la variable `VITE_APP_ENV` con su valor correspondiente.
3. Configura deploy por rama:
   - rama `main` -> `production`
   - rama `develop` (o similar) -> `development`

## Build / Start para Vite

- Build command:
  - `npm run build`
- Start command:
  - `npm run preview -- --host 0.0.0.0 --port $PORT`

## Scripts locales

- Desarrollo normal:
  - `npm run dev`
- Levantar local simulando producción:
  - `npm run dev:prod-mode`
- Build producción:
  - `npm run build`
- Build desarrollo:
  - `npm run build:dev`

## Nota importante

Con esta configuración, los datos en `localStorage` (usuarios/sesión/drafts) quedan separados por entorno:

- `...-development`
- `...-production`
