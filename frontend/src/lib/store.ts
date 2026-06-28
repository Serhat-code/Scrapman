import { create } from "zustand";

import type { ProspectAngle, ProspectBucket, ProspectStatut } from "@/types/database";
import { MAX_SCRAPE_LIMIT } from "@/lib/config";

export type HalalFiltre = "tous" | "halal" | "non_halal";

export interface ProspectFilters {
  search: string;
  buckets: ProspectBucket[];
  statuts: ProspectStatut[];
  angles: ProspectAngle[];
  halal: HalalFiltre;
}

export const DEFAULT_FILTERS: ProspectFilters = {
  search: "",
  buckets: [],
  statuts: [],
  angles: [],
  halal: "tous",
};

export type HalalMode = "halal" | "exclure_halal" | null;

export interface ScrapingModalState {
  isOpen: boolean;
  step: 1 | 2;
  naf: string;
  villes: string[];
  franceEntiere: boolean;
  halalMode: HalalMode;
  excludeGrandesEnseignes: boolean;
  limit: number;
}

export const DEFAULT_SCRAPING_MODAL: ScrapingModalState = {
  isOpen: false,
  step: 1,
  naf: "",
  villes: [],
  franceEntiere: false,
  halalMode: null,
  excludeGrandesEnseignes: false,
  limit: 100,
};

export type CampaignTab = "prospects" | "messages" | "scripts" | "settings";

interface ScrapmanStore {
  filters: ProspectFilters;
  setFilters: (filters: Partial<ProspectFilters>) => void;
  toggleBucket: (bucket: ProspectBucket) => void;
  toggleStatut: (statut: ProspectStatut) => void;
  toggleAngle: (angle: ProspectAngle) => void;
  resetFilters: () => void;

  selectedProspectId: string | null;
  setSelectedProspectId: (id: string | null) => void;

  scrapingModal: ScrapingModalState;
  openScrapingModal: () => void;
  closeScrapingModal: () => void;
  setScrapingModalStep: (step: 1 | 2) => void;
  updateScrapingModal: (partial: Partial<ScrapingModalState>) => void;
  resetScrapingModal: () => void;

  selectedCampaignId: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  campaignTab: CampaignTab;
  setCampaignTab: (tab: CampaignTab) => void;

  newCampaignModalOpen: boolean;
  openNewCampaignModal: () => void;
  closeNewCampaignModal: () => void;

  addProspectsModalOpen: boolean;
  openAddProspectsModal: () => void;
  closeAddProspectsModal: () => void;

  feedbackModalOpen: boolean;
  openFeedbackModal: () => void;
  closeFeedbackModal: () => void;

  scrapingEnCours: boolean;
  setScrapingEnCours: (value: boolean) => void;
}

export const useScrapmanStore = create<ScrapmanStore>()((set) => ({
  filters: DEFAULT_FILTERS,
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  toggleBucket: (bucket) =>
    set((state) => {
      const buckets = state.filters.buckets.includes(bucket)
        ? state.filters.buckets.filter((b) => b !== bucket)
        : [...state.filters.buckets, bucket];
      return { filters: { ...state.filters, buckets } };
    }),
  toggleStatut: (statut) =>
    set((state) => {
      const statuts = state.filters.statuts.includes(statut)
        ? state.filters.statuts.filter((s) => s !== statut)
        : [...state.filters.statuts, statut];
      return { filters: { ...state.filters, statuts } };
    }),
  toggleAngle: (angle) =>
    set((state) => {
      const angles = state.filters.angles.includes(angle)
        ? state.filters.angles.filter((a) => a !== angle)
        : [...state.filters.angles, angle];
      return { filters: { ...state.filters, angles } };
    }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  selectedProspectId: null,
  setSelectedProspectId: (id) => set({ selectedProspectId: id }),

  scrapingModal: DEFAULT_SCRAPING_MODAL,
  openScrapingModal: () =>
    set({ scrapingModal: { ...DEFAULT_SCRAPING_MODAL, isOpen: true } }),
  closeScrapingModal: () => set({ scrapingModal: DEFAULT_SCRAPING_MODAL }),
  setScrapingModalStep: (step) =>
    set((state) => ({ scrapingModal: { ...state.scrapingModal, step } })),
  updateScrapingModal: (partial) =>
    set((state) => {
      const next = { ...state.scrapingModal, ...partial };
      if (next.limit > MAX_SCRAPE_LIMIT) next.limit = MAX_SCRAPE_LIMIT;
      if (next.limit < 1) next.limit = 1;
      return { scrapingModal: next };
    }),
  resetScrapingModal: () => set({ scrapingModal: DEFAULT_SCRAPING_MODAL }),

  selectedCampaignId: null,
  setSelectedCampaignId: (id) => set({ selectedCampaignId: id, campaignTab: "prospects" }),
  campaignTab: "prospects",
  setCampaignTab: (tab) => set({ campaignTab: tab }),

  newCampaignModalOpen: false,
  openNewCampaignModal: () => set({ newCampaignModalOpen: true }),
  closeNewCampaignModal: () => set({ newCampaignModalOpen: false }),

  addProspectsModalOpen: false,
  openAddProspectsModal: () => set({ addProspectsModalOpen: true }),
  closeAddProspectsModal: () => set({ addProspectsModalOpen: false }),

  feedbackModalOpen: false,
  openFeedbackModal: () => set({ feedbackModalOpen: true }),
  closeFeedbackModal: () => set({ feedbackModalOpen: false }),

  scrapingEnCours: false,
  setScrapingEnCours: (value) => set({ scrapingEnCours: value }),
}));
