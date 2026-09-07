import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveContactConfig } from '../lib/contact-config.ts';

test('contact remains disabled unless contact and privacy gates are both approved', () => {
  const values = {
    NEXT_PUBLIC_WHATSAPP_URL: 'https://wa.me/34123456789',
    NEXT_PUBLIC_CONTACT_FORM_ACTION: 'https://contact.example.org/submit',
  };

  assert.deepEqual(resolveContactConfig(values), {
    enabled: false,
    approvalGateSatisfied: false,
    privacyGateSatisfied: false,
    contact: {},
  });
  assert.equal(
    resolveContactConfig({
      ...values,
      NEXT_PUBLIC_CONTACT_APPROVED: 'true',
    }).enabled,
    false,
  );
  assert.equal(
    resolveContactConfig({
      ...values,
      NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED: 'true',
    }).enabled,
    false,
  );
});

test('approved contact configuration keeps only supported sanitized schemes', () => {
  const config = resolveContactConfig({
    NEXT_PUBLIC_CONTACT_APPROVED: 'true',
    NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED: 'true',
    NEXT_PUBLIC_WHATSAPP_URL: 'https://wa.me/34123456789',
    NEXT_PUBLIC_TELEGRAM_URL: 'https://t.me/pecadosvip',
    NEXT_PUBLIC_PHONE_URL: 'tel:+34600111222',
    NEXT_PUBLIC_EMAIL_URL: 'mailto:contacto@example.org',
    NEXT_PUBLIC_CONTACT_FORM_ACTION: 'https://contact.example.org/submit',
  });

  assert.equal(config.enabled, true);
  assert.deepEqual(config.contact, {
    whatsappUrl: 'https://wa.me/34123456789',
    telegramUrl: 'https://t.me/pecadosvip',
    phoneUrl: 'tel:+34600111222',
    emailUrl: 'mailto:contacto@example.org',
    formActionUrl: 'https://contact.example.org/submit',
  });
});

test('unsafe or ambiguous contact destinations are omitted fail closed', () => {
  const config = resolveContactConfig({
    NEXT_PUBLIC_CONTACT_APPROVED: 'true',
    NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED: 'true',
    NEXT_PUBLIC_WHATSAPP_URL: 'javascript:alert(1)',
    NEXT_PUBLIC_TELEGRAM_URL: 'https://user:secret@example.org/path',
    NEXT_PUBLIC_PHONE_URL: 'tel:call-me',
    NEXT_PUBLIC_EMAIL_URL: 'mailto:user@example.org?subject=tracking',
    NEXT_PUBLIC_CONTACT_FORM_ACTION: 'http://contact.example.org/submit',
  });

  assert.equal(config.enabled, true);
  assert.deepEqual(config.contact, {});
});

test('branded contact channels reject arbitrary HTTPS and lookalike hosts', () => {
  const config = resolveContactConfig({
    NEXT_PUBLIC_CONTACT_APPROVED: 'true',
    NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED: 'true',
    NEXT_PUBLIC_WHATSAPP_URL: 'https://attacker.example/phish',
    NEXT_PUBLIC_TELEGRAM_URL: 'https://support.t.me/impersonate',
    NEXT_PUBLIC_CONTACT_FORM_ACTION: 'https://contact.example.org/submit',
  });

  assert.equal(config.enabled, true);
  assert.deepEqual(config.contact, {
    formActionUrl: 'https://contact.example.org/submit',
  });
});
