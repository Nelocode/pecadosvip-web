# Pruebas locales con Docker

Este entorno usa WordPress y MariaDB reales en contenedores separados. Requiere Docker Desktop con contenedores Linux, el tema generado en `wordpress/dist/pecadosvip` y el plugin en `wordpress/dist/pecadosvip-content`. Al iniciar activa ambos e importa `content/seed.json` a entradas, ajustes y biblioteca de medios de la base de datos local.

Desde la carpeta principal del proyecto:

```powershell
node wordpress/qa/docker.mjs up
```

Abre `http://127.0.0.1:8088/es`. La administración está en `http://127.0.0.1:8088/wp-admin/`. Usuario local: `pecadosvip_qa`. La contraseña se genera al iniciar y queda únicamente en `wordpress/output/docker-secrets/admin-password.txt`; no se imprime ni se incluye en los ZIP.

Para ejecutar las comprobaciones PHP, de contenido editable, imágenes, permisos y funciones nativas de WordPress:

```powershell
node wordpress/qa/docker.mjs test
node wordpress/qa/docker.mjs test --subdirectory
```

La segunda orden crea otra instalación y otra base de datos, accesible en `http://127.0.0.1:8089/demo/es`. Verifica que las rutas, imágenes y enlaces funcionen cuando WordPress está instalado en una subcarpeta. Los informes quedan en `wordpress/output/docker-http-smoke*.json`.

Las pruebas crean contenido desechable de control y comprueban: nuevas rutas de perfiles, servicios, ciudades y páginas; guardado de títulos y contenido mediante la API que usa el editor; cambio de imagen destacada y galería en la biblioteca de medios; edición de la portada en español, inglés, francés e italiano mediante el formulario administrativo; exclusión de borradores, entradas privadas y protegidas por contraseña; bloqueo de escrituras anónimas y de nonces inválidos. Después verifican que las páginas cambian sin recompilar el tema. Al finalizar restauran los ajustes de texto y eliminan únicamente sus propios contenidos e imágenes de prueba; el contenido importado y la página nativa de control se conservan.

Los recuentos se obtienen de los registros publicados y filtros existentes en WordPress. Las antiguas 652 variantes HTML estáticas no se consideran evidencia de funcionamiento de esta conversión editable.

La inicialización falla si el importador devuelve errores o indica que falta procesar contenido. Las pruebas verifican las 224 identidades iniciales por tipo, idioma y clave, sin confundir contenido adicional con faltantes. También repiten la importación: debe omitir las 224 identidades existentes, crear cero duplicados y conservar tanto un título editado como un texto sobrescrito desde WordPress. Los valores de control se restauran al terminar esa comprobación.

Para detener los entornos conservando sus bases de datos:

```powershell
node wordpress/qa/docker.mjs down
node wordpress/qa/docker.mjs down --subdirectory
```

Las imágenes están fijadas por versión y digest inmutable: WordPress 7.1.0 con PHP 8.3 Apache, WP-CLI 2.12.0 con PHP 8.3 y MariaDB 11.4.13. Sus referencias se verificaron contra el registro oficial de Docker. El contenedor recibe tema y plugin en modo de solo lectura; los contenidos editables se guardan en su volumen de base de datos y las imágenes importadas, en el volumen WordPress. La aplicación original y sus servicios no se montan ni se cambian. Ningún puerto de base de datos se publica y el servidor web escucha solo en `127.0.0.1`.

Fuentes: [imagen oficial WordPress](https://hub.docker.com/_/wordpress), [imagen oficial MariaDB](https://hub.docker.com/_/mariadb), [secretos de Compose](https://docs.docker.com/compose/how-tos/use-secrets/).

## Estado de comprobación del 4 de septiembre de 2026

Docker Desktop 4.89.0 se instaló correctamente; su cliente informa Docker 29.7.2. Node comprobó la sintaxis de los dos ayudantes JavaScript y Docker Compose validó las configuraciones principal y de subdirectorio con `config --quiet`.

Las pruebas PHP, WordPress, HTTP y de edición todavía **no se ejecutaron**. El motor Docker falló al iniciar: no puede renombrar el archivo de comunicación `AppData/Local/Docker/run/dockerInference`, con error 1920 «El sistema no tiene acceso al archivo». El archivo tiene atributo `ReparsePoint`, pero su tipo y destino no pudieron inspeccionarse: `fsutil reparsepoint query` devuelve el mismo error. Se intentó una vez un renombrado recuperable del archivo exacto, tras verificar que no había backend activo; Windows denegó el acceso y el archivo quedó intacto. No se borraron datos de Docker, no se reinició Windows y no se usó XAMPP ni otro runtime de PHP. Antes de ejecutar `test`, Docker Desktop debe mostrar el motor Linux activo y `docker info` debe responder correctamente.

Si falta Docker Desktop, instalar el paquete oficial desde PowerShell y aceptar la confirmación de administrador de Windows:

```powershell
winget install --id Docker.DockerDesktop --exact --source winget --accept-source-agreements --accept-package-agreements
```

Después abrir Docker Desktop, seleccionar contenedores Linux y esperar a que el motor esté listo. Si Windows solicita reiniciar, guardar el trabajo y decidir el momento del reinicio antes de volver a ejecutar las pruebas.
