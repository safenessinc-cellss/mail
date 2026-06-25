/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Domain, EmailAlias, EmailMessage, EmailAttachment } from '../types';
import { 
  Mail, 
  Send, 
  Inbox, 
  FileText, 
  AlertOctagon, 
  Trash2, 
  Search, 
  Plus, 
  Sparkles, 
  Loader2, 
  CornerUpLeft, 
  Paperclip, 
  Download, 
  X, 
  RefreshCw,
  Star,
  CheckCircle2,
  Filter,
  Check,
  ChevronRight,
  AlertCircle,
  Database,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WebmailClientProps {
  domain: Domain | null;
  aliases: EmailAlias[];
  messages: EmailMessage[];
  onSendMessage: (msg: Omit<EmailMessage, 'id' | 'createdAt' | 'ownerId'>) => Promise<void>;
  onReceiveSimulatedMessage: (msg: Omit<EmailMessage, 'id' | 'createdAt' | 'ownerId'>) => Promise<void>;
  onDeleteMessage: (msgId: string) => Promise<void>;
  onMarkRead: (msgId: string, read: boolean) => Promise<void>;
  storageUsedBytes: number;
  onSyncIMAP?: (aliasAddress: string) => Promise<void>;
}

// ============================================
// NUEVO: Hook para cargar correos del webhook
// ============================================

function useWebhookInbox() {
  const [webhookEmails, setWebhookEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/mail/inbox');
      const data = await response.json();
      
      if (data.success) {
        setWebhookEmails(data.emails || []);
      } else {
        setError(data.error || 'Error al cargar correos');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar al montar el componente
  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Refrescar cada 30 segundos
  useEffect(() => {
    const interval = setInterval(loadEmails, 30000);
    return () => clearInterval(interval);
  }, [loadEmails]);

  return { webhookEmails, loading, error, refresh: loadEmails };
}

export default function WebmailClient({
  domain,
  aliases,
  messages,
  onSendMessage,
  onReceiveSimulatedMessage,
  onDeleteMessage,
  onMarkRead,
  storageUsedBytes,
  onSyncIMAP
}: WebmailClientProps) {
  // ============================================
  // NUEVO: Integración con webhook
  // ============================================
  const { webhookEmails, loading: webhookLoading, error: webhookError, refresh: refreshWebhook } = useWebhookInbox();

  // Navigation folders state
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts' | 'spam' | 'trash'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'attachments'>('all');

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [senderAliasAddress, setSenderAliasAddress] = useState(aliases[0]?.address || '');
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState<EmailAttachment[]>([]);
  
  // Inbound mail simulator state
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simSenderEmail, setSimSenderEmail] = useState('elon.musk@x.com');
  const [simSenderName, setSimSenderName] = useState('Elon Musk');
  const [simRecipientAlias, setSimRecipientAlias] = useState(aliases[0]?.address || '');
  const [simSubject, setSimSubject] = useState('Integrar FreeMail Hub dentro de X.com');
  const [simBody, setSimBody] = useState('Hola,\n\nEstoy realmente impresionado por la fluidez de este portal DNS y webmail. Me gustaría discutir la posibilidad de integrar este sistema dentro de nuestra suite para creadores en X.\n\n¿Tienes disponibilidad para una videollamada de 15 minutos esta semana?\n\nSaludos,\nElon');
  const [simulating, setSimulating] = useState(false);

  // AI draft states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'formal' | 'casual' | 'marketing'>('professional');
  const [aiLoading, setAiLoading] = useState(false);

  // ============================================
  // NUEVO: Convertir correos del webhook al formato de EmailMessage
  // ============================================
  const webhookMessages: EmailMessage[] = useMemo(() => {
    return webhookEmails.map((email: any) => ({
      id: email.id || `webhook_${Date.now()}_${Math.random()}`,
      aliasId: '',
      aliasAddress: email.to || 'hola@coach-iso.eu',
      fromName: email.from?.split('@')[0] || 'Remitente',
      fromAddress: email.from || 'unknown@domain.com',
      toAddress: email.to || 'hola@coach-iso.eu',
      subject: email.subject || '(Sin Asunto)',
      body: email.html || email.text || '',
      folder: 'inbox',
      read: false,
      createdAt: email.receivedAt || email.createdAt || new Date().toISOString(),
      attachments: email.attachments || []
    }));
  }, [webhookEmails]);

  // ============================================
  // NUEVO: Combinar mensajes locales con webhook
  // ============================================
  const allMessages = useMemo(() => {
    // Si hay mensajes del webhook, usarlos (evitar duplicados)
    if (webhookMessages.length > 0) {
      return webhookMessages;
    }
    return messages;
  }, [messages, webhookMessages]);

  // Update dropdown defaults if aliases bound
  useMemo(() => {
    if (aliases.length > 0 && !aliases.some(a => a.address === senderAliasAddress)) {
      setSenderAliasAddress(aliases[0].address);
    }
    if (aliases.length > 0 && !aliases.some(a => a.address === simRecipientAlias)) {
      setSimRecipientAlias(aliases[0].address);
    }
  }, [aliases]);

  // Folder and Search and Filter Type Calculations
  const filteredMessages = useMemo(() => {
    let folderMsgs = allMessages.filter(m => m.folder === activeFolder);
    
    // Quick filter classification
    if (filterType === 'unread') {
      folderMsgs = folderMsgs.filter(m => !m.read);
    } else if (filterType === 'attachments') {
      folderMsgs = folderMsgs.filter(m => m.attachments && m.attachments.length > 0);
    }

    if (!searchQuery.trim()) return folderMsgs;

    const query = searchQuery.toLowerCase();
    return folderMsgs.filter(m => 
      m.subject.toLowerCase().includes(query) ||
      m.body.toLowerCase().includes(query) ||
      m.fromAddress.toLowerCase().includes(query) ||
      m.fromName.toLowerCase().includes(query) ||
      m.toAddress.toLowerCase().includes(query)
    );
  }, [allMessages, activeFolder, searchQuery, filterType]);

  // Unread metrics
  const unreadCount = useMemo(() => {
    return allMessages.filter(m => m.folder === 'inbox' && !m.read).length;
  }, [allMessages]);

  // ============================================
  // NUEVO: Sincronizar con webhook manualmente
  // ============================================
  const handleManualSync = useCallback(async () => {
    await refreshWebhook();
  }, [refreshWebhook]);

  // Handle viewing message details
  const handleSelectMessage = (msg: EmailMessage) => {
    setSelectedMessage(msg);
    if (!msg.read) {
      onMarkRead(msg.id, true);
    }
  };

  // Convert files to base64
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const limitInBytes = 10 * 1024 * 1024; // 10MB
    const file = files[0];

    if (file.size > limitInBytes) {
      alert("El archivo excede el límite permitido de 10 MB para adjuntos.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const newAttachment: EmailAttachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        content: result
      };
      setComposeAttachments(prev => [...prev, newAttachment]);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (index: number) => {
    setComposeAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Download attachment
  const triggerAttachmentDownload = (attach: EmailAttachment) => {
    try {
      const link = document.createElement("a");
      link.href = attach.content;
      link.download = attach.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Error downloading attachment:", err);
    }
  };

  // Trigger Gemini Draft API
  const handleGenerateAIDraft = async () => {
    if (!aiPrompt.trim()) {
      alert("Ingresa una instrucción para que la Inteligencia IA te asista.");
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          currentSubject: composeSubject,
          currentBody: composeBody,
          tone: aiTone
        })
      });

      const responseText = await response.text();
      let data: any = {};
      let isParseError = false;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        isParseError = true;
      }

      if (response.ok) {
        if (!isParseError) {
          setComposeSubject(data.subject || composeSubject);
          setComposeBody(data.body || data.text || responseText);
        } else {
          setComposeBody(responseText);
        }
        setAiPrompt('');
      } else {
        const errorMsg = isParseError 
          ? (responseText.slice(0, 250) + (responseText.length > 250 ? "..." : ""))
          : (data.error || "Ocurrió un error al contactar al asistente AI.");
        alert("Error de la IA: " + errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error al conectar con la IA: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Quick helper to prefill AI prompt via chips
  const applyQuickPrompt = (prompt: string) => {
    setAiPrompt(prompt);
  };

  // Sending email
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim()) {
      alert("Introduce la dirección de correo del destinatario.");
      return;
    }

    const matchingAlias = aliases.find(a => a.address === senderAliasAddress);
    
    await onSendMessage({
      aliasId: matchingAlias?.id || '',
      aliasAddress: senderAliasAddress,
      fromName: "Yo (" + (matchingAlias?.localPart || "Alias") + ")",
      fromAddress: senderAliasAddress,
      toAddress: composeTo.trim().toLowerCase(),
      subject: composeSubject.trim() || "(Sin Asunto)",
      body: composeBody,
      folder: 'sent',
      read: true,
      attachments: composeAttachments
    });

    // Reset fields
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setComposeAttachments([]);
    setIsComposeOpen(false);
  };

  // Inbound Simulation
  const handleTriggerSimulateReceive = async () => {
    if (!simSenderEmail.trim() || !simRecipientAlias) {
      alert("Para simular, introduce un correo emisor y escoge uno de tus aliases de destino.");
      return;
    }

    setSimulating(true);

    try {
      await onReceiveSimulatedMessage({
        aliasId: aliases.find(a => a.address === simRecipientAlias)?.id || '',
        aliasAddress: simRecipientAlias,
        fromName: simSenderName,
        fromAddress: simSenderEmail.trim().toLowerCase(),
        toAddress: simRecipientAlias,
        subject: simSubject.trim() || "(Sin Asunto)",
        body: simBody,
        folder: 'inbox',
        read: false
      });
      // Refrescar webhook después de simular
      await refreshWebhook();
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulating(false);
      setSimulatorOpen(false);
      setActiveFolder('inbox');
    }
  };

  const getDiskUsageInMB = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  // AI Prompt Templates Chips
  const promptTemplates = [
    { label: "🤝 Alianza", prompt: "Agradecer contacto y programar una videoconferencia de negocios para analizar oportunidades de alianza el próximo viernes en la tarde." },
    { label: "💼 Propuesta", prompt: "Redactar una respuesta formal presentando nuestros servicios tecnológicos en la nube, detallando flexibilidad de integración y solicitando una reunión técnica." },
    { label: "✍️ Responder Hola", prompt: "Saludar cordialmente de forma casual, agradecer su interés en nuestro dominio web y ponerme a su entera disposición para cualquier duda." },
    { label: "💡 Soporte", prompt: "Responder amablemente aclarando que el área de ingeniería ya está revisando el incidente de red DNS y que daremos respuesta en un lapso menor de 2 horas." }
  ];

  return (
    <div className="space-y-6 select-none font-sans">
      {/* 1. Header/Toolbar - Futuristic Dashboard Header */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/95 to-slate-950/90 dark:from-slate-950 dark:via-zinc-950 dark:to-slate-950 border border-slate-800 p-5 rounded-3xl flex flex-col xl:flex-row items-center justify-between gap-5 shadow-[0_4px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl relative overflow-hidden">
        {/* Glow decorative graphics */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-4 w-full xl:w-auto relative z-10">
          <div className="bg-linear-to-br from-indigo-550 to-blue-600 dark:from-indigo-600 dark:to-cyan-500 p-3 rounded-2xl text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] shrink-0">
            <Mail className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-display tracking-tight">Centro de Webmail Satélite</h2>
              <span className="hidden sm:inline bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full tracking-wider">
                Motor v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-light leading-snug">
              Administra múltiples terminales de correo corporativo bajo tu propio dominio con resolución segura.
            </p>
          </div>
        </div>

        {/* Diagnostic Telemetries & Quick Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4 w-full xl:w-auto relative z-10">
          
          {/* Circular/Minimal Storage gauge */}
          <div className="bg-slate-800/40 dark:bg-zinc-900/50 border border-slate-800/85 px-4 py-2 rounded-2xl flex items-center gap-3">
            <Database className="h-4 w-4 text-cyan-400 shrink-0" />
            <div className="text-left">
              <span className="text-[9px] text-slate-400 font-mono block uppercase tracking-wider">Núcleo Almacenamiento</span>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-20 bg-slate-750 dark:bg-black rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full" 
                    style={{ width: `${Math.min(100, (storageUsedBytes / (1024 * 1024 * 1024)) * 100)}%` }} 
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-200">
                  {getDiskUsageInMB(storageUsedBytes)} MB
                </span>
              </div>
            </div>
          </div>

          {/* ============================================
              NUEVO: Botón de sincronización con webhook
              ============================================ */}
          <button
            id="btn-sync-webhook"
            onClick={handleManualSync}
            disabled={webhookLoading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center py-2 px-4 bg-emerald-550/15 hover:bg-emerald-550/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 rounded-2xl text-xs font-semibold cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-[0.98] disabled:opacity-50"
          >
            {webhookLoading ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
            )}
            Sincronizar Bandeja
          </button>

          {/* Interactive buttons */}
          {aliases.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-open-simulator"
                onClick={() => setSimulatorOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center py-2 px-4 bg-indigo-550/15 hover:bg-indigo-550/25 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-2xl text-xs font-semibold cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-[0_0_15px_rgba(99,102,241,0.1)] active:scale-[0.98]"
              >
                <Sparkles className="h-3.5 w-3.5 mr-2 text-indigo-400 animate-pulse" /> Simular Recibido
              </button>

              {onSyncIMAP && (() => {
                const activeAlias = aliases.find(a => a.address === senderAliasAddress);
                const imapServerLabel = activeAlias?.imapHost ? activeAlias.imapHost : "IMAP";
                return (
                  <button
                    id="btn-trigger-sync-imap"
                    onClick={() => onSyncIMAP(senderAliasAddress)}
                    aria-label="Sincronizar buzón de correo vía IMAP"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center py-2 px-4 bg-emerald-550/10 hover:bg-emerald-550/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-semibold cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-2 text-emerald-400" /> Sincronizar {imapServerLabel}
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ============================================
          NUEVO: Indicador de estado del webhook
          ============================================ */}
      {webhookError && (
        <div className="bg-red-950/20 border border-red-500/30 p-3 rounded-2xl flex items-center gap-3 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Error al sincronizar con el webhook: {webhookError}</span>
          <button 
            onClick={handleManualSync}
            className="ml-auto px-3 py-1 bg-red-950/40 hover:bg-red-950/60 rounded-xl text-red-300 transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {webhookLoading && (
        <div className="bg-indigo-950/20 border border-indigo-500/30 p-3 rounded-2xl flex items-center gap-3 text-xs text-indigo-400">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Sincronizando bandeja de entrada...</span>
        </div>
      )}

      {aliases.length === 0 ? (
        /* Empty accounts trigger screen */
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center max-w-xl mx-auto space-y-5 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Mail className="h-8 w-8 text-indigo-500 stroke-[1.5]" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">Crea un alias para habilitar el buzón</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-light leading-relaxed">
            Para comenzar a operar con el buzón interactivo, primero debes aprovisionar una terminal de correo. Por favor, dirígete a la pestaña de <strong className="font-semibold text-blue-600 dark:text-indigo-400">"Buzones y Aliases"</strong> y crea tu primera cuenta tal como <code className="bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 px-1.5 py-0.5 rounded text-indigo-500 dark:text-indigo-400 font-mono text-[11px]">contacto@{domain?.domainName || "tudominio.com"}</code>.
          </p>
        </motion.div>
      ) : (
        /* Modernized Futuristic Tri-pane Layout Split Panel */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[620px]">
          
          {/* PANEL 1: SIDEBAR DIRECTORIES COLUMN (3 cols) */}
          <div className="lg:col-span-3 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl flex flex-col justify-between gap-5 shadow-xs relative overflow-hidden">
            <div className="space-y-5">
              {/* Floating Trigger button */}
              <motion.button
                id="btn-compose-mail"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsComposeOpen(true)}
                className="w-full inline-flex items-center justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-[0_4px_15px_rgba(99,102,241,0.3)] transition cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2 stroke-[2.5]" /> Redactar Mensaje
              </motion.button>

              {/* Directories Tree */}
              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 block mb-2 px-1">Directorios</span>
                <nav className="space-y-1">
                  {[
                    { id: 'inbox', label: 'Bandeja de Entrada', icon: <Inbox className="h-4 w-4" />, color: 'text-blue-500' },
                    { id: 'sent', label: 'Enviados', icon: <Send className="h-4 w-4" />, color: 'text-emerald-500' },
                    { id: 'drafts', label: 'Borradores', icon: <FileText className="h-4 w-4" />, color: 'text-amber-500' },
                    { id: 'spam', label: 'Filtro de Spam', icon: <AlertOctagon className="h-4 w-4" />, color: 'text-rose-500' },
                    { id: 'trash', label: 'Papelera', icon: <Trash2 className="h-4 w-4" />, color: 'text-slate-500' }
                  ].map((folder) => {
                    const isSelected = activeFolder === folder.id;
                    const count = folder.id === 'inbox' ? unreadCount : 0;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setActiveFolder(folder.id as any);
                          setSelectedMessage(null);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer relative ${
                          isSelected
                            ? 'bg-indigo-50/70 hover:bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold border-l-2 border-indigo-550 dark:border-indigo-400 pl-3'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-950/40 dark:hover:text-slate-200 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className={`${isSelected ? 'text-indigo-600 dark:text-indigo-400' : folder.color}`}>
                            {folder.icon}
                          </span>
                          <span>{folder.label}</span>
                        </div>
                        {count > 0 && (
                          <span className="bg-indigo-600 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Micro Cybernetic health metrics */}
            <div className="border-t border-slate-150 dark:border-slate-850/80 pt-4 px-1 text-left hidden lg:block">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>ESTADO CONEXIÓN</span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" /> ONLINE
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
                <span>CANAL SEGURO</span>
                <span className="text-indigo-400 font-bold">TLS v1.3</span>
              </div>
            </div>
          </div>

          {/* PANEL 2: MIDDLE SELECTION LIST COLUMN (4 cols) */}
          <div className="lg:col-span-4 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-3xl flex flex-col h-[620px] overflow-hidden shadow-xs">
            
            {/* Search inputs and tabs filters */}
            <div className="p-4 border-b border-slate-200/60 dark:border-slate-850 space-y-3 bg-white/40 dark:bg-transparent">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="search-mails"
                  type="text"
                  placeholder="Filtrar por remitente, asunto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                    title="Limpiar búsqueda"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Futuristic Quick filter sub-tabs */}
              <div className="flex items-center gap-1 border-t border-slate-100 dark:border-slate-850/50 pt-2 text-[10px]">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'unread', label: 'No leídos' },
                  { id: 'attachments', label: 'Con adjuntos' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg font-mono font-medium border transition cursor-pointer ${
                      filterType === tab.id
                        ? 'bg-slate-900 text-white border-transparent dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/20'
                        : 'bg-transparent text-slate-450 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable mail items list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 select-none">
              <AnimatePresence mode="popLayout">
                {webhookLoading && filteredMessages.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-16 px-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="font-medium text-slate-500 dark:text-slate-450">Cargando correos...</p>
                  </motion.div>
                ) : filteredMessages.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-16 px-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3"
                  >
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                      <Mail className="h-6 w-6 stroke-[1.2] text-slate-350 dark:text-slate-650" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-500 dark:text-slate-450">Sin registros</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-light mt-0.5">No hay correos para {activeFolder}.</p>
                    </div>
                  </motion.div>
                ) : (
                  filteredMessages.map((msg, index) => (
                    <motion.button
                      layout="position"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
                      key={msg.id}
                      onClick={() => handleSelectMessage(msg)}
                      className={`w-full text-left p-4 transition outline-none block relative hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 ${
                        selectedMessage?.id === msg.id 
                          ? 'bg-slate-50/90 dark:bg-slate-950/30 shadow-[inset_3px_0_0_0_rgba(99,102,241,1)]' 
                          : ''
                      } ${
                        !msg.read && msg.folder === 'inbox' 
                          ? 'font-semibold text-slate-900 dark:text-white' 
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {/* Neon unread blue dot indicators */}
                      {!msg.read && msg.folder === 'inbox' && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-550 dark:bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                      )}

                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold truncate max-w-[130px] text-slate-900 dark:text-slate-200" title={msg.fromAddress}>
                          {msg.fromName || msg.fromAddress}
                        </span>
                        <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                          {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold truncate max-w-[200px] mt-1 pr-6 text-slate-800 dark:text-zinc-200">{msg.subject}</h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-450 line-clamp-2 mt-1.1 max-h-8 min-h-[30px] pr-2 font-light leading-snug">
                        {msg.body.replace(/<[^>]*>?/gm, '')}
                      </p>

                      {/* File attachment micro-pins */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex items-center space-x-1.5 mt-1.5 text-[9px] text-indigo-500 dark:text-indigo-400 font-mono">
                          <Paperclip className="h-3 w-3 shrink-0" />
                          <span>{msg.attachments.length} archivo(s)</span>
                        </div>
                      )}
                    </motion.button>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* PANEL 3: RIGHT VIEW DETAILED MESSAGE READER (5 cols) */}
          <div className="lg:col-span-5 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-3xl flex flex-col h-[620px] overflow-hidden shadow-xs">
            {selectedMessage ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden select-text">
                
                {/* Header Information Pane */}
                <div className="p-5 border-b border-slate-200/55 dark:border-slate-850 bg-white/60 dark:bg-slate-900/60 relative">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white pr-4 leading-medium font-display">
                      {selectedMessage.subject}
                    </h3>

                    {/* Controls */}
                    <button
                      id="btn-delete-view-msg"
                      onClick={() => {
                        onDeleteMessage(selectedMessage.id);
                        setSelectedMessage(null);
                      }}
                      className="p-1 px-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-950 cursor-pointer transition"
                      title="Eliminar correo de la terminal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Sender metadata row */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {selectedMessage.fromName ? selectedMessage.fromName.substring(0, 2) : selectedMessage.fromAddress.substring(0, 2)}
                      </div>
                      <div className="text-[11px] leading-snug">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {selectedMessage.fromName || "Remitente Externo"}
                        </div>
                        <div className="text-slate-400 font-mono text-[10px] mt-0.5">
                          Desde: {selectedMessage.fromAddress}
                        </div>
                        <div className="text-slate-400 font-mono text-[10px]">
                          Para: {selectedMessage.toAddress}
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 font-mono text-right italic shrink-0">
                      {new Date(selectedMessage.createdAt).toLocaleString(undefined, { 
                        dateStyle: 'medium', 
                        timeStyle: 'short' 
                      })}
                    </div>
                  </div>
                </div>

                {/* Main scrollable body container with enhanced readability */}
                <div className="flex-1 p-6 overflow-y-auto bg-white/40 dark:bg-slate-900/20 text-slate-850 dark:text-zinc-300 font-sans leading-relaxed text-xs space-y-4">
                  <div className="whitespace-pre-wrap leading-relaxed font-light text-slate-800 dark:text-slate-300">
                    {selectedMessage.body}
                  </div>
                </div>

                {/* Sub-grid of attachments */}
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-200/50 dark:border-slate-800/80">
                    <span className="text-[9px] font-bold text-slate-400 font-mono block mb-2 uppercase tracking-wide">Archivos de Adjuntos ({selectedMessage.attachments.length})</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedMessage.attachments.map((file, i) => (
                        <div key={i} className="flex items-center space-x-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                          <Paperclip className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <div className="min-w-0 max-w-[120px]">
                            <p className="truncate font-bold text-slate-800 dark:text-slate-200 text-[11px]" title={file.name}>{file.name}</p>
                            <p className="text-[9px] font-mono text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            id={`btn-dl-attach-${i}`}
                            onClick={() => triggerAttachmentDownload(file)}
                            className="p-1 px-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg cursor-pointer transition border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                            title="Descargar archivo"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Speedy instant respond option footer */}
                <div className="p-4 bg-white/60 dark:bg-slate-900/60 border-t border-slate-200/50 dark:border-slate-850/80 flex items-center justify-between">
                  <button
                    id="btn-reply"
                    onClick={() => {
                      setComposeTo(selectedMessage.fromAddress);
                      setComposeSubject(`RE: ${selectedMessage.subject}`);
                      setComposeBody(`\n\n--- El ${new Date(selectedMessage.createdAt).toLocaleString()} escribió:\n> ${selectedMessage.body.replace(/\n/g, '\n> ')}`);
                      setIsComposeOpen(true);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 border border-indigo-200/40 dark:border-indigo-900/40 rounded-xl text-xs font-bold text-indigo-650 dark:text-indigo-400 transition-all duration-200 cursor-pointer"
                  >
                    <CornerUpLeft className="h-3.5 w-3.5 mr-2 stroke-[2.5]" /> Responder Mensaje
                  </button>
                </div>
              </div>
            ) : (
              /* High fidelity empty detailed stage state */
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400 relative">
                {/* Decorative retro coordinate mesh background */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015] bg-[radial-gradient(#5046e6_1px,transparent_1px)] [background-size:16px_16px]" />
                
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-850 mb-3 shadow-inner relative z-10">
                  <Mail className="h-8 w-8 stroke-[1.25] text-indigo-400 dark:text-indigo-600" />
                </div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-300 relative z-10">Consola de Lectura Satélite</h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-light mt-1 max-w-xs relative z-10">
                  Selecciona cualquier transmisión o mensaje de la bandeja de entrada para decodificar, descargar adjuntos o redactar respuestas inmediatas.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPOSE NEW EMAIL MODAL WITH INTEGRATED CO-PILOT GEMINI */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-none">
            
            {/* Modal wrapper */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
            >
              
              {/* Modal window header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white font-display flex items-center">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-600 mr-2 animate-pulse" /> Redactar Correo & Co-Piloto Inteligente
                </h3>
                <button
                  id="btn-close-compose"
                  onClick={() => setIsComposeOpen(false)}
                  className="p-1 px-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Split writing frame */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
                
                {/* SIDE A: STANDARD EMAIL WRITING FIELDS (7 cols) */}
                <form onSubmit={handleSend} className="p-6 space-y-4 lg:col-span-7 border-r border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">De (Alias emisor)</label>
                    <select
                      id="select-sender"
                      value={senderAliasAddress}
                      onChange={(e) => setSenderAliasAddress(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-550 font-mono text-slate-900 dark:text-white"
                    >
                      {aliases.map(a => (
                        <option key={a.id} value={a.address}>{a.address}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Para (Destinatario)</label>
                    <input
                      id="compose-to"
                      type="email"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="ejemplo@destino.com"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-550 text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Asunto</label>
                    <input
                      id="compose-subject"
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Introduce el asunto"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-550 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cuerpo del correo</label>
                    <textarea
                      id="compose-body"
                      rows={8}
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="Escribe el contenido completo del correo..."
                      className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-550 leading-relaxed text-slate-900 dark:text-white font-light"
                      required
                    />
                  </div>

                  {/* Upload file attachments container */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Adjuntar Archivos (Hasta 10 MB)
                    </label>
                    
                    {composeAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {composeAttachments.map((f, i) => (
                          <div key={i} className="flex items-center space-x-1.5 bg-indigo-50/70 border border-indigo-100 dark:bg-indigo-950/50 dark:border-indigo-900/60 p-2 rounded-lg text-[10px]">
                            <Paperclip className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="max-w-[120px] truncate font-bold text-slate-800 dark:text-slate-250">{f.name}</span>
                            <span className="text-slate-450">• {(f.size / 1024).toFixed(1)} KB</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(i)}
                              className="p-0.5 hover:bg-slate-200 rounded text-rose-500 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <input
                        id="input-file-attachment"
                        type="file"
                        onChange={handleAttachmentUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="p-3 border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500/80 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-center text-xs text-slate-400 dark:text-slate-500 cursor-pointer flex items-center justify-center gap-1.5 font-light">
                        <Paperclip className="h-4 w-4" />
                        <span>{composeAttachments.length > 0 ? "Añadir más adjuntos" : "Asociar documento o imagen mediante archivo (máx 10 MB)"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                    <button
                      id="btn-send-mail"
                      type="submit"
                      className="inline-flex items-center justify-center py-2.5 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all duration-150"
                    >
                      <Send className="h-3.5 w-3.5 mr-2 stroke-[2.2]" /> Despachar Transmisión
                    </button>
                  </div>
                </form>

                {/* SIDE B: FUTURISTIC AI INTELLIGENCE CO-PILOT (5 cols) */}
                <div className="p-6 bg-linear-to-b from-indigo-50/15 via-indigo-50/5 to-transparent dark:from-indigo-950/10 dark:via-transparent dark:to-transparent lg:col-span-12 xl:col-span-5 space-y-4">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                    <h4 className="text-sm font-bold font-display">Asistente de Redacción IA Gemini</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-light leading-relaxed">
                    Escribe un resumen rápido de tus objetivos comerciales y deja que nuestro co-piloto neuronal GenAI complete la redacción profesional por ti.
                  </p>

                  <div className="space-y-4">
                    {/* Prompt input */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                        Directiva para el motor
                      </label>
                      <textarea
                        id="textarea-ai-prompt"
                        rows={4}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Escribe la instrucción de lo que quieres comunicar, ej: 'Agradecer y programar una llamada de 15 minutos...'"
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-550 leading-relaxed text-slate-800 dark:text-white font-light focus:ring-1 focus:ring-indigo-500/20"
                      />
                    </div>

                    {/* Quick suggestion Chips */}
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Plantillas rápidas</span>
                      <div className="flex flex-wrap gap-1.5">
                        {promptTemplates.map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => applyQuickPrompt(tpl.prompt)}
                            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] hover:border-indigo-500/50 hover:bg-indigo-50/20 transition cursor-pointer"
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Style selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Tonalidad del mensaje</label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { id: 'professional', label: 'Profesional' },
                          { id: 'formal', label: 'Formal / Corporativo' },
                          { id: 'casual', label: 'Informal / Amigable' },
                          { id: 'marketing', label: 'Persuasivo / Venta' }
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setAiTone(t.id as any)}
                            className={`p-2.5 rounded-xl border text-center cursor-pointer transition text-[10px] font-medium ${
                              aiTone === t.id
                                ? 'border-indigo-650 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                                : 'border-slate-150 bg-white dark:bg-slate-900 text-slate-500 dark:border-slate-800 hover:bg-slate-50/50 font-light'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      id="btn-call-ai"
                      type="button"
                      onClick={handleGenerateAIDraft}
                      disabled={aiLoading}
                      className="w-full inline-flex items-center justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md transition disabled:bg-slate-300 disabled:shadow-none cursor-pointer"
                    >
                      {aiLoading ? (
                        <> <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sintetizando borrador con Gemini... </>
                      ) : (
                        <> <Sparkles className="h-4 w-4 mr-2" /> Generar con Inteligencia Artificial </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SECURE POPUP: FIRESTORE INBOUND SANDBOX SIMULATOR */}
      <AnimatePresence>
        {simulatorOpen && (
          <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Glowing header */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
              
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-850 mb-4 bg-white dark:bg-slate-900">
                <div className="flex items-center space-x-2 text-indigo-550 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                  <h3 className="text-sm font-bold font-display">Inbound Sandbox Terminal</h3>
                </div>
                <button
                  id="btn-close-sim"
                  onClick={() => setSimulatorOpen(false)}
                  className="p-1 hover:bg-slate-150 dark:hover:bg-slate-800 rounded text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 font-light leading-relaxed">
                Esta terminal emula de forma segura para ambientes sandbox la recepción de correos inbound en Firestore. Te permite probar tu dirección de alias de forma inmediata sin demoras de propagación.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 font-mono">Nombre Emisor</label>
                    <input
                      id="sim-sender-name"
                      type="text"
                      value={simSenderName}
                      onChange={(e) => setSimSenderName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 font-mono">Remitente Simulador</label>
                    <input
                      id="sim-sender-email"
                      type="email"
                      value={simSenderEmail}
                      onChange={(e) => setSimSenderEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 font-mono">Tu Alias Destinatario</label>
                  <select
                    id="sim-recipient"
                    value={simRecipientAlias}
                    onChange={(e) => setSimRecipientAlias(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    {aliases.map(a => (
                      <option key={a.id} value={a.address}>{a.address}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 font-mono">Asunto</label>
                  <input
                    id="sim-subject"
                    type="text"
                    value={simSubject}
                    onChange={(e) => setSimSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 font-mono">Cuerpo del Mensaje</label>
                  <textarea
                    id="sim-body"
                    rows={4}
                    value={simBody}
                    onChange={(e) => setSimBody(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-light"
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="btn-sim-trigger"
                    onClick={handleTriggerSimulateReceive}
                    disabled={simulating}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center cursor-pointer"
                  >
                    {simulating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <> <Mail className="h-4 w-4 mr-2" /> Depositar Correo Inbound en Firestore </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
