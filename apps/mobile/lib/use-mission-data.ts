import { useEffect, useMemo, useState } from 'react';

import {
  createMobileMissionDataAdapter,
  localBusinessCampaignPage,
  localCreatorMissionDetail,
  localCreatorMissionFeed,
  type BusinessCampaignPage,
  type CreatorMissionDetail,
  type CreatorMissionFeed,
} from './mission-data';
import { apiAuthorizationContextForSession } from './auth-session';
import { useMobileAuthSession } from './auth-session-context';

type Source = 'api' | 'local-preview';

export function useCreatorMissionFeed() {
  const auth = useMobileAuthSession();
  const accessToken =
    auth.state.phase === 'authenticated' ? auth.state.session.accessToken : undefined;
  const authorizationContext = useMemo(
    () =>
      auth.state.phase === 'authenticated'
        ? apiAuthorizationContextForSession(auth.state.session)
        : undefined,
    [auth.state],
  );
  const [data, setData] = useState<CreatorMissionFeed>(localCreatorMissionFeed);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileMissionDataAdapter({
      accessToken,
      authorizationContext,
      mode: auth.dataMode,
    })
      .getCreatorMissions()
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
  }, [accessToken, auth.cacheEpoch, auth.dataMode, authorizationContext]);
  return { data, source };
}

export function useCreatorMissionDetail(campaignPublicId = 'cmp_orlando_synthetic_001') {
  const auth = useMobileAuthSession();
  const accessToken =
    auth.state.phase === 'authenticated' ? auth.state.session.accessToken : undefined;
  const authorizationContext = useMemo(
    () =>
      auth.state.phase === 'authenticated'
        ? apiAuthorizationContextForSession(auth.state.session)
        : undefined,
    [auth.state],
  );
  const [data, setData] = useState<CreatorMissionDetail>(localCreatorMissionDetail);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileMissionDataAdapter({
      accessToken,
      authorizationContext,
      mode: auth.dataMode,
    })
      .getCreatorMission(campaignPublicId)
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
  }, [accessToken, auth.cacheEpoch, auth.dataMode, authorizationContext, campaignPublicId]);
  return { data, source };
}

export function useBusinessCampaigns() {
  const auth = useMobileAuthSession();
  const accessToken =
    auth.state.phase === 'authenticated' ? auth.state.session.accessToken : undefined;
  const authorizationContext = useMemo(
    () =>
      auth.state.phase === 'authenticated'
        ? apiAuthorizationContextForSession(auth.state.session)
        : undefined,
    [auth.state],
  );
  const [data, setData] = useState<BusinessCampaignPage>(localBusinessCampaignPage);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileMissionDataAdapter({
      accessToken,
      authorizationContext,
      mode: auth.dataMode,
    })
      .getBusinessCampaigns()
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
  }, [accessToken, auth.cacheEpoch, auth.dataMode, authorizationContext]);
  return { data, source };
}
