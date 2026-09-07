# PecadosVip Web

> Estado actual: **beta sintética pública y no indexable; navegación y recursos visuales operativos, sin activación comercial**.

Este repositorio conserva la base pública existente de Madrid y Barcelona y añade el control de proyecto, los contratos de contenido y las puertas de publicación necesarias para continuar el producto de forma segura. Un build correcto no significa que el alcance, el contenido, la conformidad legal o la aceptación del cliente estén completos.

## Alcance implementado

- Flujo público integrado detrás de un boundary de release y disponible por rutas prefijadas `/{locale}` para los locales base exactos `es`, `en`, `fr` e `it`: portada, Madrid, Barcelona, listado, ficha, contacto y rutas legales. Las rutas heredadas sin prefijo se conservan solo por compatibilidad y permanecen `noindex`.
- Contratos tipados para ciudades, perfiles, servicios, medios, aprobaciones, contacto y documentos legales.
- Estados `draft`, `hidden`, `published` y `archived`.
- Roles de contrato `admin` y `editor`, duplicado seguro, archivo y restauración.
- Repositorio CMS de dominio en memoria y adaptador persistente local JSON con revisión optimista, protección contra repetición, disponibilidad, orden multimedia y bitácora sin valores personales de perfiles.
- Workbench CMS separado del sitio público, limitado a loopback, con roles locales derivados server-side de tokens opacos, medios locales, archivo/restauración sin borrado físico y respaldo/restauración con manifiesto de integridad.
- Exportador `candidate:export` para generar un candidato determinista de **revisión exclusivamente local**, con manifiesto SHA-256 y proyección pública sin campos internos; no modifica el CMS, no alimenta el runtime y declara `productionActivation: false`.
- Validación de mayoría de edad, consentimiento, derechos de uso, contenido local, cobertura y requisitos de release.
- Manifiesto de rutas que excluye registros no publicables.
- Consulta pública de perfiles con parser URL estricto, filtros, paginación y detalle proyectado sin IDs internos ni referencias de evidencia.
- Contrato de analítica fail-closed con consentimiento obligatorio y allowlist runtime que rechaza PII y propiedades desconocidas.
- SEO cerrado por defecto hasta confirmar dominio, indexación y contenido.
- Canales externos cerrados salvo que pasen conjuntamente el release agregado, la aprobación de contacto, la aprobación de privacidad y la validación del destino.
- Cabeceras defensivas declaradas tanto para `/` como para `/:path*`, con CSP cerrada por defecto, protección contra framing/MIME sniffing, política de permisos restrictiva y `X-Robots-Tag: noindex, nofollow, noarchive` mientras las puertas de publicación permanezcan cerradas.
- Auditoría técnica UE/España con matriz de aplicabilidad, hallazgos trazables y decisión de release `NO-GO` en `compliance/ue-es/`.
- Catálogos y contrato multilingüe ES/EN/FR/IT con selector por endónimos, `lang` por locale, rutas equivalentes y metadata localizada. No existe fallback silencioso: perfiles dinámicos y cuerpos legales permanecen cerrados fuera de español hasta disponer de contenido localizado aprobado.
- Auditoría determinista de catálogos con 0 hallazgos y retest Chromium local ES/EN/FR/IT en `PASS WITH LIMITS` técnico. El dictamen lingüístico sigue `PENDIENTE DE REVISIÓN HUMANA` y la publicación, `NO DETERMINABLE POR FALTA DE EVIDENCIA`.
- Artefactos de gobierno, trazabilidad, riesgos, QA y handoff provisional.

Todavía no están implementados un CMS productivo, autenticación mediante proveedor, base de datos transaccional, almacenamiento de objetos/CDN, cifrado en reposo, textos legales aprobados, perfiles/medios reales, canales comerciales ni proveedor/CMP de analítica. El CMS persistente incluido es exclusivamente local para desarrollo y pruebas y no publica contenido en la beta. También siguen pendientes la revisión lingüística humana ES/EN/FR/IT, la revisión jurídica, pruebas con tecnología asistiva, UAT comercial y aprobación de contenido real. La beta sintética sí se valida en Chromium y standalone local; esas pruebas no sustituyen la verificación posterior del despliegue.

## Checkpoint técnico local 98

