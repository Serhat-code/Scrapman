"use client";

import { ProspectDetailPanel } from "@/components/prospects/detail/ProspectDetailPanel";
import { useProspects } from "@/lib/queries/prospects";

import { BulkActionBar } from "./BulkActionBar";
import { FilterBar } from "./FilterBar";
import { ProspectList } from "./ProspectList";
import { ProspectsHeader } from "./ProspectsHeader";
import { ScrapingModal } from "./ScrapingModal";

export function ProspectsView() {
  const { data: prospects } = useProspects();

  return (
    <div className="flex h-full w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <ProspectsHeader total={prospects?.length ?? 0} />
        <FilterBar />
        <ProspectList />
        <BulkActionBar />
      </div>
      <ProspectDetailPanel />
      <ScrapingModal />
    </div>
  );
}
