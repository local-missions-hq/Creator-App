import { useEffect, useState } from 'react';

import {
  createMobileAccountDataAdapter,
  localAccountOverview,
  type AccountOverview,
} from './account-data';

export function useAccountOverview() {
  const [data, setData] = useState<AccountOverview>(localAccountOverview);
  const [source, setSource] = useState<'api' | 'local-preview'>('local-preview');

  useEffect(() => {
    let active = true;
    void createMobileAccountDataAdapter()
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
  }, []);

  return { data, source };
}
