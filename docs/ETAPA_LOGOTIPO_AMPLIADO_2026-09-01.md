# Etapa: logotipo ampliado

Fecha de cierre local: 2026-09-01

## Cambio realizado

- El isotipo de la cabecera aumenta de 48 a 54 px en escritorio.
- El nombre `PecadosVip` aumenta de 28.48 a 31.2 px.
- La cabecera aumenta de 72 a 76 px para conservar aire vertical.
- En móvil, el isotipo queda en 38 px y el nombre en 21.12 px dentro de una cabecera de 68 px.
- No se modificaron el hero, las zonas Madrid/Barcelona, los perfiles, filtros, enlaces ni los bloqueos local-only.

## Evidencia

La auditoría visual está en `output/audit-20260901-logo-scale/` y su cierre detallado está registrado al final de `design-qa.md`.

`pnpm run validate` aprobó ESLint, TypeScript, 206/206 pruebas, los cinco entornos Vinext y la preparación standalone.

## Alcance

Esta etapa valida únicamente el preview local. No autoriza despliegue, publicación, activación comercial, contacto, pagos ni reservas. `productionActivation:false` permanece vigente.

## Cómo abrir el proyecto

1. Instala Node.js 22 y pnpm.
2. Abre PowerShell dentro de la carpeta del proyecto.
3. Ejecuta `pnpm install --frozen-lockfile`.
4. Ejecuta `pnpm run dev:synthetic`.
5. Abre `http://localhost:3000/preview-local-sintetico?lang=es#inicio`.

Para GitHub o EasyPanel, sigue el archivo `LEEME_PRIMERO_SUBIR_PROYECTO.md` incluido en el ZIP de esta etapa.
