import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, Mic, Sparkles, Volume2, Square, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HermesAssistantProps {
  readonly onNewUserMessage: (text: string) => void;
  readonly onApproveAction: (messageId: string) => void;
  readonly onRejectAction: (messageId: string) => void;
  readonly chatHistory: ChatMessage[];
  readonly isWaitingForModel: boolean;
  readonly onSaveToDrive: (title: string, content: string) => Promise<boolean>;
  readonly isDriveConnected: boolean;
}

const SUGGESTIONS = [
  "Qu'est-ce qui est en rupture ?",
  "Génère le bon de commande Cogepha",
  "Qui est de garde ce weekend ?",
  "Simule une alerte de température",
  "Il y a un trou de garde dimanche ?"
];

const WAVEFORM_BARS = [
  { id: 'bar-1', height: 1 },
  { id: 'bar-2', height: 2 },
  { id: 'bar-3', height: 3 },
  { id: 'bar-4', height: 4 },
  { id: 'bar-5', height: 5 },
  { id: 'bar-6', height: 4 },
  { id: 'bar-7', height: 3 },
  { id: 'bar-8', height: 2 },
  { id: 'bar-9', height: 1 },
  { id: 'bar-10', height: 2 },
  { id: 'bar-11', height: 3 },
  { id: 'bar-12', height: 4 },
  { id: 'bar-13', height: 5 },
  { id: 'bar-14', height: 4 },
  { id: 'bar-15', height: 3 },
  { id: 'bar-16', height: 2 },
  { id: 'bar-17', height: 1 }
];

