# Design QA — experiencia de servicios PecadosVip

Fecha de cierre local: 2026-08-30

## Alcance verificado

- Referencia visual y funcional capturada desde la página de servicios de Felina BCN en escritorio y móvil.
- Inventario de referencia conservado en `docs/reference/felina-route-inventory.json`: 751 rutas únicas observadas (732 en sitemaps y 19 solo en la navegación renderizada).
- Mapa de patrones adaptables y exclusiones conservado en `docs/reference/felina-functional-map.md`.
- Implementación original de PecadosVip con 34 rutas de servicios propias y sin reutilizar los slugs de servicios de la referencia.
- Cuatro proyecciones completas de contenido del preview: español, inglés, francés e italiano.
- Rutas públicas preparadas bajo `/servicios` y `/{locale}/servicios`, sujetas a los controles de publicación existentes.
- Las 751 rutas del referente quedaron inventariadas como evidencia arquitectónica; no se copiaron ni se presentan como 751 rutas ya implementadas. En esta etapa se adaptó la experiencia de servicios y sus 34 detalles propios. Blog, guía, tarifas, contacto y demás familias requieren contenido y alcance originales antes de desarrollarse.

## Comparación visual

La referencia y la implementación fueron abiertas a la vez con el mismo estado y viewport. Se compararon el encabezado, la portada, el catálogo, la jerarquía tipográfica, las tarjetas, las secciones editoriales, las tarifas, las preguntas frecuentes, el directorio y el pie de página. La implementación conserva el patrón editorial observado —cabecera oscura, acento dorado, transición a contenido claro y catálogo denso— dentro de la identidad visual y los tokens existentes de PecadosVip.

Evidencia local:

- `output/design-qa/services-desktop-top.png`
- `output/design-qa/services-desktop-catalog.png`
- `output/design-qa/services-desktop-faq.png`
- `output/design-qa/service-detail-desktop-top.png`
- `output/design-qa/services-mobile-top.png`
- `output/design-qa/service-detail-mobile.png`
- `output/design-qa/service-mobile-menu-open-final.png`
- `output/design-qa/services-desktop-fr-locales.png`
- `output/design-qa/services-reference-vs-implementation.png`
- `output/design-qa/services-symbolic-desktop-top.png`
- `output/design-qa/service-symbolic-detail-desktop.png`
- `output/design-qa/services-symbolic-mobile-top.png`
- `output/design-qa/services-unique-assets-contact-sheet.png`
- `output/design-qa/services-unique-catalog-desktop.png`
- `output/design-qa/services-unique-catalog-mobile.png`
- `output/design-qa/services-reference-vs-implementation-unique.png`

La extensión del 30 de agosto sustituyó los retratos decorativos de servicios por 34 bodegones generados específicamente para la maqueta: uno por cada ruta, sin compartir claves, rutas ni bytes. El mosaico completo permitió comparar silueta, objeto principal y densidad visual de las 34 composiciones; el manifiesto y las pruebas recalculan hashes, formatos y dimensiones desde los archivos reales. La llegada a hotel fue regenerada sin símbolos o trazos semejantes a marcas. La escena de sado consensuado también se regeneró como dos arcos abstractos separados, sin bandas, cierres ni ataduras. Ambos candidatos descartados quedaron aislados fuera del manifiesto y de las rutas.

Se comparó en una sola imagen la referencia gráfica del cliente y la implementación final. La composición conserva el sistema negro, marfil y dorado, la jerarquía editorial, el contraste de superficies y la densidad premium de la referencia, mientras diferencia con claridad servicios y perfiles. “Generada para la maqueta” describe la procedencia técnica y no acredita derechos de publicación.

No quedaron hallazgos P0, P1 o P2 en la muestra visual final relacionada con duplicación o encuadre. Los encuadres de hero, tarjeta y detalle conservan los objetos principales; las insignias no cubren el foco; no hay imágenes estiradas, placeholders, arte CSS ni controles superpuestos. El DOM mostró 34 tarjetas, 34 `src` distintos y cero desbordamiento horizontal en 1440 × 1000 y 390 × 844. La captura de página completa presentó artefactos de cosido del navegador, por lo que el dictamen visual se basó en capturas normales de viewport y en el DOM renderizado.

## Interacciones y responsive

- Los enlaces del catálogo y del directorio llevan a las 34 fichas de detalle.
- Los filtros por categoría usan navegación GET y conservan el idioma seleccionado.
- La búsqueda dinámica ignora tildes, combina categoría y ordenación, anuncia el número de resultados y ofrece estado vacío y restablecimiento.
- La selección temporal admite hasta tres fichas, expone `aria-pressed`, puede vaciarse y vive solo en memoria de React: no usa URL, cookies, `localStorage`, `sessionStorage`, analítica ni red.
- Las fichas largas incorporan un índice real de anclas para resumen, proceso, límites, relacionados y perfiles.
- La navegación principal, el logotipo, el selector de idioma, los perfiles y los enlaces relacionados conservan `?lang` en el preview.
- El menú móvil se comporta como diálogo: abre y cierra con control explícito, atrapa el foco, responde a Escape, devuelve el foco al disparador y bloquea el desplazamiento de fondo.
- La portada y las tarjetas usan encuadres que conservan caras completas en escritorio y móvil.
- La nota del preview puede aceptarse y restaurarse; permanece separada de cualquier consentimiento real.
- Los destinos de contacto, reserva, pagos, analítica e indexación permanecen desactivados en esta etapa local.

## Accesibilidad, idiomas y seguridad de publicación

- Existe enlace de salto al contenido, foco visible, nombres accesibles localizados, endónimos de idioma, blancos táctiles y reglas para movimiento reducido y colores forzados.
- El DOM hidratado actualiza `html[lang]`, título y descripción en el preview para ES, EN, FR e IT.
- La envoltura heredada responde inicialmente en español antes de la hidratación; por tratarse de una ruta local, no indexable y no publicable, se documenta como límite del preview. Las rutas públicas localizadas resuelven el idioma del servidor, pero continúan bajo estado de espera.
- La revisión lingüística humana independiente y la revisión jurídica siguen siendo requisitos externos; este QA no constituye certificación legal ni aprobación editorial.

## Verificación técnica final

- `pnpm run release:verify`: aprobado.
- ESLint: aprobado sin errores ni advertencias.
- TypeScript: aprobado.
- Pruebas: 203/203 aprobadas.
- Compilación Vinext y preparación standalone: aprobadas.
- Validación i18n: `PASS_WITH_LIMITS`, 0 problemas estructurales de catálogo.
- Artefactos worker y standalone: 0 infracciones.
- Smoke test standalone: aprobado con publicación desactivada, `robots` bloqueado y sitemap vacío.
- Navegador local final: 0 errores de consola; `noindex, nofollow, nocache` confirmado.

## Extensión visual · siete ciudades

- Madrid, Barcelona, Girona, Tarragona, Toledo, Guadalajara y Segovia cuentan ahora con una referencia horizontal única en la home sintética y el directorio de servicios.
- Los maestros PNG y derivados WebP 1200 × 900 permanecen fuera de `public/`; la ruta local está confinada por slug y por directorio.
- El mosaico `output/design-qa/cities-reference-contact-sheet.png` confirma siete composiciones distintas. `cities-reference-comparison.png` conserva ambos contextos sin recorte; es una comparación contextual, no una comparación píxel a píxel porque las capturas de origen tienen dimensiones distintas.
- Capturas normales de viewport: `cities-reference-desktop.png`, `cities-reference-mobile.png`, `cities-services-desktop.png`, `cities-services-tablet-1024.png`, `cities-services-tablet-768.png` y `cities-services-mobile.png`. Se evitó basar el dictamen en el cosido de página completa.
- El DOM mostró siete `src`, siete alt específicos, un aviso compartido, siete etiquetas IA visibles y dimensiones naturales 1200 × 900. Antes de cada captura se comprobaron `complete` y `naturalWidth > 0` en las siete imágenes. Las secciones no desbordaron a 1440, 1024, 768 ni 390 px; a 320 px se conserva el mínimo global heredado de 320 px y la validación se considera equivalente, no una promesa para un ancho útil menor por scrollbar clásica.
- Las etiquetas por tarjeta tienen 0.75 rem y el aviso completo conserva “cobertura no confirmada”. El control para restaurar el aviso queda en el flujo del documento y no tapa imágenes ni objetivos táctiles.
- ES/EN/FR/IT muestran alt y disclosure localizados sin mojibake. La home legacy mantiene el límite conocido de `html lang=es` para EN/FR/IT; el hub de servicios sí sincroniza el idioma del documento.
- La inspección del navegador no registró errores ni advertencias de aplicación. El contenido sigue siendo local, sintético, no indexable y sin afirmación de cobertura comercial.
- La revisión de derechos, lingüística independiente, jurídica, lector de pantalla, contraste medido y dispositivos físicos sigue pendiente; este cierre visual no autoriza producción.

## Corrección visual · cierre de filas incompletas

