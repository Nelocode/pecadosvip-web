# Paquete multilingüe ES/EN/FR/IT

## Estado y alcance

Este directorio contiene una fuente estructurada para internacionalizar la **UI pública estática** de PecadosVip en los locales base `es`, `en`, `fr` e `it`. No se ha inferido ninguna región.

- `es` es el catálogo fuente extraído de la implementación local y sigue pendiente de aprobación editorial definitiva.
- `en`, `fr` e `it` son borradores traducidos con asistencia de IA. Su estado es **PENDIENTE DE REVISIÓN HUMANA**.
- El runtime local consume catálogos tipados y expone rutas prefijadas para los cuatro locales. Las rutas heredadas sin prefijo permanecen `noindex`.
- `audit.json` y `audit-report.md` registran la comparación determinista actual: **0 hallazgos** en el paquete de catálogos.
- Ese resultado no acredita UI renderizada, rutas desplegadas, recorridos, calidad lingüística en contexto ni aptitud para publicación.

La aprobación lingüística exige para cada versión: fuente aprobada y con hash, traducción o posedición por persona competente, segundo revisor independiente, trazabilidad por segmento y nueva revisión cuando cambie el original. Los textos jurídicos, de privacidad y consentimiento necesitan además especialista sectorial.

## Archivos

- `catalogs/es.json`, `en.json`, `fr.json`, `it.json`: misma estructura y mismas claves para la UI estática.
- `allowlist.txt`: marca, endónimos, canales, unidades, ciudades, distritos, municipios y códigos que pueden permanecer sin traducir.
- `content-contracts.json`: invariantes numéricas actuales —mayoría de edad y coordenadas— para el comparador determinista.
- `route-inventory.json`: grupos equivalentes obligatorios. Con la estrategia `locale-prefix`, la ruta `/madrid` representa `/{locale}/madrid`.
- Las familias `/servicios` y `/servicios/{slug}` existen en los cuatro prefijos. El contenido dinámico de detalle sigue cerrado fuera de ES hasta contar con traducción y aprobación trazables; la paridad de ruta no autoriza un fallback silencioso.
- `audit.json` y `audit-report.md`: evidencia de la comparación determinista del paquete; no sustituyen auditoría DOM, revisión humana o especialista legal.

## Dictámenes vigentes

| Eje | Dictamen | Motivo principal |
|---|---|---|
| Técnico multilingüe local | `PASS WITH LIMITS` | Repositorio/catálogos y standalone Chromium cubren ES/EN/FR/IT, rutas holding/legal/404 y overflow a 320/390/768/1440 px; faltan despliegue, dispositivos físicos y tecnología asistiva. Evidencia: `output/playwright/pv98-i18n/smoke-summary.json`. |
| Lingüístico | `PENDIENTE DE REVISIÓN HUMANA` | No existe manifiesto de traducción/posedición y segundo revisor independientes. |
| Publicación | `NO DETERMINABLE POR FALTA DE EVIDENCIA` | Faltan revisión humana, especialista legal, staging y despliegue verificable. |

Los 0 hallazgos de catálogo y el retest local solo acreditan sus alcances expresos. No convierten ninguno de esos dictámenes en `APTO`, `CONFORME` ni publicación autorizada.

## Esquema exacto de los catálogos

Las cuatro raíces son idénticas:

```text
meta
  titleTemplate, siteName
  default
    readyTitle, holdingTitle, readyDescription, holdingDescription
    keywords[]
    socialImageAlt
  home: title, description
  profiles: title, description
  profile: unavailableTitle, unavailableDescription
  contact: title, description
  legal: unpublishedTitle, publishedDescription, unpublishedDescription
  cities
    madrid|barcelona
      title, description, openGraphDescription, twitterDescription, imageAlt
layout
  skipLink
navigation
  brandHomeAria, primaryAria, mobileAria
  home, madrid, barcelona, profiles, privateContact, contact
languageSelector
  label, ariaLabel, currentLanguage
  options: es, en, fr, it
holding
  eyebrow, title, body
notice
  title, body
home
  hero
    eyebrow, title, titleAccent, body, profilesCta, contactCta, artLabel
  trust
    ariaLabel
    items[]: code, text
  cities
    eyebrow, title, body, madridCode, barcelonaCode, cardCta
  profiles
    eyebrow, title, openCatalog, emptyTitle, emptyBody
  finalContact
    eyebrow, title, cta
cityUi
  structuredData: serviceName, serviceType
  hero
    availabilityCta, howItWorksCta, trustAria
    trustItems[]: code, text
  ageRibbon: ariaLabel, adultOnly, deliveryOnly
  principles[]: code, title, body
  priorityAvailability
  otherAreas: label, body
  processLabel, discretionLabel
  manifesto: imageAlt, label, body
  faq: label, title, body
  contactLabel
cities
  madrid|barcelona
    slug, city, regionLabel, kicker, headline, headlineAccent, lead
    coordinates[]
    introEyebrow, introTitle, introBody[]
    areaEyebrow, areaTitle, areaIntro
    highlights[]: code, name, note
    locations[]
    processTitle, processIntro
    steps[]: title, text
    discretionTitle, discretionText
    faqs[]: question, answer
    closingTitle, closingText
profiles
  eyebrow, title, intro
  filters
    legend, ageHelp, city, allCities, availability, allAvailability
    minimumAge, maximumAge, apply
  availability: available, limited, unavailable, onRequest
  results
    title, count, invalidTitle, invalidBody, reset
    filteredEmptyTitle, filteredEmptyBody
    unpublishedTitle, unpublishedBody
  card
    ageYears, statusPrefix, viewProfile, viewProfileAria
    syntheticView, syntheticViewAria
profile
  galleryAria, publishedEyebrow, ageYears
  measurements: heightCm, weightKg, bustCm, waistCm, hipsCm
  units: centimeters, kilograms
  servicesTitle
contact
  eyebrow, title, body
  safety
    title
    items[]
contactOptions
  title
  channels: whatsapp, telegram, phone, email
  unavailableSuffix, enabledMessage, disabledMessage
footer
  brandHomeAria, tagline, linksAria, publicationStatusAria
  adultOnly, legalApproved, legalPending
legal
  approvedEyebrow, updatedLabel
  documents: legalNotice, privacy, cookies, serviceTerms
```

