import { useEffect, useMemo, useState } from 'react';

import {
  createMobileReachDataAdapter,
  localBusinessReachOptions,
  localCreatorReachOverview,
  type BusinessReachOptions,
  type CreatorReachOverview,
} from './reach-data';
import { apiAuthorizationContextForSession } from './auth-session';
import { useMobileAuthSession } from './auth-session-context';

type Source = 'api' | 'local-preview';

export function useCreatorReachOverview() {
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
  const [data, setData] = useState<CreatorReachOverview>(localCreatorReachOverview);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileReachDataAdapter({
      accessToken,
      authorizationContext,
      mode: auth.dataMode,
      sessionPublicId,
    })
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
  }, [accessToken, auth.cacheEpoch, auth.dataMode, authorizationContext, sessionPublicId]);
  return { data, source };
}

export function useBusinessReachOptions() {
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
  const [data, setData] = useState<BusinessReachOptions>(localBusinessReachOptions);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileReachDataAdapter({
      accessToken,
      authorizationContext,
      mode: auth.dataMode,
      sessionPublicId,
    })
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
  }, [accessToken, auth.cacheEpoch, auth.dataMode, authorizationContext, sessionPublicId]);
  return { data, source };
}