- Fuente visual: `C:\Users\artot\AppData\Local\Temp\codex-clipboard-9ba9b7b2-db56-454b-ace3-b01cf41d2985.png`, captura anotada de 1896 × 811 px que muestra dos tarjetas y dos columnas vacías en la última fila del catálogo.
- Implementación verificada: `output/design-qa/service-grid-balance-20260830/catalog-balanced-desktop-normalized.png`, captura de 1905 × 893 px con viewport solicitado de 1920 × 900 CSS px y densidad normal del navegador.
- Evidencia móvil: `output/design-qa/service-grid-balance-20260830/catalog-balanced-mobile-normalized.png`, captura de 375 × 811 px con viewport solicitado de 390 × 844 CSS px.
- Comparación conjunta: `output/design-qa/service-grid-balance-20260830/comparison-before-after.png`; izquierda, defecto reportado, y derecha, implementación corregida. No se normalizó a equivalencia píxel a píxel porque la fuente es una captura anotada del estado defectuoso, no un mock final. La comparación se centró en el cierre horizontal y la continuidad del borde de la cuadrícula.
- Estado: catálogo en español, 34 servicios, y filtro “Compañía”, 3 servicios. Se probaron el catálogo completo y el filtrado en 1440, 1180, 780 y 390 px.
- Interacciones: selección de categoría, restauración a “Todas” y actualización dinámica de resultados. La consola mostró cero errores de aplicación; las imágenes visibles cargaron correctamente y las restantes conservaron su carga diferida.

### Historial de comparación

- Primera pasada — P2: la cuadrícula de cuatro columnas dejaba dos tracks sin tarjeta al presentar 34 servicios. El fondo beige del grid convertía ese remanente en una superficie vacía de media fila y transmitía una apariencia de contenido incompleto.
- Corrección: el catálogo usa tracks divisibles y selectores de último grupo para distribuir cualquier remanente entre todo el ancho disponible. La cuadrícula de servicios relacionados permanece fuera del alcance del cambio. Las relaciones de aspecto de las tarjetas expandidas se ajustan para conservar aproximadamente la altura de una fila normal.
- Segunda pasada: el borde de la última fila cierra de extremo a extremo. Las mediciones del navegador mostraron márgenes laterales internos simétricos de aproximadamente 0.8 px y cero desbordamiento horizontal en los cuatro anchos probados. El comportamiento también pasó con tres resultados: tres columnas completas en escritorio y una última tarjeta a ancho completo en móvil.

### Superficies de fidelidad

- Tipografía: familias, jerarquía, tamaños, pesos, interlineado y contenido no cambiaron; los títulos conservan su envoltura dentro de tarjetas más anchas.
- Espaciado y ritmo: se eliminó la superficie vacía de la última fila sin introducir huecos, saltos verticales ni desplazamiento horizontal.
- Color y tokens: se conservaron marfil, negro, dorado, bordes y fondo separador existentes; no se añadió un color para ocultar el defecto.
- Imágenes: las tarjetas expandidas usan proporciones panorámicas coherentes con su nuevo ancho, sin estiramiento; el recorte permanece gobernado por las reglas y activos existentes.
- Copia: etiquetas, títulos, descripciones, avisos IA y acciones permanecen sin cambios.

No quedan hallazgos P0, P1 o P2 relacionados con el cierre de filas incompletas. No fue necesario un recorte focal adicional: la comparación conjunta permite leer la geometría completa del defecto y de la corrección, y las capturas individuales conservan suficiente resolución para revisar bordes, imágenes, títulos y acciones.

Verificación posterior: `pnpm run validate` aprobado; ESLint, TypeScript, 203/203 pruebas, compilación Vinext y preparación standalone aprobados.

## Corrección visual · continuidad entre introducción y catálogo

- Fuente visual: `C:\Users\artot\AppData\Local\Temp\codex-clipboard-89f1e7e7-8857-4203-8899-6d5bcc59afe4.png`, captura anotada de 1956 × 892 px que señala el fondo negro expuesto alrededor del inicio del catálogo.
- Implementación: `output/design-qa/service-section-continuity-20260830/after-continuity-desktop.jpg`, captura del navegador de 1905 × 893 px con viewport solicitado de 1920 × 900 CSS px y escala CSS normal.
- Evidencia móvil: `output/design-qa/service-section-continuity-20260830/after-continuity-mobile.jpg`, captura de 375 × 811 px con viewport solicitado de 390 × 844 CSS px.
- Comparación conjunta: `output/design-qa/service-section-continuity-20260830/comparison-before-after.png`; izquierda, defecto reportado, y derecha, superficie marfil corregida. La fuente anotada y la captura del navegador tienen escalas visuales distintas, por lo que la comparación se normalizó a dos paneles de 960 × 450 px y se evaluó la geometría de la transición, no la fidelidad píxel a píxel.
- Estado: ruta española de servicios, catálogo sin filtros, transición entre `.synthetic-services-intro` y `#service-catalog`. No se modificó contenido ni estado interactivo.

### Historial de comparación

- Primera pasada — P2: la regla genérica `.public-section`, declarada después del CSS de servicios, anulaba el ancho, los márgenes y el padding previstos para el catálogo. El fondo oscuro de la página quedaba visible como dos bloques laterales y cortaba la continuidad con la introducción marfil.
- Corrección: el selector del catálogo se acotó a `.synthetic-services-page .synthetic-services-catalog`. La mayor especificidad conserva la superficie a ancho completo y su padding interno sin cambiar la regla compartida ni las secciones de detalle.
- Segunda pasada: introducción y catálogo midieron el mismo borde izquierdo y derecho en 1440, 1180, 780 y 390 px. La diferencia de superficie fue 0 px en ambos lados y el desbordamiento horizontal fue 0 px en todos los anchos.

### Superficies de fidelidad

- Tipografía: familias, tamaños, pesos, interlineado, envolturas y jerarquía permanecen iguales.
- Espaciado y ritmo: la transición marfil es continua y el contenido conserva padding lateral de 5vw o el máximo editorial configurado; no hay márgenes negros ni saltos horizontales.
- Color y tokens: se conserva `--service-ivory`; no se pintó encima del defecto ni se cambió el fondo oscuro global.
- Imágenes: esta transición no contiene activos visuales; el cambio no altera medios, recortes ni carga diferida.
- Copia: títulos, numeración, descripción y etiquetas permanecen sin cambios.

La captura completa y el panel comparativo permiten revisar claramente la superficie, el divisor, el título y los márgenes; no fue necesario un recorte focal adicional. La consola no registró errores de aplicación y no hubo imágenes visibles rotas.

No quedan hallazgos P0, P1 o P2 relacionados con la continuidad entre introducción y catálogo.

## Corrección visual · cierre del directorio de ciudades

- Fuente visual: `output/design-qa/city-directory-balance-20260830/source-city-directory-gap.png`, copia estable de la captura reportada de 597 × 512 px. El estado muestra las tarjetas 05 y 06 y la última tarjeta, Segovia, dejando vacía la segunda columna.
- Implementación: `output/design-qa/city-directory-balance-20260830/after-city-directory-598x512.png`, captura normal del navegador solicitada a 598 × 512 CSS px. El navegador devolvió 583 × 499 px por su área útil; se normalizó proporcionalmente a 597 × 512 px en `after-city-directory-normalized-597x512.png` para la comparación.
- Comparación conjunta: `output/design-qa/city-directory-balance-20260830/comparison-source-after.png`; izquierda, defecto reportado, y derecha, corrección con Segovia ocupando la fila completa. El mismo encuadre empieza en el copy de Toledo y Guadalajara y conserva idioma, contenido y estado.
- Evidencia responsive adicional: `after-city-directory-1440x900.png`, `after-city-directory-1180x900.png`, `after-city-directory-780x900.png` y `after-city-directory-390x844.png`.
- La vista completa del componente es también el recorte focal: el defecto, los bordes, las tres ciudades y sus imágenes son legibles en una sola región, por lo que no fue necesario un segundo recorte.

### Historial de comparación

- Primera pasada — P2: las siete imágenes estaban cargadas, pero las reglas de cuatro columnas y dos columnas dejaban respectivamente uno de cuatro tracks y uno de dos tracks sin tarjeta. El rectángulo negro era una celda vacía, no una imagen rota.
- Corrección: entre 781 y 1180 px la cuadrícula usa doce tracks; las primeras cuatro tarjetas ocupan tres cada una y las últimas tres ocupan cuatro cada una. Entre 421 y 780 px, una última tarjeta impar ocupa la fila completa. Las proporciones 16:9 y 8:3 preservan la altura visual de las filas expandidas.
- Segunda pasada: a 1180 px las tres tarjetas finales miden 341.4 px y cierran en el borde derecho del grid; su altura de 304.39 px difiere solo 0.15 px de la fila anterior. A 780 px Segovia mide 687.51 px, cierra el ancho interior completo y su altura difiere 0.30 px de las filas pares. A 390 px todas las tarjetas conservan una sola columna de 336.88 px. El desbordamiento horizontal fue 0 px en 1440, 1180, 780 y 390 px.

### Superficies de fidelidad

