# Etapa: home alineado con la propuesta gráfica

Fecha local: 2026-08-31

## Resultado

La portada del preview local de PecadosVip se acercó de forma sustancial a la propuesta aprobada visualmente por el usuario:

- cabecera compacta con favicon transparente, lockup de marca, navegación y reserva privada desactivada;
- hero horizontal negro y dorado con una identidad adulta enteramente sintética, copa, vestido negro y cara completa;
- franja de cuatro garantías/control de estado;
- cobertura compacta de Madrid y Barcelona con ocho referencias únicas;
- seis perfiles destacados en una sola fila de escritorio y dos columnas en móvil;
- filtros funcionales dentro de un panel desplegable;
- navegación móvil inferior fija;
- servicios, detalles de perfiles y rutas internas preservados.

## Activo nuevo

El hero se conserva en:

- maestro: `assets/synthetic-hero/master/home-hero-editorial-v01.png`;
- derivado local: `assets/synthetic-hero/selected/home-hero-editorial-v01.webp`;
- manifiesto y alcance: `assets/synthetic-hero/ASSET_MANIFEST.csv`;
- prompt reproducible: `assets/synthetic-hero/PROMPT_V1.md`.

La identidad es ficticia y adulta. La imagen no demuestra derechos de publicación, aprobación comercial, disponibilidad ni parecido autorizado con una persona real. Su revisión humana y legal continúa pendiente.

## Verificación ejecutada

- TypeScript: aprobado.
- ESLint focal: aprobado.
- Prueba del preview: 15/15 aprobadas, incluido el contrato del hero local-only.
- Validación integral `pnpm run validate`: aprobada (ESLint, TypeScript, 206/206 pruebas, cinco compilaciones Vinext y preparación standalone).
- Navegador integrado: hero, ocho ciudades y seis perfiles cargados; 0 desbordamiento horizontal.
- Filtro probado: Madrid + Disponible → Valeria, 1 resultado.
- Perfil probado: Valeria, cinco imágenes cargadas y contacto desactivado.
- Servicios probados: 34 tarjetas y cero enlaces externos.
- Comparación conjunta: `output/audit-20260831-reference-alignment/reference-vs-implementation-final.png`.
- Resultado visual: `design-qa.md` → `final result: passed`.

## Límites

- La etiqueta local `v0.1.0-beta.1` y el commit que congela esa Beta no se movieron ni reescribieron.
- Estos cambios posteriores están en el árbol de trabajo y no fueron enviados a GitHub ni desplegados.
- Reserva, contacto, pagos, analítica e indexación continúan desactivados.
- La construcción pública permanece en holding fail-closed.
- Publicar requiere autorización separada, revisión de derechos, cumplimiento legal aplicable, staging y UAT.

## Cómo revisar

1. Abre PowerShell en la raíz del proyecto.
2. Ejecuta `pnpm install --frozen-lockfile` si faltan dependencias.
3. Ejecuta `pnpm run dev:preview`.
4. Abre `http://localhost:3000/preview-local-sintetico?lang=es#inicio`.
5. Revisa la portada, abre “Filtrar modelos”, entra en un perfil y visita Servicios.

El ZIP de esta etapa añade una guía todavía más simple en `LEEME_PRIMERO_SUBIR_PROYECTO.md`.
