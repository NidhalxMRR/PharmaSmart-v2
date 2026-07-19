import React, { useEffect, useMemo, useState } from 'react';
import { SupplierProfile } from '../types';
import { Building2, Package, Clock3, ArrowRight, MapPin, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface SupplierView extends SupplierProfile {
  productCount: number;
  outOfStock: number;
  expiringSoon: number;
  stockValue: number;
  topCategories: string[];
}

export default function Suppliers() {
  const [supplierStats, setSupplierStats] = useState<SupplierView[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierProfile['grossist']>('Cogepha');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await fetch('/api/suppliers');
      if (!response.ok) throw new Error('Unable to load supplier data');
      const data = await response.json();
      setSupplierStats(data);
      if (!data.some((item: SupplierView) => item.grossist === selectedSupplier) && data[0]) {
        setSelectedSupplier(data[0].grossist);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('Impossible de charger les données fournisseurs en direct.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const selected = useMemo(
    () => supplierStats.find(item => item.grossist === selectedSupplier) || supplierStats[0],
    [supplierStats, selectedSupplier]
  );

  const serviceLevelClass = selected
    ? selected.serviceLevel === 'Excellent'
      ? 'text-brand-primary'
      : selected.serviceLevel === 'Bon'
        ? 'text-brand-accent'
        : 'text-brand-alert'
    : 'text-brand-text-dark';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-sans font-semibold text-brand-text-dark">Fournisseurs & Réseau Grossistes</h2>
          <button
            onClick={fetchSuppliers}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-3 py-1.5 text-[10px] font-semibold text-brand-primary hover:bg-brand-primary-light/40 transition-colors"
          >
            <RefreshCw size={11} />
            Actualiser les données
          </button>
        </div>
        <p className="text-brand-text-muted font-mono text-xs">
          Vue consolidée des partenaires d'approvisionnement, des couvertures stock et des points de vigilance.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-brand-alert/20 bg-brand-accent-light px-4 py-3 text-sm text-brand-text-dark">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-brand-border bg-brand-surface px-5 py-8 text-center text-sm text-brand-text-muted">
          Chargement des fournisseurs en direct...
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {supplierStats.map((supplier) => {
          const isSelected = supplier.grossist === selectedSupplier;
          return (
            <button
              key={supplier.grossist}
              onClick={() => setSelectedSupplier(supplier.grossist)}
              className={`text-left rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                  : 'bg-brand-card border-brand-border hover:bg-brand-primary-light/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-brand-text-dark'}`}>
                    {supplier.grossist}
                  </div>
                  <div className={`text-[10px] font-mono uppercase tracking-wide ${isSelected ? 'text-brand-primary-light' : 'text-brand-text-muted'}`}>
                    {supplier.region}
                  </div>
                </div>
                <Building2 size={18} className={isSelected ? 'text-white' : 'text-brand-primary'} />
              </div>

              <div className="mt-4 flex items-end gap-2">
                <span className={`text-3xl font-bold font-display ${isSelected ? 'text-white' : 'text-brand-primary'}`}>
                  {supplier.productCount}
                </span>
                <span className={`text-xs font-mono ${isSelected ? 'text-brand-primary-light' : 'text-brand-text-muted'} pb-1`}>
                  références
                </span>
              </div>

              <div className={`mt-3 text-[11px] leading-normal ${isSelected ? 'text-brand-primary-light' : 'text-brand-text-muted'}`}>
                {supplier.notes}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-6"
        >
          <div className="xl:col-span-2 bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-brand-text-dark">{selected.grossist}</h3>
                <p className="text-xs font-mono text-brand-text-muted mt-1">{selected.notes}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-brand-primary bg-brand-primary-light border border-brand-primary/20 px-2.5 py-1 rounded-full">
                <MapPin size={11} /> {selected.region}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-brand-border rounded-xl p-3">
                <div className="text-[10px] font-mono uppercase tracking-wide text-brand-text-muted">Références</div>
                <div className="mt-1 text-2xl font-bold text-brand-text-dark">{selected.productCount}</div>
              </div>
              <div className="bg-white border border-brand-border rounded-xl p-3">
                <div className="text-[10px] font-mono uppercase tracking-wide text-brand-text-muted">Ruptures</div>
                <div className="mt-1 text-2xl font-bold text-brand-alert">{selected.outOfStock}</div>
              </div>
              <div className="bg-white border border-brand-border rounded-xl p-3">
                <div className="text-[10px] font-mono uppercase tracking-wide text-brand-text-muted">Péremption &lt; 3m</div>
                <div className="mt-1 text-2xl font-bold text-brand-accent">{selected.expiringSoon}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-text-dark">
                <Package size={16} className="text-brand-primary" />
                Catégories approvisionnées
              </div>
              <div className="grid grid-cols-1 gap-2">
                {selected.topCategories.map(category => (
                  <div key={category} className="flex items-center justify-between gap-4 bg-white border border-brand-border rounded-xl px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-brand-text-dark truncate">{category}</div>
                      <div className="text-[11px] font-mono text-brand-text-muted mt-0.5">Taille du flux suivie en direct</div>
                    </div>
                    <div className="text-right shrink-0 text-[11px] font-mono text-brand-text-muted">
                      {selected.productCount} références
                    </div>
                  </div>
                ))}
                {selected.topCategories.length === 0 && (
                  <div className="rounded-xl border border-dashed border-brand-border bg-white px-4 py-3 text-sm text-brand-text-muted">
                    Aucun catalogue chargé pour le moment.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-text-dark">
              <Clock3 size={16} className="text-brand-primary" />
              Signaux rapides
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-brand-border bg-white p-3">
                <div className="text-[10px] font-mono uppercase tracking-wide text-brand-text-muted">Contact</div>
                <div className="mt-1 text-sm font-semibold text-brand-text-dark">{selected.contactName}</div>
                <div className="mt-1 text-[11px] font-mono text-brand-text-muted">{selected.phone}</div>
                <div className="text-[11px] font-mono text-brand-text-muted">{selected.email}</div>
              </div>
              <div className="rounded-xl border border-brand-border bg-white p-3">
                <div className="text-[10px] font-mono uppercase tracking-wide text-brand-text-muted">Délai moyen</div>
                <div className="mt-1 text-lg font-semibold text-brand-text-dark">{selected.leadTimeDays} jour(s)</div>
              </div>
              <div className="rounded-xl border border-brand-border bg-white p-3">
                <div className="text-[10px] font-mono uppercase tracking-wide text-brand-text-muted">Niveau de service</div>
                <div className={`mt-1 text-lg font-semibold ${serviceLevelClass}`}>
                  {selected.serviceLevel}
                </div>
              </div>
              <div className="rounded-xl border border-brand-border bg-brand-accent-light p-3 text-xs text-brand-text-dark leading-normal">
                <div className="flex items-center gap-1.5 font-semibold text-brand-primary mb-1">
                  <AlertTriangle size={13} />
                  Lecture opérationnelle
                </div>
                {selected.notes}
              </div>
            </div>

            <div className="pt-2 text-xs text-brand-text-muted leading-normal">
              Cette vue consomme les données du backend local via l'API `/api/suppliers`. Si vous exposez le connecteur MCP dans ce workspace, je peux remplacer cette source par un pont direct vers le flux live.
            </div>

            <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-brand-primary">
              <ArrowRight size={13} />
              Utilisez cette page pour comparer rapidement les partenaires d'approvisionnement.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