- Tipografía: nombres, numeración, estado, familias, tamaños, pesos y espaciado permanecen iguales; ninguna etiqueta se truncó.
- Espaciado y ritmo: desapareció la celda vacía y las alturas se mantienen alineadas dentro de 0.30 px; los bordes cierran de extremo a extremo.
- Color y tokens: no se cubrió el defecto con un relleno. Se conservaron negro, dorado, bordes y estados existentes.
- Imágenes: las siete referencias cargaron con `complete=true`, ancho natural de 1200 px y alt específico. El cambio modifica únicamente el encuadre panorámico de la tarjeta expandida, sin estirar el archivo fuente.
- Copia: ciudades, numeración, aviso IA y estado pendiente permanecen sin cambios.

Los siete enlaces conservaron `href`, orden de tabulación y destino; no se modificó el flujo de navegación. La consola registró solo mensajes informativos de Vite y React, sin errores ni advertencias de aplicación. No quedan hallazgos P0, P1 o P2 relacionados con el directorio de ciudades.

Verificación posterior: `pnpm run validate` aprobado; ESLint, TypeScript, 203/203 pruebas, compilación Vinext y preparación standalone aprobados.

## Corrección visual · cuarta zona Barcelona y auditoría de flujo

- Estado anterior: `output/audit-20260830-progress-and-barcelona-zone/product-design/before/02-cobertura-hueco-barcelona-antes.jpg`; Barcelona terminaba con tres tarjetas y una cuarta celda vacía.
- Estado final: `output/audit-20260830-progress-and-barcelona-zone/product-design/after/01-cobertura-desktop-1440.jpg`; Sitges completa una cuadrícula 2 × 2 equilibrada junto a Barcelona, Tarragona y Girona.
- Recurso: `assets/synthetic-cities/master/sitges-reference-v01.png` y derivado técnico `assets/synthetic-cities/selected/sitges-reference-v01.webp`, ambos únicos y etiquetados como referencia generada con IA, cobertura sin confirmar y revisión humana/legal pendiente.
- Responsive: portada y directorio de servicios verificados a 1440, 1180, 780 y 390 px; ocho tarjetas, cero recursos visibles rotos y cero desbordamiento horizontal.
- Flujo: búsqueda, filtros, orden, selección temporal hasta tres servicios, límite anunciado, ficha individual, FAQ, perfiles Barcelona, ficha Sofía, selector ES/EN/FR/IT y menú móvil operaron en el navegador local.
- Accesibilidad: el diálogo móvil atrapa/restaura foco, bloquea el scroll y vuelve `inert`/`aria-hidden` el fondo mientras está abierto. El campo de respuesta usa `type=email`.
- Tipografía: el hero separa título y subtítulo en bloques balanceados con interlineado `1.15`; los encabezados de servicios y secciones editoriales usan interlineado seguro, kerning normal y no presentan intersección de líneas ni overflow en las mediciones de escritorio/móvil. Evidencia posterior: `output/audit-20260830-progress-and-barcelona-zone/product-design/typography/02-hero-es-390-despues.jpg`.
- Marca: `app/icon.png` y `app/apple-icon.png` conservan el símbolo dorado y tienen transparencia real (`alpha 0–255`, cuatro esquinas transparentes); el SVG fuente permanece preservado bajo `assets/brand/`.
- Entrega local: Vite ignora `stage-archives/**`; se generó un ZIP de 153 MB con el preview activo y el servidor continuó respondiendo HTTP 200, cerrando el `EBUSY` observado con OneDrive.
- Consola: solo mensajes informativos de Vite/React; no se observaron errores ni advertencias de aplicación.
- Verificación técnica: `pnpm run release:verify` aprobado con lint, TypeScript, 204/204 pruebas, build, i18n, scorecard, SBOM, artefactos worker/standalone y smoke fail-closed.

No quedan hallazgos P0, P1 o P2 vinculados al hueco de la zona Barcelona ni al funcionamiento local de los controles auditados. La cobertura, los perfiles, los servicios y los medios continúan siendo sintéticos y locales; este cierre visual no autoriza publicación comercial.

## Integración visual · filigrana de bordes

- Verdad visual de origen: `C:\Users\artot\Downloads\ChatGPT Image 30 ago 2026, 17_20_01.png`, PNG de 1254 × 1254 px entregado por el usuario.
- Activo maestro preservado: `assets/brand/filigree-source-v01.png`, SHA-256 `ECAC146A7ECE11DC6AD97DD8079642B6C837422384F8712327ECDD36481C1DF9`.
- Derivado técnico: `assets/synthetic-decor/selected/border-filigree-v01.webp`, WebP de 768 × 768 px con alfa real, SHA-256 `D1FD9DB774FD915BE5F82908B5EA70C691E5A18D5144EE05C24A9CF2C7CFCBB4`.
- Implementación prevista: rieles laterales absolutos de hasta 3 rem, repetición vertical, máscara hacia el contenido, opacidad 0.34, interacción nula y ocultación completa por debajo de 781 px y en colores forzados.
- Estado y ruta objetivo: home local sintética en español, `http://localhost:3000/preview-local-sintetico?lang=es#inicio`; también debe comprobarse la superficie clara de Servicios.
- Viewports requeridos: 1440 × 900, 1180 × 900, 780 × 900 y 390 × 844 CSS px, densidad 1.
- Evidencia anterior a la implementación: `output/audit-20260830-border-filigree/product-design/before/home-1440.png`, captura de 1440 × 900 px.
- Evidencia de implementación: no disponible. El navegador integrado rechazó tanto la recarga como la lectura del DOM de la URL local por su política de seguridad; no se usó otro navegador ni un mecanismo indirecto.

### Comparación y superficies de fidelidad

- Vista completa: bloqueada porque no pudo capturarse la implementación renderizada después del cambio. La imagen fuente sí fue abierta y revisada a resolución original.
- Región focal: no procede hasta contar con la captura posterior; separar el riel de su página impediría evaluar opacidad, continuidad, margen y convivencia con el contenido.
- Tipografía y copia: el cambio no modifica reglas tipográficas, contenido ni estructura semántica; las 205 pruebas y TypeScript pasan, pero esto no sustituye la revisión visible.
- Espaciado y ritmo: el contrato limita los rieles al 3 % exterior y los oculta cuando el hero pierde margen lateral. Falta confirmar visualmente que no aparezcan uniones o acumulación de patrón durante el desplazamiento.
- Color y tokens: se conserva la paleta dorada del PNG con fondo convertido gradualmente a transparencia. Falta confirmar contraste y sutileza en fondos negro y marfil.
- Calidad de imagen: el derivado conserva el motivo real suministrado, tiene alfa 0–255 y no usa SVG, arte CSS ni sustitutos. Falta inspeccionar halos y compresión en contexto.
- Accesibilidad e interacción: `pointer-events: none`, sin animación, oculto en colores forzados y activo solo desde 781 px. Los contratos automatizados pasan; falta validar puntos centrales de controles y consola en el navegador.

### Historial de comparación

- Intento 1: se abrió la fuente y se conservó una captura previa del home a 1440 × 900. Tras implementar el activo, el navegador integrado bloqueó la recarga y la inspección por política de URL, por lo que no existe una captura posterior válida que pueda combinarse con la referencia.
- Corrección técnica aplicada: activo privado allowlisted solo en desarrollo, fondo casi negro convertido gradualmente a alfa, breakpoint seguro, rieles sin eventos, `noimageindex` y 404 confirmado en producción.
- Revisión posterior: `pnpm run release:verify` aprobó lint, TypeScript, 205/205 pruebas, compilación, i18n estructural, scorecard, SBOM, artefactos y smoke fail-closed. Esta evidencia no reemplaza la comparación visual obligatoria.

### Hallazgo bloqueante

- QA-BLOCKER — no hay captura renderizada posterior. Sin una comparación conjunta no es posible declarar que la opacidad, las máscaras, la continuidad vertical y el comportamiento sobre fondos claros no tengan diferencias P1/P2. Se requiere refrescar la pestaña local y aportar o habilitar capturas de 1440 × 900 y 390 × 844 antes de cerrar el QA visual.

final result: blocked

## Refinamiento final · filigrana de oro interactiva

