/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, SensorReading, StaffShift, ChatMessage } from './types';
import DashboardOverview from './components/DashboardOverview';
import StockManager from './components/StockManager';
import ColdChain from './components/ColdChain';
import StaffScheduler from './components/StaffScheduler';
import GoogleDriveBrowser from './components/GoogleDriveBrowser';
import HermesAssistant from './components/HermesAssistant';
import Suppliers from './components/Suppliers';
import { User } from 'firebase/auth';
import { initAuth } from './lib/auth';
import { 
  LayoutDashboard, 
  Package, 
  Building2,
  Thermometer, 
  Users, 
  HardDrive, 
  ChevronRight, 
  User as UserIcon, 
  CheckCircle2, 
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [staff, setStaff] = useState<StaffShift[]>([]);
  
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(true);

  // Authentication & Google Drive states
  const [user, setUser] = useState<User | null>(null);
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // AI Assistant Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Bonjour ! Je suis Hermes, l'assistant autonome de PharmaSmart. Je suis connecté à votre ERP Avicenne dot NET, à vos capteurs thermiques IoT et à votre Google Drive.\n\nComment puis-je vous aider aujourd'hui ? Vous pouvez me demander de vérifier les ruptures de stock, de combler le trou de garde de dimanche, ou de sauvegarder un rapport d'inventaire.",
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isWaitingForModel, setIsWaitingForModel] = useState<boolean>(false);

  // Fetch initial data from Express backend on load
  useEffect(() => {
    fetchData();

    // Set up Firebase OAuth listener
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setIsDriveConnected(true);
          setAccessToken(token);
        }
      },
      () => {
        setIsDriveConnected(false);
        setAccessToken(null);
      }
    );

    // Periodically simulate small temperature fluctuations for realistic feel
    const interval = setInterval(() => {
      setSensors(prev => prev.map(s => {
        // Only fluctuate if status is normal
        if (s.status === 'Normal') {
          const delta = (Math.random() - 0.5) * 0.2;
          const newTemp = Math.min(s.maxTemp + 0.5, Math.max(s.minTemp - 0.5, s.temperature + delta));
          return { ...s, temperature: newTemp };
        }
        return s;
      }));
    }, 12000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchData = async () => {
    try {
      const resProds = await fetch('/api/products');
      const dataProds = await resProds.json();
      setProducts(dataProds);

      const resSens = await fetch('/api/sensors');
      const dataSens = await resSens.json();
      setSensors(dataSens);

      const resStaff = await fetch('/api/staff');
      const dataStaff = await resStaff.json();
      setStaff(dataStaff);
    } catch (err) {
      console.error('Error retrieving database:', err);
    }
  };

  // Google Drive generic file exporter helper
  const handleSaveToDrive = async (title: string, content: string, mimeType: string = 'text/plain'): Promise<boolean> => {
    if (!accessToken) {
      console.error('OAuth token not found');
      return false;
    }

    try {
      const boundary = '365315263232';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const metadata = {
        name: title,
        mimeType: mimeType,
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        close_delim;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      return res.ok;
    } catch (err) {
      console.error('Google Drive API Error:', err);
      return false;
    }
  };

  // Send purchase orders to backend
  const handlePlaceOrder = async (grossist: string, items: Array<{ productId: string; name: string; quantity: number; price: number }>): Promise<boolean> => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grossist, items })
      });
      if (res.ok) {
        // refresh stocks from backend
        fetchData();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error placing purchase order:', e);
      return false;
    }
  };

  // Modify staff schedule shift
  const handleUpdateShift = async (staffId: string, day: string, shift: 'Matin' | 'Après-midi' | 'Garde' | 'Repos'): Promise<boolean> => {
    const member = staff.find(s => s.id === staffId);
    if (!member) return;

    const updatedSchedule = {
      ...member.schedule,
      [day]: shift
    };

    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: updatedSchedule })
      });
      if (res.ok) {
        setStaff(prev => prev.map(s => s.id === staffId ? { ...s, schedule: updatedSchedule } : s));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error updating staff shift:', e);
      return false;
    }
  };

  // Resolve active IoT sensor alerts
  const handleResolveSensor = async (sensorId: string): Promise<boolean> => {
    // find sensor location
    const s = sensors.find(item => item.id === sensorId);
    if (!s) return;

    // Reset back to safe standard values
    const safeTemp = s.id === 's1' || s.id === 's2' ? 4.2 : 21.5;
    
    try {
      const res = await fetch(`/api/sensors/${sensorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: safeTemp,
          status: 'Normal'
        })
      });
      if (res.ok) {
        setSensors(prev => prev.map(item => item.id === sensorId ? { ...item, temperature: safeTemp, status: 'Normal' } : item));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error resolving sensor alert:', e);
      return false;
    }
  };

  // Simulate temperature drift (useful for showcasing agentic triggers!)
  const handleTriggerDriftSimulation = async () => {
    // Increase vaccine fridge to critical 9.4°C
    const sensorId = 's1';
    try {
      const res = await fetch(`/api/sensors/${sensorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: 9.4,
          status: 'Critical'
        })
      });
      if (res.ok) {
        setSensors(prev => prev.map(item => item.id === sensorId ? { ...item, temperature: 9.4, status: 'Critical' } : item));
        
        // Add reactive notification block in Hermes Assistant
        const alertMsg: ChatMessage = {
          id: `drift-${Date.now()}`,
          role: 'model',
          content: "⚠️ ALERTE CRITIQUE : Le capteur [s1] 'Réfrigérateur Principal (Vaccins)' indique une dérive de température à 9.4°C (Seuil max: 8.0°C) ! La chaîne du froid est menacée.\n\nJe vous recommande d'activer le compresseur de secours ou d'appeler l'assistance. Dites-moi 'Résous l'alerte du réfrigérateur' pour que je réinitialise le circuit électrique principal de l'officine.",
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };
        setChatHistory(prev => [...prev, alertMsg]);
        setIsAssistantOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Conversational Chat Input Trigger ---
  const handleNewUserMessage = async (messageText: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    setIsWaitingForModel(true);

    try {
      // Pass recent history and the new message to Express AI Endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: chatHistory.slice(-10).map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!res.ok) {
        throw new Error('Failure contacting server chatbot API');
      }

      const data = await res.json();
      
      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: data.text,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };

      // Handle server-proposed agentic actions
      if (data.action) {
        modelMsg.actionProposal = {
          action: data.action.action,
          title: getActionProposalTitle(data.action),
          details: data.action
        };
      }

      setChatHistory(prev => [...prev, modelMsg]);

    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: "Désolé, j'ai rencontré un problème réseau en essayant de joindre le serveur. Veuillez vérifier votre connexion et réessayez.",
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsWaitingForModel(false);
    }
  };

  const getActionProposalTitle = (action: any) => {
    switch (action.action) {
      case 'create_order':
        return `Préparer une commande pour ${action.grossist || 'le grossiste sélectionné'}`;
      case 'update_schedule':
        return `Modifier le planning de ${action.staffId || 'un membre de l'équipe'}`;
      case 'resolve_sensor':
        return `Réinitialiser l'alerte du capteur ${action.sensorId || 'concerné'}`;
      case 'generate_report':
        return `Générer et exporter le rapport ${action.reportType || 'demandé'}`;
      default:
        return 'Action proposée par Hermes';
    }
  };

  const rejectAction = (messageId: string) => {
    setChatHistory(prev => prev.map(msg => (
      msg.id === messageId
        ? { ...msg, content: `${msg.content}\n\nAction annulée par l'utilisateur.`, actionProposal: undefined }
        : msg
    )));
  };

  const approveAction = async (messageId: string) => {
    const message = chatHistory.find(msg => msg.id === messageId);
    if (!message?.actionProposal) return;
    await executeAgentAction(message.actionProposal.details, messageId);
  };

  // Interpreter loop for AI tool suggestions
  const executeAgentAction = async (action: any, messageId: string) => {
    let executedAction: ChatMessage['actionExecuted'] | null = null;
    let contentSuffix: string | null = null;

    switch (action.action) {
      case 'create_order':
        // Automate placing the draft purchase order to selected grossist
        const targetGrossist = action.grossist || 'Cogepha';
        const rawItems = action.items || [];
        
        const itemsToOrder = rawItems.map((raw: any) => {
          const prod = products.find(p => p.id === raw.productId) || products.find(p => p.name.includes(raw.productId));
          return {
            productId: prod?.id || 'p1',
            name: prod?.name || 'Inconnu',
            quantity: raw.quantity || 10,
            price: prod?.price || 15.000
          };
        });

          const orderSuccess = await handlePlaceOrder(targetGrossist, itemsToOrder);
        setActiveTab('stock');
          if (orderSuccess) {
            executedAction = {
              type: 'order',
              description: `Commande automatique de ${itemsToOrder.length} articles transmise chez le grossiste ${targetGrossist}.`,
              details: itemsToOrder
            };
          } else {
            contentSuffix = "\n\n⚠️ Erreur : la commande n'a pas pu être transmise.";
          }
        break;

      case 'update_schedule':
        // Update staff schedule dynamically
        const sId = action.staffId;
        const targetDay = action.day;
        const targetShift = action.shift; // 'Matin' | 'Après-midi' | 'Garde' | 'Repos'
        
        const scheduleSuccess = await handleUpdateShift(sId, targetDay, targetShift);
        setActiveTab('staff');

        if (scheduleSuccess) {
          const memberName = staff.find(s => s.id === sId)?.name || 'Collaborateur';
          executedAction = {
            type: 'schedule',
            description: `Changement du planning de ${memberName} le ${targetDay} en position de '${targetShift}'.`,
            details: { sId, targetDay, targetShift }
          };
        } else {
          contentSuffix = "\n\n⚠️ Erreur : la modification de planning n'a pas pu être enregistrée.";
        }
        break;

      case 'resolve_sensor':
        // Resolve sensor alarm automatically
        const targetSensorId = action.sensorId || 's1';
        const resolveSuccess = await handleResolveSensor(targetSensorId);
        setActiveTab('overview');

        if (resolveSuccess) {
          const sName = sensors.find(s => s.id === targetSensorId)?.name || 'Réfrigérateur';
          executedAction = {
            type: 'cold_chain',
            description: `Réinitialisation électrique et stabilisation du thermostat pour '${sName}'.`,
            details: { targetSensorId }
          };
        } else {
          contentSuffix = "\n\n⚠️ Erreur : le capteur n'a pas pu être réinitialisé.";
        }
        break;

      case 'generate_report':
        // Automate compilation of a report and upload to user's Google Drive
        if (!isDriveConnected) {
          contentSuffix = "\n\n⚠️ Note : Je n'ai pas pu exporter le rapport vers Google Drive car votre compte n'est pas connecté. Veuillez l'activer dans l'onglet 'Google Drive'.";
          break;
        }

        const reportType = action.reportType || 'inventory';
        const fileTitle = action.title || `PharmaSmart-Rapport-${reportType}-${Date.now()}.txt`;
        
        let reportText = `================================================\n`;
        reportText += `PHARMASMART - RAPPORT EXPORTÉ AUTOMATIQUEMENT\n`;
        reportText += `Type : ${reportType.toUpperCase()} | Date : ${new Date().toLocaleString('fr-FR')} UTC\n`;
        reportText += `================================================\n\n`;

        if (reportType === 'inventory') {
          reportText += `ÉTAT DES STOCKS DE PRODUITS :\n`;
          products.forEach(p => {
            reportText += `- ${p.name} | Stock : ${p.stock} (Seuil Min : ${p.minStock}) | Grossiste : ${p.grossist} | Statut : ${p.isOutOfStock ? 'RUPTURE' : 'Disponible'}\n`;
          });
        } else if (reportType === 'schedule') {
          reportText += `PLANNING RH DU PERSONNEL :\n`;
          staff.forEach(st => {
            reportText += `- ${st.name} (${st.role}) | Lundi : ${st.schedule['Lundi'] || 'Repos'} | Samedi : ${st.schedule['Samedi'] || 'Repos'} | Dimanche : ${st.schedule['Dimanche'] || 'Repos'}\n`;
          });
        } else if (reportType === 'cold_chain') {
          reportText += `HISTORIQUE SURVEILLANCE CHAÎNE DU FROID :\n`;
          sensors.forEach(s => {
            reportText += `- ${s.name} (${s.location}) | Température Actuelle : ${s.temperature}°C (Cible : ${s.minTemp}-${s.maxTemp}°C) | Statut : ${s.status}\n`;
          });
        }

        const uploadSuccess = await handleSaveToDrive(fileTitle, reportText);
        if (uploadSuccess) {
          executedAction = {
            type: 'drive_upload',
            description: `Le rapport '${fileTitle}' a été généré et sauvegardé directement sur votre Google Drive.`,
            details: { fileTitle }
          };
          setActiveTab('drive');
        } else {
          contentSuffix = "\n\n⚠️ Erreur : Échec du téléversement vers votre Drive.";
        }
        break;

      default:
        console.warn('Unknown action proposed by LLM:', action);
    }

    if (executedAction || contentSuffix) {
      setChatHistory(prev => prev.map(msg => (
        msg.id === messageId
          ? { ...msg, content: contentSuffix ? `${msg.content}${contentSuffix}` : msg.content, actionExecuted: executedAction || undefined, actionProposal: undefined }
          : msg
      )));
    }
  };

  const navItems = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'stock', label: 'Stocks & ERP', icon: Package },
    { id: 'suppliers', label: 'Fournisseurs', icon: Building2 },
    { id: 'cold', label: 'Chaîne du froid', icon: Thermometer },
    { id: 'staff', label: 'Équipe & Plannings', icon: Users },
    { id: 'drive', label: 'Rapports Google Drive', icon: HardDrive },
  ];

  return (
    <div className="h-screen bg-brand-bg flex flex-col font-sans text-brand-text-dark overflow-hidden">
      
      {/* Top Mobile Bar */}
      <div className="lg:hidden bg-brand-surface border-b border-brand-border p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-lg text-brand-text-dark tracking-tight">PharmaSmart</span>
          <span className="text-[10px] bg-brand-primary-light border border-brand-primary/30 font-mono text-brand-primary px-1.5 py-0.5 rounded uppercase">V2</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            className="p-2 bg-brand-surface border border-brand-border rounded-lg text-brand-primary text-xs font-mono hover:bg-brand-primary-light/50"
          >
            Hermes Chat
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-brand-surface border border-brand-border rounded-lg text-brand-primary hover:bg-brand-primary-light/50"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Main Full-Width Container Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Navigation Sidebar */}
        <div className={`fixed inset-y-0 left-0 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 transition-transform duration-300 bg-brand-surface border-r border-brand-border w-64 p-5 flex flex-col justify-between shrink-0 z-30 lg:z-0`}>
          
          <div className="space-y-6">
            {/* App Brand Logo */}
            <div className="hidden lg:flex items-center gap-2.5">
              <div className="h-8.5 w-8.5 bg-brand-primary rounded-lg border border-brand-primary-hover flex items-center justify-center font-display font-bold text-white text-base shadow-sm">
                P
              </div>
              <div>
                <span className="font-display font-bold text-xl text-brand-text-dark tracking-tight">PharmaSmart</span>
                <span className="block text-[10px] font-mono text-brand-text-muted mt-0.5">Automate Or Die 2026</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false); // auto close on mobile
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-sans font-medium transition-colors ${
                      activeTab === item.id
                        ? 'bg-brand-primary text-white border-l-2 border-brand-primary shadow-sm'
                        : 'text-brand-text-muted hover:text-brand-text-dark hover:bg-brand-primary-light/50'
                    }`}
                  >
                    <Icon size={17} className={activeTab === item.id ? 'text-white' : 'text-brand-primary/70'} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Sign-In/Drive Status Indicator Footer */}
          <div className="space-y-3 pt-5 border-t border-brand-border">
            <div className="bg-brand-card border border-brand-border rounded-lg p-3">
              <div className="flex gap-2 items-center text-xs font-sans">
                {user ? (
                  <>
                    <img src={user.photoURL || undefined} className="h-6 w-6 rounded-full object-cover" />
                    <div className="min-w-0">
                      <div className="text-brand-text-dark font-semibold truncate">{user.displayName}</div>
                      <div className="text-[10px] font-mono text-brand-primary truncate font-medium">Connecté</div>
                    </div>
                  </>
                ) : (
                  <>
                    <UserIcon size={16} className="text-brand-text-muted shrink-0" />
                    <div className="min-w-0">
                      <div className="text-brand-text-muted font-semibold">Espace Déconnecté</div>
                      <div className="text-[10px] font-mono text-brand-text-muted truncate">Cliquez sur Drive pour connecter</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="text-center font-mono text-[9px] text-brand-text-muted">
              PharmaSmart S.A. • Salle 205
            </div>
          </div>
        </div>

        {/* Backdrop for mobile navigation */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-20"
          />
        )}

        {/* Central Content Panel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-brand-bg scrollbar-thin scrollbar-thumb-brand-border">
          
          {/* Active component view router */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'overview' && (
                <DashboardOverview
                  products={products}
                  sensors={sensors}
                  staff={staff}
                  onTabChange={setActiveTab}
                  onSimulateDrift={handleTriggerDriftSimulation}
                />
              )}
              {activeTab === 'stock' && (
                <StockManager
                  products={products}
                  onPlaceOrder={handlePlaceOrder}
                  onSaveToDrive={handleSaveToDrive}
                  isDriveConnected={isDriveConnected}
                />
              )}
              {activeTab === 'suppliers' && (
                <Suppliers />
              )}
              {activeTab === 'cold' && (
                <ColdChain
                  sensors={sensors}
                  onResolveSensor={handleResolveSensor}
                  onSaveToDrive={handleSaveToDrive}
                  isDriveConnected={isDriveConnected}
                />
              )}
              {activeTab === 'staff' && (
                <StaffScheduler
                  staff={staff}
                  onUpdateShift={handleUpdateShift}
                  onSaveToDrive={handleSaveToDrive}
                  isDriveConnected={isDriveConnected}
                />
              )}
              {activeTab === 'drive' && (
                <GoogleDriveBrowser
                  onConnectionChange={(connected, token) => {
                    setIsDriveConnected(connected);
                    setAccessToken(token);
                  }}
                  user={user}
                  onUserChange={setUser}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right Collapsible AI Assistant Hermes Area */}
        <div className={`fixed inset-y-0 right-0 transform lg:relative lg:translate-x-0 lg:h-full ${
          isAssistantOpen ? 'translate-x-0' : 'translate-x-full'
        } transition-transform duration-300 w-80 lg:w-96 bg-brand-surface p-4 shrink-0 z-30 lg:z-0 flex flex-col justify-between border-l border-brand-border`}>
          
          <div className="flex-1 h-full overflow-hidden">
            <HermesAssistant
              onNewUserMessage={handleNewUserMessage}
              onApproveAction={approveAction}
              onRejectAction={rejectAction}
              chatHistory={chatHistory}
              isWaitingForModel={isWaitingForModel}
              onSaveToDrive={handleSaveToDrive}
              isDriveConnected={isDriveConnected}
            />
          </div>

          {/* Close button inside mobile assistant */}
          <button
            onClick={() => setIsAssistantOpen(false)}
            className="lg:hidden absolute top-7 left-[-35px] h-10 w-10 bg-brand-surface border border-brand-border border-r-0 rounded-l-lg flex items-center justify-center text-brand-primary shadow-sm"
          >
            <ChevronRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
