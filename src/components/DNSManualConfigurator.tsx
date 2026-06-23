/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Domain, CustomDNSRecord } from '../types';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles, 
  Check, 
  Copy, 
  Globe, 
  HelpCircle, 
  Info,
  Sliders,
  Play
} from 'lucide-react';

interface DNSManualConfiguratorProps {
  domain: Domain | null;
  onUpdateDomain: (updatedDomain: Domain) => Promise<void>;
  isDemoMode: boolean;
}

export default function DNSManualConfigurator({ 
  domain, 
  onUpdateDomain,
  isDemoMode 
}: DNSManualConfiguratorProps) {
  const [type, setType] = useState<'A' | 'CNAME' | 'TXT'>('TXT');
  const [host, setHost] = useState('@');
  const [value, setValue] = useState('');
  const [ttl, setTtl] = useState(3600);
  const [preset, setPreset] = useState<string>('manual');
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(null), 2000);
  };

  const handlePresetChange = (presetName: string) => {
    setPreset(presetName);
    setConfigError(null);
    if (presetName === 'google_workspace') {
      setType('TXT');
      setHost('@');
      setValue('google-site-verification=dM8VbY8vG3P_f93yIsD9zXwEx_K9tEx9vY8v7');
    } else if (presetName === 'microsoft_365') {
      setType('TXT');
      setHost('@');
      setValue('MS=ms46172983');
    } else if (presetName === 'cloudflare_cname') {
      setType('CNAME');
      setHost('www');
      setValue('ext.freemailhub.com');
    } else if (presetName === 'cloudflare_a') {
      setType('A');
      setHost('@');
      setValue('104.21.84.112');
    } else if (presetName === 'manual') {
      setType('TXT');
      setHost('@');
      setValue('');
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);

    if (!domain) {
      setConfigError("Debes registrar un dominio primero.");
      return;
    }

    const cleanHost = host.trim();
    const cleanValue = value.trim();

    if (!cleanValue) {
      setConfigError("El valor de destino no puede estar vacío.");
      return;
    }

    if (type === 'A') {
      // Validate simple IPv4 pattern
      const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      if (!ipPattern.test(cleanValue)) {
        setConfigError("Para un registro tipo 'A', ingresa una dirección IPv4 válida (ej: 192.168.1.1).");
        return;
      }
    }

    const customList = domain.customRecords || [];
    
    // Check duplication
    const duplicate = customList.some(r => r.type === type && r.host === cleanHost && r.value === cleanValue);
    if (duplicate) {
      setConfigError("Este registro DNS personalizado ya se encuentra configurado.");
      return;
    }

    const newRecord: CustomDNSRecord = {
      id: 'rec_' + Math.random().toString(36).substring(2, 11),
      type,
      host: cleanHost || '@',
      value: cleanValue,
      ttl: ttl || 3600,
      status: 'pending'
    };

    const updatedDomain: Domain = {
      ...domain,
      customRecords: [...customList, newRecord]
    };

    await onUpdateDomain(updatedDomain);
    
    // Reset form except defaults
    setValue('');
    setPreset('manual');
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!domain) return;
    const customList = domain.customRecords || [];
    const updatedList = customList.filter(r => r.id !== recordId);

    const updatedDomain: Domain = {
      ...domain,
      customRecords: updatedList
    };

    await onUpdateDomain(updatedDomain);
  };

  // Perform real-time verification of custom DNS record
  const handleVerifyCustomRecord = async (recordId: string, simulateForce = false) => {
    if (!domain) return;
    setVerifyingId(recordId);
    
    const records = domain.customRecords || [];
    const targetRec = records.find(r => r.id === recordId);
    if (!targetRec) {
      setVerifyingId(null);
      return;
    }

    try {
      let status: 'verified' | 'failed' = 'failed';
      let currentValue = '';

      if (simulateForce || isDemoMode) {
        // Fast mock successful validation for instant sandbox use
        status = 'verified';
        currentValue = targetRec.value;
      } else {
        // Real server-side resolution
        const response = await fetch('/api/dns/verify-custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domainName: domain.domainName,
            type: targetRec.type,
            host: targetRec.host,
            value: targetRec.value
          })
        });

        if (response.ok) {
          const responseText = await response.text();
          let data: any = {};
          let isParseError = false;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            isParseError = true;
          }

          if (!isParseError) {
            status = data.status;
            currentValue = data.currentValue;
          } else {
            status = 'failed';
            currentValue = responseText.slice(0, 150) || "Respuesta ilegible del servidor.";
          }
        } else {
          currentValue = "No se pudo consultar el servidor DNS rematado.";
        }
      }

      // Update in domain list
      const updatedList = records.map(r => {
        if (r.id === recordId) {
          return {
            ...r,
            status,
            currentValue: currentValue || "No encontrado",
            lastCheckedAt: new Date().toISOString()
          };
        }
        return r;
      });

      const updatedDomain: Domain = {
        ...domain,
        customRecords: updatedList
      };

      await onUpdateDomain(updatedDomain);
    } catch (e: any) {
      console.error(e);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyAllCustom = async () => {
    if (!domain || !domain.customRecords || domain.customRecords.length === 0) return;
    for (const rec of domain.customRecords) {
      await handleVerifyCustomRecord(rec.id);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Title Header */}
      <div>
        <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
          <Sliders className="h-4.5 w-4.5 text-emerald-600" />
          Registros DNS Personalizados (Cloudflare, Google Workspace, CDN, etc)
        </h3>
        <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">
          Habilita integraciones de terceros. Agrega tus registros TXT, CNAME o A para validar que tu dominio pertenece a Google, Office 365 o configurar proxies de Cloudflare.
        </p>
      </div>

      {!domain ? (
        <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center select-none text-slate-400">
          <Globe className="h-8 w-8 mx-auto stroke-1 mb-2 text-slate-350 dark:text-slate-600 animate-pulse" />
          <p className="text-sm">Registra tu dominio principal para poder añadir integraciones de DNS personalizadas.</p>
        </div>
      ) : (
        <>
          {/* Preset Selector + New Record Form Grid */}
          <div className="p-5 bg-slate-50/50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-850 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-850 dark:text-slate-300">Añadir Nuevo Registro</h4>
                <p className="text-[10px] text-slate-450 font-light mt-0.5">Selecciona un preset rápido o llena el formulario de forma manual.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Presets:</span>
                <select
                  value={preset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-300"
                >
                  <option value="manual">⚙️ Personalizado (Manual)</option>
                  <option value="google_workspace">🌐 Google Workspace Verification</option>
                  <option value="microsoft_365">🏢 Office 365 Verification</option>
                  <option value="cloudflare_cname">☁️ Cloudflare CDN CNAME</option>
                  <option value="cloudflare_a">⚡ Cloudflare Server A Record</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
              
              {/* Type Select */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 font-mono">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-850 dark:text-white"
                >
                  <option value="TXT">TXT</option>
                  <option value="CNAME">CNAME</option>
                  <option value="A">A (IPv4)</option>
                </select>
              </div>

              {/* Host Input */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 font-mono">Host / Nombre</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="@"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-semibold font-mono focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Value Input */}
              <div className="md:col-span-5 space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 font-mono">Valor de Destino</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'A' ? "ej: 104.21.84.112" : type === 'CNAME' ? "ej: miweb.cdn.com" : "ej: google-site-verification=xxxx"}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* TTL Input */}
              <div className="md:col-span-1.5 space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 font-mono">TTL (Seg)</label>
                <input
                  type="number"
                  value={ttl}
                  onChange={(e) => setTtl(Number(e.target.value))}
                  placeholder="3600"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Submit Action */}
              <div className="md:col-span-1.5">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center py-2 bg-slate-900 hover:bg-slate-850 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

            </form>

            {configError && (
              <p className="text-[10px] font-bold text-rose-600 flex items-center mt-1 animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" /> {configError}
              </p>
            )}
          </div>

          {/* List of Custom DNS records */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-850 dark:text-slate-300 uppercase tracking-wider font-mono">
                Mis Registros DNS Personalizados ({domain.customRecords?.length || 0})
              </h4>
              {domain.customRecords && domain.customRecords.length > 0 && (
                <button
                  type="button"
                  onClick={handleVerifyAllCustom}
                  className="inline-flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Verificar todos en tiempo real
                </button>
              )}
            </div>

            {!domain.customRecords || domain.customRecords.length === 0 ? (
              <div className="py-8 bg-slate-50/20 dark:bg-slate-950/20 text-center text-slate-400 border border-slate-150 dark:border-slate-850 rounded-2xl select-none leading-relaxed">
                <Sliders className="h-7 w-7 mx-auto text-slate-305 dark:text-slate-800 mb-2 stroke-1" />
                <p className="text-xs">Usa el panel superior para definir parámetros DNS personalizados.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Compatible con registradores globales para validar integraciones corporativas de un solo toque.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {domain.customRecords.map((record) => {
                  const queryHostLabel = record.host === '@' ? domain.domainName : `${record.host}.${domain.domainName}`;
                  return (
                    <div 
                      key={record.id} 
                      className="p-4 bg-slate-50/40 dark:bg-slate-950/40 border border-slate-205 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-750 rounded-2xl transition flex flex-col md:flex-row justify-between md:items-center gap-4 transition duration-150 select-text"
                    >
                      {/* Left: Detail Information */}
                      <div className="space-y-2 flex-1 min-w-0 select-text">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Type badge */}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            record.type === 'TXT' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300' 
                              : record.type === 'CNAME' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300' 
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300'
                          }`}>
                            {record.type}
                          </span>
                          
                          {/* Host text */}
                          <span className="text-xs font-bold font-mono text-slate-900 dark:text-white truncate max-w-[150px]" title={queryHostLabel}>
                            {record.host}
                          </span>

                          <span className="text-[10px] text-slate-450 font-mono">({queryHostLabel})</span>

                          {/* TTL */}
                          <span className="text-[10px] text-slate-400">TTL: {record.ttl} s</span>
                          
                          {/* Validation Status Badge */}
                          {record.status === 'verified' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-305 border border-emerald-100">
                              <CheckCircle className="h-3 w-3 mr-0.5 text-emerald-600" /> Propagado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-150">
                              <Loader2 className="h-3 w-3 mr-0.5 animate-spin text-amber-500" /> Pendiente
                            </span>
                          )}
                        </div>

                        {/* Record Details value */}
                        <div className="grid grid-cols-6 gap-1 text-[11px] font-mono select-text items-center">
                          <span className="text-slate-400 font-light snap-none">Valor Esperado:</span>
                          <span className="col-span-5 text-slate-800 dark:text-slate-200 break-all font-semibold select-text pr-4 flex items-center gap-1">
                            {record.value}
                            <button
                              type="button"
                              onClick={() => handleCopy(record.value, record.id + '-expected')}
                              className="text-slate-400 hover:text-emerald-600 p-0.5 transition cursor-pointer"
                              title="Copiar valor esperado"
                            >
                              {copiedTextId === record.id + '-expected' ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </span>

                          {record.currentValue && (
                            <>
                              <span className="text-slate-400 font-light snap-none">Detectado:</span>
                              <span className={`col-span-5 break-all font-semibold select-text ${
                                record.status === 'verified' 
                                  ? 'text-emerald-600 dark:text-emerald-450' 
                                  : 'text-rose-550 dark:text-rose-450'
                              }`}>
                                {record.currentValue}
                              </span>
                            </>
                          )}
                          
                          {record.lastCheckedAt && (
                            <>
                              <span className="text-slate-400 font-light">Último chequeo:</span>
                              <span className="col-span-5 text-slate-450 text-[10px]">
                                {new Date(record.lastCheckedAt).toLocaleTimeString()} {` - `} 
                                {new Date(record.lastCheckedAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 md:self-center self-end">
                        
                        {/* Verify Button */}
                        <button
                          id={`btn-verify-manual-rec-${record.id}`}
                          onClick={() => handleVerifyCustomRecord(record.id)}
                          disabled={verifyingId === record.id}
                          className="inline-flex items-center justify-center py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {verifyingId === record.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Chequeando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Chequear
                            </>
                          )}
                        </button>

                        {/* Force Sandbox Bypass simulation trigger */}
                        {record.status !== 'verified' && (
                          <button
                            type="button"
                            onClick={() => handleVerifyCustomRecord(record.id, true)}
                            title="Simular Propagación Exitosa"
                            className="inline-flex items-center justify-center p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/30 rounded-xl text-[10.5px] font-bold cursor-pointer"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          id={`btn-delete-manual-rec-${record.id}`}
                          onClick={() => handleDeleteRecord(record.id)}
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer transition shadow-xs"
                          title="Remover Registro"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
