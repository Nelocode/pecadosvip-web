# Investigación de referencias — PecadosVip Web

Fecha de observación: 2026-08-27. Estado: evidencia de planificación, no autorización de contenido, diseño, cobertura ni publicación.

## Alcance y límites

El archivo fuente enumera tres referencias. `felinabcn.com` pudo observarse públicamente; los dos enlaces abreviados de `share.google` no se resolvieron mediante el acceso seguro disponible. Firecrawl tampoco pudo operar sin autenticación desde esta red. Por tanto, este documento es una observación competitiva de una sola fuente y no un estudio de mercado ni una investigación de volumen de búsqueda.

No se copiarán textos, marcas, logotipos, fotografías, tarifas, perfiles, taxonomías ni afirmaciones del sitio de referencia. La fuente describe también un local físico, mientras PecadosVip exige servicio únicamente en domicilios y hoteles; cualquier contenido de ubicación, instalaciones o visita al local queda fuera de alcance.

## Patrones observados y decisión para PecadosVip

La [portada pública de Felina Barcelona](https://www.felinabcn.com/en) muestra navegación hacia perfiles, servicios y contacto; disponibilidad visible; variantes de idioma; contacto por varios canales; páginas geográficas; y enlaces legales. Su [sección de preguntas frecuentes](https://www.felinabcn.com/en/faqs) usa breadcrumbs, grupos temáticos y consentimiento de cookies, y su [blog](https://www.felinabcn.com/en/blog) crea una capa editorial separada del catálogo.

Esos patrones solo justifican necesidades funcionales generales:

- Navegación clara entre ciudad, listado, ficha, contacto y legal.
- Disponibilidad derivada del CMS, nunca escrita manualmente en varias páginas.
- Breadcrumbs y enlazado interno coherentes.
- Preguntas frecuentes propias y aprobadas para resolver dudas reales.
- Consentimiento y acceso permanente a privacidad/cookies antes de activar analítica.
- Contenido editorial solo si existe responsable, calendario, revisión legal y valor útil.

No justifican copiar la profundidad de páginas, los términos comerciales ni el modelo de local físico.

## Clasificación SEO propuesta

| Familia | Intención | Indexación prevista | Dependencia |
|---|---|---|---|
| `/` | Marca y propuesta general | Sí, tras release | diseño, contenido y dominio aprobados |
| `/{ciudad}` | Servicio real por ciudad | Sí, si la cobertura y el contenido son únicos | cobertura y evidencia local |
| `/{ciudad}/{zona}` | Cobertura local específica | Solo tras investigación y contenido sustancial | demanda, cobertura y texto único |
| `/perfiles` | Descubrimiento y filtrado | Sí, página base | perfiles publicables |
| `/perfiles/{slug}` | Detalle individual | Sí, si el perfil está aprobado | edad, consentimiento, derechos y contenido |
| `/servicios/{slug}` | Explicación de servicio | Condicionada | servicio aprobado y contenido útil |
| `/contacto` | Conversión privada | Sí, si ofrece información suficiente | canales y aviso de privacidad |
| `/legal/*` | Obligaciones e información | Sí o según criterio legal | textos aprobados por responsable |
| filtros y parámetros | Facetas de catálogo | No por defecto | estrategia de canonical y crawl |
| preview/admin/API | Operación interna | Nunca | auth y controles server-side |

Google clasifica como abuso de páginas puerta las páginas regionales muy similares que conducen al mismo destino. Por eso no se crearán las 179 páginas sugeridas sin cobertura, demanda y contenido útil verificables; se priorizará una jerarquía navegable y pequeña. Véanse las [políticas de spam de Google Search](https://developers.google.com/search/docs/essentials/spam-policies?hl=es).

El sitemap deberá contener únicamente URLs absolutas, canónicas, aprobadas e indexables; un sitemap ayuda al descubrimiento, pero no garantiza indexación ni ranking. Véase la [guía oficial de sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=es). Las señales canonicales deben ser coherentes entre HTML, redirects y sitemap según la [guía oficial de canonicalización](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=es).

## Investigación pendiente antes de priorizar ciudades o zonas

1. Confirmar cobertura operativa real, tiempos, restricciones y responsable por ciudad.
2. Obtener datos de demanda de una fuente aprobada y registrar periodo, país, idioma y metodología.
3. Revisar resultados actuales por intención sin asumir que el volumen implica viabilidad.
4. Evaluar solapamiento entre ciudad, zona, servicio y perfil para evitar canibalización.
5. Definir una matriz `ruta → intención → contenido único → perfiles aplicables → CTA → evidencia`.
6. Aprobar la primera cohorte de rutas; el resto permanece fuera del manifiesto y del sitemap.

No se presentan cifras de volumen, dificultad, ranking ni retorno porque no existe una fuente conectada y aprobada que las sustente.

## Privacidad y cookies

La analítica no se activa por imitación de la referencia. La [guía de cookies de la AEPD](https://www.aepd.es/recurso-multimedia/guia-sobre-el-uso-de-las-cookies) exige separar el consentimiento de cookies de otras aceptaciones y mantener la información accesible. La implementación deberá pasar revisión legal propia; este documento no constituye asesoría ni texto legal listo para publicar.
