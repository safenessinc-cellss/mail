/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  auth, 
  signOut 
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Domain, 
  EmailAlias, 
  EmailMessage, 
  Contact, 
  UserProfile 
} from './types';

// Importing components
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import DomainManager from './components/DomainManager';
import AccountManager from './components/AccountManager';
import WebmailClient from './components/WebmailClient';
import GmailConnector from './components/GmailConnector';
import { clientSideVerifyDns } from './lib/dnsClientFallback';
import AdminDashboard from './components/AdminDashboard';
import SettingsPanel from './components/SettingsPanel';
import MultiDomainArchitecture from './components/MultiDomainArchitecture';

// Icons for Nav
import { 
  Mail, 
  Globe, 
  Layers, 
  ArrowRightLeft, 
  Github, 
  Cloud, 
  LogOut, 
  Sun, 
  Moon, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Database,
  Terminal,
  Play,
  Loader2,
  Shield,
  Settings,
  Server
} from 'lucide-react';

// ============================================
// PERSISTENCIA EN LOCALSTORAGE
// ============================================

const STORAGE_KEYS = {
  DOMAIN: 'freemail_domain',
  ALIASES: 'freemail_aliases',
  MESSAGES: 'freemail_messages',
  CONTACTS: 'freemail_contacts',
  USER_PROFILE: 'freemail_userProfile'
};

const saveState = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
};