export default function HermesAssistant({
  onNewUserMessage,
  onApproveAction,
  onRejectAction,
  chatHistory,
  isWaitingForModel,
  onSaveToDrive,
  isDriveConnected
}: HermesAssistantProps) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isWaitingForModel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onNewUserMessage(inputText.trim());
    setInputText('');
  };

  const handleSuggestionClick = (sug: string) => {
    onNewUserMessage(sug);
  };

  // Simulated Voice Input
  const startRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    clearInterval(recordingTimerRef.current);
    
    // Auto translate simulated speech to realistic user messages based on duration or random
    const speechChoices = [
      "Qu'est-ce qui est actuellement en rupture de stock dans l'officine ?",
      "Affiche-moi le planning de Nidhal Gharbi pour cette semaine s'il te plaît",
      "Génère un bon de commande automatisé pour le grossiste Cogepha",
      "Est-ce que tous les frigos à vaccins respectent la chaîne du froid ?"
    ];
    
    const randomSpeech = speechChoices[recordingDuration % speechChoices.length];
    onNewUserMessage(randomSpeech);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-sm relative">
      {/* Header */}
      <div className="p-4 bg-brand-surface border-b border-brand-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-brand-primary flex items-center justify-center text-white border border-brand-primary/20 font-sans font-bold text-sm tracking-wider shadow-sm">
              H
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-brand-primary border border-white"></span>
          </div>
          <div>
            <div className="font-sans font-semibold text-sm text-brand-text-dark">Assistant Hermes</div>
            <div className="text-[10px] font-mono text-brand-text-muted">Agent Autonome PharmaSmart</div>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] bg-white border border-brand-border px-2 py-1 rounded text-brand-text-muted font-medium">
          <Sparkles size={11} className="text-brand-primary" />
          GPT-3.5 FL
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {chatHistory.length === 0 && (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-4">
            <div className="h-14 w-14 rounded-full bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary animate-bounce shadow-sm">
              <Sparkles size={24} />
            </div>
            <div className="max-w-xs space-y-1">
              <h4 className="text-sm font-sans font-medium text-brand-text-dark">Parlez à votre Pharmacie</h4>
              <p className="text-[11px] text-brand-text-muted font-sans leading-normal">
                Posez des questions en langage naturel à l'agent Hermes sur vos stocks, la chaîne du froid, vos plannings ou Google Drive.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {chatHistory.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed font-sans shadow-sm ${
                msg.role === 'user'
                  ? 'bg-brand-primary text-white rounded-br-none'
                  : 'bg-white border border-brand-border text-brand-text-dark rounded-bl-none'
              }`}>
                {/* Speech text */}
                <p className="whitespace-pre-line">{msg.content}</p>

                {/* Simulated voice badge */}
                {msg.isAudio && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] font-mono text-brand-primary bg-brand-primary-light px-1.5 py-0.5 rounded border border-brand-primary/10 w-fit font-medium">
                    <Volume2 size={10} /> Message vocal décodé
                  </div>
                )}

                {/* Display executed agentic actions */}
                {msg.actionExecuted && (
                  <div className="mt-2.5 pt-2 border-t border-brand-border space-y-1.5 font-sans">
                    <div className="text-[10px] font-mono text-brand-primary uppercase tracking-wide flex items-center gap-1 font-bold">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                      Action exécutée par Hermes :
                    </div>
                    <div className="p-2 bg-brand-surface rounded border border-brand-border text-xs text-brand-text-muted">
                      <strong>{msg.actionExecuted.description}</strong>
                    </div>
                  </div>
                )}

                {msg.actionProposal && (
                  <div className="mt-2.5 pt-3 border-t border-brand-border space-y-3 font-sans">
                    <div className="text-[10px] font-mono text-brand-alert uppercase tracking-wide flex items-center gap-1 font-bold">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-alert animate-pulse" />
                      Action en attente de validation
                    </div>
                    <div className="rounded-2xl border border-brand-border bg-brand-surface p-3 space-y-2">
                      <div className="text-sm font-semibold text-brand-text-dark">{msg.actionProposal.title}</div>
                      <div className="grid grid-cols-1 gap-2 text-[11px] font-mono text-brand-text-muted">
                        {msg.actionProposal.details?.grossist && (
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-white border border-brand-border px-3 py-2">
                            <span>Grossiste</span>
                            <span className="text-brand-text-dark font-semibold">{msg.actionProposal.details.grossist}</span>
                          </div>
                        )}
                        {msg.actionProposal.details?.items && (
                          <div className="rounded-lg bg-white border border-brand-border px-3 py-2">
                            <div className="mb-2 text-brand-text-dark font-semibold">Articles proposés</div>
                            <div className="space-y-1">
                              {msg.actionProposal.details.items.map((item: any) => (
                                <div key={`${item.productId}-${item.name}`} className="flex items-center justify-between gap-3">
                                  <span className="truncate">{item.name}</span>
                                  <span className="text-brand-text-dark font-semibold">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {msg.actionProposal.details?.day && (
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-white border border-brand-border px-3 py-2">
                            <span>Jour</span>
                            <span className="text-brand-text-dark font-semibold">{msg.actionProposal.details.day}</span>
                          </div>
                        )}
                        {msg.actionProposal.details?.shift && (
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-white border border-brand-border px-3 py-2">
                            <span>Shift</span>
                            <span className="text-brand-text-dark font-semibold">{msg.actionProposal.details.shift}</span>
                          </div>
                        )}
                        {msg.actionProposal.details?.sensorId && (
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-white border border-brand-border px-3 py-2">
                            <span>Capteur</span>
                            <span className="text-brand-text-dark font-semibold">{msg.actionProposal.details.sensorId}</span>
                          </div>
                        )}
                        {msg.actionProposal.details?.reportType && (
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-white border border-brand-border px-3 py-2">
                            <span>Rapport</span>
                            <span className="text-brand-text-dark font-semibold">{msg.actionProposal.details.reportType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => onApproveAction(msg.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-[11px] font-semibold hover:bg-brand-primary-hover transition-colors shadow-sm"
                      >
                        <CheckCircle2 size={12} />
                        Confirmer
                      </button>
                      <button
                        onClick={() => onRejectAction(msg.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-border text-[11px] font-semibold text-brand-text-muted hover:bg-brand-primary-light/50 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isWaitingForModel && (
          <div className="flex justify-start">
            <div className="bg-white border border-brand-border rounded-2xl rounded-bl-none px-4 py-3 text-sm text-brand-text-muted flex items-center gap-2 shadow-sm">
              <span className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce"></span>
              </span>
              Hermes réfléchit...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggestion prompt chips when chat is active */}
      {chatHistory.length > 0 && (
        <div className="px-4 py-2 border-t border-brand-border flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth bg-brand-surface">
          {SUGGESTIONS.map((sug, i) => (
            <button
              key={sug}
              onClick={() => handleSuggestionClick(sug)}
              className="text-[11px] font-mono bg-white border border-brand-border hover:bg-brand-primary-light text-brand-text-muted hover:text-brand-primary px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Voice Recorder Overlay */}
      {isRecording && (
        <div className="absolute inset-x-0 bottom-0 top-14 bg-white/95 flex flex-col justify-center items-center text-center p-6 space-y-6 z-20">
          <div className="space-y-1">
            <div className="text-brand-accent font-mono text-sm uppercase tracking-widest font-bold">Enregistrement vocal actif</div>
            <div className="text-4xl font-mono text-brand-text-dark font-bold">{formatDuration(recordingDuration)}</div>
          </div>

          {/* Soundwave animated bar */}
          <div className="flex items-center justify-center gap-1.5 h-12 w-full">
            {WAVEFORM_BARS.map((bar, index) => (
              <motion.div
                key={bar.id}
                animate={{
                  height: [12, bar.height * 8, 12]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: index * 0.05
                }}
                className="w-1 bg-brand-primary rounded-full"
              />
            ))}
          </div>

          <button
            onClick={stopRecording}
            className="h-16 w-16 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white border border-red-500 shadow-md cursor-pointer"
          >
            <Square size={22} fill="white" />
          </button>
          <div className="text-xs text-brand-text-muted font-sans">
            L'agent Hermes convertira de manière autonome votre voix en actions ERP.
          </div>
        </div>
      )}

      {/* Text Input Footer Form */}
      <div className="p-4 bg-brand-surface border-t border-brand-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          {/* Simulated Mic button */}
          <button
            type="button"
            onClick={startRecording}
            className="p-2.5 bg-white hover:bg-brand-primary-light text-brand-primary rounded-xl border border-brand-border flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-sm"
            title="Parler à l'officine (Vocal)"
          >
            <Mic size={18} />
          </button>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Écrivez un message ou posez une question..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="w-full bg-white border border-brand-border rounded-xl pl-4 pr-10 py-2.5 text-sm text-brand-text-dark placeholder-brand-text-muted focus:outline-none focus:border-brand-primary font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`absolute right-2.5 top-2.5 p-1 rounded-lg text-brand-primary hover:bg-brand-primary-light/50 transition-colors ${
                inputText.trim() ? 'opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
              }`}
            >
              <Send size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
