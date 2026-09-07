# Arquitectura — PecadosVip Web

Estado: trabajo en curso, con CMS local de desarrollo/pruebas; no operacional en producción ni autorizado para despliegue.

## Límites del sistema

PecadosVip se plantea como un único sitio responsive, bajo un único origen, con rutas para Madrid, Barcelona y cobertura local confirmada. El servicio público informa y facilita contacto privado para domicilios y hoteles. Esta fase no incluye local físico, checkout, pago ni reserva transaccional.

El sistema se separa en seis responsabilidades:

1. Sitio público Next.js `16.2.11`/Vinext: renderizado, navegación, metadata, `robots.txt` y `sitemap.xml`.
2. Dominio de contenido: ciudades, perfiles, servicios, medios, aprobaciones, legales y configuración.
3. Control de publicación: validación agregada, proyección pública y exclusión de contenido no aprobado.
4. Dominio CMS y adaptadores locales: repositorio en memoria, persistencia JSON, workbench loopback, medios en disco y backup/restore, todos solo para desarrollo y pruebas.
5. Exportación local de candidato: proyección determinista y minimizada para revisión, con manifiesto de integridad y sin consumidor o activador productivo.
6. Adaptadores externos futuros: autenticación, base de datos, almacenamiento de objetos/CDN, contacto, analítica y despliegue. No hay proveedor seleccionado.

Restricciones verificadas:

- Ciudades admitidas: Madrid, Barcelona, Girona, Tarragona, Toledo, Guadalajara y Segovia.
- Estados: `draft`, `hidden`, `published` y `archived`.
- Roles de contrato: `admin` y `editor`; los roles desconocidos se rechazan en runtime.
- Ocho perfiles son carga inicial, no límite de arquitectura.
- Archivar es la eliminación normal; el repositorio local no expone borrado físico.
- La publicación exige referencias vigentes, aprobación, mayoría de edad, consentimiento y derechos.
- La indexación queda cerrada hasta confirmar un origen real y dos aprobaciones explícitas.
- El workbench CMS local solo enlaza loopback, rechaza producción y no añade una superficie administrativa al origen público.
- Los tokens locales deben generarse con al menos 256 bits aleatorios y expresarse como base64url sin relleno; el runtime admite 43–128 caracteres y aplica una comprobación de diversidad que no acredita por sí sola la entropía de origen.
- La persistencia local es texto plano y admite un único proceso escritor por directorio; su exclusión mutua no coordina procesos ni equipos.
- `candidate:export` está restringido a desarrollo/pruebas, marca `productionActivation: false` y no modifica el CMS, el sitio o la configuración de despliegue.
- La configuración de respuesta aplica cabeceras defensivas a `/:path*` y conserva `noindex` mientras las puertas de publicación estén cerradas; no define redirecciones.

## Mapa URL

| Ruta | Propósito | Estado actual |
|---|---|---|
| `/` | Portada general | Borrador implementado; producción bloqueada muestra holding neutral |
| `/madrid` | Landing Madrid | Borrador implementado; producción bloqueada muestra holding neutral |
| `/barcelona` | Landing Barcelona | Borrador implementado; producción bloqueada muestra holding neutral |
| `/girona` | Landing local | Bloqueada por contenido y cobertura |
| `/tarragona` | Landing local | Bloqueada por contenido y cobertura |
| `/toledo` | Landing local | Bloqueada por contenido y cobertura |
| `/guadalajara` | Landing local | Bloqueada por contenido y cobertura |
| `/segovia` | Landing local | Bloqueada por contenido y cobertura |
| `/perfiles` | Listado y filtros GET | UI integrada en código; el runtime actual muestra holding mientras el release está bloqueado; el preview sintético prueba tarjetas/estados, no esta ruta con contenido real |
| `/perfiles/{slug}` | Detalle de perfil | UI integrada; holding mientras el release esté bloqueado y 404 sin perfil publicable después |
| `/contacto` | Contacto o reserva privada | UI integrada sin POST; holding y canales cerrados por el gate agregado |
| `/legal/aviso-legal` | Aviso legal legacy | 404; `/{locale}/legal/aviso-legal` muestra holding hasta release/documento aprobados |
| `/legal/privacidad` | Privacidad legacy | 404; `/{locale}/legal/privacidad` muestra holding hasta release/documento aprobados |
| `/legal/cookies` | Cookies legacy | 404; `/{locale}/legal/cookies` muestra holding hasta release/documento aprobados |
| `/legal/terminos-del-servicio` | Condiciones legacy | 404; `/{locale}/legal/terminos-del-servicio` muestra holding hasta release/documento aprobados |
| `/robots.txt` | Política para crawlers | Implementada; bloquea todo por defecto |
| `/sitemap.xml` | URLs indexables | Implementada; vacía por defecto |
| `/admin/*` | CMS administrativo en el origen público | No existe; no debe confundirse con el workbench loopback local |
| `/preview-local-sintetico` | Harness no público con fixtures | Solo desarrollo loopback mediante `dev:preview`; `noindex`, sin CMS/contacto y 404 en build de producción |
| `/api/*` | API CMS en el origen público | No existe; la API local vive en otro proceso y origen loopback |

