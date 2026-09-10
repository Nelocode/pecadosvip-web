# Plan SEO proactivo

Acceso: **PecadosVip → Plan SEO proactivo**. Solo administradores.

La integración 1.3.0 limita metadatos, sitemap, objetivos y oportunidades a páginas informativas `pv_page` de tipo `information/about/contact/legal`. No optimiza la difusión de perfiles, servicios, ciudades comerciales ni catálogos. El diagnóstico técnico sigue disponible; el cierre público, si está instalado, bloquea cualquier habilitación de indexación desde SEO.

El objetivo sugerido es una **posición media de 3 o mejor**, medida para una consulta, página, país y dispositivo concretos. Es una meta de mejora; no garantiza que la web aparezca siempre en el top 3. La ciudad se asocia a su página: Search Console no ofrece una dimensión de ciudad ni una posición local fija.

## Ciclo de trabajo

1. El diagnóstico diario actualiza una lista priorizada de bloqueos técnicos y carencias editoriales. Conserva los estados Pendiente, En revisión y Revisada mientras la evidencia no cambia. Un cambio relevante vuelve a abrir la acción. «Revisada» no significa corrección publicada ni resultado logrado.
2. Cuando se conecta Search Console, cada hora consulta el objetivo menos recientemente intentado, con máximo 12 objetivos. Un turno diario se utiliza para descubrir consultas reales de páginas elegibles en España. Con 12 objetivos, una vuelta tarda aproximadamente 13 horas si el cron funciona.
3. Compara períodos consecutivos de 28 días, terminando tres días antes de la fecha actual en America/Los_Angeles, usando `dataState=final`, búsqueda web y agregación por página. Los períodos completos no se confunden con datos del día actual.
4. Prioriza caídas de al menos dos posiciones medias o más del 30% de clics, con mínimos de evidencia. También identifica caída de CTR con posición parecida, consultas próximas al objetivo y metas alcanzadas que conviene vigilar.
5. Cada propuesta explica la evidencia y enlaza al editor. Se muestran hasta 50 prioridades y se conserva el diagnóstico completo. Las propuestas no cambian textos, publican anuncios, activan indexación ni amplían destinos de traducción.

La comparación utiliza al menos 30 impresiones por período; el aviso de clics necesita al menos 10 clics previos. Son umbrales operativos ajustables en código, no pruebas estadísticas. Las variaciones observadas no demuestran causalidad. Consultas omitidas por Google o muestras pequeñas se tratan como información insuficiente, nunca como posición cero o pérdida de toda la visibilidad.

## Descubrimiento de oportunidades

Se inspeccionan hasta 500 filas devueltas por Google para consultas/páginas en España, todos los dispositivos y el período actual. La API prioriza filas por clics y no garantiza entregar todas las búsquedas. El módulo retiene hasta 20 oportunidades con al menos 30 impresiones y posición media mayor que 3 y menor o igual a 20, ordenadas por impresiones.

Solo admite URLs de fichas publicadas, elegibles y presentes en el inventario de esta web. Ofrece incorporarlas al seguimiento después de revisar su pertinencia. No inventa búsquedas, no analiza toda la competencia y no calcula demanda total del nicho a partir de esta muestra.

## Conexión preparada, todavía no configurada

El usuario indicó que desconoce si la propiedad está verificada y pidió **dejar preparada la conexión**. No se han creado cuentas, solicitado credenciales, realizado consultas con datos reales ni activado sincronización.

Para el responsable técnico cuando se autorice la configuración:

1. Confirmar la propiedad `sc-domain:pecadosvip.com` o la URL exacta de esta instalación con `/` final. El módulo solo acepta una propiedad que coincida con su dominio o URL; no debe heredar la conexión de otro dominio.
2. Habilitar Search Console API en un proyecto Google y utilizar un cliente OAuth autorizado con el alcance mínimo `https://www.googleapis.com/auth/webmasters.readonly`. Completar el consentimiento del propietario por el flujo oficial con acceso offline para obtener un refresh token. La entrega contiene el consumidor de ese token, no una pantalla de consentimiento OAuth ni un asistente de verificación de propiedad.
3. Configurar como secretos del alojamiento `PVC_SEO_GSC_CLIENT_ID`, `PVC_SEO_GSC_CLIENT_SECRET` y `PVC_SEO_GSC_REFRESH_TOKEN`. No ponerlos en Git, archivos públicos, capturas, conversaciones ni campos de WordPress. No imprimirlos en registros.
4. En el panel, guardar la propiedad y habilitar sincronización. «Credenciales presentes» no prueba que Google acepte el acceso. Ejecutar «Consultar siguiente objetivo» con una página elegible y comprobar una respuesta real, sus períodos y su URL.
5. Verificar el evento `pvc_growth_sync` en WP-Cron y el evento de auditoría `pvc_seo_daily_audit`. Si WP-Cron está desactivado, el cron externo debe ejecutar los eventos vencidos. En la configuración local del proyecto WP-Cron está desactivado.

La conexión solo consulta analítica; no envía sitemaps, cambia propiedades, crea anuncios ni solicita indexación a Google. El endpoint OAuth y Search Analytics usan HTTPS con verificación TLS, sin redirecciones, y tiempos máximos de 8 segundos por petición. El token de acceso se mantiene solo en memoria durante el intento. Un fallo conserva la última medición fechada y muestra un error sin copiar la respuesta sensible de Google.

## Estados, retención y recuperación

- Las mediciones mayores de tres días o asociadas a otra propiedad/URL se consideran desactualizadas para priorizar acciones. El panel conserva su fecha y no las presenta como una nueva consulta exitosa.
- Se guarda un máximo de 12 cortes históricos por objetivo, deduplicados por fecha de cierre. Las ventanas móviles se solapan entre cortes, por lo que no son experimentos independientes.
- «Retirar objetivo y su historial» elimina esa configuración y sus mediciones del módulo; no modifica la página ni Search Console.
- Los avisos son privados y visibles en el panel. No se envían correos ni mensajes externos.
- Un bloqueo evita trabajadores simultáneos. Si un proceso se interrumpe, un administrador puede liberar el bloqueo después de cinco minutos; no se roba automáticamente. Los próximos objetivos esperan mientras exista ese bloqueo.
- Pausar sincronización elimina su evento horario. Desactivar el plugin elimina los eventos del módulo.

## Alcance de esta entrega

Integración local en `main` a partir de la entrega SEO y de `3a97132`, que contiene la adaptación de traducción a borradores informativos. La petición «Implementemosla» autoriza esta integración SEO; Google se conserva preparado y desactivado. Publicación y prueba real de WordPress deben acreditarse aparte. Los cambios protectores ajenos en Dockerfile y wordpress/protection no forman parte del commit SEO. Se conservan los bloqueos de indexación; una barrera de edad no constituye validación para ampliar difusión.

Pruebas reproducibles: `php tests/seo-growth-test.php` (incluye SEO base), `php tests/router-test.php`, `npm run build` y `npm run verify`. Las pruebas de Google utilizan respuestas simuladas; no acreditan OAuth, datos reales, WordPress completo ni cron de producción. El flujo `node qa/docker.mjs test` incorpora además el contrato de WordPress real cuando Docker esté disponible.

Fuentes oficiales: [Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query), [comparación de períodos](https://support.google.com/webmasters/answer/17011165?hl=es), [dimensiones](https://support.google.com/webmasters/answer/17011259?hl=es).
