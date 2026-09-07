# PecadosVip · Contenido editable

Plugin independiente del tema. Guarda perfiles, servicios, ciudades y páginas como contenidos nativos WordPress, con editor visual, imagen destacada, revisiones, borrador y publicación por idioma. Las galerías usan la biblioteca de medios con orden por arrastre o botones accesibles.

1. Instala y activa el ZIP del plugin desde **Plugins → Añadir plugin → Subir plugin**.
2. Activa el tema PecadosVip.
3. Abre **PecadosVip → Importar contenido inicial**. El proceso trabaja por lotes y se puede repetir: no reemplaza contenidos o ajustes existentes, ni recupera elementos que ya moviste a la papelera.
4. Edita las fichas desde el menú PecadosVip; usa **Textos y diseño** para cambiar idioma, cabecera, navegación, botones, pie e imágenes generales.
5. Pulsa **Actualizar**: la web lee WordPress en cada petición, sin volver a compilar. La caché de WordPress se invalida al editar; si instalas una caché externa, configura su purga para estos tipos de contenido.

Los datos sobreviven al cambiar/desactivar el tema. El plugin no elimina contenido al desactivarlo. Este plugin gestiona la presentación de la web; no conecta, escribe ni altera el backend de negocio original.

## Contrato para el tema

- `pvc_records('profile'|'service'|'city'|'page', 'es'|'en'|'fr'|'it')`: solo publicados; sin borradores, privados ni programados.
- `pvc_record($type, $locale, $key)`: un registro o `null`.
- Cada registro: `id`, `key`, `locale`, `title`, `content` HTML filtrado por WordPress, `excerpt`, `order`, `image`, `gallery`, `data`.
- `image` y cada elemento de `gallery`: `id`, `url`, `alt`, `width`, `height`.
- `pvc_copy($locale)`: textos anidados del idioma, combinando valores iniciales y ediciones guardadas.
- `pvc_site($locale)`: `copy.site`, con `logo`, `hero`, `mosaic` e `icon` convertidos de IDs a imágenes.
- `pvc_media($attachment_id)`: una imagen o `null`.
- `pvc_revision()`: generación de contenido; cambia al editar fichas, metadatos, imágenes o textos.
- `pvc_preview_record($locale, $type, $key)`: solo para un usuario con permiso de edición y enlace de vista previa con nonce.
- `pvc_import_seed($path, $offset = 0, $limit = 0)`: importa el `content/seed.json` del tema activo; requiere administrador y devuelve contadores o `WP_Error`.

Lectura pública: `GET /wp-json/pecadosvip/v1/catalog?lang=es`. Escrituras: REST nativa WordPress `/wp-json/wp/v2/pecadosvip-profile`, `pecadosvip-service`, `pecadosvip-city` y `pecadosvip-page`, con autenticación y permisos. Las peticiones desde el navegador requieren el nonce REST de WordPress. No hay endpoint público de escritura.

Documentación técnica empleada: [register_post_type](https://developer.wordpress.org/reference/functions/register_post_type/), [register_meta y esquemas REST](https://developer.wordpress.org/reference/functions/register_meta/), [metaboxes](https://developer.wordpress.org/reference/functions/add_meta_box/) y [biblioteca multimedia](https://developer.wordpress.org/reference/functions/wp_enqueue_media/).