- Verdad visual de origen: `assets/brand/filigree-source-v01.png`, 1254 × 1254 px, preservada desde el mosaico aportado por el usuario.
- Feedback visual utilizado: `C:\Users\artot\AppData\Local\Temp\codex-clipboard-14fde184-ad79-4c2f-9386-b4affe3953a5.png` y `C:\Users\artot\AppData\Local\Temp\codex-clipboard-722ed54d-8cf1-4969-a65c-0bbf13de60f6.png`.
- Fuente material final: `assets/brand/filigree-gold-texture-source-v03.png`, PNG 1254 × 1254 px generado por transformación de alta fidelidad. Conserva la geometría del mosaico y aplica una lámina de oro homogénea, con grano visible y exposición controlada.
- Implementación en reposo: `output/audit-20260830-filigree-gold-hover/home-dim-1280x720.png`.
- Implementación con cursor a la izquierda: `output/audit-20260830-filigree-gold-hover/home-gold-left-consistent-1280x720.png`.
- Implementación con cursor a la derecha: `output/audit-20260830-filigree-gold-hover/home-gold-right-consistent-1280x720.png`.
- Superficie clara de Servicios: `output/audit-20260830-filigree-gold-hover/services-gold-left-consistent-1280x720.png`.
- Evidencia móvil: `output/audit-20260830-filigree-gold-hover/home-mobile-390x844.png`.
- Comparación conjunta de vista completa: `output/audit-20260830-filigree-gold-hover/comparison-before-dim-gold.png`. Los tres paneles normalizados a 640 × 360 px muestran el estado anterior, el estado tenue final y el halo final sobre la misma ruta, viewport y contenido.
- Comparación focal de textura: `output/audit-20260830-filigree-gold-hover/comparison-gold-texture-focus.png`. Izquierda, maestro texturizado; derecha, borde renderizado ampliado. Es una comparación contextual de material y escala, no píxel a píxel.
- Viewport de escritorio: 1280 × 720 CSS px; capturas 1280 × 720 px; densidad normal del navegador integrado. Viewport móvil: 390 × 844 CSS px; captura 390 × 844 px. No hubo normalización de densidad adicional.

### Hallazgos e historial de comparación

- Primera pasada — P2: el mosaico cuadrado se renderizaba a 320 px dentro de un riel de unos 38 px. Solo era visible una fracción de cada figura, con bloques negros y motivos irreconocibles.
- Corrección 1: se generaron raíles izquierdo y derecho de 320 × 1056 px, con recortes deterministas y alfa real. El ancho útil aumentó y la escala de fondo pasó a depender del propio riel.
- Segunda pasada — P2: el usuario observó que el patrón seguía demasiado presente y pidió una iluminación localizada. Se sustituyeron los pseudo-elementos por una capa cliente inerte con dos raíles, base oscurecida y una máscara radial controlada mediante variables CSS actualizadas en un único `requestAnimationFrame`.
- Tercera pasada — P2: el primer material dorado mostraba exposición desigual entre manos y manzanas y un halo demasiado amplio y amarillo. La captura de feedback evidenció motivos lavados y otros demasiado oscuros dentro de la misma zona iluminada.
- Corrección final: se generó un maestro de oro uniforme optimizado para representación estrecha; los motivos se muestran al 72 % de la escala anterior; el halo mide 64 px de radio a 1280 px; el filtro activo usa brillo 1.08, saturación 1.02 y contraste 1.12 con dos sombras cálidas cortas. El estado base conserva opacidad 0.10 y no compite con el contenido.
- Revisión posterior: la vista conjunta muestra motivos completos, menor escala, base oscura y un reflejo compacto que mantiene el mismo material entre figuras. No quedan hallazgos P0, P1 o P2 en el alcance de la filigrana. Como P3 no bloqueante queda la comprobación en paneles físicos de distintas gamas y densidades.

### Superficies de fidelidad

- Tipografía y copia: no se cambiaron familias, pesos, tamaños, interlineado, envoltura, traducciones ni contenido.
- Espaciado y ritmo: los raíles permanecen confinados a los bordes, no desplazan el layout y producen 0 px de desbordamiento horizontal en 1280 × 720 y 390 × 844.
- Color y tokens: el oro procede de un activo raster real generado para el proyecto; no se usa un relleno CSS amarillo, `screen`, `overlay` ni neón. La base tenue y el reflejo mantienen contraste legible sobre negro y marfil.
- Calidad de imagen: el maestro, los derivados WebP y el manifiesto conservan hashes, dimensiones y alfa verificados. No hay SVG artesanal, emoji, placeholder ni arte de `div`; la revisión humana, de derechos y legal permanece en `PENDING`.
- Interacción y accesibilidad: la capa tiene `aria-hidden=true`, `pointer-events:none`, no recibe foco y no bloquea el elemento subyacente. El seguimiento se limita a escritorio con puntero fino, se agrupa por frame y se limpia en salida, cancelación, desenfoque, cambio de media query y desmontaje. El reflejo se desactiva con movimiento reducido y toda la filigrana desaparece en móvil, impresión y colores forzados.

### Verificación final

- Inicio oscuro, borde izquierdo, borde derecho y catálogo marfil revisados en el navegador integrado.
- El elemento bajo el cursor siguió siendo contenido de la página y la capa decorativa conservó `pointer-events:none`.
- Consola: sin errores ni advertencias de aplicación; solo mensajes informativos de Vite/React y reconexiones del servidor de desarrollo durante las recompilaciones.
- ESLint: aprobado sin errores ni advertencias.
- TypeScript: aprobado.
- Pruebas: 205/205 aprobadas.
- Build Vinext: cinco entornos compilados; preparación standalone aprobada.
- i18n: `PASS_WITH_LIMITS`, cuatro idiomas y cero problemas estructurales; revisión lingüística humana pendiente.
- Scorecard local: 98/100 conservado con dos criterios externos pendientes.
- SBOM: 612 componentes, SHA-256 `eed711e182d232e86fcdc167fa1b796fa01da3e5538da3438569399633637075`.
- Artefactos: worker y standalone aprobados con cero infracciones.
- Smoke fail-closed: aprobado; las tres rutas decorativas responden 404 en el runtime de producción local cerrado.

final result: passed

## Mosaico ambiental de fondo completo

### Fuente visual y evidencia

- Verdad visual: `assets/brand/filigree-mosaic-source-v04.png` (1254 × 1254 px) y el estado anterior de Inicio en `output/audit-20260831-full-background-mosaic/before-home-1280x720.png`.
- Implementación principal: `output/audit-20260831-full-background-mosaic/final-home-rest-1280x720.png` y `final-home-hover-1280x720.png`.
- Estados complementarios: `home-coverage-rest-1280x720.png`, `home-coverage-hover-1280x720.png`, `profile-sofia-rest-1280x720.png`, `final-services-rest-1280x720.png`, `final-services-hover-1280x720.png` y `home-mobile-pass2-390x844.png`.
- Comparación equivalente: `output/audit-20260831-full-background-mosaic/comparison-equivalent-left-before-rest-hover.png`. Las tres vistas usan el mismo recorte izquierdo de 591 × 712 px dentro del viewport CSS 1280 × 720, DPR 1; esto normaliza la captura inicial limitada por el panel del navegador.
- Comparación de vista completa: `output/audit-20260831-full-background-mosaic/comparison-before-after-full-background.png`.
- Comparación focal del raster y cuatro superficies: `output/audit-20260831-full-background-mosaic/comparison-source-home-coverage-profile-services.png`.
- Estados de interacción: `output/audit-20260831-full-background-mosaic/comparison-rest-hover-home-services.png`.

### Historial de comparación y correcciones

- Primera integración — P2: una capa situada detrás del contenido quedaba oculta por el hero y por los bloques marfil; el resultado todavía se percibía como bordes y no como fondo completo.
- Corrección: el derivado cuadrado `border-filigree-mosaic-v04.webp` se convirtió en una única superficie absoluta de altura documental, repetida en ambos ejes y con `pointer-events:none`. Se eliminaron del DOM los dos raíles laterales y se conservaron como derivados de trazabilidad fuera del runtime activo.
- Segunda integración — P2: transparentar los bloques marfil para revelar la capa alteraba el token de superficie de Servicios y reducía su luminosidad editorial.
- Corrección: se restauraron todos los fondos originales. El mosaico se mantiene como pátina de muy baja opacidad sobre el lienzo: Inicio 0.06/0.105, perfil 0.05/0.085 y Servicios 0.025/0.042. La relación activo/reposo permanece por debajo de 1.8×.
- Corrección de escala: la baldosa mide 360–416 px en escritorio, 288–320 px en el intervalo compacto y 224–260 px en móvil. La repetición cubre el ancho y toda la altura de la página sin `position:fixed`, traslaciones ni uniones centrales de raíles.
- Corrección de halo: radio `clamp(4rem, 5vw, 5rem)`, máscara 72 %/48 %/18 %, entrada de 460 ms y salida de 620 ms. Inicio y Servicios registraron diferencia máxima de 11 por canal entre reposo y hover y diferencia media de 0.0048, por lo que la iluminación permanece perceptible pero no dramática.
- Resultado: no quedan hallazgos P0, P1 o P2. P3 no bloqueante: revisar la textura en una pantalla física DPR 2/P3 para descartar moiré fino fuera del entorno de captura.

### Superficies de fidelidad

- Tipografía: no se modificaron familias, pesos, tamaños, interlineado, tracking, jerarquía ni wrapping.
- Espaciado y ritmo: no se modificaron grids, alturas, márgenes, paddings, tarjetas ni controles. Inicio, Servicios, perfil y móvil mantienen 0 px de desbordamiento horizontal.
- Colores y tokens: se conservaron los fondos negro, marfil y marfil profundo originales; el mosaico usa filtros de champán envejecido y bronce sin amarillo neón ni modos de mezcla.
- Calidad de imagen: se usa el WebP cuadrado con alfa derivado del raster suministrado; no hay SVG artesanal, arte CSS, placeholders ni mosaicos recreados.
- Copia y contenido: no se cambió ningún texto, idioma, CTA, perfil, servicio ni aviso.
- Interacción y accesibilidad: la capa única sigue `aria-hidden`, sin foco ni roles, y no intercepta el CTA comprobado con `elementFromPoint`. Touch y movimiento reducido mantienen solo el reposo; impresión y colores forzados ocultan la decoración.

