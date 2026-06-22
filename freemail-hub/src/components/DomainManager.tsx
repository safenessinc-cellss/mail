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
  RefreshCw
} from 'lucide-react';
import DNSManualConfigurator from './DNSManualConfigurator';
import DnsSetupWizard from './DnsSetupWizard';

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
    await onAddDomain(cleaned);
    setNewDomainName('');
  };

  const handleVerify = async () => {
    setVerifyLoading(true);
    await onVerifyDomain();
    setVerifyLoading(false);
  };

  const renderStatusBadge = (status: DNSRecord['status']) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-750 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-205">
          <CheckCircle className="h-3 w-3 mr-1 text-blue-600" /> Verificado
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
                        {renderStatusBadge(rec.status)}
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
                    <button
                      id={`btn-copy-${id}`}
                      onClick={() => handleCopy(rec.expectedValue, id)}
                      className="inline-flex self-start md:self-center items-center justify-center p-2.5 text-slate-500 hover:text-emerald-605 dark:text-slate-400 dark:hover:text-emerald-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium cursor-pointer transition shadow-xs"
                    >
                      {copiedText === id ? (
                        <> <Check className="h-3.5 w-3.5 text-emerald-600" /> </>
                      ) : (
                        <> <Copy className="h-3.5 w-3.5" /> </>
                      )}
                    </button>
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

            {/* Step-by-Step interactive setup wizard */}
            <DnsSetupWizard
              domain={domain}
              onUpdateDomain={onUpdateDomain}
              onVerifyDomain={onVerifyDomain}
              isDemoMode={isDemoMode}
              loading={loading}
            />
          </div>

          {/* DNS Manual Configurator Integrations (Cloudflare, Google Workspace, CDN) */}
          <DNSManualConfigurator
            domain={domain}
            onUpdateDomain={onUpdateDomain}
            isDemoMode={isDemoMode}
          />
        </div>
      )}
    </div>
  );
}
