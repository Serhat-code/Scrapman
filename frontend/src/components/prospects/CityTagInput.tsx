"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface CityTagInputProps {
  cities: string[];
  onChange: (cities: string[]) => void;
  maxCities: number;
  disabled?: boolean;
}

const MAX_SUGGESTIONS = 8;

export function CityTagInput({ cities, onChange, maxCities, disabled }: CityTagInputProps) {
  const [value, setValue] = useState("");
  const [toutesLesVilles, setToutesLesVilles] = useState<string[] | null>(null);
  const [suggestionsVisibles, setSuggestionsVisibles] = useState(false);

  // Chargée à la demande (≈480 Ko) : inutile d'alourdir le bundle initial
  // pour une liste qui ne sert que dans cette modale.
  useEffect(() => {
    import("@/lib/data/villes-france.json").then((module) => {
      setToutesLesVilles(module.default as string[]);
    });
  }, []);

  const suggestions = useMemo(() => {
    const recherche = value.trim().toLowerCase();
    if (!recherche || !toutesLesVilles) return [];
    const dejaAjoutees = new Set(cities.map((c) => c.toLowerCase()));
    const resultats: string[] = [];
    for (const ville of toutesLesVilles) {
      if (resultats.length >= MAX_SUGGESTIONS) break;
      if (dejaAjoutees.has(ville.toLowerCase())) continue;
      if (ville.toLowerCase().startsWith(recherche)) resultats.push(ville);
    }
    return resultats;
  }, [value, toutesLesVilles, cities]);

  const addCity = (raw: string) => {
    const city = raw.trim();
    if (!city) return;
    if (cities.length >= maxCities) return;
    if (cities.some((c) => c.toLowerCase() === city.toLowerCase())) return;
    onChange([...cities, city]);
    setValue("");
    setSuggestionsVisibles(false);
  };

  const removeCity = (city: string) => {
    onChange(cities.filter((c) => c !== city));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addCity(suggestions[0] ?? value);
    } else if (event.key === "Backspace" && value === "" && cities.length > 0) {
      removeCity(cities[cities.length - 1]);
    } else if (event.key === "Escape") {
      setSuggestionsVisibles(false);
    }
  };

  const limitReached = cities.length >= maxCities;

  return (
    <div className="relative">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 focus-within:border-[var(--emerald)]">
        {cities.map((city) => (
          <span
            key={city}
            className="flex items-center gap-1 rounded-md bg-[var(--bg-hover)] px-2 py-0.5 text-xs text-[var(--text-primary)]"
          >
            {city}
            <button
              type="button"
              onClick={() => removeCity(city)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              disabled={disabled}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSuggestionsVisibles(true);
          }}
          onFocus={() => setSuggestionsVisibles(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => addCity(value)}
          disabled={disabled || limitReached}
          placeholder={limitReached ? "" : cities.length === 0 ? "Ajouter une ville…" : ""}
          className="min-w-[100px] flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {cities.length}/{maxCities} villes — Entrée ou virgule pour ajouter
      </p>

      {suggestionsVisibles && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg">
          {suggestions.map((ville) => (
            <li key={ville}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addCity(ville)}
                className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                {ville}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
