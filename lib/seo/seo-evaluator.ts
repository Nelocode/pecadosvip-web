export type SeoTrafficLightStatus = 'green' | 'orange' | 'red';

export type SeoMetricResult = {
  status: SeoTrafficLightStatus;
  score: number; // 0 to 100
  message: string;
  recommendation?: string;
};

export type SeoAnalysisInput = {
  title: string;
  metaDescription: string;
  bodyText: string;
  targetKeyword: string;
  targetCity: string;
  galleryImages: Array<{ alt: string; filename?: string }>;
  headings?: Array<{ level: 'h1' | 'h2' | 'h3'; text: string }>;
};

export type SeoReport = {
  overallStatus: SeoTrafficLightStatus;
  overallScore: number;
  metrics: {
    title: SeoMetricResult;
    metaDescription: SeoMetricResult;
    keywordDensity: SeoMetricResult;
    galleryAlt: SeoMetricResult;
    headings: SeoMetricResult;
  };
};

const COMMON_CTA_WORDS = [
  'reserva', 'contacta', 'llama', 'whatsapp', 'descubre',
  'conoce', 'agenda', 'ver', 'encuentra', 'disfruta', 'book', 'call'
];

export function evaluateSeoTitle(title: string, targetKeyword: string, targetCity: string): SeoMetricResult {
  const cleanTitle = (title || '').trim();
  const lowerTitle = cleanTitle.toLowerCase();
  const lowerKeyword = (targetKeyword || '').trim().toLowerCase();
  const lowerCity = (targetCity || '').trim().toLowerCase();

  const len = cleanTitle.length;
  const hasKeyword = lowerKeyword ? lowerTitle.includes(lowerKeyword) : true;
  const hasCity = lowerCity ? lowerTitle.includes(lowerCity) : true;

  if (len >= 45 && len <= 60 && hasKeyword && hasCity) {
    return {
      status: 'green',
      score: 100,
      message: 'Título SEO perfecto (45-60 caracteres con palabra clave y ciudad).',
    };
  }

  if (len < 35 || len > 65 || !hasKeyword || !hasCity) {
    const missing: string[] = [];
    if (len < 35) missing.push(`demasiado corto (${len} chars, mín 45)`);
    if (len > 65) missing.push(`demasiado largo (${len} chars, máx 60)`);
    if (!hasKeyword) missing.push(`falta palabra clave "${targetKeyword}"`);
    if (!hasCity) missing.push(`falta ciudad "${targetCity}"`);

    return {
      status: 'red',
      score: 30,
      message: `Título deficiente: ${missing.join(', ')}.`,
      recommendation: 'Ajusta el título entre 45 y 60 caracteres e incluye la palabra clave y la ciudad.',
    };
  }

  return {
    status: 'orange',
    score: 70,
    message: 'Título aceptable pero fuera del rango ideal 45-60 caracteres.',
    recommendation: 'Optimiza la longitud para mantenerla entre 45 y 60 caracteres.',
  };
}

export function evaluateMetaDescription(metaDescription: string, targetKeyword: string): SeoMetricResult {
  const cleanMeta = (metaDescription || '').trim();
  const lowerMeta = cleanMeta.toLowerCase();
  const lowerKeyword = (targetKeyword || '').trim().toLowerCase();

  const len = cleanMeta.length;
  const hasKeyword = lowerKeyword ? lowerMeta.includes(lowerKeyword) : true;
  const hasCta = COMMON_CTA_WORDS.some((word) => lowerMeta.includes(word));

  if (len >= 120 && len <= 155 && hasKeyword && hasCta) {
    return {
      status: 'green',
      score: 100,
      message: 'Meta descripción ideal (120-155 caracteres con palabra clave y CTA).',
    };
  }

  if (len === 0 || len < 100 || len > 165 || !hasKeyword) {
    return {
      status: 'red',
      score: 25,
      message: 'Meta descripción fuera del rango o sin palabra clave.',
      recommendation: 'Redacta entre 120 y 155 caracteres con una llamada a la acción y la palabra clave.',
    };
  }

  return {
    status: 'orange',
    score: 65,
    message: 'Meta descripción aceptable sin CTA explícita o ligeramente corta/larga.',
    recommendation: 'Añade un verbo de acción (ej: "Reserva hoy", "Contacta ahora").',
  };
}

