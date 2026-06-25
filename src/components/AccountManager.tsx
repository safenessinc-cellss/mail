/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Domain, EmailAlias } from '../types';
import { 
  Mail, 
  Plus, 
  Trash2, 
  ArrowRightLeft, 
  ShieldX, 
  CheckCircle, 
  Loader2, 
  Smartphone, 
  Download, 
  Laptop, 
  KeyRound, 
  X, 
  QrCode 
} from 'lucide-react';
import { auth } from '../firebase';

interface AccountManagerProps {
  domain: Domain | null;
  aliases: EmailAlias[];
  onAddAlias: (
    localPart: string,
    forwardTo: string,
    password?: string,
    customServers?: {
      imapHost?: string;
      imapPort?: number;
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure?: boolean;
    }
  ) => Promise<void>;
  onDeleteAlias: (aliasId: string) => Promise<void>;
  loading: boolean;
  userEmail?: string;
}

export default function AccountManager({ 
  domain, 
  aliases, 
  onAddAlias, 
  onDeleteAlias, 
  loading,
  userEmail
}: AccountManagerProps) {
  // Local active alias form state
  const [localPart, setLocalPart] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Advanced Custom Server States
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpSecure, setSmtpSecure] = useState(true);

  // Selected mailbox state for download or details config
  const [selectedAliasId, setSelectedAliasId] = useState<string>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [emailPassword, setEmailPassword] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Selector for quick configuration device (User specified tabs)
  const [selectedDevice, setSelectedDevice] = useState<'ios' | 'android' | 'outlook'>('ios');

  // Set default selectedAliasId if empty and aliases exist
  useEffect(() => {
    if (aliases.length > 0 && !selectedAliasId) {
      setSelectedAliasId(aliases[0].id);
    }
  }, [aliases, selectedAliasId]);

  const selectedAlias = aliases.find(a => a.id === selectedAliasId) || aliases[0];
  const actualDomainName = domain?.domainName || 'coach-iso.eu';
  const resolvedEmail = selectedAlias ? selectedAlias.address : (userEmail || `ventas@${actualDomainName}`);

  // Dynamic config solver based on device and currently selected mailbox parameters
  const getConfigData = (device: string) => {
    const imapHostVal = selectedAlias?.imapHost || 'imap.gmail.com';
    const imapPortVal = selectedAlias?.imapPort?.toString() || '993';
    const imapSec = imapPortVal === '993' ? 'SSL/TLS' : 'SSL/TLS';

    const smtpHostVal = selectedAlias?.smtpHost || 'smtp.resend.com';
    const smtpPortVal = selectedAlias?.smtpPort?.toString() || '587';
    const smtpSec = selectedAlias?.smtpSecure !== undefined 
      ? (selectedAlias.smtpSecure ? 'SSL/TLS' : 'STARTTLS') 
      : 'STARTTLS';

    let configUrl = '';
    switch (device) {
      case 'ios':
        configUrl = `https://setup.icloud.com/setup/mail/config?email=${resolvedEmail}`;
        break;
      case 'android':
        configUrl = `https://mail.google.com/mail/mu/mp/`;
        break;
      case 'outlook':
        configUrl = `https://outlook.office.com/mail/`;
        break;
      default:
        configUrl = '';
    }

    return {
      email: resolvedEmail,
      imap: imapHostVal,
      imapPort: imapPortVal,
      imapSecurity: imapSec,
      smtp: smtpHostVal,
      smtpPort: smtpPortVal,
      smtpSecurity: smtpSec,
      configUrl,
    };
  };

  const config = getConfigData(selectedDevice);

  // Generate QR manual parameters string matching the user specified QR content
  const getManualConfigQR = () => {
    return `Servidor IMAP: ${config.imap}
Puerto IMAP: ${config.imapPort} (${config.imapSecurity})
Servidor SMTP: ${config.smtp}
Puerto SMTP: ${config.smtpPort} (${config.smtpSecurity})
Usuario: ${config.email}`;
  };

  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const text = getManualConfigQR();
    if (text) {
      QRCode.toDataURL(text, { width: 180, margin: 1 })
        .then(url => {
          setQrDataUrl(url);
        })
        .catch(err => {
          console.error('Error generating QR in AccountManager:', err);
          setQrDataUrl('');
        });
    } else {
      setQrDataUrl('');
    }
  }, [selectedAlias, selectedDevice, aliases]);

  const handleDownloadProfileClick = () => {
    if (!selectedAlias) {
      alert("Por favor crea una casilla de correo para poder descargar su perfil.");
      return;
    }
    setIsProfileModalOpen(true);
  };

  // Helper function to generate a simple base64 encoded string representing the .mobileconfig XML profile for iOS
  const getBase64MobileConfig = () => {
    if (!selectedAlias) return '';
    const cleanEmail = String(selectedAlias.address || "").trim().toLowerCase();
    const parts = cleanEmail.split("@");
    const alias = parts[0] || "user";

    const finalImapHost = selectedAlias.imapHost || "imap.gmail.com";
    const finalImapPort = selectedAlias.imapPort || 993;
    const finalSmtpHost = selectedAlias.smtpHost || "smtp.resend.com";
    const finalSmtpPort = selectedAlias.smtpPort || 587;
    const finalSmtpSecure = selectedAlias.smtpSecure !== undefined ? selectedAlias.smtpSecure : false;

    const nameUser = selectedAlias.localPart.charAt(0).toUpperCase() + selectedAlias.localPart.slice(1);

    const generateUUIDLocal = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16).toUpperCase();
      });
    };

    const mailUuid = generateUUIDLocal();
    const profileUuid = generateUUIDLocal();

    const isImapSSL = (finalImapPort === 993 || finalImapPort === 465) ? 'true' : 'false';
    const isSmtpSSL = finalSmtpSecure ? 'true' : 'false';

    const plistXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