El manifiesto contractual parte de tres rutas base (`/`, `/perfiles` y `/contacto`) y añade condicionalmente ciudades, perfiles y documentos legales publicables. Por tanto, “tres rutas base” no significa “solo tres rutas”. Todas quedan no indexables si falla el gate agregado. El build expone las familias implementadas, pero el boundary de producción sustituye su contenido por un holding neutral mientras el gate falle; las rutas legales localizadas conocidas también muestran ese holding, mientras sus equivalentes legacy sin prefijo permanecen 404. El harness `/preview-local-sintetico` es un origen de revisión separado y no representa el runtime público.

La regla `headers()` de `next.config.ts` usa `/:path*`: declara cabeceras para todas las rutas compatibles, pero no cambia la ruta solicitada ni existe una regla `redirects()`. Incluye CSP, COOP, `Permissions-Policy`, `Referrer-Policy`, `nosniff` y denegación de framing. Añade `X-Robots-Tag: noindex, nofollow, noarchive` mientras el origen/aprobaciones/release no habiliten conjuntamente la indexación y lo omite solo cuando esa misma decisión fail-closed permite metadatos indexables. La CSP mantiene excepciones inline por compatibilidad y HSTS queda pendiente de un origen HTTPS/terminador controlado.

### Origen separado del workbench local

`cms:local` inicia un servidor HTTP independiente en `127.0.0.1` y un puerto configurado o efímero. Expone `/` y `/workbench.js` para la interfaz local, `/health` para estado local y `/api/*` para sesión, perfiles, medios y bitácora. Las rutas API requieren un bearer token local; el servidor deriva actor y rol de la configuración server-side, y las mutaciones `POST` exigen el `Origin` loopback exacto. Las cabeceras bloquean indexación, framing y caché. No se permite bind a red externa ni ejecución con `NODE_ENV=production`.

El launcher asigna los actores fijos `local-admin` y `local-editor` a partir de `PECADOSVIP_LOCAL_CMS_ADMIN_TOKEN` y `PECADOSVIP_LOCAL_CMS_EDITOR_TOKEN`. Es un control de capacidad local para desarrollo, no autenticación de identidad, sesión productiva, MFA ni autorización multiusuario.

### Exportador de candidato local

`candidate:export` lee perfiles desde `PECADOSVIP_LOCAL_CMS_DATA_DIR\profiles.json` y un sobre de referencias externo indicado por `PECADOSVIP_PUBLICATION_CANDIDATE_REFERENCES_FILE`. El sobre `pecadosvip.publication-candidate-references` v1 aporta ciudades, servicios y settings; el exportador recompone el snapshot, ejecuta el gate agregado y proyecta únicamente campos públicos y rutas indexables. Rechaza fuentes inseguras/cambiantes, referencias incompletas, medios locales, solapamientos y un destino preexistente.

