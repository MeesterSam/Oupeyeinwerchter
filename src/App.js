import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as XLSX from 'xlsx';
import './App.css';

// Leaflet marker icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function App() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [error, setError] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Helper functie om coördinaten te parsen
  const parseCoordinate = (coord) => {
    if (!coord) return NaN;
    
    try {
      // Verwijder gradenteken en N/E indicators
      const cleanStr = coord.toString()
        .replace('°', '')
        .replace('N', '')
        .replace('E', '')
        .trim();
      
      const num = parseFloat(cleanStr);
      console.log('Original coordinate:', coord, 'Cleaned:', cleanStr, 'Parsed:', num);
      
      if (isNaN(num)) {
        console.error('Failed to parse coordinate:', coord);
        return NaN;
      }
      
      return num;
    } catch (err) {
      console.error('Error parsing coordinate:', coord, err);
      return NaN;
    }
  };

  useEffect(() => {
    const loadLocations = async () => {
      try {
        console.log('Start laden van Excel bestand...');
        const response = await fetch('/Locaties_Werchter.xlsx');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });

        console.log('Werkbladen in Excel:', workbook.SheetNames);
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Converteer naar JSON met specifieke opties
        const rawData = XLSX.utils.sheet_to_json(sheet, {
          defval: null,
          raw: true,
          rawNumbers: true
        });

        console.log('Ruwe Excel data:', JSON.stringify(rawData, null, 2));
        
        if (rawData.length === 0) {
          throw new Error('Geen data gevonden in Excel bestand');
        }

        // Log de eerste rij om te zien welke kolommen beschikbaar zijn
        console.log('Beschikbare kolommen:', Object.keys(rawData[0]));

        const processedLocations = rawData
          .map((row, index) => {
            // Log de volledige rij data
            console.log(`Rij ${index + 1} ruwe data:`, JSON.stringify(row, null, 2));

            const naam = row.Naam || row.naam || row.Name || row.name;
            const adres = row.Adres || row.adres || row.Address || row.address;
            const wie = row.wie || row.Wie || row.who || row.Who;
            
            // Neem de waarden direct over zonder transformatie
            let latitude = row.Lat;
            let longitude = row.Ing;

            // Log de ruwe coördinaten
            console.log(`Ruwe coördinaten voor ${naam}:`, {
              lat: latitude,
              lng: longitude,
              latType: typeof latitude,
              lngType: typeof longitude
            });

            // Converteer alleen als het geen getallen zijn
            if (typeof latitude !== 'number') {
              latitude = parseFloat(String(latitude).replace(',', '.'));
            }
            if (typeof longitude !== 'number') {
              longitude = parseFloat(String(longitude).replace(',', '.'));
            }

            if (isNaN(latitude) || isNaN(longitude)) {
              console.log(`Ongeldige coördinaten voor ${naam}:`, {
                origineel: { lat: row.Lat, lng: row.Ing },
                verwerkt: { latitude, longitude }
              });
            return null;
          }
          
            const location = {
              Naam: naam,
              Adres: adres || '',
              wie: wie || '',
              Latitude: latitude,
              Longitude: longitude,
              Video: row.Video || row.video || null
            };

            console.log(`Verwerkte locatie ${naam}:`, location);
            return location;
          })
          .filter(location => location !== null);

        console.log('Alle verwerkte locaties:', processedLocations);

        if (processedLocations.length === 0) {
          throw new Error('Geen geldige locaties gevonden in de Excel data.');
        }

        setLocations(processedLocations);
      } catch (error) {
        console.error('Fout bij laden locaties:', error);
        setError(error.message);
      }
    };

    loadLocations();
  }, []);

  const handleMarkerClick = (location) => {
    console.log('Marker clicked:', location);
    setSelectedLocation(location);
    
    if (location.Video) {
      setIsVideoLoading(true);
      console.log('Loading video from URL:', location.Video);
      setSelectedVideo(location.Video);
    } else {
      setSelectedVideo(null);
    }
  };

  const handleVideoError = () => {
    console.error('Error loading video:', selectedVideo);
    setError('Kon de video niet laden. Probeer het later opnieuw.');
    setIsVideoLoading(false);
  };

  const handleVideoLoaded = () => {
    console.log('Video loaded successfully');
    setIsVideoLoading(false);
  };

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app">
      <div className="sidebar">
        <img src="/logo.jpeg" alt="Logo" className="logo" />
        <div className="location-list">
          {locations.map((location) => (
            <div
              key={location.Naam}
              className={`location-item ${selectedLocation?.Naam === location.Naam ? 'selected' : ''}`}
              onClick={() => handleMarkerClick(location)}
            >
              <h3>{location.Naam}</h3>
              <p>{location.Adres}</p>
              <p>Présenté par: {location.wie}</p>
              <p className="coordinates">({location.Latitude}, {location.Longitude})</p>
            </div>
          ))}
        </div>
      </div>
      <div className="main-content">
        <MapContainer
          center={[50.9728, 4.6900]}
          zoom={14}
          style={{ height: '100vh', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {locations.map((location) => {
            // Log de exacte coördinaten voor debugging
            console.log(`Marker voor ${location.Naam}:`, {
              lat: location.Latitude,
              lng: location.Longitude,
              position: [location.Latitude, location.Longitude]
            });
            
            return (
              <Marker
                key={location.Naam}
                position={[location.Latitude, location.Longitude]}
                eventHandlers={{
                  click: () => handleMarkerClick(location)
                }}
              >
                <Popup>
                  <h3>{location.Naam}</h3>
                  <p>{location.Adres}</p>
                  <p>Présenté par: {location.wie}</p>
                  <p>Coördinaten: {location.Latitude}, {location.Longitude}</p>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        {selectedVideo && (
          <div className="video-container">
            <div className="video-header">
              <h3>{selectedLocation?.Naam}</h3>
              <button onClick={() => setSelectedVideo(null)} className="close-button">×</button>
            </div>
            {isVideoLoading && (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p>Video laden...</p>
              </div>
            )}
            <video 
              controls 
              src={selectedVideo}
              onError={handleVideoError}
              onLoadedData={handleVideoLoaded}
              style={{ width: '100%', maxHeight: '70vh' }}
            >
              Je browser ondersteunt geen video weergave.
            </video>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 