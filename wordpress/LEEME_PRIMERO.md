# PecadosVip — WordPress editable

Esta versión cambia el frontend exportado por un tema PHP nativo y un plugin de contenidos. Después de la importación inicial, WordPress guarda los textos, fichas, imágenes y ajustes en su propia base de datos. Al pulsar **Actualizar**, la siguiente visita lee los cambios sin compilar ni publicar código.

La aplicación y el backend originales se conservan. No hay sincronización automática ni bidireccional con el CMS anterior: WordPress pasa a ser la fuente editorial de esta nueva presentación. Reservas, pagos y canales de contacto reales permanecen desactivados, como en la beta de origen. Esta entrega no despliega ni reemplaza el sitio de EasyPanel.

## Qué ZIP usar

| Archivo | Para qué sirve |
| --- | --- |
| `pecadosvip-wordpress-contenidos-….zip` | Plugin: crea el panel editable. Se instala en Plugins. |
| `pecadosvip-wordpress-tema-….zip` | Tema: diseño, plantillas y contenido inicial con las imágenes. Se instala en Apariencia. |
| `pecadosvip-proyecto-completo-wordpress-….zip` | Respaldo del código original, conversión, tema, plugin e instrucciones. No se instala como tema. |

## Instalar en una web WordPress

Hazlo primero en una instalación de pruebas, con una copia de seguridad de su base de datos y de `wp-content`.

1. Entra al panel de WordPress: añade `/wp-admin/` a la dirección de tu web.
2. Ve a **Plugins → Añadir plugin → Subir plugin**. Elige el ZIP que contiene `contenidos` en el nombre, instala y activa.
3. Ve a **Apariencia → Temas → Añadir nuevo → Subir tema**. Elige el ZIP que contiene `tema` en el nombre, instala y activa.
4. En **Ajustes → Enlaces permanentes**, selecciona **Nombre de la entrada** y guarda.
5. Abre el menú **PecadosVip**. Pulsa **Importar contenido inicial** y espera al mensaje final. Si se interrumpe, repite: no sobreescribe lo que ya editaste ni restaura elementos enviados a la papelera.
6. Abre tu web terminando la dirección en `/es`. Prueba también `/en`, `/fr` y `/it`.

Requisitos declarados: WordPress 6.6 o posterior, PHP 8.0 o posterior. Las versiones concretas usadas para comprobar compatibilidad aparecen en `qa/README.md` y los resultados realmente ejecutados en `VALIDACION.md`.

Si el hosting rechaza el tamaño del tema, descomprime su ZIP y sube la carpeta `pecadosvip` a `wp-content/themes/` con el administrador de archivos o SFTP. El plugin va a `wp-content/plugins/pecadosvip-content/`. Después actívalos desde el panel. No hace falta Node.js en el hosting.

## Editar sin tocar código

| Quiero cambiar… | Dónde hacerlo |
| --- | --- |
| Nombre, biografía, fotografía, galería, edad adulta, zona o estado de un perfil | **PecadosVip → Perfiles** |
| Nombre, explicación, imagen, grupo u orden de un servicio | **PecadosVip → Servicios** |
| Nombre, imagen, descripción o pertenencia a Madrid/Barcelona de una zona | **PecadosVip → Ciudades** |
| Textos de páginas, legales y bloques añadidos a inicio/catálogos | **PecadosVip → Páginas de la web** |
| Logotipo, imagen de portada, mosaico, marca, botones, navegación o pie | **PecadosVip → Textos y diseño** |
| Orden y destinos de enlaces del menú | **Apariencia → Menús**, con ubicación independiente para cada idioma |
| Archivo, título o texto alternativo de una imagen | **Medios → Biblioteca** |

Pasos habituales:

1. Entra en la sección y selecciona el idioma.
2. Abre la ficha y cambia su título, extracto o contenido en el editor visual de bloques.
3. Para las fotos usa **Imagen destacada** y **Galería**. Puedes añadir, quitar y ordenar con arrastre o flechas. Quitar una foto de una galería no borra su archivo.
4. Guarda como **Borrador** para ocultarla al público; utiliza **Vista previa** para revisarla con tu sesión de editor. Pulsa **Publicar/Actualizar** cuando deba mostrarse.
5. Abre la página para comprobar el resultado. No debes ejecutar `npm` por una edición de contenido.