<key>ConsentText</key><dict><key>default</key><string>Configuración automática de correo para FreeMail Hub</string></dict>
<key>PayloadContent</key>
<array>
<dict>
<key>EmailAccountDescription</key><string>FreeMail - ${alias}</string>
<key>EmailAccountName</key><string>${nameUser}</string>
<key>EmailAccountType</key><string>EmailTypeIMAP</string>
<key>EmailAddress</key><string>${cleanEmail}</string>
<key>IncomingMailServerAuthentication</key><string>EmailAuthPassword</string>
<key>IncomingMailServerHostName</key><string>${finalImapHost}</string>
<key>IncomingMailServerPortNumber</key><integer>${finalImapPort}</integer>
<key>IncomingMailServerUseSSL</key><${isImapSSL}/>
<key>IncomingMailServerUsername</key><string>${cleanEmail}</string>
<key>IncomingPassword</key><string>${emailPassword}</string>
<key>OutgoingMailServerAuthentication</key><string>EmailAuthPassword</string>
<key>OutgoingMailServerHostName</key><string>${finalSmtpHost}</string>
<key>OutgoingMailServerPortNumber</key><integer>${finalSmtpPort}</integer>
<key>OutgoingMailServerUseSSL</key><${isSmtpSSL}/>
<key>OutgoingMailServerUsername</key><string>${cleanEmail}</string>
<key>OutgoingPassword</key><string>${emailPassword}</string>
<key>PayloadDescription</key><string>Configuración automática para FreeMail Hub</string>
<key>PayloadDisplayName</key><string>FreeMail - ${alias}</string>
<key>PayloadIdentifier</key><string>com.improvmx.mail.${alias}</string>
<key>PayloadType</key><string>com.apple.mail.managed</string>
<key>PayloadUUID</key><string>${mailUuid}</string>
<key>PayloadVersion</key><integer>1</integer>
<key>PreventMove</key><false/>
<key>PreventTrash</key><false/>
</dict>
</array>
<key>PayloadDescription</key><string>Configuración de correo electrónico para FreeMail Hub.</string>
<key>PayloadDisplayName</key><string>Configuración Correo FreeMail Hub</string>
<key>PayloadIdentifier</key><string>com.improvmx.profile.${alias}</string>
<key>PayloadOrganization</key><string>FreeMail Hub</string>
<key>PayloadType</key><string>Configuration</string>
<key>PayloadUUID</key><string>${profileUuid}</string>
<key>PayloadVersion</key><integer>1</integer>
</dict>
</plist>`;

    // UTF-8 base64 encoding helper client-side
    return btoa(encodeURIComponent(plistXml).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  };

  const handleDownloadProfileBase64 = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedAlias || !emailPassword) return;
    try {
      const base64Str = getBase64MobileConfig();
      const dataUri = `data:application/x-apple-aspen-config;base64,${base64Str}`;
      
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = `configuracion-${selectedAlias.localPart}.mobileconfig`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setIsProfileModalOpen(false);
      setEmailPassword('');
      alert("¡Perfil de configuración descargado con éxito vía Base64 local! Abre la aplicación Ajustes en tu dispositivo Apple para realizar la instalación.");
    } catch (err: any) {
      alert("Error al compilar base64 local: " + err.message);
    }
  };

  // Profile downloader from the backend endpoint
  const handleGenerateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlias || !emailPassword) return;

    setIsDownloading(true);
    try {
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch('/api/profile/generate', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: selectedAlias.address,
          password: emailPassword,
          displayName: selectedAlias.localPart.charAt(0).toUpperCase() + selectedAlias.localPart.slice(1),
          imapHost: selectedAlias.imapHost || "imap.gmail.com",
          imapPort: selectedAlias.imapPort || 993,
          smtpHost: selectedAlias.smtpHost || "smtp.resend.com",
          smtpPort: selectedAlias.smtpPort || 587,
          smtpSecure: selectedAlias.smtpSecure !== undefined ? selectedAlias.smtpSecure : false
        })
      });

      if (!response.ok) {
        let serverError = 'No se pudo contactar al generador de perfiles de FreeMail.';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            serverError = errData.error;
          }
        } catch (_) {}
        throw new Error(serverError);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `configuracion-${selectedAlias.localPart}.mobileconfig`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setIsProfileModalOpen(false);
      setEmailPassword('');
      alert("¡Perfil descargado con éxito! Abre 'Ajustes' en tu dispositivo Apple y verás un banner llamado 'Perfil descargado' arriba para realizar la instalación.");
    } catch (err: any) {
      alert("Error al descargar el perfil: " + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!domain) {
      setError("Necesitas agregar y verificar un dominio primero.");
      return;
    }

    if (!domain.verified) {
      setError("Tu dominio debe estar verificado antes de poder añadir direcciones aliadas sobre él.");
      return;
    }

    const cleanedLocal = localPart.trim().toLowerCase();
    if (!cleanedLocal || !/^[a-z0-9._%+-]+$/i.test(cleanedLocal)) {
      setError("El nombre de la dirección alias solo puede contener caracteres alfanuméricos, puntos, guiones y barras.");
      return;
    }

    if (aliases.length >= 15) {
      setError("Has alcanzado el límite gratuito de este servicio (Máximo 15 direcciones alias por dominio).");
      return;
    }

    const alreadyExists = aliases.some(a => a.localPart === cleanedLocal);
    if (alreadyExists) {
      setError(`La dirección alias ${cleanedLocal}@${domain.domainName} ya existe en tu catálogo.`);
      return;
    }

    if (!password) {
      setError("Por favor ingresa una contraseña para el buzón de correo.");
      return;
    }

    const customServers = showAdvanced ? {
      imapHost: imapHost.trim() || undefined,
      imapPort: imapPort ? Number(imapPort) : undefined,
      smtpHost: smtpHost.trim() || undefined,
      smtpPort: smtpPort ? Number(smtpPort) : undefined,
      smtpSecure: smtpSecure
    } : undefined;

    await onAddAlias(cleanedLocal, forwardTo.trim().toLowerCase(), password, customServers);
    setLocalPart('');
    setForwardTo('');
    setPassword('');
    setImapHost('');
    setImapPort('993');
    setSmtpHost('');
    setSmtpPort('465');
    setSmtpSecure(true);
    setShowAdvanced(false);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Overview */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-sm">
        <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
          <Mail className="h-5 w-5 text-cyan-400 animate-pulse" /> Buzones y Aliases del Dominio
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-light">
          Crea tus casillas corporativas independientes para {domain?.domainName || "tu dominio"} sin pagar licencias de correo adicionales.
        </p>
      </div>

      {/* Conditions alerts */}
      {!domain || !domain.verified ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <ShieldX className="h-12 w-12 text-amber-500 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-white font-display">Dominio Verificado Requerido</h3>
          <p className="text-xs text-slate-400 font-light leading-relaxed">
            Para crear buzones de correo bajo tu dominio (ej: ventas@tudominio.com), primero debes registrar un dominio en la pestaña <strong className="font-semibold text-cyan-400">"1. Gestión de Dominios"</strong> y verificar que las directivas DNS estén correctas en tu panel de alojamiento.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* New Alias Creation Form - Left Column (5/12 grid span) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm h-fit space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  ➕ Crear Nueva Casilla
                </h3>
                <p className="text-[11px] text-slate-400 font-light mt-0.5">Define el alias y contraseña de tu buzón.</p>
              </div>

              {error && (
                <div className="bg-rose-950/20 border border-rose-900/40 p-3.5 rounded-xl text-xs text-rose-350 font-semibold mb-4 transition">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase mb-1.5">
                    Dirección de Correo Alias
                  </label>
                  <div className="flex rounded-xl bg-slate-950 border border-slate-850 overflow-hidden items-center px-3 focus-within:border-cyan-500 transition-all">
                    <input
                      id="input-mailbox-alias"
                      type="text"
                      value={localPart}
                      onChange={(e) => setLocalPart(e.target.value)}
                      placeholder="hola"
                      className="flex-1 min-w-0 bg-transparent py-2.5 outline-none text-xs text-white"
                      required
                    />
                    <span className="text-[11px] text-slice-300 font-mono select-none px-2 shrink-0">
                      @{actualDomainName}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase mb-1.5">
                    Reenvío Externo Opcional
                  </label>
                  <input
                    id="input-mailbox-forward"
                    type="email"
                    value={forwardTo}
                    onChange={(e) => setForwardTo(e.target.value)}
                    placeholder="ejemplo@gmail.com"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs focus:outline-none focus:border-cyan-500 font-sans text-white placeholder-slate-600"
                  />
                  <p className="text-[9px] text-slate-500 mt-1 font-light">Copia opcional de correos recibidos a tu correo habitual.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase mb-1.5">
                    Contraseña del Buzón
                  </label>
                  <input
                    id="input-mailbox-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Escribe la clave de acceso"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-white placeholder-slate-600"
                    required
                  />
                </div>

                {/* Advanced Custom Server Settings Toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-[11px] font-bold text-cyan-400 flex items-center gap-1 hover:underline cursor-pointer focus:outline-none"
                  >
                    {showAdvanced ? "✕ Ocultar opciones avanzadas" : "⚙️ Servidor IMAP/SMTP propio"}
                  </button>
                </div>

                {showAdvanced && (
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3 animate-in fade-in duration-150">
                    <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-widest font-mono">Servidor Externo Sincronizado</h4>
                    
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 font-mono uppercase">
                        IMAP Host de entrada
                      </label>
                      <input
                        type="text"
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        placeholder="ej: mail.mihosting.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 font-mono uppercase">
                        Puerto IMAP
                      </label>
                      <input
                        type="number"
                        value={imapPort}
                        onChange={(e) => setImapPort(e.target.value)}
                        placeholder="993"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 font-mono uppercase">
                        SMTP Host de salida
                      </label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="ej: mail.mihosting.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 font-mono uppercase">
                        Puerto SMTP
                      </label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="465"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="smtpSecureChk"
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                        className="rounded border-slate-750 text-cyan-500 focus:ring-cyan-550 h-3.5 w-3.5 cursor-pointer accent-cyan-500"
                      />
                      <label htmlFor="smtpSecureChk" className="text-[10px] font-bold text-slate-400 tracking-wide cursor-pointer font-mono">
                        Usar SSL Seguro (Puerto 465)
                      </label>
                    </div>
                  </div>
                )}

                <button
                  id="btn-create-alias"
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center py-3 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <> <Plus className="h-4 w-4 mr-1.5 text-slate-950" /> Crear Cuenta de Correo </>
                  )}
                </button>
              </form>
            </div>

            {/* Active Aliases & Config Section - Right Column (7/12 grid span) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  🗂️ Casillas de Correo Activas ({aliases.length} / 15)
                </h3>
                <p className="text-[11px] text-slate-400 font-light mt-0.5">Administra, borra o selecciona tus buzones para configurarlos en tus dispositivos.</p>
              </div>

              {aliases.length === 0 ? (
                <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <Mail className="h-10 w-10 mx-auto stroke-1 text-slate-600 mb-2" />
                  <p className="text-xs">Aún no has creado ningún buzón.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Usa el formulario lateral para agregar tu primera dirección corporativa.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {aliases.map((alias) => (
                    <div 
                      key={alias.id} 
                      onClick={() => setSelectedAliasId(alias.id)}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-4 cursor-pointer ${
                        selectedAliasId === alias.id 
                          ? 'bg-slate-950 border-cyan-500/50 shadow-sm shadow-cyan-500/5' 
                          : 'bg-slate-950/50 border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0 select-text">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white font-mono truncate">{alias.address}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-950 text-emerald-400 border border-emerald-900/40">
                            <CheckCircle className="h-2 w-2 mr-0.5 text-emerald-400 animate-pulse" /> Activo
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-405 flex flex-wrap items-center gap-1.5 font-light">
                          <span>Casilla: {alias.localPart}</span>
                          {alias.forwardTo && (
                            <>
                              <span>•</span>
                              <span className="text-cyan-400 border border-cyan-500/20 bg-cyan-950/20 px-1.5 py-0.2 rounded font-mono text-[9px] truncate max-w-[150px]">
                                Reenvía a: {alias.forwardTo}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        id={`btn-del-alias-${alias.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Estás seguro de que deseas eliminar permanentemente la casilla ${alias.address}? Se perderán todos sus correos.`)) {
                            onDeleteAlias(alias.id);
                          }
                        }}
                        className="p-2 py-2 bg-slate-900 hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 border border-slate-800 hover:border-rose-900/40 rounded-xl transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* -------------------- USER DESIGNED ACCOUNT MANAGER INTEGRATION -------------------- */}
          {aliases.length > 0 && selectedAlias && (
            <div className="settings-container max-w-5xl mx-auto pt-6 border-t border-slate-800 space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <h2 className="text-2xl font-bold font-display tracking-wider text-white uppercase">
                  ⚙️ Configuración de Cuenta ({selectedAlias.address})
                </h2>
                {/* Mail selector dropdown */}
                <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 font-mono">Mailbox:</span>
                  <select
                    value={selectedAliasId}
                    onChange={(e) => setSelectedAliasId(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-mono text-cyan-400 font-semibold cursor-pointer"
                  >
                    {aliases.map((alias) => (
                      <option key={alias.id} value={alias.id}>
                        {alias.address}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Información de la cuenta */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4">Información de tu cuenta</h3>
                  <div className="space-y-3 font-light text-slate-300">
                    <p className="text-sm">Email: <span className="text-white font-mono text-sm">{resolvedEmail}</span></p>
                    <p className="text-sm">Dominio: <span className="text-white font-mono text-sm">{actualDomainName}</span></p>
                    <p className="text-xs text-cyan-400/80 bg-cyan-950/40 border border-cyan-950 p-2.5 rounded-xl flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" /> Plan Activo: Pro (hasta 15 cuentas autorizadas)
                    </p>
                  </div>
                </div>

                {/* Configuración de correo */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4">Configuración de Correo</h3>
                  <div className="space-y-2.5 text-xs text-slate-300 font-light">
                    <p className="flex justify-between font-mono bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                      <span className="text-slate-500">IMAP:</span> 
                      <span className="text-white font-semibold">{config.imap}</span>
                    </p>
                    <p className="flex justify-between font-mono bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                      <span className="text-slate-500">Puerto IMAP:</span> 
                      <span className="text-white font-semibold">{config.imapPort} ({config.imapSecurity})</span>
                    </p>
                    <p className="flex justify-between font-mono bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                      <span className="text-slate-500">SMTP:</span> 
                      <span className="text-white font-semibold">{config.smtp}</span>
                    </p>
                    <p className="flex justify-between font-mono bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                      <span className="text-slate-500">Puerto SMTP:</span> 
                      <span className="text-white font-semibold">{config.smtpPort} ({config.smtpSecurity})</span>
                    </p>
                    <p className="flex justify-between font-mono bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                      <span className="text-slate-500">Usuario:</span> 
                      <span className="text-cyan-300 font-semibold select-all break-all">{config.email}</span>
                    </p>
                  </div>
                </div>

              </div>

              {/* Generador de QR */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Configuración Rápida</h3>
                <p className="text-slate-400 text-xs mb-5 font-light">
                  Escanea el código QR con tu dispositivo para configurar automáticamente tu correo en segundos.
                </p>

                {/* Selector de dispositivo */}
                <div className="flex gap-2 mb-6 max-w-md">
                  <button
                    onClick={() => setSelectedDevice('ios')}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer ${
                      selectedDevice === 'ios' 
                        ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/10' 
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    📱 iOS
                  </button>
                  <button
                    onClick={() => setSelectedDevice('android')}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer  ${
                      selectedDevice === 'android' 
                        ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/10' 
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    🤖 Android
                  </button>
                  <button
                    onClick={() => setSelectedDevice('outlook')}
                    className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer  ${
                      selectedDevice === 'outlook' 
                        ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/10' 
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    💻 Outlook
                  </button>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-900">
                  <div className="bg-white p-4.5 rounded-2xl mb-4 shadow-lg flex items-center justify-center">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="Manual config QR" className="w-[180px] h-[180px]" />
                    ) : (
                      <div className="w-[180px] h-[180px] flex items-center justify-center bg-slate-150 text-slate-400 text-xs rounded-xl">
                        Generando QR...
                      </div>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs text-center font-light leading-normal max-w-sm">
                    {selectedDevice === 'ios' && '📱 Escanea con la cámara de tu iPhone / iPad para configurar la app de Mail de forma automatizada.'}
                    {selectedDevice === 'android' && '🤖 Escanea con la cámara de tu Android para configurar la app de Gmail de forma instantánea.'}
                    {selectedDevice === 'outlook' && '💻 Escanea para descargar y aplicar el perfil de configuración en tu Outlook Mobile.'}
                  </p>
                </div>

                {/* Botón de descarga de perfil real */}
                <div className="mt-6 text-center">
                  <button 
                    onClick={handleDownloadProfileClick}
                    className="neon-button px-6 py-3 rounded-xl text-xs font-black tracking-wide"
                  >
                    📥 Descargar Perfil de Configuración (.mobileconfig)
                  </button>
                </div>
              </div>

              {/* Instrucciones manuales */}
              <div className="glass-card p-6 mt-6">
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Configuración Manual</h3>
                <p className="text-slate-400 text-xs font-light">
                  Si prefieres configurar manualmente tu dirección en cualquier otra aplicación de correos, utiliza estos datos:
                </p>
                <div className="mt-3.5 p-4 bg-slate-950 rounded-2xl border border-slate-850 font-mono text-xs text-slate-300">
                  <pre className="whitespace-pre-wrap leading-normal font-mono select-all">
                    {getManualConfigQR()}
                  </pre>
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* iOS Profile Password Prompt Modal */}
      {isProfileModalOpen && selectedAlias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white flex items-center font-mono uppercase tracking-wider">
                <KeyRound className="h-4.5 w-4.5 text-cyan-400 mr-2 shrink-0" /> Configurar Perfil Seguro
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsProfileModalOpen(false);
                  setEmailPassword('');
                }}
                className="p-1 px-2.5 bg-slate-950 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition border border-slate-850 shrink-0 cursor-pointer text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateProfile} className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-cyan-400 bg-cyan-950 border border-cyan-500/20 font-bold font-mono px-2 py-0.5 rounded leading-none">
                  Buzón: {selectedAlias.address}
                </span>
                <p className="text-[11px] text-slate-405 mt-2 font-light leading-relaxed font-sans">
                  Para que tu dispositivo Apple configure de forma nativa tus servidores IMAP y SMTP seguros, se requiere de la contraseña correspondiente a esta casilla creada:
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase">
                  Contraseña de la Casilla de Correo
                </label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-white placeholder-slate-600 font-mono"
                />
              </div>

              <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/10 rounded-2xl">
                <p className="text-[10px] text-slate-454 font-light leading-relaxed">
                  <strong className="font-semibold text-cyan-453">Cifrado de extremo a extremo:</strong> FreeMail <strong className="font-semibold text-white">no guarda contraseñas de casillas en texto plano</strong>. Ésta se utiliza en memoria RAM temporalmente para firmar tus directivas TLS en el archivo de tipo <code className="px-1 py-0.5 bg-slate-950 font-mono text-[9px] rounded text-cyan-400">.mobileconfig</code>.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2 justify-end flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    setEmailPassword('');
                  }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-semibold font-mono tracking-wide transition cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleDownloadProfileBase64}
                  disabled={!emailPassword}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-pink-400 hover:text-pink-300 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer disabled:opacity-40"
                  title="Genera y descarga el archivo .mobileconfig localmente en formato Base64 sin conectar al servidor backend."
                >
                  📥 Base64 Local
                </button>
                <button
                  type="submit"
                  disabled={isDownloading || !emailPassword}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-501 to-pink-500 text-slate-950 rounded-xl text-xs font-extrabold uppercase transition flex items-center justify-center cursor-pointer shadow-md disabled:opacity-40"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Descargar Firmado
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
