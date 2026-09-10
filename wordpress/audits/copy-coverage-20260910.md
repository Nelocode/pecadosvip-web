# Auditoría de cobertura de copia editable — 2026-09-10

Base: `f939b926c64b358a57116335719383d640dd57a0`, rama `main`, clon independiente. Seed real construido: `wordpress/dist/pecadosvip/content/seed.json`, generación inicial `2026-09-10T22:26:37.286Z`, SHA-256 `ddbfa8e59fa255068f6436d6d13b150b5f49f04823c42c7a1306b1f829fb17b9`.

**No falta ninguna clave requerida por las rutas enumerables revisadas en es, en, fr o it.** Se comprueban 234 rutas, incluidas 182 llamadas literales y seis dinámicas, además de colecciones y propiedades exportadas a JavaScript. Los contenedores también cuentan: no son 234 traducciones nuevas.

## Método

`verify-native.mjs` recorre recursivamente el PHP del tema y entrega PHP, JavaScript y esquemas del plugin a `verify-copy-coverage.mjs`. Valida texto no vacío, existencia de valores estructurados y la lista blanca pública de `pvc_copy`. Une claves de los cuatro idiomas, sin tomar español como único dominio.

Disponibilidades: router, enum de `pvc_fields` y registros semilla. Familias de servicios: cuatro copias y grupos referenciados por todos los registros semilla. Canales y categorías de cookies: esquemas del plugin. Campos del proveedor: mapa del tema y `pvc_legal_provider_fields`. Mapas, navegación y listas: todos sus miembros actuales.

Una expresión dinámica de `pvwp_text`, `pvwp_label` o `pvwp_value` no registrada, o un acceso JS `hub[...]`/`ui[...]`, hace fallar la comprobación y exige revisar su dominio. Es un escáner acotado, no un intérprete PHP ni una prueba del renderizado de WordPress.

## Tabla de cobertura

`{a,b}` significa cada variante indicada; dos conjuntos forman su producto cartesiano. Archivos relativos a la raíz Git. Todas las filas se verificaron en es/en/fr/it.

| Clave de copia / variantes completas | Idiomas donde falta | Archivo y línea de uso |
| --- | --- | --- |
| `filters.availability.{available,limited,on-request,unavailable}` | Ninguno | `wordpress/theme/pecadosvip/inc/render.php:188`; selector en `:197` |
| `profile.availability.{available,limited,on-request,unavailable}` | Ninguno | `wordpress/theme/pecadosvip/inc/render.php:243` |
| `services.groups.{company,couples,private-preferences,roleplay,settings,wellbeing}.label` | Ninguno | `wordpress/theme/pecadosvip/inc/render.php:31` |
| `navigation.{home,zones,profiles,services,contact}` | Ninguno | `wordpress/theme/pecadosvip/inc/render.php:110` y `:116` |
| `contact.channels.whatsapp` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:15` |
| `contact.channels.telegram` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:16` |
| `contact.channels.phone` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:17` |
| `contact.channels.email` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:18` |
| `contact.channels.form` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:19` |
| `contact.channels.report` | Ninguno; existe, pero el helper no la utiliza | `wordpress/theme/pecadosvip/inc/contact-legal.php:193`; helper en `:13` |
| `legal.provider.{name,taxId,address}` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:68`; lectura en `:72` |
| `legal.provider.{email,tradeName,phone}` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:69`; lectura en `:72` |
| `legal.provider.{registry,domainOwner,approver}` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:70`; lectura en `:72` |
| `legal.documents.aviso-legal.{title,intro}` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:76`; lectura en `:82` |
| `legal.documents.privacidad.{title,intro}` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:77`; lectura en `:82` |
| `legal.documents.cookies.{title,intro}` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:78`; lectura en `:82` |
| `legal.documents.terminos-del-servicio.{title,intro}` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:79`; lectura en `:82` |
| `legal.cookies.categories.{essential,analytics,marketing}` | Ninguno | `wordpress/theme/pecadosvip/inc/contact-legal.php:119`, `:130`, `:206`, `:214` |
| `trustSignals.{0,1,2,3}.{code,title,detail}` | Ninguno | `wordpress/theme/pecadosvip/inc/render.php:147` |
| `services.faqs.{0,1,2,3}.{question,answer}` | Ninguno | `wordpress/theme/pecadosvip/inc/render.php:219` |
| `security.items.{0,1,2,3}` | Ninguno | `wordpress/theme/pecadosvip/inc/render.php:267` |
| `languageName` | Ninguno | `wordpress/theme/pecadosvip/inc/render.php:127` |
| `nativeUi.{pause,play}` | Ninguno | `wordpress/theme/pecadosvip/assets/frontend.js:66` |
| `nativeUi.remove` | Ninguno | `wordpress/theme/pecadosvip/assets/frontend.js:130` |
| `nativeUi.selected` | Ninguno | `wordpress/theme/pecadosvip/assets/frontend.js:142` |
| `services.hub.{resultSingular,resultPlural}` | Ninguno | `wordpress/theme/pecadosvip/assets/frontend.js:116` |
| `services.hub.{removeFromSelection,addToSelection}` | Ninguno | `wordpress/theme/pecadosvip/assets/frontend.js:130` y `:138` |
| `services.hub.{selectionTitle,selectionEmpty}` | Ninguno | `wordpress/theme/pecadosvip/assets/frontend.js:142` |
| `services.hub.selectionLimit` | Ninguno | `wordpress/theme/pecadosvip/assets/frontend.js:152` |

