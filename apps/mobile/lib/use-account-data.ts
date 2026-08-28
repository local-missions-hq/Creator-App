import { useEffect, useState } from 'react';

import {
  createMobileAccountDataAdapter,
  localAccountOverview,
  type AccountOverview,
} from './account-data';
import { useMobileAuthSession } from './auth-session-context';

export function useAccountOverview() {
  const auth = useMobileAuthSession();
  const accessToken =
    auth.state.phase === 'authenticated' ? auth.state.session.accessToken : undefined;
  const [data, setData] = useState<AccountOverview>(localAccountOverview);
  const [source, setSource] = useState<'api' | 'local-preview'>('local-preview');

  useEffect(() => {
    let active = true;
    void createMobileAccountDataAdapter({ accessToken, mode: auth.dataMode })
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
  }, [accessToken, auth.cacheEpoch, auth.dataMode]);

  return { data, source };
}
