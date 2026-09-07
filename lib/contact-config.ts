import type { ContactSettings } from './content/types.ts';
import { normalizeContactDestination } from './contact-destinations.ts';

export type ContactEnvironment = {
  NEXT_PUBLIC_CONTACT_APPROVED?: string;
  NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED?: string;
  NEXT_PUBLIC_CONTACT_FORM_ACTION?: string;
  NEXT_PUBLIC_WHATSAPP_URL?: string;
  NEXT_PUBLIC_TELEGRAM_URL?: string;
  NEXT_PUBLIC_PHONE_URL?: string;
  NEXT_PUBLIC_EMAIL_URL?: string;
};

export type ResolvedContactConfig = {
  enabled: boolean;
  approvalGateSatisfied: boolean;
  privacyGateSatisfied: boolean;
  contact: ContactSettings;
};

export function resolveContactConfig(
  environment: ContactEnvironment,
): ResolvedContactConfig {
  const approvalGateSatisfied =
    environment.NEXT_PUBLIC_CONTACT_APPROVED === 'true';
  const privacyGateSatisfied =
    environment.NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED === 'true';
  const enabled = approvalGateSatisfied && privacyGateSatisfied;

  if (!enabled) {
    return {
      enabled: false,
      approvalGateSatisfied,
      privacyGateSatisfied,
      contact: {},
    };
  }

  const contact: ContactSettings = {
    whatsappUrl: normalizeContactDestination(
      'whatsappUrl',
      environment.NEXT_PUBLIC_WHATSAPP_URL,
    ),
    telegramUrl: normalizeContactDestination(
      'telegramUrl',
      environment.NEXT_PUBLIC_TELEGRAM_URL,
    ),
    phoneUrl: normalizeContactDestination(
      'phoneUrl',
      environment.NEXT_PUBLIC_PHONE_URL,
    ),
    emailUrl: normalizeContactDestination(
      'emailUrl',
      environment.NEXT_PUBLIC_EMAIL_URL,
    ),
    formActionUrl: normalizeContactDestination(
      'formActionUrl',
      environment.NEXT_PUBLIC_CONTACT_FORM_ACTION,
    ),
  };

  return {
    enabled: true,
    approvalGateSatisfied,
    privacyGateSatisfied,
    contact: Object.fromEntries(
      Object.entries(contact).filter(([, value]) => value !== undefined),
    ),
  };
}

export const contactConfig = resolveContactConfig({
  NEXT_PUBLIC_CONTACT_APPROVED: process.env.NEXT_PUBLIC_CONTACT_APPROVED,
  NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED:
    process.env.NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED,
  NEXT_PUBLIC_CONTACT_FORM_ACTION:
    process.env.NEXT_PUBLIC_CONTACT_FORM_ACTION,
  NEXT_PUBLIC_WHATSAPP_URL: process.env.NEXT_PUBLIC_WHATSAPP_URL,
  NEXT_PUBLIC_TELEGRAM_URL: process.env.NEXT_PUBLIC_TELEGRAM_URL,
  NEXT_PUBLIC_PHONE_URL: process.env.NEXT_PUBLIC_PHONE_URL,
  NEXT_PUBLIC_EMAIL_URL: process.env.NEXT_PUBLIC_EMAIL_URL,
});
