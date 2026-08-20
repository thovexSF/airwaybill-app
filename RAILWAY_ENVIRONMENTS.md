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

Las tres fases están versionadas en el repo, para que un cambio en la UI de
Railway no pueda dejar el servicio sin comando de arranque:

- Install (`nixpacks.toml`): `npm ci --include=dev`
- Build (`railway.json`): `npm run build`
- Start (`railway.json`): `npm start` (`vite preview --host 0.0.0.0 --port ${PORT:-4173}`)
- Healthcheck: `/`

La instalación va en la fase de install y en ninguna otra. Nixpacks monta
`/app/node_modules/.cache` como caché de build, así que un segundo `npm ci` en
la fase de build borra `node_modules` entero, no puede hacer `rmdir` de ese
punto de montaje y falla con `EBUSY: resource busy or locked` (errno -16,
exit 240).

El proveedor de lenguaje se fija en `nixpacks.toml`. Nixpacks escanea el repo
para adivinarlo, y su proveedor de Deno gana apenas encuentra un
`import ... from "https://deno.land/..."`: `supabase/functions/` son Edge
Functions de Supabase y corren en Deno. Con eso la fase `setup` instalaba deno,
la imagen quedaba sin npm y el build moría con `npm: command not found`
(exit 127) aunque los comandos de build y start fueran los correctos.

El `--include=dev` es deliberado. El ambiente trae la config `production` de npm
activada, y sin esa bandera `npm ci` omite las devDependencies y el build muere
con `tsc: not found` o `vite: not found`, porque el toolchain completo
(TypeScript, Vite, el plugin de React) es devDependency. Verificado: con
`NPM_CONFIG_PRODUCTION=true NODE_ENV=production`, `--include=dev` igual deja
`vite` y `tsc` instalados. La versión de Node se fija en `.nvmrc` y en `engines`.

### Hosts permitidos en el preview

Desde Vite 5.4.12 el servidor de `vite preview` responde **403 "Blocked request.
This host is not allowed."** a toda petición cuyo header `Host` no esté en
`preview.allowedHosts`. El build pasa igual, así que el síntoma no es un error de
compilación: el healthcheck de Railway (que llega con `Host: healthcheck.railway.app`)
recibe 403 y el deploy se marca como fallido.

`vite.config.ts` autoriza `airwaybill.app` y sus subdominios, más
`.up.railway.app` y `.railway.app`. El dominio propio va en el código y no en
una variable de entorno a propósito: si la variable se pierde, el sitio entero
devuelve 403 y el síntoma —una página en blanco con un texto de Vite— no se
parece en nada a la causa.

Para un dominio adicional sin tocar el código existe igual la variable
`PREVIEW_ALLOWED_HOSTS`, con los dominios separados por comas:

```
PREVIEW_ALLOWED_HOSTS=otrodominio.com,www.otrodominio.com
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
