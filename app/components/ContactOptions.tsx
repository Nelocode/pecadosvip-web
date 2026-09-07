import type { ContactSettings } from '../../lib/content/types';
import { getRuntimeContactState } from '../../lib/content/runtime-publication';
import { getCatalog } from '../../lib/i18n/catalog';
import { localizedPath, type Locale } from '../../lib/i18n/locales';

type ContactOption = {
  key: keyof Pick<
    ContactSettings,
    'whatsappUrl' | 'telegramUrl' | 'phoneUrl' | 'emailUrl'
  >;
  shortLabel: string;
  messageKey: 'whatsapp' | 'telegram' | 'phone' | 'email';
};

const options: ContactOption[] = [
  { key: 'telegramUrl', shortLabel: 'TG', messageKey: 'telegram' },
  { key: 'whatsappUrl', shortLabel: 'WA', messageKey: 'whatsapp' },
  { key: 'phoneUrl', shortLabel: 'TL', messageKey: 'phone' },
  { key: 'emailUrl', shortLabel: 'EM', messageKey: 'email' },
];

export default function ContactOptions({ locale = 'es' }: { locale?: Locale }) {
  const contactState = getRuntimeContactState();
  const messages = getCatalog(locale).contactOptions;
  const hasEnabledChannel =
    contactState.enabled &&
    (options.some((option) => contactState.contact[option.key]) ||
      Boolean(contactState.contact.formActionUrl));
  const formAction = contactState.enabled
    ? contactState.contact.formActionUrl
    : undefined;

  return (
    <section className="public-contact-options" aria-labelledby="contact-options-title">
      <h2 className="visually-hidden" id="contact-options-title">
        {messages.title}
      </h2>
      <ul className="public-channel-grid">
        {options.map((option) => {
          const href = contactState.enabled
            ? contactState.contact[option.key]
            : undefined;
          const contents = (
            <>
              <span aria-hidden="true">{option.shortLabel}</span>
              {messages.channels[option.messageKey]}
            </>
          );

          return href ? (
            <li key={option.key}>
              <a href={href} rel="noreferrer">
                {contents}
              </a>
            </li>
          ) : (
            <li key={option.key}>
              <span className="public-channel-disabled">
                {contents}
                <span className="visually-hidden">: {messages.unavailableSuffix}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="public-contact-state" role="status">
        {hasEnabledChannel
          ? messages.enabledMessage
          : messages.disabledMessage}
      </p>
      {formAction ? (
        <form
          acceptCharset="UTF-8"
          action={formAction}
          className="public-contact-form"
          method="post"
        >
          <div className="public-contact-form-heading">
            <h3>{messages.form.title}</h3>
            <p>{messages.form.intro}</p>
          </div>
          <label htmlFor="contact-name">
            {messages.form.name}
            <input
              autoComplete="name"
              id="contact-name"
              maxLength={80}
              name="name"
              required
              type="text"
            />
          </label>
          <label htmlFor="contact-reply">
            {messages.form.reply}
            <input
              autoComplete="email"
              id="contact-reply"
              maxLength={160}
              name="replyTo"
              required
              type="email"
            />
          </label>
          <label htmlFor="contact-city">
            {messages.form.city}
            <select id="contact-city" name="city" required defaultValue="">
              <option value="" disabled>{messages.form.selectCity}</option>
              <option value="madrid">Madrid</option>
              <option value="barcelona">Barcelona</option>
              <option value="girona">Girona</option>
              <option value="tarragona">Tarragona</option>
              <option value="toledo">Toledo</option>
              <option value="guadalajara">Guadalajara</option>
              <option value="segovia">Segovia</option>
            </select>
          </label>
          <label className="public-contact-form-message" htmlFor="contact-message">
            {messages.form.message}
            <textarea
              id="contact-message"
              maxLength={1000}
              name="message"
              required
              rows={5}
            />
          </label>
          <p id="contact-privacy-note">
            {messages.form.privacyPrefix}{' '}
            <a href={localizedPath(locale, '/legal/privacidad')}>
              {messages.form.privacyLink}
            </a>
          </p>
          <button aria-describedby="contact-privacy-note" type="submit">
            {messages.form.submit}
          </button>
        </form>
      ) : null}
    </section>
  );
}