El checkpoint obtiene **98/100** en el ledger técnico local: inventario y evidencia 15/15, arquitectura 9/10, implementación e integración 45/45, QA y correcciones 24/25, y empaquetado/handoff 5/5. La captura durable sobre `73249861acb9874a310e9f112450d00a65a4b1e3` registra **155/155 pruebas PASS**, además de lint, typecheck, build, validador i18n, artefactos de release, smoke fail-closed y audit de dependencias en PASS. La remediación local posterior amplía la suite a 167 pruebas y añade hardening Docker/Vinext y evidencia visual multilingüe; no cambia el score ni abre producción. El manifiesto histórico está en `evidence/98-local-technical-checkpoint/evidence-manifest.json`, SHA-256 `7EC3DB4BDF77E732E8B22D8EC6E1B5C3646CF27F406E21E5C75F64AE78A7A512`.

Los checkpoints 87, 95 y 98 siguen siendo antecedentes durables separados. El porcentaje 98 fue únicamente un proxy técnico local: su decisión pública/legal era **`NO-GO`**. La etapa actual permite solo la beta sintética descrita arriba; la oferta comercial y la conformidad legal continúan sin aprobación.

## Requisitos locales

- Node.js `>=22.13.0`.
- pnpm `11.19.0`.
- Next.js `16.2.11`, React `19.2.6` y Vinext `1.0.0-beta.3`, fijados por `package.json` y `pnpm-lock.yaml`.

## Instalación reproducible

```powershell
pnpm install --frozen-lockfile
```

No se requieren servicios externos para lint, tipos, pruebas de contratos o build.

## Configuración

Copia `.env.example` a `.env.local` únicamente en tu entorno. No confirmes `.env.local` ni valores sensibles en Git.

La publicación SEO permanece deshabilitada salvo que se cumplan simultáneamente estas condiciones:

```dotenv
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_ALLOW_INDEXING=false
NEXT_PUBLIC_CONTENT_APPROVED=false
NEXT_PUBLIC_CONTACT_APPROVED=false
NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED=false
```

Conserva esos valores hasta recibir el origen definitivo y las dos aprobaciones. Después, `NEXT_PUBLIC_SITE_URL` debe contener un origen HTTPS real, sin ruta, usuario, contraseña, query ni fragmento. Los dominios locales o reservados son rechazados. Las dos banderas no sustituyen la validación de contenido ni la aceptación formal.

Los canales permanecen vacíos hasta recibir destinos aprobados y superar el release agregado:

```dotenv
NEXT_PUBLIC_CONTACT_FORM_ACTION=
NEXT_PUBLIC_WHATSAPP_URL=
NEXT_PUBLIC_TELEGRAM_URL=
NEXT_PUBLIC_PHONE_URL=
NEXT_PUBLIC_EMAIL_URL=
```

## Desarrollo y validación

```powershell
pnpm run dev
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run start
```

Puerta local completa:

```powershell
pnpm run release:verify
```

El build de producción queda en `dist/`. La puerta `validate` ejecuta lint, tipos, la batería declarada de pruebas y build; debe repetirse si el árbol cambia. Antes de afirmar que existe un release deben completarse accesibilidad, seguridad compatible, rendimiento y smoke desde la carpeta versionada de entrega.

Cuando `output: 'standalone'` está activo, el build genera además `dist/standalone/server.js`. El paso `standalone:prepare` incorpora de forma desreferenciada los peers runtime que Vinext `1.0.0-beta.3` omite con la configuración Cloudflare actual y elimina sourcemaps de dependencias del artefacto. `release:artifact` valida por separado el `dist` worker y el standalone Node, incluidos el paquete Vinext y su `prod-server`; `smoke:production` arranca exactamente `node dist/standalone/server.js` en loopback. El `Dockerfile` multi-stage copia solo ese resultado a una imagen Node no-root; las etapas builder y runner usan la misma base Node fijada por versión y digest inmutable. Aun así, debe registrarse el digest de la imagen candidata realmente construida y, después, el digest desplegado.

Esto constituye un candidato de empaquetado local para EasyPanel, no una imagen Docker comprobada ni un despliegue. En este equipo no hay motor Docker disponible; consulta `SUBIR_PROYECTO.md` para la configuración y los límites de prueba.

## CMS local persistente