`contact.channels` usa un switch; `legal.provider`/`legal.documents`, mapas. Son dominios enumerables aunque no estén concatenados. Los grupos se exportan a JS desde `wordpress/theme/pecadosvip/functions.php:116`.

## Hallazgo de uso, no ausencia de seed

`pvwp_contact_label()` carece del caso `report`. Cuando `pvwp_legal_report()` lo invoca, devuelve `$channel`. Si el canal está activo, aparece `report` en los cuatro idiomas aunque exista `contact.channels.report`. El verificador lo informa como advertencia. No se alteró el tema, ni canales, destinos, permisos o activación.

## Pruebas y salida real

Desde la raíz del clon:

```powershell
node wordpress/tests/copy-coverage.mjs
node --check wordpress/verify-copy-coverage.mjs
node --check wordpress/verify-native.mjs
npm --prefix wordpress run build
npm --prefix wordpress run verify
```

Salida de la suite:

```json
{"result":"PASS","tests":32,"locales":["es","en","fr","it"],"network":false,"runtimeWordPress":false}
```

Ambos `node --check` finalizaron con código 0, sin salida. Las pruebas detectan pérdida en cada idioma y en los cuatro a la vez, variante añadida solo al esquema, grupo referenciado sin etiqueta, rama añadida solo en italiano, tipos incorrectos, texto vacío, listas vacías, proveedor sin mapa, clave oculta por la lista blanca y expresiones dinámicas nuevas. Usan fixtures neutros sin editar `dist/`.

El build y verificador iniciales dieron:

```text
result: PASS_STATIC
seedRecords: 224
mediaAssets: 72
editableTemplatePaths: 234
literalCalls: 182
dynamicCalls: 6
problems: []
warning: contact.channels.report — helper returns raw channel name instead of the existing copy
```

La ejecución directa del helper sobre el mismo seed confirmó 234 rutas, cero problemas y la misma advertencia. Las salidas completas y los SHA finales acompañan los parches en la entrega del integrador. El seed se regenera al cambiar HEAD, por lo que su hash inicial anterior identifica esa ejecución concreta.

## Límites y supuestos

No se tradujo ni modificó contenido, Legacy, política, protección, workflows, contacto o producción. Sin Docker, APIs, dependencias nuevas ni edición manual de `dist/`.

El seed cubierto no acredita una base de datos migrada: eso lo aborda la Tarea 1. No evalúa precisión lingüística, texto libre futuro, registros personalizados no inspeccionados ni E2E. `services.groups` admite valores editoriales futuros; se cubre todo lo incluido o referenciado por este seed, no valores arbitrarios posteriores. Textos de errores, avisos de contenido sin traducir y nombres de vídeo codificados directamente en PHP son copia interna del tema, no claves editables del seed, y no se reescribieron.
