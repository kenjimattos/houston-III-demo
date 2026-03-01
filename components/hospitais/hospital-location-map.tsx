"use client";

import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useState, memo, useEffect } from "react";
import { isGoogleMapsConfigured, loadGoogleMapsScript } from "@/services/googleMapsService";

interface HospitalLocationMapProps {
  latitude: number;
  longitude: number;
  hospitalName?: string;
  className?: string;
}

function HospitalLocationMapComponent({
  latitude,
  longitude,
  hospitalName,
  className = "w-full h-[300px]",
}: HospitalLocationMapProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const mapsConfigured = isGoogleMapsConfigured();

  useEffect(() => {
    if (!mapsConfigured) return;
    loadGoogleMapsScript()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error("Erro ao carregar Google Maps:", err);
      });
  }, [mapsConfigured]);

  // Validate coordinates
  if (
    !latitude ||
    !longitude ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-100 rounded-lg border border-gray-300`}
      >
        <p className="text-sm text-gray-500">Coordenadas inválidas</p>
      </div>
    );
  }

  if (!mapsConfigured) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-100 rounded-lg border border-gray-300`}
      >
        <p className="text-sm text-gray-500 text-center px-4">
          Mapa indisponível no modo demo (sem Google Maps API Key). Coordenadas: {latitude}, {longitude}
        </p>
      </div>
    );
  }

  // Show loading state while Google Maps loads
  if (!isLoaded || typeof window === "undefined" || !(window as any).google) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-100 rounded-lg border border-gray-300`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
          <p className="text-sm text-gray-500">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  const center = { lat: latitude, lng: longitude };

  const mapOptions: google.maps.MapOptions = {
    mapTypeId: "roadmap",
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
  };

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={16}
        options={mapOptions}
      >
        <Marker position={center} onClick={() => setShowInfo(true)} />

        {showInfo && hospitalName && (
          <InfoWindow position={center} onCloseClick={() => setShowInfo(false)}>
            <div className="p-1">
              <p className="font-medium text-sm">{hospitalName}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const HospitalLocationMap = memo(HospitalLocationMapComponent);