El destino absoluto `PECADOSVIP_PUBLICATION_CANDIDATE_OUTPUT_DIR` recibe `manifest.json` y `payload/content.json`. Ambos son JSON canónico; el manifiesto `pecadosvip.publication-candidate-manifest` v1 contiene tamaño y SHA-256 de la carga, y los dos sobres declaran `purpose: local-review-only` y `productionActivation: false`. No existe un puerto de importación o activación hacia el runtime público. La lectura estable reduce cambios durante cada archivo, pero no obtiene un snapshot transaccional conjunto de `profiles.json` y referencias; operativamente ambos escritores deben estar detenidos.

## Puertos y adaptadores

El candidato de contenedor añade un adaptador de entrega sin cambiar el dominio: `vinext build` produce `dist/standalone`, un postproceso controlado completa los peers runtime omitidos por Vinext beta y el `Dockerfile` copia únicamente ese árbol a una imagen Node no-root. EasyPanel aportaría la frontera proxy/TLS y ejecutaría `node server.js` sobre `0.0.0.0:3000`. El build y smoke Node locales no acreditan imagen Linux, proxy, TLS, observabilidad ni despliegue. Si se activan bindings D1/R2, este adaptador Node debe rediseñarse porque hoy esos bindings permanecen nulos.

| Puerto lógico | Dirección | Implementación actual | Integración pendiente |
|---|---|---|---|
| `PublicProfileQuery` | Sitio → contenido publicado | Parser URL estricto, filtros GET, paginación, UI y detalle seguro | Fuente productiva persistente, contenido aprobado y conexión explícita; el JSON local no se publica |
| `ProfileRepository` | CMS → perfiles y bitácora | `InMemoryProfileRepository` y `PersistentJsonProfileRepository` local con sobre versionado, escritura atómica y lectura fail-closed | Base de datos transaccional, migraciones y coordinación distribuida |
| `IdentityContext` | Operador → rol | Workbench local deriva actor/rol server-side de tokens configurados; la librería acepta actor opaco | Proveedor de identidad, sesión autenticada, MFA y autorización server-side |
| `Clock` | Repositorio → tiempo | Función inyectable | Reloj de infraestructura |
| `MediaStorage` | CMS → fotos y videos | `LocalMediaStore` en disco con firma, tamaño, SHA-256, metadatos, auditoría y archivo/restauración; el navegador local acepta JPEG/PNG/WebP hasta 5 MiB | Upload productivo, escaneo, objetos, variantes responsive, cifrado y CDN |
| `BackupRecovery` | Estado local → copia verificable | Manifiesto v1 con inventario, tamaños y SHA-256; staging, validación y restauración atómica local | Cifrado, retención, copia externa autorizada, RPO/RTO y simulacros productivos |
| `PublicationCandidateExport` | CMS + referencias → candidato local | JSON canónico minimizado, gate agregado, manifiesto SHA-256, staging y `productionActivation: false` | Revisión/aprobación humana, importador versionado, firma, almacenamiento y promoción de release; hoy no existen |
| `ContactDestination` | Navegador → canal | Variables vacías, esquemas seguros y triple gate: release agregado + contacto + privacidad | URLs/endpoints y documentos aprobados |
| `AnalyticsConsent` | Navegador → analítica | Gate y allowlist runtime de eventos/propiedades | CMP, proveedor y configuración aprobados |
| `SearchPublication` | Sitio → crawlers | SEO fail-closed | Dominio, contenido e indexación aprobados |
| `ReleaseDeployment` | Build → hosting | Build worker, standalone Node validado, `Dockerfile` candidato y smoke loopback fail-closed | Imagen Linux, EasyPanel ligado a SHA/digest, proxy/TLS, observabilidad, rollback y despliegue autorizados |

Los canales previstos son Telegram o WhatsApp por HTTPS, teléfono `tel:`, correo `mailto:` y formulario HTTPS. Permanecen vacíos hasta recibir destinos aprobados.

## Límites de confianza

