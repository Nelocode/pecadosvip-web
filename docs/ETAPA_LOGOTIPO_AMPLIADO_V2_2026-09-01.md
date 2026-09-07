# Etapa: logotipo ampliado V2

Fecha de cierre local: 2026-09-01

## Cambio realizado

- El isotipo de la cabecera aumenta de 54 a 60 px en escritorio.
- El nombre `PecadosVip` aumenta de 31.2 a 33.6 px.
- La cabecera aumenta de 76 a 82 px para conservar el mismo aire vertical.
- En móvil, el isotipo pasa de 38 a 40 px, el nombre a 22.08 px y la cabecera a 70 px.
- La imagen conserva el recurso real transparente `app/icon.png`; sus dimensiones intrínsecas pasan a 64 × 64 px para evitar reescalado insuficiente.
- No se modificaron el hero, las zonas Madrid/Barcelona, perfiles, filtros, navegación ni los bloqueos local-only.

## Evidencia

La comparación visual y las capturas responsive están en `output/audit-20260901-logo-scale-v2/`. El cierre detallado se registra al final de `design-qa.md`.

## Alcance

Esta etapa valida únicamente el preview local. No autoriza despliegue, publicación, activación comercial, contacto, pagos ni reservas. `productionActivation:false` permanece vigente.

## Cómo abrir el proyecto

1. Instala Node.js 22 y pnpm.
2. Abre PowerShell dentro de la carpeta del proyecto.
3. Ejecuta `pnpm install --frozen-lockfile`.
4. Ejecuta `pnpm run dev:synthetic`.
5. Abre `http://localhost:3000/preview-local-sintetico?lang=es#inicio`.

Para GitHub o EasyPanel, sigue `LEEME_PRIMERO_SUBIR_PROYECTO.md` dentro del ZIP de esta etapa.

## Validación final

- `pnpm run validate`: aprobado.
- ESLint y TypeScript: aprobados.
- Pruebas: 206/206 aprobadas.
- Build: cinco entornos Vinext aprobados; salida standalone generada y dependencias de runtime preparadas.
- Auditoría visual: 1916, 902, 390 y 320 px sin colisiones ni hallazgos P0, P1 o P2 en este ajuste.
