# Referencias visuales sintéticas de ciudades

Esta carpeta conserva ocho composiciones editoriales generadas con IA para validar, solo en el preview local, la presentación de Madrid, Barcelona, Girona, Tarragona, Sitges, Toledo, Guadalajara y Segovia.

- `master/`: PNG originales generados para esta etapa.
- `selected/`: derivados WebP de 1200 × 900 usados por el preview local.
- `ASSET_MANIFEST.csv`: rutas, dimensiones, hashes y estado de revisión.
- `PROMPTS_V1.md`: intención creativa reproducible de la primera versión.

Las imágenes son referencias estéticas, no fotografías documentales ni evidencia de cobertura comercial, oficinas, alojamientos asociados o disponibilidad. No deben copiarse a `public/` ni publicarse mientras las columnas `human_review`, `linguistic_review`, `rights_review` y `legal_review` del manifiesto figuren como `PENDING`.

Para regenerar derivados y el manifiesto:

    node --experimental-strip-types scripts/prepare-synthetic-city-assets.ts

El script valida formato, dimensiones y unicidad antes de reemplazar los derivados.