1. **Internet → sitio público.** El navegador y sus entradas son no confiables. No pueden seleccionar estado, aprobación, actor ni rol CMS.
2. **Sitio público → contenido.** Solo los perfiles y ciudades que superan validación agregada entran al manifiesto y a las proyecciones públicas. Las respuestas públicas omiten IDs internos, aprobaciones, referencias de evidencia y metadatos de derechos.
3. **Operador local → workbench CMS.** Solo loopback es aceptado. El bearer token base64url se compara por digest y determina actor/rol desde configuración server-side; las mutaciones exigen origen exacto. Longitud y diversidad no prueban que el token se haya generado con 256 bits aleatorios. Este mecanismo limita el acceso casual local, pero no autentica personas ni sustituye una sesión productiva.
4. **CMS → persistencia y auditoría.** El adaptador local compone el repositorio de dominio, conserva revisión, índice de slug, replay y eventos, y reemplaza el sobre JSON mediante archivo temporal, `fsync` y renombrado. Una lectura corrupta o de versión desconocida falla cerrada. Locks de archivo adyacentes con creación exclusiva coordinan procesos cooperantes sobre el mismo recurso, pero no son leases distribuidos, no eliminan automáticamente locks obsoletos y no crean una transacción global entre perfiles y medios.
5. **CMS → medios.** El store local valida tipo declarado, firma, límites, tamaño y hash; separa binario y metadatos y registra actor/solicitud opacos. Archivar no borra. Las imágenes se decodifican en variantes WebP acotadas para escritorio y móvil con metadatos eliminados; los MP4 se validan estructuralmente sin transcodificación. Nada de esto publica archivos ni sustituye antivirus o CDN. Los bytes, metadatos y referencias de evidencia quedan en texto plano.
6. **Estado local → backup/restore.** Las rutas deben ser absolutas, no raíz, disjuntas y sin enlaces simbólicos. El manifiesto e hashes aportan integridad, no confidencialidad. Para evitar una captura incoherente entre varios archivos, el único proceso escritor debe estar detenido. La restauración valida antes de reemplazar y materializa `profiles.json` junto a `media/`; requiere autorización explícita para un destino no vacío y no inicia el workbench.
7. **CMS + referencias → candidato local.** Las dos fuentes se comprueban antes y después de leer y el destino se compromete mediante staging/rename. No existe lock interproceso ni transacción conjunta entre fuentes: cambios coordinados o sustituciones de ruta fuera del proceso conservan riesgo residual de concurrencia/TOCTOU.
8. **Sitio → canales y analítica.** Solo se activan destinos aprobados. La analítica no se carga antes de resolver consentimiento y configuración.
9. **Build → producción.** Build, pruebas, candidato local, PR o smoke no equivalen a despliegue ni aceptación. Producción es una frontera independiente con autorización separada.

## Estado de implementación

Implementado y verificado localmente:

- Portada, Madrid, Barcelona, listado de perfiles, detalle seguro y contacto sin POST.
- Contratos tipados de contenido y evidencia.
- Estados, roles runtime, duplicado seguro, archivo/restauración y disponibilidad.
- Revisión optimista, protección contra replay y auditoría local.
- Persistencia JSON local con sobre `pecadosvip.profile-repository` v1, escritura atómica, clones defensivos y validación fail-closed.
- Workbench loopback con actor/rol derivados server-side, bearer token local, comprobación de origen para mutaciones y cierre controlado.
- Almacenamiento local de medios con validación de firma/hash, límites, metadatos, bitácora y archivo/restauración sin borrado físico.
- Backup/restore local con manifiesto `pecadosvip.local-backup` v1, SHA-256 por archivo, staging, rechazo de rutas inseguras, rollback y restauración directa a `profiles.json` + `media/`.
- Exportación `candidate:export` a `manifest.json` + `payload/content.json`, determinista, minimizada, fail-closed y marcada exclusivamente para revisión local.
- Validación agregada y publicación fail-closed.
- Consulta pública de perfiles con parser URL fail-closed, filtros, paginación, detalle y proyección sin metadatos internos.
- Contrato de eventos de analítica deshabilitado sin consentimiento y sin propiedades personales.
- SEO cerrado por defecto.
- Next.js `16.2.11` y cabeceras defensivas fail-closed declaradas para `/:path*`, sin redirección y con HSTS pendiente de infraestructura HTTPS.
- Puerta local `validate` con lint, tipos, batería declarada de pruebas y build; el smoke de producción permanece fail-closed y la evidencia Chromium del UI de borrador es pre-boundary, no prueba del artefacto final.

