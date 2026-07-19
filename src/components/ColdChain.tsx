import React, { useState } from 'react';
import { SensorReading } from '../types';
import { Thermometer, Droplets, LineChart as ChartIcon, FileSpreadsheet, CloudUpload, AlertOctagon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';

interface ColdChainProps {
  sensors: SensorReading[];
  onResolveSensor: (sensorId: string) => void;
  onSaveToDrive: (title: string, content: string) => Promise<boolean>;
  isDriveConnected: boolean;
}

export default function ColdChain({
  sensors,
  onResolveSensor,
  onSaveToDrive,
  isDriveConnected
}: ColdChainProps) {
  const [selectedSensorId, setSelectedSensorId] = useState<string>(sensors[0]?.id || '');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const selectedSensor = sensors.find(s => s.id === selectedSensorId) || sensors[0];

  const handleExportToDrive = async () => {
    if (!selectedSensor) return;
    setIsExporting(true);
    setExportMessage(null);

    const title = `PharmaSmart-Rapport-Temperature-${selectedSensor.name.replace(/\s+/g, '')}-${Date.now()}.csv`;
    
    // Format CSV Content
    let csvContent = `Capteur,Emplacement,Seuil Min (C),Seuil Max (C),Statut Actuel\n`;
    csvContent += `"${selectedSensor.name}","${selectedSensor.location}",${selectedSensor.minTemp},${selectedSensor.maxTemp},"${selectedSensor.status}"\n\n`;
    csvContent += `Heure,Temperature (C),Humidite (%)\n`;
    selectedSensor.history.forEach(item => {
      csvContent += `${item.time},${item.temperature.toFixed(1)},${item.humidity}\n`;
    });

    try {
      const success = await onSaveToDrive(title, csvContent);
      if (success) {
        setExportMessage(`Rapport de température exporté avec succès dans Google Drive : ${title}`);
      } else {
        setExportMessage("Une erreur s'est produite. Vérifiez les permissions de votre compte Google.");
      }
    } catch (e) {
      console.error(e);
      setExportMessage("Erreur d'export vers Google Drive.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-semibold text-brand-text-dark">Chaîne du Froid & Surveillance Thermique</h2>
          <p className="text-brand-text-muted font-mono text-xs mt-1">
            Relevés instantanés des capteurs IoT connectés • Alertes intelligentes
          </p>
        </div>
      </div>

      {/* Critical Alarm Banner if any sensor is critical */}
      {sensors.some(s => s.status === 'Critical') && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse"
        >
          <div className="flex gap-3 items-start">
            <div className="p-2 bg-red-100 rounded-lg text-red-600 border border-red-200 shrink-0">
              <AlertOctagon size={20} />
            </div>
            <div>
              <h4 className="text-sm font-sans font-bold text-red-800 uppercase tracking-wider">ALARME CRITIQUE : DÉRIVE THERMIQUE DÉTECTÉE</h4>
              <p className="text-xs text-red-700 font-mono mt-1 leading-normal">
                {sensors.find(s => s.status === 'Critical')?.name} affiche une température anormale. Des doses de vaccins ou d'insuline risquent d'être endommagées !
              </p>
            </div>
          </div>
          <button 
            onClick={() => onResolveSensor(sensors.find(s => s.status === 'Critical')?.id || '')}
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-sans text-xs font-semibold px-4 py-2 rounded-lg transition-colors border border-red-500 shadow-sm cursor-pointer"
          >
            Résoudre & Réinitialiser le compresseur
          </button>
        </motion.div>
      )}

      {/* Sensor Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sensors.map(s => {
          const isSelected = selectedSensorId === s.id;
          return (
            <div
              key={s.id}
              onClick={() => {
                setSelectedSensorId(s.id);
                setExportMessage(null);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-brand-primary border-brand-primary text-white shadow-sm'
                  : s.status === 'Critical'
                  ? 'bg-red-50/50 border-red-200 hover:bg-red-50'
                  : 'bg-brand-card border-brand-border hover:bg-brand-primary-light/30'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-xs font-mono ${isSelected ? 'text-brand-primary-light' : 'text-brand-text-muted'}`}>{s.location}</span>
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                  s.status === 'Critical' ? 'bg-red-500 animate-pulse' : s.status === 'Warning' ? 'bg-brand-accent' : (isSelected ? 'bg-white' : 'bg-brand-primary')
                }`}></span>
              </div>
              <h4 className={`font-sans font-medium text-sm mt-1 truncate ${isSelected ? 'text-white' : 'text-brand-text-dark'}`}>{s.name}</h4>
              
              <div className="flex items-baseline gap-2 mt-4">
                <span className={`text-2xl font-bold font-mono ${
                  isSelected ? 'text-white' : (s.status === 'Critical' ? 'text-red-600' : s.status === 'Warning' ? 'text-brand-accent' : 'text-brand-primary')
                }`}>
                  {s.temperature.toFixed(1)}°C
                </span>
                <span className={`text-xs font-mono flex items-center gap-0.5 ${isSelected ? 'text-brand-primary-light' : 'text-brand-text-muted'}`}>
                  <Droplets size={12} />
                  {s.humidity}%
                </span>
              </div>
              <div className={`text-[10px] font-mono uppercase tracking-wide mt-2 ${isSelected ? 'text-brand-primary-light/80' : 'text-brand-text-muted'}`}>
                Seuils: {s.minTemp}°C - {s.maxTemp}°C
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Analytics Panel */}
      {selectedSensor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-sans font-medium text-brand-text-dark flex items-center gap-2">
                <ChartIcon className="text-brand-primary" size={18} />
                Historique Thermique (Dernières 24h)
              </h3>
              <span className="text-xs font-mono text-brand-text-muted bg-brand-card border border-brand-border px-2 py-0.5 rounded shadow-sm font-medium">
                Intervalle: 1h
              </span>
            </div>

            <div className="h-72 w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={selectedSensor.history}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#D7E5DF" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#0B3D2E" 
                    tick={{ fill: '#0F1F19', fontSize: 10 }}
                  />
                  <YAxis 
                    stroke="#0B3D2E" 
                    tick={{ fill: '#0F1F19', fontSize: 10 }}
                    domain={[(dataMin: number) => Math.floor(dataMin - 1), (dataMax: number) => Math.ceil(dataMax + 1)]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      borderColor: '#D7E5DF',
                      color: '#0F1F19',
                      fontFamily: 'monospace'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    name="Température (°C)"
                    stroke={selectedSensor.status === 'Critical' ? '#ef4444' : '#0B3D2E'} 
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 1, fill: '#FFFFFF' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions & Metadata */}
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-base font-sans font-medium text-brand-text-dark">Détails & Diagnostics</h3>
              
              <div className="space-y-3 font-sans text-xs">
                <div className="flex justify-between py-1.5 border-b border-brand-border">
                  <span className="text-brand-text-muted font-medium">Nom du capteur :</span>
                  <span className="text-brand-text-dark font-semibold">{selectedSensor.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-brand-border">
                  <span className="text-brand-text-muted font-medium">Emplacement :</span>
                  <span className="text-brand-text-dark font-mono font-medium">{selectedSensor.location}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-brand-border">
                  <span className="text-brand-text-muted font-medium">Plage autorisée :</span>
                  <span className="text-brand-text-dark font-mono font-medium">{selectedSensor.minTemp}°C à {selectedSensor.maxTemp}°C</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-brand-border">
                  <span className="text-brand-text-muted font-medium">Statut de sécurité :</span>
                  <span className={`font-mono font-bold ${
                    selectedSensor.status === 'Critical' ? 'text-red-600' : selectedSensor.status === 'Warning' ? 'text-brand-accent' : 'text-brand-primary'
                  }`}>{selectedSensor.status}</span>
                </div>
              </div>
            </div>

            {/* Google Drive Exporter */}
            <div className="space-y-4 pt-4 border-t border-brand-border">
              <div>
                <h4 className="text-sm font-sans font-medium text-brand-text-dark flex items-center gap-1.5">
                  <FileSpreadsheet size={16} className="text-brand-primary" />
                  Exporter les Relevés
                </h4>
                <p className="text-[11px] text-brand-text-muted mt-1 leading-normal font-sans">
                  Générez un tableau complet des températures au format CSV et sauvegardez-le de manière autonome sur votre Drive.
                </p>
              </div>

              {isDriveConnected ? (
                <button
                  onClick={handleExportToDrive}
                  disabled={isExporting}
                  className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <CloudUpload size={14} />
                  {isExporting ? "Export en cours..." : "Exporter le rapport CSV"}
                </button>
              ) : (
                <div className="p-3 bg-brand-accent-light border border-brand-accent/20 rounded-lg text-[10px] font-mono text-brand-text-dark leading-normal">
                  ⚠️ Google Drive non connecté. Pour sauvegarder vos relevés IoT, connectez-vous dans l'onglet "Google Drive".
                </div>
              )}

              {exportMessage && (
                <div className="p-2.5 bg-brand-primary-light border border-brand-primary/20 rounded text-[11px] font-mono text-brand-primary leading-normal font-medium">
                  {exportMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
