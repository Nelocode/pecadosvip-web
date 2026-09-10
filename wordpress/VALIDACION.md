# Verificación de WordPress editable — 4 de septiembre de 2026

Base del proyecto: `Nelocode/pecadosvip`, commit `f12dafcd7b800e16fb36efcc8b85f5e6c9a71dd0`.

Esta etapa sustituye el frontend de fragmentos HTML exportados por un plugin editorial y un tema nativo PHP. Los resultados del tema anterior no acreditan esta implementación nueva.

## Alcance implementado

- Plugin con perfiles, servicios, ciudades y páginas nativas de WordPress; editor de bloques, extractos, imágenes, galerías, orden, borradores, revisiones y metadatos.
- Ajustes de textos e imágenes generales separados para español, inglés, francés e italiano.
- Importación inicial idempotente por lotes: 224 registros y recursos multimedia locales. No reemplaza ediciones anteriores.
- Tema que consulta WordPress dinámicamente, en lugar de cargar fragmentos de un build anterior.
- Aplicación y backend originales conservados; solo se excluye `wordpress/` de su TypeScript y ESLint.

## Evidencia de pruebas

Comprobaciones ejecutadas sobre la implementación nativa:

- `npm run build`: PASS; genera tema y plugin separados, sin React ni fragmentos HTML precalculados.
- `npm run verify`: PASS_STATIC; 224 identidades únicas, 6 perfiles + 34 servicios + 8 ciudades + 8 páginas por idioma.
- 72 recursos visuales: archivos, tamaños y SHA-256 verificados; 69 imágenes únicas referenciadas por el contenido inicial y ajustes.
- 103 rutas de texto literales de la plantilla tienen valores editables en los cuatro idiomas.
- Comparación del código fuente del tema/plugin con la distribución y huellas de entradas de generación: PASS.
- Sintaxis JavaScript de frontend, panel y ayudantes QA: PASS.
- Configuraciones Docker Compose de raíz y subcarpeta: PASS (`config --quiet`).
- Revisión del código corrigió enlaces de páginas nuevas, campos omitidos, doble evaluación del contenido, rutas duplicadas, ajustes heredados sin uso y copias históricas de fichas en la respuesta pública.
- Aislamiento: `git diff` confirma que no se modificaron archivos de la aplicación/backend. Los dos cambios de configuración excluyen `wordpress/` del TypeScript y ESLint originales.

El empaquetador vuelve a ejecutar la verificación estática antes de crear los ZIP. Luego abre cada archivo, comprueba la lectura de todas sus entradas, nombres únicos, rutas seguras y archivos instalables obligatorios, y devuelve sus hashes SHA-256. Estos controles no prueban la activación en WordPress.

`npm run typecheck` del proyecto original se intentó y no pudo ejecutarse: esta copia descargada no tiene instaladas sus dependencias y no encuentra `tsc`. No se reporta como prueba superada ni se instalaron dependencias de la aplicación original para cambiarla durante esta conversión.

## Bloqueo de pruebas reales

Docker Desktop 4.89.0 quedó instalado con autorización; su cliente responde Docker 29.7.2. El motor Linux falla durante el arranque al intentar renombrar el archivo de comunicación `AppData/Local/Docker/run/dockerInference`. Windows devuelve error 1920, «El sistema no tiene acceso al archivo». Se verificaron los atributos ReparsePoint/no directorio; su tipo y destino no pudieron inspeccionarse. Un intento de renombrado recuperable del archivo exacto también fue denegado. No se borró ese archivo, no se borraron datos/volúmenes y no se reinició Windows.

`node wordpress/qa/docker.mjs test` se intentó: termina con código 1 antes de crear el entorno porque falta el pipe `dockerDesktopLinuxEngine` y no puede contactar al motor. No se usó XAMPP ni un runtime alternativo de PHP.

Por tanto, permanecen **NO EJECUTADOS**: sintaxis PHP en contenedor, activación del tema/plugin, importación en base de datos, pruebas de guardar/refrescar, nonces y permisos en WordPress real, navegación HTTP en cuatro idiomas, revisión visual/móvil y escenario de subcarpeta. Los scripts están preparados, no certificados por haberse escrito. No se afirma entrega operativa al 100 %.

Para continuar: reparar el inicio de Docker Desktop hasta que `docker info` responda y ejecutar los comandos de `qa/README.md`. Si una reparación requiere permisos adicionales o reiniciar Windows, debe coordinarse con el usuario antes. Los resultados y secretos locales de `wordpress/output/` no forman parte de la distribución.

## Límites

Subir esta conversión a una rama de GitHub no implica despliegue ni modificación del sitio EasyPanel. No se activaron reservas, pagos, contacto comercial ni indexación de la beta. No existe sincronización bidireccional con el CMS original. El ZIP de código contiene el catálogo inicial, no una base de datos WordPress de producción ni ediciones posteriores del usuario.

