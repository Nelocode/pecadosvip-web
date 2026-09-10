# SEO automático de PecadosVip

Dentro del administrador de la web: **PecadosVip → SEO automático**. Solo los administradores pueden ver el diagnóstico y cambiar la indexación. Los editores autorizados pueden ajustar el SEO de sus fichas.

La optimización y el sitemap están limitados a páginas informativas `pv_page` de tipo `information/about/contact/legal`. Perfiles, servicios, ciudades comerciales y catálogos quedan fuera. El diagnóstico técnico puede inventariarlos, pero no genera acciones de difusión para ellos. Si está instalado el cierre público `pvp_guard_request`, el módulo bloquea su propia indexación incluso si un administrador marca la opción.

## Qué hace automáticamente

- Proyecta títulos y descripciones desde el contenido publicado en cada idioma. Respeta los campos SEO manuales; vaciarlos recupera el modo automático. No modifica el texto editorial ni inventa ubicaciones, servicios, reseñas o posiciones.
- Emite un canonical sin filtros ni seguimiento, Open Graph, clasificación de contenido adulto y JSON-LD WebPage. Los alternates hreflang solo enlazan traducciones publicadas elegibles.
- Incorpora las rutas elegibles al sistema paginado de sitemaps de WordPress. Despublicar una ficha, protegerla con contraseña o excluirla del índice la retira de la siguiente respuesta del sitemap.
- Programa un diagnóstico diario con WP-Cron. Comprueba descripciones vacías, títulos largos, metadatos repetidos por idioma, imágenes principales sin texto alternativo, traducciones faltantes y cobertura de ciudades. Permite analizar ahora, filtrar y abrir el editor.
- Señala diagnósticos desactualizados, programación atrasada, WP-Cron desactivado y bloqueos de indexación. Los metadatos públicos y el sitemap se calculan con contenido actual y no dependen del diagnóstico almacenado.

## Activación en el dominio definitivo

1. Instalar por el flujo GitOps el tema y el plugin de esta misma revisión. Hacer QA en WordPress antes del despliegue.
2. Configurar en WordPress la URL definitiva con HTTPS y el entorno `production`. Los dominios temporales `easypanel.host`, direcciones IP y entornos locales permanecen excluidos.
3. Revisar el contenido real y sus ciudades. El contenido marcado como ficticio no es elegible. No retirar esa marca para indexar contenido que siga siendo ficticio.
4. En Ajustes → Lectura, habilitar visibilidad para buscadores. En SEO automático, confirmar la URL exacta de esta instalación y marcar «Habilitar indexación». Una copia de la base de datos a otro dominio no hereda la aprobación de ese dominio.
5. Verificar el HTML y `X-Robots-Tag` de páginas elegibles, filtros, vistas previas y errores. Comprobar `/wp-sitemap.xml`, sus sitemaps PecadosVip y `/robots.txt` con una petición anónima real. Revisar posibles cabeceras o bloqueos añadidos por proxy, CDN o alojamiento: el diagnóstico local no los inspecciona.
6. Verificar la propiedad en Google Search Console y enviar el sitemap. Medir impresiones, clics y posición media por consulta, país y páginas de ciudad. La conexión de solo lectura y el seguimiento proactivo se describen en [SEO_PROACTIVO.md](SEO_PROACTIVO.md); permanecen desactivados hasta configurarse.

WordPress ejecuta WP-Cron cuando recibe tráfico. Si el alojamiento desactiva WP-Cron o se necesita puntualidad, su cron externo debe ejecutar eventos vencidos con WP-CLI. La fecha programada no prueba que se haya ejecutado. Se puede pausar el diagnóstico diario desde el panel. Desactivar el plugin elimina su evento.

El módulo detecta Yoast, Rank Math, All in One SEO y SEOPress, bloquea su propia activación de indexación y omite su bloque de metadatos para evitar gestores duplicados. Elegir un solo gestor y verificar el HTML resultante; no se desactivan plugins automáticamente.

## Límites

Google decide indexación y posición; no existen primeros puestos garantizados. SafeSearch puede restringir la exposición del contenido adulto según las preferencias del usuario. La aplicación automatiza preparación técnica y diagnóstico editorial, no genera páginas masivas, enlaces artificiales, reseñas ni acciones comerciales.

El panel usa «elegible» para las exclusiones locales del contenido. Ese número no significa páginas indexadas. El informe no es un rastreo HTTP, una prueba de rendimiento, una medición de conversiones ni una medición regional de rankings.

## Validación reproducible

Desde `wordpress/`:

```powershell
npm run build
npm run verify
php tests/router-test.php
php tests/seo-test.php
```

PHP CLI debe tener mbstring o las funciones de compatibilidad de WordPress. `seo-test.php` utiliza un adaptador en memoria para comprobar las reglas, renderizado, sitemap, programación, permisos y nonces. No acredita el funcionamiento de una instalación WordPress completa.

Con Docker Linux disponible, utilizar una instalación QA aislada:

```powershell
node qa/docker.mjs test
```

El comando incluye las pruebas SEO en memoria y `seo-runtime.php`. Esta última solo acepta WP-CLI en entorno local, crea una ficha temporal y restaura sus opciones al terminar. No habilita indexación de producción. Completar después la comprobación HTTP de producción descrita arriba.

Referencias: [Guía SEO de Google](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=es), [contenido adulto](https://developers.google.com/search/docs/specialty/explicit/guidelines?hl=es), [políticas contra spam](https://developers.google.com/search/docs/essentials/spam-policies?hl=es).
