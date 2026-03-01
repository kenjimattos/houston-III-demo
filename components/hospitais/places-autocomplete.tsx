"use client";

import { useEffect, useRef, useState } from "react";
import {
  isGoogleMapsConfigured,
  loadGoogleMapsScript,
  searchHospitalsByName,
} from "@/services/googleMapsService";
import { Input } from "@/components/ui/input";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: any) => void;
  placeholder?: string;
  types?: string[];
  mode?: "default" | "hospital";
}

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder,
  types,
  mode = "default",
}: PlacesAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionToken = useRef<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const mapsConfigured = isGoogleMapsConfigured();

  useEffect(() => {
    if (mode === "hospital" || !mapsConfigured) return; // não carrega script se for hospital
    loadGoogleMapsScript()
      .then(() => {
        if (!(window as any).google) return;
        // Verificar se a biblioteca places está carregada antes de criar o token
        if (
          (window as any).google.maps &&
          (window as any).google.maps.places &&
          (window as any).google.maps.places.AutocompleteSessionToken
        ) {
          sessionToken.current = new (
            window as any
          ).google.maps.places.AutocompleteSessionToken();
          setIsApiLoaded(true);
        } else {
          console.error("Google Maps Places library not fully loaded");
          // Tentar novamente após um pequeno delay
          setTimeout(() => {
            if (
              (window as any).google?.maps?.places?.AutocompleteSessionToken
            ) {
              sessionToken.current = new (
                window as any
              ).google.maps.places.AutocompleteSessionToken();
              setIsApiLoaded(true);
            }
          }, 1000);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar Google Maps:", err);
      });
  }, [mode, mapsConfigured]);

  useEffect(() => {
    if (!value) {
      setSuggestions([]);
      return;
    }

    if (mode === "hospital") {
      if (!mapsConfigured) {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      searchHospitalsByName(value).then((results) => {
        setSuggestions(results);
        setLoading(false);
      });
      return;
    }

    if (
      !mapsConfigured ||
      !isApiLoaded ||
      !(window as any).google?.maps?.places?.AutocompleteSuggestion
    ) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setLoading(true);

        const request = {
          input: value,
          includedPrimaryTypes: types || undefined,
          sessionToken: sessionToken.current,
          region: "br",
          language: "pt-BR",
        };

        const { suggestions: newSuggestions } = await (
          window as any
        ).google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
          request
        );

        setSuggestions(newSuggestions || []);
      } catch (error) {
        console.error("Erro ao buscar sugestões:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [value, types, mode, isApiLoaded, mapsConfigured]);

  async function handleSelect(suggestion: any) {
    setShowDropdown(false);

    if (mode === "hospital") {
      onChange(suggestion.name);
      onPlaceSelected(suggestion);
      return;
    }

    // Usar o texto principal da sugestão
    const mainText =
      suggestion.placePrediction?.text?.text || suggestion.description || "";
    onChange(mainText);

    // Buscar detalhes do place usando a nova API
    if (
      (window as any).google?.maps?.places?.Place &&
      suggestion.placePrediction
    ) {
      try {
        const placeId = suggestion.placePrediction.placeId;
        const place = new (window as any).google.maps.places.Place({
          id: placeId,
          requestedLanguage: "pt-BR",
          requestedRegion: "BR",
        });

        await place.fetchFields({
          fields: [
            "addressComponents",
            "location",
            "displayName",
            "formattedAddress",
          ],
        });

        // Converter para formato compatível com o código existente
        const placeData = {
          place_id: placeId,
          name: place.displayName,
          formatted_address: place.formattedAddress,
          address_components: place.addressComponents,
          geometry: {
            location: place.location,
          },
        };

        onPlaceSelected(placeData);

        // Resetar o token de sessão após usar
        if ((window as any).google?.maps?.places?.AutocompleteSessionToken) {
          sessionToken.current = new (
            window as any
          ).google.maps.places.AutocompleteSessionToken();
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes do lugar:", error);
      }
    }
  }

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-10 bg-white border w-full mt-1 rounded shadow max-h-64 overflow-y-auto">
          {suggestions.map((s, index) => {
            const displayText =
              mode === "hospital"
                ? s.name
                : s.placePrediction?.text?.text || s.description || "";
            const secondaryText =
              mode === "hospital"
                ? s.formatted_address
                : s.placePrediction?.secondaryText?.text || "";

            return (
              <div
                key={
                  mode === "hospital"
                    ? s.place_id || s.id || index
                    : s.placePrediction?.placeId || index
                }
                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                onMouseDown={() => handleSelect(s)}
              >
                <div className="font-thin">{displayText}</div>
                {secondaryText && (
                  <div className="text-xs text-gray-500">{secondaryText}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {showDropdown && value && suggestions.length === 0 && !loading && !mapsConfigured && (
        <div className="absolute z-10 bg-white border w-full mt-1 rounded shadow p-3">
          <p className="text-sm text-gray-500">
            Busca automática indisponível no modo demo (sem Google Maps API Key). Continue digitando manualmente.
          </p>
        </div>
      )}
    </div>
  );
}
