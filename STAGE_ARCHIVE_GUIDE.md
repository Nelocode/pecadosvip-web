# Guía del archivo recurrente de etapa

El script scripts/create-stage-archive.ps1 crea una copia revisable del estado actual sin incluir el historial .git, dependencias, builds, entornos, tokens ni datos locales del CMS. Implementar el script no genera por sí mismo el ZIP definitivo.

## Clasificación y custodia

El ZIP completo es **CONFIDENCIAL**: reúne código, los ocho insumos del cliente y, si existe, la solicitud pegada. Debe almacenarse cifrado, limitarse a personas autorizadas y transmitirse únicamente por un canal cifrado aprobado. No debe subirse como GitHub Release, artefacto de Actions, adjunto público ni enlace de nube abierto.

La ruta predeterminada stage-archives está dentro de este checkout de OneDrive. Tras registrar y comunicar archiveSha256, mueve el ZIP a almacenamiento local cifrado y no sincronizado, recalcula el hash para confirmar que no cambió y elimina la copia de OneDrive según la política aplicable. El script no automatiza ese movimiento ni borrado.

## Crear un archivo

Desde la raíz del repositorio:

    pwsh -NoProfile -File .\scripts\create-stage-archive.ps1 -Stage "75"

El resultado se crea dentro de stage-archives. Para elegir el nombre:

    pwsh -NoProfile -File .\scripts\create-stage-archive.ps1 -Stage "75" -OutputPath "pecadosvip-stage-75-review.zip"

OutputPath puede ser ese nombre simple o una ruta absoluta cuyo padre sea exactamente stage-archives. El script no reemplaza archivos existentes.

El JSON final imprime archiveSha256. Guárdalo y entrégalo al receptor mediante un canal independiente del ZIP. Antes de extraer o ejecutar cualquier archivo, el receptor debe comparar ese valor con:

    Get-FileHash -LiteralPath .\NOMBRE-DEL-ARCHIVO.zip -Algorithm SHA256

El inventario dentro del ZIP comprueba integridad interna, pero no es una firma y no autentica al remitente. Para una entrega con autenticidad criptográfica se necesita además una firma o un hash comunicado por un canal ya autenticado.

## Qué incluye

- Archivos rastreados por Git mediante git ls-files --cached.
- Archivos no rastreados y no ignorados mediante git ls-files --others --exclude-standard.
- La plantilla segura rastreada .env.example, con valores vacíos o banderas fail-closed.
- Exactamente los 5 archivos históricos rastreados `output/playwright/pv95/**` y los 63 archivos de evidencia final declarados en las allowlists del script, incluidas las capturas, auditorías, comparaciones visuales y referencias sintéticas de ciudades requeridas.
- Los ocho insumos declarados en INPUT_MANIFEST.csv, después de comprobar existencia y SHA-256 contra C:\Users\artot\OneDrive\Desktop\Página_Web.
- La solicitud pegada conocida, solo si todavía existe.
- LEEME_PRIMERO.md, VALIDAR_ARCHIVO.ps1, inventario SHA-256 y reporte de exclusiones.
- `SUBIR_PROYECTO.md`, con pasos simples y separados para GitHub privado, vista local, EasyPanel/Docker y una futura preparación de Cloudflare sin convertirlas en autorización de despliegue.

El ZIP mantiene dos áreas separadas:

- repository: código y documentación que pueden revisarse antes de subir al repositorio privado.
- project-inputs: documentos, notas e imágenes del cliente. No se incorporan automáticamente al historial Git.

## Exclusiones de seguridad

Se excluyen .git, node_modules, caches, cobertura, builds, outputs no allowlisted, archivos .env* salvo .env.example, configuraciones npm/netrc, PEM/llaves/JKS/keystores, archivos con nombres de token o credencial, archivos anteriores de stage-archives y datos/medios/backups locales del CMS. Los 5 archivos Playwright históricos `pv95` rastreados y los 63 archivos de evidencia final allowlisted son las únicas excepciones explícitas de output. Si cualquier otro archivo rastreado coincide con una exclusión, el script falla en vez de omitirlo silenciosamente.

Un enlace simbólico o reparse point seleccionado causa fallo cerrado. Los formatos textuales reconocidos se escanean; un texto mayor de 4 MiB o una extensión no clasificada falla en vez de saltarse. También se rechazan patrones de secretos de alta confianza. Este control no sustituye un escáner de secretos especializado ni una revisión humana antes de git add.

Cada fuente está limitada a 128 MiB y el conjunto a 512 MiB. El destino debe ser nuevo y estar directamente dentro de stage-archives.

## Validar el resultado

1. Extrae el ZIP en una carpeta nueva.
2. Abre PowerShell en esa carpeta.
3. Ejecuta:

       pwsh -NoProfile -File .\VALIDAR_ARCHIVO.ps1

El verificador compara cantidad, tamaño y SHA-256 de todos los archivos inventariados. ARCHIVE_INVENTORY.csv no se incluye a sí mismo para evitar un hash autorreferencial.

Antes de cualquier push, verifica en GitHub o con gh repo view TU_USUARIO/TU_REPOSITORIO --json visibility que el repositorio muestre PRIVATE. La comprobación visual del remote no demuestra por sí sola su visibilidad.

Sube únicamente el contenido de repository al repositorio privado. No subas el ZIP completo ni project-inputs como release o artefacto.

Dentro de `repository`, `SUBIR_PROYECTO.md` explica de forma independiente cómo guardar el código en GitHub privado, abrirlo localmente y preparar EasyPanel o una rama Cloudflare. Las secciones de Internet están bloqueadas por el `NO-GO`: documentarlas no autoriza hosting, DNS, indexación ni producción comercial.

## Riesgo TOCTOU residual

El script vuelve a comprobar archivos, temporales, inventario, ZIP y hash final, pero no dispone de una transacción del sistema operativo que congele todas las fuentes. Otro proceso local con acceso a la misma cuenta podría intentar modificar fuentes, temporales o destino entre controles. Ejecuta en una sesión confiable, detén escritores del CMS y sincronizadores durante la captura cuando sea seguro hacerlo, y valida el SHA-256 final comunicado por un canal independiente.

## Estado del paquete

Este archivo es solo una transferencia local de etapa. No despliega, no hace commit ni push. La versión actual puede publicar una beta sintética no indexable, pero `productionActivation:false` sigue significando que no existe activación comercial. Contacto, reservas, pagos y analítica permanecen desactivados. La oferta real continúa en NO-GO hasta cerrar aprobación legal, derechos y consentimientos, contenido real, revisión lingüística humana, UAT y autorización explícita.
