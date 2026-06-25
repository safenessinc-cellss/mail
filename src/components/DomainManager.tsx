/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Domain, DNSRecord } from '../types';
import { 
  Globe, 
  Plus, 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Copy, 
  Sparkles, 
  Check, 
  Trash2, 
  ExternalLink,
  Info,
  RefreshCw,
  Bot,
  Cpu,
  Zap,
  Award
} from 'lucide-react';
import DNSManualConfigurator from './DNSManualConfigurator';

interface DomainManagerProps {
  domain: Domain | null;
  onAddDomain: (domainName: string) => Promise<void>;
  onVerifyDomain: () => Promise<void>;
  onForceVerify: () => Promise<void>;
  onDeleteDomain: () => Promise<void>;
  onUpdateDomain: (updatedDomain: Domain) => Promise<void>;
  isDemoMode: boolean;
  loading: boolean;
}

export default function DomainManager({ 
  domain, 
  onAddDomain, 
  onVerifyDomain, 
  onForceVerify, 
  onDeleteDomain,
  onUpdateDomain,
  isDemoMode,
  loading 
}: DomainManagerProps) {
  const [newDomainName, setNewDomainName] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cloudflare' | 'godaddy' | 'namecheap'>('cloudflare');
  const [checkingRecords, setCheckingRecords] = useState<Record<string, boolean>>({
    mx: false,
    spf: false,
    dkim: false,
    dmarc: false,
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingStep, setAiLoadingStep] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  const handleAIEngage = async () => {
    if (!domain) return;
    setAiLoading(true);
    setAiLoadingStep(0);
    setAiAnalysis(null);

    // Animación futurista del logger cuántico
    const interval = setInterval(() => {
      setAiLoadingStep((prev) => {
        if (prev < 4) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 850);

    try {
      const recordsPayload = {
        mx: {
          verified: domain.mxRecord.status === 'verified',
          current: domain.mxRecord.currentValue || 'No detectado',
          expected: domain.mxRecord.expectedValue
        },
        spf: {
          verified: domain.spfRecord.status === 'verified',
          current: domain.spfRecord.currentValue || 'No detectado',
          expected: domain.spfRecord.expectedValue
        },
        dkim: {
          verified: domain.dkimRecord.status === 'verified',
          current: domain.dkimRecord.currentValue || 'No detectado',
          expected: domain.dkimRecord.expectedValue
        },
        dmarc: {
          verified: domain.dmarcRecord.status === 'verified',
          current: domain.dmarcRecord.currentValue || 'No detectado',
          expected: domain.dmarcRecord.expectedValue
        }
      };

      const response = await fetch('/api/dns/ai-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainName: domain.domainName,
          provider: activeTab,
          records: recordsPayload
        })
      });

      const data = await response.json();
      clearInterval(interval);
      
      if (data.success) {
        setAiLoadingStep(5);
        setTimeout(() => {
          setAiAnalysis(data.analysis);
          setAiLoading(false);
        }, 500);
      } else {
        alert(data.error || "No se pudo obtener el diagnóstico del Asesor cuántico.");
        setAiLoading(false);
      }
    } catch (e) {
      console.error(e);
      clearInterval(interval);
      alert("Error de conexión con el núcleo cuántico de IA.");
      setAiLoading(false);
    }
  };

  const isValidDomain = (domainName: string): boolean => {
    if (!domainName) return false;
    // Expresión regular estándar para nombres de dominio de nivel superior válidos
    const domainRegex = /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?$/;
    
    if (domainName.includes('/') || domainName.includes(' ') || domainName.includes('@')) {
      return false;
    }
    
    if (!domainRegex.test(domainName)) return false;
    
    // El TLD (ej. .com, .net) debe tener al menos 2 letras y de solo caracteres alfabéticos
    const parts = domainName.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
      return false;
    }
    
    return true;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName) return;
    // Clean string
    const cleaned = newDomainName.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
    if (cleaned.includes("/")) {
      alert("Por favor ingresa solo el nombre del dominio principal (ejemplo: midominio.com), sin rutas.");
      return;
    }
    
    // Validar sintaxis del dominio agregado
    if (!isValidDomain(cleaned)) {
      alert("Sintaxis de dominio inválida. Por favor ingresa un dominio correcto (ejemplo: midominio.com o sub.dominio.net), sin símbolos especiales ni espacios.");
      return;
    }
    
    await onAddDomain(cleaned);
    setNewDomainName('');
  };

  const handleVerify = async () => {
    if (!domain) return;

    // Pre-validar sintaxis antes de intentar la llamada al backend para evitar errores 500
    if (!isValidDomain(domain.domainName)) {
      alert("Error: El dominio actual registrado posee un formato inválido de sintaxis. Por favor elimínelo y vuelva a crearlo correctamente.");
      return;
    }

    setVerifyLoading(true);
    setCheckingRecords({ mx: true, spf: true, dkim: true, dmarc: true });

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

      if (response.ok && !parseError && data.success) {
        const verifiedMX = data.mx?.status === 'verified';
        const verifiedSPF = data.spf?.status === 'verified';
        const verifiedDKIM = data.dkim?.status === 'verified';
        const verifiedDMARC = data.dmarc?.status === 'verified';

        // Stagger/simular que termina de verificar cada uno con un elegante retraso
        setTimeout(() => {
          setCheckingRecords(prev => ({ ...prev, mx: false }));
        }, 300);

        setTimeout(() => {
          setCheckingRecords(prev => ({ ...prev, spf: false }));
        }, 600);

        setTimeout(() => {
          setCheckingRecords(prev => ({ ...prev, dkim: false }));
        }, 900);

        setTimeout(async () => {
          setCheckingRecords(prev => ({ ...prev, dmarc: false }));

          const updatedDomain: Domain = {
            ...domain,
            mxRecord: { ...domain.mxRecord, status: verifiedMX ? 'verified' : 'failed', currentValue: data.mx?.currentValue },
            spfRecord: { ...domain.spfRecord, status: verifiedSPF ? 'verified' : 'failed', currentValue: data.spf?.currentValue },
            dkimRecord: { ...domain.dkimRecord, status: verifiedDKIM ? 'verified' : 'failed', currentValue: data.dkim?.currentValue },
            dmarcRecord: { ...domain.dmarcRecord, status: verifiedDMARC ? 'verified' : 'failed', currentValue: data.dmarc?.currentValue },
            verified: verifiedMX && verifiedSPF // MX and SPF are required for minimum operation
          };

          await onUpdateDomain(updatedDomain);

          if (updatedDomain.verified) {
            alert("¡Felicitaciones! Hemos validado con éxito tus registros DNS corporativos. Tu servicio de correo ya está activo.");
          } else {
            alert("Aún no detectamos todos los registros DNS como correctos. Revisa que ingresaras los valores esperados.");
          }
        }, 1200);

      } else {
        alert(data.error || "Ocurrió un error al verificar las DNS.");
        setCheckingRecords({ mx: false, spf: false, dkim: false, dmarc: false });
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión durante la comprobación de DNS.");
      setCheckingRecords({ mx: false, spf: false, dkim: false, dmarc: false });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifySingle = async (key: 'mx' | 'spf' | 'dkim' | 'dmarc') => {
    if (!domain) return;

    if (!isValidDomain(domain.domainName)) {
      alert("Error: El dominio posee una sintaxis inválida.");
      return;
    }

    setCheckingRecords(prev => ({ ...prev, [key]: true }));

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

      if (response.ok && !parseError && data.success) {
        const recordData = data[key];
        if (recordData) {
          const isVerified = recordData.status === 'verified';
          const recKey = `${key}Record` as 'mxRecord' | 'spfRecord' | 'dkimRecord' | 'dmarcRecord';
          
          const updatedRecord = {
            ...domain[recKey],
            status: isVerified ? 'verified' as const : 'failed' as const,
            currentValue: recordData.currentValue
          };

          const updatedDomain: Domain = {
            ...domain,
            [recKey]: updatedRecord
          };

          // Recalcular estado de verificación global (MX y SPF)
          const isMxVerified = key === 'mx' ? isVerified : (domain.mxRecord.status === 'verified');
          const isSpfVerified = key === 'spf' ? isVerified : (domain.spfRecord.status === 'verified');
          updatedDomain.verified = isMxVerified && isSpfVerified;

          await onUpdateDomain(updatedDomain);
        }
      } else {
        alert(data.error || `Error al verificar el registro ${key.toUpperCase()}.`);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión durante la comprobación de DNS.");
    } finally {
      setCheckingRecords(prev => ({ ...prev, [key]: false }));
    }
  };

  const renderStatusBadge = (status: DNSRecord['status'], isChecking: boolean) => {
    if (isChecking) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200">
          <Loader2 className="h-3 w-3 mr-1 animate-spin text-blue-600 dark:text-blue-400" /> Verificando...
        </span>
      );
    }
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-705 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
          <CheckCircle className="h-3 w-3 mr-1 text-emerald-600" /> Verificado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-205">
        <Loader2 className="h-3 w-3 mr-1 animate-spin text-amber-500" /> Esperando DNS
      </span>
    );
  };

  return (
    <div className="space-y-6 select-none">
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
          <Globe className="h-5 w-5 text-emerald-600" /> Administración de Dominios
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-light">
          Añade tu propio dominio personalizado y configura las DNS para habilitar casillas de correo personalizadas de forma gratuita.
        </p>
      </div>

      {/* No Domain added yet */}
      {!domain ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950 dark:text-white mb-2">Paso 1: Agrega tu nombre de dominio</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-light">
            Ingresa el nombre del dominio que posees de tu registrador favorito (como GoDaddy, Namecheap, Cloudflare, etc.).
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              id="input-domain"
              type="text"
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              placeholder="ejemplo: midominio.com"
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              required
            />
            <button
              id="btn-add-domain"
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:bg-slate-300"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <> <Plus className="h-4 w-4 mr-1.5" /> Agregar Dominio </>
              )}
            </button>
          </form>

          <div className="mt-6 flex gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-850/80">
            <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="font-light leading-relaxed">
              <strong>Nota sobre dominios:</strong> No necesitas comprar un dominio de verdad para explorar todo el potencial. Si ingresas un dominio genérico, puedes usar el botón de <strong>Bypass de Sandbox</strong> para forzar la activación simulada de inmediato.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Domain Details & Actions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active DNS Records table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">
                    Registros DNS requeridos para: <span className="font-mono text-emerald-600 dark:text-emerald-400">{domain.domainName}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-light">
                    Para activar tu servicio de correos, escribe estos registros en la configuración de DNS de tu registrador de dominio.
                  </p>
                </div>
                {domain.verified ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 shrink-0 self-start sm:self-center">
                    <CheckCircle className="h-3 w-3 mr-1 text-emerald-605" /> Activo y Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-850 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 shrink-0 self-start sm:self-center">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin text-amber-500" /> Verificación Pendiente
                  </span>
                )}
              </div>

              {/* Records Loop */}
              <div className="space-y-4">
                {[
                  { title: "Servidor de Correo (MX)", rec: domain.mxRecord, id: "mx" },
                  { title: "Directiva Remitente (SPF/TXT)", rec: domain.spfRecord, id: "spf" },
                  { title: "Firma Digital (DKIM/TXT)", rec: domain.dkimRecord, id: "dkim" },
                  { title: "Seguridad Anti-Phishing (DMARC/TXT)", rec: domain.dmarcRecord, id: "dmarc" }
                ].map(({ title, rec, id }) => (
                  <div key={id} className="p-4 bg-slate-50/50 dark:bg-slate-950 rounded-2xl border border-slate-205 dark:border-slate-850 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="space-y-2 flex-1 select-text">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{title}</span>
                        {renderStatusBadge(rec.status, checkingRecords[id])}
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
                        <span className="text-slate-400 font-light">Host:</span>
                        <span className="col-span-3 text-slate-800 dark:text-slate-200 break-all">{rec.host}</span>
                        <span className="text-slate-400 font-light">Destino:</span>
                        <span className="col-span-3 text-slate-800 dark:text-slate-200 break-all">{rec.expectedValue}</span>
                        {rec.priority && (
                          <>
                            <span className="text-slate-400 font-light">Prioridad:</span>
                            <span className="col-span-3 text-slate-800 dark:text-slate-200">{rec.priority}</span>
                          </>
                        )}
                        {rec.currentValue && (
                          <>
                            <span className="text-slate-400 font-light">Detectado:</span>
                            <span className="col-span-3 text-rose-550 dark:text-rose-400 break-all font-semibold">{rec.currentValue}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start md:self-center">
                      <button
                        id={`btn-verify-single-${id}`}
                        onClick={() => handleVerifySingle(id as any)}
                        disabled={checkingRecords[id]}
                        className="inline-flex items-center justify-center p-2.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium cursor-pointer transition shadow-xs disabled:opacity-50"
                        title="Verificar registro individual"
                      >
                        {checkingRecords[id] ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 font-bold" />
                        )}
                      </button>

                      <button
                        id={`btn-copy-${id}`}
                        onClick={() => handleCopy(rec.expectedValue, id)}
                        className="inline-flex items-center justify-center p-2.5 text-slate-500 hover:text-emerald-605 dark:text-slate-400 dark:hover:text-emerald-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium cursor-pointer transition shadow-xs"
                        title="Copiar valor esperado"
                      >
                        {copiedText === id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Operations */}
              <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                  id="btn-trigger-verify"
                  onClick={handleVerify}
                  disabled={verifyLoading}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs disabled:bg-slate-350"
                >
                  {verifyLoading ? (
                    <> <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 shrink-0" /> Consultando DNS... </>
                  ) : (
                    <> <RefreshCw className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Verificar DNS Ahora </>
                  )}
                </button>

                {!domain.verified && (
                  <button
                    id="btn-force-verify"
                    onClick={onForceVerify}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Forzar Activación (Bypass)
                  </button>
                )}

                <button
                  id="btn-delete-domain"
                  onClick={onDeleteDomain}
                  className="inline-flex items-center justify-center px-4 py-2.5 border border-rose-200 bg-rose-50/35 hover:bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-450 dark:hover:bg-rose-950/50 rounded-xl text-xs font-semibold cursor-pointer transition"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Eliminar Dominio
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Widgets & Configurator */}
          <div className="space-y-6 lg:col-span-1">
            {/* Quantum AI Assistant Widget */}
            <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 text-white shadow-[0_0_25px_rgba(99,102,241,0.12)] relative overflow-hidden select-text">
              {/* Cybernetic Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-linear-to-r from-violet-500 via-indigo-400 to-blue-500" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/10 rounded-xl border border-indigo-400/20 text-indigo-400">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-display tracking-tight text-indigo-100 flex items-center gap-1.5">
                      Asistente de IA Cuántico
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-550/20 border border-indigo-400/30 text-indigo-300 font-mono tracking-widest uppercase animate-pulse">
                        SOPORTE
                      </span>
                    </h4>
                    <p className="text-[10px] text-indigo-300/70 font-light font-mono">FreeMail Gemini Core</p>
                  </div>
                </div>
                <Cpu className="h-4 w-4 text-indigo-400/50 animate-spin duration-3000" />
              </div>

              {!aiAnalysis && !aiLoading && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    ¿Tienes fallas o estado pendiente en el dominio <strong className="text-indigo-200 font-mono">{domain.domainName}</strong>? 
                    Gemini puede analizar el estado de tu proveedor <strong className="capitalize text-indigo-200">{activeTab}</strong> para diagnosticar y escribir una guía correctiva personalizada.
                  </p>

                  <button
                    type="button"
                    onClick={handleAIEngage}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] text-white text-xs font-semibold rounded-xl cursor-pointer transition shadow-[0_4px_12px_rgba(99,102,241,0.25)]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-violet-200" />
                    <span>Diagnosticar con Asesor de IA</span>
                  </button>
                </div>
              )}

              {aiLoading && (
                <div className="space-y-4 py-2">
                  <div className="flex flex-col items-center justify-center space-y-3 py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                    <span className="text-xs font-mono text-indigo-300 animate-pulse">ANALIZANDO CONFIGURACIÓN...</span>
                  </div>
                  
                  <div className="space-y-1.5 font-mono text-[10px] bg-slate-950/60 p-3.5 rounded-2xl border border-indigo-500/10 text-slate-400 leading-relaxed">
                    <div className={`flex items-center gap-1.5 ${aiLoadingStep >= 0 ? "text-indigo-300" : ""}`}>
                      <span className="text-[8px] font-bold">●</span>
                      <span>[0%] Conectando núcleo de análisis...</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${aiLoadingStep >= 1 ? "text-indigo-300" : ""}`}>
                      <span className="text-[8px] font-bold">●</span>
                      <span>[25%] Verificando directivas MX prioritarias...</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${aiLoadingStep >= 2 ? "text-indigo-300" : ""}`}>
                      <span className="text-[8px] font-bold">●</span>
                      <span>[50%] Analizando claves de confianza DKIM...</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${aiLoadingStep >= 3 ? "text-indigo-300" : ""}`}>
                      <span className="text-[8px] font-bold">●</span>
                      <span>[75%] Validando firmas SPF / DMARC...</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${aiLoadingStep >= 4 ? "text-indigo-300" : ""}`}>
                      <span className="text-[8px] font-bold">●</span>
                      <span>[100%] Compilando diagnóstico de Gemini...</span>
                    </div>
                  </div>
                </div>
              )}

              {aiAnalysis && !aiLoading && (
                <div className="space-y-4">
                  {/* Overall Score Banner */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-2xl border border-indigo-500/10 font-mono">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-indigo-400">Salud de DNS</span>
                      <p className="text-[11px] text-slate-200 leading-tight font-sans font-light">{aiAnalysis.statusSummary}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center py-1 px-3 bg-indigo-500/10 rounded-xl border border-indigo-400/20 text-indigo-300">
                      <span className="text-lg font-bold leading-none">{aiAnalysis.overallScore}</span>
                      <span className="text-[8px] mt-0.5">/100</span>
                    </div>
                  </div>

                  {/* Diagnostics List */}
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {aiAnalysis.diagnostics?.map((diag: any, idx: number) => {
                      const isVerified = diag.status === 'OK';
                      return (
                        <div key={idx} className="p-3 bg-slate-950/20 rounded-xl border border-indigo-950/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-indigo-300">
                              {diag.recordType}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                              isVerified 
                                ? "bg-emerald-500/10 border border-emerald-400/20 text-emerald-300"
                                : diag.criticality === "ALTA"
                                  ? "bg-rose-500/10 border border-rose-400/20 text-rose-300"
                                  : "bg-amber-500/10 border border-amber-400/20 text-amber-300"
                            }`}>
                              {isVerified ? "Correcto" : diag.criticality === "ALTA" ? "Crítico" : "Advertencia"}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-350 leading-relaxed font-light">
                            {diag.analysis}
                          </p>

                          {diag.actionSteps && diag.actionSteps.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-indigo-950/40">
                              <span className="text-[9px] font-mono text-indigo-400/80">Pasos correctores para {activeTab}:</span>
                              <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-400 font-light leading-relaxed select-text">
                                {diag.actionSteps.map((step: string, sIdx: number) => (
                                  <li key={sIdx}>{step}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Provider Recommendation */}
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-indigo-500/10 text-xs font-sans font-light leading-relaxed text-indigo-300 select-text">
                    <span className="text-[10px] font-mono text-indigo-400 block mb-1">💡 Notas para {activeTab}</span>
                    {aiAnalysis.providerNote}
                  </div>

                  {/* Refresh Analysis */}
                  <div className="flex items-center gap-2 pt-1 font-mono">
                    <button
                      type="button"
                      onClick={handleAIEngage}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/20 text-indigo-200 text-xs rounded-xl cursor-pointer transition font-medium"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Re-analizar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiAnalysis(null)}
                      className="px-3 py-2 bg-slate-950/40 hover:bg-slate-950/60 border border-slate-900 rounded-xl text-slate-450 hover:text-slate-200 text-xs transition cursor-pointer"
                    >
                      Ocultar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DNS Manual Configurator Integrations (Cloudflare, Google Workspace, CDN) */}
            <DNSManualConfigurator
              domain={domain}
              onUpdateDomain={onUpdateDomain}
              isDemoMode={isDemoMode}
            />

            {/* Guide Steps to setup Domain DNS on registrars */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <HelpCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>¿Cómo añadir estos registros?</span>
              </h4>

              {/* Selector Tabs tabs */}
              <div className="flex border-b border-slate-150 dark:border-slate-800 my-4 text-xs font-semibold">
                {['cloudflare', 'godaddy', 'namecheap'].map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setActiveTab(provider as any)}
                    className={`pb-2 px-3 border-b-2 capitalize transition cursor-pointer ${
                      activeTab === provider
                        ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'border-transparent text-slate-450'
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>

              {/* Tab views */}
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-3 leading-relaxed">
                {activeTab === 'cloudflare' && (
                  <>
                    <p>1. Ve al panel de control de <strong>Cloudflare</strong> y selecciona tu dominio.</p>
                    <p>2. Haz clic en la pestaña lateral de <strong>DNS</strong> {`->`} <strong>Registros</strong>.</p>
                    <p>3. Añade dos registros de tipo <strong>MX</strong>: uno con Name <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">@</code>, Server <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">mx1.improvmx.com</code> y prioridad <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">10</code>; el segundo con Server <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">mx2.improvmx.com</code> y prioridad <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">20</code>.</p>
                    <p>4. Agrega los registros de tipo <strong>TXT</strong> (SPF, etc.) utilizando el botón copiar del panel izquierdo.</p>
                    <p>5. Desactiva el Proxy de Cloudflare (la nube naranja) en estos registros de ser aplicable.</p>
                  </>
                )}
                {activeTab === 'godaddy' && (
                  <>
                    <p>1. Inicia sesión en <strong>GoDaddy</strong>, entra en "Mis productos" y haz clic en <strong>DNS</strong> al lado de tu dominio.</p>
                    <p>2. En la tabla de registros dns, haz clic en el botón <strong>Add New Record</strong>.</p>
                    <p>3. Añade dos registros de tipo <strong>MX</strong>: uno con Host <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">@</code>, Points to <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">mx1.improvmx.com</code> y prioridad <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">10</code>; el segundo apuntando a <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">mx2.improvmx.com</code> y prioridad <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">20</code>.</p>
                    <p>4. Guarda y repite para los de tipo TXT.</p>
                  </>
                )}
                {activeTab === 'namecheap' && (
                  <>
                    <p>1. Ingresa a la consola de <strong>Namecheap</strong>, haz clic en "Domain List" y presiona <strong>Manage</strong> al lado de tu dominio.</p>
                    <p>2. Ve a la sección de <strong>Advanced DNS</strong>.</p>
                    <p>3. En "Mail Settings", cámbialo a <strong>Custom MX</strong> e ingresa el primer host <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">@</code>, address <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">mx1.improvmx.com</code> y prioridad <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">10</code>. Añade el segundo apuntando a <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">mx2.improvmx.com</code> con prioridad <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded font-mono border border-slate-150">20</code>.</p>
                    <p>4. Agrega los demás registros presionando "Add New Record" de tipo TXT.</p>
                  </>
                )}
                <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex items-center space-x-1.5 text-amber-700 font-light">
                  <Info className="h-3 w-3 shrink-0" />
                  <span>La propagación global de DNS suele tardar de 5 a 15 minutos en completarse de forma estándar.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
