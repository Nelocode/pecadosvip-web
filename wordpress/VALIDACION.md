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
