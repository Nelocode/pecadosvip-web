# Prompts de imágenes sintéticas de servicios · v1

## Parámetros comunes

- Taxonomía: `photorealistic-natural`.
- Uso: tarjeta editorial 4:5 y hero de detalle.
- Estilo: fotografía editorial cinematográfica, lujo europeo sobrio, realismo natural.
- Paleta: negro, espresso, bronce y dorado champán apagado.
- Luz: ambiente ámbar de baja intensidad, reflejos dorados contenidos y sombras profundas.
- Composición: vertical 4:5, foco legible a tamaño de tarjeta y espacio respirable.
- Calidad solicitada: alta.
- Restricciones comunes: sin personas, partes del cuerpo, desnudez, actos explícitos, texto, letras, logotipos, marcas, marcas de agua, direcciones o lugares identificables.
- Evitar: estética de stock, corazones, pétalos, neón rojo, clichés, saturación, bloom intenso y desorden.

Los siguientes bloques son la petición principal y los objetos específicos usados junto con los parámetros comunes:

1. `company-private-lounge-v01`: salón nocturno contemporáneo con dos butacas escultóricas orientadas entre sí y dos copas sobre una mesa pequeña de mármol oscuro.
2. `settings-private-celebration-v01`: cubitera refinada, dos sobres negros totalmente en blanco y una cinta dorada escultórica en un comedor privado.
3. `settings-hotel-arrival-v02`: consola de llegada con tarjeta negra totalmente lisa, maletín de viaje sin etiqueta ni marca y pasillo de hotel anónimo al fondo. La versión v02 elimina símbolos y trazos semejantes a texto detectados en el primer candidato.
4. `settings-home-arrival-v01`: consola residencial con llave de latón sin marca, manta de cachemira oscura y luz cálida tras una puerta abierta.
5. `couples-two-settings-v01`: exactamente dos copas y dos butacas frente a una ventana nocturna, composición simétrica.
6. `couples-private-gathering-v01`: exactamente tres copas en triángulo y tres asientos vacíos desenfocados en un salón privado.
7. `wellbeing-spa-ritual-v01`: toallas color carbón, frascos de aceite ámbar sin etiqueta, cuenco cerámico y vapor suave.
8. `wellbeing-water-ritual-v01`: ducha de lluvia tras vidrio ahumado, toalla oscura y frasco ámbar sin etiqueta sobre banco de piedra.
9. `roleplay-theatre-mask-v01`: antifaz de terciopelo negro, guantes de satén y estuche lacado cerrado sobre tocador teatral; sin objetos explícitos.
10. `roleplay-consent-accessories-v01`: abanico negro, reloj de arena, tres tarjetas completamente en blanco y bolsa de satén cerrada; sin armas, ataduras ni objetos explícitos.
11. `preferences-silk-envelope-v01`: sobre negro completamente en blanco y cerrado sobre seda dorada, acompañado por dos piedras negras pulidas.
12. `preferences-choice-boxes-v01`: seis cajas negras ordenadas; una abierta con interior de seda dorada, tarjeta totalmente en blanco y lápiz dorado.
13. `company-women-companionship-v01`: dos tazas de porcelana negra diferenciadas, libro cerrado, pluma dorada y peonía borgoña sobre mármol oscuro.
14. `couples-partner-companionship-v01`: dos servicios de mesa separados, dos aros de servilleta dorados y una cinta de seda que los conecta.
15. `preferences-agreed-intimacy-v01`: balanza de latón equilibrada con dos tarjetas crema completamente en blanco y cierres dorados idénticos.
16. `roleplay-personal-fantasy-v01`: pequeño proscenio teatral vacío, tres cajas negras cerradas, cortina borgoña y un foco dorado.
17. `roleplay-agreed-fetish-v01`: cajón de terciopelo con tres compartimentos separados para una pluma, una cinta de satén suelta y una piedra lisa; sin accesorios explícitos.
18. `preferences-oral-complete-v01`: cuatro cuencos ovalados de laca negra formando un círculo completo alrededor de una perla; formas no anatómicas.
19. `preferences-oral-natural-v01`: cuenco de travertino natural, una camelia blanca y dos gotas transparentes sobre mármol negro.
20. `preferences-oral-intense-v01`: escultura abstracta en espiral de obsidiana sobre pedestal, iluminada por un haz ámbar concentrado; forma no anatómica.
21. `couples-open-pair-v01`: dos arcos escultóricos abiertos de latón, claramente separados y sin apariencia de alianzas, con espacio central iluminado.
22. `roleplay-adult-games-v01`: mesa de juego con cartas negras totalmente en blanco, fichas doradas y reloj de arena; sin símbolos legibles.
23. `wellbeing-kamasutra-connection-v01`: dos formas de piedra tallada no anatómicas entrelazadas como nudo escultórico sobre lino carbón y una vela baja.
24. `preferences-water-play-v01`: lavabo poco profundo de piedra negra con ondas concéntricas, dos gotas escultóricas de vidrio y detalle de latón.
25. `wellbeing-sensual-massage-v01`: piedras de basalto, toalla carbón doblada, rodillo de madera, vela baja y frasco de aceite ámbar sin etiqueta.
26. `roleplay-editorial-pse-v01`: estudio editorial vacío, silla de dirección negra sin texto, foco, hojas de contacto en blanco y clips dorados.
27. `roleplay-consensual-sm-v02`: dos arcos abstractos lisos de obsidiana, claramente separados, con fichas de vidrio verde y roja; símbolo decorativo no explícito, sin bandas, cierres, ataduras ni accesorios identificables. La versión v01 fue descartada porque sus bandas y cierres podían interpretarse como ataduras.
28. `preferences-oral-intimacy-v01`: dos recipientes curvos de vidrio orientados entre sí y una única perla entre ambos; formas no anatómicas.
29. `roleplay-adult-accessories-v01`: vitrina cerrada con pequeñas cajas negras y accesorios escultóricos abstractos no explícitos.
30. `roleplay-private-striptease-v01`: escenario de cabaré vacío, cortina borgoña entreabierta, zapatos dorados y abanico de plumas; sin personas.
31. `company-gfe-experience-v01`: bandeja de desayuno para dos con café, bollería, flores y tarjeta completamente en blanco.
32. `couples-private-trio-v01`: tres vasos distintos dispuestos en triángulo sobre mármol oscuro, vistos desde arriba.
33. `couples-women-experience-v01`: dos jarrones escultóricos distintos con flores complementarias bajo luz ámbar.
34. `preferences-control-play-v01`: metrónomo de latón, dos cajas abiertas y una ficha verde de seguridad sobre mármol negro.

## Derivación web

Los 34 PNG originales se redimensionaron con Sharp a 960 × 1200 px, `fit: cover`, posición central y WebP de calidad 86. Los SHA-256 de ambas versiones están en `ASSET_MANIFEST.csv`. Cada ruta de servicio usa una clave y un archivo exclusivos; las pruebas automatizadas impiden reintroducir duplicados técnicos.
