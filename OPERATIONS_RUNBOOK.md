# Runbook local y de transición — PecadosVip Web

Estado: entorno de desarrollo con CMS local persistente, no operación productiva. Este runbook no autoriza merge, despliegue, indexación ni activación de servicios externos.

## Recuperación reproducible

1. Clonar el repositorio privado en una carpeta nueva.
2. Seleccionar `codex/pagina-web-checkpoint` para el trabajo actual o `main` para el baseline heredado.
3. Verificar Node.js `>=22.13.0`, pnpm `11.19.0` y que el lockfile resuelva Next.js `16.2.11`.
4. Ejecutar `pnpm install --frozen-lockfile`.
5. Ejecutar `pnpm run release:verify`.
6. Comparar el SHA local con el remoto antes de afirmar que la copia está actualizada.

No usar `reset --hard`, `clean` ni restauraciones destructivas en una copia con trabajo local. Para recuperar un baseline, usar otro clon o worktree.

## Comandos locales

```powershell
pnpm run dev
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run i18n:validate
pnpm run build
pnpm run start
pnpm run release:verify
```

`pnpm run validate` es la puerta base: lint, tipos, pruebas y build. `pnpm run i18n:validate` verifica el contrato local de locales, catálogos y rutas. `pnpm run release:verify` añade ese validador, scorecard, inventario estructurado del lockfile, higiene/integridad de `dist` y smoke HTTP de la beta pública. Ninguno incluye revisión lingüística humana, accesibilidad real con tecnología asistiva, seguridad completa, proveedor, contenido real ni UAT.

## Operación multilingüe segura

- Los únicos locales admitidos son `es`, `en`, `fr` e `it`.
- Usa rutas prefijadas: `/{locale}`, `/{locale}/madrid`, `/{locale}/barcelona`, `/{locale}/perfiles`, `/{locale}/perfiles/{slug}`, `/{locale}/contacto` y `/{locale}/legal/{document}`.
- Las rutas históricas sin prefijo se mantienen por compatibilidad y deben permanecer `noindex`.
- Un locale desconocido debe fallar cerrado; no debe seleccionarse español silenciosamente.
- La interfaz estática usa los catálogos de `compliance/multilingual/catalogs/`. Los perfiles dinámicos y cuerpos legales no se publican fuera de ES hasta disponer de traducción aprobada.
- Cada cambio de catálogo requiere `pnpm run i18n:validate` y una nueva auditoría determinista. No añadas evidencia de revisión humana si no existe.

La comparación actual de catálogos tiene 0 hallazgos, pero conserva los dictámenes técnico `NO DETERMINABLE`, lingüístico `PENDIENTE DE REVISIÓN HUMANA` y de publicación `NO DETERMINABLE POR FALTA DE EVIDENCIA`. Antes de abrir el release, prueba los cuatro locales en DOM/navegador, reflow/overflow, teclado y tecnología asistiva, completa revisión humana y legal, y repite todo en staging.

Los scripts también pueden invocarse con npm (`npm run dev`, `npm run test`, `npm run validate`, etc.). pnpm y su lockfile siguen siendo la instalación reproducible declarada por el proyecto; no mezclar instalaciones ni generar otro lockfile.

## Configuración segura

Crear `.env.local` solo en el entorno autorizado. Nunca confirmarlo en Git. Mantener:

```dotenv
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_ALLOW_INDEXING=false
NEXT_PUBLIC_CONTENT_APPROVED=false
NEXT_PUBLIC_CONTACT_APPROVED=false
NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED=false
NEXT_PUBLIC_CONTACT_FORM_ACTION=
NEXT_PUBLIC_WHATSAPP_URL=
NEXT_PUBLIC_TELEGRAM_URL=
NEXT_PUBLIC_PHONE_URL=
NEXT_PUBLIC_EMAIL_URL=
```

No cambiar las dos banderas a `true` hasta superar el gate agregado y contar con autorización explícita. Un dominio real no implica aprobación de contenido; las aprobaciones tampoco autorizan despliegue.

## CMS local persistente

