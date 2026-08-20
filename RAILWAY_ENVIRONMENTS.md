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

Ambos comandos viven en `railway.json`, versionado en el repo, para que un cambio
en la UI de Railway no pueda dejar el servicio sin comando de arranque:

- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm start` (`vite preview --host 0.0.0.0 --port ${PORT:-4173}`)
- Healthcheck: `/`

El proveedor de lenguaje se fija en `nixpacks.toml`. Nixpacks escanea el repo
para adivinarlo, y su proveedor de Deno gana apenas encuentra un
`import ... from "https://deno.land/..."`: `supabase/functions/` son Edge
Functions de Supabase y corren en Deno. Con eso la fase `setup` instalaba deno,
la imagen quedaba sin npm y el build moría con `npm: command not found`
(exit 127) aunque los comandos de build y start fueran los correctos.

El `--include=dev` es deliberado. Si el ambiente define `NODE_ENV=production`,
`npm ci` omite las devDependencies y el build muere con `tsc: not found` o
`vite: not found`, porque el toolchain completo (TypeScript, Vite, el plugin de
React) es devDependency. La versión de Node se fija en `.nvmrc` y en `engines`.

### Hosts permitidos en el preview

Desde Vite 5.4.12 el servidor de `vite preview` responde **403 "Blocked request.
This host is not allowed."** a toda petición cuyo header `Host` no esté en
`preview.allowedHosts`. El build pasa igual, así que el síntoma no es un error de
compilación: el healthcheck de Railway (que llega con `Host: healthcheck.railway.app`)
recibe 403 y el deploy se marca como fallido.

`vite.config.ts` autoriza `.up.railway.app` y `.railway.app`. Para un dominio
propio, agregar la variable de entorno `PREVIEW_ALLOWED_HOSTS` en el ambiente de
Railway, con los dominios separados por comas:

```
PREVIEW_ALLOWED_HOSTS=airwaybill.app,www.airwaybill.app
```

Clickjacking protection (`X-Frame-Options: DENY`, `CSP frame-ancestors 'none'`) is set in
`vite.config.ts` for the preview server and in `public/_headers` for static hosts (Cloudflare Pages).

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
