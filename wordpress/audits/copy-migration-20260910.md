# Migración de copia editable — 2026-09-10

Base de trabajo: `f939b926c64b358a57116335719383d640dd57a0` de `main` en `Nelocode/pecadosvip-web`.

## Cambio

El plugin pasa a `1.3.1`. La conciliación con upstream `1877a41ce34cc41579c9671f7104219b2b59f26e` conserva también la migración por build incorporada en `862d314`. `pvc_maybe_upgrade_copy()` compara `pvc_copy_applied_version` con `PVC_VERSION` y `pvc_copy_stamp` con `manifest.seedSha256`. Si alguno difiere, lee el seed del tema activo, verifica el hash de esos mismos bytes y su esquema, y fusiona sus textos con `pvc_copy_seed` mediante `pvc_import_copy()`. Se guardan datos, stamp y versión, en ese orden. Una copia inexistente, vacía o malformada requiere la importación explícita, como establece upstream.

Se conserva cada valor existente, incluyendo cadena vacía, cero, falso, IDs de medios y ramas que el administrador haya sustituido por un valor escalar. El valor `null` mantiene la semántica existente de `pvc_import_copy()`: equivale a valor ausente. No se escriben las opciones editoriales `pvc_copy_es/en/fr/it`, registros de contenido, ajustes de publicación ni inventario Legacy. Los formularios editoriales guardan en las opciones por idioma, por lo que una edición concurrente en esos formularios no es sobrescrita por esta migración de defaults. Los hooks existentes de opciones `pvc_copy_*` también invalidan `pvc_revision` al guardar; las tres escrituras observadas por la simulación son las llamadas directas, no el total de SQL real.

## Momento y coste

El enganche es `after_setup_theme`, prioridad 20: WordPress ya ha cargado el tema activo y todavía no ha ejecutado `init`, REST ni la plantilla pública. Cubre también la primera visita anónima tras actualizar archivos de un plugin ya activo mediante Docker. No exige capacidades de usuario ni depende de activar de nuevo el plugin o visitar el administrador.

La primera petición de una versión o build nuevo asume la lectura y fusión local. El seed está limitado a 8 MiB y el JSON a 64 niveles. Cada petición lee el manifest local, limitado a 16 KiB y 16 niveles, y consulta ambos marcadores; si coinciden, no lee el seed ni escribe opciones. La verificación de integridad del seed ocurre cuando hay una migración pendiente, no en cada petición. Un archivo defectuoso queda sin marcar y se vuelve a intentar en otra petición; no se escribe un marcador de fallo que impida recuperarse al corregir el archivo dentro de la misma versión.

## Medios y fallos

Antes de llamar al importador se omiten recursivamente las entradas de medios con `path`. Así no se ejecutan búsquedas de adjuntos, hashes, copias, generación de metadatos ni altas en la biblioteca durante la petición pública. Los IDs/valores de medios ya presentes permanecen intactos. Los nuevos medios quedan ausentes, sin introducir un cero que bloquee su importación explícita posterior. Esta rutina migra textos; no inicializa el inventario ni sustituye la importación editorial de medios.

Un manifest ausente o inválido, o un seed ausente, no legible como archivo regular, fuera del tema, demasiado grande, con JSON inválido, hash discordante, versión distinta de `1`, o sin copia no vacía para los cuatro idiomas no produce escrituras. El manifest exige `schema === 2` y un hash SHA256 hexadecimal de 64 caracteres. Un `WP_Error` devuelto por la fusión también aborta antes de escribir. Un fallo al guardar los datos no marca el build ni la versión como aplicados. Si falla un marcador, los datos ya fusionados permanecen y el siguiente intento completa los marcadores sin reescribirlos. Las advertencias de lectura del sistema de archivos no se envían a la respuesta pública.

No es una transacción entre las tres opciones ni un bloqueo general de escritores de `pvc_copy_seed`: una importación explícita simultánea requiere coordinación. Los nuevos controles de medios ausentes tampoco se crean en «Textos y diseño» hasta que un flujo explícito los incorpore.

## Pruebas y reproducción

La suite usa archivos temporales reales y un almacén de opciones de WordPress simulado; incluye el importador real. No usa una base de datos ni bootstrap de WordPress. Las funciones de capacidades y búsqueda de medios hacen fallar la prueba si se invocan. También observa todos los intentos de escritura de opciones.

Desde la raíz del clon, con PHP 8.3.33 disponible en `PATH`:

```powershell
php -l wordpress/plugin/pecadosvip-content/includes/copy-upgrade.php
php wordpress/tests/copy-upgrade-test.php
npm --prefix wordpress run build
npm --prefix wordpress run verify
php wordpress/tests/copy-upgrade-test.php wordpress/dist/pecadosvip/content/seed.json
```

El acceso directo también está registrado como `npm --prefix wordpress run test:copy-upgrade`. `wordpress/qa/docker.mjs test` lo incluye en el grupo de contratos PHP sin bootstrap, mediante el volumen `/theme-tests`, igual que las suites existentes.

La prueba elimina `contact` y `legal` de una base anterior en los cuatro idiomas, introduce un pie personalizado y un override de idioma, ejecuta la migración y verifica tanto los grupos completos como la edición preservada y la segunda ejecución sin cambios. Cubre además medios anidados, nuevo build sin cambiar la versión, cambio de versión sin cambiar el build, error de fusión, fallos independientes de datos/stamp/versión y distintos seeds y manifests inválidos. Los hashes de los fixtures proceden de sus bytes exactos. El argumento opcional repite el escenario con el seed real construido.

La suite incluye ausencia, directorio en vez de fichero y bytes/JSON ilegibles. Además lanza un proceso PHP aislado con `-d disable_functions=file_get_contents`: sobre archivos regulares reales que pasan los precontroles, simula por separado el fallo de lectura del manifest y del seed, comprueba que realmente se intentó leer cada archivo y demuestra cero escrituras. Usa una copia almacenada no vacía para alcanzar esas ramas. No es una prueba de denegación ACL real ni de concurrencia en WordPress.

La validación es local: no ejecuta contenedores, migraciones de producción, importaciones de registros ni red en tiempo de ejecución. Tras la entrega original, el usuario autorizó el push a `main`; esta revisión concilia los nuevos commits remotos sin sobrescribirlos. Un push o build estático no demuestra una imagen Docker construida ni la migración ejecutada en producción. Se conservan los helpers públicos añadidos por upstream, con un solo enganche automático en `after_setup_theme:20`.

## Ajuste del cargador de una suite existente

La ejecución adicional de `profile-media-contract-test.php` falló al resolver `includes/localized-records.php` desde el directorio de pruebas: el corte de `eval()` asumía que watermark era el primer módulo. Se reprodujo el mismo fallo sobre un `git archive` de la base `f939b926c64b358a57116335719383d640dd57a0`, antes de esta migración. El cargador ahora corta en el primer `require_once PVC_DIR . '/includes/`, manteniendo las funciones reales del núcleo y los mocks de módulos que la suite ya utilizaba. No se retiró ninguna aserción. Resultado posterior: `PASS: 54 profile media contract assertions.`
