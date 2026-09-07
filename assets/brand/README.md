# Recursos de marca

`favicon-source.svg` es la fuente original entregada por el cliente el 2026-08-30. Se conserva fuera del runtime público para mantener trazabilidad y permitir regenerar derivados.

Ejecutar:

```powershell
node --experimental-strip-types scripts/prepare-brand-favicon.ts
```

El script identifica y elimina únicamente la ruta negra de lienzo completo incluida en el SVG, sin alterar las rutas doradas del símbolo. Después genera `app/icon.png` (256 × 256) y `app/apple-icon.png` (180 × 180) con canal RGBA real. La generación falla si no encuentra exactamente un fondo opaco conocido, si las cuatro esquinas no tienen alfa 0, si no existe al menos un píxel opaco o si las dimensiones cambian.

Los PNG no incorporan scripts, enlaces externos ni metadatos XMP del SVG de origen. Next/Vinext publica estos archivos mediante sus convenciones de metadatos; `/favicon.ico` redirige localmente a `/icon.png`.

## Filigrana de bordes

`filigree-source-v01.png` es el primer mosaico maestro suministrado por el cliente el 2026-08-30. `filigree-gold-texture-source-v02.png` y `filigree-gold-texture-source-v03.png` documentan las iteraciones anteriores de textura metálica. `filigree-mosaic-source-v04.png` es el mosaico teselado negro y dorado seleccionado por el cliente para la versión actual. Cada fuente se conserva byte por byte en esta carpeta y ninguna se sirve directamente al navegador.

Ejecutar:

```powershell
pnpm run brand:filigree
```

El script comprueba el SHA-256 y las dimensiones exactas de `filigree-mosaic-source-v04.png`, convierte de forma gradual las teselas casi negras en alfa sin borrar sus relieves y genera tres derivados actuales: `assets/synthetic-decor/selected/border-filigree-mosaic-v04.webp` (768 × 768) y los raíles verticales de trazabilidad `border-filigree-left-v05.webp` y `border-filigree-right-v05.webp` (320 × 1056 cada uno). La implementación usa el mosaico cuadrado como una pátina continua repetida detrás del contenido de las cuatro rutas sintéticas. La baldosa mide entre 360 y 416 px en escritorio, entre 288 y 320 px en el intervalo compacto y entre 224 y 260 px en móvil, para mantener manos, manzanas y teselas pequeñas sin convertir el fondo en un mural. El estado base y el halo comparten una gama de champán envejecido y bronce alineada con `--public-gold` y `--public-gold-strong`; las opacidades activa y de reposo conservan una relación inferior a 1,8× y la máscara suave evita un salto de exposición. El halo se habilita únicamente con puntero fino; táctil y movimiento reducido conservan solo la pátina, mientras impresión y colores forzados la ocultan deliberadamente.

También regenera `assets/synthetic-decor/ASSET_MANIFEST.csv`, donde la revisión humana, de derechos y legal permanecen en `PENDING`. Los derivados permanecen fuera de `public/` y solo se entregan mediante el middleware del preview local, con caché privada y `noimageindex`. La transformación gradual evita un recorte duro en los degradados dorados; el mosaico no se declara continuo porque sus bordes no forman una tesela perfecta.
