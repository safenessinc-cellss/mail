/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Domain } from '../types';
import { 
  Shield, 
  ChevronRight, 
  ChevronLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  HelpCircle, 
  Info, 
  RefreshCw, 
  AlertCircle, 
  Sliders, 
  Sparkles,
  Server
} from 'lucide-react';

interface DnsSetupWizardProps {
  domain: Domain;
  onUpdateDomain: (updatedDomain: Domain) => Promise<void>;
  onVerifyDomain: () => Promise<void>;
  isDemoMode: boolean;
  loading: boolean;
}

export default function DnsSetupWizard({
  domain,
  onUpdateDomain,
  onVerifyDomain,
  isDemoMode,
  loading
}: DnsSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [provider, setProvider] = useState<'cloudflare' | 'godaddy' | 'hostinger' | 'namecheap' | 'vercel' | 'manual'>('cloudflare');
  
  // SPF Generator options
  const [spfGoogle, setSpfGoogle] = useState(false);
  const [spfMicrosoft, setSpfMicrosoft] = useState(false);
  const [spfSendgrid, setSpfSendgrid] = useState(false);
  const [spfMailchimp, setSpfMailchimp] = useState(false);
  const [spfSuffix, setSpfSuffix] = useState<'~all' | '-all' | '?all'>('~all');
  const [spfValue, setSpfValue] = useState<string>('');
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedSpf, setAppliedSpf] = useState(false);

  // Automatically construct SPF string on option state updates
  useEffect(() => {
    // Standard base includes for FreeMail Hub
    let parts = ['v=spf1', 'include:spf.freemailhub.com'];
    
    if (spfGoogle) {
      parts.push('include:_spf.google.com');
    }
    if (spfMicrosoft) {
      parts.push('include:spf.protection.outlook.com');
    }
    if (spfSendgrid) {
      parts.push('include:sendgrid.net');
    }
    if (spfMailchimp) {
      parts.push('include:servers.mcsv.net');
    }
    
    parts.push(spfSuffix);
    setSpfValue(parts.join(' '));
    setAppliedSpf(false);
  }, [spfGoogle, spfMicrosoft, spfSendgrid, spfMailchimp, spfSuffix]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const applyCustomSpfToDomain = async () => {
    if (!domain) return;
    const updated: Domain = {
      ...domain,
      spfRecord: {
        ...domain.spfRecord,
        expectedValue: spfValue
      }
    };
    await onUpdateDomain(updated);
    setAppliedSpf(true);
  };

  const restoreDefaultSpf = async () => {
    if (!domain) return;
    const originalSpf = 'v=spf1 include:spf.freemailhub.com ~all';
    const updated: Domain = {
      ...domain,
      spfRecord: {
        ...domain.spfRecord,
        expectedValue: originalSpf
      }
    };
    // Reset options
    setSpfGoogle(false);
    setSpfMicrosoft(false);
    setSpfSendgrid(false);
    setSpfMailchimp(false);
    setSpfSuffix('~all');
    await onUpdateDomain(updated);
    setAppliedSpf(false);
  };

  // Provider branding asset colors
  const providerDetails = {
    cloudflare: {
      name: 'Cloudflare',
      url: 'https://dash.cloudflare.com/',
      color: 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/40 dark:bg-orange-950/20',
      desc: 'Recomendado por su propagación ultra rápida y protección CDN avanzada.',
      steps: [
        'Ingresa al panel de control de Cloudflare y selecciona el dominio deseado.',
        'Dirígete a la pestaña lateral izquierda de "DNS" y selecciona la sección "Records" (Registros).',
        'Corta o desactiva proxies de nube naranja para registros de correo para prevenir interrupciones (Mantén solo DNS).'
      ]
    },
    godaddy: {
      name: 'GoDaddy',
      url: 'https://dcc.godaddy.com/control/portfolio',
      color: 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/40 dark:bg-teal-950/20',
      desc: 'El registrador de nombres de dominio más grande. Interfaz clásica.',
      steps: [
        'Haz clic en "Iniciar Sesión" en GoDaddy, entra a "Mis productos" y pulsa sobre el botón "DNS" de tu dominio.',
        'Pulsa "Añadir registro" (Add record) situado bajo la tabla "Registros DNS".',
        'Al guardar records con host "fmhub._domainkey", asegúrate que el campo de texto se mantenga así sin que se concatene el nombre de tu dominio dos veces.'
      ]
    },
    hostinger: {
      name: 'Hostinger',
      url: 'https://hpanel.hostinger.com/',
      color: 'border-indigo-500 text-indigo-100 bg-indigo-50/40 dark:bg-indigo-950/20',
      desc: 'Panel de control intuitivo hPanel optimizado para servicios web.',
      steps: [
        'Ingresa a hPanel, ve a la sección "Dominios" y haz clic en "Administrar" al lado de tu dominio.',
        'Busca la sección "Editor de zona DNS" en el menú de navegación izquierdo.',
        'Borra cualquier registro SPF duplicado previo para evitar conflictos que invaliden la política de entrega.'
      ]
    },
    namecheap: {
      name: 'Namecheap',
      url: 'https://ap.www.namecheap.com/',
      color: 'border-red-500 text-red-600 dark:text-red-400 bg-red-50/40 dark:bg-red-950/20',
      desc: 'Famoso registrador con características DNS gratuitas simplificadas.',
      steps: [
        'Inicia sesión, ve a "Domain List" en tu barra izquierda y haz clic en "Manage" al lado del dominio.',
        'En la pestaña central superior de navegación, dirígete a "Advanced DNS".',
        'En la tabla haz clic en el botón "Add New Record" de color rojo para añadir los TXT especificados.'
      ]
    },
    vercel: {
      name: 'Vercel DNS',
      url: 'https://vercel.com/dashboard',
      color: 'border-slate-900 text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-950/30',
      desc: 'Recomendado si tus Nameservers están delegados a Vercel (ns1.vercel-dns.com).',
      steps: [
        'Accede al dashboard de Vercel y dirígete al proyecto o configuración de tu cuenta.',
        'Busca la pestaña "Domains" para ver los dominios registrados y vinculados.',
        'Haz clic en el botón azul para configurar los DNS Records (Registros DNS) específicos directamente en Vercel, ya que Vercel controla tus zonas DNS activamente.'
      ]
    },
    manual: {
      name: 'Proveedor Personalizado',
      url: '',
      color: 'border-slate-500 text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-900',
      desc: 'Para registradores como Google Domains, DonWeb, Neubox, Dinahosting o cualquier otro registrador local.',
      steps: [
        'Ingresa al panel de administración donde realizaste la compra de tu dominio.',
        'Busca la sección correspondiente a Configuración de Servidor, Configurar DNS, Avanzado o Redirección de correo electrónico.',
        'Añade registros MX y registros TXT individuales rellenando los campos de Host y Destino.'
      ]
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Header with magic wand/wizard theme */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600 animate-pulse" />
            Asistente de Configuración SPF y DKIM
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
            Guía paso a paso interactiva para combinar directivas SPF y firmar llaves DKIM con total compatibilidad.
          </p>
        </div>
        
        {/* Step indicators */}
        <div className="flex items-center space-x-1.5 self-start">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              onClick={() => setCurrentStep(s)}
              className={`h-7 w-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                currentStep === s
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : currentStep > s
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40'
                  : 'bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-600 border border-slate-150 dark:border-slate-850'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================
          PASO 1: SELECCIÓN DE PROVEEDOR DE DOMINIOS/DNS
          ================================================== */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="text-emerald-600 font-mono">Paso 1:</span> ¿Dónde compraste o gestionas tu dominio?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
              Seleccionar tu proveedor nos permite darte enlaces directos y recordatorios de sintaxis específicos para su panel.
            </p>
          </div>

          {/* Grid Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-2">
            {(Object.keys(providerDetails) as Array<typeof provider>).map((provKey) => {
              const prov = providerDetails[provKey];
              const isSelected = provider === provKey;
              return (
                <button
                  key={provKey}
                  type="button"
                  onClick={() => setProvider(provKey)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition h-32 select-none cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-950/40'
                  }`}
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block font-mono">DNS</span>
                    <span className="text-xs font-bold text-slate-850 dark:text-white mt-1 block">{prov.name}</span>
                  </div>
                  <span className="text-[10.5px] text-slate-450 font-light leading-snug line-clamp-2">
                    {prov.name === 'manual' ? 'Cualquier otro panel o registrador nacional.' : prov.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Connected help block */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850/80 p-4 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200">
                  Instrucciones Rápidas para {providerDetails[provider].name}
                </h5>
              </div>
              
              {providerDetails[provider].url && (
                <a
                  href={providerDetails[provider].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="inline-flex items-center text-[10.5px] font-bold text-emerald-650 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Abrir Consola DNS ↗
                </a>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-light">
              Sigue estas instrucciones preliminares en tu cuenta externa:
            </p>

            <ul className="text-xs text-slate-500 dark:text-slate-450 space-y-2 list-none pl-1">
              {providerDetails[provider].steps.map((stepStr, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{stepStr}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}


      {/* ==================================================
          PASO 2: CONVERSOR Y AGREGADOR DE SPF (AUTO-CONFIG)
          ================================================== */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="text-emerald-600 font-mono">Paso 2:</span> Generador y Fusionador de Registro SPF
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
              El registro SPF valida qué servidores pueden enviar correos comerciales en tu nombre. 
              <strong> Importante:</strong> Solo puedes tener un registro SPF en tus DNS. Si usas otros proveedores, agrégalos abajo para combinarlos en una sola regla validada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Options Checkbox Column */}
            <div className="md:col-span-1 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850/80 space-y-3.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block font-mono">¿Qué más usas?</span>
              
              <div className="space-y-2.5">
                {[
                  { id: 'google', state: spfGoogle, setter: setSpfGoogle, title: 'Google Workspace', desc: 'Gmail corporativo' },
                  { id: 'microsoft', state: spfMicrosoft, setter: setSpfMicrosoft, title: 'Microsoft 365', desc: 'Outlook corporativo' },
                  { id: 'sendgrid', state: spfSendgrid, setter: setSpfSendgrid, title: 'SendGrid', desc: 'Newsletter masivo' },
                  { id: 'mailchimp', state: spfMailchimp, setter: setSpfMailchimp, title: 'Mailchimp', desc: 'Marketing automatizado' }
                ].map((chk) => (
                  <label key={chk.id} className="flex items-start space-x-2.5 p-1.5 hover:bg-slate-100/55 dark:hover:bg-slate-900/60 rounded-xl cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={chk.state}
                      onChange={(e) => chk.setter(e.target.checked)}
                      className="mt-1 h-3.5 w-3.5 bg-white dark:bg-slate-900 border-slate-300 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">{chk.title}</span>
                      <span className="text-[10px] text-slate-450 font-light">{chk.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Suffix Suffix */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block font-mono">Restricción de SPF</span>
                <select
                  value={spfSuffix}
                  onChange={(e) => setSpfSuffix(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-300"
                >
                  <option value="~all">~all (Softfail - Recomendado para pruebas)</option>
                  <option value="-all">-all (Hardfail - Máxima protección estricta)</option>
                  <option value="?all">?all (Neutral - Sin política restrictiva)</option>
                </select>
              </div>
            </div>

            {/* Generated results and commands column */}
            <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
              
              <div className="p-5 bg-emerald-950/5 dark:bg-emerald-950/15 border border-emerald-200/50 dark:border-emerald-900/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] uppercase font-bold text-emerald-700 dark:text-emerald-400 font-mono tracking-wider">
                    Registro SPF Autogenerado
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleCopy(spfValue, 'spf-custom')}
                    className="p-1 px-2.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-450 border border-emerald-200/60 dark:border-emerald-900/40 hover:bg-emerald-55/60 rounded-lg cursor-pointer transition flex items-center space-x-1"
                  >
                    {copiedId === 'spf-custom' ? (
                      <> <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> <span>Copiado!</span> </>
                    ) : (
                      <> <Copy className="h-3.5 w-3.5 shrink-0" /> <span>Copiar SPF</span> </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-950 text-white rounded-xl p-4 font-mono text-[11px] leading-relaxed break-all select-all shadow-inner border border-slate-900 flex justify-between items-start gap-4">
                  <span className="text-emerald-300">{spfValue}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10.5px] text-slate-450 leading-relaxed font-light mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/20">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">Tipo de DNS</span>
                    <span>TXT</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">Host / Nombre</span>
                    <span>@ (o tu dominio)</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">TTL por defecto</span>
                    <span>3600 (1 hora)</span>
                  </div>
                </div>
              </div>

              {/* Action Operations to save back context */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-850 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-left select-none">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Aplicar este SPF al validador</h5>
                  <p className="text-[10px] text-slate-450 font-light mt-0.5">
                    Modifica el registro "esperado" para que el chequeo de DNS de FreeMail Hub busque este SPF personalizado en GoDaddy/Cloudflare.
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end">
                  {domain.spfRecord.expectedValue !== 'v=spf1 include:spf.freemailhub.com ~all' && (
                    <button
                      type="button"
                      onClick={restoreDefaultSpf}
                      className="p-2 px-3 text-[11px] font-bold border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition shrink-0"
                    >
                      Restaurar Inicial
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={applyCustomSpfToDomain}
                    className={`p-2 px-4 text-[11px] font-bold text-white shadow-xs rounded-xl cursor-pointer transition shrink-0 ${
                      appliedSpf
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {appliedSpf ? (
                      <> ✓ Aplicado con Éxito </>
                    ) : (
                      <> <Sparkles className="h-3 w-3 inline mr-1" /> Aplicar al Dominio </>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* ==================================================
          PASO 3: FIRMA DIGITAL DKIM (COPIAR CLAVE)
          ================================================== */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="text-emerald-600 font-mono">Paso 3:</span> Llave DKIM (Firma Criptográfica)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
              La firma DKIM cifra los encabezados de tus mensajes de salida, evitando que usurpadores se hagan pasar por ti (Phishing) y garantizando la entrega oficial en Gmail y Hotmail.
            </p>
          </div>

          <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-2xl space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Box 1: Host config */}
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl space-y-1 text-left relative">
                <span className="text-[9.5px] uppercase font-bold tracking-widest text-slate-400 block font-mono">Tipo de Registro</span>
                <span className="text-xs font-bold text-slate-850 dark:text-white block font-mono">TXT</span>
              </div>

              {/* Box 2: Name/Host selector */}
              <div className="col-span-1 md:col-span-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl flex items-center justify-between text-left">
                <div className="space-y-1 min-w-0">
                  <span className="text-[9.5px] uppercase font-bold tracking-widest text-slate-400 block font-mono">Nombre / Selector de Host</span>
                  <span className="text-xs font-bold text-slate-850 dark:text-white block font-mono truncate">{domain.dkimRecord.host}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(domain.dkimRecord.host, 'dkim-host')}
                  className="p-1 px-2 text-[10px] font-semibold border border-slate-100 hover:bg-slate-50 bg-slate-50/30 rounded-lg cursor-pointer transition shrink-0"
                >
                  {copiedId === 'dkim-host' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              {/* Box 3: Proxy status reminder */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl space-y-1 text-left">
                <span className="text-[9.5px] uppercase font-bold tracking-widest text-slate-400 block font-mono">En Cloudflare Proxy</span>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">Solo DNS (Apagado ☁️)</span>
              </div>

            </div>

            {/* DKIM full long value panel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between select-none">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Valor de Registro TXT (Llave Pública de 2048-bits)</span>
                
                <button
                  type="button"
                  onClick={() => handleCopy(domain.dkimRecord.expectedValue, 'dkim-val')}
                  className="p-1 px-3 text-[11px] font-bold text-emerald-700 dark:text-emerald-450 border border-emerald-200/50 dark:border-emerald-900/40 hover:bg-emerald-55 bg-white dark:bg-slate-900 rounded-lg cursor-pointer transition flex items-center space-x-1"
                >
                  {copiedId === 'dkim-val' ? (
                    <> <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> <span>Clave Copiada!</span> </>
                  ) : (
                    <> <Copy className="h-3.5 w-3.5 shrink-0" /> <span>Copiar Llave Completa</span> </>
                  )}
                </button>
              </div>

              <div className="bg-slate-950 text-white rounded-xl p-4 font-mono text-[10.5px] leading-relaxed break-all select-all shadow-inner border border-slate-900 h-28 overflow-y-auto custom-scrollbar flex items-start gap-3">
                <span className="text-amber-300 font-light pr-2 select-all">{domain.dkimRecord.expectedValue}</span>
              </div>
            </div>

            {/* Tip highlight */}
            <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xs text-slate-500 dark:text-slate-450 flex gap-2 font-light">
              <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Consejo del Registrador:</strong> Asegúrate de pegar toda la llave pública anterior sin saltos de línea ni espacios. En GoDaddy, el campo Host final se verá mágicamente como <code>fmhub._domainkey</code>.
              </p>
            </div>

          </div>
        </div>
      )}


      {/* ==================================================
          PASO 4: CHEQUEO DE VERIFICACIÓN GLOBAL
          ================================================== */}
      {currentStep === 4 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="text-emerald-600 font-mono">Paso 4:</span> Verificación de Servidores DNS corporativos
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
              Una vez añadidos los registros MX, SPF y DKIM, realizaremos consultas DNS mundiales en tiempo real para habilitar tus casillas corporativas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
            
            {/* Checked Checklist status cards */}
            <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850/80 rounded-2xl space-y-4 text-left select-none">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block font-mono">Estado de tus registros actuales</span>
              
              <div className="space-y-3 select-none">
                {[
                  { name: 'Regitro de Correo MX', status: domain.mxRecord.status, expected: domain.mxRecord.expectedValue },
                  { name: 'Políticas SPF (Remitentes TXT)', status: domain.spfRecord.status, expected: domain.spfRecord.expectedValue },
                  { name: 'Firma DKIM (Criptográfica TXT)', status: domain.dkimRecord.status, expected: domain.dkimRecord.expectedValue },
                  { name: 'Seguridad Anti-Phishing DMARC', status: domain.dmarcRecord.status, expected: domain.dmarcRecord.expectedValue }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-850 select-none">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {item.status === 'verified' ? (
                        <span className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0 text-xs">✓</span>
                      ) : (
                        <span className="h-5 w-5 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-650 shrink-0 text-xs animate-pulse">!</span>
                      )}
                      
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{item.name}</span>
                        <span className="text-[9.5px] text-slate-450 font-mono truncate block max-w-[200px] sm:max-w-xs">{item.expected}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize shrink-0 ${
                      item.status === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400'
                    }`}>
                      {item.status === 'verified' ? 'Correcto' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Run validator console buttons */}
            <div className="p-5 border border-emerald-250 dark:border-emerald-900/40 bg-emerald-50/15 dark:bg-emerald-950/20 rounded-2xl flex flex-col justify-between space-y-4">
              
              <div className="space-y-2 text-left">
                <span className="bg-emerald-650 dark:bg-emerald-705 text-white text-[9px] font-bold font-mono p-1 px-2 uppercase rounded-md">
                  Punto de Control
                </span>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white pt-1">Preguntas Frecuentes sobre Propagación</h5>
                
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                  <strong>¿Cuánto tarda la propagación?</strong> De forma global suele propagarse en pocos minutos, aunque GoDaddy o registradores de bajo costo pueden tardar hasta 4 horas para registros nuevos.
                </p>

                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                  <strong>¿Qué sucede si un registro SPF no valida?</strong> Asegúrate de no haber dejado comillas duplicadas, y descarta registros antiguos TXT de tipo `v=spf1` en tu mismo host.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  id="btn-wizard-trigger-dns-verify"
                  onClick={onVerifyDomain}
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <> <RefreshCw className="h-4 w-4 animate-spin shrink-0" /> Verificando servidores remotos... </>
                  ) : (
                    <> <RefreshCw className="h-4 w-4 shrink-0" /> Realizar consulta DNS Mundial Ahora </>
                  )}
                </button>

                {domain.verified ? (
                  <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    🎉 ¡Tu dominio está verificado! Ya puedes recibir/enviar en Buzones y Aliases.
                  </div>
                ) : (
                  <p className="text-[10px] text-center text-slate-450 font-light select-none">
                    Consulta ejecutada mediante la API de resolución local.
                  </p>
                )}
              </div>

            </div>

          </div>
        </div>
      )}


      {/* ==================================================
          BOTTOM STEPPERS NAV CONTROLLER
          ================================================== */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs font-bold select-none">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          className="inline-flex items-center space-x-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition select-none"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Anterior</span>
        </button>

        <span className="text-slate-400 font-mono text-[11px]">
          Paso {currentStep} de 4
        </span>

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
            className="inline-flex items-center space-x-1 px-4 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl cursor-pointer transition select-none"
          >
            <span>Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="w-16" /> // spacer to balance layout
        )}
      </div>

    </div>
  );
}