---

# Traducción automática no Legacy, botones de contacto y mecánica legal — 10 de septiembre de 2026

Base: `62d4ee4fcf00232d4ea916b4420abb855dff7edd` (main local). Entregable aislado; no
integrado en el checkout compartido, sin commit ni push. Detalle funcional en
`TRADUCCION_CONTACTO_LEGAL.md`.

## Alcance implementado

- Traducción automática de páginas informativas **y perfiles de modelos** no Legacy, en
  lote y sin selección página a página; publicación opcional y revocable.
- Botones de contacto multicanal con destinos vacíos y validados por esquema, más canal
  de reporte accesible antes de cualquier barrera de edad.
- Identificación del prestador (LSSI art. 10), documentos legales por capas, política y
  aviso de cookies con revocación permanente y puerta de acceso de adultos en servidor
  con adaptador verificado.

## Evidencia ejecutada

- `npm run build`: PASS. 224 registros, 72 recursos, `seedSha256`
  `3a1010b0b4030bf24a0f0b9fee0ee41085f31bfda3bb48ef4b228539a8a06637`.
- `npm run verify`: **PASS_STATIC**. 166 rutas de texto editables con valor en es/en/fr/it
  (antes 103), paridad de origen y distribución, sintaxis JS, contratos del plugin y del
  tema, contratos de contacto/legal/acceso adulto y equilibrio de delimitadores PHP.
- Comprobación de producción del hueco que cierra la traducción: `/es/perfiles/maria`
  200, `/en/perfiles` 200 con «No profiles match this selection.», `/en/perfiles/maria`
  404. Observado el 10/09/2026 por lectura pública de `pecadosvip.com`.
- Revisión estática del código: el módulo de traducción conserva el inventario Legacy
  congelado, nunca reemplaza versiones existentes y no acepta publicación desde el
  navegador; el módulo de contacto no contiene ningún destino real; el gate de adultos no
  lee cookie, parámetro ni autodeclaración; el intake legal aprueba en falso por defecto.

## Pruebas PHP ejecutadas

- `php -l` sobre los **20 archivos PHP** del tema y del plugin, el mismo lint que ejecuta
  `qa/runtime-check.php`: **0 errores**, con PHP 8.3.33 CLI (NTS) x64 en local.
- `tests/selective-translation-test.php`: **PASS**, 66 aserciones.
- `tests/contact-legal-test.php`: **PASS**, 49 aserciones.
- `tests/age-access-test.php`: **PASS**, 31 aserciones.
- `tests/router-test.php`: **PASS**, 49 aserciones; `tests/seo-growth-test.php`: **PASS**,
  62 comprobaciones.
- CI sobre `86925da`: pasos 1–7 correctos, incluidos «Build and verify native theme and
  plugin» y «WordPress, MariaDB, editorial permissions and HTTP QA».

La primera publicación (`baa8206`) **falló el paso 5** y sirvió para encontrar dos
defectos reales en las pruebas nuevas, ya corregidos en `86925da`: la prueba de traducción
medía la publicación de borradores sobre la misma ficha que acababa de dejar retirada la
simulación de carrera —es decir, leía como fallo el comportamiento fail-closed que acababa
de demostrar—, y la de acceso adulto redeclaraba las funciones nativas de PHP
`headers_sent()` y `header()`, lo que abortaba la suite antes de su primera aserción.

## NO EJECUTADO

- La QA Docker completa: el paso 8 «Production containment, real authentication and
  restart persistence» **falla**, pero es una rotura previa y ajena a esta entrega: falla
  igual en `77ea878`, el commit que desactiva la protección pública, porque el QA espera
  el marcador `closed-v1`. Esta entrega no toca `wordpress/protection/` ni el `Dockerfile`.
- No se ejecutó `node qa/docker.mjs test` en local (no hay motor Linux disponible) ni la
  navegación HTTP en los cuatro idiomas contra WordPress real: guardar y refrescar,
  nonces, permisos e importación siguen sin acreditarse en una instalación completa.
- No se ejecutó ninguna traducción real ni ninguna publicación editorial.
- El despliegue de producción lo dispara el push a `main`; su efecto público se comprueba
  por separado y no lo acredita el CI.

## Límites

- No identifica al prestador ni sustituye asesoría jurídica; los datos siguen pendientes.
- No integra un verificador de edad ni protege los archivos originales servidos por el
  servidor web (capa de contención y proxy/CDN).
- No cubre información precontractual, calificación publicitaria, derechos de imagen ni
  consentimiento de las personas de los perfiles.
- Activar la puerta de adultos sin adaptador cierra todo el contenido a visitantes.