### Verificación final

- Inicio, Cobertura, perfil de Sofía, Servicios y móvil fueron inspeccionados en el navegador integrado; la capa coincide con la altura completa de `.synthetic-preview-page`.
- Consola: cero errores y cero advertencias. Quince imágenes visibles, cero imágenes visibles rotas; seis retratos diferidos permanecían pendientes fuera del viewport por `loading="lazy"`.
- Prueba focal de preview: 14/14 aprobadas. TypeScript: aprobado.
- Este pase valida el preview local. No prueba revisión lingüística humana, derechos, legal, UAT, activación productiva ni publicación.

final result: passed

## Sustitución final · mosaico teselado negro y dorado v04

- Verdad visual de origen: `C:\Users\artot\Downloads\ChatGPT Image 30 ago 2026, 22_11_58.png`, PNG RGB de 1254 × 1254 px suministrado por el usuario.
- Maestro preservado: `assets/brand/filigree-mosaic-source-v04.png`, SHA-256 `B169F9E48C3B5000DAC445BF42F6AE2225E9F7B2B6AB3A550BA21DCB0269BD11`. La copia coincide byte por byte con la fuente.
- Implementación en reposo: `output/audit-20260830-filigree-mosaic-v04/home-mosaic-subtle-dim-1280x720.jpg`.
- Implementación activa izquierda: `output/audit-20260830-filigree-mosaic-v04/home-mosaic-subtle-hover-left-1280x720.jpg`.
- Implementación activa derecha: `output/audit-20260830-filigree-mosaic-v04/home-mosaic-subtle-hover-right-1280x720.jpg`.
- Superficie clara activa: `output/audit-20260830-filigree-mosaic-v04/services-mosaic-subtle-hover-left-1280x720.jpg`.
- Evidencia móvil: `output/audit-20260830-filigree-mosaic-v04/home-mosaic-subtle-mobile-390x844.jpg`.
- Comparación conjunta: `output/audit-20260830-filigree-mosaic-v04/comparison-subtle-source-home-services.png`, 1664 × 360 px. Orden: fuente completa, home oscuro con halo y catálogo marfil con halo.
- Comparación focal: `output/audit-20260830-filigree-mosaic-v04/comparison-subtle-left-rail-focus.png`, 984 × 528 px. Orden: recorte izquierdo de la fuente, borde renderizado sobre negro y borde renderizado sobre marfil.
- Viewport solicitado de escritorio: 1280 × 720 CSS px, DPR 1; el área útil capturada por el navegador integrado fue 1265 × 712 px. Viewport móvil solicitado: 390 × 844 CSS px; captura útil 375 × 811 px. Las comparaciones reescalan los paneles para lectura conjunta y no se presentan como equivalencia píxel a píxel.
- Estado: home local en español, cursor en borde izquierdo y derecho; catálogo de servicios en español, cursor en el borde izquierdo; móvil sin decoración.

### Hallazgos e historial de comparación

- Preflight — P2: aplicar la fuente RGB opaca o la separación de luminancia anterior podía conservar demasiado sustrato negro y formar una franja o un disco gris sobre el catálogo marfil. El análisis del maestro mostró aproximadamente 71 % de píxeles oscuros.
- Corrección: la transformación actual combina luminancia y calidez cromática. Mantiene alta opacidad en oro, beige y bronce, conserva las juntas teseladas con alfa sutil y elimina el bloque negro continuo. Los derivados son `border-filigree-mosaic-v04.webp`, `border-filigree-left-v05.webp` y `border-filigree-right-v05.webp`.
- Revisión posterior: la comparación conjunta muestra manos, manzanas y teselas reconocibles en ambos fondos; la superficie marfil no presenta rectángulo negro, halo gris ni pérdida de legibilidad. El halo conserva 64 px de radio a 1280 px.
- Ajuste solicitado — P2: el usuario pidió reducir todavía más la presencia y el tamaño de las piezas. La escala pasó de 72 % a 60 %, el reposo de 0.08/0.04 a 0.05/0.025 y el activo de 0.90/0.84 a 0.80/0.72 para home/Servicios. También se acortaron las sombras cálidas. La comparación posterior confirma una filigrana menor y más discreta, sin desaparecer por completo bajo el cursor.
- No quedan hallazgos P0, P1 o P2 dentro del alcance del mosaico. P3 no bloqueante: comprobar moiré y luminancia en un panel físico DPR 2 y bajo perfiles de color distintos.

### Superficies de fidelidad

- Tipografía y copia: no se modificaron familias, pesos, tamaños, interlineados, traducciones, envolturas ni contenido editorial.
- Espaciado y ritmo: los raíles siguen confinados a los bordes y no desplazan el layout. El navegador midió 0 px de desbordamiento horizontal en home, servicios y móvil.
- Color y tokens: el oro procede del raster teselado real suministrado; no se recreó con arte CSS. El reposo usa opacidad 0.05 sobre oscuro y 0.025 sobre Servicios; el halo usa 0.80 y 0.72 respectivamente, con filtros cálidos moderados que preservan el material original.
- Calidad y fidelidad de imagen: los recortes laterales conservan la geometría y la paleta de la fuente. Los WebP tienen dimensiones, hash, peso y canal alfa verificados; no incluyen EXIF, XMP ni ICC. El maestro conserva sus Content Credentials C2PA como evidencia interna.
- Copia y contenido: no se agregó texto al mosaico ni se modificaron llamadas a la acción, avisos o etiquetas.
- Interacción y accesibilidad: la decoración conserva `aria-hidden`, `pointer-events:none`, no recibe foco, se limita a puntero fino desde 1100 px, usa un solo frame por actualización y desaparece en móvil, impresión, colores forzados y movimiento reducido.

### Verificación final

- Inicio oscuro, ambos bordes, catálogo marfil y móvil revisados en el navegador integrado.
- La filigrana activa mantuvo `pointer-events:none`; las imágenes visibles cargaron con ancho natural válido.
- Consola: cero errores y cero advertencias de aplicación en la captura final.
- Pruebas focales: 16/16 aprobadas, incluyendo hashes, alfa, límites de peso, ausencia de metadatos derivados, exclusión de producción y montaje único en las cuatro rutas.
- Verificación integral `pnpm run release:verify`: aprobada. Incluye lint, TypeScript, 205/205 pruebas, los cinco entornos del build Vinext, preparación standalone, SBOM de 612 componentes, artefactos worker/standalone sin infracciones y smoke local fail-closed.
- i18n estructural: `PASS_WITH_LIMITS` para `es`, `en`, `fr` e `it`, con cero problemas de catálogo; la revisión lingüística humana continúa pendiente.
- Scorecard local: 98/100. El resultado no demuestra aprobación legal, derechos de imagen, UAT ni preparación productiva.
- `public_path`, revisión humana, revisión de derechos y revisión legal permanecen sin aprobación; este pase visual no autoriza publicación.

final result: passed

## Refinamiento final · presencia permanente y oro solemne

- Verdad visual de origen: `assets/brand/filigree-mosaic-source-v04.png`, mosaico teselado negro y dorado aportado por el usuario.
- Implementación en reposo sobre Inicio: `output/audit-20260831-filigree-solemn-gold/home-final-rest-1280x720.png`.
- Implementación activa izquierda y derecha: `output/audit-20260831-filigree-solemn-gold/home-final-hover-left-1280x720.png` y `output/audit-20260831-filigree-solemn-gold/home-final-hover-right-1280x720.png`.
- Implementación sobre Servicios marfil: `output/audit-20260831-filigree-solemn-gold/services-final-rest-1280x720.png` y `output/audit-20260831-filigree-solemn-gold/services-final-hover-left-1280x720.png`.
- Evidencia móvil permanente: `output/audit-20260831-filigree-solemn-gold/home-final-mobile-rest-390x844.png`.
- Comparación conjunta: `output/audit-20260831-filigree-solemn-gold/comparison-source-rest-hover-services.png`. Orden: fuente, Inicio en reposo, Inicio activo y Servicios activo.
- Comparación focal: `output/audit-20260831-filigree-solemn-gold/comparison-left-rail-source-rest-hover-services.png`. Orden: recorte de fuente, riel oscuro en reposo, riel oscuro activo y riel marfil activo.
- Viewport de escritorio solicitado: 1280 × 720 CSS px; captura útil 1265 × 712 px. Viewport móvil solicitado: 390 × 844 CSS px; captura útil 375 × 811 px. DPR observado: 1.

### Hallazgos e iteración

