import {
  buildLocalizedRouteManifest,
  localizedSitemapRoutes,
} from './route-manifest.ts';
import { evaluateRelease } from './release-gates.ts';
import {
  getRuntimeContentResolution,
  getRuntimeContentSnapshot,
} from './runtime-snapshot.ts';
import { contactConfig } from '../contact-config.ts';
import type { ResolvedContactConfig } from '../contact-config.ts';
import type { ContentSnapshot, ContactSettings } from './types.ts';

export type RuntimeContactState = {
  enabled: boolean;
  releaseGateSatisfied: boolean;
  approvalGateSatisfied: boolean;
  privacyGateSatisfied: boolean;
  configurationGateSatisfied: boolean;
  contact: ContactSettings;
};

export type RuntimeVisibilityState = {
  releaseReady: boolean;
  renderPublicExperience: boolean;
};

export function evaluateRuntimeVisibility(
  snapshot: ContentSnapshot,
): RuntimeVisibilityState {
  const releaseReady = evaluateRelease(snapshot).ok;

  return {
    releaseReady,
    renderPublicExperience: releaseReady,
  };
}

export function evaluateRuntimeContact(
  snapshot: ContentSnapshot,
  config: ResolvedContactConfig,
): RuntimeContactState {
  const releaseGateSatisfied = evaluateRelease(snapshot).ok;
  const configurationGateSatisfied = contactSettingsMatchExactly(
    snapshot.settings.contact,
    config.contact,
  );
  const enabled =
    releaseGateSatisfied && config.enabled && configurationGateSatisfied;

  return {
    enabled,
    releaseGateSatisfied,
    approvalGateSatisfied: config.approvalGateSatisfied,
    privacyGateSatisfied: config.privacyGateSatisfied,
    configurationGateSatisfied,
    // The approved runtime snapshot is the publication authority. Environment
    // configuration may confirm that exact value, but it never becomes an
    // independent source of rendered contact destinations.
    contact: enabled ? structuredClone(snapshot.settings.contact) : {},
  };
}

const contactSettingKeys = [
  'telegramUrl',
  'whatsappUrl',
  'phoneUrl',
  'emailUrl',
  'formActionUrl',
] as const satisfies readonly (keyof ContactSettings)[];

function contactSettingsMatchExactly(
  approved: ContactSettings,
  rendered: ContactSettings,
): boolean {
  const approvedKeys = Object.keys(approved).sort();
  const renderedKeys = Object.keys(rendered).sort();
  if (
    approvedKeys.length !== renderedKeys.length ||
    approvedKeys.some((key, index) => key !== renderedKeys[index]) ||
    approvedKeys.some(
      (key) => !contactSettingKeys.includes(key as keyof ContactSettings),
    )
  ) {
    return false;
  }

  return contactSettingKeys.every(
    (key) => approved[key] === rendered[key],
  );
}

export function getRuntimePublicationState() {
  const { snapshot, activation } = getRuntimeContentResolution();
  const release = evaluateRelease(snapshot);
  const manifest = buildLocalizedRouteManifest(snapshot);

  return { snapshot, release, manifest, activation };
}

export function getRuntimeContactState(): RuntimeContactState {
  return evaluateRuntimeContact(getRuntimeContentSnapshot(), contactConfig);
}

export function getRuntimeVisibilityState(): RuntimeVisibilityState {
  return evaluateRuntimeVisibility(getRuntimeContentSnapshot());
}

export function isRuntimeRouteIndexable(path: string): boolean {
  const { manifest } = getRuntimePublicationState();
  return Boolean(
    manifest.find((route) => route.path === path && route.indexable),
  );
}

export function getRuntimeSitemapRoutes() {
  const snapshot = getRuntimeContentSnapshot();
  return localizedSitemapRoutes(snapshot);
}
