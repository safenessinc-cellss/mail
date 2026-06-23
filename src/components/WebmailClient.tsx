/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  Maximize2, 
  X, 
  Database, 
  HelpCircle,
  Eye,
  Briefcase,
  Layers,
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

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
  // Navigation folders state
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts' | 'spam' | 'trash'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [senderAliasAddress, setSenderAliasAddress] = useState(aliases[0]?.address || '');
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState<EmailAttachment[]>([]);
  
  // Inbound mail simulator state
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simSenderEmail, setSimSenderEmail] = useState('jeff.bezos@amazon.com');
  const [simSenderName, setSimSenderName] = useState('Jeff Bezos');
  const [simRecipientAlias, setSimRecipientAlias] = useState(aliases[0]?.address || '');
  const [simSubject, setSimSubject] = useState('Propuesta de Alianza de Negocios');
  const [simBody, setSimBody] = useState('Hola,\n\nEstuve observando tu nuevo dominio y me pareció muy interesante lo que estás armando en tus proyectos web. Me gustaría agendar una reunión rápida para ver si podemos colaborar mutuamente.\n\nSaludos,\nJeff');
  const [simulating, setSimulating] = useState(false);

  // AI draft states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'formal' | 'casual' | 'marketing'>('professional');
  const [aiLoading, setAiLoading] = useState(false);

  // Sync state drop-down aliases if bounds changed
  useMemo(() => {
    if (aliases.length > 0 && !aliases.some(a => a.address === senderAliasAddress)) {
      setSenderAliasAddress(aliases[0].address);
    }
    if (aliases.length > 0 && !aliases.some(a => a.address === simRecipientAlias)) {
      setSimRecipientAlias(aliases[0].address);
    }
  }, [aliases]);

  // Folder and Search Filter
  const filteredMessages = useMemo(() => {
    let folderMsgs = messages.filter(m => m.folder === activeFolder);
    if (!searchQuery.trim()) return folderMsgs;

    const query = searchQuery.toLowerCase();
    return folderMsgs.filter(m => 
      m.subject.toLowerCase().includes(query) ||
      m.body.toLowerCase().includes(query) ||
      m.fromAddress.toLowerCase().includes(query) ||
      m.fromName.toLowerCase().includes(query) ||
      m.toAddress.toLowerCase().includes(query)
    );
  }, [messages, activeFolder, searchQuery]);

  // Unread metrics
  const unreadCount = useMemo(() => {
    return messages.filter(m => m.folder === 'inbox' && !m.read).length;
  }, [messages]);

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
    const link = document.createElement("a");
    link.href = attach.content;
    link.download = attach.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          setComposeSubject(data.subject);
          setComposeBody(data.body);
        } else {
          // If the AI generated standard text instead of JSON, we use it as the body
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

    setSimulating(false);
    setSimulatorOpen(false);
    // Focus inbox folder
    setActiveFolder('inbox');
  };

  const getDiskUsageInMB = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Visual Workspace Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-xl text-blue-600 dark:text-blue-400">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">Bandeja de Entrada de Correo</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-light">Controla tu correo corporativo y lee o redacta mensajes.</p>
          </div>
        </div>

        {/* Disk space limits and simulate receiving */}
        <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono block">Almacenamiento (1 GB Límite)</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 bg-slate-100 dark:bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-205 dark:border-slate-800">
                <div 
                  className="bg-blue-550 dark:bg-blue-500 h-1.5 rounded-full" 
                  style={{ width: `${Math.min(100, (storageUsedBytes / (1024 * 1024 * 1024)) * 100)}%` }} 
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                {getDiskUsageInMB(storageUsedBytes)} MB
              </span>
            </div>
          </div>

          {aliases.length > 0 && (
            <div className="flex gap-2">
              <button
                id="btn-open-simulator"
                onClick={() => setSimulatorOpen(true)}
                className="inline-flex items-center justify-center py-2 px-3.5 bg-blue-50/50 hover:bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-650" /> Simular Correo Recibido
              </button>

              {onSyncIMAP && (() => {
                const activeAlias = aliases.find(a => a.address === senderAliasAddress);
                const imapServerLabel = activeAlias?.imapHost ? activeAlias.imapHost : "Hostinger";
                return (
                  <button
                    id="btn-trigger-sync-imap"
                    onClick={() => onSyncIMAP(senderAliasAddress)}
                    className="inline-flex items-center justify-center py-2 px-3.5 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-emerald-650" /> Sincronizar IMAP ({imapServerLabel})
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {aliases.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <Mail className="h-12 w-12 text-blue-500 mx-auto stroke-1" />
          <h3 className="text-lg font-bold text-slate-950 dark:text-white font-display">Crea un alias para habilitar el buzón</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-light leading-relaxed">
            Aún no has creado aliases de correo en tu cuenta. Por favor dirígete a la pestaña de <strong className="font-semibold text-blue-650">"Buzones y Aliases"</strong> y crea tu primera cuenta tal como <code className="bg-slate-50 dark:bg-slate-950 border border-slate-150 px-1 py-0.5 rounded text-blue-650 font-mono">hola@{domain?.domainName || "tudominio.com"}</code> para desbloquear la bandeja webmail.
          </p>
        </div>
      ) : (
        /* Webmail Split Panel */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl min-h-[550px] overflow-hidden shadow-sm">
          
          {/* 1. Left Folders sidebar Column */}
          <div className="md:col-span-3 border-r border-slate-200 dark:border-slate-800 p-4 space-y-4 bg-slate-50/30 dark:bg-slate-900/50">
            <button
              id="btn-compose-mail"
              onClick={() => setIsComposeOpen(true)}
              className="w-full inline-flex items-center justify-center py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Redactar Correo
            </button>

            <nav className="space-y-1">
              {[
                { id: 'inbox', label: 'Bandeja de Entrada', icon: <Inbox className="h-4 w-4" /> },
                { id: 'sent', label: 'Enviados', icon: <Send className="h-4 w-4" /> },
                { id: 'drafts', label: 'Borradores', icon: <FileText className="h-4 w-4" /> },
                { id: 'spam', label: 'Spam', icon: <AlertOctagon className="h-4 w-4" /> },
                { id: 'trash', label: 'Papelera', icon: <Trash2 className="h-4 w-4" /> }
              ].map((folder) => {
                const count = folder.id === 'inbox' ? unreadCount : 0;
                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setActiveFolder(folder.id as any);
                      setSelectedMessage(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition cursor-pointer ${
                      activeFolder === folder.id
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-950/40 dark:hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {folder.icon}
                      <span>{folder.label}</span>
                    </div>
                    {count > 0 && (
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 2. Middle Message Index list Column */}
          <div className="md:col-span-4 border-r border-gray-205 dark:border-gray-800 flex flex-col h-[550px] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="search-mails"
                  type="text"
                  placeholder="Buscar remitente, asunto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Email list container */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-150 dark:divide-gray-850">
              {filteredMessages.length === 0 ? (
                <div className="py-12 px-4 text-center text-gray-400 text-xs">
                  <Mail className="h-8 w-8 mx-auto stroke-1 text-gray-300 dark:text-gray-700 mb-1.5" />
                  No se encontraron correos en {activeFolder}.
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`w-full text-left p-4 transition outline-none block relative hover:bg-gray-50/50 dark:hover:bg-gray-950/30 ${
                      selectedMessage?.id === msg.id 
                        ? 'bg-gray-50 dark:bg-gray-950/50' 
                        : ''
                    } ${
                      !msg.read && msg.folder === 'inbox' 
                        ? 'font-semibold text-gray-950 dark:text-white' 
                        : 'text-gray-650'
                    }`}
                  >
                    {!msg.read && msg.folder === 'inbox' && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-600 shadow-sm" />
                    )}

                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold truncate max-w-[130px]" title={msg.fromAddress}>
                        {msg.fromName || msg.fromAddress}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                        {new Date(msg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="text-xs truncate max-w-[200px] mt-1 pr-4">{msg.subject}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5 max-h-8 min-h-[30px] pr-2">
                      {msg.body.replace(/<[^>]*>?/gm, '')}
                    </p>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex items-center space-x-1 mt-1 text-[10px] text-indigo-500 font-mono">
                        <Paperclip className="h-3 w-3" />
                        <span>{msg.attachments.length} adjunto(s)</span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 3. Right Message Reader View Column */}
          <div className="md:col-span-6 flex flex-col h-[550px] overflow-hidden bg-gray-50/20 dark:bg-gray-950/5">
            {selectedMessage ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden select-text">
                {/* Header detail */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-bold text-gray-950 dark:text-white pr-4">
                      {selectedMessage.subject}
                    </h3>
                    <button
                      id="btn-delete-view-msg"
                      onClick={() => {
                        onDeleteMessage(selectedMessage.id);
                        setSelectedMessage(null);
                      }}
                      className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition cursor-pointer shrink-0"
                      title="Eliminar correo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm font-display uppercase">
                        {selectedMessage.fromName ? selectedMessage.fromName.substring(0, 2) : selectedMessage.fromAddress.substring(0, 2)}
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {selectedMessage.fromName || "Remitente desconocido"}
                        </div>
                        <div className="text-gray-400 mt-0.5">
                          Desde: {selectedMessage.fromAddress}
                        </div>
                        <div className="text-gray-400 mt-0.5">
                          Para: {selectedMessage.toAddress}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-400 font-mono text-right">
                      {new Date(selectedMessage.createdAt).toLocaleString(undefined, { 
                        dateStyle: 'medium', 
                        timeStyle: 'short' 
                      })}
                    </div>
                  </div>
                </div>

                {/* Email body details */}
                <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-900 font-sans leading-relaxed text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedMessage.body}
                </div>

                {/* Load lists of attachments if any */}
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-[10px] font-bold text-gray-400 font-mono block mb-2">ARCHIVOS ADJUNTOS ({selectedMessage.attachments.length})</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedMessage.attachments.map((file, i) => (
                        <div key={i} className="flex items-center space-x-2 bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-850 text-xs">
                          <Paperclip className="h-3.5 w-3.5 text-indigo-502 shrink-0" />
                          <div className="min-w-0 max-w-[150px]">
                            <p className="truncate font-semibold text-gray-800 dark:text-gray-200" title={file.name}>{file.name}</p>
                            <p className="text-[9px] font-mono text-gray-450">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            id={`btn-dl-attach-${i}`}
                            onClick={() => triggerAttachmentDownload(file)}
                            className="p-1 px-1.5 bg-gray-55 hover:bg-indigo-55 text-gray-500 hover:text-indigo-600 rounded cursor-pointer transition border border-gray-150"
                            title="Descargar archivo"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fast Action footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <button
                    id="btn-reply"
                    onClick={() => {
                      setComposeTo(selectedMessage.fromAddress);
                      setComposeSubject(`RE: ${selectedMessage.subject}`);
                      setComposeBody(`\n\n--- El ${new Date(selectedMessage.createdAt).toLocaleString()} escribió:\n> ${selectedMessage.body.replace(/\n/g, '\n> ')}`);
                      setIsComposeOpen(true);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-850 border border-gray-200 dark:border-gray-850 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 transition cursor-pointer"
                  >
                    <CornerUpLeft className="h-3.5 w-3.5 mr-1.5" /> Responder de inmediato
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
                <Mail className="h-12 w-12 stroke-1 text-gray-300 dark:text-gray-700 mb-2" />
                <p className="text-sm">Selecciona un correo electrónico para comenzar a leer su contenido.</p>
                <p className="text-xs text-gray-500">Haz clic en cualquier item de la lista central.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPOSE NEW EMAIL MODAL WITH GEMINI IA HELPER */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="text-base font-bold text-slate-950 dark:text-white font-display flex items-center">
                <Mail className="h-5 w-5 text-blue-600 mr-2" /> Redactar Mensaje
              </h3>
              <button
                id="btn-close-compose"
                onClick={() => setIsComposeOpen(false)}
                className="p-1 px-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 hover:text-slate-900 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
              
              {/* Field settings input */}
              <form onSubmit={handleSend} className="p-6 space-y-4 lg:col-span-7 border-r border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">De (Alias emisor)</label>
                  <select
                    id="select-sender"
                    value={senderAliasAddress}
                    onChange={(e) => setSenderAliasAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-900 dark:text-white"
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
                    placeholder="cliente@destino.com"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 font-sans text-slate-900 dark:text-white"
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
                    placeholder="asunto de tu mensaje"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cuerpo del correo</label>
                  <textarea
                    id="compose-body"
                    rows={8}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Comienza a escribir aquí tu mensaje..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 leading-relaxed font-sans text-slate-900 dark:text-white font-light"
                    required
                  />
                </div>

                {/* Upload attachment area */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Archivos Adjuntos (Hasta 10 MB)
                  </label>
                  
                  {composeAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {composeAttachments.map((f, i) => (
                        <div key={i} className="flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-955/30 border border-blue-105 p-2 rounded-lg text-[10px]">
                          <Paperclip className="h-3.5 w-3.5 text-blue-650" />
                          <span className="max-w-[120px] truncate font-bold text-slate-800 dark:text-slate-200">{f.name}</span>
                          <span className="text-slate-400">• {(f.size / 1024).toFixed(1)} KB</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(i)}
                            className="p-0.5 hover:bg-slate-100 rounded text-rose-500 cursor-pointer"
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
                    <div className="p-3 border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-505 bg-slate-50 dark:bg-slate-950 rounded-xl text-center text-xs text-slate-500 cursor-pointer flex items-center justify-center gap-1.5 font-light">
                      <Paperclip className="h-4 w-4" />
                      <span>{composeAttachments.length > 0 ? "Adjuntar otro archivo" : "Haz clic para subir un archivo (máx 10MB)"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                  <button
                    id="btn-send-mail"
                    type="submit"
                    className="inline-flex items-center justify-center py-2.5 px-6 bg-slate-900 hover:bg-slate-850 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar Correo
                  </button>
                </div>
              </form>

              {/* Server-Side Gemini Assistance generator */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 lg:col-span-5 space-y-4">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display">Asistente de Redacción IA</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-light leading-relaxed">
                  ¿No sabes qué escribir? Introduce instrucciones de lo que deseas proponer y el motor inteligente Gemini 2.5-Flash redactará un borrador completo en segundos.
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                      ¿Qué debe decir el correo?
                    </label>
                    <textarea
                      id="textarea-ai-prompt"
                      rows={5}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Escribe una directiva, ej: 'Agradecer a un cliente por la compra recomendando una llamada el próximo viernes...'"
                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 leading-relaxed font-sans shadow-xs text-slate-900 dark:text-white font-light"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                      Tono del mensaje
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'professional', label: 'Profesional' },
                        { id: 'formal', label: 'Formal' },
                        { id: 'casual', label: 'Casual' },
                        { id: 'marketing', label: 'Marketing' }
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAiTone(t.id as any)}
                          className={`p-2 rounded-lg border font-medium text-center cursor-pointer transition text-[11px] ${
                            aiTone === t.id
                              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold'
                              : 'border-slate-200 bg-white dark:bg-slate-900 text-slate-550 dark:border-slate-800 font-light'
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
                    className="w-full inline-flex items-center justify-center py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:bg-slate-350 cursor-pointer"
                  >
                    {aiLoading ? (
                      <> <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Redactando con Gemini... </>
                    ) : (
                      <> <Sparkles className="h-4 w-4 mr-1.5" /> Generar con Inteligencia Artificial </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CORE MAIL INBOUND SIMULATOR OVERLAY */}
      {simulatorOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-slate-150 dark:border-slate-800 mb-4 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400">
                <Sparkles className="h-5 w-5 animate-pulse" />
                <h3 className="text-base font-bold font-display">Inbound Mail Sandbox Simulator</h3>
              </div>
              <button
                id="btn-close-sim"
                onClick={() => setSimulatorOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-light leading-relaxed">
              Dado que este servidor corre en una caja sandbox segura, no podemos abrir puertos de entrada directos. Este portal te permite simular un correo entrante <strong>real</strong> hacia tus aliases desde cualquier remitente para verificar tu bandeja.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 font-mono">Nombre Emisor</label>
                  <input
                    id="sim-sender-name"
                    type="text"
                    value={simSenderName}
                    onChange={(e) => setSimSenderName(e.target.value)}
                    className="w-full p-2.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 font-mono">Remitente Real/Imaginario</label>
                  <input
                    id="sim-sender-email"
                    type="email"
                    value={simSenderEmail}
                    onChange={(e) => setSimSenderEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 font-mono">Para (Tu Alias Destino)</label>
                <select
                  id="sim-recipient"
                  value={simRecipientAlias}
                  onChange={(e) => setSimRecipientAlias(e.target.value)}
                  className="w-full p-2.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none font-mono text-slate-900 dark:text-white"
                >
                  {aliases.map(a => (
                    <option key={a.id} value={a.address}>{a.address}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 font-mono">Asunto</label>
                <input
                  id="sim-subject"
                  type="text"
                  value={simSubject}
                  onChange={(e) => setSimSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 font-mono">Mensaje</label>
                <textarea
                  id="sim-body"
                  rows={4}
                  value={simBody}
                  onChange={(e) => setSimBody(e.target.value)}
                  className="w-full p-2.5 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none font-sans text-slate-900 dark:text-white font-light"
                />
              </div>

              <div className="pt-2">
                <button
                  id="btn-sim-trigger"
                  onClick={handleTriggerSimulateReceive}
                  disabled={simulating}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-850 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center cursor-pointer"
                >
                  {simulating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <> <Mail className="h-4 w-4 mr-1.5" /> Generar Correo Inbound en Firestore </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