- Primera comparación — P2: la filigrana anterior desaparecía visualmente en reposo y quedaba oculta por completo bajo 1100 px. Esto contradecía la nueva intención de mantenerla siempre visible.
- Corrección: la capa base usa `display:block` en todos los tamaños, sigue confinada a los bordes y conserva `pointer-events:none`. En escritorio mantiene piezas al 60 %; en móvil el riel mide 36 px y el fondo usa 120 % del riel, que equivale a motivos físicamente menores que en escritorio pero todavía reconocibles.
- Segunda comparación — P2: un brillo demasiado luminoso podía leerse como amarillo o neón. El activo final usa brillo 0.94, saturación 0.80, contraste 1.16, sepia leve y tres sombras concéntricas desde marfil cálido hasta bronce oscuro. El radio compacto de `clamp(3.25rem, 4.6vw, 4.35rem)` evita el efecto de linterna.
- Corrección final: Inicio usa reposo 0.08 y activo 0.86; Servicios usa reposo 0.036 y activo 0.76. Móvil conserva solo el estado base estático con 0.07 sobre oscuro y 0.03 sobre marfil. El resultado se percibe como una huella dorada baja y el cursor revela un fragmento definido, envejecido y localizado.
- Comparación posterior: no quedan hallazgos P0, P1 o P2 dentro de este alcance. P3 no bloqueante: comprobar moiré y luminancia en pantallas físicas DPR 2 y con perfiles P3 distintos.

### Superficies de fidelidad

- Tipografía y copia: no se modificaron familias, pesos, tamaños, interlineado, envolturas, traducciones ni contenido editorial.
- Espaciado y ritmo: la capa es absoluta, no modifica el flujo y produjo 0 px de desbordamiento horizontal en Inicio, Servicios y móvil.
- Color y tokens: el oro conserva el raster teselado real. La base se oscurece sin quedar invisible y el halo evita `screen`, neón o rellenos amarillos planos.
- Calidad de imagen: se reutilizan los WebP con alfa y hashes ya verificados; no se agregaron SVG, arte CSS sustitutivo, placeholders ni compresión adicional.
- Copia y contenido: no se añadieron mensajes ni se alteraron llamadas a la acción.
- Interacción y accesibilidad: la filigrana permanece `aria-hidden`, inerte y sin foco. El halo solo sigue puntero fino desde 1100 px; la base continúa visible en touch. Movimiento reducido desactiva únicamente el halo. Impresión y colores forzados ocultan toda la decoración como excepciones accesibles deliberadas.

### Verificación final

- Inicio en reposo, ambos bordes activos, Servicios en reposo/activo y móvil revisados en el navegador integrado.
- Estado computado: Inicio 0.08/0.86, Servicios 0.036/0.76 y móvil visible con riel de 36 px; 0 px de desbordamiento en todas las capturas.
- Consola final: cero errores y cero advertencias.
- `pnpm run release:verify`: aprobado con lint, TypeScript, 205/205 pruebas, los cinco entornos Vinext, i18n `PASS_WITH_LIMITS`, scorecard local 98/100, SBOM de 612 componentes, artefactos sin infracciones y smoke fail-closed.
- `productionActivation:false`; la revisión humana de idiomas, derechos, legal, UAT y publicación continúa pendiente.

final result: passed

## Armonización final · mosaico patinado a media luz

- Verdad visual de origen: `assets/brand/filigree-mosaic-source-v04.png`, mosaico teselado negro y dorado aportado por el usuario y preservado sin modificaciones.
- Referencia implementada anterior: `output/audit-20260831-filigree-harmonized/before-home-rest-1280x720.png` y `output/audit-20260831-filigree-harmonized/before-home-hover-left-1280x720-v2.png`.
- Implementación final sobre Inicio: `output/audit-20260831-filigree-harmonized/home-final-rest-1280x720.png`, `home-final-hover-left-1280x720.png` y `home-final-hover-right-1280x720.png`.
- Implementación final sobre Servicios: `output/audit-20260831-filigree-harmonized/services-final-rest-1280x720.png` y `services-final-hover-left-1280x720.png`.
- Evidencia móvil: `output/audit-20260831-filigree-harmonized/home-final-mobile-rest-390x844.png`.
- Comparación completa: `output/audit-20260831-filigree-harmonized/comparison-before-after-home.png`. Orden: reposo anterior, hover anterior, reposo final y hover final.
- Comparación focal conjunta: `output/audit-20260831-filigree-harmonized/comparison-focus-source-before-after-services.png`. Orden: fuente, reposo anterior, hover anterior, reposo final, hover final y Servicios final.
- Viewport de escritorio: 1280 × 720 CSS px, captura 1280 × 720 px, DPR 1. Viewport móvil: 390 × 844 CSS px, captura 390 × 844 px, DPR 1. No se aplicó normalización de densidad adicional.

### Hallazgos e iteración

- Primera comparación — P2: Inicio saltaba de 0.08 a 0.86 y Servicios de 0.036 a 0.76. El filtro cambiaba de brillo 0.50 a 0.94, la máscara mantenía un núcleo casi opaco y tres sombras marcadas producían un destello aislado, no la iluminación gradual del mismo relieve.
- Corrección: Inicio usa base 0.13 y halo 0.42; Servicios usa base 0.05 y halo 0.22. Ambos estados comparten sepia 0.10 y filtros próximos: brillo 0.60/0.82, saturación 0.58/0.66 y contraste 1.03/1.05. Las sombras se alinean con `--public-gold` y `--public-gold-strong` y se limitan a 1, 5 y 9 px con opacidades entre 8 % y 14 %.
- Corrección de transición: la máscara final comienza en 82 %, baja a 70 % y 32 % y desaparece gradualmente; la salida usa 380 ms y la activación 260 ms con curva suave. Se mantiene el radio compacto solicitado.
- Comparación posterior: en el recorte izquierdo equivalente, la diferencia máxima por canal bajó de 178 a 65 (aproximadamente 63 % menos), mientras la diferencia media bajó de 5.837 a 3.542. El área modificada es un poco más extensa pero mucho menos intensa, lo que produce una pátina continua en vez de un foco duro. En Servicios la diferencia máxima fue 20 y la media 0.952, sin bloque gris.
- Resultado: no quedan hallazgos P0, P1 o P2 dentro de este alcance. P3 no bloqueante: comprobar moiré, contraste y reproducción del oro en pantallas físicas DPR 2 y perfiles P3 distintos.

### Superficies de fidelidad

- Tipografía: no se modificaron familias, pesos, tamaños, interlineado, tracking, jerarquía ni envolturas.
- Espaciado y ritmo: los raíles conservan su ancho, escala y posición; la capa continúa absoluta y produjo 0 px de desbordamiento horizontal en Inicio, Servicios y móvil.
- Colores y tokens: la pátina ahora usa el mismo champán envejecido y bronce de `--public-gold: #d8ad62` y `--public-gold-strong: #f0c777`; no se añadió amarillo plano, neón ni modo de mezcla.
- Calidad de imagen: se reutilizan los WebP con alfa derivados del raster suministrado. No se regeneró, recortó ni sustituyó el mosaico con SVG, gradientes ornamentales, arte CSS o placeholders.
- Copia y contenido: no se cambió ningún texto, traducción, CTA, perfil, servicio ni aviso.
- Interacción y accesibilidad: la decoración sigue `aria-hidden`, sin foco, roles ni eventos propios y con `pointer-events:none`. El halo solo se habilita con puntero fino desde 1100 px y cuando no hay movimiento reducido. Touch mantiene la base estática; impresión y colores forzados ocultan la decoración deliberadamente.

### Verificación final

- Inicio en reposo, hover izquierdo y derecho, Servicios en reposo/hover y móvil revisados visualmente en el navegador integrado.
- Consola: cero errores y cero advertencias. Quince imágenes visibles, cero recursos rotos.
- Prueba focal de preview: 14/14 aprobadas. TypeScript: aprobado.
- `pnpm run release:verify`: aprobado con lint, TypeScript, 205/205 pruebas, cinco entornos Vinext, preparación standalone, i18n `PASS_WITH_LIMITS`, scorecard local 98/100, SBOM de 612 componentes, artefactos sin infracciones y smoke fail-closed.
- `productionActivation:false`; la revisión lingüística humana, derechos, legal, UAT y publicación siguen pendientes. Este pase valida el preview local, no una publicación comercial.

final result: passed

## Estado vigente · mosaico ambiental de fondo completo

- La evidencia y el historial de iteración de esta revisión están documentados en la sección `Mosaico ambiental de fondo completo` de este archivo.
- La comparación equivalente antes/reposo/hover, la cobertura de Inicio, Cobertura, perfil, Servicios y móvil, y las verificaciones de interacción no presentan hallazgos P0, P1 o P2.
- `pnpm run release:verify` aprobó lint, TypeScript, 205/205 pruebas, cinco builds Vinext, standalone, i18n `PASS_WITH_LIMITS`, scorecard local 98/100, SBOM de 612 componentes, artefactos worker/standalone sin infracciones y smoke fail-closed con `productionActivation:false`.
- Este es el cierre visual local vigente; no constituye activación productiva, aprobación legal, UAT ni autorización de publicación.

final result: passed

## Alineación de portada con la propuesta gráfica del cliente

Fecha de cierre local: 2026-08-31

### Fuente y estado comparado

