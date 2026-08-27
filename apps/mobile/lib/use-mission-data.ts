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

type Source = 'api' | 'local-preview';

export function useCreatorMissionFeed() {
  const [data, setData] = useState<CreatorMissionFeed>(localCreatorMissionFeed);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileMissionDataAdapter()
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
  }, []);
  return { data, source };
}

export function useCreatorMissionDetail(campaignPublicId = 'cmp_orlando_synthetic_001') {
  const [data, setData] = useState<CreatorMissionDetail>(localCreatorMissionDetail);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileMissionDataAdapter()
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
  }, [campaignPublicId]);
  return { data, source };
}

export function useBusinessCampaigns() {
  const [data, setData] = useState<BusinessCampaignPage>(localBusinessCampaignPage);
  const [source, setSource] = useState<Source>('local-preview');
  useEffect(() => {
    let active = true;
    void createMobileMissionDataAdapter()
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
  }, []);
  return { data, source };
}