Los perfiles, servicios y ciudades nuevos también se incorporan a los listados al publicarse. Las fichas tienen una **clave de ruta**: usa minúsculas, números y guiones, por ejemplo `nuevo-perfil`. Mantén esa misma clave en sus cuatro traducciones. Cada idioma es independiente; guardar español no traduce ni modifica inglés, francés o italiano. Las traducciones iniciales requieren revisión editorial humana antes del uso comercial.

En **Textos y diseño**, elige primero el idioma y la sección, pulsa **Abrir sección**, edita y luego **Guardar cambios de esta sección**. Si asignas un menú propio en **Apariencia → Menús**, sus nombres y enlaces se editan allí y sustituyen el menú predeterminado de ese idioma. El diseño general sigue en las plantillas del tema; no es Elementor ni un constructor que permita arrastrar cualquier pieza de la plantilla. Los contenidos de páginas sí permiten bloques nativos de WordPress.

## Probar localmente con Docker

Docker Desktop debe estar instalado, abierto y con el motor Linux listo. No se usa XAMPP.

Dentro de la carpeta principal descomprimida, abre PowerShell y ejecuta:

```powershell
node wordpress/qa/docker.mjs up
```

Visita `http://127.0.0.1:8088/es`. El panel está en `http://127.0.0.1:8088/wp-admin/`. Consulta `qa/README.md` para el usuario local, la ubicación privada de la contraseña, las pruebas de edición y la instalación alternativa en subcarpeta.

Para detener los contenedores sin borrar los datos:

```powershell
node wordpress/qa/docker.mjs down
```

No elimines los volúmenes de Docker si quieres conservar tus ediciones locales. Este entorno solo escucha en el equipo local; no publica tu web en Internet.

## Qué conserva el respaldo

El ZIP completo incluye código fuente, imágenes de origen necesarias, plugin, tema generado, contenido inicial, configuración Docker e instrucciones. Excluye dependencias descargables, `.git`, secretos, datos privados del CMS anterior, resultados temporales y ZIP antiguos.

Importante: los cambios realizados dentro de un WordPress ya instalado viven en **su base de datos y `wp-content/uploads/`**, no en el ZIP de código. Para trasladar esa web con todas sus ediciones, guarda/exporta también la base de datos y `wp-content` desde el hosting o una herramienta de copias de WordPress. El contenido inicial del tema no es una copia de seguridad de esas ediciones posteriores. La exportación de **Herramientas → Exportar** sirve para contenido editorial, pero por sí sola no respalda todos los ajustes ni los archivos físicos.

## Actualizar el código y generar nuevos ZIP

Solo para cambios de programación o de la plantilla. Necesitas Node.js 22.13 o posterior. Dentro de `wordpress`:

```powershell
npm ci
npm run build
npm run verify
npm run package
```

Los tres ZIP nuevos quedan en `stage-archives`, junto a la carpeta `wordpress`. Reinstalar el tema o repetir la importación no sustituye los contenidos existentes; estos siguen perteneciendo a WordPress. Para cambios de estructura del plugin, prueba primero en una copia de la web.

## Subir el proyecto a GitHub

1. Descomprime el ZIP completo en una carpeta nueva.
2. Abre GitHub Desktop y elige **File → Add local repository**; si aún no es repositorio, usa **Create a repository here**.
3. Revisa que no se añadan contraseñas, `.env`, copias de bases de datos ni archivos privados.
4. Crea el commit y pulsa **Publish repository**, eligiendo la visibilidad apropiada.

Para continuar en el repositorio existente, usa una rama de trabajo y aplica los cambios de `wordpress/` más las exclusiones de esa carpeta en `tsconfig.json` y `eslint.config.mjs`. No sobreescribas cambios ajenos sin revisar. Subir a GitHub no activa automáticamente WordPress en EasyPanel: el servicio actual debe mantenerse hasta preparar y autorizar la migración del hosting.

## Volver al tema anterior

En **Apariencia → Temas**, activa el tema previo. Los datos del plugin y los archivos multimedia permanecen en WordPress. No se modifica ni elimina el backend original. Antes de desactivar el plugin, recuerda que la presentación de PecadosVip depende de él para leer los contenidos.

## Referencias técnicas

Se utilizan [tipos de contenido de WordPress](https://developer.wordpress.org/reference/functions/register_post_type/), [metadatos registrados](https://developer.wordpress.org/reference/functions/register_meta/) y [autenticación REST nativa](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/). La lectura pública solo ofrece registros publicados, no privados ni protegidos por contraseña. La API no concede escrituras anónimas.
