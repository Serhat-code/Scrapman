"use client";

import { CampaignDetail } from "./CampaignDetail";
import { CampaignsList } from "./CampaignsList";
import { NewCampaignModal } from "./NewCampaignModal";

export function CampaignsView() {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <CampaignsList />
      <CampaignDetail />
      <NewCampaignModal />
    </div>
  );
}
