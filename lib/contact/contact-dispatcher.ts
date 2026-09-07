import type { CitySlug } from '../content/types.ts';

export type ContactChannel = 'whatsapp' | 'telegram' | 'phone' | 'email' | 'form';

export type ContactDispatchInput = {
  modelId: string;
  channel: ContactChannel;
  originCity?: CitySlug;
  userToken?: string;
  ipAddress?: string;
  userAgent?: string;
};

export type ContactDispatchResult = {
  success: boolean;
  destinationUrl?: string;
  maskedLabel?: string;
  error?: string;
};

export type ClickAnalyticsEvent = {
  id: string;
  modelId: string;
  channel: ContactChannel;
  originCity?: CitySlug;
  ipAddress?: string;
  timestamp: string;
};

// In-memory or persistent store for click analytics
const clickEventsLog: ClickAnalyticsEvent[] = [];

/**
 * Resolves masked contact destinations without exposing plain phone numbers in HTML source.
 */
export function dispatchMaskedContact(input: ContactDispatchInput): ContactDispatchResult {
  const { modelId, channel, originCity, ipAddress } = input;

  if (!modelId || !channel) {
    return { success: false, error: 'MISSING_PARAMETERS' };
  }

  // Log click analytics event (in-memory & ready for DB persistence)
  const event: ClickAnalyticsEvent = {
    id: `click-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    modelId,
    channel,
    originCity,
    ipAddress: ipAddress ? ipAddress.replace(/::ffff:/, '') : undefined,
    timestamp: new Date().toISOString(),
  };
  clickEventsLog.push(event);

  // Return sanitized destination scheme
  let destinationUrl = '';
  let maskedLabel = '';

  switch (channel) {
    case 'whatsapp':
      destinationUrl = `https://wa.me/?text=Hola%2C%20quisiera%20informaci%C3%B3n%20sobre%20el%20perfil%20${encodeURIComponent(modelId)}`;
      maskedLabel = 'Abrir WhatsApp';
      break;
    case 'telegram':
      destinationUrl = `https://t.me/share/url?url=${encodeURIComponent(modelId)}`;
      maskedLabel = 'Abrir Telegram';
      break;
    case 'phone':
      destinationUrl = `tel:`;
      maskedLabel = 'Llamada Privada';
      break;
    case 'email':
      destinationUrl = `mailto:info@pecadosvip.com?subject=Consulta%20Perfil%20${encodeURIComponent(modelId)}`;
      maskedLabel = 'Correo Seguro';
      break;
    case 'form':
      destinationUrl = `/contacto?modelId=${encodeURIComponent(modelId)}`;
      maskedLabel = 'Formulario Cifrado';
      break;
    default:
      return { success: false, error: 'UNSUPPORTED_CHANNEL' };
  }

  return {
    success: true,
    destinationUrl,
    maskedLabel,
  };
}

export function getClickAnalyticsLogs(): readonly ClickAnalyticsEvent[] {
  return clickEventsLog;
}
