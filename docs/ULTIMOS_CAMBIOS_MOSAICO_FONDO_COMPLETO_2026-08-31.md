# Últimos cambios: mosaico de fondo completo

Fecha de cierre local: 31 de agosto de 2026  
Proyecto: PecadosVip  
Estado: implementado y verificado en el preview local; pendiente de commit, push y despliegue.

## Resultado visible

El mosaico de manos y manzanas doradas ahora cubre de forma continua todo el fondo de las cuatro rutas del preview sintético:

- inicio;
- perfil individual;
- catálogo de servicios;
- detalle de servicio.

El patrón permanece visible de manera muy sutil y, en equipos con ratón, una zona pequeña alrededor del cursor adquiere un brillo dorado suave. La decoración no bloquea enlaces, botones, formularios ni el desplazamiento.

## Ajustes visuales aplicados

- Una sola capa decorativa cubre el documento completo, sin raíles laterales ni cortes centrales.
- El mosaico se repite horizontal y verticalmente.
- Tamaño aproximado de cada tesela repetida del patrón:
  - escritorio: entre 360 y 416 px;
  - tableta: entre 288 y 320 px;
  - móvil: entre 224 y 260 px.
- Opacidad adaptada a cada superficie:
  - inicio: 0,060 en reposo y 0,105 iluminado;
  - perfil: 0,050 en reposo y 0,085 iluminado;
  - servicios: 0,025 en reposo y 0,042 iluminado.
- El halo usa un radio aproximado de 64 a 80 px y una transición lenta para evitar cambios bruscos.
- En móvil se conserva solamente la pátina tenue de reposo.
- En impresión y modo de colores forzados se oculta la decoración.
- Con movimiento reducido se desactiva la iluminación animada.

## Archivos principales modificados

- `app/components/SyntheticFiligree.tsx`: superficie decorativa única e interacción con el puntero.
- `app/public-site.css`: cobertura completa, escalas, opacidades, halo y modos alternativos.
- `tests/synthetic-preview.test.ts`: contrato automatizado del mosaico y sus límites de accesibilidad.
- `assets/brand/README.md`: documentación del recurso visual y sus derivados.
- `design-qa.md`: evidencia y cierre de control visual.
- `scripts/create-filigree-full-background-comparison.ts`: generación de comparativas de revisión.

El archivo maestro preservado es `assets/brand/filigree-mosaic-source-v04.png`. La aplicación sirve su derivado optimizado desde `/preview-local-sintetico/decor-media/border-filigree`.

## Evidencia de revisión

Las capturas y comparativas de esta etapa están en `output/audit-20260831-full-background-mosaic/`. Entre las evidencias principales se encuentran:

- `final-home-rest-1280x720.png`;
- `final-home-hover-1280x720.png`;
- `profile-sofia-rest-1280x720.png`;
- `final-services-rest-1280x720.png`;
- `final-services-hover-1280x720.png`;
- `home-mobile-pass2-390x844.png`;
- `comparison-before-after-full-background.png`.

Comprobaciones realizadas:

- prueba enfocada del preview: 14 de 14 aprobadas;
- verificación integral `pnpm run release:verify`: aprobada;
- pruebas automatizadas: 205 de 205 aprobadas;
- cinco compilaciones Vinext: aprobadas;
- desbordamiento horizontal: 0 px en escritorio y móvil;
- errores y advertencias visibles de consola: 0;
- la capa decorativa usa `pointer-events: none` y los controles permanecen operables;
- revisión multilingüe técnica para español, inglés, francés e italiano: `PASS_WITH_LIMITS`; la revisión lingüística humana sigue pendiente.

El resultado local no constituye por sí solo publicación, aceptación del cliente, certificación legal ni validación de producción. La activación de producción permanece en `false`.

## Cómo visualizarlo localmente

1. Abre PowerShell en la carpeta raíz del proyecto.
2. Instala las dependencias si todavía no existen:

   ```powershell
   pnpm install
   ```

3. Inicia el preview:

   ```powershell
   pnpm run dev:preview
   ```

4. Abre esta dirección:

   `http://localhost:3000/preview-local-sintetico?lang=es#inicio`

Si el puerto 3000 está ocupado, revisa en la terminal la dirección alternativa que muestre el servidor.

## Cómo subir estos cambios a GitHub

1. Revisa el árbol de trabajo antes de agregar archivos:

   ```powershell
   git status
   git diff --check
   ```

2. Agrega únicamente los archivos de la familia del mosaico. Este comando evita incorporar las carpetas `output/audit-*` y otros cambios ajenos por accidente:

   ```powershell
   git add -- `
     "app/(legacy)/preview-local-sintetico" `
     "app/components/SyntheticFiligree.tsx" `
     "app/public-site.css" `
     "assets/brand/README.md" `
     "assets/brand/filigree-*.png" `
     "assets/synthetic-decor" `
     "design-qa.md" `
     "docs/ULTIMOS_CAMBIOS_MOSAICO_FONDO_COMPLETO_2026-08-31.md" `
     "lib/media/sharp-compat.d.ts" `
     "lib/preview/synthetic-decor-media.ts" `
     "package.json" `
     "scripts/create-filigree-*.ts" `
     "scripts/prepare-brand-filigree.ts" `
     "scripts/production-holding-smoke.ts" `
     "scripts/vite-local-synthetic-media.ts" `
     "tests/container-release.test.ts" `
     "tests/synthetic-preview.test.ts"
   ```

3. Comprueba exactamente qué quedará en el commit:

   ```powershell
   git diff --cached --stat
   git diff --cached
   ```

   Si aparece un archivo no deseado, retíralo del área preparada sin borrar su contenido local:

   ```powershell
   git restore --staged -- RUTA_DEL_ARCHIVO
   ```

4. Crea el commit solamente después de revisar el diff preparado:

   ```powershell
   git commit -m "Extiende el mosaico al fondo completo del preview sintético"
   ```

5. Confirma la rama actual:

   ```powershell
   git branch --show-current
   ```

6. Sube esa rama al repositorio remoto:

   ```powershell
   git push origin NOMBRE_DE_LA_RAMA
   ```

Sustituye `NOMBRE_DE_LA_RAMA` por el valor mostrado en el paso anterior. No subas archivos `.env`, credenciales, copias privadas, datos reales del CMS ni información personal. Para la explicación completa de GitHub y EasyPanel, consulta `SUBIR_PROYECTO.md`.

## Integridad técnica registrada

- SBOM: 612 componentes.
- SHA-256 del SBOM: `eed711e182d232e86fcdc167fa1b796fa01da3e5538da3438569399633637075`.
- SHA-256 del artefacto worker: `3a7f8dbcdf5a1692d60040c937bb194c6829fdee8f16179e9d0dad9af3b78de5`.
- SHA-256 del artefacto standalone: `e0ca36b22094d813a768cf2dc303bd96d5520f4db366469a496cf465d99a81ba`.
- Violaciones detectadas en ambos artefactos: 0.

## Estado de entrega

Esta etapa queda documentada localmente. El archivo ZIP de entrega generado junto con este documento contiene el código fuente sanitizado, este registro de cambios, el inventario interno y las instrucciones fáciles de publicación. No incluye dependencias instaladas, compilaciones temporales, evidencias pesadas de auditoría, otros ZIP, secretos ni datos privados.
