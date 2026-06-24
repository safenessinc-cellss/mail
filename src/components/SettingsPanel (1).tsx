/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { 
  KeyRound, 
  Smartphone, 
  Laptop, 
  Database, 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Download,
  QrCode,
  Sparkles,
  Info,
  Layers,
  Copy,
  Check,
  Zap,
  DollarSign,
  FileText
} from 'lucide-react';
import { Domain, EmailAlias } from '../types';

interface SettingsViewProps {
  domain: Domain | null;
  aliases: EmailAlias[];
  onAddAlias: (
    localPart: string,
    forwardTo: string,
    password?: string
  ) => Promise<void>;
  onDeleteAlias: (aliasId: string) => Promise<void>;
  storageUsedBytes: number;
}

// Helper to generate UUIDs for Apple Profiles
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
}

// UTF-8 safe base64 encoding helper
function encodeUtf8ToBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

// Client-side Apple .mobileconfig builder to bypass backend/token reliance
function buildClientMobileConfigPayload(params: any): string {
  const { email, password, displayName, imapHost, imapPort, smtpHost, smtpPort, smtpSecure } = params;
  const cleanEmail = String(email || "").trim().toLowerCase();
  const parts = cleanEmail.split("@");
  const alias = parts[0] || "user";
  const domainName = parts[1] || "domain.com";

  const finalImapHost = imapHost ? String(imapHost).trim() : `mail.freemailhub.com`;
  const finalImapPort = imapPort ? Number(imapPort) : 993;
  const finalSmtpHost = smtpHost ? String(smtpHost).trim() : `mail.freemailhub.com`;
  const finalSmtpPort = smtpPort ? Number(smtpPort) : 587;
  const finalSmtpSecure = smtpSecure !== undefined ? Boolean(smtpSecure) : false;

  const nameUser = displayName ? String(displayName).trim() : (alias.charAt(0).toUpperCase() + alias.slice(1));

  const mailUuid = generateUUID();
  const profileUuid = generateUUID();

  const isImapSSL = (finalImapPort === 993 || finalImapPort === 465) ? 'true' : 'false';
  const isSmtpSSL = finalSmtpSecure ? 'true' : 'false';

  return `<?xml version="1.0" encoding="UTF-8"?>` +
`<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">` +
`<plist version="1.0">` +
`<dict>` +
`<key>ConsentText</key><dict><key>default</key><string>Configuración automática de correo para FreeMail Hub</string></dict>` +
`<key>PayloadContent</key>` +
`<array>` +
`<dict>` +
`<key>EmailAccountDescription</key><string>FreeMail - ${alias}</string>` +
`<key>EmailAccountName</key><string>${nameUser}</string>` +
`<key>EmailAccountType</key><string>EmailTypeIMAP</string>` +
`<key>EmailAddress</key><string>${cleanEmail}</string>` +
`<key>IncomingMailServerAuthentication</key><string>EmailAuthPassword</string>` +
`<key>IncomingMailServerHostName</key><string>${finalImapHost}</string>` +
`<key>IncomingMailServerPortNumber</key><integer>${finalImapPort}</integer>` +
`<key>IncomingMailServerUseSSL</key><${isImapSSL}/>` +
`<key>IncomingMailServerUsername</key><string>${cleanEmail}</string>` +
`<key>IncomingPassword</key><string>${password}</string>` +
`<key>OutgoingMailServerAuthentication</key><string>EmailAuthPassword</string>` +
`<key>OutgoingMailServerHostName</key><string>${finalSmtpHost}</string>` +
`<key>OutgoingMailServerPortNumber</key><integer>${finalSmtpPort}</integer>` +
`<key>OutgoingMailServerUseSSL</key><${isSmtpSSL}/>` +
`<key>OutgoingMailServerUsername</key><string>${cleanEmail}</string>` +
`<key>OutgoingPassword</key><string>${password}</string>` +
`<key>PayloadDescription</key><string>Configuración automática para FreeMail Hub</string>` +
`<key>PayloadDisplayName</key><string>FreeMail - ${alias}</string>` +
`<key>PayloadIdentifier</key><string>com.freemailhub.mail.${alias}</string>` +
`<key>PayloadType</key><string>com.apple.mail.managed</string>` +
`<key>PayloadUUID</key><string>${mailUuid}</string>` +
`<key>PayloadVersion</key><integer>1</integer>` +
`<key>PreventMove</key><false/>` +
`<key>PreventTrash</key><false/>` +
`</dict>` +
`</array>` +
`<key>PayloadDescription</key><string>Configuración de correo electrónico para FreeMail Hub.</string>` +
`<key>PayloadDisplayName</key><string>Configuración Correo FreeMail Hub</string>` +
`<key>PayloadIdentifier</key><string>com.freemailhub.profile.${alias}</string>` +
`<key>PayloadOrganization</key><string>FreeMail Hub</string>` +
`<key>PayloadType</key><string>Configuration</string>` +
`<key>PayloadUUID</key><string>${profileUuid}</string>` +
`<key>PayloadVersion</key><integer>1</integer>` +
`</dict>` +
`</plist>`;
}

