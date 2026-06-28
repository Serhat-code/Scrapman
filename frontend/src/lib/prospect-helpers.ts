import type { ProspectFilters } from "@/lib/store";
import type { CampagneFiltres, Prospect } from "@/types/database";

export function isHalalSignal(prospect: Pick<Prospect, "scoring_details">): boolean {
  return (prospect.scoring_details?.halal_bonus ?? 0) > 0;
}

export function matchesProspectFilters(prospect: Prospect, filters: ProspectFilters): boolean {
  if (filters.buckets.length > 0 && (!prospect.bucket || !filters.buckets.includes(prospect.bucket))) {
    return false;
  }
  if (filters.statuts.length > 0 && !filters.statuts.includes(prospect.statut)) {
    return false;
  }
  if (filters.angles.length > 0 && (!prospect.angle || !filters.angles.includes(prospect.angle))) {
    return false;
  }
  if (filters.halal === "halal" && !isHalalSignal(prospect)) return false;
  if (filters.halal === "non_halal" && isHalalSignal(prospect)) return false;

  if (filters.search.trim()) {
    const needle = filters.search.trim().toLowerCase();
    const haystack = [prospect.denomination, prospect.ville, prospect.naf_libelle]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

export function matchesCampagneFiltres(prospect: Prospect, filtres: CampagneFiltres | null): boolean {
  if (!filtres) return true;

  if (filtres.bucket && filtres.bucket.length > 0) {
    if (!prospect.bucket || !filtres.bucket.includes(prospect.bucket)) return false;
  }
  if (filtres.statut && filtres.statut.length > 0) {
    if (!filtres.statut.includes(prospect.statut)) return false;
  }
  if (filtres.naf && filtres.naf.length > 0) {
    if (!prospect.naf || !filtres.naf.includes(prospect.naf)) return false;
  }
  if (filtres.villes && filtres.villes.length > 0) {
    if (!prospect.ville || !filtres.villes.includes(prospect.ville)) return false;
  }
  if (filtres.halal === true && !isHalalSignal(prospect)) return false;
  if (filtres.halal === false && isHalalSignal(prospect)) return false;

  return true;
}
