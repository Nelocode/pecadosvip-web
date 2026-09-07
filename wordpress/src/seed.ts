import { getSyntheticPreviewProfiles } from '../../lib/preview/synthetic-preview';
import { getSyntheticServiceCatalog, getSyntheticServiceMessages } from '../../lib/preview/synthetic-services';
import { getSyntheticBetaCopy } from '../../lib/preview/synthetic-beta-copy';
import { getSyntheticCityMedia, getSyntheticCityPresentation, syntheticCityMediaSlugs } from '../../lib/preview/synthetic-city-media';
import { getSyntheticDecorMedia } from '../../lib/preview/synthetic-decor-media';
import { getSyntheticHeroMedia } from '../../lib/preview/synthetic-hero-media';
import { getSyntheticServiceMedia } from '../../lib/preview/synthetic-service-media';
import { getCatalog } from '../../lib/i18n/catalog';
import { SUPPORTED_LOCALES } from '../../lib/i18n/locales';
import { legalDocumentKeys } from '../../lib/content/public-legal';
import { getBetaCityMedia, getBetaDecorMedia, getBetaHeroMedia, getBetaProfileMedia, getBetaServiceMedia } from '../../lib/beta/beta-media-catalog';
import { syntheticDecorMediaKeys } from '../../lib/preview/synthetic-decor-media';
import { syntheticHeroMediaKeys } from '../../lib/preview/synthetic-hero-media';
import { syntheticServiceMediaKeys } from '../../lib/preview/synthetic-service-media';

export const mediaAssets = [
  ...getSyntheticPreviewProfiles().flatMap((p) => p.media.map((m) => getBetaProfileMedia(p.slug, m.role))),
  ...syntheticCityMediaSlugs.map(getBetaCityMedia),
  ...syntheticDecorMediaKeys.map(getBetaDecorMedia),
  ...syntheticHeroMediaKeys.map(getBetaHeroMedia),
  ...syntheticServiceMediaKeys.map(getBetaServiceMedia),
].filter(Boolean);

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const paragraph = (value: string) => `<!-- wp:paragraph --><p>${escape(value)}</p><!-- /wp:paragraph -->`;
const heading = (value: string) => `<!-- wp:heading --><h2 class="wp-block-heading">${escape(value)}</h2><!-- /wp:heading -->`;
const list = (items: readonly string[]) => `<!-- wp:list --><ul class="wp-block-list">${items.map((item) => `<!-- wp:list-item --><li>${escape(item)}</li><!-- /wp:list-item -->`).join('')}</ul><!-- /wp:list -->`;
const labels = {
  es: { previous:'Anterior',next:'Siguiente',play:'Reproducir',pause:'Pausar',more:'Ver más',menu:'Menú',close:'Cerrar',menuAria:'Menú principal',all:'Todos',empty:'No hay resultados',clear:'Limpiar',remove:'Quitar',selected:'Selección',limit:'Puedes seleccionar hasta tres servicios.',search:'Buscar',sort:'Ordenar',name:'Nombre',editorial:'Orden editorial',view:'Ver detalle',city:'Ciudad',age:'Edad',availability:'Disponibilidad',photos:'Fotos',home:'Inicio' },
  en: { previous:'Previous',next:'Next',play:'Play',pause:'Pause',more:'View more',menu:'Menu',close:'Close',menuAria:'Main menu',all:'All',empty:'No results',clear:'Clear',remove:'Remove',selected:'Selection',limit:'You can select up to three services.',search:'Search',sort:'Sort',name:'Name',editorial:'Editorial order',view:'View details',city:'City',age:'Age',availability:'Availability',photos:'Photos',home:'Home' },
  fr: { previous:'Précédent',next:'Suivant',play:'Lire',pause:'Pause',more:'Voir plus',menu:'Menu',close:'Fermer',menuAria:'Menu principal',all:'Tous',empty:'Aucun résultat',clear:'Effacer',remove:'Retirer',selected:'Sélection',limit:'Vous pouvez sélectionner jusqu’à trois services.',search:'Rechercher',sort:'Trier',name:'Nom',editorial:'Ordre éditorial',view:'Voir le détail',city:'Ville',age:'Âge',availability:'Disponibilité',photos:'Photos',home:'Accueil' },
  it: { previous:'Precedente',next:'Successivo',play:'Riproduci',pause:'Pausa',more:'Scopri di più',menu:'Menu',close:'Chiudi',menuAria:'Menu principale',all:'Tutti',empty:'Nessun risultato',clear:'Cancella',remove:'Rimuovi',selected:'Selezione',limit:'Puoi selezionare fino a tre servizi.',search:'Cerca',sort:'Ordina',name:'Nome',editorial:'Ordine editoriale',view:'Vedi dettagli',city:'Città',age:'Età',availability:'Disponibilità',photos:'Foto',home:'Home' },
};

