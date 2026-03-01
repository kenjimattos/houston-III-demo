"use client";

import { useEffect, useRef, useState } from "react";
import { isGoogleMapsConfigured, loadGoogleMapsScript } from "@/services/googleMapsService";
import { Input } from "@/components/ui/input";
import { MapPin, Building2, Hash } from "lucide-react";

interface UnifiedPlaceSearchProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: any) => void;
  placeholder?: string;
}

export function UnifiedPlaceSearch({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Digite o nome do hospital, endereço completo ou CEP...",
}: UnifiedPlaceSearchProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionToken = useRef<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const mapsConfigured = isGoogleMapsConfigured();

  useEffect(() => {
    if (!mapsConfigured) return;

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
  }, [mapsConfigured]);

  useEffect(() => {
    if (!value) {
      setSuggestions([]);
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

        // Sem restrições de tipo - aceita hospitais, endereços e CEPs
        const request = {
          input: value,
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
  }, [value, isApiLoaded, mapsConfigured]);

  async function handleSelect(suggestion: any) {
    setShowDropdown(false);

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
          displayName: place.displayName,
          formatted_address: place.formattedAddress,
          addressComponents: place.addressComponents,
          address_components: place.addressComponents,
          location: place.location,
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

  // Função para determinar o ícone baseado no tipo de resultado
  function getResultIcon(suggestion: any) {
    const types = suggestion.placePrediction?.types || [];

    if (types.includes("hospital") || types.includes("health")) {
      return <Building2 className="h-4 w-4 text-blue-500" />;
    }
    if (types.includes("postal_code")) {
      return <Hash className="h-4 w-4 text-green-500" />;
    }
    return <MapPin className="h-4 w-4 text-gray-500" />;
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
      {loading && value && (
        <div className="absolute right-3 top-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
        </div>
      )}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-10 bg-white border w-full mt-1 rounded shadow max-h-64 overflow-y-auto">
          {suggestions.map((s, index) => {
            const displayText =
              s.placePrediction?.text?.text || s.description || "";
            const secondaryText = s.placePrediction?.secondaryText?.text || "";

            return (
              <div
                key={s.placePrediction?.placeId || index}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-start gap-2"
                onMouseDown={() => handleSelect(s)}
              >
                <div className="mt-0.5">{getResultIcon(s)}</div>
                <div className="flex-1">
                  <div className="font-normal">{displayText}</div>
                  {secondaryText && (
                    <div className="text-xs text-gray-500">{secondaryText}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showDropdown && !loading && value && suggestions.length === 0 && (
        <div className="absolute z-10 bg-white border w-full mt-1 rounded shadow p-3">
          {!mapsConfigured ? (
            <p className="text-sm text-gray-500">
              Busca automática indisponível no modo demo (sem Google Maps API Key). Continue digitando manualmente.
            </p>
          ) : (
            <p className="text-sm text-gray-500">Nenhum resultado encontrado</p>
          )}
        </div>
      )}
    </div>
  );
}