const loadState = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Error loading from localStorage:', e);
    return null;
  }
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'landing' | 'domains' | 'aliases' | 'webmail' | 'gmail' | 'publish' | 'admin' | 'settings' | 'architecture'>('landing');
  const [darkMode, setDarkMode] = useState(false);
  const [isAdminSimulated, setIsAdminSimulated] = useState(false);

  // Core domain, alias, mails and profiles state - CARGAR DESDE LOCALSTORAGE
  const [domain, setDomain] = useState<Domain | null>(() => loadState(STORAGE_KEYS.DOMAIN));
  const [aliases, setAliases] = useState<EmailAlias[]>(() => loadState(STORAGE_KEYS.ALIASES) || []);
  const [messages, setMessages] = useState<EmailMessage[]>(() => loadState(STORAGE_KEYS.MESSAGES) || []);
  const [contacts, setContacts] = useState<Contact[]>(() => loadState(STORAGE_KEYS.CONTACTS) || []);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => loadState(STORAGE_KEYS.USER_PROFILE));

  // Loading indicator for database activities
  const [dbLoading, setDbLoading] = useState(false);

  // Deployment simulator states
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  // Sync dark mode style tailwind
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsDemoMode(false);
        setCurrentView('domains');
        if (firebaseUser.email?.toLowerCase() === 'safeness.c.a@gmail.com') {
          setIsAdminSimulated(true);
        } else {
          setIsAdminSimulated(false);
        }
        // Inicializar perfil en memoria si no existe
        if (!userProfile) {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Usuario de FreeMail',
            dailySentCount: 0,
            storageUsedBytes: 0,
            createdAt: new Date().toISOString()
          };
          setUserProfile(newProfile);
          saveState(STORAGE_KEYS.USER_PROFILE, newProfile);
        }
      } else {
        setUser(null);
        setIsAdminSimulated(false);
        if (!isDemoMode) {
          setCurrentView('landing');
          clearStates();
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const clearStates = () => {
    setDomain(null);
    setAliases([]);
    setMessages([]);
    setContacts([]);
    setUserProfile(null);
    localStorage.removeItem(STORAGE_KEYS.DOMAIN);
    localStorage.removeItem(STORAGE_KEYS.ALIASES);
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.CONTACTS);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  };

  // FAST DEMO BYPASS
  const handleDemoBypass = () => {
    setIsDemoMode(true);
    setIsAdminSimulated(true);
    setUser({
      uid: 'demo_reviewer_john',
      email: 'john.doe@gmail.com',
      displayName: 'Reviewer John Doe'
    });

    const mockProfile: UserProfile = {
      uid: 'demo_reviewer_john',
      email: 'john.doe@gmail.com',
      displayName: 'Reviewer John Doe',
      dailySentCount: 3,
      storageUsedBytes: 42 * 1024 * 1024,
      createdAt: new Date().toISOString()
    };
    setUserProfile(mockProfile);
    saveState(STORAGE_KEYS.USER_PROFILE, mockProfile);

    // Seed mock Domain
    const mockDomain: Domain = {
      id: 'demo_dom_id',
      ownerId: 'demo_reviewer_john',
      domainName: 'miempresacreativa.com',
      verified: true,
      createdAt: new Date().toISOString(),
      mxRecord: { type: 'MX', host: '@', expectedValue: '10 mx1.improvmx.com y 20 mx2.improvmx.com', status: 'verified' },
      spfRecord: { type: 'TXT', host: '@', expectedValue: 'v=spf1 include:spf.improvmx.com ~all', status: 'verified' },
      dkimRecord: { type: 'TXT', host: 'fmhub._domainkey', expectedValue: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhki...', status: 'verified' },
      dmarcRecord: { type: 'TXT', host: '_dmarc', expectedValue: 'v=DMARC1; p=quarantine; pct=100', status: 'verified' }
    };
    setDomain(mockDomain);
    saveState(STORAGE_KEYS.DOMAIN, mockDomain);

    // Seed mock Aliases
    const mockAliases: EmailAlias[] = [
      { id: 'al_1', domainId: 'demo_dom_id', domainName: 'miempresacreativa.com', localPart: 'contacto', address: 'contacto@miempresacreativa.com', forwardTo: 'john.doe@gmail.com', createdAt: new Date().toISOString() },
      { id: 'al_2', domainId: 'demo_dom_id', domainName: 'miempresacreativa.com', localPart: 'ventas', address: 'ventas@miempresacreativa.com', forwardTo: '', createdAt: new Date().toISOString() },
      { id: 'al_3', domainId: 'demo_dom_id', domainName: 'miempresacreativa.com', localPart: 'administrador', address: 'administrador@miempresacreativa.com', forwardTo: '', createdAt: new Date().toISOString() }
    ];
    setAliases(mockAliases);
    saveState(STORAGE_KEYS.ALIASES, mockAliases);

    // Seed mock emails
    const mockEmails: EmailMessage[] = [
      {
        id: 'msg_1',
        ownerId: 'demo_reviewer_john',
        aliasId: 'al_1',
        aliasAddress: 'contacto@miempresacreativa.com',
        fromName: 'Steve Jobs',
        fromAddress: 'steve@apple.com',
        toAddress: 'contacto@miempresacreativa.com',
        subject: '¡Felicidades por tu propuesta de negocio!',
        body: 'Hola John,\n\nEstuve revisando los bosquejos del proyecto que enviaste a nuestro equipo en Cupertino. Me parece brillante cómo estás utilizando FreeMail Hub para alojar los buzones de correo de tu empresa de forma ágil y económica.\n\nSigue empujando los límites del diseño y la excelencia técnica.\n\nUn fuerte abrazo,\nSteve',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        folder: 'inbox',
        read: false
      },
      {
        id: 'msg_2',
        ownerId: 'demo_reviewer_john',
        aliasId: 'al_2',
        aliasAddress: 'ventas@miempresacreativa.com',
        fromName: 'Jeff Bezos',
        fromAddress: 'jeff@amazon.com',
        toAddress: 'ventas@miempresacreativa.com',
        subject: 'Requerimos cotización de consultoría móvil',
        body: 'Estimado Equipo de Ventas,\n\nQueremos contratar sus servicios de consultoría bajo demanda para auditar nuestras arquitecturas web en AWS para mercados del sur. ¿Podrían enviarme su tarifa horaria y portafolio de clientes?\n\nEspero sus comentarios,\nJeff',
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        folder: 'inbox',
        read: true
      }
    ];
    setMessages(mockEmails);
    saveState(STORAGE_KEYS.MESSAGES, mockEmails);

    // Seed mock contacts
    const mockContacts: Contact[] = [
      { id: 'c_1', ownerId: 'demo_reviewer_john', name: 'Steve Jobs', email: 'steve@apple.com', notes: 'Consultor de diseño corporativo', createdAt: new Date().toISOString() },
      { id: 'c_2', ownerId: 'demo_reviewer_john', name: 'Jeff Bezos', email: 'jeff@amazon.com', notes: 'Inversor semilla minorista', createdAt: new Date().toISOString() },
      { id: 'c_3', ownerId: 'demo_reviewer_john', name: 'Satya Nadella', email: 'satya@microsoft.com', notes: 'Director de innovación Cloud', createdAt: new Date().toISOString() }
    ];
    setContacts(mockContacts);
    saveState(STORAGE_KEYS.CONTACTS, mockContacts);

    setCurrentView('domains');
  };

  // LOGOUT
  const handleLogout = async () => {
    try {
      setIsAdminSimulated(false);
      if (isDemoMode) {
        setIsDemoMode(false);
        setUser(null);
        setCurrentView('landing');
        clearStates();
      } else {
        await signOut(auth);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // DOMAIN OPERATIONAL PIPELINE
  const handleAddDomain = async (domainName: string) => {
    if (!user) return;
    setDbLoading(true);

    const domainId = 'dom_' + Math.random().toString(36).substring(2, 11);
    const newDomain: Domain = {
      id: domainId,
      ownerId: user.uid,
      domainName,
      verified: false,
      createdAt: new Date().toISOString(),
      mxRecord: { type: 'MX', host: '@', expectedValue: '10 mx1.improvmx.com y 20 mx2.improvmx.com', status: 'pending' },
      spfRecord: { type: 'TXT', host: '@', expectedValue: 'v=spf1 include:spf.improvmx.com ~all', status: 'pending' },
      dkimRecord: { type: 'TXT', host: 'default._domainkey', expectedValue: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0G9h...', status: 'pending' },
      dmarcRecord: { type: 'TXT', host: '_dmarc', expectedValue: `v=DMARC1; p=none; rua=mailto:dmarc@${domainName}`, status: 'pending' }
    };

    setDomain(newDomain);
    saveState(STORAGE_KEYS.DOMAIN, newDomain);
    setDbLoading(false);
  };

  // ACTUAL NODE DNS CHECK
  const handleVerifyDomain = async () => {
    if (!domain) return;
    setDbLoading(true);

    let data: any = {};
    try {
      const response = await fetch('/api/dns/verify-dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.domainName })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Verification failed");
      }
    } catch (e) {
      console.warn("[CLIENT/DNS] Falling back to client-side DNS:", e);
      try {
        data = await clientSideVerifyDns(domain.domainName);
      } catch (clientErr: any) {
        console.error("[CLIENT/DNS] Fallback failed:", clientErr);
        data = { success: false, error: clientErr.message };
      }
    }

    if (data.success && data.results) {
      const verifiedMX = data.results.mx?.status === 'configured';
      const verifiedSPF = data.results.spf?.status === 'configured';
      const verifiedDKIM = data.results.dkim?.status === 'configured';
      const verifiedDMARC = data.results.dmarc?.status === 'configured';

      const updatedDomain: Domain = {
        ...domain,
        mxRecord: { ...domain.mxRecord, status: verifiedMX ? 'verified' : 'failed' },
        spfRecord: { ...domain.spfRecord, status: verifiedSPF ? 'verified' : 'failed' },
        dkimRecord: { ...domain.dkimRecord, status: verifiedDKIM ? 'verified' : 'failed' },
        dmarcRecord: { ...domain.dmarcRecord, status: verifiedDMARC ? 'verified' : 'failed' },
        verified: verifiedMX && verifiedSPF
      };

      setDomain(updatedDomain);
      saveState(STORAGE_KEYS.DOMAIN, updatedDomain);

      if (updatedDomain.verified) {
        alert("¡Felicitaciones! Tus registros DNS están correctos.");
      } else {
        alert("Aún no detectamos todos los registros DNS.");
      }
    } else {
      alert(data.error || "Ocurrió un error al verificar las DNS.");
    }
    setDbLoading(false);
  };

  const handleForceVerifyDomain = async () => {
    if (!domain) return;
    setDbLoading(true);

    const verifiedDomain: Domain = {
      ...domain,
      verified: true,
      mxRecord: { ...domain.mxRecord, status: 'verified' },
      spfRecord: { ...domain.spfRecord, status: 'verified' },
      dkimRecord: { ...domain.dkimRecord, status: 'verified' },
      dmarcRecord: { ...domain.dmarcRecord, status: 'verified' }
    };

    setDomain(verifiedDomain);
    saveState(STORAGE_KEYS.DOMAIN, verifiedDomain);
    setDbLoading(false);
    alert("¡Bypass completado! Dominio verificado.");
  };

  const handleUpdateDomain = async (updatedDomain: Domain) => {
    setDomain(updatedDomain);
    saveState(STORAGE_KEYS.DOMAIN, updatedDomain);
  };

  const handleDeleteDomain = async () => {
    if (!domain) return;
    if (!confirm("¿Estás seguro que deseas eliminar tu dominio?")) return;
    
    setDbLoading(true);
    clearStates();
    setDbLoading(false);
  };

  // ALIAS CREATOR PIPELINE
  const handleAddAlias = async (
    localPart: string, 
    forwardTo: string, 
    aliasPassword?: string,
    customServers?: {
      imapHost?: string;
      imapPort?: number;
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure?: boolean;
    }
  ) => {
    if (!user || !domain) return;
    setDbLoading(true);

    const aliasId = 'al_' + Math.random().toString(36).substring(2, 11);
    const newAlias: EmailAlias = {
      id: aliasId,
      domainId: domain.id,
      domainName: domain.domainName,
      localPart,
      address: `${localPart}@${domain.domainName}`,
      forwardTo,
      createdAt: new Date().toISOString(),
      password: aliasPassword || '',
      ...customServers
    };

    const updated = [...aliases, newAlias];
    setAliases(updated);
    saveState(STORAGE_KEYS.ALIASES, updated);
    setDbLoading(false);
  };

  const handleDeleteAlias = async (aliasId: string) => {
    if (!confirm("¿Estás seguro que deseas remover esta casilla alias?")) return;
    setDbLoading(true);
    const updated = aliases.filter(a => a.id !== aliasId);
    setAliases(updated);
    saveState(STORAGE_KEYS.ALIASES, updated);
    setDbLoading(false);
  };

  // SEND AND RECEIVE CORE WEBMAIL MESSAGES
  const handleSendMessage = async (msg: Omit<EmailMessage, 'id' | 'createdAt' | 'ownerId'>) => {
    if (!user) return;
    setDbLoading(true);

    const msgId = 'msg_' + Math.random().toString(36).substring(2, 11);
    const newMsg: EmailMessage = {
      ...msg,
      id: msgId,
      ownerId: user.uid,
      createdAt: new Date().toISOString()
    };

    // Enviar a través de la API
    try {
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: msg.aliasAddress,
          to: msg.toAddress,
          subject: msg.subject,
          body: msg.body
        })
      });

      const data = await response.json();
      if (!data.success) {
        alert('Error al enviar el correo: ' + data.error);
        setDbLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error de conexión con el servidor');
      setDbLoading(false);
      return;
    }

    const bytesSize = JSON.stringify(newMsg).length;
    const updated = [newMsg, ...messages];
    setMessages(updated);
    saveState(STORAGE_KEYS.MESSAGES, updated);
    
    if (userProfile) {
      const updatedProfile = {
        ...userProfile,
        storageUsedBytes: userProfile.storageUsedBytes + bytesSize,
        dailySentCount: userProfile.dailySentCount + 1
      };
      setUserProfile(updatedProfile);
      saveState(STORAGE_KEYS.USER_PROFILE, updatedProfile);
    }
    setDbLoading(false);
  };

  const handleReceiveSimulatedMessage = async (msg: Omit<EmailMessage, 'id' | 'createdAt' | 'ownerId'>) => {
    if (!user) return;
    setDbLoading(true);

    const msgId = 'msg_' + Math.random().toString(36).substring(2, 11);
    const newMsg: EmailMessage = {
      ...msg,
      id: msgId,
      ownerId: user.uid,
      createdAt: new Date().toISOString()
    };

    const updated = [newMsg, ...messages];
    setMessages(updated);
    saveState(STORAGE_KEYS.MESSAGES, updated);
    setDbLoading(false);
  };

  const handleDeleteMessage = async (msgId: string) => {
    setDbLoading(true);
    try {
      const response = await fetch(`/api/mail/inbox/${msgId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        const updated = messages.filter(m => m.id !== msgId);
        setMessages(updated);
        saveState(STORAGE_KEYS.MESSAGES, updated);
      }
    } catch (e) {
      console.error(e);
    }
    setDbLoading(false);
  };

  const handleMarkRead = async (msgId: string, read: boolean) => {
    const updated = messages.map(m => m.id === msgId ? { ...m, read } : m);
    setMessages(updated);
    saveState(STORAGE_KEYS.MESSAGES, updated);

    try {
      await fetch(`/api/mail/inbox/${msgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateMessageFolder = async (msgId: string, folder: 'inbox' | 'sent' | 'archive' | 'trash') => {
    const updated = messages.map(m => m.id === msgId ? { ...m, folder } : m);
    setMessages(updated);
    saveState(STORAGE_KEYS.MESSAGES, updated);
  };

  const handleSyncIMAP = async (aliasAddress: string) => {
    alert('Sincronización IMAP simulada. Los correos se cargarán automáticamente.');
  };

  // CONTACT MANAGER OPERATIONS
  const handleAddContact = async (name: string, email: string, notes?: string) => {
    if (!user) return;
    setDbLoading(true);

    const contactId = 'c_' + Math.random().toString(36).substring(2, 11);
    const newContact: Contact = {
      id: contactId,
      ownerId: user.uid,
      name,
      email,
      notes,
      createdAt: new Date().toISOString()
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveState(STORAGE_KEYS.CONTACTS, updated);
    setDbLoading(false);
  };

  const handleDeleteContact = async (contactId: string) => {
    setDbLoading(true);
    const updated = contacts.filter(c => c.id !== contactId);
    setContacts(updated);
    saveState(STORAGE_KEYS.CONTACTS, updated);
    setDbLoading(false);
  };

  const handleImportContacts = async (importedList: Array<{ name: string; email: string; notes?: string }>) => {
    if (!user) return;
    setDbLoading(true);

    const mapped: Contact[] = importedList.map(item => ({
      id: 'c_' + Math.random().toString(36).substring(2, 11),
      ownerId: user.uid,
      name: item.name,
      email: item.email,
      notes: item.notes || '',
      createdAt: new Date().toISOString()
    }));

    const updated = [...contacts, ...mapped];
    setContacts(updated);
    saveState(STORAGE_KEYS.CONTACTS, updated);
    setDbLoading(false);
  };

  // PUBLISHING SIMULATOR
  const triggerAppPublishDeployment = () => {
    if (deploying) return;
    setDeploying(true);
    setDeployStep(0);
    setDeployLogs([]);

    const steps = [
      "Instanciando dependencias del motor Node.js v20 en Google Cloud...",
      "Extrayendo configuraciones del archivo metadata.json...",
      "Compilando interfaz SPA mediante Vite en producción...",
      "Compilando servidor Express con esbuild...",
      "Empaquetando en un contenedor Docker...",
      "Creando microservicio en Cloud Run...",
      "Configurando variables de entorno cifradas...",
      "Generando URL pública SSL cifrada de Cloud Run...",
      "¡Despliegue completado con éxito!"
    ];

    const runNextStep = (i: number) => {
      if (i >= steps.length) {
        setDeploying(false);
        return;
      }
      setDeployStep(i + 1);
      setDeployLogs(prev => [...prev, `[LOG ${new Date().toLocaleTimeString()}] ${steps[i]}`]);
      setTimeout(() => runNextStep(i + 1), 1200);
    };

    runNextStep(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      
      {currentView === 'landing' && (
        <LandingPage 
          onGetStarted={() => setCurrentView('webmail')} 
          onDemoBypass={handleDemoBypass} 
        />
      )}

      {currentView === 'webmail' && !user && (
        <AuthPage 
          onAuthSuccess={(uFromAuth) => {
            setUser(uFromAuth);
            setCurrentView('domains');
          }}
          onBackToLanding={() => setCurrentView('landing')}
          onDemoBypass={handleDemoBypass}
        />
      )}

      {user && (
        <div className="flex-1 flex flex-col">
          
          <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                
                <div 
                  className="flex items-center space-x-3 cursor-pointer select-none"
                  onClick={() => setCurrentView('landing')}
                >
                  <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-sm flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-bold font-display text-slate-850 dark:text-white tracking-tight">
                    FreeMail Hub
                  </span>
                  {isDemoMode && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-100 uppercase ml-2 select-none animate-pulse">
                      Demo
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <div className="hidden md:flex flex-col text-right text-xs">
                    <span className="font-semibold text-slate-750 dark:text-slate-200">
                      {userProfile?.displayName || user.displayName || user.email}
                    </span>
                    <span className="text-[10px] text-slate-450 dark:text-slate-400 font-mono mt-0.5">
                      Límite Diario: {userProfile?.dailySentCount || 0} / 100 correos
                    </span>
                  </div>

                  <button
                    id="btn-toggle-admin"
                    onClick={() => {
                      const nextState = !isAdminSimulated;
                      setIsAdminSimulated(nextState);
                      if (nextState) {
                        setCurrentView('admin');
                      } else {
                        setCurrentView('domains');
                      }
                    }}
                    className={`p-2 px-3 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition cursor-pointer ${
                      isAdminSimulated 
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-250 dark:border-amber-900/40 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
                    }`}
                    title="Alternar Consola de Super-Administrador"
                  >
                    <Shield className={`h-4 w-4 shrink-0 ${isAdminSimulated ? 'text-amber-500 animate-pulse' : ''}`} />
                    <span className="hidden sm:inline">{isAdminSimulated ? 'Super-Admin Activado' : 'Simular Admin'}</span>
                  </button>

                  <button
                    id="btn-toggle-dark"
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer transition"
                    title="Alternar Tema Claro/Oscuro"
                  >
                    {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5" />}
                  </button>

                  <button
                    id="btn-logout"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl cursor-pointer transition"
                    title="Cerrar Consola"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>

              </div>
            </div>
          </header>

          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 overflow-x-auto min-w-full font-sans">
            <div className="max-w-7xl mx-auto px-4 flex space-x-2">
              {[
                { id: 'domains', label: '1. Gestión de Dominios', icon: <Globe className="h-4 w-4" /> },
                { id: 'aliases', label: '2. Buzones y Aliases', icon: <Layers className="h-4 w-4" /> },
                { id: 'webmail', label: '3. Cliente Webmail', icon: <Mail className="h-4 w-4" />, disabled: aliases.length === 0 },
                { id: 'gmail', label: '4. Gmail & Contactos', icon: <ArrowRightLeft className="h-4 w-4" /> },
                { id: 'architecture', label: '📐 Planos de Arquitectura', icon: <Server className="h-4 w-4" /> },
                { id: 'settings', label: '⚙️ Configuración', icon: <Settings className="h-4 w-4" /> },
                ...((user?.email?.toLowerCase() === 'safeness.c.a@gmail.com' || isAdminSimulated) ? [{ id: 'admin', label: '★ Panel Super-Admin', icon: <Shield className="h-4 w-4 text-amber-500 shrink-0" /> }] : []),
                { id: 'publish', label: 'Publicar & Exportar CO', icon: <Cloud className="h-4 w-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => setCurrentView(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                    currentView === tab.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50 dark:text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 select-none">
            {currentView === 'domains' && (
              <DomainManager
                domain={domain}
                onAddDomain={handleAddDomain}
                onVerifyDomain={handleVerifyDomain}
                onForceVerify={handleForceVerifyDomain}
                onDeleteDomain={handleDeleteDomain}
                onUpdateDomain={handleUpdateDomain}
                isDemoMode={isDemoMode}
                loading={dbLoading}
              />
            )}

            {currentView === 'aliases' && (
              <AccountManager
                domain={domain}
                aliases={aliases}
                onAddAlias={handleAddAlias}
                onDeleteAlias={handleDeleteAlias}
                loading={dbLoading}
              />
            )}

            {currentView === 'webmail' && aliases.length > 0 && (
              <WebmailClient
                domain={domain}
                aliases={aliases}
                messages={messages}
                onSendMessage={handleSendMessage}
                onReceiveSimulatedMessage={handleReceiveSimulatedMessage}
                onDeleteMessage={handleDeleteMessage}
                onMarkRead={handleMarkRead}
                storageUsedBytes={userProfile?.storageUsedBytes || 0}
                onSyncIMAP={handleSyncIMAP}
                onUpdateMessageFolder={handleUpdateMessageFolder}
              />
            )}

            {currentView === 'gmail' && (
              <GmailConnector
                contacts={contacts}
                onAddContact={handleAddContact}
                onDeleteContact={handleDeleteContact}
                onImportContacts={handleImportContacts}
                loading={dbLoading}
              />
            )}

            {currentView === 'settings' && (
              <SettingsPanel
                domain={domain}
                aliases={aliases}
                onAddAlias={handleAddAlias}
                onDeleteAlias={handleDeleteAlias}
                storageUsedBytes={userProfile?.storageUsedBytes || 0}
              />
            )}

            {currentView === 'admin' && (user?.email?.toLowerCase() === 'safeness.c.a@gmail.com' || isAdminSimulated) && (
              <AdminDashboard
                currentUserEmail={user?.email || 'safeness.c.a@gmail.com'}
                isDemoMode={isDemoMode}
              />
            )}

            {currentView === 'architecture' && (
              <MultiDomainArchitecture 
                userEmail={user?.email || undefined}
              />
            )}

            {currentView === 'publish' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                      <Cloud className="h-5 w-5 text-emerald-600 mr-2 shrink-0" /> Despliega tu propia instancia en Google Cloud Run
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sube la aplicación unida al Starter Tier gratuito.</p>
                  </div>

                  <div className="border border-slate-150 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950 p-4 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
                      <Database className="h-4 w-4 mr-1.5 text-emerald-600 shrink-0" />
                      Estado de Contenedor Docker:
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-205 dark:border-slate-800/80 shadow-xs">
                        <span className="text-[10px] text-slate-400 block font-mono">CPU / Hilos</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">0.25 vCPU</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-205 dark:border-slate-800/80 shadow-xs">
                        <span className="text-[10px] text-slate-400 block font-mono">Límite Base</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Free Tier</span>
                      </div>
                    </div>

                    <button
                      id="btn-trigger-publish"
                      onClick={triggerAppPublishDeployment}
                      disabled={deploying}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center shadow-xs cursor-pointer"
                    >
                      {deploying ? (
                        <> <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Compilando... </>
                      ) : (
                        <> <Play className="h-4 w-4 mr-1.5" /> Publicar App </>
                      )}
                    </button>
                  </div>

                  {(deployLogs.length > 0 || deploying) && (
                    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-350 shadow-inner">
                      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 mb-3">
                        <Terminal className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-slate-400 text-xs">gcloud_run_publisher.sh</span>
                        <div className="flex-1 text-right">
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/60 px-1.5 py-0.5 rounded tracking-wider">
                            {deploying ? "ACTIVO" : "COMPLETADO"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                        {deployLogs.map((log, i) => (
                          <p key={i} className="text-xs break-all leading-relaxed">{log}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                      <Github className="h-5 w-5 mr-2 shrink-0" /> Exporta tu consola a GitHub
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                      Lleva tu desarrollo al siguiente nivel. Clona el código estructurado en Node.js, modifica los archivos de políticas y añade tu propio proveedor de base de datos.
                    </p>

                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
                        <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        Beneficios:
                      </h4>
                      <ul className="text-xs text-slate-505 dark:text-slate-400 space-y-2 pl-2">
                        <li>• Elimina el límite gratuito de 15 casillas.</li>
                        <li>• Sustituye el almacenamiento por PostgreSQL.</li>
                        <li>• Incorpora tu propio SMTP comercial.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="referrer"
                      className="flex-1 inline-flex items-center justify-center py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition shadow-xs"
                    >
                      <Github className="h-4 w-4 mr-1.5 animate-pulse" /> Clona en GitHub <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </div>

              </div>
            )}
          </main>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
          <div className="absolute w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center space-y-3 relative z-10">
            <div className="relative inline-block w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
              <div className="absolute inset-1.5 rounded-full border-2 border-dashed border-pink-400 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
              <div className="absolute inset-4 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center">
                <Mail className="h-5 w-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            
            <h1 className="text-2xl font-black font-display tracking-wider text-white uppercase neon-text-cyan">
              FREEMAIL
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-[#a0a0a0] font-sans font-bold block">
              by Safeness.Inc
            </span>
            
            <p className="text-[10px] text-slate-500 font-mono pt-4 transition uppercase tracking-widest leading-none">
              Iniciando Consola Encriptada...
            </p>
          </div>
          
          <div className="absolute bottom-8 font-mono text-[9px] text-slate-650 tracking-wider">
            © 2026 Safeness.Inc - Todos los derechos reservados
          </div>
        </div>
      )}
    </div>
  );
}