Este workbench es exclusivamente de desarrollo/pruebas. Se ejecuta en un proceso separado, solo enlaza `127.0.0.1`, rechaza producción y no añade rutas administrativas al sitio público. Los tokens locales asignan capacidades `admin` o `editor`, pero no prueban la identidad de una persona y no sustituyen un proveedor de autenticación.

### Ruta de datos segura

En Windows, la ruta predeterminada es `%LOCALAPPDATA%\PecadosVip\cms-dev`. El fallback en otros sistemas es temporal, por lo que para trabajo durable debe definirse una ruta absoluta dedicada:

```powershell
$env:PECADOSVIP_LOCAL_CMS_DATA_DIR = 'C:\PecadosVipLocal\cms-dev'
```

La ruta debe estar fuera del checkout y de cualquier carpeta sincronizada. El launcher rechaza segmentos `OneDrive`, `Dropbox` y `Google Drive`; no detecta todos los clientes de nube. No usar una unidad compartida, NAS o carpeta que otro proceso pueda escribir.

El estado queda en:

- `<dataRoot>\profiles.json`: sobre JSON versionado con perfiles, revisiones, replay y bitácora.
- `<dataRoot>\media\`: bytes y metadatos JSON de medios, incluida su bitácora.

Los dos son **texto plano**. Los permisos de directorio solicitados por la aplicación no reemplazan cifrado de disco, control de acceso del sistema operativo ni una política de retención.

### Inicio y cierre

Configurar al menos un token base64url sin relleno de 43 a 128 caracteres, generado aleatoriamente desde un mínimo de 32 bytes (256 bits). El runtime comprueba el alfabeto y una diversidad mínima de caracteres, pero no puede verificar cómo se generó ni medir su entropía real. No reutilizar contraseñas ni guardar el token en archivos del repositorio:

```powershell
$tokenBytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($tokenBytes)
$env:PECADOSVIP_LOCAL_CMS_ADMIN_TOKEN = [Convert]::ToBase64String($tokenBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
[Array]::Clear($tokenBytes, 0, $tokenBytes.Length)
Remove-Variable tokenBytes

# Para un editor, repetir la generación con bytes nuevos y asignar:
# $env:PECADOSVIP_LOCAL_CMS_EDITOR_TOKEN = '<base64url-aleatorio-independiente>'
$env:PECADOSVIP_LOCAL_CMS_PORT = '4310'

pnpm run cms:local
# Alternativa equivalente: npm run cms:local
```

Si se omite el puerto, se elige uno libre. Abrir únicamente el origen `http://127.0.0.1:<puerto>` que imprime el proceso e introducir allí el token. El proceso no lo imprime ni lo guarda. Al terminar, cierra el proceso y elimina las variables con `Remove-Item Env:PECADOSVIP_LOCAL_CMS_ADMIN_TOKEN` y, si aplica, `Remove-Item Env:PECADOSVIP_LOCAL_CMS_EDITOR_TOKEN`. `/health` solo confirma que el workbench local está levantado; no prueba consistencia de contenido, respaldo ni preparación productiva.

La herramienta permite gestionar el ciclo de perfiles, evidencia/aprobación y asociaciones multimedia con revisión optimista y protección contra replay. La interfaz carga JPEG, PNG o WebP de hasta 5 MiB y MP4 de hasta 12 MiB. El store comprueba firma, tamaño y SHA-256; las imágenes se decodifican en variantes WebP `desktop` y `mobile` acotadas y sin metadatos, mientras el MP4 se valida estructuralmente sin transcodificar. No ejecuta antivirus, no usa CDN y no publica al sitio.

Cerrar con `Ctrl+C` y esperar que el proceso termine. Las mutaciones usan locks de archivo adyacentes con creación exclusiva entre procesos cooperantes, pero no existe lease distribuido, limpieza automática de locks obsoletos ni transacción global entre perfiles y medios. Mantén **un solo proceso escritor** por directorio de datos; un editor externo o la sincronización de archivos aún pueden producir conflictos o pérdida de integridad.

Archivar es la eliminación normal. Restaurar un perfil vuelve a borrador e invalida aprobación/evidencia anterior; archivar o restaurar medios actualiza estado y auditoría. No existe borrado físico desde el workbench.

### Crear un respaldo

Preflight:

1. Cerrar el workbench para obtener una captura coherente entre `profiles.json` y `media\`.
2. Confirmar la ruta de datos correcta.
3. Elegir un destino absoluto **que todavía no exista**, disjunto del origen y fuera de nubes sincronizadas.
4. No imprimir ni copiar tokens junto al respaldo.

```powershell
$env:PECADOSVIP_LOCAL_CMS_DATA_DIR = 'C:\PecadosVipLocal\cms-dev'
$env:PECADOSVIP_LOCAL_CMS_BACKUP_DIR = 'C:\PecadosVipBackups\backup-2026-08-27-001'

pnpm run cms:backup
# Alternativa equivalente: npm run cms:backup
```

El comando exige un archivo de estado y un directorio de medios existentes. Rechaza destino existente, solapamiento, raíces de filesystem, entradas no regulares y enlaces simbólicos. Copia primero a staging, genera `manifest.json` con esquema/versión, inventario, tamaño y SHA-256 por archivo, valida el conjunto y lo renombra al destino. La salida JSON `backup-created` incluye ruta, versión, cantidad de archivos, bytes y hora.

El manifiesto detecta alteraciones accidentales o deliberadas del payload, pero el respaldo sigue siendo texto plano: **integridad no equivale a confidencialidad**. Proteger la carpeta con controles del sistema y no usarla como backup productivo.

### Restaurar y seleccionar una copia

Preflight:

1. Mantener el workbench detenido.
2. Seleccionar el respaldo exacto y un destino absoluto nuevo o vacío, fuera de sincronización.
3. Conservar intacto el directorio de datos activo; restaurar primero en paralelo.

```powershell
$env:PECADOSVIP_LOCAL_CMS_BACKUP_DIR = 'C:\PecadosVipBackups\backup-2026-08-27-001'
$env:PECADOSVIP_LOCAL_CMS_RESTORE_ROOT = 'C:\PecadosVipRestore\restore-2026-08-27-001'

pnpm run cms:restore
# Alternativa equivalente: npm run cms:restore
```

La restauración valida por completo el sobre, las rutas permitidas, el inventario y cada hash antes de comprometer el destino. Usa staging y renombrado; un destino no vacío falla cerrado. `PECADOSVIP_LOCAL_CMS_RESTORE_OVERWRITE=1` autoriza reemplazarlo y elimina su contenido anterior después del commit; evitar esta opción salvo que exista otro respaldo verificado y el destino exacto haya sido revisado.

La salida `backup-restored` señala directamente `<restoreRoot>\profiles.json` y `<restoreRoot>\media\`, el layout esperado por el launcher. El comando no inicia el workbench ni cambia su directorio activo. Para revisar la copia sin sobrescribir el origen, selecciona el root restaurado en la misma terminal y arranca el CMS:

```powershell
$restoreRoot = 'C:\PecadosVipRestore\restore-2026-08-27-001'
$env:PECADOSVIP_LOCAL_CMS_DATA_DIR = $restoreRoot
pnpm run cms:local
# Alternativa equivalente: npm run cms:local
```

Usar siempre nombres nuevos en este procedimiento. Tras iniciar, autenticar localmente, revisar el listado, perfiles archivados, medios y bitácora. Esta selección sigue siendo manual, local y reversible; no autoriza publicar ni desplegar.

## Exportar un candidato para revisión local

`candidate:export` no activa el sitio. Proyecta un candidato minimizado y determinista desde el estado CMS local más un archivo de referencias explícito.

Preflight:

1. Detener el workbench y cualquier editor del estado o referencias.
2. Confirmar `<dataRoot>\profiles.json` y preparar un JSON regular con esquema `pecadosvip.publication-candidate-references`, versión `1` y exactamente `schema`, `version`, `cities`, `services` y `settings`.
3. Verificar que ciudades, servicios, settings, legales, origen, contacto y perfiles cumplen el gate agregado; no usar fixtures o URLs `__local-media`.
4. Elegir un directorio de salida absoluto que todavía no exista y sea disjunto de las dos fuentes.

```powershell
$env:PECADOSVIP_LOCAL_CMS_DATA_DIR = 'C:\PecadosVipLocal\cms-dev'
$env:PECADOSVIP_PUBLICATION_CANDIDATE_REFERENCES_FILE = 'C:\PecadosVipLocal\candidate-references.json'
$env:PECADOSVIP_PUBLICATION_CANDIDATE_OUTPUT_DIR = 'C:\PecadosVipCandidates\candidate-2026-08-27-001'

pnpm run candidate:export
```

Una ejecución correcta imprime JSON con `result: publication-candidate-created`, propósito, `productionActivation: false`, recuento/tamaño y hash. Revisar en el destino:

- `manifest.json`: `pecadosvip.publication-candidate-manifest` v1, un archivo lógico `payload/content.json`, bytes y SHA-256;
- `payload\content.json`: `pecadosvip.publication-candidate` v1, `purpose: local-review-only`, `productionActivation: false`, origen canónico, rutas indexables, ciudades, perfiles, servicios, contacto y cuatro documentos legales proyectados.

El payload omite IDs internos, revisiones, aprobadores, referencias de evidencia, derechos internos y eventos. La herramienta valida lecturas estables, límites, symlinks, solapamientos, destino inexistente y medios públicos; escribe mediante staging y renombrado. No existe importador, servidor, despliegue o conexión automática al runtime. Las dos fuentes no se bloquean en una transacción común, por lo que detener escritores es una condición operativa contra concurrencia/TOCTOU, no una optimización.

## Cerrar una etapa con un ZIP local

Cuando una etapa quede congelada, ejecuta desde la raíz del checkout:

```powershell
pwsh -NoProfile -File .\scripts\create-stage-archive.ps1 -Stage "NOMBRE-DE-LA-ETAPA"
```

Preflight:

1. Detener servidores, workbench y escritores del CMS.
2. Ejecutar `pnpm run release:verify` sobre el árbol que se pretende entregar.
3. Revisar `git status --short` y confirmar que todo archivo de proyecto previsto está rastreado o es un untracked no ignorado.
4. Confirmar que los ocho archivos de `INPUT_MANIFEST.csv` existen y conservan sus SHA-256.
5. No colocar secretos, `.env`, tokens ni datos reales del CMS dentro del checkout.

El script crea un destino nuevo directamente bajo `stage-archives\`, comprueba entradas, límites, hashes, symlinks/reparse points y patrones de secretos de alta confianza, y devuelve JSON con `archivePath`, `archiveSha256`, tamaño y conteos. No reemplaza un ZIP existente.

Después de crearlo:

1. Guardar `archiveSha256` por separado del ZIP.
2. Comparar `Get-FileHash -Algorithm SHA256` antes de extraer o ejecutar nada.
3. Extraer en una carpeta nueva y ejecutar `pwsh -NoProfile -File .\VALIDAR_ARCHIVO.ps1`.
4. Leer `LEEME_PRIMERO.md`; para GitHub subir únicamente `repository`, nunca `project-inputs` salvo autorización separada.
5. Verificar mediante GitHub CLI o la interfaz autenticada que el repositorio destino sea `PRIVATE`; nunca resolver conflictos con `push --force` o `--force-with-lease`.

`STAGE_ARCHIVE_GUIDE.md` contiene el procedimiento completo. El inventario interno comprueba integridad, pero no autentica al remitente; la autenticidad exige el hash externo por canal confiable o una firma. El ZIP sigue siendo un checkpoint local con `productionActivation: false`, no un release ni autorización para publicar.

Para congelar además evidencia reproducible, primero confirma todos los cambios de la etapa en un commit local limpio y ejecuta:

```powershell
pwsh -NoProfile -File .\scripts\capture-stage-evidence.ps1 -Stage "NOMBRE-DE-LA-ETAPA"
```

El comando falla si el working tree no está limpio, ejecuta `pnpm run release:verify` y el audit de dependencias de producción, y crea bajo `evidence\NOMBRE-DE-LA-ETAPA\` los logs, sus SHA-256, el commit candidato, el scorecard y copias hashadas del inventario de dependencias, del reporte worker y del reporte standalone. Esos archivos deben revisarse y confirmarse después en un commit de evidencia; no convierten el resultado local en UAT, pentest o validación desplegada.

## Estado público esperado sin configuración

- El build contiene una beta sintética navegable en `/{locale}`, `/{locale}/perfiles`, `/{locale}/perfiles/:slug`, `/{locale}/servicios` y `/{locale}/servicios/:slug`. El contenido comercial real continúa bloqueado por el gate agregado.
- Las rutas sin prefijo se conservan únicamente como legacy `noindex`; no deben tratarse como canónicas.
- `/` redirige a `/es`; las cuatro raíces localizadas muestran únicamente la beta sintética señalizada.
- `/preview-local-sintetico` responde 404 en producción y solo se habilita mediante `pnpm run dev:preview` en desarrollo loopback.
- Las rutas legales y los perfiles comerciales sin contenido aprobado responden de forma cerrada; la beta sintética sí dispone de copy explícito por locale, sin fallback silencioso al español.
- `robots.txt` bloquea crawling.
- `sitemap.xml` no publica URLs.
- Todas las rutas públicas emiten `noindex, nofollow`.
- No se emiten canonicales ni JSON-LD con un origen supuesto.
- Contacto, reserva, pagos, analítica y administración permanecen deshabilitados.

El manifiesto construye las familias canónicas por cada locale admitido y añade ciudades, perfiles y legales que sean publicables. La regla `headers()` de `next.config.ts` usa `/:path*` para añadir cabeceras, no para redirigir. No existe una regla `redirects()` configurada.

Las cabeceras declaradas incluyen CSP, COOP, política de permisos restrictiva, `Referrer-Policy: no-referrer`, `nosniff`, `DENY` para framing y `X-Robots-Tag: noindex, nofollow, noarchive`. La CSP aún permite inline por compatibilidad y no hay HSTS sin infraestructura HTTPS controlada. Estas propiedades deben verificarse nuevamente sobre el servidor/proxy candidato; la configuración local no prueba que una capa externa las conserve.

Una desviación de este comportamiento antes del release es un incidente de publicación y debe corregirse antes de continuar.

## Diagnóstico

1. Registrar SHA, rama, comando, hora y salida exacta.
2. Confirmar si el problema es local, build, staging o producción; no mezclar estados.
3. Ejecutar primero la prueba más estrecha y luego `pnpm run release:verify`.
4. Revisar `QA_EVIDENCE.md` y `CONTROL_LOG.csv` antes de declarar una regresión nueva.
5. No imprimir `.env`, tokens, evidencias de identidad ni datos personales.
6. Si existe riesgo de exposición, mantener noindex/contacto/analítica cerrados y escalar al responsable.

Para i18n:

- Un locale no admitido debe producir cierre/404, nunca fallback silencioso.
- Una clave ausente, placeholder distinto, texto vacío o mojibake debe bloquear `i18n:validate`.
- Un fallo de catálogo no se corrige copiando español a EN/FR/IT sin revisión; conserva el estado bloqueado.
- Un informe con 0 hallazgos de catálogo no permite cambiar los dictámenes de revisión humana, DOM o publicación.

Para el CMS local:

- Un error de token requiere revisar longitud/configuración en la misma terminal; no registrar el valor.
- Una revisión obsoleta exige recargar el registro y decidir el cambio; no editar `profiles.json` a mano.
- Un error de esquema, JSON, hash o integridad falla cerrado. Conservar el origen sin modificar y restaurar un respaldo verificado a una ruta nueva.
- `BACKUP_EXISTS` exige otro destino nuevo; no borrar una copia para reutilizar el nombre.
- `DESTINATION_NOT_EMPTY` exige una ruta vacía nueva. La bandera de overwrite es una excepción destructiva explícita, no el flujo normal.
- Un fallo por ruta sincronizada se resuelve moviendo el data root a almacenamiento local dedicado, no desactivando la validación.
- Un `/health` correcto no valida el estado completo; abrir perfiles, archivados, medios y bitácora después de una recuperación.

Para `candidate:export`:

- `RELEASE_BLOCKED` exige resolver los códigos devueltos; no editar el artefacto parcial porque no se crea ninguno.
- `SOURCE_CHANGED` exige detener escritores y repetir desde fuentes estables; no demuestra por sí solo corrupción.
- `DESTINATION_EXISTS` exige otro directorio nuevo; no borrar ni sobrescribir el candidato anterior durante el diagnóstico.
- `LOCAL_MEDIA_REFERENCE` exige un medio público seguro y aprobado; el store local no es un CDN.

## Límites operativos no negociables

- Desarrollo y pruebas solamente; no producción, Internet, LAN, staging compartido ni operación multiusuario.
- Datos, medios y respaldos en texto plano; no hay cifrado de aplicación ni gestión de claves.
- Un único proceso escritor; no hay lock entre procesos, transacción global perfiles/medios, replicación ni merge de archivos.
- Backup local con integridad SHA-256, no servicio de copias externo, retención, inmutabilidad ni garantía de RPO/RTO.
- Restore materializa una copia validada directamente como `profiles.json` + `media/`, pero no la selecciona ni inicia automáticamente.
- Tokens locales no son autenticación de personas; no hay recuperación de cuenta, revocación central, MFA ni sesión productiva.
- El estado CMS local no alimenta el sitio público y nunca implica publicación, indexación, despliegue o aceptación.
- El candidato local tampoco alimenta el sitio: no hay importador, firma de release, promoción o activación productiva.
- Las comprobaciones de archivo reducen, pero no eliminan, carreras o sustituciones TOCTOU por otros procesos con acceso al filesystem.
- Las cabeceras de aplicación no sustituyen TLS/HSTS, WAF, CDN, observabilidad o verificación en la infraestructura externa.

## Transición a infraestructura

### EasyPanel / Docker candidato

Preflight local:

```powershell
pnpm install --frozen-lockfile
pnpm run release:verify
git rev-parse HEAD
git status --short
```

`release:verify` construye `dist/standalone`, exige los peers runtime, valida por separado los dos artefactos y arranca exactamente el entrypoint del contenedor en loopback. Si no hay motor Docker, registra imagen como `NOT_TESTED`; no sustituyas esa evidencia con una inspección estática.

En EasyPanel configura el repositorio y una rama/SHA que sí contenga `Dockerfile`, contexto raíz `/`, Dockerfile `Dockerfile` y puerto de contenedor `3000`. No pongas secretos en `GIT_SHA` ni en build args. Después del deploy autorizado registra commit, image ID/digest, usuario efectivo, healthcheck, URL, proxy/TLS y smoke externo. El resultado esperado es la beta sintética con `noindex`; cualquier exposición del preview interno, administración, APIs de conversión o cuerpos legales no aprobados es incidente.

Rollback: selecciona el SHA/digest previamente verificado en EasyPanel, conserva logs del fallo, repite healthcheck y smoke, y no mezcles rollback del contenedor con cambios DNS o habilitación de contenido. La guía paso a paso está en `SUBIR_PROYECTO.md`.

Antes de conectar autenticación, DB, objetos, CMP o hosting:

- Registrar la decisión y propietario.
- Definir ambientes y secretos fuera del repositorio.
- Implementar adaptadores sin debilitar los contratos runtime.
- Añadir pruebas de integración y migración/rollback.
- Ejecutar staging autenticado, navegador, accesibilidad, red, seguridad y UAT.
- Diseñar backup/restore productivo con cifrado, retención, copia externa, RPO/RTO, pruebas periódicas, observabilidad y soporte; el mecanismo local no satisface ese gate.

Las decisiones e insumos pendientes están consolidados en `DECISIONS_REQUIRED.md`.
