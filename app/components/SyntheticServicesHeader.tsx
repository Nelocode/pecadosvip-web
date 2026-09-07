'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '../../lib/i18n/locales';
import {
  syntheticExperienceHome,
  syntheticExperienceProfiles,
  syntheticExperienceServices,
  type SyntheticExperienceMode,
} from '../../lib/preview/synthetic-experience';
import {
  getSyntheticServiceMessages,
  type SyntheticServiceMessages,
} from '../../lib/preview/synthetic-services';
import { getSyntheticBetaCopy } from '../../lib/preview/synthetic-beta-copy';

function withLocale(path: string, locale: Locale): string {
  return `${path}?lang=${locale}`;
}

const languageNames: Readonly<Record<Locale, string>> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
};

function languageLinks(
  path: string,
  locale: Locale,
  ariaLabel: string,
  mode: SyntheticExperienceMode,
  onNavigate?: () => void,
) {
  return (
    <nav className="synthetic-service-language" aria-label={ariaLabel}>
      {(['es', 'en', 'fr', 'it'] as const).map((candidate) => (
        <a
          aria-current={candidate === locale ? 'page' : undefined}
          href={
            mode === 'public-beta'
              ? path.replace(`/${locale}`, `/${candidate}`)
              : withLocale(path, candidate)
          }
          hrefLang={candidate}
          key={candidate}
          lang={candidate}
          onClick={onNavigate}
        >
          {languageNames[candidate]}
        </a>
      ))}
    </nav>
  );
}

function navLinks(
  messages: SyntheticServiceMessages,
  locale: Locale,
  current: 'services' | 'detail',
  mode: SyntheticExperienceMode,
  onNavigate?: () => void,
) {
  const home = syntheticExperienceHome(locale, mode);
  const links = [
    { href: `${home}#inicio`, label: messages.navigation.home },
    { href: syntheticExperienceProfiles(locale, mode), label: messages.navigation.profiles },
    { href: syntheticExperienceServices(locale, mode), label: messages.navigation.services, current: current === 'services' || current === 'detail' },
    { href: `${home}#cobertura`, label: messages.navigation.coverage },
    { href: `${home}#seguridad`, label: messages.navigation.controls },
  ];

  return links.map((link) => (
    <a
      aria-current={link.current ? 'page' : undefined}
      href={link.href}
      key={`${link.href}-${link.label}`}
      onClick={onNavigate}
    >
      {link.label}
    </a>
  ));
}

export default function SyntheticServicesHeader({
  locale,
  languagePath,
  current,
  documentTitle,
  documentDescription,
  mode = 'local-preview',
}: {
  locale: Locale;
  languagePath: string;
  current: 'services' | 'detail';
  documentTitle: string;
  documentDescription: string;
  mode?: SyntheticExperienceMode;
}) {
  const messages = getSyntheticServiceMessages(locale);
  const betaMessages = getSyntheticBetaCopy(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const skipLinkElement = document.querySelector<HTMLAnchorElement>('.skip-link');

    if (mode === 'local-preview') {
      root.lang = locale;
      document.title = documentTitle;
      if (descriptionMeta) descriptionMeta.content = documentDescription;
      if (skipLinkElement) skipLinkElement.textContent = messages.navigation.skipLink;
    }
  }, [documentDescription, documentTitle, locale, messages.navigation.skipLink, mode]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const header = headerRef.current;
    const panel = menuPanelRef.current;
    const backgroundElements = [
      ...Array.from(header?.parentElement?.children ?? []).filter(
        (element): element is HTMLElement => element instanceof HTMLElement && element !== header,
      ),
      ...Array.from(header?.children ?? []).filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          element !== panel &&
          element !== menuButtonRef.current,
      ),
    ];
    const backgroundState = backgroundElements.map((element) => ({
      element,
      ariaHidden: element.getAttribute('aria-hidden'),
      inert: element.inert,
    }));
    const focusable = Array.from(
      panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
    );

    document.body.style.overflow = 'hidden';
    document.body.dataset.syntheticMenuOpen = 'true';
    for (const element of backgroundElements) {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    }
    focusable[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        window.setTimeout(() => menuButtonRef.current?.focus(), 0);
        return;
      }

      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      delete document.body.dataset.syntheticMenuOpen;
      for (const { element, ariaHidden, inert } of backgroundState) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      }
    };
  }, [menuOpen]);

  return (
    <header
      className="public-header synthetic-preview-header synthetic-services-header"
      id="service-top"
      ref={headerRef}
    >
      <a className="public-brand synthetic-preview-brand" href={`${syntheticExperienceHome(locale, mode)}#inicio`}>
        <span>PecadosVip</span>
        <small>{mode === 'public-beta' ? betaMessages.navigation.betaStatus : messages.navigation.previewLabel}</small>
      </a>

      <nav className="public-nav synthetic-services-desktop-nav" aria-label={messages.navigation.primaryAria}>
        {navLinks(messages, locale, current, mode)}
      </nav>

      {languageLinks(languagePath, locale, messages.navigation.languageAria, mode)}

      <button
        className="synthetic-preview-reservation"
        disabled
        title={messages.navigation.privateBooking}
        type="button"
      >
        {messages.navigation.privateBooking}
      </button>

      <button
        aria-controls="synthetic-services-mobile-menu"
        aria-expanded={menuOpen}
        className="synthetic-services-menu-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        ref={menuButtonRef}
        type="button"
      >
        {menuOpen ? messages.navigation.close : messages.navigation.menu}
      </button>

      {menuOpen ? (
        <div
          aria-label={messages.navigation.menu}
          aria-modal="true"
          className="synthetic-services-menu-panel"
          id="synthetic-services-mobile-menu"
          ref={menuPanelRef}
          role="dialog"
        >
          <div className="synthetic-services-menu-heading">
            <strong>PecadosVip</strong>
            <span>{messages.navigation.menu}</span>
          </div>
          {languageLinks(
            languagePath,
            locale,
            messages.navigation.languageAria,
            mode,
            () => setMenuOpen(false),
          )}
          <nav aria-label={messages.navigation.mobileAria}>
            {navLinks(messages, locale, current, mode, () => setMenuOpen(false))}
          </nav>
          <p>{messages.footer.tagline}</p>
        </div>
      ) : null}
    </header>
  );
}
