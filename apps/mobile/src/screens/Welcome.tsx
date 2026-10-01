import { Wordmark } from '../components/Wordmark';
import { useState } from 'react';
import { validateName } from '@huli/shared';
import { api, ApiError } from '../api/client';
import { t } from '../i18n/t';
import { useStore } from '../store';

export function Welcome() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { setSession, go } = useStore();
  const v = validateName(name);
  const localError = name.length >= 3 && !v.ok ? t(`name.${v.error}`) : null;

  async function submit() {
    if (!v.ok) return;
    setBusy(true);
    setServerError(null);
    try {
      const s = await api.createPlayer(v.name);
      await setSession(s);
      go('cards', true);
    } catch (e) {
      const code = e instanceof ApiError ? e.code.replace('name_', '') : 'error';
      setServerError(code === 'error' ? t('common.error') : t(`name.${code}`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, maxWidth: 480, width: '100%', margin: '0 auto' }}>
        <h1 style={{ margin: 0, lineHeight: 0 }}><Wordmark height={64} /></h1>
        <p className="muted" style={{ fontSize: '1.125rem', marginBottom: 24 }}>{t('app.tagline')}</p>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{t('welcome.title')}</h2>
        <p className="muted">{t('welcome.body')}</p>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('welcome.placeholder')}
          aria-label={t('welcome.title')}
          maxLength={24}
          autoCapitalize="words"
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          aria-invalid={!!(localError || serverError)}
        />
        <p className="error" role="alert" style={{ minHeight: 22 }}>{serverError ?? localError ?? ''}</p>
        <button className="btn btn-primary btn-block" disabled={!v.ok || busy} onClick={() => void submit()}>
          {busy ? t('welcome.checking') : t('welcome.continue')}
        </button>
      </div>
    </div>
  );
}
