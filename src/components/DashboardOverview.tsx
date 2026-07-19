import React from 'react';
import { Product, SensorReading, StaffShift } from '../types';
import { TrendingUp, AlertTriangle, Thermometer, Users, ShoppingCart, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardOverviewProps {
  products: Product[];
  sensors: SensorReading[];
  staff: StaffShift[];
  onTabChange: (tab: string) => void;
  onSimulateDrift: () => void;
}

export default function DashboardOverview({
  products,
  sensors,
  staff,
  onTabChange,
  onSimulateDrift
}: DashboardOverviewProps) {
  const oosCount = products.filter(p => p.isOutOfStock).length;
  const criticalSensors = sensors.filter(s => s.status === 'Critical' || s.status === 'Warning');
  
  // Calculate expiry warning count (less than 3 months)
  const expiryCount = products.filter(p => {
    const expiry = new Date(p.expiryDate);
    const diffMonths = (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30);
    return diffMonths > 0 && diffMonths <= 3;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header with Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-sans font-semibold tracking-tight text-brand-text-dark">
            Tableau de Bord PharmaSmart
          </h1>
          <p className="text-sm text-brand-text-muted font-mono mt-1">
            Système d'exploitation autonome pour officine • Juin 2026
          </p>
        </div>
        <div className="flex gap-2 font-mono text-xs text-brand-primary bg-brand-primary-light border border-brand-primary/20 px-3 py-1.5 rounded-md shadow-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-brand-primary animate-pulse"></span>
            AGENT HERMES CONNECTÉ
          </span>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA Card */}
        <motion.div 
          whileHover={{ translateY: -2 }}
          className="bg-brand-card shadow-sm border border-brand-border rounded-xl p-5 relative overflow-hidden"
        >
          <div className="absolute right-4 top-4 text-brand-primary bg-brand-primary-light p-2.5 rounded-lg border border-brand-border">
            <TrendingUp size={20} />
          </div>
          <span className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">Chiffre d'affaires mensuel</span>
          <h3 className="text-2xl font-bold text-brand-text-dark mt-2">125 983 DT</h3>
          <div className="flex items-center gap-1 text-xs text-brand-text-muted mt-2 font-mono">
            <span>+3.2% vs mois dernier (estimations)</span>
          </div>
        </motion.div>

        {/* OOS Card */}
        <motion.div 
          whileHover={{ translateY: -2 }}
          onClick={() => onTabChange('stock')}
          className="bg-brand-card shadow-sm border border-brand-border rounded-xl p-5 cursor-pointer relative overflow-hidden"
        >
          <div className="absolute right-4 top-4 text-brand-accent bg-brand-accent-light p-2.5 rounded-lg border border-brand-accent/20">
            <AlertTriangle size={20} />
          </div>
          <span className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">Références en rupture</span>
          <h3 className="text-2xl font-bold text-brand-accent mt-2">{oosCount || 68} / 2 100</h3>
          <div className="flex items-center gap-1 text-xs text-brand-accent mt-2 font-mono">
            <span>3.2% taux de rupture de stock global</span>
          </div>
        </motion.div>

        {/* Expiry Card */}
        <motion.div 
          whileHover={{ translateY: -2 }}
          onClick={() => onTabChange('stock')}
          className="bg-brand-card shadow-sm border border-brand-border rounded-xl p-5 cursor-pointer relative overflow-hidden"
        >
          <div className="absolute right-4 top-4 text-brand-accent bg-brand-accent-light p-2.5 rounded-lg border border-brand-accent/20">
            <ShieldAlert size={20} />
          </div>
          <span className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">Péremption &lt; 3 mois</span>
          <h3 className="text-2xl font-bold text-brand-accent mt-2">{expiryCount || 112}</h3>
          <div className="flex items-center gap-1 text-xs text-brand-accent mt-2 font-mono">
            <span>Gérer les retours grossistes</span>
          </div>
        </motion.div>

        {/* Team Card */}
        <motion.div 
          whileHover={{ translateY: -2 }}
          onClick={() => onTabChange('staff')}
          className="bg-brand-card shadow-sm border border-brand-border rounded-xl p-5 cursor-pointer relative overflow-hidden"
        >
          <div className="absolute right-4 top-4 text-brand-primary bg-brand-primary-light p-2.5 rounded-lg border border-brand-border">
            <Users size={20} />
          </div>
          <span className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">Pharmaciens de garde</span>
          <h3 className="text-2xl font-bold text-brand-primary mt-2">Saber Sakli</h3>
          <div className="flex items-center gap-1 text-xs text-brand-text-muted mt-2 font-mono">
            <span>Dimanche : Trou de couverture !</span>
          </div>
        </motion.div>
      </div>

      {/* Grid of Cold Chain & Staff Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cold Chain Panel */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-sans font-medium text-brand-text-dark flex items-center gap-2">
              <Thermometer className="text-brand-primary" size={18} />
              Chaîne du Froid (IoT)
            </h2>
            <button 
              onClick={onSimulateDrift}
              className="font-mono text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2.5 py-1 rounded transition-colors"
            >
              Simuler dérive de temp
            </button>
          </div>

          <div className="space-y-3">
            {sensors.map(sensor => (
              <div 
                key={sensor.id} 
                className={`p-3.5 rounded-lg border flex justify-between items-center ${
                  sensor.status === 'Critical'
                    ? 'bg-red-50 border-red-200 text-red-900 animate-pulse'
                    : sensor.status === 'Warning'
                    ? 'bg-brand-accent-light border-brand-accent/30 text-brand-accent'
                    : 'bg-brand-card border-brand-border text-brand-text-dark'
                }`}
              >
                <div>
                  <div className="font-sans font-medium text-sm flex items-center gap-1.5">
                    {sensor.name}
                    <span className="text-xs font-mono text-brand-text-muted">({sensor.location})</span>
                  </div>
                  <div className="font-mono text-xs text-brand-text-muted mt-1">
                    Humidité: {sensor.humidity}% • Plage cible: {sensor.minTemp}°C - {sensor.maxTemp}°C
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-lg font-semibold ${
                    sensor.status === 'Critical' ? 'text-red-600' : sensor.status === 'Warning' ? 'text-brand-accent' : 'text-brand-primary'
                  }`}>
                    {sensor.temperature.toFixed(1)}°C
                  </div>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-mono mt-0.5 ${
                    sensor.status === 'Critical'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : sensor.status === 'Warning'
                      ? 'bg-brand-accent-light text-brand-accent border border-brand-accent/30'
                      : 'bg-brand-primary-light text-brand-primary border border-brand-primary/20'
                  }`}>
                    {sensor.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Planning Panel */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-sans font-medium text-brand-text-dark flex items-center gap-2">
              <Users className="text-brand-primary" size={18} />
              Personnel & Gardes
            </h2>
            <button 
              onClick={() => onTabChange('staff')}
              className="font-mono text-xs bg-brand-primary hover:bg-brand-primary-hover text-white border border-brand-primary px-2.5 py-1 rounded transition-colors shadow-sm"
            >
              Gérer planning
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {staff.map(member => (
              <div 
                key={member.id} 
                className="bg-brand-card border border-brand-border rounded-lg p-3 flex gap-3 items-center"
              >
                <img 
                  src={member.avatar} 
                  alt={member.name} 
                  className="h-10 w-10 rounded-full border border-brand-border object-cover" 
                />
                <div className="min-w-0">
                  <div className="font-sans font-medium text-sm text-brand-text-dark truncate">{member.name}</div>
                  <div className="text-[11px] font-mono text-brand-text-muted truncate">{member.role}</div>
                  <div className="font-mono text-[10px] text-brand-text-muted mt-1 flex gap-1">
                    <span className="bg-brand-surface px-1 py-0.5 rounded text-brand-text-dark border border-brand-border">
                      Sam: {member.schedule['Samedi'] || 'Repos'}
                    </span>
                    <span className={`px-1 py-0.5 rounded border ${
                      member.schedule['Dimanche'] === 'Garde'
                        ? 'bg-brand-primary-light text-brand-primary border-brand-primary/20'
                        : member.schedule['Dimanche'] === 'Repos'
                        ? 'bg-neutral-100 text-neutral-400 border-neutral-200'
                        : 'bg-brand-surface text-brand-text-dark border border-brand-border'
                    }`}>
                      Dim: {member.schedule['Dimanche'] || 'Repos'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-brand-accent-light border border-brand-accent/20 text-brand-text-dark text-xs font-mono flex gap-2.5 items-start">
            <span className="font-bold shrink-0 bg-brand-accent text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px]">!</span>
            <div>
              <p className="font-bold text-[13px] text-brand-accent mb-0.5">ALERTE PLANNING : TROU DE COUVERTURE</p>
              Aucun pharmacien n'est assigné à la garde du Dimanche soir. Demandez à <span className="underline cursor-pointer text-brand-primary hover:text-brand-primary-hover font-semibold" onClick={() => onTabChange('staff')}>l'assistant Hermes d'optimiser le planning</span> pour combler ce trou.
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Vision Footer from Slide Deck */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-5 font-sans relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-48 h-48 rounded-full bg-brand-primary-light/40 blur-3xl"></div>
        <h4 className="text-brand-primary font-semibold text-sm tracking-wide uppercase font-mono mb-1">Architecture PharmaSmart</h4>
        <p className="text-brand-text-dark text-sm leading-relaxed max-w-4xl">
          PharmaSmart unifie les silos de l'officine. En combinant les données de l'ERP <strong className="text-brand-primary">Avicenne dot NET</strong>, les relevés de capteurs IoT et le planning d'équipe, l'agent autonome Hermes peut anticiper les ruptures de stock, formuler des bons de commande optimisés, et sauvegarder vos rapports clés directement dans votre <strong className="text-brand-primary">Google Drive sécurisé</strong>.
        </p>
      </div>
    </div>
  );
}
