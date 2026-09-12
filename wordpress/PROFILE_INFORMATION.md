# Espacios informativos editables

En WordPress: **PecadosVip → Bloques del perfil**. Elige español, inglés, francés o italiano.

Dispones de tres bloques independientes con título, texto y botón opcional. Están vacíos y desactivados inicialmente. Se comparten entre todas las páginas individuales del idioma elegido, incluidos los perfiles que crees después; no se añaden a las tarjetas del listado.

1. Escribe el título y el texto. Se conservan los saltos de línea; no se admite HTML.
2. Para añadir un botón, escribe su etiqueta, por ejemplo «LEE NUESTRA GUÍA», y selecciona la página de destino.
3. Marca **Mostrar este bloque** y pulsa **Guardar bloques de este idioma**.
4. Abre una página individual para revisar el resultado. Desmarca el bloque y guarda para ocultarlo sin borrar su contenido.

El selector ofrece las páginas publicadas del mismo idioma que tengan tipo `information`, `about` o `legal`. Puedes prepararlas desde **PecadosVip → Páginas de la web** y publicarlas cuando estén listas. No se crean ni publican páginas automáticamente. Si retiras la página de destino, el botón deja de mostrarse y el texto del bloque permanece.

El botón tiene fondo rosa claro, borde rosa, texto negro en negrita, extremos redondeados y foco visible para navegar con teclado. Los botones sin destino válido no se muestran. Los bloques vacíos no dejan huecos en la web.

Los contenidos de «Textos y diseño», el bloque existente y las páginas existentes se conservan. Estos espacios guardan sus valores en opciones independientes `pvc_profile_information_es/en/fr/it`; no modifican perfiles, semilla, traducciones, medios ni ajustes de contacto. Un administrador guarda cada idioma de forma independiente: este cambio no traduce el texto.

## Comprobación técnica

La suite `php wordpress/tests/profile-information-test.php` verifica opciones y render con funciones de WordPress simuladas y textos neutros. Está incluida en el runner de QA. `npm --prefix wordpress run build` y `npm --prefix wordpress run verify` validan el empaquetado. Las pruebas locales no acreditan un guardado real en la instalación de producción.
