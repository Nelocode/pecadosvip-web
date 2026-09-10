# Traducción automática, botones de contacto y mecánica legal

Estado: implementado, integrado en `main` y verificado sobre `86925da`. Las pruebas PHP
se ejecutan en local con PHP 8.3.33 y pasan (66 + 49 + 31 aserciones), y `php -l` no
encuentra errores en los 20 archivos del tema y del plugin. El paso 8 del CI sigue
fallando, pero es una rotura previa de `77ea878` ajena a esta entrega.
No es asesoría jurídica, no incluye los datos del titular y no activa nada por sí solo.

## 1. Traducción automática de contenido no Legacy

### Qué hace

Traduce del español al inglés, francés e italiano las **páginas informativas** y los
**perfiles de modelos** que no forman parte del inventario Legacy. Al existir el perfil
traducido y publicado, la ficha aparece en los cuatro idiomas y el selector de idioma
deja de ocultar ese idioma.

Evidencia del hueco que cierra, observada el 10/09/2026 en producción:

| URL | Antes |
| --- | --- |
| `https://pecadosvip.com/es/perfiles/maria` | 200, único perfil publicado |
| `https://pecadosvip.com/en/perfiles` | 200 con «No profiles match this selection.» |
| `https://pecadosvip.com/en/perfiles/maria` | 404 |

### Cómo se usa

**PecadosVip → Traducción automática** (solo administradores):

1. Pulsa **Habilitar traducción automática**. En ese momento se congela el inventario
   Legacy (identidades anteriores a la ficha Maria, ID 465) y se guarda la política.
2. Decide la casilla **Publicar automáticamente las traducciones creadas**:
   - activada: el perfil traducido queda publicado y se muestra en los cuatro idiomas;
   - vacía: se guardan borradores para revisión y el perfil no aparece hasta publicarlo.
3. Pulsa **Traducir automáticamente lo pendiente**. Se traduce toda la cola sin
   seleccionar página a página. Deja el selector en «Toda la cola pendiente».
4. Con **Publicar borradores de traducción existentes** se publican de una vez los
   borradores creados por esta herramienta.

El motor es el traductor local del navegador (Chrome o Edge de escritorio). No usa API
de pago, no hay traducción en segundo plano y **no hay que habilitar destinos en
TranslateRocket**: los registros se crean como contenido nativo por `pv_locale`, que es
justo lo que evita el conflicto conocido entre los destinos de TranslateRocket y el
router del tema. La herramienta exige que TranslateRocket siga con origen español, sin
destinos y sin proveedor.

### Garantías

- El inventario Legacy se congela por identidad lógica y nunca se traduce.
- Una versión existente (borrador, privada, manual o antigua) **nunca** se reemplaza ni
  se republica: se cuenta como «protegida».
- Servicios y ciudades quedan fuera del proceso.
- El nombre artístico del perfil es un nombre propio: se conserva sin traducir.
- La publicación no se acepta desde el navegador; se lee de la política guardada.
- Si la fuente cambia durante el proceso, la traducción no se publica y queda en borrador.
- Una política de un alcance anterior se amplía conservando el inventario Legacy.

### Límites

- `tests/selective-translation-test.php` pasa en local con PHP 8.3.33 (66 aserciones) y en
  el CI, pero la QA completa de WordPress Docker sigue sin ejecutarse en local.
- La QA de WordPress real no se ejecutó: no está acreditado el guardado y refresco en
  una instalación completa.
- Los perfiles Legacy ya existen traducidos porque la semilla los creó en los cuatro
  idiomas; esta función afecta al contenido creado después.

## 2. Botones de contacto

**PecadosVip → Botones de contacto**. Cinco canales (WhatsApp, Telegram, teléfono,
correo y formulario) más un **canal de reporte**.

Cada canal tiene un destino y un interruptor. Un destino se guarda **vacío** si no
cumple el esquema, nunca se acepta un valor dudoso:

