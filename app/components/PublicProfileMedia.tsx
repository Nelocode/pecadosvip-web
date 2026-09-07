import Image from 'next/image';

import type { PublicMedia } from '../../lib/content/public-profiles';

type PublicProfileMediaProps = {
  media: PublicMedia;
  objectPosition?: string;
  priority?: boolean;
  preserveFullImage?: boolean;
  sizes: string;
};

function mimeType(url: string, kind: PublicMedia['kind']): string {
  const pathname = url.split(/[?#]/u, 1)[0]?.toLowerCase() ?? '';
  if (kind === 'video') {
    if (pathname.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }
  if (pathname.endsWith('.avif')) return 'image/avif';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

export default function PublicProfileMedia({
  media,
  objectPosition = 'center top',
  priority = false,
  preserveFullImage = true,
  sizes,
}: PublicProfileMediaProps) {
  const style = {
    objectFit: preserveFullImage ? ('contain' as const) : ('cover' as const),
    objectPosition: 'center top',
  };
  style.objectPosition = objectPosition;

  if (media.kind === 'video') {
    return (
      <video
        aria-label={media.alt}
        controls
        playsInline
        preload="metadata"
        style={style}
      >
        {media.mobileUrl ? (
          <source
            media="(max-width: 780px)"
            src={media.mobileUrl}
            type={mimeType(media.mobileUrl, media.kind)}
          />
        ) : null}
        <source
          src={media.desktopUrl}
          type={mimeType(media.desktopUrl, media.kind)}
        />
      </video>
    );
  }

  if (media.mobileUrl) {
    return (
      <picture>
        <source
          media="(max-width: 780px)"
          srcSet={media.mobileUrl}
          type={mimeType(media.mobileUrl, media.kind)}
        />
        <img
          alt={media.alt}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          height={1280}
          loading={priority ? 'eager' : 'lazy'}
          sizes={sizes}
          src={media.desktopUrl}
          style={style}
          width={960}
        />
      </picture>
    );
  }

  return (
    <Image
      alt={media.alt}
      fill
      priority={priority}
      sizes={sizes}
      src={media.desktopUrl}
      style={style}
      unoptimized={
        media.desktopUrl.startsWith('/preview-local-sintetico/') ||
        media.desktopUrl.startsWith('/beta-media/')
      }
    />
  );
}
