import { getCatalog } from '../../lib/i18n/catalog';
import type { Locale } from '../../lib/i18n/locales';

export default function ProvisionalNotice({ locale = 'es' }: { locale?: Locale }) {
  const messages = getCatalog(locale).notice;

  return (
    <aside className="provisional-notice" aria-labelledby="version-state-title">
      <h2 id="version-state-title">{messages.title}</h2>
      <p>{messages.body}</p>
    </aside>
  );
}
