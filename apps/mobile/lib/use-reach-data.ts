import { useEffect, useState } from 'react';

import {
  createMobileReachDataAdapter,
  localBusinessReachOptions,
  localCreatorReachOverview,
  type BusinessReachOptions,
  type CreatorReachOverview,
} from './reach-data';

type Source = 'api' | 'local-preview';

export function useCreatorReachOverview() {
  const [data, setData] = useState<CreatorReachOverview>(localCreatorReachOverview);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileReachDataAdapter()
      .getCreatorReach()
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

export function useBusinessReachOptions() {
  const [data, setData] = useState<BusinessReachOptions>(localBusinessReachOptions);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileReachDataAdapter()
      .getBusinessReachOptions()
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
