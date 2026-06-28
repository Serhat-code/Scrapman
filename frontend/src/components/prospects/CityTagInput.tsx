"use client";

import { X } from "lucide-react";
import { useState } from "react";

interface CityTagInputProps {
  cities: string[];
  onChange: (cities: string[]) => void;
  maxCities: number;
  disabled?: boolean;
}

export function CityTagInput({ cities, onChange, maxCities, disabled }: CityTagInputProps) {
  const [value, setValue] = useState("");

  const addCity = (raw: string) => {
    const city = raw.trim();
    if (!city) return;
    if (cities.length >= maxCities) return;
    if (cities.some((c) => c.toLowerCase() === city.toLowerCase())) return;
    onChange([...cities, city]);
    setValue("");
  };

  const removeCity = (city: string) => {
    onChange(cities.filter((c) => c !== city));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addCity(value);
    } else if (event.key === "Backspace" && value === "" && cities.length > 0) {
      removeCity(cities[cities.length - 1]);
    }
  };

  const limitReached = cities.length >= maxCities;

  return (
    <div>
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
          onChange={(event) => setValue(event.target.value)}
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
    </div>
  );
}