export function makeSeed(media: Record<string, string>, sourceCommit: string) {
  const records: unknown[] = [];
  const copy: Record<string, unknown> = {};
  const image = (url: string, alt: string) => {
    if (!media[url]) throw new Error(`Unmapped seed image ${url}`);
    return { path: media[url], alt };
  };
  for (const locale of SUPPORTED_LOCALES) {
    const beta = getSyntheticBetaCopy(locale);
    const services = getSyntheticServiceMessages(locale);
    const catalog = getCatalog(locale);
    // Editorial biographies/pages now belong to WP posts. Do not keep a public
    // duplicate inside settings when an editor unpublishes the corresponding post.
    const { metadata, profiles, cities, homeServices, locale: sourceLocale, ...presentation } = beta;
    copy[locale] = { ...presentation, services, nativeUi: labels[locale], site: {
      logo: image('/icon.png', 'PecadosVip'), icon: image('/icon.png', 'PecadosVip'),
      hero: image(getSyntheticHeroMedia('home-editorial', 'public-beta').desktopUrl, beta.hero.generatedImageDisclosure),
      mosaic: image(getSyntheticDecorMedia('border-filigree', 'public-beta').desktopUrl, ''),
      brandPrimary: 'Pecados', brandSuffix: 'Vip',
    } };
    getSyntheticPreviewProfiles('public-beta').forEach((profile, order) => {
      const editorial = beta.profiles[profile.slug as keyof typeof beta.profiles];
      records.push({ type: 'profile', key: profile.slug, locale, title: editorial.displayName,
        content: paragraph(editorial.biography), excerpt: editorial.biography, image: image(profile.cover.desktopUrl, profile.cover.alt), order,
        data: { age: profile.age, cities: profile.citySlugs, availability: profile.availability, synthetic: true,
          homeZone: ['valeria','lucia','alicia'].includes(profile.slug) ? 'madrid' : 'barcelona',
          gallery: profile.media.map((asset) => image(asset.desktopUrl, asset.alt)), conceptTags: editorial.conceptTags } });
    });
    getSyntheticServiceCatalog(locale).forEach((service, order) => {
      const group = services.groups[service.group];
      const visual = getSyntheticServiceMedia(service.mediaKey, locale, 'public-beta');
      records.push({ type: 'service', key: service.slug, locale, title: service.name, excerpt: service.teaser,
        content: heading(services.detail.overviewTitle) + paragraph(group.overview) + heading(services.detail.processTitle)
          + list(services.detail.processSteps) + heading(services.detail.safeguardsTitle) + list(group.safeguards),
        image: image(visual.desktopUrl, visual.alt), order, data: { group: service.group, synthetic: true } });
    });
    syntheticCityMediaSlugs.forEach((key, order) => {
      const visual = getSyntheticCityMedia(key, locale, 'public-beta');
      const presentation = getSyntheticCityPresentation(locale);
      const zone = ['madrid','toledo','segovia','guadalajara'].includes(key) ? 'madrid' : 'barcelona';
      records.push({ type: 'city', key, locale, title: key.charAt(0).toUpperCase() + key.slice(1),
        content: paragraph(presentation.coverageBody), excerpt: presentation.pendingStatus,
        image: image(visual.desktopUrl, visual.alt), order, data: { zone, synthetic: true } });
    });
    for (const [key,kind,title,content,excerpt] of [
      ['home','home',beta.metadata.homeTitle,'',beta.metadata.homeDescription],
      ['perfiles','profiles',beta.profilesSection.title,'',beta.profilesSection.note],
      ['servicios','services',services.hub.title,'',services.hub.lead],
      ['contacto','contact',catalog.contact.title,paragraph(catalog.holding.body),catalog.holding.body],
      ...Object.keys(legalDocumentKeys).map((key) => [key,'legal',catalog.meta.legal.unpublishedTitle,paragraph(catalog.holding.body),catalog.holding.body]),
    ]) records.push({ type:'page',key,locale,title,content,excerpt,order:0,data:{kind} });
  }
  return { version:1,sourceCommit,mode:'native-editable-wordpress',productionActivation:false,copy,records };
}