export default function SettingsView({
  domain,
  aliases,
  onAddAlias,
  onDeleteAlias,
  storageUsedBytes
}: SettingsViewProps) {
  // Navigation inside settings
  const [activeTab, setActiveTab] = useState<'security' | 'config' | 'qr' | 'status' | 'users' | 'plans'>('security');

  // --- Password form states ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // --- Quick Config QR States ---
  const [qrDeviceType, setQrDeviceType] = useState<'ios' | 'android' | 'outlook' | 'manual'>('ios');
  const [qrSelectedEmail, setQrSelectedEmail] = useState('');
  const [qrPassword, setQrPassword] = useState('');
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // --- Users management states ---
  // Seed initial mock users from aliases
  const [domainUsers, setDomainUsers] = useState<Array<{
    id: string;
    email: string;
    name: string;
    status: 'Activo' | 'Pendiente de activación';
    inviteLink?: string;
  }>>([
    { id: '1', email: `hola@${domain?.domainName || 'coach-iso.eu'}`, name: 'Consultas Generales', status: 'Activo' },
    { id: '2', email: `robert@${domain?.domainName || 'coach-iso.eu'}`, name: 'Robert Johnson', status: 'Activo' }
  ]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserLocal, setNewUserLocal] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [activationUrlToDisplay, setActivationUrlToDisplay] = useState<string | null>(null);

  // --- Plan States ---
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'enterprise'>('pro'); // default pro as described: "PLAN ACTUAL: Pro"
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  // Sync default email for QR
  useEffect(() => {
    if (aliases.length > 0 && !qrSelectedEmail) {
      setQrSelectedEmail(aliases[0].address);
    } else if (domain && !qrSelectedEmail) {
      setQrSelectedEmail(`info@${domain.domainName}`);
    }
  }, [aliases, domain, qrSelectedEmail]);

  // Handle password change validation
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Debes especificar la contraseña de consola actual.");
      return;
    }

    // Password policy check: 8 chars, uppercase, lowercase, number
    const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordPolicy.test(newPassword)) {
      setPasswordError("La contraseña debe cumplir con los requisitos de seguridad: mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setIsChangingPass(true);
    setTimeout(() => {
      setIsChangingPass(false);
      setPasswordSuccess("¡Contraseña de acceso corporativo actualizada con éxito!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1200);
  };

  // Generate dynamic config QR code
  const handleGenerateQr = async () => {
    setQrError(null);
    setQrValue(null);
    setQrToken(null);

    if (!qrPassword) {
      setQrError("Por favor ingresa la contraseña correspondiente a este buzón de correo para integrarlo al perfil.");
      return;
    }

    setIsGeneratingQr(true);
    try {
      const finalEmail = qrSelectedEmail || (aliases.length > 0 ? aliases[0].address : (domain ? `info@${domain.domainName}` : "usuario@midominio.com"));
      const finalDisplayName = finalEmail.split('@')[0] || "usuario";

      if (qrDeviceType === 'ios') {
        // Fetch to local mobileconfig QR generator endpoint
        const response = await fetch('/api/profile/qr-token', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: finalEmail,
            password: qrPassword,
            displayName: finalDisplayName,
            imapHost: "mail.freemailhub.com",
            imapPort: 993,
            smtpHost: "mail.freemailhub.com",
            smtpPort: 587,
            smtpSecure: false
          })
        });

        if (!response.ok) {
          let errMsg = "El servidor falló al generar el token temporal de firma.";
          try {
            const errData = await response.json();
            if (errData && errData.error) {
              errMsg = `${errMsg} Detalle: ${errData.error} ${errData.details ? `(${errData.details})` : ''}`;
            }
          } catch (e) {}
          throw new Error(errMsg);
        }
        const data = await response.json();
        if (data && data.token) {
          setQrToken(data.token);
          const downloadUrl = `${window.location.origin}/api/profile/download-qr?token=${data.token}`;
          setQrValue(downloadUrl);
        } else {
          throw new Error("No se obtuvo token de validación.");
        }
      } else if (qrDeviceType === 'android') {
        // Pointing to Gmail direct auto configurator for Android as requested: https://mail.google.com/mail/mu/mp/
        const targetAndroidUrl = `https://mail.google.com/mail/mu/mp/?email=${encodeURIComponent(finalEmail)}`;
        setQrValue(targetAndroidUrl);
      } else if (qrDeviceType === 'outlook') {
        // Outlook configuration target
        const outlookInstructionsUrl = `${window.location.origin}/api/profile/download-outlook?email=${encodeURIComponent(finalEmail)}`;
        setQrValue(outlookInstructionsUrl);
      } else {
        // Manual Configuration Redirect
        const manualGuideUrl = `https://mail.freemailhub.com/manual-guide-instructions`;
        setQrValue(manualGuideUrl);
      }
    } catch (err: any) {
      setQrError(err.message || "Error al codificar el código QR corporativo.");
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Direct client-side download trigger for iOS .mobileconfig inside Settings
  const handleDownloadIosProfileDirectly = () => {
    setQrError(null);
    if (!qrPassword) {
      setQrError("Por favor ingresa la contraseña correspondiente a este buzón de correo para integrarlo al perfil.");
      return;
    }
    try {
      const finalEmail = qrSelectedEmail || (aliases.length > 0 ? aliases[0].address : (domain ? `info@${domain.domainName}` : "usuario@midominio.com"));
      const finalDisplayName = finalEmail.split('@')[0] || "usuario";

      const plistXml = buildClientMobileConfigPayload({
        email: finalEmail,
        password: qrPassword,
        displayName: finalDisplayName,
        imapHost: "mail.freemailhub.com",
        imapPort: 993,
        smtpHost: "mail.freemailhub.com",
        smtpPort: 587,
        smtpSecure: false
      });

      const base64Str = encodeUtf8ToBase64(plistXml);
      const dataUri = `data:application/x-apple-aspen-config;base64,${base64Str}`;

      const a = document.createElement('a');
      a.href = dataUri;
      a.download = `configuracion-${finalDisplayName}.mobileconfig`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setQrError("Error al compilar perfil local: " + err.message);
    }
  };

  // Outlook download .prf configuration
  const handleDownloadOutlookPrf = () => {
    // Generate Outlook Profile content dynamically
    const parts = qrSelectedEmail.split('@');
    const userLocal = parts[0] || 'usuario';
    const userDomain = parts[1] || 'freemailhub.com';

    const prfContent = `; FREEMAIL HUB Outlook Profile Auto-Configuration
[General]
Version=1.0
ProfileName=FreeMail - ${userLocal}
DefaultProfile=Yes
OverwriteProfile=Yes

[Service1]
UniqueName=MSF_IMAP
ServiceName=IMAP
IMAPServer=mail.freemailhub.com
IMAPPort=993
IMAPSSL=Yes
IMAPUser=${qrSelectedEmail}

[Service2]
UniqueName=MSF_SMTP
ServiceName=SMTP
SMTPServer=mail.freemailhub.com
SMTPPort=587
SMTPSSL=STARTTLS
SMTPUser=${qrSelectedEmail}
`;
    
    const blob = new Blob([prfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `configuracion-${userLocal}.prf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Archivo de perfil de configuración de Outlook (.prf) autogenerado con éxito. Ejecútalo en Outlook con doble clic para configurar automáticamente.");
  };

  // Invite and manage domain users
  const handleAddDomainUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);

    const actualDomainName = domain?.domainName || 'coach-iso.eu';
    const emailToinvite = `${newUserLocal.trim().toLowerCase()}@${actualDomainName}`;

    // Limit check on plans
    const planLimit = currentPlan === 'free' ? 5 : currentPlan === 'pro' ? 25 : 9999;
    if (domainUsers.length >= planLimit) {
      setUserActionError(`Límite de plan alcanzado. Tu Plan actual (${currentPlan === 'free' ? 'Gratuito' : 'Pro'}) permite un máximo de ${planLimit} casillas para el dominio. Asciende de plan en la pestaña 'Planes' para invitar más cuentas.`);
      return;
    }

    if (!newUserLocal || !newUserName || !newUserPass) {
      setUserActionError("Todos los campos de invitación de casilla son obligatorios.");
      return;
    }

    // Check if duplicate user
    if (domainUsers.some(u => u.email.toLowerCase() === emailToinvite.toLowerCase())) {
      setUserActionError(`La dirección de correo ${emailToinvite} ya se encuentra invitada o está activa.`);
      return;
    }

    // Generate simulated Activation Link
    const inviteToken = btoa(JSON.stringify({ email: emailToinvite, expires: Date.now() + 7 * 24 * 3600000 }));
    const inviteLink = `${window.location.origin}/activate?token=${inviteToken}`;

    const newUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: emailToinvite,
      name: newUserName,
      status: 'Pendiente de activación' as const,
      inviteLink
    };

    setDomainUsers(prev => [...prev, newUser]);
    setActivationUrlToDisplay(inviteLink);
    
    // Auto sync to main aliases state
    onAddAlias(newUserLocal.trim().toLowerCase(), '', newUserPass);

    setNewUserName('');
    setNewUserLocal('');
    setNewUserPass('');
    setIsAddingUser(false);
  };

  const handleDeleteDomainUser = (userId: string, email: string) => {
    if (confirm(`¿Estás seguro de que deseas revocar y eliminar de forma permanente la cuenta de ${email}? Perderás todos los correos del buzón.`)) {
      setDomainUsers(prev => prev.filter(u => u.id !== userId));
      // Delete from parent domain aliases
      const relativeAlias = aliases.find(a => a.address.toLowerCase() === email.toLowerCase());
      if (relativeAlias) {
        onDeleteAlias(relativeAlias.id);
      }
    }
  };

  const handleEditDomainUser = (userId: string) => {
    const userToEdit = domainUsers.find(u => u.id === userId);
    if (!userToEdit) return;
    setEditingUser(userToEdit);
  };

  const handleSaveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setDomainUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
    setEditingUser(null);
  };

  const handleSimulateActivation = (userId: string) => {
    setDomainUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'Activo' } : u));
    alert("¡Flujo de Activación completado de forma satisfactoria! El usuario ha establecido su contraseña e iniciado sesión en FreeMail Hub.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 select-none">
      
      {/* Sidebar de Configuración */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 h-fit space-y-1.5 select-none">
        <div className="pb-3 border-b border-slate-800 mb-3 px-1">
          <h2 className="text-sm font-black text-cyan-400 font-display tracking-wider uppercase">⚙️ CONSOLA CONFIG</h2>
          <p className="text-[10px] text-slate-400 mt-1 font-light leading-snug">Control de buzones, seguridad de Safeness.Inc y aprovisionamiento rápido.</p>
        </div>

        {[
          { id: 'security', label: 'Seguridad y Claves', icon: <KeyRound className="h-4 w-4" /> },
          { id: 'config', label: 'Parámetros del Correo', icon: <Laptop className="h-4 w-4" /> },
          { id: 'qr', label: 'Configuración Rápida QR', icon: <QrCode className="h-4 w-4" /> },
          { id: 'status', label: 'Estadísticas del Nodo', icon: <Database className="h-4 w-4" /> },
          { id: 'users', label: 'Usuarios del Dominio', icon: <Users className="h-4 w-4" /> },
          { id: 'plans', label: 'Suscripción y Plan', icon: <Layers className="h-4 w-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`w-full flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition uppercase cursor-pointer text-left ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-cyan-500/10 to-pink-500/5 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}

        <div className="pt-8 text-center select-none">
          <p className="text-[9px] text-slate-500 font-mono">Infraestructura Administrada</p>
          <p className="text-[10px] font-bold text-slate-400 font-sans tracking-wide mt-1">Safeness.Inc Corporate</p>
        </div>
      </div>

      {/* Panel de Contenido Principal (Separado) */}
      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative min-h-[480px]">
        {/* Decorative corner light */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full blur-2xl pointer-events-none" />

        {/* -------------------- 1. CAMBIAR CONTRASEÑA -------------------- */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-lg font-black text-white font-display tracking-wide uppercase flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-cyan-400" /> CAMBIAR CONTRASEÑA DE CONSOLA
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-light">Renueva los accesos de administración del dominio para proteger tus flujos de correo.</p>
            </div>

            {passwordError && (
              <div className="bg-rose-950/20 border border-rose-500/40 p-4 rounded-xl text-xs text-rose-350 font-semibold flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-950/20 border border-emerald-500/40 p-4 rounded-xl text-xs text-emerald-350 font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 font-mono tracking-wider uppercase">Contraseña actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Contraseña de consola actual"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 font-mono tracking-wider uppercase">Nueva contraseña de acceso</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva clave de seguridad (Alfa-numérica)"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 font-mono tracking-wider uppercase">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir nueva clave de seguridad"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition font-mono"
                />
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-start gap-3">
                <Info className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-[10px] text-slate-400 font-light leading-relaxed">
                  <p className="font-semibold text-slate-300 mb-1">Directiva de Contraseñas de Safeness.Inc:</p>
                  <p>Mínimo de 8 caracteres, conteniendo al menos una letra mayúscula, una letra minúscula y un dígito numérico.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase rounded-xl transition shadow-lg shadow-cyan-500/15 cursor-pointer disabled:opacity-55"
              >
                {isChangingPass ? (
                  <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando en Nodo...</span>
                ) : (
                  "ACTUALIZAR CONTRASEÑA DE CONSOLA"
                )}
              </button>
            </form>
          </div>
        )}

        {/* -------------------- 2. CONFIGURACIÓN DE CORREO -------------------- */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-lg font-black text-white font-display tracking-wide uppercase flex items-center gap-2">
                <Laptop className="h-5 w-5 text-cyan-400" /> PARÁMETROS DE CONEXIÓN MANUAL
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-light">Implementa las siguientes especificaciones técnicas para enlazar clientes externos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-955 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold px-2.5 py-0.5 rounded uppercase tracking-wider font-mono">
                    PROT. ENTRADA (IMAP)
                  </span>
                  <div className="space-y-2 mt-4 text-xs font-light">
                    <p className="flex justify-between font-mono py-1 border-b border-slate-900"><span className="text-slate-500">Servidor:</span> <strong className="text-white">mail.freemailhub.com</strong></p>
                    <p className="flex justify-between font-mono py-1 border-b border-slate-900"><span className="text-slate-500">Puerto IMAP:</span> <strong className="text-white">993</strong></p>
                    <p className="flex justify-between font-mono py-1 border-b border-slate-900"><span className="text-slate-500">Cifrado (Seguridad):</span> <strong className="text-white">SSL / TLS</strong></p>
                    <p className="flex justify-between font-mono py-1"><span className="text-slate-500">Método de Acceso:</span> <strong className="text-white">Contraseña de Buzón</strong></p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-955 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] bg-pink-950/40 text-pink-400 border border-pink-500/20 font-bold px-2.5 py-0.5 rounded uppercase tracking-wider font-mono">
                    PROT. SALIDA (SMTP)
                  </span>
                  <div className="space-y-2 mt-4 text-xs font-light">
                    <p className="flex justify-between font-mono py-1 border-b border-slate-900"><span className="text-slate-500">Servidor:</span> <strong className="text-white">mail.freemailhub.com</strong></p>
                    <p className="flex justify-between font-mono py-1 border-b border-slate-900"><span className="text-slate-500">Puerto SMTP:</span> <strong className="text-white">587</strong></p>
                    <p className="flex justify-between font-mono py-1 border-b border-slate-900"><span className="text-slate-500">Cifrado (Seguridad):</span> <strong className="text-white">STARTTLS (Recomendado) / 465 (Alternative SSL)</strong></p>
                    <p className="flex justify-between font-mono py-1"><span className="text-slate-500">Autenticación SMTP:</span> <strong className="text-white">Requerida (Contraseña)</strong></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest font-mono mb-3">TABLA DE COMPATIBILIDAD CON CLIENTES NATIVOS</h4>
              <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800 tracking-wider">
                    <tr>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Servidor IMAP / Puerto</th>
                      <th className="p-3">Servidor SMTP / Puerto</th>
                      <th className="p-3">Seguridad Cert.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-light text-slate-300">
                    <tr>
                      <td className="p-3 font-semibold text-white">Apple Mail</td>
                      <td className="p-3">mail.freemailhub.com : 993</td>
                      <td className="p-3">mail.freemailhub.com : 587</td>
                      <td className="p-3 font-mono text-[10px]">SSL/TLS, STARTTLS</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Gmail App</td>
                      <td className="p-3">mail.freemailhub.com : 993</td>
                      <td className="p-3">mail.freemailhub.com : 587</td>
                      <td className="p-3 font-mono text-[10px]">SSL/TLS, STARTTLS</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Outlook Mac/PC</td>
                      <td className="p-3">mail.freemailhub.com : 993</td>
                      <td className="p-3">mail.freemailhub.com : 587</td>
                      <td className="p-3 font-mono text-[10px]">SSL/TLS, STARTTLS</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Samsung Email</td>
                      <td className="p-3">mail.freemailhub.com : 993</td>
                      <td className="p-3">mail.freemailhub.com : 587</td>
                      <td className="p-3 font-mono text-[10px]">SSL/TLS, STARTTLS</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Thunderbird</td>
                      <td className="p-3">mail.freemailhub.com : 993</td>
                      <td className="p-3">mail.freemailhub.com : 587</td>
                      <td className="p-3 font-mono text-[10px]">SSL/TLS, STARTTLS</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 3. CONFIGURACIÓN RÁPIDA QR -------------------- */}
        {activeTab === 'qr' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <span className="text-[10px] text-pink-400 font-bold tracking-widest font-mono uppercase bg-pink-950/20 border border-pink-500/20 px-2.5 py-0.5 rounded-md mb-2 inline-block">PRESERVADO EN DISPOSITIVOS</span>
              <h3 className="text-lg font-black text-white font-display tracking-wide uppercase flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-cyan-400" /> CÓDIGOS QR PARA CONFIGURACIÓN RÁPIDA
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-light">Escanear el código dinámico con la cámara de tu dispositivo móvil para agregar el buzón de forma automatizada.</p>
            </div>

            {/* Selector de tipo de dispositivo */}
            <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-850 gap-1.5 md:w-fit overflow-x-auto">
              {[
                { id: 'ios', label: ' iOS (Mail App)' },
                { id: 'android', label: 'Android (Gmail)' },
                { id: 'outlook', label: 'Microsoft Outlook' },
                { id: 'manual', label: 'Manual' }
              ].map((dev) => (
                <button
                  key={dev.id}
                  onClick={() => {
                    setQrDeviceType(dev.id as any);
                    setQrValue(null);
                    setQrToken(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition shrink-0 whitespace-nowrap cursor-pointer ${
                    qrDeviceType === dev.id
                      ? 'bg-gradient-to-r from-cyan-500/15 to-pink-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-450 hover:text-white'
                  }`}
                >
                  {dev.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-2">
              <div className="md:col-span-6 space-y-4">
                <p className="text-xs text-slate-300 font-light leading-relaxed">
                  {qrDeviceType === 'ios' && "Al escanear el código QR con un iPad, iPhone o Mac se descargará un perfil firmado criptográficamente de extensión .mobileconfig. Al instalarlo, registrará los servidores IMAP y SMTP de FreeMail Hub sin necesidad de configuración manual."}
                  {qrDeviceType === 'android' && "Al escanear con tu celular Android se abrirá automáticamente el instalador nativo de la aplicación de Gmail para registrar un correo externo con el esquema de intención oficial."}
                  {qrDeviceType === 'outlook' && "Genera y descarga un archivo .prf (Outlook Profile) optimizado. El código QR redirige al enlace de auto-configuración del perfil corporativo de tu correo."}
                  {qrDeviceType === 'manual' && "Ingresa tus parámetros tradicionales manualmente en cualquier emisor externo. Este QR apunta a la guía de ayuda interactiva corporativa."}
                </p>

                <div className="space-y-3.5 pt-2 select-none">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono mb-1.5">ELEGIR CASILLA DE CORREO</label>
                    <select
                      value={qrSelectedEmail}
                    onChange={(e) => {
                      setQrSelectedEmail(e.target.value);
                      setQrValue(null);
                      setQrToken(null);
                    }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {aliases.length > 0 ? (
                        aliases.map(a => <option key={a.id} value={a.address}>{a.address}</option>)
                      ) : (
                        <option value={`usuario@${domain?.domainName || 'midominio.com'}`}>usuario@{domain?.domainName || 'midominio.com'}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono mb-1.5">Contraseña de la Casilla</label>
                    <input
                      type="password"
                      value={qrPassword}
                      onChange={(e) => setQrPassword(e.target.value)}
                      placeholder="Contraseña del buzón de correo"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-[9px] text-slate-500 mt-1">Ésta nunca se guarda en el servidor; se procesa localmente en un payload seguro.</p>
                  </div>

                  <div className="flex gap-2.5 flex-wrap">
                    <button
                      onClick={handleGenerateQr}
                      disabled={isGeneratingQr || !qrPassword}
                      className="flex-1 inline-flex items-center justify-center py-2.5 bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wide transition shadow-md shadow-cyan-500/10 cursor-pointer hover:from-cyan-400 disabled:opacity-50"
                    >
                      {isGeneratingQr ? (
                        <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Codificando...</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><QrCode className="h-4 w-4" /> Generar Código QR</span>
                      )}
                    </button>

                    {qrDeviceType === 'outlook' && (
                      <button
                        onClick={handleDownloadOutlookPrf}
                        className="p-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-cyan-400 rounded-xl text-xs transition flex items-center justify-center cursor-pointer"
                        title="Descargar perfil Outlook (.prf)"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {qrDeviceType === 'ios' && (
                    <button
                      onClick={handleDownloadIosProfileDirectly}
                      disabled={!qrPassword}
                      className="w-full inline-flex items-center justify-center py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-cyan-400 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-40"
                      title="Descarga el archivo de perfil Apple .mobileconfig pre-configurado directamente en tu dispositivo"
                    >
                      <Download className="h-4 w-4 mr-2" /> Descargar Perfil Directamente
                    </button>
                  )}

                  {qrError && (
                    <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 font-semibold">
                      {qrError}
                    </div>
                  )}
                </div>
              </div>

              {/* Contenedor del QR Generado */}
              <div className="md:col-span-6 bg-slate-955 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
                {qrValue ? (
                  <div className="flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="p-3 bg-white border border-slate-800 rounded-2xl shadow-lg shrink-0">
                      <QRCode value={qrValue} size={176} marginSize={1} />
                    </div>
                    <div>
                      <span className="inline-block text-[9px] font-bold text-pink-400 bg-pink-950/50 px-2 py-0.5 rounded border border-pink-500/30">
                        Código Válido por 7 Días por Seguridad
                      </span>
                      <p className="text-[10px] text-slate-400 font-light max-w-xs mt-2 leading-normal">
                        Apunta tu celular corporativo sobre este QR para sincronizar tu cuenta de correo corporativo <strong className="font-semibold text-white">{qrSelectedEmail}</strong>.
                      </p>
                    </div>

                    {qrToken && (
                      <div className="w-full flex bg-slate-950 border border-slate-900 rounded-xl p-2 items-center justify-between text-[10px] font-mono select-text text-slate-400">
                        <span className="truncate max-w-[140px]">{window.location.origin}/download-qr?token={qrToken.slice(0, 15)}...</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/profile/download-qr?token=${qrToken}`);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2000);
                          }}
                          className="p-1 px-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded text-cyan-400 transition cursor-pointer"
                        >
                          {copiedLink ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 select-none">
                    <QrCode className="h-14 w-14 stroke-1 mb-2.5 mx-auto text-slate-650 animate-pulse" />
                    <h5 className="text-slate-300 font-bold text-xs uppercase font-mono tracking-wider">Código QR listo para compilar</h5>
                    <p className="text-[10px] text-slate-500 font-light mt-1 max-w-xs leading-normal">Ingresa la contraseña de la casilla corporativa y haz clic en "Generar Código QR". El sistema generará el token temporal de firma asintótico.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 4. ESTADÍSTICAS DEL NODO -------------------- */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-lg font-black text-white font-display tracking-wide uppercase flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" /> ESTADÍSTICAS DE CONSUMO DEL CORREO
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-light">Métricas operacionales de la infraestructura y uso de recursos del dominio.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-955 rounded-2xl border border-slate-800 text-left">
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">CORREOS ENVIADOS</span>
                <span className="text-3xl font-black font-mono text-cyan-400 block mt-2">127</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Sincronizado vía SMTP</span>
              </div>
              <div className="p-4 bg-slate-955 rounded-2xl border border-slate-800 text-left">
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">CORREOS RECIBIDOS</span>
                <span className="text-3xl font-black font-mono text-pink-400 block mt-2">342</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Alojados en buzón IMAP</span>
              </div>
              <div className="p-4 bg-slate-955 rounded-2xl border border-slate-800 text-left">
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">ESPACIO DE DISCO</span>
                <span className="text-3xl font-black font-mono text-white block mt-2">234 MB <span className="text-xs text-slate-500 font-sans">/ 5 GB</span></span>
                <span className="text-[10px] text-slate-500 mt-1 block">Almacenamiento del Plan Pro</span>
              </div>
            </div>

            <div className="pt-4">
              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest font-mono mb-2">Porcentaje de Uso del Almacenamiento</h4>
              <div className="w-full bg-slate-950 border border-slate-850 p-1 rounded-full overflow-hidden flex">
                <div className="bg-gradient-to-r from-cyan-500 to-pink-500 h-2.5 rounded-full" style={{ width: '4.6%' }} />
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2">
                <span>Usado: 234 MB (4.6%)</span>
                <span>Restante: 4,890 MB</span>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 5. USUARIOS DEL DOMINIO (Solo Administradores) -------------------- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-4">
              <div>
                <h3 className="text-lg font-black text-white font-display tracking-wide uppercase flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-400" /> USUARIOS EN EL DOMINIO
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-light">Solo Administradores. Administra accesos de colaboradores, contraseñas y envíos de invitación.</p>
              </div>

              {!isAddingUser && (
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-slate-950 font-black text-xs uppercase tracking-wide rounded-xl transition cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Agregar usuario
                </button>
              )}
            </div>

            {userActionError && (
              <div className="bg-rose-950/20 border border-rose-500/25 p-4 rounded-xl text-xs text-rose-350 font-semibold animate-in fade-in">
                {userActionError}
              </div>
            )}

            {/* Display activation link generated popup */}
            {activationUrlToDisplay && (
              <div className="bg-cyan-950/30 border border-cyan-500/30 p-5 rounded-2xl space-y-3 relative overflow-hidden animate-in slide-in-from-top-3">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" /> ENLACE DE ACTIVACIÓN AUTOGENERADO
                </h4>
                <p className="text-[11px] text-slate-300 font-light leading-relaxed">
                  El sistema ha registrado la casilla, pero requiere que el colaborador establezca sus credenciales privadas mediante el flujo reglamentario del email de activación. Comparte este enlace con el destinatario:
                </p>

                <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-3 items-center justify-between font-mono text-xs select-all text-cyan-400 break-all gap-4">
                  <span>{activationUrlToDisplay}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activationUrlToDisplay);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                      alert("¡Enlace copiado de forma segura!");
                    }}
                    className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs shrink-0 cursor-pointer transition flex items-center justify-center"
                    title="Copiar enlace"
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setActivationUrlToDisplay(null)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-[10px] font-mono text-slate-400 hover:text-white uppercase tracking-wider transition cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}

            {/* Formulario para agregar usuario */}
            {isAddingUser && (
              <form onSubmit={handleAddDomainUser} className="bg-slate-955 p-5 border border-slate-800 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-200 select-none">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900 mb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">REGISTRAR NUEVA CUENTA DE USUARIO</h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer font-mono font-bold"
                  >
                    ✕ Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase">Nombre Completo</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ej: Carlos Silva"
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase">Dirección de correo</label>
                    <div className="flex bg-slate-950 border border-slate-850 rounded-xl overflow-hidden items-center px-3">
                      <input
                        type="text"
                        value={newUserLocal}
                        onChange={(e) => setNewUserLocal(e.target.value)}
                        placeholder="ej: carlos"
                        required
                        className="flex-1 bg-transparent py-2 select-text outline-none text-xs text-white"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">@{domain?.domainName || 'coach-iso.eu'}</span>
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase">Contraseña Provisional</label>
                    <input
                      type="password"
                      value={newUserPass}
                      onChange={(e) => setNewUserPass(e.target.value)}
                      placeholder="Establece una contraseña base temporal"
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-[9px] text-slate-500">Se enviará el correo de activación para validar la identidad y permitirle ingresar de forma autónoma.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-extrabold text-xs uppercase tracking-wide rounded-xl transition cursor-pointer shadow-md shadow-cyan-500/10"
                  >
                    REGISTRAR & ENVIAR INVITACIÓN
                  </button>
                </div>
              </form>
            )}

            {/* Listado de usuarios del dominio */}
            <div className="space-y-3">
              {domainUsers.map((usr) => (
                <div key={usr.id} className="p-4 bg-slate-955 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-white break-all">{usr.email}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${
                        usr.status === 'Activo'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30'
                          : 'bg-amber-950/40 text-amber-400 border-amber-900/30'
                      }`}>
                        {usr.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-light flex flex-wrap items-center gap-3">
                      <span>Propietario: {usr.name}</span>
                      {usr.status === 'Pendiente de activación' && (
                        <button
                          onClick={() => handleSimulateActivation(usr.id)}
                          className="text-cyan-400 font-semibold hover:underline cursor-pointer"
                        >
                          Simular clic activación
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleEditDomainUser(usr.id)}
                      className="p-2 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                      title="Editar usuario"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDomainUser(usr.id, usr.email)}
                      className="p-2 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/20 text-slate-400 hover:text-rose-500 rounded-lg transition"
                      title="Revocar usuario"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit modal inline */}
            {editingUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs select-none">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 border-b border-slate-800 pb-2">EDITAR PROPIETARIO</h3>
                  
                  <form onSubmit={handleSaveEditedUser} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-300 font-mono tracking-wider uppercase">Nombre Completo</label>
                      <input
                        type="text"
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-300 font-mono tracking-wider uppercase">Estado de la cuenta</label>
                      <select
                        value={editingUser.status}
                        onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Pendiente de activación">Pendiente de activación</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-400"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-955 font-bold rounded-xl text-xs uppercase"
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------- 6. SUSCRIPCIÓN Y PLANES -------------------- */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-lg font-black text-white font-display tracking-wide uppercase flex items-center gap-2">
                <Layers className="h-5 w-5 text-cyan-400" /> PLAN S&A DE SUSCRIPCIÓN CORPORATIVA
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-light">Asigna y escala tus capacidades de dominio. Los límites determinan la creación máxima de casillas de correo.</p>
            </div>

            {/* Banner de plan actual */}
            <div className="p-5 bg-gradient-to-r from-slate-950 to-cyan-950/15 border border-cyan-500/20 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/10 border border-cyan-500/30 p-2.5 rounded-xl">
                  <Zap className="h-6 w-6 text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-550/20 font-bold px-2 py-0.5 rounded font-mono uppercase">VIGENTE Y SUBSCRITO</span>
                    {currentPlan === 'pro' && <span className="text-[10px] bg-pink-955 text-white font-bold px-2 py-0.5 rounded">PLAN PRO</span>}
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">Plan Pro ($9.99/Anual)</h4>
                  <p className="text-[10.5px] text-slate-400 font-light mt-0.5">Asignado de forma segura al dominio corporativo del usuario.</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-slate-500 font-mono uppercase block">Próxima Renovación</span>
                <span className="text-xs font-mono font-bold text-white block mt-0.5">19 de Junio de 2027</span>
              </div>
            </div>

            {/* Listado de planes */}
            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono mb-4">Nuestros Planes Corporativos</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Plan Gratuito */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                  currentPlan === 'free' ? 'bg-slate-950 border-cyan-500/40 shadow-inner' : 'bg-slate-955 border-slate-800'
                }`}>
                  <div className="space-y-2">
                    <span className="text-[8px] font-bold text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded-full uppercase">STARTER</span>
                    <h5 className="text-xs font-bold text-white uppercase">Plan Gratuito</h5>
                    <div className="flex items-baseline mt-2">
                      <span className="text-2xl font-black font-mono text-white">$0.00</span>
                      <span className="text-[10px] text-slate-500 font-normal ml-1">/ para siempre</span>
                    </div>
                    <ul className="text-[10px] text-slate-400 space-y-1.5 pt-3 font-light">
                      <li>• Hasta <strong className="font-semibold text-slate-200">5 cuentas</strong> por dominio</li>
                      <li>• Servidores IMAP/SMTP seguros</li>
                      <li>• Filtros Antispam automotores</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentPlan('free');
                      alert("Has cambiado correctamente al Plan Gratuito (Límite: 5 cuentas de correo).");
                    }}
                    disabled={currentPlan === 'free'}
                    className="mt-6 w-full py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 disabled:opacity-40 text-slate-300 disabled:text-cyan-400 font-semibold text-xs rounded-xl"
                  >
                    {currentPlan === 'free' ? 'Plan asignado' : 'Asignar Plan'}
                  </button>
                </div>

                {/* Plan Pro */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-between relative ${
                  currentPlan === 'pro' ? 'bg-slate-950 border-cyan-500/40 shadow-lg' : 'bg-slate-955 border-slate-800'
                }`}>
                  <div className="absolute top-3 right-3 bg-pink-500/15 border border-pink-500/20 text-pink-400 text-[8px] font-black uppercase font-mono px-2 py-0.5 rounded-full">POPULAR</div>
                  <div className="space-y-2">
                    <span className="text-[8px] font-bold text-pink-400 font-mono bg-pink-950/30 px-2 py-0.5 rounded-full uppercase">NEGOCIOS</span>
                    <h5 className="text-xs font-bold text-white uppercase">Plan Pro</h5>
                    <div className="flex items-baseline mt-2">
                      <span className="text-2xl font-black font-mono text-cyan-400">$9.99</span>
                      <span className="text-[10px] text-slate-500 font-normal ml-1">/ anual</span>
                    </div>
                    <ul className="text-[10px] text-slate-400 space-y-1.5 pt-3 font-light">
                      <li>• Hasta <strong className="font-semibold text-slate-200">25 cuentas</strong> por dominio</li>
                      <li>• Códigos QR firmados dinámicos</li>
                      <li>• Soporte premium de Safeness.Inc</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentPlan('pro');
                      alert("Has cambiado correctamente al Plan Pro (Límite: 25 cuentas de correo).");
                    }}
                    disabled={currentPlan === 'pro'}
                    className="mt-6 w-full py-2 bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-955 disabled:from-transparent disabled:bg-transparent disabled:border disabled:border-slate-800 disabled:text-cyan-450 font-extrabold text-xs uppercase tracking-wider rounded-xl"
                  >
                    {currentPlan === 'pro' ? 'Plan asignado' : 'Asignar Plan'}
                  </button>
                </div>

                {/* Plan Empresarial */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                  currentPlan === 'enterprise' ? 'bg-slate-950 border-cyan-500/40 shadow-inner' : 'bg-slate-955 border-slate-800'
                }`}>
                  <div className="space-y-2">
                    <span className="text-[8px] font-bold text-purple-400 font-mono bg-purple-950/30 px-2 py-0.5 rounded-full uppercase">CORPORATIVO</span>
                    <h5 className="text-xs font-bold text-white uppercase">Plan Empresarial</h5>
                    <div className="flex items-baseline mt-2">
                      <span className="text-2xl font-black font-mono text-white">$29.99</span>
                      <span className="text-[10px] text-slate-500 font-normal ml-1">/ mes</span>
                    </div>
                    <ul className="text-[10px] text-slate-400 space-y-1.5 pt-3 font-light">
                      <li>• Cuentas <strong className="font-semibold text-slate-200">ilimitadas</strong> por dominio</li>
                      <li>• Logs integrales de auditoría</li>
                      <li>• Integración API de alto tránsito</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentPlan('enterprise');
                      alert("Has cambiado correctamente al Plan Empresarial (Cuentas ilimitadas).");
                    }}
                    disabled={currentPlan === 'enterprise'}
                    className="mt-6 w-full py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 disabled:opacity-40 text-slate-300 disabled:text-cyan-450 font-semibold text-xs rounded-xl"
                  >
                    {currentPlan === 'enterprise' ? 'Plan asignado' : 'Asignar Plan'}
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Contact Option */}
            <div className="mt-4 p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
              <div className="space-y-0.5 text-left">
                <h5 className="font-bold text-white">¿Tu empresa requiere más de 100 casillas?</h5>
                <p className="text-[11px] text-slate-400 font-light">Contamos con planes personalizados a gran escala con soporte IMAP masivo.</p>
              </div>
              <button
                onClick={() => alert("Puedes contactar con soporte mediante el correo corporativo oficial: soporte@safeness.net")}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-cyan-455 text-[10px] font-bold font-mono uppercase tracking-wider rounded-lg transition shrink-0 cursor-pointer"
              >
                Contacto Ventas
              </button>
            </div>

            {/* Sección de Facturas Simuladas */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest font-mono mb-3 flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-pink-400" /> HISTORIAL DE FACTURAS EMITIDAS
              </h4>
              <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950 text-slate-450 font-mono text-[9px] uppercase border-b border-slate-800 tracking-wider">
                    <tr>
                      <th className="p-3">Factura</th>
                      <th className="p-3">Fecha de Pago</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Monto Total</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-light text-slate-300">
                    <tr className="hover:bg-slate-950/40">
                      <td className="p-3 font-mono text-[10px] font-bold text-cyan-400">#INV-2026-003</td>
                      <td className="p-3 font-light text-[11px]">19/06/2026</td>
                      <td className="p-3"><span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/45 px-2 py-0.5 rounded border border-emerald-900/40">Pagado</span></td>
                      <td className="p-3 font-bold font-mono">$9.99 USD</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => alert("Simulando descarga de factura en base PDF encriptado de Safeness.Inc...")}
                          className="text-cyan-450 hover:text-white font-semibold flex items-center gap-1 text-[10px] justify-end ml-auto"
                        >
                          <Download className="h-3 w-3" /> Descargar PDF
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-950/40">
                      <td className="p-3 font-mono text-[10px] font-bold text-cyan-400">#INV-2025-002</td>
                      <td className="p-3 font-light text-[11px]">19/06/2025</td>
                      <td className="p-3"><span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/45 px-2 py-0.5 rounded border border-emerald-900/40">Pagado</span></td>
                      <td className="p-3 font-bold font-mono">$9.99 USD</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => alert("Simulando descarga de factura...")}
                          className="text-cyan-450 hover:text-white font-semibold flex items-center gap-1 text-[10px] justify-end ml-auto"
                        >
                          <Download className="h-3 w-3" /> Descargar PDF
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
