/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { Domain, EmailAlias, UserProfile, EmailMessage } from '../types';
import { 
  Shield, 
  Users, 
  Globe, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Trash2, 
  AlertTriangle, 
  Database, 
  Mail, 
  UserPlus, 
  Check, 
  RefreshCw, 
  TrendingUp, 
  Award,
  Sparkles,
  SearchCode,
  Sliders,
  Filter,
  ArrowUpRight
} from 'lucide-react';

interface AdminDashboardProps {
  currentUserEmail: string;
  isDemoMode: boolean;
  onRefreshStats?: () => void;
}

export default function AdminDashboard({ currentUserEmail, isDemoMode }: AdminDashboardProps) {
  // Data lists
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allDomains, setAllDomains] = useState<Domain[]>([]);
  const [allAliases, setAllAliases] = useState<EmailAlias[]>([]);
  const [allMessagesCount, setAllMessagesCount] = useState<number>(0);
  
  // UI selectors & search
  const [activeTab, setActiveTab] = useState<'stats' | 'domains' | 'aliases' | 'users'>('stats');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User limit adjustment variables
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newDailyLimit, setNewDailyLimit] = useState<number>(100);

  // Fetch all database records
  const loadAdminData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (isDemoMode) {
        // Seed highly detailed simulated system records for admin experience
        generateSimulatedData();
      } else {
        // Fetch all registered domains
        const domainSnap = await getDocs(collection(db, 'domains'));
        const domains = domainSnap.docs.map(doc => doc.data() as Domain);
        setAllDomains(domains);

        // Fetch all aliases
        const aliasSnap = await getDocs(collection(db, 'aliases'));
        const aliases = aliasSnap.docs.map(doc => doc.data() as EmailAlias);
        setAllAliases(aliases);

        // Fetch all users
        const userSnap = await getDocs(collection(db, 'users'));
        const users = userSnap.docs.map(doc => doc.data() as UserProfile);
        setAllUsers(users);

        // Fetch messages count roughly
        const msgSnap = await getDocs(collection(db, 'messages'));
        setAllMessagesCount(msgSnap.size);
      }
    } catch (err: any) {
      console.error("Error loading administration stats:", err);
      setErrorMsg("Ocurrió un error al obtener la base de datos distribuida: " + err.message);
      // Fallback to simulated if Firestore returns permissions error or empty
      generateSimulatedData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isDemoMode]);

  // Seed simulated data in case Firestore is empty or in local sandbox
  const generateSimulatedData = () => {
    const mockUsers: UserProfile[] = [
      { uid: 'u_1', email: 'safeness.c.a@gmail.com', displayName: 'Super Admin C.A', dailySentCount: 14, storageUsedBytes: 154 * 1024 * 1024, createdAt: '2026-05-10T12:00:00Z' },
      { uid: 'u_2', email: 'laura.gutierrez@innovation.es', displayName: 'Laura Gutiérrez (Premium)', dailySentCount: 88, storageUsedBytes: 450 * 1024 * 1024, createdAt: '2026-06-01T09:15:00Z' },
      { uid: 'u_3', email: 'pablo.ventas@retailglobal.cl', displayName: 'Ventas Pablo Retail', dailySentCount: 3, storageUsedBytes: 12 * 1024 * 1024, createdAt: '2026-06-12T17:40:00Z' },
      { uid: 'u_4', email: 'carlos.dev@vortex.io', displayName: 'Carlos Dev Vortex', dailySentCount: 0, storageUsedBytes: 0, createdAt: '2026-06-15T22:11:00Z' },
    ];

    const mockDomains: Domain[] = [
      {
        id: 'dom_1',
        ownerId: 'u_2',
        domainName: 'innovation.es',
        verified: true,
        createdAt: '2026-06-01T09:30:00Z',
        mxRecord: { type: 'MX', host: '@', expectedValue: '10 mx1.improvmx.com', status: 'verified' },
        spfRecord: { type: 'TXT', host: '@', expectedValue: 'v=spf1 include:spf.improvmx.com ~all', status: 'verified' },
        dkimRecord: { type: 'TXT', host: 'default._domainkey', expectedValue: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhki...', status: 'verified' },
        dmarcRecord: { type: 'TXT', host: '_dmarc', expectedValue: 'v=DMARC1; p=none; rua=mailto:dmarc@innovation.es', status: 'verified' }
      },
      {
        id: 'dom_2',
        ownerId: 'u_3',
        domainName: 'retailglobal.cl',
        verified: false,
        createdAt: '2026-06-12T17:45:00Z',
        mxRecord: { type: 'MX', host: '@', expectedValue: '10 mx1.improvmx.com', status: 'failed', currentValue: '10 ns1.miservidor.com' },
        spfRecord: { type: 'TXT', host: '@', expectedValue: 'v=spf1 include:spf.improvmx.com ~all', status: 'pending' },
        dkimRecord: { type: 'TXT', host: 'default._domainkey', expectedValue: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhki...', status: 'pending' },
        dmarcRecord: { type: 'TXT', host: '_dmarc', expectedValue: 'v=DMARC1; p=none; rua=mailto:dmarc@retailglobal.cl', status: 'pending' }
      },
      {
        id: 'dom_3',
        ownerId: 'u_4',
        domainName: 'vortex.io',
        verified: false,
        createdAt: '2026-06-15T22:15:00Z',
        mxRecord: { type: 'MX', host: '@', expectedValue: '10 mx1.improvmx.com', status: 'pending' },
        spfRecord: { type: 'TXT', host: '@', expectedValue: 'v=spf1 include:spf.improvmx.com ~all', status: 'pending' },
        dkimRecord: { type: 'TXT', host: 'default._domainkey', expectedValue: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhki...', status: 'pending' },
        dmarcRecord: { type: 'TXT', host: '_dmarc', expectedValue: 'v=DMARC1; p=none; rua=mailto:dmarc@vortex.io', status: 'pending' }
      }
    ];

    const mockAliases: EmailAlias[] = [
      { id: 'al_x1', domainId: 'dom_1', domainName: 'innovation.es', localPart: 'laura', address: 'laura@innovation.es', forwardTo: 'laura.gutierrez@innovation.es', createdAt: '2026-06-01T10:00:00Z' },
      { id: 'al_x2', domainId: 'dom_1', domainName: 'innovation.es', localPart: 'contacto', address: 'contacto@innovation.es', forwardTo: '', createdAt: '2026-06-01T10:05:00Z' },
      { id: 'al_x3', domainId: 'dom_2', domainName: 'retailglobal.cl', localPart: 'ventas', address: 'ventas@retailglobal.cl', forwardTo: 'pablo.ventas@retailglobal.cl', createdAt: '2026-06-12T18:00:00Z' }
    ];

    setAllUsers(mockUsers);
    setAllDomains(mockDomains);
    setAllAliases(mockAliases);
    setAllMessagesCount(284); 
  };

  // 1. AUTHORIZE / VERIFY DOMAIN (FORZADO ADMINISTRATIVO)
  const handleAuthorizeDomain = async (domainId: string) => {
    setLoading(true);
    setSuccessMsg(null);
    try {
      if (isDemoMode) {
        setAllDomains(prev => prev.map(d => {
          if (d.id === domainId) {
            return {
              ...d,
              verified: true,
              mxRecord: { ...d.mxRecord, status: 'verified' },
              spfRecord: { ...d.spfRecord, status: 'verified' },
              dkimRecord: { ...d.dkimRecord, status: 'verified' },
              dmarcRecord: { ...d.dmarcRecord, status: 'verified' }
            };
          }
          return d;
        }));
        setSuccessMsg("¡Dominio autorizado e incorporado de forma manual exitosamente!");
      } else {
        const domainRef = doc(db, 'domains', domainId);
        // Fetch original domain snapshot
        const domains = allDomains.find(d => d.id === domainId);
        if (domains) {
          const updatedDomain = {
            ...domains,
            verified: true,
            mxRecord: { ...domains.mxRecord, status: 'verified' as const },
            spfRecord: { ...domains.spfRecord, status: 'verified' as const },
            dkimRecord: { ...domains.dkimRecord, status: 'verified' as const },
            dmarcRecord: { ...domains.dmarcRecord, status: 'verified' as const }
          };
          await updateDoc(domainRef, {
            verified: true,
            'mxRecord.status': 'verified',
            'spfRecord.status': 'verified',
            'dkimRecord.status': 'verified',
            'dmarcRecord.status': 'verified'
          });
          setAllDomains(prev => prev.map(d => d.id === domainId ? updatedDomain : d));
          setSuccessMsg("¡Dominio e inquilino autorizado en los servidores centrales SPF/MX!");
        }
      }
    } catch (err: any) {
      setErrorMsg("Error al autorizar el dominio: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. DISMISS / DELETE DOMAIN
  const handleDeleteDomain = async (domainId: string) => {
    if (!window.confirm("¿Estás absolutamente seguro de eliminar y revocar la autorización de este dominio? Se bloquearán todas las casillas de correo asociadas.")) return;
    setLoading(true);
    setSuccessMsg(null);
    try {
      if (isDemoMode) {
        setAllDomains(prev => prev.filter(d => d.id !== domainId));
        // Remove related aliases as cascading delete
        setAllAliases(prev => prev.filter(a => a.domainId !== domainId));
        setSuccessMsg("Dominio y buzones revocados de la infraestructura SaaS.");
      } else {
        await deleteDoc(doc(db, 'domains', domainId));
        setAllDomains(prev => prev.filter(d => d.id !== domainId));
        
        // Find and delete associated aliases
        const associatedAliases = allAliases.filter(a => a.domainId === domainId);
        for (const alias of associatedAliases) {
          await deleteDoc(doc(db, 'aliases', alias.id));
        }
        setAllAliases(prev => prev.filter(a => a.domainId !== domainId));
        setSuccessMsg("Dominio revocado y cascada de casillas eliminada de forma segura.");
      }
    } catch (err: any) {
      setErrorMsg("Error al desautorizar / eliminar el dominio: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. SECURE DELETE EMAIL ALIAS / BUZÓN
  const handleDeleteAlias = async (aliasId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta dirección de correo? El usuario dejará de recibir emails en esta dirección nula.")) return;
    setLoading(true);
    setSuccessMsg(null);
    try {
      if (isDemoMode) {
        setAllAliases(prev => prev.filter(a => a.id !== aliasId));
        setSuccessMsg("Dirección rechazada y eliminada del servidor.");
      } else {
        await deleteDoc(doc(db, 'aliases', aliasId));
        setAllAliases(prev => prev.filter(a => a.id !== aliasId));
        setSuccessMsg("Dirección IMAP libre eliminada con éxito.");
      }
    } catch (err: any) {
      setErrorMsg("No se pudo purgar el alias: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. CHANGE USER SETTING CAP LIMIT
  const handleUpdateUserLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    setSuccessMsg(null);
    try {
      if (isDemoMode) {
        setAllUsers(prev => prev.map(u => {
          if (u.uid === selectedUser.uid) {
            return { ...u, dailySentCount: newDailyLimit };
          }
          return u;
        }));
        setSuccessMsg(`¡Límite de envíos diarios actualizado a ${newDailyLimit === 9999 ? 'Ilimitado (9999)' : newDailyLimit} para ${selectedUser.email}!`);
        setSelectedUser(null);
      } else {
        const userRef = doc(db, 'users', selectedUser.uid);
        await updateDoc(userRef, {
          dailySentCount: newDailyLimit
        });
        setAllUsers(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, dailySentCount: newDailyLimit } : u));
        setSuccessMsg(`Límite diario de ${selectedUser.displayName || selectedUser.email} actualizado exitosamente.`);
        setSelectedUser(null);
      }
    } catch (err: any) {
      setErrorMsg("Error al actualizar la cuota: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtering based on active tab & search term
  const filteredDomains = allDomains.filter(d => 
    d.domainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ownerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAliases = allAliases.filter(a => 
    a.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.localPart.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.domainName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Dynamic Success/Error Banners */}
      {successMsg && (
        <div className="flex items-center space-x-2.5 p-4 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900 rounded-2xl text-xs font-light animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center space-x-2.5 p-4 bg-rose-50 dark:bg-rose-950/35 text-rose-850 dark:text-rose-350 border border-rose-100 dark:border-rose-900 rounded-2xl text-xs font-light">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Admin Console Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-md">
        {/* Abstract Background Ring decor */}
        <div className="absolute -right-16 -top-16 w-64 h-64 border-[16px] border-emerald-500/10 rounded-full select-none pointer-events-none" />
        <div className="absolute right-32 bottom-[-40px] w-32 h-32 bg-indigo-500/10 blur-xl rounded-full select-none pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Consola Centralizada
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-350 font-mono flex items-center">
                <Shield className="h-3.5 w-3.5 text-emerald-400 mr-1 shrink-0" /> Super-Administrador Activo
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Panel de Control e Infraestructura Global
            </h1>
            <p className="text-xs text-slate-400 font-light max-w-2xl font-display">
              Administracion en tiempo real del SaaS. Autoriza solicitudes de MX/SPF, revoca dominios de la red, audita casillas vulnerables de usuarios y cambia cuotas operativas de transporte.
            </p>
          </div>

          <button
            onClick={loadAdminData}
            disabled={loading}
            className="self-start md:self-center inline-flex items-center justify-center p-3.5 bg-slate-800 hover:bg-slate-750 text-slate-100 rounded-xl transition cursor-pointer disabled:opacity-40"
            title="Refrescar Servidores"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Switcher Console */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'stats', label: 'Estadísticas e Informes', icon: <TrendingUp className="h-4 w-4" /> },
          { id: 'domains', label: `Autorizar Dominios (${allDomains.length})`, icon: <Globe className="h-4 w-4" /> },
          { id: 'aliases', label: `Buzones / Aliases (${allAliases.length})`, icon: <Layers className="h-4 w-4" /> },
          { id: 'users', label: `Usuarios y Límites (${allUsers.length})`, icon: <Users className="h-4 w-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setSearchTerm('');
            }}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 text-xs font-semibold tracking-tight transition cursor-pointer ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600 font-bold bg-emerald-50/5 dark:bg-emerald-950/5'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-350 dark:hover:text-slate-350'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SEARCH BAR (Unless on Stats Tab) */}
      {activeTab !== 'stats' && (
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800/85 px-3.5 py-1.5 rounded-2xl w-full max-w-md shadow-xs">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Buscar por dominio, email, alias...`}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-950 dark:text-white"
          />
        </div>
      )}

      {/* ====================================
          TAB 1: STATS AND ALERTS REPORT
          ==================================== */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Main Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Total Dominios</span>
                <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl"><Globe className="h-4 w-4" /></span>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-950 dark:text-white">{allDomains.length}</p>
                <div className="flex items-center space-x-1.5 text-xs text-emerald-600 font-medium">
                  <span>{allDomains.filter(d => d.verified).length} autorizados</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-slate-450 dark:text-slate-500 font-light">{allDomains.filter(d => !d.verified).length} pendientes</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Buzones Totales</span>
                <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl"><Layers className="h-4 w-4" /></span>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-950 dark:text-white">{allAliases.length}</p>
                <p className="text-neutral-510 dark:text-slate-500 text-xs font-light pt-0.5">
                  Promedio de {(allDomains.length > 0 ? (allAliases.length / allDomains.length).toFixed(1) : 0)} aliases por dominio.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Usuarios Registrados</span>
                <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl"><Users className="h-4 w-4" /></span>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-950 dark:text-white">{allUsers.length}</p>
                <p className="text-xs text-slate-400 font-light">
                  {isDemoMode ? 'Todos en modo local virtual' : 'Sincronizados en Firebase Auth'}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Tráfico SMTP</span>
                <span className="p-1.5 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl"><Mail className="h-4 w-4" /></span>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-950 dark:text-white">{allMessagesCount}</p>
                <p className="text-xs text-slate-400 font-light flex items-center">
                  <Database className="h-3 w-3 text-slate-400 mr-1" /> Mensajes transmitidos en total
                </p>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* System Status Bulletins */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center">
                <Sparkles className="h-4 w-4 text-amber-500 mr-2 shrink-0" /> Boletines Operativos & Alertas del Servidor
              </h3>

              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3.5 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-200/30 dark:border-amber-900/30 rounded-2xl">
                  <span className="bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg text-xs font-bold shrink-0">ALERTA</span>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Dominios Esperando SPF/MX ({allDomains.filter(d => !d.verified).length})</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-light leading-relaxed mt-0.5">
                      Hay inquilinos que registraron su dominio pero los DNS de origen SPF o MX fallaron o no están propagados. Puedes forzar la autorización si deseas activarlos sin verificar registros a través de la pestaña <strong className="font-semibold text-slate-700 dark:text-slate-350">Autorizar Dominios</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3.5 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-900/30 rounded-2xl">
                  <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg text-xs font-bold shrink-0">CUOTAS</span>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Límite por defecto de SMTP</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-light leading-relaxed mt-0.5">
                      Los usuarios de FreeMail Hub tienen un tope diario de 100 correos para evitar listas negras de spam SMTP. Puedes expandir este parámetro a usuarios confiables desde la pestaña de gestión de límites de usuarios.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3.5 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-900/30 rounded-2xl">
                  <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg text-xs font-bold shrink-0">ESTADO</span>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Autodiscover XML & Perfiles de Apple</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-light leading-relaxed mt-0.5">
                      El servidor central NodeJS en puerto 3000 está respondiendo correctamente a las peticiones XML automatizadas y firmando perfiles <code className="px-1 py-0.5 bg-slate-950 text-[10px] text-slate-300 font-mono rounded">.mobileconfig</code> iOS de forma fluida.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Profile Settings summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center">
                <Sliders className="h-4 w-4 text-blue-600 mr-2 shrink-0" />
                Info del Administrador
              </h3>

              <div className="space-y-4 pt-1">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Email Responsable</p>
                  <p className="text-xs text-slate-800 dark:text-slate-250 font-bold truncate">{currentUserEmail}</p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Modo de Operación</p>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-800 dark:text-slate-250 font-bold">
                    <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`} />
                    <span>{isDemoMode ? 'Virtual / Simulación local' : 'Conectado a Firebase Cloud'}</span>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-105/30 dark:border-blue-900/30 rounded-2xl text-xs font-light text-slate-600 dark:text-slate-400 leading-relaxed font-sans mt-2">
                  <p className="flex items-start gap-1">
                    <Award className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    Como administrador, posees privilegios absolutos sobre el backend. Estando en base de datos real o simulada, puedes purgar cualquier recurso inseguro de manera instantánea.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ====================================
          TAB 2: AUTHORIZE DOMAINS
          ==================================== */}
      {activeTab === 'domains' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-120">
          <div className="p-6 border-b border-slate-150 dark:border-slate-850">
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">
              Gestión y Autorización de Dominios Personalizados
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-light font-display">
              Permite a los usuarios saltar las verificaciones SPF/MX manuales del registrador. Autoriza al inquilino para habilitar la creación de casillas SMTP.
            </p>
          </div>

          {filteredDomains.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Globe className="h-8 w-8 text-slate-350 mx-auto" />
              <p className="text-xs">No se encontraron dominios registrados en el sistema bajo ese filtro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10.5px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    <th className="p-4">Dominio</th>
                    <th className="p-4">Registrante (Dueño)</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Creado el</th>
                    <th className="p-4 text-right">Acciones de Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                  {filteredDomains.map((dom) => (
                    <tr key={dom.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-slate-900 dark:text-white block">{dom.domainName}</span>
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">ID: {dom.id}</span>
                      </td>
                      <td className="p-4 text-slate-450 dark:text-slate-400 font-mono">
                        {allUsers.find(u => u.uid === dom.ownerId)?.email || dom.ownerId}
                      </td>
                      <td className="p-4">
                        {dom.verified ? (
                          <span className="inline-flex items-center text-[10.5px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/35 font-bold">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Autorizado / Verificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10.5px] text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-100/60 dark:border-amber-900/40 font-bold animate-pulse">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Esperando DNS de origen
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-450 dark:text-slate-400">
                        {new Date(dom.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {!dom.verified && (
                          <button
                            onClick={() => handleAuthorizeDomain(dom.id)}
                            disabled={loading}
                            className="inline-flex items-center justify-center p-2 text-[10.5px] font-bold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 dark:bg-emerald-950/30 dark:hover:bg-emerald-600 border border-emerald-100 dark:border-emerald-900 rounded-xl transition cursor-pointer disabled:opacity-40"
                            title="Autorizar Manualmente sin verificar DNS"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Autorizar
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDomain(dom.id)}
                          disabled={loading}
                          className="inline-flex items-center justify-center p-2 text-[10.5px] font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-600 border border-rose-100 dark:border-rose-900/50 rounded-xl transition cursor-pointer disabled:opacity-40"
                          title="Eliminar Dominio Inmmediatamente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ====================================
          TAB 3: ALIASES & BUZONES
          ==================================== */}
      {activeTab === 'aliases' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-120">
          <div className="p-6 border-b border-slate-150 dark:border-slate-850">
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">
              Inspección de Casillas y Direcciones de Correo
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-light font-display">
              Listado completo de todas las casillas nulas registradas en los dominios de los inquilinos. Puedes purgar casillas sospechosas del transporte global.
            </p>
          </div>

          {filteredAliases.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Layers className="h-8 w-8 text-slate-350 mx-auto" />
              <p className="text-xs">No se encontraron aliases de correo con ese criterio.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 text-[10.5px] uppercase font-bold tracking-wider text-slate-400 font-mono font-sans">
                    <th className="p-4">Dirección FreeMail</th>
                    <th className="p-4">Dominio de Origen</th>
                    <th className="p-4">Redireccionamiento (Forwarding)</th>
                    <th className="p-4">Creado el</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs text-slate-700 dark:text-slate-300">
                  {filteredAliases.map((alias) => (
                    <tr key={alias.id} className="hover:bg-slate-50/10 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="p-4 font-bold text-slate-950 dark:text-white font-mono">
                        {alias.address}
                      </td>
                      <td className="p-4 text-slate-500 font-light font-sans">
                        {alias.domainName}
                      </td>
                      <td className="p-4 font-mono">
                        {alias.forwardTo ? (
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-100/55 dark:border-emerald-900/40 font-semibold">
                            → {alias.forwardTo}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-light text-[10px]">Almacenado local en buzón nativo</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-450 dark:text-slate-400">
                        {new Date(alias.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteAlias(alias.id)}
                          disabled={loading}
                          className="p-2 text-rose-600 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 rounded-xl border border-rose-100 dark:border-rose-950 transition cursor-pointer"
                          title="Eliminar Casilla"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ====================================
          TAB 4: USERS & SMTP CAP LIMITS
          ==================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-120">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-150 dark:border-slate-850">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                Gestión de Cuotas de Envío SMTP por Usuario
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-light font-display">
                Cambia el limite diario de mensajes autorizados por usuario para evitar que se ponga en peligro la IP reputacional del servidor Express.
              </p>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Users className="h-8 w-8 text-slate-350 mx-auto" />
                <p className="text-xs">No se encontraron perfiles de usuario.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 text-[10.5px] uppercase font-bold tracking-wider text-slate-400 font-mono font-sans">
                      <th className="p-4">Usuario</th>
                      <th className="p-4">ID de Cuenta</th>
                      <th className="p-4">Creado</th>
                      <th className="p-4">Cuota Límite Diario</th>
                      <th className="p-4 text-right">Ajuste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                    {filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/10 dark:hover:bg-slate-950/20 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-slate-950 dark:text-white block">{u.displayName || 'Invitado FreeMail'}</span>
                          <span className="text-slate-450 dark:text-slate-400 font-mono text-[10.5px]">{u.email}</span>
                        </td>
                        <td className="p-4 text-slate-500 font-mono text-[10.5px]">
                          {u.uid}
                        </td>
                        <td className="p-4 text-slate-500 font-light">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {u.dailySentCount} correos/día
                            </span>
                            {u.dailySentCount > 100 ? (
                              <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-bold">PREMIUM EXPANDIDO</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-450 dark:border-slate-700 px-1.5 py-0.5 rounded text-[9px] font-mono">BÁSICO ESTÁNDAR</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewDailyLimit(u.dailySentCount);
                            }}
                            className="inline-flex items-center justify-center p-2 px-3 text-xs font-semibold text-emerald-600 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/30 rounded-xl border border-emerald-100/50 dark:border-emerald-900/40 transition cursor-pointer"
                          >
                            Modificar Cuota
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* User Limit Dialog Modal */}
          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-6 py-4.5 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center">
                    <Sliders className="h-4.5 w-4.5 text-blue-600 mr-2 shrink-0 animate-pulse" /> Ajustar Cuota SMTP
                  </h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-neutral-600 hover:text-slate-900 cursor-pointer"
                  >
                    cerrar
                  </button>
                </div>

                <form onSubmit={handleUpdateUserLimit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10.5px] uppercase font-bold text-slate-400 font-mono tracking-wider mb-1">
                      Inquilino Destinatario
                    </label>
                    <p className="text-sm font-bold text-slate-950 dark:text-white">
                      {selectedUser.displayName || 'Usuario de FreeMail'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">{selectedUser.email}</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nueva Cuota de Envío Diario (Mensajes)
                    </label>
                    <select
                      value={newDailyLimit}
                      onChange={(e) => setNewDailyLimit(parseInt(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="50">50 Correos / Día (Bajo control)</option>
                      <option value="100">100 Correos / Día (Estándar Gratis)</option>
                      <option value="250">250 Correos / Día (Profesional)</option>
                      <option value="500">500 Correos / Día (Inmuebles / Pymes)</option>
                      <option value="1000">1000 Correos / Día (Alto Tránsito Corporativo)</option>
                      <option value="9999">Ilimitada (9999 Correos / Cuenta VIP)</option>
                    </select>
                  </div>

                  <div className="p-3.5 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-105/30 dark:border-blue-900/30 rounded-2xl">
                    <p className="text-[10.5px] font-light text-slate-500 dark:text-slate-400 leading-relaxed">
                      Al aumentar este cupo, estás ampliando la capacidad del usuario en el servidor. Este cambio tiene sincronización inmediata en sus cabeceras de cuota.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-650 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                    >
                      Guardar Límites
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