- Referencia aportada por el usuario: `C:\Users\artot\AppData\Local\Temp\codex-clipboard-1943ad7c-568c-479e-872b-e02418558677.png`, 1132 × 754 px.
- Implementación: `/preview-local-sintetico?lang=es#inicio`, viewport solicitado 1132 × 754 CSS px; área útil capturada 1117 × 744 px por barras del navegador.
- Comparación conjunta: `output/audit-20260831-reference-alignment/reference-vs-implementation-final.png`; referencia a la izquierda e implementación a la derecha, en el mismo estado inicial.
- Catálogo final: `output/audit-20260831-reference-alignment/final-profiles-desktop-1132x754.png`.
- Estado móvil solicitado: 390 × 844 CSS px; mediciones DOM sobre 375.2 px útiles.

### Historial de hallazgos y correcciones

- P1 corregido: el hero anterior usaba un retrato vertical de pie con `contain`, 650 px de alto y una composición distinta. Se creó un hero horizontal sintético 1536 × 1024, local-only, con identidad adulta ficticia, vestido negro, copa, luz ámbar y espacio negativo para el copy. El primer recorte cortaba la frente; el foco vertical se desplazó a 24 % en escritorio y 22 % en móvil hasta conservar la cara completa.
- P1 corregido: la composición móvil apilaba copy e imagen y hacía el hero excesivamente largo. El estado final mantiene imagen y texto superpuestos en 340 px, con dos acciones visibles y sin desbordamiento.
- P2 corregido: cabecera, logo, navegación y CTA no seguían la densidad de la propuesta. El lockup usa el favicon transparente real, siete destinos internos compactos y “Reserva privada” permanece desactivada con nombre accesible explícito.
- P2 corregido: cobertura ocupaba dos grandes bloques fotográficos. Las ocho ciudades conservan imagen propia, ID, nombre y estado, pero se presentan como dos rutas compactas de cuatro destinos; en móvil las dos zonas forman un rail con `scroll-snap`.
- P2 corregido: los seis perfiles se presentaban en una cuadrícula 3 × 2. Ahora forman una fila de seis tarjetas en escritorio y dos columnas en móvil, con caras completas, enlaces reales, estado, ciudad, edad y disclosure IA compacto.
- P2 corregido: el formulario visual dominaba el home. Sigue completamente funcional dentro de un `details` nativo; se verificó Madrid + Disponible, con resultado “1 perfil ficticio” y Valeria como única tarjeta.
- P2 corregido durante QA: una regla de apilamiento volvió relativa la navegación inferior móvil. El estado final restaura `position:fixed`, 63.2 px de alto y borde inferior del viewport a 844 px.

### Superficies verificadas

- Tipografía: serif editorial para titulares, sans compacta para navegación y controles, dos líneas estables en el hero y sin el corte tipográfico observado en iteraciones anteriores.
- Espaciado: header 72 px, hero 342.1 px, franja de confianza 79.6 px; no existe desbordamiento horizontal en 1132 ni 390 px.
- Imágenes: hero 1536 × 1024, ocho ciudades 1200 × 900 y seis perfiles 1086 × 1448 cargaron con `complete=true` y ancho natural válido. No hay placeholders ni activos estirados.
- Interacciones: filtros GET, detalle de Valeria, 34 tarjetas de servicios, navegación por anclas y menú inferior funcionan. Reserva y contacto siguen desactivados. Cero enlaces externos en las rutas probadas.
- Consola: sin errores de aplicación en la carga final; solo mensajes informativos de Vite/React y el evento esperado de reconexión causado por el reinicio controlado del servidor local.
- Publicación: el hero nuevo vive fuera de `public/`, se entrega por middleware local allowlisted y tiene manifiesto, hashes, prompt y alcance `local_preview_only_no_publication`.

### Decisiones deliberadas

- Los mockups de tableta y teléfono pertenecen al tablero de presentación, no al contenido de la página real; no se incrustaron como decoración del sitio.
- Las afirmaciones de “cobertura real”, atención 24/7 y disponibilidad comercial de la referencia no se copiaron como hechos. La maqueta conserva estados de confirmación y controles fail-closed.
- La revisión humana, comercial, lingüística, de derechos y legal permanece pendiente; este QA visual no autoriza producción.

No quedan hallazgos P0, P1 o P2 en el alcance de alineación de la portada.

final result: passed

## Logotipo ampliado y portada dividida por zonas

Fecha de cierre local: 2026-09-01

### Fuente y comparación equivalente

- Referencia aportada por el usuario: `C:\Users\artot\AppData\Local\Temp\codex-clipboard-1943ad7c-568c-479e-872b-e02418558677.png`, tablero de 1132 × 753 px.
- Implementación: `/preview-local-sintetico?lang=es#inicio`, viewport solicitado 1132 × 754 CSS px; área útil capturada 1117 × 744 px por las barras del navegador integrado.
- Portada final: `output/audit-20260901-city-zones/after-desktop-1132x754.png`.
- Zonas finales: `output/audit-20260901-city-zones/after-zones-desktop-1132x754.png`.
- Estado móvil: `output/audit-20260901-city-zones/after-mobile-390x844.png`, viewport solicitado 390 × 844 CSS px.
- Comparación conjunta principal: `output/audit-20260901-city-zones/reference-vs-city-zones-final-detail.png`; cada fila coloca la referencia y la implementación en una misma entrada visual. El tablero de referencia contiene mockups de dispositivos, por lo que la evaluación normaliza la composición contra el panel de escritorio y no trata esos mockups como contenido de la página.

### Hallazgos, correcciones y fidelidad

- P2 corregido: el lockup medido pasó de una marca de 38 × 38 px y nombre de 23.2 px a una marca efectiva de 48 × 48 px y nombre de 28.48 px. El conjunto conserva 48 px de alto y 229.19 px de ancho dentro de la cabecera de 72 px, sin colisión con navegación ni reserva.
- P2 corregido: la cobertura y los perfiles ya no forman dos módulos inconexos. Madrid y Barcelona son dos artículos etiquetados, visibles en paralelo en escritorio, y cada uno reúne cuatro destinos, su CTA territorial y tres perfiles destacados.
- P2 corregido durante QA: una regla antigua de 900 px quedaba anulada por la capa scoped posterior. La regla efectiva se movió después de la composición base; a 390 y 320 px las zonas se apilan a una columna y las tarjetas se mantienen en un rail horizontal propio, sin comprimir las dos ciudades en media pantalla.
- P1 corregido durante la auditoría adversarial: entre 781 y 1100 px el control “Menú” apuntaba a una navegación inferior aún oculta. Ahora se llama “Zonas” y lleva a la sección visible y etiquetada `#perfiles`; a 902 px el destino está renderizado y el control no queda huérfano.
- P1 corregido: el outline anterior descendía de H4 a H2 dentro de las tarjetas. La sección de perfiles tiene H2 propio; cada zona usa H3, sus bloques H4 y las seis tarjetas compactas H5.
- P1/P2 corregido: un filtro exclusivo de disponibilidad ahora deriva las zonas reales del perfil, por lo que Lucía puede aparecer en Madrid y Barcelona sin alterar la presentación editorial 3 + 3 del estado inicial. Los enlaces de zona conservan el filtro de disponibilidad activo.
- La portada sin filtros conserva una presentación editorial 3 + 3: Madrid muestra Valeria, Lucía y Alicia; Barcelona muestra Sofía, Julia y Mia.
- La semántica exacta de filtros no se alteró: `city=madrid` devuelve Valeria, Lucía y Alicia en Madrid; `city=barcelona` devuelve Sofía, Lucía y Mia en Barcelona. Julia continúa siendo Girona, aunque editorialmente pertenezca a la zona visual de Barcelona.
- Comparación final: no quedan diferencias P0, P1 o P2 dentro del alcance solicitado. P3 no bloqueante: revisar el oro y la densidad del mosaico en una pantalla física DPR 2/P3.

### Accesibilidad, interacción y límites

- Un solo `main`, un solo `h1`, dos zonas con IDs únicos y `aria-labelledby`, ocho ciudades con IDs únicos y cero IDs duplicados en el DOM observado.
- El logotipo conserva icono decorativo con `alt=""` y `aria-hidden="true"`; el nombre visible sigue aportando la identidad textual.
- Los enlaces territoriales, filtros GET, tarjetas de perfil y navegación interna son funcionales. No se observaron enlaces externos; reserva, contacto y pagos permanecen desactivados.
- No hubo desbordamiento horizontal respecto al viewport en 1132, 902, 390 o 320 px. La cabecera de 320 px mantiene separación entre marca, reserva y el control “Zonas”.
- Las seis imágenes de perfiles y las ocho referencias de ciudad cargaron con dimensiones naturales válidas en la evidencia final; la consola no contiene errores ni advertencias de aplicación, solo trazas informativas de Vite/React.
- El preview sigue siendo local-only, `noindex`, sin activación comercial y con `productionActivation:false`. La revisión humana de idiomas, derechos, legal, UAT y publicación permanece pendiente.

### Verificación final