El workbench CMS es una herramienta separada, únicamente para desarrollo y pruebas. Escucha en `127.0.0.1`, rechaza `NODE_ENV=production`, no crea rutas `/admin` en el sitio público y no sustituye autenticación real. Cada token debe generarse aleatoriamente con al menos 32 bytes (256 bits) y codificarse como base64url sin relleno. El runtime acepta de 43 a 128 caracteres `[A-Za-z0-9_-]`, exige diversidad mínima y deriva el actor y el rol desde la configuración server-side. La validación comprueba formato y diversidad, no puede demostrar la procedencia ni la entropía real del valor; no reutilices contraseñas.

En PowerShell, genera el token sin imprimirlo y ejecuta una de las dos variantes equivalentes:

```powershell
$tokenBytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($tokenBytes)
$env:PECADOSVIP_LOCAL_CMS_ADMIN_TOKEN = [Convert]::ToBase64String($tokenBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
[Array]::Clear($tokenBytes, 0, $tokenBytes.Length)
Remove-Variable tokenBytes
pnpm run cms:local
# Equivalente: npm run cms:local
```

También se admite `PECADOSVIP_LOCAL_CMS_EDITOR_TOKEN`. `PECADOSVIP_LOCAL_CMS_PORT` fija un puerto opcional; si se omite, el sistema elige uno libre y muestra el origen local. El token se introduce en la pantalla local para autorizar cada llamada; no debe compartirse, imprimirse ni guardarse en el repositorio.

El directorio de datos predeterminado en Windows es `%LOCALAPPDATA%\PecadosVip\cms-dev`; fuera de Windows se usa un directorio temporal del sistema. Para una ubicación durable y explícita:

```powershell
$env:PECADOSVIP_LOCAL_CMS_DATA_DIR = 'C:\PecadosVipLocal\cms-dev'
pnpm run cms:local
# Equivalente: npm run cms:local
```

