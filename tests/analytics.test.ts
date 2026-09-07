import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAnalyticsEvent } from '../lib/analytics/events.ts';

test('analytics stays closed while disabled or without granted consent', () => {
  const input = {
    name: 'view_city',
    properties: { city_slug: 'madrid', locale: 'es-ES' },
  };

  assert.deepEqual(
    buildAnalyticsEvent(
      { analyticsEnabled: false, consentState: 'granted' },
      input,
    ),
    { ok: false, reason: 'ANALYTICS_DISABLED' },
  );
  for (const consentState of ['unknown', 'denied', 'withdrawn'] as const) {
    assert.deepEqual(
      buildAnalyticsEvent({ analyticsEnabled: true, consentState }, input),
      { ok: false, reason: 'CONSENT_REQUIRED' },
    );
  }
});

test('a valid city view is projected through an exact allowlist', () => {
  assert.deepEqual(
    buildAnalyticsEvent(
      { analyticsEnabled: true, consentState: 'granted' },
      {
        name: 'view_city',
        properties: { city_slug: 'barcelona', locale: 'es-ES' },
      },
    ),
    {
      ok: true,
      event: {
        name: 'view_city',
        properties: { city_slug: 'barcelona', locale: 'es-ES' },
      },
    },
  );
});

test('unknown fields and contact payload data are rejected', () => {
  const rejected = [
    {
      name: 'contact_submit',
      properties: { surface: 'profile', email: 'person@example.test' },
    },
    {
      name: 'view_profile',
      properties: { city_slug: 'madrid', profile_name: 'private-name' },
    },
    {
      name: 'unknown_event',
      properties: {},
    },
  ];

  for (const input of rejected) {
    assert.deepEqual(
      buildAnalyticsEvent(
        { analyticsEnabled: true, consentState: 'granted' },
        input,
      ),
      { ok: false, reason: 'INVALID_EVENT' },
    );
  }
});

test('profile filters record names and buckets but never filter values', () => {
  const filterNames = ['city', 'age'];
  const result = buildAnalyticsEvent(
    { analyticsEnabled: true, consentState: 'granted' },
    {
      name: 'filter_profiles',
      properties: { filter_names: filterNames, result_bucket: '1-5' },
    },
  );

  assert.equal(result.ok, true);
  filterNames.push('service');
  if (!result.ok) return;
  assert.deepEqual(result.event.properties, {
    filter_names: ['city', 'age'],
    result_bucket: '1-5',
  });
});

test('optional city is projected without helper metadata', () => {
  const result = buildAnalyticsEvent(
    { analyticsEnabled: true, consentState: 'granted' },
    {
      name: 'contact_intent',
      properties: {
        channel: 'telegram',
        surface: 'profile',
        city_slug: 'madrid',
      },
    },
  );

  assert.deepEqual(result, {
    ok: true,
    event: {
      name: 'contact_intent',
      properties: {
        channel: 'telegram',
        surface: 'profile',
        city_slug: 'madrid',
      },
    },
  });
});

test('invalid enum values and unsafe page numbers fail closed', () => {
  const rejected = [
    {
      name: 'contact_error',
      properties: { code: 'stack_trace', surface: 'profile' },
    },
    {
      name: 'view_profile_list',
      properties: {
        result_bucket: 'exactly-7',
        page: 1,
      },
    },
    {
      name: 'view_profile_list',
      properties: {
        result_bucket: '1-5',
        page: Number.MAX_SAFE_INTEGER + 1,
      },
    },
  ];

  for (const input of rejected) {
    assert.deepEqual(
      buildAnalyticsEvent(
        { analyticsEnabled: true, consentState: 'granted' },
        input,
      ),
      { ok: false, reason: 'INVALID_EVENT' },
    );
  }
});

test('consent changes are not accepted as analytics events', () => {
  assert.deepEqual(
    buildAnalyticsEvent(
      { analyticsEnabled: true, consentState: 'granted' },
      {
        name: 'consent_update',
        properties: { analytics: false, policy_version: '2026-08' },
      },
    ),
    { ok: false, reason: 'INVALID_EVENT' },
  );
});

test('changing getters are read once and cannot swap validated values for PII', () => {
  let localeReads = 0;
  let channelReads = 0;
  let filterReads = 0;
  const localeProperties = {
    city_slug: 'madrid',
    get locale() {
      localeReads += 1;
      return localeReads === 1 ? 'es-ES' : 'person@example.test';
    },
  };
  const channelProperties = {
    surface: 'profile',
    get channel() {
      channelReads += 1;
      return channelReads === 1 ? 'telegram' : 'person@example.test';
    },
  };
  const filterProperties = {
    result_bucket: '1-5',
    get filter_names() {
      filterReads += 1;
      return filterReads === 1 ? ['city'] : ['person@example.test'];
    },
  };
  const gate = { analyticsEnabled: true, consentState: 'granted' } as const;

  const results = [
    buildAnalyticsEvent(gate, {
      name: 'view_city',
      properties: localeProperties,
    }),
    buildAnalyticsEvent(gate, {
      name: 'contact_intent',
      properties: channelProperties,
    }),
    buildAnalyticsEvent(gate, {
      name: 'filter_profiles',
      properties: filterProperties,
    }),
  ];

  assert.equal(localeReads, 1);
  assert.equal(channelReads, 1);
  assert.equal(filterReads, 1);
  assert.equal(JSON.stringify(results).includes('person@example.test'), false);
  assert.equal(results.every((result) => result.ok), true);
});

test('hostile proxies fail closed instead of escaping the analytics boundary', () => {
  const hostile = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error('hostile');
      },
    },
  );

  assert.doesNotThrow(() =>
    buildAnalyticsEvent(
      { analyticsEnabled: true, consentState: 'granted' },
      hostile,
    ),
  );
  assert.deepEqual(
    buildAnalyticsEvent(
      { analyticsEnabled: true, consentState: 'granted' },
      hostile,
    ),
    { ok: false, reason: 'INVALID_EVENT' },
  );
});

test('analytics consent gates require own exact properties', () => {
  const event = {
    name: 'view_city',
    properties: { city_slug: 'madrid', locale: 'es-ES' },
  };
  const inheritedGate = Object.create({
    analyticsEnabled: true,
    consentState: 'granted',
  });

  assert.deepEqual(buildAnalyticsEvent(inheritedGate, event), {
    ok: false,
    reason: 'INVALID_EVENT',
  });

  const prototype = Object.prototype as Record<string, unknown>;
  const enabledDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'analyticsEnabled',
  );
  const consentDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'consentState',
  );
  try {
    Object.defineProperty(prototype, 'analyticsEnabled', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(prototype, 'consentState', {
      configurable: true,
      value: 'granted',
    });
    assert.deepEqual(buildAnalyticsEvent({}, event), {
      ok: false,
      reason: 'INVALID_EVENT',
    });
  } finally {
    if (enabledDescriptor) {
      Object.defineProperty(prototype, 'analyticsEnabled', enabledDescriptor);
    } else {
      delete prototype.analyticsEnabled;
    }
    if (consentDescriptor) {
      Object.defineProperty(prototype, 'consentState', consentDescriptor);
    } else {
      delete prototype.consentState;
    }
  }
});
