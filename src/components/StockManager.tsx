import React, { useState } from 'react';
import { Product, OrderDraft } from '../types';
import { ShoppingCart, Search, FileText, AlertTriangle, ArrowRight, CheckCircle2, CloudUpload } from 'lucide-react';
import { motion } from 'motion/react';

interface StockManagerProps {
  products: Product[];
  onPlaceOrder: (grossist: string, items: Array<{ name: string; productId: string; quantity: number; price: number }>) => void;
  onSaveToDrive: (title: string, content: string) => Promise<boolean>;
  isDriveConnected: boolean;
}

export default function StockManager({
  products,
  onPlaceOrder,
  onSaveToDrive,
  isDriveConnected
}: StockManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'oos' | 'expiry'>('all');
  const [selectedGrossist, setSelectedGrossist] = useState<'Cogepha' | 'Medigros' | 'PCT'>('Cogepha');
  
  // Local draft order state
  const [draftQuantities, setDraftQuantities] = useState<{ [productId: string]: number }>({});
  const [isOrdered, setIsOrdered] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<any | null>(null);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.code.includes(searchTerm);
    
    if (!matchesSearch) return false;

    if (activeFilter === 'oos') {
      return product.isOutOfStock;
    }
    
    if (activeFilter === 'expiry') {
      const expiry = new Date(product.expiryDate);
      const diffMonths = (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30);
      return diffMonths > 0 && diffMonths <= 3;
    }

    return true;
  });

  // Calculate recommendation based on CAMV (prediction engine)
  const getRecommendation = (p: Product) => {
    if (p.stock >= p.minStock) return 0;
    // Standard replenishment formula: Min - Stock + (CAMV / 4) rounded up
    return Math.ceil(p.minStock - p.stock + (p.camv / 6));
  };

  // Populate draft quantities with AI recommendations for selected grossist
  const handleAutoFill = () => {
    const newDrafts: { [productId: string]: number } = {};
    products.forEach(p => {
      if (p.grossist === selectedGrossist) {
        const rec = getRecommendation(p);
        if (rec > 0) {
          newDrafts[p.id] = rec;
        }
      }
    });
    setDraftQuantities(newDrafts);
    setIsOrdered(false);
    setSaveSuccess(null);
  };

  const handleQtyChange = (productId: string, val: string) => {
    const qty = parseInt(val) || 0;
    setDraftQuantities(prev => ({
      ...prev,
      [productId]: qty
    }));
  };

  // Compile totals for the draft order
  const draftItems = (Object.entries(draftQuantities) as Array<[string, number]>)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => {
      const prod = products.find(p => p.id === id);
      return prod ? { product: prod, quantity: qty } : null;
    })
    .filter((item): item is { product: Product; quantity: number } => item !== null && item.product.grossist === selectedGrossist);

  const draftTotal = draftItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalMargin = draftItems.reduce((acc, item) => acc + (item.product.price * item.quantity * (item.product.margin / 100)), 0);

  const handleSubmitOrder = () => {
    if (draftItems.length === 0) return;

    const orderPayload = draftItems.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }));

    onPlaceOrder(selectedGrossist, orderPayload);
    
    // Set for local receipt
    setLastCreatedOrder({
      grossist: selectedGrossist,
      items: draftItems,
      total: draftTotal,
      margin: totalMargin,
      date: new Date().toLocaleString('fr-FR', { timeZone: 'UTC' })
    });

    setIsOrdered(true);
    setDraftQuantities({}); // clear draft
  };

  const handleExportToDrive = async () => {
    if (!lastCreatedOrder) return;
    setIsSavingToDrive(true);
    setSaveSuccess(null);

    // Format plain text order file
    const fileTitle = `PharmaSmart-BonCommande-${lastCreatedOrder.grossist}-${Date.now()}.txt`;
    const fileContent = `================================================
PHARMASMART - BON DE COMMANDE AUTOMATISÉ
================================================
Grossiste: ${lastCreatedOrder.grossist}
Date: ${lastCreatedOrder.date} UTC
Statut: Envoyé au Portail Grossiste (Cogepha Live/Medigros Hub)

PRODUITS COMMANDÉS :
${lastCreatedOrder.items.map((it: any) => `- ${it.product.name} (Code: ${it.product.code}) | Qté: ${it.quantity} | Prix unit: ${it.product.price.toFixed(3)} DT | Total: ${(it.product.price * it.quantity).toFixed(3)} DT`).join('\n')}

------------------------------------------------
TOTAL BON DE COMMANDE : ${lastCreatedOrder.total.toFixed(3)} DT
MARGE ESTIMÉE : ${lastCreatedOrder.margin.toFixed(3)} DT (Moyenne: ${((lastCreatedOrder.margin / lastCreatedOrder.total) * 100).toFixed(1)}%)
================================================
Généré de manière autonome par PharmaSmart.
`;

    try {
      const success = await onSaveToDrive(fileTitle, fileContent);
      if (success) {
        setSaveSuccess(`Bon de commande sauvegardé dans Google Drive sous le nom : ${fileTitle}`);
      } else {
        setSaveSuccess("Échec lors de la sauvegarde sur Google Drive. Vérifiez vos permissions.");
      }
    } catch (e) {
      console.error(e);
      setSaveSuccess("Une erreur s'est produite lors de l'export.");
    } finally {
      setIsSavingToDrive(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-sans font-semibold text-brand-text-dark">Gestion des Stocks & Approvisionnement</h2>
        <p className="text-brand-text-muted font-mono text-xs mt-1">
          Interface connectée à l'ERP Avicenne dot NET • Moteur d'estimation CAMV
        </p>
      </div>

      <div className="space-y-6">
        {/* Main Product Table Section */}
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-brand-primary h-4.5 w-4.5" />
              <input
                type="text"
                placeholder="Rechercher par nom de médicament, code-barres..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-brand-border rounded-lg pl-10 pr-4 py-2 text-sm text-brand-text-dark placeholder-brand-text-muted focus:outline-none focus:border-brand-primary font-sans"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 font-mono text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-brand-primary border-brand-primary text-white shadow-sm font-medium'
                    : 'bg-brand-surface border-brand-border text-brand-text-muted hover:bg-brand-primary-light/50'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setActiveFilter('oos')}
                className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-colors ${
                  activeFilter === 'oos'
                    ? 'bg-brand-accent border-brand-accent text-white shadow-sm font-medium'
                    : 'bg-brand-surface border-brand-border text-brand-text-muted hover:bg-brand-primary-light/50'
                }`}
              >
                <AlertTriangle size={13} />
                Ruptures
              </button>
              <button
                onClick={() => setActiveFilter('expiry')}
                className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-colors ${
                  activeFilter === 'expiry'
                    ? 'bg-brand-accent border-brand-accent text-white shadow-sm font-medium'
                    : 'bg-brand-surface border-brand-border text-brand-text-muted hover:bg-brand-primary-light/50'
                }`}
              >
                Péremption &lt; 3m
              </button>
            </div>
          </div>

          {/* Product Grid / Table */}
          <div className="bg-brand-card shadow-sm border border-brand-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-surface text-brand-text-muted font-mono text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Produit</th>
                    <th className="px-4 py-3">Stock / Min</th>
                    <th className="px-4 py-3">CAMV</th>
                    <th className="px-4 py-3">Prix (DT)</th>
                    <th className="px-4 py-3">Marge</th>
                    <th className="px-4 py-3">Grossiste</th>
                    <th className="px-4 py-3 text-right">Quantité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border font-sans text-sm text-brand-text-dark">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-brand-text-muted font-mono">
                        Aucun produit ne correspond aux filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(p => {
                      const rec = getRecommendation(p);
                      const isOos = p.isOutOfStock;
                      
                      // Check if expiry is close
                      const expiry = new Date(p.expiryDate);
                      const diffMonths = (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30);
                      const isExpiryClose = diffMonths > 0 && diffMonths <= 3;
 
                      return (
                        <tr 
                          key={p.id} 
                          className={`hover:bg-brand-primary-light/30 transition-colors ${
                            isOos ? 'bg-brand-accent-light/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-brand-text-dark">{p.name}</div>
                            <div className="text-xs font-mono text-brand-text-muted flex gap-2 mt-0.5">
                              <span>Code: {p.code}</span>
                              <span>•</span>
                              <span className={isExpiryClose ? 'text-brand-accent font-semibold' : 'text-brand-text-muted'}>
                                Exp: {p.expiryDate} {isExpiryClose && '(Périme bientôt)'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono">
                            <span className={isOos ? 'text-red-600 font-bold' : 'text-brand-text-dark'}>
                              {p.stock}
                            </span>
                            <span className="text-brand-border mx-1">/</span>
                            <span className="text-brand-text-muted">{p.minStock}</span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-brand-text-muted">{p.camv}</td>
                          <td className="px-4 py-3.5 font-mono">{p.price.toFixed(3)}</td>
                          <td className="px-4 py-3.5 font-mono text-brand-primary">{p.margin}%</td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded text-xs bg-brand-primary-light border border-brand-primary/20 text-brand-primary font-medium">
                              {p.grossist}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex justify-end items-center gap-1.5">
                              {rec > 0 && (
                                <button
                                  onClick={() => handleQtyChange(p.id, rec.toString())}
                                  className="text-[10px] font-mono bg-brand-primary hover:bg-brand-primary-hover border border-brand-primary text-white px-1.5 py-0.5 rounded shadow-sm"
                                  title="Utiliser la recommandation IA basée sur la CAMV"
                                >
                                  Rec: +{rec}
                                </button>
                              )}
                              <input
                                type="number"
                                min="0"
                                value={draftQuantities[p.id] || ''}
                                placeholder="0"
                                onChange={e => handleQtyChange(p.id, e.target.value)}
                                className="w-14 bg-white border border-brand-border rounded px-1.5 py-1 text-center text-sm font-mono text-brand-text-dark placeholder-brand-text-muted focus:outline-none focus:border-brand-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Ordering Portal Widget */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-brand-border pb-3.5">
            <div>
              <h3 className="text-base font-sans font-semibold text-brand-text-dark flex items-center gap-2">
                <ShoppingCart className="text-brand-primary" size={18} />
                Console d'Approvisionnement
              </h3>
              <p className="text-[11px] text-brand-text-muted font-mono mt-0.5">Portail d'achat automatisé connecté aux grossistes</p>
            </div>
            {isOrdered && (
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-sans font-semibold flex items-center gap-1.5 shadow-sm mt-2 sm:mt-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Transmis avec succès
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1">
            {/* Column 1: Grossiste & AI Recommendation */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-brand-text-muted uppercase tracking-wider mb-2 font-medium">Choisir un Grossiste</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Cogepha', 'Medigros', 'PCT'].map(gross => (
                    <button
                      key={gross}
                      onClick={() => {
                        setSelectedGrossist(gross as any);
                        setIsOrdered(false);
                        setSaveSuccess(null);
                      }}
                      className={`py-2 rounded-lg border text-xs font-sans font-semibold transition-colors cursor-pointer shadow-sm ${
                        selectedGrossist === gross
                          ? 'bg-brand-primary border-brand-primary text-white shadow-sm'
                          : 'bg-white border-brand-border text-brand-text-muted hover:bg-brand-primary-light/50'
                      }`}
                    >
                      {gross}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAutoFill}
                className="w-full py-2.5 border border-dashed border-brand-primary text-brand-primary hover:bg-brand-primary-light hover:text-brand-primary-hover font-mono text-xs rounded-lg transition-colors cursor-pointer font-semibold shadow-sm"
              >
                Remplir avec l'IA ({selectedGrossist})
              </button>
            </div>

            {/* Column 2: Order Draft details / success text */}
            <div className="bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between h-[150px] shadow-sm">
              {!isOrdered ? (
                <>
                  <div className="font-mono text-[10px] text-brand-text-muted uppercase tracking-wider font-bold mb-1.5">Articles dans le panier :</div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {draftItems.length === 0 ? (
                      <div className="text-center py-6 text-xs font-sans text-brand-text-muted italic">
                        Aucun article en attente. Remplissez avec le bouton IA ou ajustez les quantités ci-dessus.
                      </div>
                    ) : (
                      draftItems.map(item => (
                        <div key={item.product.id} className="flex justify-between items-center text-xs font-sans text-brand-text-dark">
                          <span className="truncate max-w-[170px] font-medium">{item.product.name}</span>
                          <span className="font-mono text-brand-primary shrink-0 font-semibold">
                            {item.quantity} x {item.product.price.toFixed(3)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col justify-center h-full space-y-2 font-sans">
                  <div className="flex items-center gap-2 text-brand-primary font-semibold text-xs">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>Commande transmise avec succès !</span>
                  </div>
                  <p className="text-[10px] text-brand-text-muted leading-relaxed">
                    Le bon pour {lastCreatedOrder?.grossist} a été envoyé. Le stock local a été mis à jour de manière autonome.
                  </p>
                </div>
              )}
            </div>

            {/* Column 3: Totals & Action buttons */}
            <div className="bg-white border border-brand-border rounded-xl p-4 flex flex-col justify-between h-[150px] shadow-sm">
              {!isOrdered ? (
                <>
                  {/* Totals */}
                  <div className="space-y-1.5 font-sans">
                    <div className="flex justify-between text-xs text-brand-text-muted">
                      <span>Marge estimée :</span>
                      <span className="font-mono font-bold text-brand-primary">+{totalMargin.toFixed(3)} DT</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-brand-text-dark border-t border-brand-border pt-1.5">
                      <span>Total Commande :</span>
                      <span className="font-mono text-base text-brand-primary">{draftTotal.toFixed(3)} DT</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitOrder}
                    disabled={draftItems.length === 0}
                    className={`w-full py-2.5 rounded-lg font-sans font-semibold text-xs flex items-center justify-center gap-2 transition-colors ${
                      draftItems.length > 0
                        ? 'bg-brand-primary hover:bg-brand-primary-hover text-white cursor-pointer shadow-sm'
                        : 'bg-neutral-100 border border-neutral-200 text-neutral-400 cursor-not-allowed'
                    }`}
                  >
                    Envoyer la Commande
                    <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col justify-between h-full space-y-2">
                  {/* Google Drive exporter */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-brand-text-muted uppercase tracking-wider font-semibold">Archivage Google Drive</div>
                    {isDriveConnected ? (
                      <button
                        onClick={handleExportToDrive}
                        disabled={isSavingToDrive}
                        className="w-full py-1.5 px-3 bg-brand-surface border border-brand-border hover:bg-brand-primary-light text-brand-primary text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <CloudUpload size={13} />
                        {isSavingToDrive ? 'Sauvegarde...' : 'Sauvegarder sur Drive'}
                      </button>
                    ) : (
                      <div className="text-[10px] text-brand-accent font-mono leading-normal">
                        ⚠️ Connectez votre Drive dans l'onglet Drive pour sauvegarder le bon.
                      </div>
                    )}

                    {saveSuccess && (
                      <div className="p-1 bg-brand-primary-light border border-brand-primary/10 rounded text-[9px] font-mono text-brand-primary leading-tight font-medium truncate" title={saveSuccess}>
                        {saveSuccess}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setIsOrdered(false)}
                    className="w-full py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white border border-brand-primary text-xs font-sans font-semibold text-center cursor-pointer rounded-lg shadow-sm"
                  >
                    Nouvelle Commande
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
