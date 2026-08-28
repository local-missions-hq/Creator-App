import { useEffect, useState } from 'react';

import {
  createMobileMissionDataAdapter,
  localBusinessCampaignPage,
  localCreatorMissionDetail,
  localCreatorMissionFeed,
  type BusinessCampaignPage,
  type CreatorMissionDetail,
  type CreatorMissionFeed,
} from './mission-data';
import { useMobileAuthSession } from './auth-session-context';

type Source = 'api' | 'local-preview';

export function useCreatorMissionFeed() {
  const auth = useMobileAuthSession();
  const accessToken =
    auth.state.phase === 'authenticated' ? auth.state.session.accessToken : undefined;
  const [data, setData] = useState<CreatorMissionFeed>(localCreatorMissionFeed);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileMissionDataAdapter({ accessToken, mode: auth.dataMode })
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
  }, [accessToken, auth.cacheEpoch, auth.dataMode]);
  return { data, source };
}

export function useCreatorMissionDetail(campaignPublicId = 'cmp_orlando_synthetic_001') {
  const auth = useMobileAuthSession();
  const accessToken =
    auth.state.phase === 'authenticated' ? auth.state.session.accessToken : undefined;
  const [data, setData] = useState<CreatorMissionDetail>(localCreatorMissionDetail);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileMissionDataAdapter({ accessToken, mode: auth.dataMode })
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
  }, [accessToken, auth.cacheEpoch, auth.dataMode, campaignPublicId]);
  return { data, source };
}

export function useBusinessCampaigns() {
  const auth = useMobileAuthSession();
  const accessToken =
    auth.state.phase === 'authenticated' ? auth.state.session.accessToken : undefined;
  const [data, setData] = useState<BusinessCampaignPage>(localBusinessCampaignPage);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileMissionDataAdapter({ accessToken, mode: auth.dataMode })
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
  }, [accessToken, auth.cacheEpoch, auth.dataMode]);
  return { data, source };
}
