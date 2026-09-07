# Imágenes de perfiles sintéticos

Esta estructura recibe únicamente imágenes de personas adultas totalmente ficticias, generadas con IA para el preview local de PecadosVip. No representa identidades, disponibilidad ni servicios reales.

## Estructura de trabajo

`assets/synthetic-profiles/` conserva los archivos originales generados y sus iteraciones:

- `brand-reference/`: referencias de paleta, iluminación y composición. No usar rostros reales como referencia de identidad.
- `<perfil>/master/`: imagen maestra elegida para fijar la identidad.
- `<perfil>/cover/`: candidatos verticales 3:4 para tarjetas.
- `<perfil>/gallery/`: variantes verticales 3:4 para la ficha.

Las fichas reproducibles de identidad y sus restricciones están en `PROMPTS_MASTER_V1.md`. Las cuatro composiciones derivadas y sus instrucciones de regeneración están en `PROMPTS_DERIVATIVES_V1.md`.

`public/media/synthetic-profiles/` contiene únicamente copias seleccionadas, revisadas y optimizadas para que la web pueda servirlas:

- `<perfil>/cover/`
- `<perfil>/gallery/`

No copies automáticamente todos los originales a `public/`.

## Nombres recomendados

Originales de trabajo:

- `valeria-master-v01.png`
- `valeria-cover-v01.png`
- `valeria-gallery-01-v01.png`

Copias web:

- `cover.webp`
- `gallery-01.webp`
- `gallery-02.webp`
- `gallery-03.webp`

Usa siempre slugs ASCII en minúsculas: `valeria`, `sofia`, `lucia`, `julia`, `mia`, `alicia`.

## Flujo

1. Genera una identidad en su carpeta `master/`.
2. Registra cada archivo en `ASSET_MANIFEST.csv`.
3. Genera las tomas derivadas usando la maestra como única referencia de identidad.
4. Revisa edad adulta inequívoca, consistencia facial, anatomía, vestuario no explícito y ausencia de marcas o personas reales.
5. Optimiza la selección final a WebP, elimina metadatos innecesarios y colócala en el árbol `public/`.
6. Mantén visible la indicación «perfil ficticio generado con IA» en cualquier preview.

## Gates

- `synthetic_confirmed` debe ser `YES`.
- `human_review` debe ser `PASS` antes de integrar.
- `legal_review` permanece `PENDING` hasta revisión especializada.
- Ningún archivo de esta carpeta autoriza publicación, contacto, indexación ni presentación como persona real.