| Canal | Formato admitido |
| --- | --- |
| WhatsApp | `https://wa.me/…` o `https://api.whatsapp.com/…` con ruta |
| Telegram | `https://t.me/…` o `https://telegram.me/…` con ruta |
| Teléfono | `tel:+…` |
| Correo | `mailto:…` |
| Formulario | `https://…` sin credenciales ni fragmento |
| Reporte | `mailto:…` o `https://…` |

Se convierte en enlace solo si el destino es válido **y**:

- la aprobación de canales está marcada, **y**
- la identificación del prestador está completa y aprobada (canales ordinarios).

El **canal de reporte está exento del segundo requisito**: sirve para comunicar contenido
usado sin permiso, suplantación, menores, explotación, coacción o vulneración de derechos
de datos, y debe seguir accesible antes de cualquier barrera de edad. Sigue exigiendo la
aprobación, para que ningún destino sin revisar se publique.

Mientras falte algo, el tema muestra el bloque desactivado con aviso y sin abrir ningún
canal. El estado y la lista de bloqueos aparecen en la propia pantalla de administración.

## 3. Mecánica legal española

**PecadosVip → Legal y privacidad**. Implementa el mecanismo; **no redacta** los
documentos ni inventa datos.

### Identificación del prestador (LSSI art. 10)

Campos obligatorios: denominación social, NIF/CIF, domicilio y correo de contacto
directo; además el responsable jurídico que aprueba. Opcionales: nombre comercial,
teléfono, datos registrales y titular del dominio. Se muestran en el pie de todas las
páginas y en el aviso legal, de forma permanente y gratuita, **solo** cuando están
completos y la aprobación está marcada.

### Documentos legales

Aviso legal, privacidad, cookies y términos, en los cuatro idiomas, editables desde
**Páginas de la web** y **Textos y diseño**. Mientras falte el intake, cada documento
muestra «Documento pendiente de aprobación» con la lista de datos que faltan, y el
documento legal **no es indexable**.

La política de privacidad se publica **por capas**: resumen (extracto editable), detalle
(contenido completo) y derechos, con acceso permanente al documento completo.

### Cookies

Inventario editable (nombre, proveedor, finalidad, duración y categoría) y
documentación de la analítica prevista. El aviso con aceptar / rechazar / configurar
**solo aparece si hay realmente una cookie no esencial inventariada y el intake está
aprobado**: no se añade un banner ficticio. La política de cookies incluye un botón
permanente de **cambio de decisión**. Ninguna cookie no esencial se carga antes del
consentimiento; el JS solo registra la decisión y anuncia el evento
`pvn:cookie-consent`, y expone `window.PecadosVipConsent.granted(category)`.

El consentimiento se guarda en el navegador (`localStorage`), versionado por la versión
de la política. **No hay prueba de consentimiento en servidor**: para analítica real hace
falta un CMP y un contrato con el proveedor.

### Control de acceso de personas adultas

Implementado **en el servidor** en `theme/pecadosvip/inc/age-access.php`, desactivado por
defecto.

- Solo autoriza contenido un adaptador externo que confirme una sesión verificada
  mediante el filtro `pvwp_age_verified_session`: `verified === true`,
  `threshold === 18` y `expires_at` entero, futuro y con menos de 12 horas de validez.
- **No** acepta cookie, parámetro, `User-Agent` ni autodeclaración como prueba, y no
  recibe documentos de identidad ni fechas de nacimiento.
- Falla cerrado ante adaptador ausente, excepción o resultado mal formado.
- Sin autorización responde 403 con una pantalla neutra en el idioma de la ruta, sin
  `wp_head`, sin scripts, sin imágenes y con CSP `default-src 'none'`.
- Los **documentos legales y el canal de reporte siguen accesibles** sin probar la edad.
- Añade `no-store`, `Referrer-Policy: no-referrer` y `X-Robots-Tag: noindex`.

Diseño alineado con la propuesta previa `output/legal-ue-20260910/proposal/age-access.php`
y con `output/legal-ue-20260910/REQUISITOS-OPERATIVOS.md`. Una casilla de 18+ en el
navegador **no** se considera verificación de edad y no se ha implementado como tal.