Los placeholders forman parte del contrato y deben conservarse exactamente: `{title}`, `{language}`, `{city}`, `{minAge}`, `{maxAge}`, `{count}`, `{age}`, `{name}` y `{date}`. `profiles.results.count` usa ICU plural.

## Decisiones de rutas

Las rutas públicas obligatorias son:

```text
/{locale}
/{locale}/madrid
/{locale}/barcelona
/{locale}/perfiles
/{locale}/perfiles/{slug}
/{locale}/contacto
```

Los slugs funcionales se mantienen invariantes en esta primera arquitectura para preservar una equivalencia determinista. Traducir slugs requiere una matriz editorial independiente y redirecciones verificadas; no se improvisó aquí.

Las siguientes rutas legales también son obligatorias en todos los locales:

```text
/{locale}/legal/aviso-legal
/{locale}/legal/privacidad
/{locale}/legal/cookies
/{locale}/legal/terminos-del-servicio
```

Solo se incluyeron etiquetas de interfaz para esos documentos. **No existen cuerpos legales aprobados y no se inventaron traducciones.** Todas las rutas legales deben permanecer bloqueadas/no publicables hasta recibir el cuerpo fuente aprobado, traducción o posedición competente, segundo revisor independiente y especialista jurídico/privacidad/consentimiento según corresponda.

`/perfiles/{slug}` es una plantilla de cobertura. Antes de auditar un sitio con `audit_site.py`, el inventario debe expandirse con cada slug público concreto; una URL literal con `{slug}` no es una prueba navegable.

## Contenido dinámico pendiente

Los catálogos cubren etiquetas y copy estático. No traducen ni aprueban datos dinámicos inexistentes o no suministrados:

- nombres públicos, biografías y servicios de perfiles;
- alt de medios cargados desde el CMS;
- cuerpos legales;
- mensajes externos, correos, SMS o chatbots;
- precios, pagos o condiciones comerciales no presentes en la fuente actual.

El modelo de contenido deberá almacenar estos campos por locale y conservar sus aprobaciones/hashes. El array `profile.languages` existente describe idiomas declarados para un perfil; no debe reutilizarse como catálogo de UI.

El runtime aplica este límite de forma fail-closed: fuera de ES, perfiles dinámicos y cuerpos legales sin traducción aprobada permanecen cerrados. No se muestra español como fallback silencioso.

## Validación reproducible

Ejemplo desde la raíz del repositorio, usando la skill local actual:

```powershell
$multilingualSkillRoot = 'C:\Users\artot\.codex\skills\auditar-web-multilingue'

python "$multilingualSkillRoot\scripts\compare_locales.py" `
  --source-locale es `
  --locales es,en,fr,it `
  --catalog es=compliance/multilingual/catalogs/es.json `
  --catalog en=compliance/multilingual/catalogs/en.json `
  --catalog fr=compliance/multilingual/catalogs/fr.json `
  --catalog it=compliance/multilingual/catalogs/it.json `
  --allowlist compliance/multilingual/allowlist.txt `
  --content-contracts compliance/multilingual/content-contracts.json `
  --output-json compliance/multilingual/audit.json `
  --output-markdown compliance/multilingual/audit-report.md `
  --overwrite

python "$multilingualSkillRoot\scripts\validate_report.py" validate `
  --input compliance/multilingual/audit.json `
  --enforce-gate `
  --json
```

No añadas `--review-manifest` hasta disponer de evidencia humana real. Mientras falte, el dictamen lingüístico correcto es `PENDIENTE DE REVISIÓN HUMANA` y la publicación multilingüe permanece bloqueada. Un exit code `1` o `3` en ese estado puede ser una puerta coherente; no debe reetiquetarse como `pass`.

Además, desde la raíz del repositorio ejecuta `pnpm run i18n:validate`. Antes de publicar, repite la auditoría sobre DOM/rutas reales en staging para los cuatro locales y añade pruebas de overflow, teclado, tecnología asistiva y revisión lingüística/legal competente.
