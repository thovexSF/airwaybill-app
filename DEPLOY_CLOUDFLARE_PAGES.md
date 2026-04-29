# Deploy AWB SaaS en Cloudflare Pages (gratis)

Este proyecto (`awb-saas`) es una SPA de Vite + React.
Ya incluye fallback de rutas en `public/_redirects` para que funcionen rutas como `/editor`, `/login`, `/signup`.

## 1) Subir rama a GitHub

Desde la raíz del repo:

```bash
git add awb-saas
git commit -m "setup Cloudflare Pages deployment for awb-saas"
git push
```

## 2) Crear proyecto en Cloudflare Pages

1. Entra a [Cloudflare Pages](https://dash.cloudflare.com/).
2. `Workers & Pages` -> `Create application` -> `Pages` -> `Connect to Git`.
3. Selecciona el repositorio.
4. Configura:
   - **Framework preset**: `Vite`
   - **Root directory**: `awb-saas`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

## 3) Deploy

- Haz click en `Save and Deploy`.
- Cloudflare te entregará una URL `*.pages.dev`.

## 4) Dominio propio (opcional)

En el proyecto de Pages:

- `Custom domains` -> `Set up a custom domain`
- Apunta `awb.tudominio.com`.

## Costos

- Plan Free de Pages: suficiente para este MVP.
- Costo mensual inicial: **$0**.