- `pnpm run validate`: aprobado.
- ESLint y TypeScript: aprobados.
- Pruebas: 206/206 aprobadas, incluida la nueva cobertura estructural y responsive de las dos zonas.
- Build Vinext: cinco entornos aprobados; standalone generado y dependencias de runtime preparadas.
- El tag anotado `v0.1.0-beta.1` no se movió y sigue resolviendo a `5212a0afa487a80830c5d26a7dd1080f0bfbba7e`.

final result: passed

## Ajuste final del logotipo de cabecera

Fecha de cierre local: 2026-09-01

### Fuente y comparación equivalente

- Captura aportada por el usuario: `C:\Users\artot\AppData\Local\Temp\codex-clipboard-32b2e01d-f6a9-40fd-aef7-27639923f65d.png`, 1916 × 959 px.
- Estado anterior medido en el navegador integrado: `output/audit-20260901-logo-scale/before-desktop-1916x959.png`.
- Implementación final: `output/audit-20260901-logo-scale/after-desktop-1916x959.png`.
- Comparación equivalente antes/después: `output/audit-20260901-logo-scale/before-vs-after-logo-final.png`.
- Comparación conjunta con la captura del usuario: `output/audit-20260901-logo-scale/reference-vs-logo-final.png`.
- Evidencia responsive: `after-tablet-902x800.png`, `after-mobile-390x844.png` y `after-narrow-320x700.png` dentro del mismo directorio de auditoría.

### Medidas y fidelidad

- Escritorio: el isotipo pasa de 48 × 48 px a 54 × 54 px; el nombre pasa de 28.48 a 31.2 px y la cabecera de 72 a 76 px. El lockup final mide 243.39 × 54 px.
- La ampliación es proporcional y conserva el recurso real `/icon.png`, su transparencia, la tipografía serif, el subtítulo y la paleta existente; no se creó ni sustituyó ningún activo.
- A 1916 px quedan 499.98 px entre el lockup y la navegación, y 16 px entre navegación y reserva.
- A 902 px el lockup conserva 54 px de marca y 31.2 px de nombre; hay más de 365 px antes de Reserva y separación positiva entre Reserva, Zonas y Local.
- A 390 y 320 px el isotipo usa 38 × 38 px y el nombre 21.12 px dentro de una cabecera de 68 px. En 320 px quedan 36.15 px entre marca y Reserva, y 4 px entre Reserva y Zonas.
- En los cuatro viewports el ancho máximo observado se mantiene dentro del viewport solicitado y no hay superposición entre los controles hermanos de la cabecera.

### Verificación final

- Comparaciones completas y focales revisadas juntas en el navegador integrado; no quedan hallazgos P0, P1 o P2 dentro de este ajuste.
- La consola no contiene errores de aplicación; solo mensajes informativos de Vite/React y la actualización CSS esperada.
- `pnpm run validate`: aprobado con ESLint, TypeScript, 206/206 pruebas, cinco entornos Vinext y preparación standalone.
- El cambio está limitado a la capa scoped del preview y sus contratos de prueba. Hero, navegación, zonas, filtros, perfiles y gates local-only permanecen sin cambios funcionales.
- `productionActivation:false`; este pase valida el preview local y no constituye despliegue, publicación, UAT ni aprobación comercial o legal.

final result: passed

## Ampliación adicional del logotipo de cabecera

Fecha de cierre local: 2026-09-01

### Fuente y comparación equivalente

- Estado de partida: `output/audit-20260901-logo-scale-v2/before-desktop-1916x959.png`.
- Implementación final: `output/audit-20260901-logo-scale-v2/after-desktop-1916x959.png`.
- Ambas capturas se tomaron a 1916 × 959 CSS px y DPR 1, por lo que no fue necesaria normalización geométrica.
- Comparación completa conjunta: `output/audit-20260901-logo-scale-v2/before-vs-after-full-final.png`.
- Comparación focal conjunta: `output/audit-20260901-logo-scale-v2/before-vs-after-logo-final.png`.
- Evidencia responsive: `after-tablet-902x800.png`, `after-mobile-390x844.png` y `after-narrow-320x700.png` dentro del mismo directorio.

### Medidas y hallazgos

- Escritorio: el isotipo pasa de 54 × 54 px a 60 × 60 px; el nombre pasa de 31.2 a 33.6 px y la cabecera de 76 a 82 px. El lockup final mide 257.43 × 60 px.
- A 1916 px quedan 485.94 px entre marca y navegación, y 16 px entre navegación y Reserva.
- A 902 px el lockup conserva 257.43 px de ancho y quedan 351.3 px antes de Reserva.
- A 390 px el isotipo queda en 40 × 40 px, el nombre en 22.08 px y la cabecera en 70 px; quedan 83.89 px antes de Reserva y 4 px antes del control de menú.
- A 320 px se conservan 28.69 px entre marca y Reserva, y 4 px entre Reserva y menú.
- No se observaron colisiones, recortes del lockup ni desbordamientos funcionales en los cuatro viewports. No quedan hallazgos P0, P1 o P2 dentro del alcance solicitado.

### Verificación final

- Consola final: 0 errores y 0 advertencias de aplicación.
- `pnpm run validate`: aprobado con ESLint, TypeScript, 206/206 pruebas, cinco entornos Vinext y preparación standalone.
- El ajuste no cambia hero, navegación, zonas, filtros, perfiles ni comportamiento. `productionActivation:false` permanece vigente.
- La etapa valida el preview local; no representa despliegue, publicación, UAT ni activación comercial.

final result: passed

## Logotipo XL sin alterar la composición

Fecha de cierre local: 2026-09-01

### Fuente y comparación equivalente

- Verdad visual de partida: `output/audit-20260901-logo-xl/before-desktop-1916x959.jpg`.
- Implementación final: `output/audit-20260901-logo-xl/after-desktop-1916x959.jpg`.
- Ambas capturas usan 1916 × 959 CSS px, DPR 1, estado superior de `/preview-local-sintetico?lang=es#inicio` y no requieren normalización de densidad.
- Comparación completa conjunta: `output/audit-20260901-logo-xl/before-vs-after-full-final.jpg`.
- Comparación focal conjunta de cabecera: `output/audit-20260901-logo-xl/before-vs-after-logo-final.jpg`.
- Evidencia responsive final: capturas de 1180, 1179, 1132, 1101, 1100, 902, 781, 780, 390, 360 y 320 px dentro del mismo directorio.

### Historial de comparación y correcciones

- Iteración 1: el isotipo subió de 60 a 80 px y el nombre de 33.6 a 42.4 px. La composición permaneció estable, pero el aumento tipográfico todavía era moderado frente a la petición de una marca mucho más protagonista. Evidencia: `iteration-1-desktop-1916x959.jpg`.
- Iteración 2: se mantuvo el límite vertical seguro de 80 px y el nombre aumentó a 60.8 px. Entre 1101 y 1179 px usa 56 px; en móvil el conjunto usa 56/27.2 px y, hasta 360 px, 48/24 px. La segunda comparación conjunta no encontró hallazgos P0, P1 o P2.

### Medidas y estabilidad

- A 1916 px el lockup final mide 401.69 × 80 px. La cabecera continúa en 82 px, el hero comienza exactamente en `y=82`, la navegación conserva `x=1000.16` y Reserva `x=1476.41`; ninguna de estas piezas cambió tamaño o posición respecto a la fuente.
- Separación entre marca y siguiente control: 341.68 px a 1916; 67.38 px a 1180; 66.69 px a 1179; 52.59 px a 1132; 27.4 px a 1101; 207.04 px a 902; 96.33 px a 781; 41.3 px a 390; 37.11 px a 360 y 12.31 px a 320.
- En todos los puntos observados el solapamiento calculado es 0 px. El ancho de contenido no supera el viewport solicitado. A 320 px, la diferencia entre `innerWidth` y `clientWidth` corresponde a la barra nativa del navegador integrado y no a un elemento nuevo fuera del lienzo.
- El recurso de marca sigue siendo el PNG transparente real, solicitado a 96 × 96 px; no se añadió SVG, CSS art ni sustituto aproximado.

### Superficies de fidelidad y verificación

- Tipografía: se conserva Georgia/Times, el mismo peso óptico, color y jerarquía; solo aumenta la escala con un tramo protector para navegación completa.
- Ritmo y layout: cabecera, hero, franja de confianza, zonas, botones y navegación mantienen sus dimensiones; el cambio queda contenido en el lockup.
- Color: permanecen intactos los tokens negro, marfil y dorado.
- Imagen: el isotipo conserva transparencia, nitidez y proporción sin recorte visible.
- Copy: nombre y subtítulo no cambian.
- Consola del navegador: 0 errores y 0 advertencias; únicamente mensajes informativos de Vite/React.
- ESLint focal de los dos archivos TypeScript modificados: aprobado. TypeScript completo: aprobado.
- Pruebas completas: 206/206 aprobadas.
- Build Vinext: cinco entornos aprobados; salida standalone y dependencias de runtime preparadas.
- `productionActivation:false` permanece vigente. Este pase local no demuestra despliegue ni activación comercial.

final result: passed