**Consecuencia de activarlo sin adaptador**: todo el contenido pasa a 403 y solo quedan
visibles la pantalla neutra, los documentos legales y el canal de reporte. Es el
comportamiento correcto y esperado, pero cierra el sitio a visitantes.

### Lo que esta entrega NO hace

- No identifica al prestador: los datos siguen pendientes por instrucción expresa.
- No selecciona ni integra un verificador de edad.
- No protege los archivos originales servidos por el servidor web: eso corresponde a la
  capa de contención (`wordpress/protection/`) y a la revisión de proxy/CDN.
- No cubre la información precontractual de reservas y pagos, ni la calificación de la
  publicidad, ni derechos de imagen, ni consentimiento de las personas de los perfiles.
- No acredita cumplimiento jurídico: toda implicación material requiere asesoría.

## Verificación reproducible

```powershell
cd wordpress
npm run build
npm run verify
```

La verificación estática exige ahora paridad de **166 textos editables** en es/en/fr/it,
los contratos de contacto, legal y acceso adulto, y un equilibrio de delimitadores PHP
(no es un lint de PHP). Las pruebas funcionales se ejecutan en la QA Docker:

```powershell
node qa/docker.mjs test
```

que ahora incluye `localized-records-test.php`, `apply-translations-test.php`,
`selective-translation-test.php`, `contact-legal-test.php` y `age-access-test.php`.

## Perfiles en todos los idiomas

Un perfil publicado solo en español **no desaparece** de los demás idiomas. El listado, la
ficha y el selector de idioma completan el idioma con el registro de origen y lo declaran
como no traducido (`Sin traducir` / `Not translated`), en lugar de ocultarlo o devolver
404. Vive en `plugin/pecadosvip-content/includes/localized-records.php`, se aplica solo a
perfiles y el catálogo público conserva la semántica estricta por idioma.

Eso garantiza **visibilidad**, no traducción. Para tener los textos traducidos hay dos
caminos:

1. **Traductor del navegador** — `PecadosVip → Traducción automática` desde una sesión con
   Chrome o Edge de escritorio. Es el camino normal.
2. **Aplicador offline** — `tools/apply-profile-translations.php`, para cuando no hay
   navegador disponible:

```powershell
wp eval-file wordpress/tools/apply-profile-translations.php
PVC_TRANSLATE_PUBLISH=1 wp eval-file wordpress/tools/apply-profile-translations.php
PVC_TRANSLATIONS=/ruta/al/mapa.json wp eval-file wordpress/tools/apply-profile-translations.php
```

Lee `tools/profile-translations.json` (mapa revisable con el cuerpo, el extracto y los
idiomas hablados mapeados por valor de origen). Nunca sobrescribe una versión existente en
ningún estado, crea **borradores** salvo que `PVC_TRANSLATE_PUBLISH=1` lo pida
explícitamente, valida cada registro con las reglas del plugin, guarda la procedencia
(`_pvc_lt_engine = offline-map`) y **se niega** si el cuerpo tiene un número de nodos de
texto distinto del mapa en vez de adivinar. Cubierto por
`tests/apply-translations-test.php` (23 aserciones).

## Traducción automática al publicar una modelo nueva

`plugin/pecadosvip-content/includes/auto-translation.php`. Al publicar por primera vez un
perfil en español que no sea Legacy, se crean solas las versiones que falten. **No hace
falta abrir nada, ni claves, ni pestañas**: el traductor vive en el servidor.

### Traductor propio, sin APIs ni servicios externos

`plugin/pecadosvip-content/includes/offline-translation.php` es el motor y
`plugin/pecadosvip-content/includes/offline-glossary.php` el vocabulario: **426 entradas**
organizadas por temas (personas, carácter, aspecto físico, origen, servicios, lugares,
sentimientos, conectores e idiomas hablados). Se amplía sin tocar código con la opción
`pvc_lt_glossary` (español → en/fr/it).

Reglas del glosario:

- **Cada variante de género se escribe explícitamente.** El motor no deduce
  concordancia: si falta `apasionado` porque solo está `apasionada`, la frase entera deja
  de estar completa y la traducción se queda en borrador.