Parcial o bloqueado:

- Portada definitiva, ciudades restantes y rutas/textos legales.
- CMS productivo, preview público operativo y administración integrada al producto.
- Proveedor de autenticación, base de datos, almacenamiento de objetos, escaneo, optimización multimedia, cifrado y coordinación multiproceso.
- Consumo/promoción del candidato: no existe importador, firma de release ni ruta automática hacia el runtime público o producción.
- Contenido real y evidencia de edad, consentimiento y derechos.
- Cobertura y keywords, dominio, canales, analítica y textos legales.
- Diseño aprobado, QA visual contra mockup, auditoría WCAG completa, E2E desplegado y UAT.
- Merge, hosting y despliegue.

## Riesgos residuales técnicos

- **Concurrencia:** persistencia, medios, backup y exportación asumen un único escritor. No existe lock distribuido, coordinación multiproceso ni transacción conjunta entre archivos.
- **TOCTOU:** se rechazan symlinks y se revalidan archivos, tamaños, identidades y hashes, pero otro actor con acceso al filesystem puede competir entre comprobaciones. Las rutas deben ser locales, dedicadas y con el workbench detenido durante backup, restore y exportación.
- **Cabeceras:** la configuración es defensiva y global, pero no prueba que un proxy/CDN las conserve. CSP permite inline por compatibilidad y HSTS depende de HTTPS externo.
- **Infraestructura externa:** faltan IdP, secretos gestionados, DB transaccional, objetos/CDN, cifrado, retención, observabilidad, RPO/RTO, staging y operación multiusuario. Ningún control local sustituye esas capacidades.

La clasificación de rutas y los límites de la referencia competitiva se detallan en `REFERENCE_RESEARCH.md`; la medición condicionada a consentimiento se define en `MEASUREMENT_SPEC.md`.

## Criterios de integración

Una integración productiva solo es aceptable cuando:

1. Identidad y rol se resuelven server-side.
2. El adaptador persistente conserva unicidad, revisión esperada, archivo recuperable, replay y auditoría.
3. Cada mutación y evento se confirma atómicamente.
4. Publicar valida el agregado contra ciudades y servicios vigentes.
5. Preview, borradores y archivados requieren autorización y nunca son indexables.
6. Los medios usan upload validado, almacenamiento autorizado, variantes responsive y evidencia de derechos.
7. Backup, restauración, cifrado, retención, control de acceso y pruebas de recuperación cumplen RPO/RTO aprobados.
8. El manifiesto de rutas alimenta navegación, sitemap, canonicales y datos estructurados.
9. Contacto y analítica siguen deshabilitados hasta tener destinos, finalidad y consentimiento aprobados.
10. Checkout o pago requieren un cambio de alcance aprobado.
11. Instalación limpia, tests, build, crawl, navegador, accesibilidad, seguridad, rendimiento y UAT pasan sobre el artefacto versionado.
12. Luis Araujo acepta el release y autoriza separadamente merge o despliegue.

## Decisiones pendientes de Luis

- Diseño visual definitivo.
- Cobertura real y prioridades SEO por ciudad.
- Perfiles, medios y evidencias de edad, consentimiento y derechos.
- Dominio canónico y autorización de indexación.
- Canales reales y endpoint de formulario.
- Textos legales, política de cookies, analítica y edad.
- Hosting y proveedores de autenticación, base de datos, almacenamiento/CDN y analítica.
- Usuarios y roles administrativos, retención, backups y recuperación.
- Aceptación del incremento, merge y despliegue.
