import type { ContactSettings } from './content/types.ts';

export type ContactDestinationKey = keyof ContactSettings;

const brandedHttpsHosts: Readonly<
  Partial<Record<ContactDestinationKey, ReadonlySet<string>>>
> = {
  telegramUrl: new Set(['t.me', 'telegram.me']),
  whatsappUrl: new Set(['wa.me', 'api.whatsapp.com']),
};

function normalizeHttpsDestination(
  value: string | undefined,
  allowedHosts?: ReadonlySet<string>,
): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hash ||
      (allowedHosts && !allowedHosts.has(url.hostname)) ||
      (allowedHosts && (url.pathname === '' || url.pathname === '/'))
    ) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizePhoneDestination(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate || !/^tel:\+?[0-9][0-9(). -]{5,24}$/u.test(candidate)) {
    return undefined;
  }
  return candidate;
}

function normalizeEmailDestination(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate || !/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/u.test(candidate)) {
    return undefined;
  }
  return candidate;
}

export function normalizeContactDestination(
  key: ContactDestinationKey,
  value: string | undefined,
): string | undefined {
  switch (key) {
    case 'emailUrl':
      return normalizeEmailDestination(value);
    case 'phoneUrl':
      return normalizePhoneDestination(value);
    case 'formActionUrl':
      return normalizeHttpsDestination(value);
    case 'telegramUrl':
    case 'whatsappUrl':
      return normalizeHttpsDestination(value, brandedHttpsHosts[key]);
  }
}

export function isCanonicalContactDestination(
  key: ContactDestinationKey,
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    normalizeContactDestination(key, value) === value
  );
}
