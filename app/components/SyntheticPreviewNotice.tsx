'use client';

import { useEffect, useState } from 'react';

const storageKey = 'pecadosvip.synthetic-services.notice.accepted';

export default function SyntheticPreviewNotice({
  label,
  body,
  accept,
  restore,
}: {
  label: string;
  body: string;
  accept: string;
  restore: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setVisible(window.localStorage.getItem(storageKey) !== '1');
      } catch {
        setVisible(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function acceptNotice() {
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // The preview still works when storage is unavailable.
    }
    setVisible(false);
  }

  function restoreNotice() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // The preview still works when storage is unavailable.
    }
    setVisible(true);
  }

  if (!visible) {
    return (
      <button
        className="synthetic-service-notice-restore"
        onClick={restoreNotice}
        type="button"
      >
        {restore}
      </button>
    );
  }

  return (
    <aside className="synthetic-service-notice" aria-label={label}>
      <div>
        <strong>{label}</strong>
        <span>{body}</span>
      </div>
      <button onClick={acceptNotice} type="button">{accept}</button>
    </aside>
  );
}
