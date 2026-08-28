import { useEffect, useMemo, useState } from 'react';

import {
  createMobileAccountDataAdapter,
  localAccountOverview,
  type AccountOverview,
} from './account-data';
import { apiAuthorizationContextForSession } from './auth-session';
import { useMobileAuthSession } from './auth-session-context';

export function useAccountOverview() {
  const auth = useMobileAuthSession();
  const accessToken =
    auth.state.phase === 'authenticated' ? auth.state.session.accessToken : undefined;
  const sessionPublicId =
    auth.state.phase === 'authenticated' ? auth.state.session.sessionPublicId : undefined;
  const authorizationContext = useMemo(
    () =>
      auth.state.phase === 'authenticated'
        ? apiAuthorizationContextForSession(auth.state.session)
        : undefined,
    [auth.state],
  );
  const [data, setData] = useState<AccountOverview>(localAccountOverview);
  const [source, setSource] = useState<'api' | 'local-preview'>('local-preview');

  useEffect(() => {
    let active = true;
    void createMobileAccountDataAdapter({
      accessToken,
      authorizationContext,
      mode: auth.dataMode,
      sessionPublicId,
    })
      .getAccountOverview()
      .then((result) => {
        if (active) {
          setData(result.data);
          setSource(result.source);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accessToken, auth.cacheEpoch, auth.dataMode, authorizationContext, sessionPublicId]);

  return { data, source };
}
