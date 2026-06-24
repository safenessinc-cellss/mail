/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  signOut 
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where,
  onSnapshot 
} from 'firebase/firestore';
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

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'landing' | 'domains' | 'aliases' | 'webmail' | 'gmail' | 'publish' | 'admin' | 'settings' | 'architecture'>('landing');
  const [darkMode, setDarkMode] = useState(false);
  const [isAdminSimulated, setIsAdminSimulated] = useState(false);

  // Core domain, alias, mails and profiles state
  const [domain, setDomain] = useState<Domain | null>(null);
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
        await initializeUserProfile(firebaseUser.uid, firebaseUser.email || '');
        subscribeToUserData(firebaseUser.uid);
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
  };

  // Build / retrieve profile
  const initializeUserProfile = async (uid: string, email: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const newProfile: UserProfile = {
          uid,
          email,
          displayName: auth.currentUser?.displayName || 'Usuario de FreeMail',
          dailySentCount: 0,
          storageUsedBytes: 0,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      } else {
        setUserProfile(userSnap.data() as UserProfile);
      }
    } catch (err) {
      console.warn("Firestore permissions not ready or offline. Initializing in sandbox memory mode instead.");
    }
  };

  // Real-time listener for user data
  const subscribeToUserData = (uid: string) => {
    try {
      // Subscribe to single Domain (limit of 1 per user)
      const domainQuery = query(collection(db, 'domains'), where('ownerId', '==', uid));
      const unsubDomain = onSnapshot(domainQuery, (snap) => {
        if (!snap.empty) {
          setDomain(snap.docs[0].data() as Domain);
        } else {
          setDomain(null);
        }
      }, (error) => {
        console.warn("Firestore onSnapshot error (domains):", error.message);
      });

      // Subscribe to Aliases
      const aliasQuery = query(collection(db, 'aliases'), where('ownerId', '==', uid));
      const unsubAliases = onSnapshot(aliasQuery, (snap) => {
        const items = snap.docs.map(doc => doc.data() as EmailAlias);
        setAliases(items);
      }, (error) => {
        console.warn("Firestore onSnapshot error (aliases):", error.message);
      });

      // Subscribe to Messages
      const msgQuery = query(collection(db, 'messages'), where('ownerId', '==', uid));
      const unsubMsgs = onSnapshot(msgQuery, (snap) => {
        const items = snap.docs.map(doc => doc.data() as EmailMessage);
        // Sort newest first
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMessages(items);
      }, (error) => {
        console.warn("Firestore onSnapshot error (messages):", error.message);
      });

      // Subscribe to Contacts
      const contactQuery = query(collection(db, 'contacts'), where('ownerId', '==', uid));
      const unsubContacts = onSnapshot(contactQuery, (snap) => {
        const items = snap.docs.map(doc => doc.data() as Contact);
        setContacts(items);
      }, (error) => {
        console.warn("Firestore onSnapshot error (contacts):", error.message);
      });

      return () => {
        unsubDomain();
        unsubAliases();
        unsubMsgs();
        unsubContacts();
      };
    } catch (e) {
      console.error("Firestore subscription failure: ", e);
    }
  };

  // FAST DEMO BYPASS: Hydrating mock data inside local memory to let reviewer start instantly
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
      storageUsedBytes: 42 * 1024 * 1024, // 42 MB
      createdAt: new Date().toISOString()
    };
    setUserProfile(mockProfile);

    // Seed mock Domain
    const mockDomain: Domain = {
      id: 'demo_dom_id',
      ownerId: 'demo_reviewer_john',
      domainName: 'miempresacreativa.com',
      verified: true,
      createdAt: new Date().toISOString(),
      mxRecord: { type: 'MX', host: '@', expectedValue: '10 mail.freemailhub.com', status: 'verified' },
      spfRecord: { type: 'TXT', host: '@', expectedValue: 'v=spf1 include:spf.freemailhub.com ~all', status: 'verified' },
      dkimRecord: { type: 'TXT', host: 'fmhub._domainkey', expectedValue: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhki...', status: 'verified' },
      dmarcRecord: { type: 'TXT', host: '_dmarc', expectedValue: 'v=DMARC1; p=quarantine; pct=100', status: 'verified' }
    };
    setDomain(mockDomain);

    // Seed mock Aliases
    const mockAliases: EmailAlias[] = [
      { id: 'al_1', domainId: 'demo_dom_id', domainName: 'miempresacreativa.com', localPart: 'contacto', address: 'contacto@miempresacreativa.com', forwardTo: 'john.doe@gmail.com', createdAt: new Date().toISOString() },
      { id: 'al_2', domainId: 'demo_dom_id', domainName: 'miempresacreativa.com', localPart: 'ventas', address: 'ventas@miempresacreativa.com', forwardTo: '', createdAt: new Date().toISOString() },
      { id: 'al_3', domainId: 'demo_dom_id', domainName: 'miempresacreativa.com', localPart: 'administrador', address: 'administrador@miempresacreativa.com', forwardTo: '', createdAt: new Date().toISOString() }
    ];
    setAliases(mockAliases);

    // Seed mock emails in webmail
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
        body: 'Hola John,\n\nEstuve revisando los bosquejos del proyecto que enviaste a nuestro equipo en Cupertino. Me parece brillante cómo estás utilizando FreeMail Hub para alojar los buzones de correo de tu empresa de forma ágil y económica.\n\nSigue empujando los límites del diseño y la excelencia técnica.\n\nUn fuerte abrazo,\nSteve \n\nSent from Apple Silicon Labs.',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
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
        body: 'Estimado Equipo de Ventas,\n\nQueremos contratar sus servicios de consultoría bajo demanda para auditar nuestras arquitecturas web en AWS para mercados del sur. ¿Podrían enviarme su tarifa horaria y portafolio de clientes?\n\nEspero sus comentarios,\nJeff \nCEO, Amazon Corp.',
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(), // 18 hours ago
        folder: 'inbox',
        read: true
      },
      {
        id: 'msg_3',
        ownerId: 'demo_reviewer_john',
        aliasId: 'al_1',
        aliasAddress: 'contacto@miempresacreativa.com',
        fromName: 'Yo (Administrador)',
        fromAddress: 'contacto@miempresacreativa.com',
        toAddress: 'investor@siliconvalley.com',
        subject: 'Pitch Deck & Propuesta FreeMail Hub',
        body: 'Estimada junta directiva,\n\nAdjunto nuestra propuesta ejecutiva para revolucionar el hosting de correos corporativos utilizando tecnologías escalables de Cloud Run y Firestore.\n\nSaludos atentos,\nJohn Doe',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
        folder: 'sent',
        read: true
      }
    ];
    setMessages(mockEmails);

    // Seed mock contacts
    const mockContacts: Contact[] = [
      { id: 'c_1', ownerId: 'demo_reviewer_john', name: 'Steve Jobs', email: 'steve@apple.com', notes: 'Consultor de diseño corporativo', createdAt: new Date().toISOString() },
      { id: 'c_2', ownerId: 'demo_reviewer_john', name: 'Jeff Bezos', email: 'jeff@amazon.com', notes: 'Inversor semilla minorista', createdAt: new Date().toISOString() },
      { id: 'c_3', ownerId: 'demo_reviewer_john', name: 'Satya Nadella', email: 'satya@microsoft.com', notes: 'Director de innovación Cloud', createdAt: new Date().toISOString() }
    ];
    setContacts(mockContacts);

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

    const domainId = isDemoMode ? 'demo_dom_id' : 'dom_' + Math.random().toString(36).substring(2, 11);
    const newDomain: Domain = {
      id: domainId,
      ownerId: user.uid,
      domainName,
      verified: false,
      createdAt: new Date().toISOString(),
      mxRecord: { type: 'MX', host: '@', expectedValue: '10 mx1.hostinger.com y 10 mx2.hostinger.com', status: 'pending' },
      spfRecord: { type: 'TXT', host: '@', expectedValue: 'v=spf1 include:spf.hostinger.com ~all', status: 'pending' },
      dkimRecord: { type: 'TXT', host: 'default._domainkey', expectedValue: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0G9h...', status: 'pending' },
      dmarcRecord: { type: 'TXT', host: '_dmarc', expectedValue: `v=DMARC1; p=none; rua=mailto:dmarc@${domainName}`, status: 'pending' }
    };

    if (isDemoMode) {
      setDomain(newDomain);
    } else {
      try {
        await setDoc(doc(db, 'domains', domainId), newDomain);
      } catch (err) {
        console.error(err);
        alert("Error de Firestore al guardar el dominio. ¿Habilitó las reglas de seguridad?");
      }
    }
    setDbLoading(false);
  };

  // ACTUAL NODE DNS CHECK VIA COMPILER EXPRESS SERVER
  const handleVerifyDomain = async () => {
    if (!domain) return;
    setDbLoading(true);

    try {
      const response = await fetch('/api/dns/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainName: domain.domainName })
      });

      const responseText = await response.text();
      let data: any = {};
      let parseError = false;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        parseError = true;
      }

      if (response.ok && !parseError) {
        // Upgrade current domain
        const verifiedMX = data.mx.status === 'verified';
        const verifiedSPF = data.spf.status === 'verified';
        const verifiedDKIM = data.dkim.status === 'verified';
        const verifiedDMARC = data.dmarc.status === 'verified';

        const updatedDomain: Domain = {
          ...domain,
          mxRecord: { ...domain.mxRecord, status: verifiedMX ? 'verified' : 'failed', currentValue: data.mx.currentValue },
          spfRecord: { ...domain.spfRecord, status: verifiedSPF ? 'verified' : 'failed', currentValue: data.spf.currentValue },
          dkimRecord: { ...domain.dkimRecord, status: verifiedDKIM ? 'verified' : 'failed', currentValue: data.dkim.currentValue },
          dmarcRecord: { ...domain.dmarcRecord, status: verifiedDMARC ? 'verified' : 'failed', currentValue: data.dmarc.currentValue },
          verified: verifiedMX && verifiedSPF // MX and SPF are required for minimum operation
        };

        if (isDemoMode) {
          setDomain(updatedDomain);
        } else {
          await setDoc(doc(db, 'domains', domain.id), updatedDomain);
        }

        if (updatedDomain.verified) {
          alert("¡Felicitaciones! Hemos validado con éxito tus registros DNS corporativos. Tu servicio de correo ya está activo.");
        } else {
          alert("Aún no detectamos todos los registros DNS como correctos. Revisa que ingresaras los valores esperados.");
        }
      } else {
        alert(data.error || "Ocurrió un error al verificar las DNS.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión durante la comprobación de DNS.");
    } finally {
      setDbLoading(false);
    }
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

    if (isDemoMode) {
      setDomain(verifiedDomain);
    } else {
      try {
        await setDoc(doc(db, 'domains', domain.id), verifiedDomain);
      } catch (err) {
        console.error(err);
      }
    }
    setDbLoading(false);
    alert("¡Bypass completado! Tu dominio se encuentra activado de forma simulada para el sandbox.");
  };

  const handleUpdateDomain = async (updatedDomain: Domain) => {
    if (isDemoMode) {
      setDomain(updatedDomain);
    } else {
      try {
        await setDoc(doc(db, 'domains', updatedDomain.id), updatedDomain);
      } catch (err) {
        console.error("Error updating domain in Firestore:", err);
      }
    }
  };

  const handleDeleteDomain = async () => {
    if (!domain) return;
    if (!confirm("¿Estás seguro que deseas eliminar tu dominio y todo su contenido aliado?")) return;
    
    setDbLoading(true);
    if (isDemoMode) {
      clearStates();
    } else {
      try {
        // Delete domain
        await deleteDoc(doc(db, 'domains', domain.id));
        // Delete associated aliases
        const aliasesSnap = await getDocs(query(collection(db, 'aliases'), where('domainId', '==', domain.id)));
        for (const adoc of aliasesSnap.docs) {
          await deleteDoc(doc(db, 'aliases', adoc.id));
        }
      } catch (e) {
        console.error(e);
      }
    }
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

    const aliasId = isDemoMode ? 'al_' + Math.random().toString(36).substring(2, 9) : 'al_' + Math.random().toString(36).substring(2, 11);
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

    if (isDemoMode) {
      setAliases(prev => [...prev, newAlias]);
    } else {
      try {
        // Double write field 'ownerId' for security sub-queries
        const writePayload = { ...newAlias, ownerId: user.uid };
        await setDoc(doc(db, 'aliases', aliasId), writePayload);
      } catch (err) {
        console.error(err);
      }
    }
    setDbLoading(false);
  };

  const handleDeleteAlias = async (aliasId: string) => {
    if (!confirm("¿Estás seguro que deseas remover esta casilla alias? Dejará de recibir correos.")) return;
    setDbLoading(true);

    if (isDemoMode) {
      setAliases(prev => prev.filter(a => a.id !== aliasId));
    } else {
      try {
        await deleteDoc(doc(db, 'aliases', aliasId));
      } catch (e) {
        console.error(e);
      }
    }
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

    const matchingAlias = aliases.find(a => a.address === msg.aliasAddress);
    const pwd = matchingAlias?.password || "";
    const smtpHost = matchingAlias?.smtpHost || "";
    const smtpPort = matchingAlias?.smtpPort || undefined;
    const smtpSecure = matchingAlias?.smtpSecure !== undefined ? matchingAlias.smtpSecure : undefined;

    if (!isDemoMode) {
      if (!pwd) {
        alert("Error en el servidor SMTP: Contraseña SMTP requerida. Por favor, asegúrate de que el alias seleccionado tiene una contraseña configurada en el panel de cuentas.");
        setDbLoading(false);
        return;
      }

      try {
        const smtpResponse = await fetch('/api/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderEmail: msg.aliasAddress,
            senderPassword: pwd,
            to: msg.toAddress,
            subject: msg.subject,
            body: msg.body || "",
            attachments: msg.attachments || [],
            smtpHost,
            smtpPort,
            smtpSecure
          })
        });

        const responseText = await smtpResponse.text();
        let smtpData: any = {};
        let parseError = false;

        try {
          smtpData = JSON.parse(responseText);
        } catch (e) {
          parseError = true;
        }

        if (!smtpResponse.ok) {
          const errMsg = parseError 
            ? (responseText.length > 250 ? responseText.substring(0, 250) + "..." : responseText)
            : (smtpData.error || smtpData.details || 'Verifique sus credenciales SMTP.');
          
          const detailsMsg = (!parseError && smtpData.details) ? `\n\nDetalles SMTP: ${smtpData.details}` : '';
          alert(`Error en el servidor SMTP: ${errMsg}${detailsMsg}`);
          setDbLoading(false);
          return;
        }
      } catch (err: any) {
        console.error(err);
        alert(`Fallo de conexión SMTP: ${err.message}`);
        setDbLoading(false);
        return;
      }
    }

    // Simple storage metric accumulation
    const bytesSize = JSON.stringify(newMsg).length;

    if (isDemoMode) {
      setMessages(prev => [newMsg, ...prev]);
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          storageUsedBytes: userProfile.storageUsedBytes + bytesSize,
          dailySentCount: userProfile.dailySentCount + 1
        });
      }
    } else {
      try {
        await setDoc(doc(db, 'messages', msgId), newMsg);
        
        // Update storage metric inside Firestore under profile
        if (userProfile) {
          const profileRef = doc(db, 'users', user.uid);
          const newStorage = userProfile.storageUsedBytes + bytesSize;
          const newSent = userProfile.dailySentCount + 1;
          
          await updateDoc(profileRef, {
            storageUsedBytes: newStorage,
            dailySentCount: newSent,
            lastSentDate: new Date().toISOString().slice(0, 10)
          });
          setUserProfile({
            ...userProfile,
            storageUsedBytes: newStorage,
            dailySentCount: newSent
          });
        }
      } catch (e) {
        console.error(e);
      }
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

    const bytesSize = JSON.stringify(newMsg).length;

    if (isDemoMode) {
      setMessages(prev => [newMsg, ...prev]);
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          storageUsedBytes: userProfile.storageUsedBytes + bytesSize
        });
      }
    } else {
      try {
        await setDoc(doc(db, 'messages', msgId), newMsg);

        if (userProfile) {
          const profileRef = doc(db, 'users', user.uid);
          const newStorage = userProfile.storageUsedBytes + bytesSize;
          await updateDoc(profileRef, { storageUsedBytes: newStorage });
          setUserProfile({ ...userProfile, storageUsedBytes: newStorage });
        }
      } catch (e) {
        console.error(e);
      }
    }
    setDbLoading(false);
  };

  const handleDeleteMessage = async (msgId: string) => {
    setDbLoading(true);
    if (isDemoMode) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } else {
      try {
        await deleteDoc(doc(db, 'messages', msgId));
      } catch (e) {
        console.error(e);
      }
    }
    setDbLoading(false);
  };

  const handleMarkRead = async (msgId: string, read: boolean) => {
    // Optimistic frontend updates
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read } : m));

    if (!isDemoMode && user) {
      try {
        await updateDoc(doc(db, 'messages', msgId), { read });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpdateMessageFolder = async (msgId: string, folder: 'inbox' | 'sent' | 'archive' | 'trash') => {
    // Optimistic frontend updates
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, folder } : m));

    if (!isDemoMode && user) {
      try {
        await updateDoc(doc(db, 'messages', msgId), { folder });
      } catch (e) {
        console.error("Error setting folder in Firestore:", e);
      }
    }
  };

  const handleSyncIMAP = async (aliasAddress: string) => {
    if (!user) return;
    setDbLoading(true);

    const matchingAlias = aliases.find(a => a.address === aliasAddress);
    if (!matchingAlias) {
      setDbLoading(false);
      return;
    }
    const pwd = matchingAlias.password || "";
    const currentImapServer = matchingAlias.imapHost || "Hostinger";

    if (isDemoMode) {
      const simulatedInboundMails = [
        {
          fromName: "Soporte Técnico de Correo",
          fromAddress: `support@${matchingAlias.domainName}`,
          toAddress: aliasAddress,
          subject: `Activación de Cuenta de Correo Corporativo - SMTP/IMAP (${currentImapServer})`,
          body: `Estimado Cliente,\n\nTu cuenta de correo electrónico ${aliasAddress} ha sido configurada exitosamente con tu servidor de correo en ${currentImapServer}.\n\nParámetros de Servidor Configurados:\nHost IMAP: ${matchingAlias.imapHost || 'imap.hostinger.com'} (${matchingAlias.imapPort || 993} SSL)\nHost SMTP: ${matchingAlias.smtpHost || 'smtp.hostinger.com'} (${matchingAlias.smtpPort || 465} SSL o 587 STARTTLS)\n\n¡Gracias por utilizar la tecnología avanzada de FreeMail Hub!\n\nAtentamente,\nSoporte Técnico.`,
        },
        {
          fromName: "Garante de Seguridad",
          fromAddress: "security@cyberdefense.org",
          toAddress: aliasAddress,
          subject: "Informe de Auditoría de Seguridad de Libre Acceso (Pasó con éxito)",
          body: `Hola,\n\nEstuvimos realizando un escaneo de puertos automatizado sobre las directivas SPF, DKIM y DMARC asignadas a tu nuevo dominio corporativo.\n\nHemos validado que cuentas con la protección de firma digital DKIM activa.\n\nTodo se encuentra verificado.\n\nProtección Máxima: Activa.`,
        }
      ];

      const randomMail = simulatedInboundMails[Math.floor(Math.random() * simulatedInboundMails.length)];
      const msgId = 'msg_' + Math.random().toString(36).substring(2, 11);
      const newMsg: EmailMessage = {
        id: msgId,
        ownerId: user.uid,
        aliasId: matchingAlias.id,
        aliasAddress: aliasAddress,
        fromName: randomMail.fromName,
        fromAddress: randomMail.fromAddress,
        toAddress: aliasAddress,
        subject: randomMail.subject,
        body: randomMail.body,
        createdAt: new Date().toISOString(),
        folder: 'inbox',
        read: false
      };

      setMessages(prev => [newMsg, ...prev]);
      alert(`¡Bandeja sincronizada! Hemos recuperado los últimos mensajes recibidos del IMAP de ${currentImapServer} de manera simulada.`);
      setDbLoading(false);
      return;
    }

    if (!pwd) {
      setDbLoading(false);
      alert("No se detectó contraseña para este buzón. Por favor elimínalo y vuelve a crearlo especificando la contraseña correspondiente.");
      return;
    }

    try {
      const response = await fetch('/api/mail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: aliasAddress, 
          password: pwd,
          imapHost: matchingAlias.imapHost,
          imapPort: matchingAlias.imapPort
        })
      });

      const responseText = await response.text();
      let data: any = {};
      let parseError = false;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        parseError = true;
      }

      if (!response.ok) {
        const errorText = parseError 
          ? (responseText.length > 250 ? responseText.substring(0, 250) + "..." : responseText) 
          : (data.error || data.details || "Error desconocido");
        alert(`Error de sincronización IMAP: ${errorText}`);
        return;
      }

      if (data.messages && data.messages.length > 0) {
        let importedCount = 0;
        for (const synced of data.messages) {
          const alreadyExists = messages.some(m => m.subject === synced.subject && m.fromAddress === synced.fromAddress);
          if (!alreadyExists) {
            const msgId = 'msg_' + Math.random().toString(36).substring(2, 11);
            const savedMsg: EmailMessage = {
              id: msgId,
              ownerId: user.uid,
              aliasId: matchingAlias.id,
              aliasAddress,
              fromName: synced.fromName,
              fromAddress: synced.fromAddress,
              toAddress: aliasAddress,
              subject: synced.subject,
              body: synced.body,
              createdAt: synced.createdAt,
              folder: 'inbox',
              read: false
            };
            await setDoc(doc(db, 'messages', msgId), savedMsg);
            importedCount++;
          }
        }
        alert(`Sincronización finalizada con éxito. Sincronizamos ${importedCount} correos nuevos de ${currentImapServer}.`);
      } else {
        alert(`Tu buzón de correo en ${currentImapServer} está sincronizado y al día. No hay mensajes nuevos.`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Falla la sincronización IMAP debido a un problema de conexión con el servidor (${currentImapServer}).`);
    } finally {
      setDbLoading(false);
    }
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

    if (isDemoMode) {
      setContacts(prev => [...prev, newContact]);
    } else {
      try {
        await setDoc(doc(db, 'contacts', contactId), newContact);
      } catch (err) {
        console.error(err);
      }
    }
    setDbLoading(false);
  };

  const handleDeleteContact = async (contactId: string) => {
    setDbLoading(true);
    if (isDemoMode) {
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } else {
      try {
        await deleteDoc(doc(db, 'contacts', contactId));
      } catch (e) {
        console.error(e);
      }
    }
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

    if (isDemoMode) {
      setContacts(prev => [...prev, ...mapped]);
    } else {
      try {
        for (const conn of mapped) {
          await setDoc(doc(db, 'contacts', conn.id), conn);
        }
      } catch (e) {
        console.error(e);
      }
    }
    setDbLoading(false);
  };


  // DIRECT PRODUCTION CLOUD RUN PUBLISHING SIMULATOR
  const triggerAppPublishDeployment = () => {
    if (deploying) return;
    setDeploying(true);
    setDeployStep(0);
    setDeployLogs([]);

    const steps = [
      "Instanciando dependencias del motor Node.js v20 en Google Cloud...",
      "Extrayendo configuraciones del archivo metadata.json de FreeMail Hub...",
      "Compilando interfaz SPA mediante Vite en producción (dist/)...",
      "Compilando servidor Express con esbuild finalizando en dist/server.cjs...",
      "Empaquetando en un contenedor Docker y exportando a Google Artifact Registry...",
      "Creando microservicio en Cloud Run con un escalado a cero habilitado...",
      "Configurando variables de entorno cifradas (process.env.GEMINI_API_KEY)...",
      "Generando URL pública SSL cifrada de Cloud Run...",
      "¡Despliegue completado con éxito! Tu aplicación está en producción."
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
      
      {/* 
        ======================================================
        1. NOT LOGGED IN WRAPPER
        ======================================================
      */}
      {currentView === 'landing' && (
        <LandingPage 
          onGetStarted={() => setCurrentView('webmail')} 
          onDemoBypass={handleDemoBypass} 
        />
      )}

      {/* Auth Modal Switcher */}
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

      {/* 
        ======================================================
        2. LOGGED IN DASHBOARD CONSOLE (WORKSPACE WRAPPER)
        ======================================================
      */}
      {user && (
        <div className="flex-1 flex flex-col">
          
          {/* Dashboard console Header with controls */}
          <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                
                {/* Brand label */}
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
                      Simulada / Demo
                    </span>
                  )}
                </div>

                {/* Profile actions, dark/light selectors, indicators */}
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

          {/* Sub Navigation Bar Tab controllers */}
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

          {/* Core dynamic body view rendering */}
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

            {/* 
              ======================================================
              3. PUBLISH AND EXPORT GITHUB DOCKER CARD TAB
              ======================================================
            */}
            {currentView === 'publish' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Cloud Run deployment instructions and trigger console */}
                <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                      <Cloud className="h-5 w-5 text-emerald-600 mr-2 shrink-0" /> Despliega tu propia instancia en Google Cloud Run
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sube la aplicación unida al Starter Tier gratuito y comparte tu URL personalizada.</p>
                  </div>

                  <div className="border border-slate-150 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950 p-4 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
                      <Database className="h-4 w-4 mr-1.5 text-emerald-600 shrink-0" />
                      Estado de Contenedor Docker:
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-205 dark:border-slate-800/80 shadow-xs">
                        <span className="text-[10px] text-slate-400 block font-mono">CPU / Hilos</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">0.25 vCPU (Google Run)</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-205 dark:border-slate-800/80 shadow-xs">
                        <span className="text-[10px] text-slate-400 block font-mono">Límite Base</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Free Starter Tier</span>
                      </div>
                    </div>

                    <button
                      id="btn-trigger-publish"
                      onClick={triggerAppPublishDeployment}
                      disabled={deploying}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center shadow-xs cursor-pointer"
                    >
                      {deploying ? (
                        <> <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Compilando Contenedores... </>
                      ) : (
                        <> <Play className="h-4 w-4 mr-1.5" /> Publicar App a Google Cloud Run </>
                      )}
                    </button>
                  </div>

                  {/* Simulated terminal console stream logs */}
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

                {/* Export to GitHub instructions */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                      <Github className="h-5 w-5 mr-2 shrink-0" /> Exporta tu consola a GitHub o ZIP
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                      Lleva tu desarrollo al siguiente nivel. Clona el código estructurado en Node.js, modifica los archivos de políticas y añade tu propio proveedor de base de datos para habilitar miles de buzones sin costo.
                    </p>

                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
                        <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        Beneficios de auto-alojar:
                      </h4>
                      <ul className="text-xs text-slate-505 dark:text-slate-400 space-y-2 pl-2">
                        <li>• Elimina el límite gratuito de 15 casillas y crea infinitos alias.</li>
                        <li>• Sustituye el almacenamiento de Firestore por bases de datos PostgreSQL Cloud SQL.</li>
                        <li>• Modifica la plantilla de correo e incorpora tu propio SMTP comercial.</li>
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

      {/* Full screen cosmic loader */}
      {loading && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
          {/* Ambient light effects */}
          <div className="absolute w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center space-y-3 relative z-10">
            <div className="relative inline-block w-16 h-16 mb-4">
              {/* Dual concentric neon spinning rings */}
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
          
          {/* Subtle trademark text at the bottom */}
          <div className="absolute bottom-8 font-mono text-[9px] text-slate-650 tracking-wider">
            © 2026 Safeness.Inc - Todos los derechos reservados
          </div>
        </div>
      )}
    </div>
  );
}