export function evaluateKeywordDensity(bodyText: string, targetKeyword: string): SeoMetricResult {
  const text = (bodyText || '').trim();
  const kw = (targetKeyword || '').trim().toLowerCase();

  if (!text || !kw) {
    return {
      status: 'red',
      score: 0,
      message: 'Texto descriptivo o palabra clave ausentes.',
    };
  }

  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { status: 'red', score: 0, message: 'Texto vacío.' };
  }

  // Count occurrences of targetKeyword phrase
  const kwWords = kw.split(/\s+/).filter(Boolean);
  let count = 0;
  
  if (kwWords.length === 1) {
    count = words.filter((w) => w.includes(kw)).length;
  } else {
    const textLower = text.toLowerCase();
    let pos = 0;
    while ((pos = textLower.indexOf(kw, pos)) !== -1) {
      count++;
      pos += kw.length;
    }
  }

  const densityPercentage = (count / words.length) * 100;

  if (densityPercentage >= 1.0 && densityPercentage <= 2.5) {
    return {
      status: 'green',
      score: 100,
      message: `Densidad óptima (${densityPercentage.toFixed(2)}%).`,
    };
  }

  if (densityPercentage < 0.5) {
    return {
      status: 'orange',
      score: 50,
      message: `Densidad baja (${densityPercentage.toFixed(2)}%). Riesgo de no posicionar.`,
      recommendation: 'Aumenta las menciones naturales de la palabra clave.',
    };
  }

  if (densityPercentage > 3.0) {
    return {
      status: 'red',
      score: 20,
      message: `Densidad excesiva (${densityPercentage.toFixed(2)}%). Riesgo de Keyword Stuffing.`,
      recommendation: 'Reduce la repetición de la palabra clave.',
    };
  }

  return {
    status: 'orange',
    score: 75,
    message: `Densidad en rango moderado (${densityPercentage.toFixed(2)}%).`,
  };
}

export function evaluateGalleryAlt(galleryImages: Array<{ alt: string; filename?: string }>): SeoMetricResult {
  if (!galleryImages || galleryImages.length === 0) {
    return {
      status: 'orange',
      score: 60,
      message: 'Sin imágenes en la galería.',
    };
  }

  const total = galleryImages.length;
  const validAltCount = galleryImages.filter((img) => {
    const alt = (img.alt || '').trim();
    if (alt.length < 3) return false;
    const genericTerms = ['image', 'foto', 'img', 'dsc', 'photo', 'picture', 'file'];
    return !genericTerms.includes(alt.toLowerCase());
  }).length;

  const percentage = (validAltCount / total) * 100;

  if (percentage === 100) {
    return {
      status: 'green',
      score: 100,
      message: '100% de las imágenes cuentan con etiquetas Alt descriptivas.',
    };
  }

  if (percentage >= 70) {
    return {
      status: 'orange',
      score: 70,
      message: `${validAltCount} de ${total} imágenes tienen etiqueta Alt adecuada (${percentage.toFixed(0)}%).`,
      recommendation: 'Asigna atributos Alt descriptivos a todas las imágenes.',
    };
  }

  return {
    status: 'red',
    score: 30,
    message: `Solo ${validAltCount} de ${total} imágenes tienen etiqueta Alt (${percentage.toFixed(0)}%).`,
    recommendation: 'Optimiza los textos alternativos de la galería.',
  };
}

export function evaluateHeadings(headings?: Array<{ level: 'h1' | 'h2' | 'h3'; text: string }>): SeoMetricResult {
  if (!headings || headings.length === 0) {
    return {
      status: 'green',
      score: 90,
      message: 'Estructura por defecto sin infracciones de encabezados.',
    };
  }

  const h1Count = headings.filter((h) => h.level === 'h1').length;
  if (h1Count > 1) {
    return {
      status: 'red',
      score: 20,
      message: `Infracción SEO: Se detectaron ${h1Count} etiquetas H1 en la página. Solo debe haber un H1 principal.`,
      recommendation: 'Conserva únicamente un H1 por página.',
    };
  }

  return {
    status: 'green',
    score: 100,
    message: 'Jerarquía de encabezados H1 > H2 > H3 coherente.',
  };
}

export function analyzeProfileSeo(input: SeoAnalysisInput): SeoReport {
  const title = evaluateSeoTitle(input.title, input.targetKeyword, input.targetCity);
  const metaDescription = evaluateMetaDescription(input.metaDescription, input.targetKeyword);
  const keywordDensity = evaluateKeywordDensity(input.bodyText, input.targetKeyword);
  const galleryAlt = evaluateGalleryAlt(input.galleryImages);
  const headings = evaluateHeadings(input.headings);

  const totalScore = Math.round(
    (title.score + metaDescription.score + keywordDensity.score + galleryAlt.score + headings.score) / 5
  );

  let overallStatus: SeoTrafficLightStatus = 'green';
  if (totalScore < 60 || title.status === 'red' || metaDescription.status === 'red') {
    overallStatus = 'red';
  } else if (totalScore < 85 || title.status === 'orange' || metaDescription.status === 'orange') {
    overallStatus = 'orange';
  }

  return {
    overallStatus,
    overallScore: totalScore,
    metrics: {
      title,
      metaDescription,
      keywordDensity,
      galleryAlt,
      headings,
    },
  };
}
