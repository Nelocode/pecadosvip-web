# Marca de agua de los perfiles

El plugin prepara copias de las fotografías y los vídeos asociados a una ficha de modelo con la manzana y el nombre PecadosVip, sin el lema. La marca se sitúa abajo a la derecha, con margen y transparencia. Los originales de la Biblioteca de medios no se sobrescriben.

## Uso por el cliente, una vez desplegado

1. Entra en **PecadosVip → Perfiles** y abre o crea la ficha del idioma correspondiente.
2. Selecciona la **Imagen destacada** y añade las fotografías a **Galería de imágenes**. Para clips utiliza **Vídeos del perfil**.
3. Guarda la ficha. El sistema prepara las copias en segundo plano; el panel muestra si cada archivo está pendiente, en proceso, listo o con error.
4. Vuelve a abrir la ficha para consultar el estado. Revisa la vista previa cuando los medios estén listos y publica el perfil cuando corresponda.
5. Si un archivo continúa pendiente o aparece con error, lee el mensaje junto a su vista previa. Corrige el formato o el tamaño si hace falta, guarda la ficha y pulsa **Reintentar marca de agua**. Después vuelve a abrirla para comprobar el resultado. Las copias que ya estaban listas se conservan.

Si la ficha ya está publicada, guardar puede actualizar lo que ve el visitante. Los archivos pendientes o con error no aparecen en la web hasta que estén listos. En el administrador visual de modelos, **Guardar Cambios** guarda la ficha como publicada; utiliza el editor de WordPress si necesitas trabajar en **Borrador**.

El selector también permite usar archivos ya existentes: se procesan al asociarlos al perfil. Las vistas previas del administrador muestran los archivos originales para que puedas revisarlos; comprueba la marca en la página del perfil cuando el estado sea **listo**. No añadas fotografías o vídeos dentro de la descripción: si aparece un aviso, selecciona esos archivos en sus campos específicos y comprueba el estado de publicación antes de volver a guardar. Las galerías de servicios y las imágenes de ciudades no reciben esta marca automáticamente.

Formatos: fotografías JPG, PNG y WebP; vídeos MP4, MOV y WebM. Las fotos se limitan a 30 MiB y 24 megapíxeles; los vídeos a 128 MiB, tres minutos y 17 megapíxeles por fotograma. Las copias públicas tienen un lado máximo de 2560 px para fotografía y 1920 px para vídeo. El vídeo se entrega como MP4 H.264/AAC, conservando audio cuando lo tiene, con un póster marcado.

## Funcionamiento

- `includes/media-watermark.php` encola medios únicamente de `pv_profile` mediante los guardados de WordPress, Gutenberg/REST y el administrador de modelos.
- WP-Cron procesa los trabajos fuera de la petición de subida. Necesita que el cron de WordPress funcione: se ejecuta con visitas posteriores o mediante el cron del alojamiento. No depende del build Node.
- El procesamiento usa GD y FFmpeg/FFprobe. Un bloqueo sobre el almacenamiento compartido evita varios procesadores pesados simultáneos; los errores se reintentan de forma limitada.
- Las copias se crean en una zona temporal y se publican tras completar el procesamiento. Se marca el tamaño completo y cada miniatura después de recortar, para que la marca no desaparezca de los tamaños adaptables.
- Se conserva la identidad del original y una huella de la marca para evitar acumular marcas al volver a guardar. El tema usa únicamente derivados listos; un archivo pendiente o fallido no se sustituye por su original en el catálogo.
- Los originales siguen siendo adjuntos normales de WordPress. Esta función añade la marca a las copias mostradas en perfiles; no convierte el almacenamiento de originales en un repositorio privado.

## Despliegue y comprobación

Los cambios del plugin, tema y Dockerfile deben incorporarse al repositorio oficial y desplegarse por el flujo GitOps. No instalar una copia manual encima del contenedor: un despliegue posterior sincroniza de nuevo los archivos del repositorio.

El Dockerfile incluye FFmpeg/FFprobe y verifica GD/EXIF. El target `runtime` también se usa en Docker Compose de QA. Los volúmenes de WordPress y base de datos conservan medios y registros. El límite del proxy del alojamiento debe permitir el tamaño de subida elegido.

Antes de activar en producción, ejecutar una subida de foto y vídeo de prueba en WordPress real y verificar el guardado en ambos administradores, el cambio de estados, las miniaturas, la reproducción, la conservación del original y un reinicio con los volúmenes persistentes. No reimportar ni restaurar los perfiles retirados para esta prueba.

Pruebas locales de código y procesamiento:

```powershell
php wordpress/tests/profile-media-contract-test.php
php wordpress/tests/media-watermark-test.php
cd wordpress
npm run build
npm run verify
```

Estas pruebas no sustituyen la comprobación de WordPress y del contenedor desplegado.
