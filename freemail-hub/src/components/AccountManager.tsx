/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Domain, EmailAlias } from '../types';
import { Mail, Plus, Trash2, ArrowRightLeft, ShieldX, CheckCircle, HelpCircle, Loader2, Smartphone, Download, Laptop, KeyRound, X, QrCode } from 'lucide-react';
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
}

export default function AccountManager({ 
  domain, 
  aliases, 
  onAddAlias, 
  onDeleteAlias, 
  loading 
}: AccountManagerProps) {
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

  const [selectedAliasId, setSelectedAliasId] = useState<string>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [emailPassword, setEmailPassword] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const [downloadMethod, setDownloadMethod] = useState<'direct' | 'qr'>('direct');
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeSrc, setQrCodeSrc] = useState<string | null>(null);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setEmailPassword('');
    setDownloadMethod('direct');
    setQrCodeSrc(null);
    setQrCodeError(null);
    setQrCodeLoading(false);
  };

  const handleGenerateQRCode = async () => {
    if (!selectedAlias || !emailPassword) return;
    setQrCodeLoading(true);
    setQrCodeError(null);
    setQrCodeSrc(null);
    try {
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch('/api/profile/create-qr', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: selectedAlias.address,
          password: emailPassword,
          displayName: selectedAlias.localPart.charAt(0).toUpperCase() + selectedAlias.localPart.slice(1),
          imapHost: selectedAlias.imapHost,
          imapPort: selectedAlias.imapPort,
          smtpHost: selectedAlias.smtpHost,
          smtpPort: selectedAlias.smtpPort,
          smtpSecure: selectedAlias.smtpSecure
        })
      });

      if (!response.ok) {
        throw new Error("No se pudo generar el código temporal de perfil.");
      }

      const data = await response.json();
      if (data && data.code) {
        const downloadUrl = `${window.location.origin}/api/profile/download-config/${data.code}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(downloadUrl)}`;
        setQrCodeSrc(qrUrl);
      } else {
        throw new Error("No se recibió el código del servidor.");
      }
    } catch (err: any) {
      setQrCodeError(err.message || "Error al solicitar QR");
    } finally {
      setQrCodeLoading(false);
    }
  };

  // Set default selectedAliasId if empty and aliases exist
  React.useEffect(() => {
    if (aliases.length > 0 && !selectedAliasId) {
      setSelectedAliasId(aliases[0].id);
    }
  }, [aliases, selectedAliasId]);

  const selectedAlias = aliases.find(a => a.id === selectedAliasId) || aliases[0];
  const selectedAliasAddress = selectedAlias ? selectedAlias.address : `usuario@${domain?.domainName || 'midominio.com'}`;

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
          imapHost: selectedAlias.imapHost,
          imapPort: selectedAlias.imapPort,
          smtpHost: selectedAlias.smtpHost,
          smtpPort: selectedAlias.smtpPort,
          smtpSecure: selectedAlias.smtpSecure
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
      alert("¡Perfil descargado con éxito! Si estás en un iPhone/iPad, abre la app 'Ajustes' y verás un nuevo banner llamado 'Perfil descargado' arriba del todo. Toca allí, haz clic en 'Instalar' e ingresa tu PIN para activar tu casilla de correo instantáneamente.");
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
    // Validate localpart format
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
          <Mail className="h-5 w-5 text-emerald-600" /> Cuentas Aliases de Correo
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-light">
          Crea buzones y aliases para tu propio dominio de forma gratuita. Soporta hasta 15 casillas para organizar tu negocio.
        </p>
      </div>

      {/* Conditions alerts */}
      {!domain || !domain.verified ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <ShieldX className="h-12 w-12 text-amber-500 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-slate-950 dark:text-white font-display">Dominio Verificado Requerido</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-light leading-relaxed">
            Para crear buzones de correo bajo tu dominio (ej: ventas@tudominio.com), primero debes registrar un dominio en la pestaña <strong className="font-semibold text-emerald-600">"Gestión de Dominios"</strong> y verificar que las directivas DNS se hayan completado correctamente de forma activa.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* New Alias Creation Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-fit shadow-sm">
            <h3 className="text-base font-bold text-slate-950 dark:text-white mb-4">
              Paso 2: Crea una nueva dirección alias
            </h3>

            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-4 rounded-xl text-xs text-rose-800 dark:text-rose-350 mb-4 font-semibold transition">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Dirección de Correo Alias
                </label>
                <div className="flex rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden items-center px-3 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                  <input
                    id="input-mailbox-alias"
                    type="text"
                    value={localPart}
                    onChange={(e) => setLocalPart(e.target.value)}
                    placeholder="hola"
                    className="flex-1 min-w-0 bg-transparent py-2.5 outline-none text-sm text-slate-900 dark:text-white"
                    required
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono select-none px-2 shrink-0">
                    @{domain.domainName}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-light">Escribe solo la parte local (p.ej. ventas, contacto)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reenvío Automático Externo (Opcional)
                </label>
                <input
                  id="input-mailbox-forward"
                  type="email"
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  placeholder="ejemplo@gmail.com"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-sans text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-light">Copia opcional de correos recibidos a tu correo habitual.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Contraseña de la cuenta de correo
                </label>
                <input
                  id="input-mailbox-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña para el buzón de correo"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1 font-light">Se usará de forma segura para conectar al servidor IMAP/SMTP real.</p>
              </div>

              {/* Advanced Custom Server Settings Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer focus:outline-none"
                >
                  {showAdvanced ? "✕ Ocultar configuración personalizada" : "⚙️ Configurar servidor personalizado (Sincronizar SMTP/IMAP propio)"}
                </button>
              </div>

              {showAdvanced && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <h4 className="text-[11px] font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">Servidores Personalizados</h4>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      Servidor de Entrada IMAP (Host)
                    </label>
                    <input
                      type="text"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      placeholder="ej: imap.midominio.com"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      Puerto de Entrada IMAP
                    </label>
                    <input
                      type="number"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                      placeholder="993"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      Servidor de Salida SMTP (Host)
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="ej: smtp.midominio.com"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      Puerto de Salida SMTP
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="465"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1 select-none">
                    <input
                      type="checkbox"
                      id="smtpSecureChk"
                      checked={smtpSecure}
                      onChange={(e) => setSmtpSecure(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-750 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer accent-emerald-600"
                    />
                    <label htmlFor="smtpSecureChk" className="text-[10px] font-semibold text-slate-650 dark:text-slate-400 cursor-pointer">
                      Usar SSL Seguro (Puerto 465)
                    </label>
                  </div>
                </div>
              )}

              <button
                id="btn-create-alias"
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center py-2.5 bg-slate-900 hover:bg-slate-855 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:bg-slate-300 cursor-pointer animate-none"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <> <Plus className="h-4 w-4 mr-1.5" /> Agregar Casilla Alias </>
                )}
              </button>
            </form>
          </div>

          {/* Active Aliases Cataloge */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-150 dark:border-slate-850/80 mb-4 gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white">Casillas Activas ({aliases.length} / 15)</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-light">Listado de direcciones de correo listas para enviar y recibir desde tu marca.</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-100 shrink-0 self-start sm:self-center">
                Plan Gratuito
              </span>
            </div>

            {aliases.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Mail className="h-10 w-10 mx-auto stroke-1 text-slate-305 dark:text-slate-700 mb-2" />
                <p className="text-sm">Aún no has creado ningún alias para tu dominio.</p>
                <p className="text-xs text-slate-450 mt-1">Usa el formulario lateral para agregar tu primera dirección (ej: contacto@{domain.domainName}).</p>
              </div>
            ) : (
              <div className="space-y-3">
                {aliases.map((alias) => (
                  <div key={alias.id} className="p-4 bg-slate-50/50 dark:bg-slate-950 rounded-2xl border border-slate-205 dark:border-slate-800 hover:border-slate-300 transition flex items-center justify-between gap-4 select-text">
                    <div className="space-y-1 select-text flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white font-mono break-all">{alias.address}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100">
                          <CheckCircle className="h-2.5 w-2.5 mr-0.5 text-emerald-605" /> Activo
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 font-light">
                        <span>Creado: {new Date(alias.createdAt).toLocaleDateString()}</span>
                        {alias.forwardTo && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="inline-flex items-center text-slate-550 dark:text-slate-455 font-mono text-[10px] bg-emerald-50/30 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-100/50 dark:border-emerald-900/40">
                              <ArrowRightLeft className="h-2.5 w-2.5 mr-1 text-emerald-600" /> Reenvía a: {alias.forwardTo}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      id={`btn-del-alias-${alias.id}`}
                      onClick={() => onDeleteAlias(alias.id)}
                      className="p-2.5 bg-white dark:bg-slate-900 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-slate-800 dark:hover:bg-rose-950/20 rounded-xl transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Configuración de Correo */}
        {aliases.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 mt-6">
            <div className="pb-4 border-b border-slate-150 dark:border-slate-850">
              <h3 className="text-base font-bold text-slate-955 dark:text-white flex items-center">
                <Smartphone className="h-5 w-5 text-emerald-600 mr-2 shrink-0" /> Panel de Configuración de Correo sin Aplicaciones
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-light font-display">
                Conecta cualquiera de tus casillas creadas directamente a tu teléfono o computadora de forma nativa e instantánea.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Selector and Actions */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Selecciona la Casilla a Configurar
                  </label>
                  <select
                    value={selectedAliasId}
                    onChange={(e) => setSelectedAliasId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {aliases.map((alias) => (
                      <option key={alias.id} value={alias.id}>
                        {alias.address}
                      </option>
                    ))}
                  </select>
                </div>

                {/* iOS dynamic download */}
                <div className="p-4 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-900/30 rounded-2xl space-y-3">
                  <div className="flex items-start space-x-2.5">
                    <span className="p-1 px-2.5 bg-emerald-50 dark:bg-emerald-955 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm leading-none font-bold origin-left scale-105"></span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Generar Perfil iOS/iPadOS</h4>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-light font-sans">
                        Descarga un archivo configurador de Apple para registrar e iniciar sesión automáticamente con IMAP y SMTP seguros en tu aplicación nativa Apple Mail. No almacenamos tu contraseña.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="w-full inline-flex items-center justify-center py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
                  >
                    <Download className="h-4 w-4 mr-1.5" /> Descargar perfil para iPhone/iPad
                  </button>
                </div>
              </div>

              {/* Right details and stats */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="text-xs font-bold text-slate-955 dark:text-white flex items-center">
                  <Laptop className="h-4 w-4 mr-1.5 text-emerald-600 shrink-0" />
                  Configuración Manual y Autodiscover (Android / Samsung / Outlook)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-light leading-relaxed">
                  Para Android (Samsung Mail, Gmail App), Outlook y Windows Mail, la plataforma distribuye protocolos XML nativos. Simplemente ingresa tu correo y contraseña en el dispositivo y <strong className="font-semibold text-slate-700 dark:text-slate-300">autodetectará las directivas de servidor</strong>. Si necesitas datos de configuración manual:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/35">
                      Entrada (IMAP - SSL SF)
                    </span>
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-light pt-1">
                      <p className="flex justify-between font-mono">
                        <span className="text-slate-400">Servidor:</span> 
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {selectedAlias?.imapHost || "imap.hostinger.com"}
                        </span>
                      </p>
                      <p className="flex justify-between font-mono">
                        <span className="text-slate-400">Puerto:</span> 
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {selectedAlias?.imapPort || "993"}
                        </span>
                      </p>
                      <p className="flex justify-between font-mono">
                        <span className="text-slate-400">Seguridad:</span> 
                        <span className="font-semibold text-slate-900 dark:text-white">SSL / TLS</span>
                      </p>
                      <p className="flex justify-between font-mono">
                        <span className="text-slate-400">Usuario:</span> 
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]" title={selectedAliasAddress}>
                          {selectedAliasAddress}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/35">
                      Salida (SMTP - TLS/START)
                    </span>
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-light pt-1">
                      <p className="flex justify-between font-mono">
                        <span className="text-slate-400">Servidor:</span> 
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {selectedAlias?.smtpHost || "smtp.hostinger.com"}
                        </span>
                      </p>
                      <p className="flex justify-between font-mono">
                        <span className="text-slate-400">Puerto:</span> 
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {selectedAlias?.smtpPort || "465"}
                        </span>
                      </p>
                      <p className="flex justify-between font-mono">
                        <span className="text-slate-400">Seguridad:</span> 
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {selectedAlias?.smtpSecure !== undefined ? (selectedAlias.smtpSecure ? "SSL / TLS" : "STARTTLS") : "SSL / TLS"}
                        </span>
                      </p>
                      <p className="flex justify-between font-mono">
                        <span className="text-slate-400">Autentic.:</span> 
                        <span className="font-semibold text-slate-900 dark:text-white">Contraseña</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )}

    {/* iOS Profile Password Prompt Modal */}
    {isProfileModalOpen && selectedAlias && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-850">
            <h3 className="text-sm font-bold text-slate-955 dark:text-white flex items-center">
              <Smartphone className="h-4.5 w-4.5 text-emerald-600 mr-2 shrink-0" /> Perfil para iPhone / iPad
            </h3>
            <button
              type="button"
              onClick={closeProfileModal}
              className="p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 font-bold font-mono px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/40">
                Casilla: {selectedAlias.address}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-light leading-relaxed">
                Para generar un archivo de configuración autoinstalable firmado por FreeMail, ingresa la contraseña correspondiente a este buzón de correo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contraseña de Correo
              </label>
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => {
                  setEmailPassword(e.target.value);
                  setQrCodeSrc(null);
                }}
                placeholder="••••••••••••"
                required
                autoFocus
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Selector de Método */}
            {emailPassword && (
              <div className="flex bg-slate-100/50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-100 dark:border-slate-850 mt-2">
                <button
                  type="button"
                  onClick={() => setDownloadMethod('direct')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-center text-xs font-semibold rounded-xl transition cursor-pointer ${
                    downloadMethod === 'direct'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Download className="h-3.5 w-3.5" /> Descargar Perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDownloadMethod('qr');
                    handleGenerateQRCode();
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-center text-xs font-semibold rounded-xl transition cursor-pointer ${
                    downloadMethod === 'qr'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" /> Escanear QR
                </button>
              </div>
            )}

            {downloadMethod === 'direct' ? (
              <form onSubmit={handleGenerateProfile} className="space-y-4 pt-1">
                <div className="p-3.5 bg-amber-50/10 dark:bg-amber-950/5 border border-amber-200/30 dark:border-amber-900/15 rounded-2xl">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-light leading-relaxed">
                    <strong className="font-semibold text-amber-600 dark:text-amber-400">Nota de seguridad:</strong> FreeMail <strong className="font-semibold text-slate-800 dark:text-white">nunca guarda tu contraseña</strong> de casillas de correo. Ésta se utiliza únicamente en memoria para codificar el archivo XML temporal y entregarlo a tu navegador.
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    className="px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-650 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isDownloading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center cursor-pointer shadow-xs"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Generando...
                      </>
                    ) : (
                      <>
                        Generar y Descargar
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-1">
                {!emailPassword ? (
                  <p className="text-center text-xs text-slate-400 py-4">
                    Ingresa primero la contraseña arriba para poder generar tu enrutador QR.
                  </p>
                ) : qrCodeLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-2">
                    <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                    <p className="text-xs text-slate-400">Generando código QR dinámico...</p>
                  </div>
                ) : qrCodeError ? (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-xs text-rose-800 dark:text-rose-350 text-center">
                    {qrCodeError}
                    <button
                      type="button"
                      onClick={handleGenerateQRCode}
                      className="block mx-auto mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Reintentar generación
                    </button>
                  </div>
                ) : qrCodeSrc ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                      <img
                        src={qrCodeSrc}
                        alt="Código QR de Descarga"
                        className="h-40 w-40 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="text-center space-y-1 select-text">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Escanea para descargar a tu iPhone</p>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-light leading-normal max-w-xs">
                        Abre la app <strong>Cámara</strong> de tu iPhone, enfoca el código superior y haz clic en el enlace. Se descargará el perfil en tu dispositivo al instante.
                      </p>
                      <span className="inline-block text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-955/20 border border-amber-200/25 px-2.5 py-0.5 rounded-full font-mono mt-1 font-semibold animate-pulse uppercase tracking-wider">
                        Válido por 3 minutos
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateQRCode}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Generar Código QR Seguro
                  </button>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
}
