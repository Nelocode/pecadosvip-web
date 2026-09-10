# Protección pública temporal

Estado: implementación local; no activada en producción. No acredita cumplimiento jurídico completo ni verificación de edad.

## Comportamiento
- MU-plugin: pantalla neutra ES/EN/FR/IT y HTTP 503 para solicitudes públicas de WordPress, también REST, feeds y entradas públicas AJAX/admin-post. Sin imágenes, formularios, rastreadores ni confirmación de edad eludible.
- Apache: deniega uploads (incluidos originales y derivados), content/assets/media del tema y extensiones multimedia habituales en el document root. Los archivos originales se conservan. También se bloquean las miniaturas administrativas.
- Se mantiene la autenticación de WordPress y el acceso de editores autenticados. Esa excepción editorial no demuestra mayoría de edad de visitantes.
- Cabeceras no-store y noindex. No eliminan copias que ya estén en CDN, cachés, buscadores, almacenamiento externo o dispositivos.
- Docker instala la configuración y sincroniza solo este MU-plugin al arrancar, incluidos volúmenes persistentes. No existe interruptor público ni cookie para reabrir.

## Validación
65 aserciones PHP y 70 escenarios HTTP: PASS. PHP 8.5.10 y Apache 2.4.68 Win64 reales; autenticación WordPress simulada explícitamente. Se prueban GET/HEAD/POST, enlaces directos, Range, rutas codificadas, ficheros sin extensión, .htaccess permisivo y autodeclaración falsa de edad.

Actualización: Docker recuperado conservando su carpeta de sockets obsoletos como respaldo, sin borrar datos ni volúmenes. Imagen Linux PHP8.3/Apache construida. QA con WordPress7.1 y MariaDB11.4.13:101 escenarios PASS, autenticación real de administrador y suscriptor, bloqueo de medios, originales y MU-plugin conservados tras reinicio. SEO runtime real PASS. CDN y producción se verifican por separado; no confundir QA con despliegue.

Pruebas reproducibles en tests/: definir PVP_PHP (php.exe), PVP_APACHE_HOME (Apache24), PVP_QA_ROOT (directorio vacío local) y PVP_TEST_OUTPUT (directorio de evidencias); ejecutar node tests/verify-local.mjs <raíz-repositorio>. Usan puertos 127.0.0.1:8095 y8096 y datos sintéticos; requieren ambos puertos libres. El fixture no debe publicarse.

## Antes de publicación o reapertura
La publicación de esta versión cerraría temporalmente el sitio público. El usuario autorizó avanzar el cierre temporal el10/09/2026. Se completó QA real; confirmar después el resultado público y las cachés externas. No publicar junto con cambios ajenos pendientes sin revisar el conjunto.
La reapertura requiere una actividad/publicidad jurídicamente revisada, titular identificado, textos definitivos y obligaciones reales de privacidad, consumo, cookies, derechos de imagen y protección de menores. Si procede acceso adulto, verificar edad con minimización de datos y proteger también medios en origen; una casilla18+ no basta para acreditar edad.
Los datos del titular continúan pendientes por instrucción del usuario; reservas/pagos, aunque externos, forman parte del alcance declarado.


## QA Linux reproducible
Construir la imagen production y ejecutar node wordpress/protection/qa-docker.mjs <tag>. Crea WordPress/MariaDB aislados en127.0.0.1:18088, sin semilla comercial ni correos. Usa usuarios y archivos sintéticos; finaliza con compose down, conservando sus volúmenes QA. Evidencia en output/containment-linux. CI ejecuta esta prueba sobre la imagen production construida con `--build-arg PECADOSVIP_CONTAINMENT=closed`, que es la única forma de activar la contención: el valor por defecto (`open`) mantiene el acceso público, porque el sitio ya está en explotación con perfiles publicados. `runtime` se conserva para las regresiones locales anteriores y no es el destino de producción.