Usa una ruta local dedicada fuera del repositorio y de carpetas sincronizadas. El launcher rechaza rutas bajo `OneDrive`, `Dropbox` o `Google Drive`; otras herramientas de sincronización deben excluirse por operación. Dentro del directorio se crean `profiles.json` y `media\`. Ambos contienen información en **texto plano**.

El workbench permite crear, editar, duplicar, cambiar estado o disponibilidad, registrar evidencia/aprobación y ordenar o asociar medios, respetando revisión optimista, roles y protección contra replay. La interfaz acepta imágenes JPEG, PNG o WebP de hasta 5 MiB y MP4 de hasta 12 MiB. Las imágenes se decodifican y se convierten en variantes WebP `desktop` y `mobile` acotadas, sin metadatos; el MP4 recibe validación estructural pero no transcodificación. Se validan firma, tamaño y hash y se conservan eventos de auditoría. Archivar/restaurar perfiles o medios no elimina físicamente sus archivos. No hay antivirus, CDN ni publicación automática al sitio público.

Las mutaciones usan locks de archivo adyacentes con creación exclusiva para coordinar procesos cooperantes sobre el mismo recurso. No son leases distribuidos, no eliminan automáticamente locks obsoletos y no crean una transacción global entre perfiles y medios; por eso sigue recomendándose **un proceso escritor** por directorio de datos. Detén el workbench con `Ctrl+C` antes de copiar, respaldar o restaurar sus archivos.

### Respaldo local

Con el workbench detenido, conserva `PECADOSVIP_LOCAL_CMS_DATA_DIR` apuntando al origen y selecciona un directorio de respaldo absoluto, nuevo y fuera de nubes sincronizadas:

```powershell
$env:PECADOSVIP_LOCAL_CMS_DATA_DIR = 'C:\PecadosVipLocal\cms-dev'
$env:PECADOSVIP_LOCAL_CMS_BACKUP_DIR = 'C:\PecadosVipBackups\backup-2026-08-27-001'
pnpm run cms:backup
# Equivalente: npm run cms:backup
```

El comando exige que `profiles.json` y `media\` existan, rechaza destinos ya existentes, rutas superpuestas y enlaces simbólicos, y crea el respaldo mediante staging y renombrado atómico. El resultado contiene `manifest.json` y `payload\`, con tamaño y SHA-256 por archivo. Esos hashes detectan alteraciones, pero **no cifran** el respaldo ni aportan confidencialidad.

### Restauración local

Restaura primero a un directorio nuevo o vacío, también fuera de nubes sincronizadas:

```powershell
$env:PECADOSVIP_LOCAL_CMS_BACKUP_DIR = 'C:\PecadosVipBackups\backup-2026-08-27-001'
$env:PECADOSVIP_LOCAL_CMS_RESTORE_ROOT = 'C:\PecadosVipRestore\restore-2026-08-27-001'
pnpm run cms:restore
# Equivalente: npm run cms:restore
```

Antes de escribir, el comando valida esquema, versión, rutas, inventario, tamaños y hashes. Un destino no vacío se rechaza salvo que se defina explícitamente `PECADOSVIP_LOCAL_CMS_RESTORE_OVERWRITE=1`; esa opción reemplaza su contenido y solo debe usarse con el CMS detenido y después de un respaldo adicional.

La restauración materializa directamente `profiles.json` y `media\` bajo `PECADOSVIP_LOCAL_CMS_RESTORE_ROOT`, el mismo layout que espera el launcher. No inicia el workbench, no cambia `PECADOSVIP_LOCAL_CMS_DATA_DIR` y no reemplaza automáticamente el origen activo: revisa el destino restaurado y, para probarlo, apunta esa variable al nuevo directorio antes de ejecutar `cms:local`.

### Candidato de publicación para revisión local

`candidate:export` toma los perfiles de `<dataRoot>\profiles.json` y combina ciudades, servicios y configuración desde un archivo de referencias separado. Ese archivo debe ser JSON con el sobre exacto `pecadosvip.publication-candidate-references` versión `1` y las claves `schema`, `version`, `cities`, `services` y `settings`. Todos los datos deben superar el gate agregado; un sobre incompleto, contenido sin aprobación, origen canónico inválido, canal ausente o medio local bloquea la exportación.

Con el workbench detenido y sin editar el archivo de referencias durante la operación:

```powershell
$env:PECADOSVIP_LOCAL_CMS_DATA_DIR = 'C:\PecadosVipLocal\cms-dev'
$env:PECADOSVIP_PUBLICATION_CANDIDATE_REFERENCES_FILE = 'C:\PecadosVipLocal\candidate-references.json'
$env:PECADOSVIP_PUBLICATION_CANDIDATE_OUTPUT_DIR = 'C:\PecadosVipCandidates\candidate-2026-08-27-001'
pnpm run candidate:export
```

Las dos rutas específicas del candidato deben ser absolutas, disjuntas de los orígenes y apuntar a un archivo regular y a un destino que todavía no exista. El resultado contiene:

- `manifest.json`: esquema `pecadosvip.publication-candidate-manifest` versión `1`, propósito `local-review-only`, `productionActivation: false`, tamaño y SHA-256 de la carga;
- `payload\content.json`: esquema `pecadosvip.publication-candidate` versión `1`, rutas indexables proyectadas y contenido público sin IDs internos, revisiones, aprobadores ni referencias de evidencia.

La exportación es determinista para fuentes equivalentes, valida que las fuentes no cambien durante sus lecturas, rechaza enlaces simbólicos y URLs de medios locales y compromete el destino mediante staging y renombrado. Aun así, no obtiene un lock global entre `profiles.json` y el archivo de referencias: detener escritores sigue siendo obligatorio para evitar una combinación temporal incoherente. El artefacto no se importa en la aplicación, no cambia `next.config.ts`, no levanta servidor, no habilita indexación y no constituye release, despliegue ni aceptación.

El build de producción expone una beta sintética no indexable en `/{locale}` y redirige `/` a `/es`. Integra las identidades adultas ficticias Valeria, Sofía, Lucía, Julia, Mia y Alicia, sus portadas y galerías, filtros, fichas y catálogo de servicios en ES/EN/FR/IT. Todo se identifica como generado con IA; disponibilidad, cobertura y servicios son propuestas por confirmar. Contacto, reservas, pagos, analítica y lecturas del CMS permanecen desactivados. Los medios públicos salen únicamente por `/beta-media/*` con allowlist, confinamiento de ruta, rechazo de symlinks, límite de tamaño y cabeceras defensivas. El harness `/preview-local-sintetico` continúa limitado a desarrollo loopback y responde 404 en producción.

Vinext `1.0.0-beta.3` produjo errores reales en la navegación cliente de `next/link` durante el smoke pre-boundary. Las rutas públicas usan temporalmente enlaces HTML nativos; la navegación se verificó en aquel UI sin errores de consola. Esta excepción y el preview deben revisarse al actualizar o estabilizar Vinext.

## Comportamiento seguro por defecto

Sin configuración aprobada:

- `robots.txt` responde `Disallow: /`.
- `sitemap.xml` no contiene URLs.
- Todas las rutas públicas actuales emiten `noindex, nofollow`.
- No se emiten canonicales ni JSON-LD con un dominio supuesto.
- Formularios y canales externos permanecen deshabilitados.
- Dos banderas de entorno no pueden activar contacto por sí solas: el release agregado también debe estar aprobado.
- Inicio, perfiles y servicios localizados muestran únicamente la beta sintética señalizada; el contenido comercial real sigue sujeto al gate agregado.
- Las rutas legales localizadas conocidas muestran el holding neutral mientras el release esté bloqueado; sus equivalentes legacy sin prefijo devuelven 404. Los cuerpos no aparecen en el pie hasta que documento y release estén aprobados.
- Registros `draft`, `hidden`, `archived` o sin evidencia no entran al manifiesto público.

El manifiesto de rutas genera las familias canónicas bajo cada uno de los cuatro prefijos admitidos y añade condicionalmente ciudades, perfiles y documentos legales publicables. Las rutas equivalentes sin prefijo son legacy `noindex`. La regla `headers()` con patrón `/:path*` añade cabeceras a todas las rutas compatibles, pero **no redirige** solicitudes y no existe una regla `redirects()` en `next.config.ts`.

Las cabeceras declaradas son defensa en profundidad, no prueba de entrega por un proxy real: la CSP actual permite estilos y scripts inline por compatibilidad, y HSTS no se configura hasta disponer de un origen HTTPS y una capa de terminación controlados. `X-Robots-Tag` mantiene la indexación cerrada por defecto y se omite únicamente cuando coinciden un origen HTTPS válido, las dos aprobaciones explícitas de indexación/contenido y el release agregado listo; así comparte la misma decisión fail-closed que los metadatos.

## Datos y contenidos

No hay perfiles reales ni medios personales en este repositorio. Los candidatos completamente sintéticos viven en `assets/synthetic-profiles/` y se proyectan mediante `lib/preview/synthetic-preview.ts`; conservan `public_path` vacío y no se importan al CMS. Una allowlist copia solo los recursos sintéticos revisados al artefacto productivo de la beta. Cualquier carga de contenido real exige evidencia trazable de mayoría de edad, consentimiento, derechos de uso y aprobación de contenido.

### Límite del repositorio CMS local

`InMemoryProfileRepository` sigue siendo la implementación de dominio y `PersistentJsonProfileRepository` la compone para guardar un sobre JSON versionado mediante archivo temporal, `fsync` y renombrado. Una lectura corrupta o con versión/esquema no admitidos falla cerrada; no se reinicializa silenciosamente. El adaptador preserva las reglas de revisión, roles, replay, archivo/restauración y auditoría del repositorio de dominio.

Esto no lo convierte en CMS de producción: la persistencia es texto plano, el bloqueo solo cubre un proceso JavaScript, no hay transacción conjunta entre `profiles.json` y todos los archivos multimedia, y no existen proveedor de identidad, gestión de secretos, base de datos, almacenamiento de objetos, cifrado, replicación, retención ni recuperación remota. Persisten riesgos de concurrencia y de cambio de archivos o rutas entre comprobación y uso (TOCTOU) fuera del proceso. El workbench solo escucha en loopback y su token local es una capacidad de desarrollo, no una identidad verificable.

La API omite borrado físico; archivar es la eliminación normal y restaurar un perfil invalida aprobación y evidencias anteriores. Los medios también se archivan y restauran sin borrado físico. El sitio público no consume ni publica automáticamente este estado local.

La bitácora conserva identificadores operativos opacos de actor y solicitud, no biografías ni valores de perfil. El adaptador productivo deberá definir acceso, retención y seudonimización. Una solicitud repetida se rechaza; no se devuelve automáticamente el resultado anterior, por lo que esto es protección contra replay y no idempotencia completa.

## Gobierno y evidencia

- `ARCHITECTURE.md`: límites, mapa URL, puertos, fronteras de confianza y criterios de integración.
- `REFERENCE_RESEARCH.md`: observación de referencias, clasificación SEO y límites de uso.
- `MEASUREMENT_SPEC.md`: taxonomía de analítica, minimización, consentimiento y aceptación.
- `LEGAL_INPUTS_REQUIRED.md`: intake legal/privacidad y gate de publicación, sin inventar textos.
- `DECISIONS_REQUIRED.md`: decisiones humanas P0/P1 que bloquean el siguiente gate.
- `OPERATIONS_RUNBOOK.md`: recuperación, validación, diagnóstico y transición segura.
- `RELEASE_CHECKLIST.md`: gates separados de QA, aceptación, merge, despliegue e indexación.
- `PROJECT_CONTROL.md`: estado, gobierno, alcance, cronograma y pronóstico.
- `INPUT_MANIFEST.csv`: inventario y hashes de las fuentes analizadas.
- `REQUIREMENTS_TRACEABILITY.csv`: requisito → implementación → prueba → evidencia.
- `CONTROL_LOG.csv`: riesgos, issues, decisiones, contradicciones y cambios.
- `QA_EVIDENCE.md`: resultados observados y controles pendientes.
- `HANDOFF_CLOSEOUT.md`: handoff provisional; no representa cierre.
- `STAGE_ARCHIVE_GUIDE.md`: creación, validación y uso seguro del ZIP recurrente de cada etapa.
- `SUBIR_PROYECTO.md`: pasos simples para GitHub privado, vista web local y preparación futura de hosting bajo autorización.
- `compliance/ue-es/audit-report.md`: evaluación técnica UE/España, aplicabilidad, hallazgos y límites; no es dictamen jurídico.
- `compliance/multilingual/audit-report.md`: comparación determinista de catálogos ES/EN/FR/IT; no es aprobación lingüística ni prueba del DOM o de publicación.

## GitHub y recuperación

El trabajo continúa en `codex/pagina-web-checkpoint` mediante un PR en borrador. `main` conserva el baseline heredado `013307a`.

Para recuperar el baseline sin destruir este checkout, crea un clon nuevo del repositorio y selecciona `main`. No uses `reset --hard`, `clean` ni restauraciones destructivas sobre una copia con trabajo no confirmado.

## ZIP local al cerrar cada etapa

Al completar una etapa, crea una copia local autocontenida desde la raíz del repositorio:

```powershell
pwsh -NoProfile -File .\scripts\create-stage-archive.ps1 -Stage "NOMBRE-DE-LA-ETAPA"
```

El ZIP queda en `stage-archives\`, que está ignorado por Git. Incluye el código y la documentación entregables, los ocho insumos del cliente validados contra `INPUT_MANIFEST.csv`, la solicitud original si continúa disponible, inventario SHA-256, exclusiones y un `LEEME_PRIMERO.md` con instrucciones simples para validar, ejecutar y subir **solo** la carpeta `repository` a un repositorio privado. `SUBIR_PROYECTO.md` separa GitHub privado, vista local y la preparación futura de hosting sin autorizar un despliegue. Excluye `.git`, dependencias, builds, entornos, llaves, tokens, archivos anteriores y datos locales del CMS.

Para el checkpoint 98, la evidencia durable ya está capturada. El ZIP se crea como paso externo desde el commit documental limpio; su ruta y SHA-256 se comunican fuera del propio paquete para evitar una referencia circular. Esto no implica push ni despliegue.

Conserva y comunica por un canal independiente el `archiveSha256` que imprime el script. Antes de extraer o ejecutar el paquete, compáralo con `Get-FileHash`. La guía completa y los límites de seguridad están en `STAGE_ARCHIVE_GUIDE.md`. El paquete no hace commit, push, despliegue ni activación productiva.

## Publicación y operación

No hay autorización para merge, hosting ni despliegue. Antes de producción se necesitan, como mínimo, aprobación visual, contenido real, evidencia legal y de derechos, dominio, canales, proveedor de autenticación/base de datos/almacenamiento, analítica con consentimiento y aceptación formal de Luis Araujo.