- **Las frases compuestas ganan a sus palabras sueltas.** `a domicilio`, `masaje tántrico`
  o `de ojos claros` se resuelven enteras, lo que evita que un conector suelto produzca
  una traducción que cuenta como completa pero se lee mal en francés o italiano.
- Las claves se normalizan al cargar, así que tildes y mayúsculas dan igual: `Espontánea`,
  `espontanea` y `espontánea` resuelven a la misma entrada.

Ejemplos reales:

```
ES: Carismática, romántica.
   en: Charismatic, romantic.                      [100 %]
   fr: Charismatique, romantique.                  [100 %]
   it: Carismatica, romantica.                     [100 %]

ES: Morena de ojos claros y piel clara
   en: Brunette with light eyes and fair skin      [100 %]
   fr: Brune aux yeux clairs et peau claire        [100 %]
   it: Bruna con occhi chiari e pelle chiara       [100 %]

ES: Reserva por horas, sin prisa
   en: Booking by the hour, without rushing        [100 %]
   fr: Réservation à l’heure, sans se presser      [100 %]
   it: Prenotazione a ore, senza fretta            [100 %]
```

```
ES: Carismática, romántica y elegante.
   en: Charismatic, romantic and elegant.        [cobertura 100 %]
   fr: Charismatique, romantique et élégante.    [cobertura 100 %]
   it: Carismatica, romantica e elegante.        [cobertura 100 %]

ES: Inglés, Español, Italiano, Francés
   en: English, Spanish, Italian, French
   fr: Anglais, Espagnol, Italien, Français
   it: Inglese, Spagnolo, Italiano, Francese
```

**Límite honesto:** traduce vocabulario, no prosa. No reordena la frase ni resuelve la
concordancia de género y número; `Presencia sofisticada y natural` sale como
`Presence sophisticated and natural`. Por eso cada segmento informa de su **cobertura**:

- cobertura completa → la traducción se publica (si la política lo permite);
- cobertura incompleta → **nunca se publica**: queda en borrador marcada
  `_pvc_lt_review = incomplete`, con su cobertura real en `_pvc_lt_coverage`;
- si no se reconoce nada, no se escribe ningún registro: el perfil sigue visible con el
  respaldo de idioma y declarado como no traducido.

Nunca hace red: no hay `wp_remote_*`, ni `curl`, ni URLs. El verificador lo comprueba.

### Caminos alternativos

1. **Motor en servidor** (sin intervención ninguna). Configura un endpoint compatible con
   OpenAI en la opción `pvc_lt_engine` (`provider`, `endpoint`, `model`, `api_key`), o
   conecta tu propio traductor con el filtro:

   ```php
   add_filter('pvc_lt_translate_text', fn($v, $texto, $origen, $destino) => mi_api($texto, $origen, $destino), 10, 4);
   ```

2. **Motor del navegador** (gratis y privado). En **PecadosVip → Traducción automática**,
   marca **«Traducir automáticamente lo nuevo mientras esta pestaña siga abierta»** y
   pulsa el botón una vez para preparar el traductor. A partir de ahí cada modelo nueva se
   traduce sola mientras la pestaña siga abierta; al cerrarla, se detiene.

Garantías, con cualquier motor:

- Solo se dispara en la **primera publicación** de un registro de origen no Legacy.
- Una traducción generada lleva `_pvc_lt_source` y **no puede disparar otra ejecución**: no
  hay bucles.
- Una versión existente **nunca** se sobrescribe, en ningún estado.
- Al motor solo se le envía **texto del editor**, segmento a segmento, nunca la página.
- Si el motor devuelve el texto sin cambios (o falla), **no se escribe nada**: una copia
  del original jamás se guarda como traducción. Sin motor, el módulo queda inerte y la
  visibilidad la cubre el respaldo de idioma descrito arriba.
- Se respeta el modo de publicación de la política: borradores salvo que la publicación
  automática esté activada.

Cubierto por `tests/auto-translation-test.php` (18 aserciones), que detectó que el hook
ignoraba un proveedor conectado por filtro.
