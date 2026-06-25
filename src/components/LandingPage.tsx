/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Globe, 
  Shield, 
  RefreshCw, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  User, 
  HelpCircle, 
  ExternalLink,
  Phone,
  Lock,
  Briefcase,
  X,
  FileText,
  Clock,
  Sparkles,
  Calendar,
  Check
} from 'lucide-react';
// ✅ CORREGIDO: Importación correcta del componente renombrado
import DnsParticles from './DnsParticles';

interface LandingPageProps {
  onGetStarted: () => void;
  onDemoBypass: () => void;
}

export default function LandingPage({ onGetStarted, onDemoBypass }: LandingPageProps) {
  const [activeModal, setActiveModal] = useState<'planes' | 'soporte' | 'privacidad' | 'demo' | 'safeness' | null>(null);

  // Demo Booking state
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');
  const [demoMessage, setDemoMessage] = useState('');
  const [demoSuccess, setDemoSuccess] = useState(false);

  const handleBookDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSuccess(true);
    setTimeout(() => {
      setDemoSuccess(false);
      setActiveModal(null);
      setDemoName('');
      setDemoEmail('');
      setDemoCompany('');
      setDemoMessage('');
    }, 3500);
  };

  const features = [
    {
      icon: <Globe className="h-5 w-5 text-cyan-400" />,
      title: "Dominio Personalizado",
      description: "Conecta tu propio dominio (ej: coach-iso.eu) y destaca profesionalmente con una dirección corporativa que te represente."
    },
    {
      icon: <Layers className="h-5 w-5 text-pink-400" />,
      title: "Múltiples Buzones Gratis",
      description: "Crea cuentas independientes como ventas@, contacto@ o tu-nombre@ sin pagar costosas licencias extra por casilla."
    },
    {
      icon: <Shield className="h-5 w-5 text-purple-400" />,
      title: "Rigor DNS Corporativo",
      description: "Esquemas autogenerados de registros MX, SPF, DKIM y DMARC automáticos para asegurar entregabilidad y filtros robustos."
    },
    {
      icon: <Mail className="h-5 w-5 text-cyan-400" />,
      title: "Webmail Asistido por IA",
      description: "Una consola premium, rápida y responsiva para redactar y optimizar todos tus envíos mediante Inteligencia Artificial Gemini."
    },
    {
      icon: <RefreshCw className="h-5 w-5 text-pink-400" />,
      title: "Gmail Integrado & Reenvío",
      description: "Sincroniza y reenvía tus casillas hacia cuentas de correo nativas, utilizándolo de forma flexible y ágil."
    },
    {
      icon: <CheckCircle2 className="h-5 w-5 text-purple-400" />,
      title: "Estándar 100% Sin Costos",
      description: "Aprovecha la infraestructura del plan Starter de Google Cloud con límites generosos y alta velocidad de procesamiento."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950 select-none relative overflow-hidden">
      {/* ✅ CORREGIDO: Uso correcto del componente */}
      <DnsParticles />

      {/* Decorative gradient ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar / Navigation */}
      <nav className="border-b border-cyan-500/15 bg-slate-955/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Header Brand Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="bg-gradient-to-tr from-cyan-500 to-pink-500 p-2 rounded-xl text-white shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 transition">
                <Mail className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black font-display tracking-wider text-white neon-text-cyan leading-tight">
                  FREEMAIL
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#b0b0b0] font-bold font-mono">
                  by Safeness.Inc
                </span>
              </div>
            </div>

            {/* Middle Nav Links */}
            <div className="hidden md:flex items-center space-x-6 text-xs uppercase font-mono tracking-wider text-slate-400">
              <button onClick={() => setActiveModal('planes')} className="hover:text-cyan-400 transition cursor-pointer">Planes</button>
              <button onClick={() => setActiveModal('safeness')} className="hover:text-cyan-400 transition cursor-pointer">Safeness.Inc</button>
              <button onClick={() => setActiveModal('soporte')} className="hover:text-cyan-400 transition cursor-pointer">Soporte</button>
              <button onClick={() => setActiveModal('privacidad')} className="hover:text-cyan-400 transition cursor-pointer">Privacidad</button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                id="btn-nav-demo-req"
                onClick={() => setActiveModal('demo')}
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-bold font-mono uppercase text-pink-400 bg-pink-950/20 border border-pink-500/20 hover:bg-pink-950/60 rounded-xl transition cursor-pointer"
              >
                Solicitar Demo
              </button>
              <button
                id="btn-nav-demo"
                onClick={onDemoBypass}
                className="hidden md:inline-flex items-center justify-center px-4 py-2 text-xs font-bold font-mono uppercase text-cyan-400 bg-cyan-950/20 border border-cyan-500/20 hover:bg-cyan-950/60 rounded-xl transition cursor-pointer"
              >
                <User className="h-4 w-4 mr-1.5" /> PROBAR DEMO
              </button>
              <button
                id="btn-nav-login"
                onClick={onGetStarted}
                className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold font-mono uppercase text-slate-950 bg-gradient-to-r from-cyan-400 to-pink-500 hover:from-cyan-300 hover:to-pink-400 rounded-xl transition shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-28 px-4 overflow-hidden text-center z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 bg-slate-900/60 backdrop-blur-md text-cyan-300 px-4 py-2 rounded-full text-xs font-semibold font-mono mb-8 border border-cyan-500/25 shadow-lg shadow-cyan-500/5"
          >
            <Globe className="h-3.5 w-3.5 animate-spin text-cyan-400 [animation-duration:10s]" />
            <span className="font-light tracking-wide">TECNOLOGÍA DE PRIVACIDAD SOBERANA</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black font-display tracking-wider text-white max-w-4xl mx-auto leading-tight uppercase animate-fade-in"
          >
            Buzones de Correo <br />
            <span className="bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-500 bg-clip-text text-transparent neon-text-cyan">
              Gratis y Descentralizados
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-light leading-relaxed font-sans"
          >
            Elimina el pago recurrente por casillas empresariales de correo. Configura tus DNS corporativos en minutos, crea alias inteligentes y gestiona tu comunicación de forma gratuita con el respaldo asimétrico de Safeness.Inc.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-4"
          >
            <button
              id="btn-hero-start"
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-xs font-bold font-mono tracking-wider uppercase text-slate-950 bg-gradient-to-r from-cyan-450 via-pink-450 to-purple-500 hover:from-cyan-350 hover:to-purple-400 rounded-xl transition duration-300 transform hover:-translate-y-0.5 cursor-pointer shadow-lg shadow-cyan-500/25 font-extrabold"
            >
              Iniciar sesión corporativa <ArrowRight className="h-4 w-4 ml-1.5 text-slate-950" />
            </button>
            <button
              id="btn-hero-demo-req"
              onClick={() => setActiveModal('demo')}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-xs font-bold font-mono tracking-wider uppercase text-pink-400 bg-slate-900 hover:bg-slate-850 border border-pink-500/30 rounded-xl transition duration-300 transform hover:-translate-y-0.5 cursor-pointer shadow-md shadow-pink-500/5"
            >
              Solicitar Demo
            </button>
            <button
              id="btn-hero-demo"
              onClick={onDemoBypass}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-xs font-bold font-mono tracking-wider uppercase text-cyan-400 bg-slate-900 hover:bg-slate-850 border border-cyan-500/30 rounded-xl transition duration-300 transform hover:-translate-y-0.5 cursor-pointer shadow-md shadow-cyan-500/5"
            >
              Entrar Sandbox Demo
            </button>
          </motion.div>
        </div>
      </header>

      {/* Interactive Visual DNS preview */}
      <section className="py-6 relative z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="glass-panel-heavy rounded-3xl p-6 sm:p-8 text-left shadow-2xl overflow-hidden border border-cyan-500/20">
            <div className="flex items-center justify-between border-b border-cyan-500/10 pb-4 mb-6">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <span className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-[10px] text-cyan-400 font-mono pl-3">safeness_dns_matrix.json</span>
              </div>
              <span className="text-[9px] text-cyan-400 font-mono bg-cyan-950/50 px-2.5 py-1 rounded border border-cyan-500/30 font-bold tracking-widest animate-pulse">
                SISTEMA EN LÍNEA
              </span>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                REGISTROS AUTOGENERADOS PARA EL HOSTING DE TU DOMINIO:
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs text-slate-305">
                <div className="bg-slate-950/85 p-4 rounded-xl border border-cyan-500/10">
                  <span className="text-pink-400 block mb-1 text-[9px] font-bold tracking-widest uppercase">TIPO</span>
                  <span className="font-bold text-white bg-pink-950/55 px-2 py-0.5 rounded border border-pink-500/25">MX (Correo)</span>
                </div>
                <div className="bg-slate-950/85 p-4 rounded-xl border border-cyan-500/10">
                  <span className="text-slate-400 block mb-1 text-[9px] font-bold tracking-widest uppercase">HOST</span>
                  <span>@</span>
                </div>
                <div className="bg-slate-950/85 p-4 rounded-xl border border-cyan-500/10 md:col-span-2">
                  <span className="text-cyan-400 block mb-1 text-[9px] font-bold tracking-widest uppercase">VALOR DESTINO</span>
                  <div className="flex flex-col space-y-1">
                    <span className="break-all select-all text-[#00f0ff] font-bold">10 mx1.improvmx.com</span>
                    <span className="break-all select-all text-[#00f0ff] font-bold">20 mx2.improvmx.com</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs text-slate-305">
                <div className="bg-slate-950/85 p-4 rounded-xl border border-cyan-500/10">
                  <span className="text-pink-400 block mb-1 text-[9px] font-bold tracking-widest uppercase">TIPO</span>
                  <span className="font-bold text-white bg-purple-950/55 px-2 py-0.5 rounded border border-purple-500/25">TXT (SPF)</span>
                </div>
                <div className="bg-slate-950/85 p-4 rounded-xl border border-cyan-500/10">
                  <span className="text-slate-400 block mb-1 text-[9px] font-bold tracking-widest uppercase">HOST</span>
                  <span>@</span>
                </div>
                <div className="bg-slate-950/85 p-4 rounded-xl border border-cyan-500/10 md:col-span-2">
                  <span className="text-cyan-400 block mb-1 text-[9px] font-bold tracking-widest uppercase">VALOR DESTINO</span>
                  <span className="break-all select-all text-[#00f0ff] font-bold">v=spf1 include:spf.improvmx.com ~all</span>
                </div>
              </div>
            </div>
            <p className="text-slate-400 text-[10px] text-center mt-6 font-mono">
              * El validador automatizado de Safeness.Inc escanea los registros DNS en intervalos de fondo de forma asíncrona.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black font-display tracking-wider text-white uppercase">
            INFRAESTRUCTURA PREMIUM DISEÑADA
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto font-light leading-relaxed">
            Hemos integrado resguardo asimétrico y microservicios de Google Cloud Run para garantizar la máxima entregabilidad de tus correos comerciales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="glass-panel p-8 rounded-3xl border border-cyan-500/10 hover:border-cyan-400/40 transition duration-300 group hover:shadow-lg hover:shadow-cyan-500/5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-tr from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500 rounded-bl-3xl" />
              <div className="bg-slate-950/80 w-10 h-10 rounded-xl flex items-center justify-center mb-5 border border-cyan-500/20 group-hover:neon-border-cyan transition">
                {feat.icon}
              </div>
              <h3 className="text-sm font-bold font-mono text-white mb-2 uppercase tracking-wide group-hover:text-cyan-350 transition">{feat.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Corporate profile for Safeness.Inc */}
      <section className="py-16 max-w-5xl mx-auto px-4 relative z-10 border-t border-cyan-500/10">
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-cyan-550/15 overflow-hidden flex flex-col md:flex-row items-center gap-8 bg-slate-900/50 backdrop-blur-md">
          <div className="space-y-4 flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-gradient-to-tr from-cyan-500 to-pink-500 rounded-xl text-white inline-block">
                <Shield className="h-5 w-5 text-white" />
              </span>
              <div>
                <h4 className="text-xs font-black tracking-widest text-[#a0a0a0] font-mono leading-none">PROVEEDOR TECNOLÓGICO</h4>
                <p className="text-base font-black text-white font-display mt-0.5 tracking-wide">Safeness.Inc Corporate Integrity</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-305 font-light leading-relaxed">
              Establecida en la costa tecnológica de Denver, Colorado, <strong className="font-semibold text-white">Safeness.Inc</strong> es líder en ingeniería de soberanía informática y auditorías criptográficas de entregabilidad SMTP. Diseñamos módulos que resguardan la correspondencia bajo infraestructura propietaria de los clientes, garantizando confidencialidad asimétrica de extremo a extremo.
            </p>

            <div className="flex gap-4 pt-1 text-[11px] font-mono text-slate-400">
              <p>• Denver, Colorado, EUA</p>
              <p>• Soporte de confianza 24/7</p>
              <p>• Enlace SSL Seguro</p>
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-850 shrink-0 text-center w-full md:w-fit min-w-[210px] space-y-4">
            <Lock className="h-8 w-8 text-cyan-400 mx-auto stroke-1" />
            <div>
              <p className="text-[10px] text-slate-500 font-mono">Resguardo certificado por</p>
              <p className="text-xs font-bold text-white uppercase tracking-wider font-sans mt-0.5">Safeness Security Matrix</p>
            </div>
            <button
              onClick={() => setActiveModal('safeness')}
              className="w-full py-2 bg-slate-900 text-cyan-400 hover:bg-slate-850 text-xs font-mono font-bold uppercase rounded-xl border border-cyan-500/20 px-4 transition cursor-pointer"
            >
              Conocer más
            </button>
          </div>
        </div>
      </section>

      {/* Guide Steps */}
      <section className="py-20 max-w-5xl mx-auto px-4 relative z-10">
        <h2 className="text-3xl font-black font-display text-center text-white mb-16 uppercase tracking-wider">
          PASAR A SER EMISOR EN 3 PASOS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative p-6 glass-panel rounded-3xl border border-cyan-500/15 text-left hover:border-cyan-400 transition">
            <span className="absolute -top-4 -left-4 w-9 h-9 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-black flex items-center justify-center font-mono text-xs shadow-lg">1</span>
            <h3 className="text-sm font-bold font-mono mt-2 mb-2 text-white uppercase tracking-wide">Acceso Seguro</h3>
            <p className="text-xs text-slate-300 font-light">Entra digitando el dominio corporativo de tu empresa u opciones rápidas de SSO.</p>
          </div>
          <div className="relative p-6 glass-panel rounded-3xl border border-cyan-500/15 text-left hover:border-pink-400 transition">
            <span className="absolute -top-4 -left-4 w-9 h-9 rounded-full bg-slate-900 border border-cyan-500/50 text-cyan-400 font-black flex items-center justify-center font-mono text-xs shadow-md">2</span>
            <h3 className="text-sm font-bold font-mono mt-2 mb-2 text-white uppercase tracking-wide">Esquema DNS</h3>
            <p className="text-xs text-slate-300 font-light">Actualiza los registros estructurados en tu panel de hosting habitual (Cloudflare, GoDaddy).</p>
          </div>
          <div className="relative p-6 glass-panel rounded-3xl border border-cyan-500/15 text-left hover:border-cyan-400 transition">
            <span className="absolute -top-4 -left-4 w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black flex items-center justify-center font-mono text-xs shadow-lg">3</span>
            <h3 className="text-sm font-bold font-mono mt-2 mb-2 text-white uppercase tracking-wide">Tránsito Activo</h3>
            <p className="text-xs text-slate-300 font-light">Crea tus buzones personalizados y comienza a emitir y recibir correos con cifrado asimétrico.</p>
          </div>
        </div>
      </section>

      {/* Footer with exact required link blocks */}
      <footer className="border-t border-cyan-500/15 bg-slate-955 py-12 text-center text-xs text-slate-400 relative z-10 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-pink-500 p-2 rounded-xl text-white">
              <Mail className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-white font-display tracking-wider font-sans">FREEMAIL</span>
              <span className="text-[8px] tracking-widest text-[#a0a0a0] font-mono leading-none">by Safeness.Inc</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-slate-400">
            <button onClick={() => setActiveModal('planes')} className="hover:text-cyan-400 transition cursor-pointer">Planes</button>
            <button onClick={() => setActiveModal('safeness')} className="hover:text-cyan-400 transition cursor-pointer">Empresa</button>
            <button onClick={() => setActiveModal('soporte')} className="hover:text-cyan-400 transition cursor-pointer">Soporte</button>
            <button onClick={() => setActiveModal('privacidad')} className="hover:text-cyan-400 transition cursor-pointer">Política de Privacidad</button>
          </div>

          <p className="font-light max-w-md text-center sm:text-right text-slate-400 font-sans">
            © 2026 Safeness.Inc - Todos los derechos reservados
          </p>
        </div>
      </footer>

      {/* -------------------- INTERACTIVE POPUP DIALOGS -------------------- */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setActiveModal(null);
                  setDemoSuccess(false);
                }}
                className="absolute top-4 right-4 p-2 bg-slate-950 hover:bg-slate-850 rounded-full text-slate-400 hover:text-white transition cursor-pointer border border-slate-850"
              >
                <X className="h-5 w-5" />
              </button>

              {/* ----- A. PLANES POPUP ----- */}
              {activeModal === 'planes' && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 font-bold px-2 py-0.5 rounded uppercase tracking-widest font-mono">TABLA DE SUSCRIPCIONES</span>
                    <h3 className="text-xl font-black text-white uppercase font-display tracking-wide mt-2">Planes de Aprovisionamiento</h3>
                    <p className="text-xs text-slate-400 mt-1">Escala el número de cuentas independientes asociadas a tu hosting.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans pt-2">
                    <div className="p-4 rounded-2xl bg-slate-955 border border-slate-805 text-left flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-white uppercase">Gratuito</h4>
                        <p className="text-xs text-slate-400 mt-2 font-light">• <strong className="text-white">5 cuentas</strong> por dominio</p>
                        <p className="text-xs text-slate-400 mt-1 font-light">• IMAP/SMTP standard</p>
                      </div>
                      <span className="text-xs font-bold text-cyan-400 font-mono mt-4 block">$0 / Mes</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-955 border border-cyan-500/25 text-left flex flex-col justify-between relative">
                      <span className="absolute -top-2 right-2 bg-pink-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">Pro</span>
                      <div>
                        <h4 className="font-bold text-xs text-cyan-400 uppercase">Plan Pro</h4>
                        <p className="text-xs text-slate-400 mt-2 font-light">• <strong className="text-white">25 cuentas</strong> por dominio</p>
                        <p className="text-xs text-slate-400 mt-1 font-light">• Autoconfig QR iOS</p>
                      </div>
                      <span className="text-xs font-bold text-pink-400 font-mono mt-4 block">$9.99 / Anual</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-955 border border-slate-805 text-left flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-white uppercase">Empresarial</h4>
                        <p className="text-xs text-slate-400 mt-2 font-light">• <strong className="text-white">Ilimitadas Casillas</strong></p>
                        <p className="text-xs text-slate-400 mt-1 font-light">• Auditorías de Logs</p>
                      </div>
                      <span className="text-xs font-bold text-white font-mono mt-4 block">$29.99 / Mes</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-955 border border-slate-800 rounded-xl text-[11px] text-slate-400 leading-relaxed text-left">
                    <p className="font-semibold text-slate-300">¿Requieres un esquema a medida de más de 100 casillas?</p>
                    <p className="font-light mt-1">Por favor escribe a nuestro sector comercial para formalizar contratos corporativos exclusivos: <strong className="text-cyan-400 select-all font-mono">soporte@safeness.net</strong></p>
                  </div>
                </div>
              )}

              {/* ----- B. SOPORTE POPUP ----- */}
              {activeModal === 'soporte' && (
                <div className="space-y-6 text-left">
                  <div>
                    <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 font-bold px-2 py-0.5 rounded uppercase tracking-widest font-mono">ASISTENCIA CORPORATIVA</span>
                    <h3 className="text-xl font-black text-white uppercase font-display tracking-wide mt-2">Centro de Respuestas de Safeness.Inc</h3>
                    <p className="text-xs text-slate-400 mt-1">Nuestros ingenieros solucionan incidencias las 24 horas del día.</p>
                  </div>

                  <div className="space-y-4 text-xs font-light">
                    <div className="p-4 bg-slate-955 rounded-2xl border border-slate-850">
                      <h4 className="font-bold text-white font-sans flex items-center gap-1.5"><Phone className="h-4 w-4 text-cyan-455" /> Línea de Emergencia Cifrada</h4>
                      <p className="text-slate-400 mt-1.5">Comunicación prioritaria las 24h para administradores de dominios con Plan Pro/Empresarial: <strong className="text-white font-mono select-all">+1 (303) 555-0199</strong></p>
                    </div>

                    <div className="p-4 bg-slate-955 rounded-2xl border border-slate-850">
                      <h4 className="font-bold text-white font-sans flex items-center gap-1.5"><Mail className="h-4 w-4 text-pink-455" /> Soporte por Correo Electrónico</h4>
                      <p className="text-slate-400 mt-1.5">Buzón directo para consultas sobre registros DNS, migración SSL, y fallos de autoconfiguración: <strong className="text-cyan-400 font-mono select-all">soporte@safeness.net</strong></p>
                    </div>

                    <div className="p-4 bg-slate-955 rounded-2xl border border-slate-850">
                      <h4 className="font-bold text-white font-sans flex items-center gap-1.5"><Clock className="h-4 w-4 text-purple-455" /> Tiempo Promedio de Respuesta</h4>
                      <p className="text-slate-450 mt-1">• Cuentas Enterprise / Pro: &lt; 15 Minutos <br />• Cuentas Starter: &lt; 4 Horas</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ----- C. PRIVACIDAD POPUP ----- */}
              {activeModal === 'privacidad' && (
                <div className="space-y-6 text-left">
                  <div>
                    <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 font-bold px-2 py-0.5 rounded uppercase tracking-widest font-mono">MARCO DE CONFIDENCIALIDAD</span>
                    <h3 className="text-xl font-black text-white uppercase font-display tracking-wide mt-2">Política de Privacidad y Resguardo</h3>
                    <p className="text-xs text-slate-400 mt-1">Conoce cómo protegemos tus firmas de correspondencia.</p>
                  </div>

                  <div className="space-y-4 text-xs font-light text-slate-350 leading-relaxed overflow-y-auto max-h-[50vh] pr-2">
                    <p>
                      <strong>1. Cifrado y Soberanía Criptográfica:</strong> Las contraseñas asociadas a los buzones temporales y perfiles firmados nunca se guardan en texto plano en la infraestructura centralizadora. Son procesadas de forma autónoma utilizando JSON Web Tokens temporales cifrados asimétricamente por la suite Openssl.
                    </p>
                    <p>
                      <strong>2. Recopilación de Metadatos de Red:</strong> FreeMail Hub no lee el contenido de tus correos. Solo realiza el enrutamiento SMTP / IMAP en base a las reglas configuradas. La base de datos Firebase gestiona la persistencia de autenticación corporativa resguardada por reglas de seguridad robustas de Firestore.
                    </p>
                    <p>
                      <strong>3. Cookies Técnicas:</strong> Mantenemos exclusivamente cookies de sesión necesarias para conservar la persistencia de la consola de administración en el navegador del usuario.
                    </p>
                    <p>
                      <strong>4. Colorado Privacy Act (CPA):</strong> En cumplimiento con los reglamentos de privacidad informática del estado de Colorado, el usuario posee derecho total de revocar de forma definitiva e inmediata su dominio registrado y los aliases asociados, eliminando todo rastro de correspondencia del servidor tras pulsar el botón de eliminación de casillas.
                    </p>
                  </div>
                </div>
              )}

              {/* ----- D. CONOCER MÁS SAFENESS CO ----- */}
              {activeModal === 'safeness' && (
                <div className="space-y-6 text-left">
                  <div>
                    <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 font-bold px-2 py-0.5 rounded uppercase tracking-widest font-mono">PERFIL DE COMPAÑÍA</span>
                    <h3 className="text-xl font-black text-white uppercase font-display tracking-wide mt-2">Safeness.Inc Corporate</h3>
                    <p className="text-xs text-slate-400 mt-1">Líderes globales en descentralización de capas de comunicación corporativa.</p>
                  </div>

                  <div className="space-y-4 text-xs text-slate-300 font-light leading-relaxed">
                    <p>
                      Fundada en la costa tecnológica de Colorado por expertos en seguridad cibernética aplicada, <strong className="font-semibold text-white">Safeness.Inc</strong> nació con la misión de habilitar a pequeñas, medianas y grandes corporaciones para poseer y resguardar su propia infraestructura sin requerir costosos contratos de licencias recurrentes por buzón.
                    </p>
                    <div className="grid grid-cols-2 gap-4 pt-2 font-mono">
                      <div className="p-4 bg-slate-955 rounded-2xl border border-slate-850">
                        <span className="text-[9px] text-pink-400 block font-bold">SEDE CENTRAL</span>
                        <span className="text-white mt-1 block">Denver, Colorado, EE.UU.</span>
                      </div>
                      <div className="p-4 bg-slate-955 rounded-2xl border border-slate-850">
                        <span className="text-[9px] text-cyan-400 block font-bold">MATRIZ REGULADOR</span>
                        <span className="text-white mt-1 block">Colorado SOS Registered</span>
                      </div>
                    </div>
                    <p>
                      Nuestras auditorías de entregabilidad asíncronas analizan continuamente SPF, DKIM y DMARC de los clientes para asegurar que la emisión de correspondencia retenga niveles insuperables de aceptación antispam internacional.
                    </p>
                  </div>
                </div>
              )}

              {/* ----- E. SOLICITAR DEMO FORM POPUP ----- */}
              {activeModal === 'demo' && (
                <div className="space-y-6 text-left select-none">
                  <div>
                    <span className="text-[9px] bg-pink-950 text-pink-400 border border-pink-500/20 font-bold px-2 py-0.5 rounded uppercase tracking-widest font-mono">REUNIÓN CORPORATIVA</span>
                    <h3 className="text-xl font-black text-white uppercase font-display tracking-wide mt-2">Agendar Demo Interactiva</h3>
                    <p className="text-xs text-slate-400 mt-1 font-light">Completa el formulario para reservar una llamada exclusiva con un especialista de Safeness.Inc.</p>
                  </div>

                  {demoSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-center space-y-3"
                    >
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-400 flex items-center justify-center mx-auto">
                        <Check className="h-6 w-6 text-emerald-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white uppercase font-mono">¡Solicitud recibida correctamente!</h4>
                      <p className="text-xs text-slate-350 leading-relaxed font-light">
                        Hemos agendado tu demo de resguardo con Safeness.Inc. Recibirás un correo corporativo formal de confirmación con el enlace de llamada SSL.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleBookDemoSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider">Nombre del Remitente</label>
                          <input
                            type="text"
                            value={demoName}
                            onChange={(e) => setDemoName(e.target.value)}
                            placeholder="Ej: Robert Johnson"
                            required
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider">Email Corporativo de Contacto</label>
                          <input
                            type="email"
                            value={demoEmail}
                            onChange={(e) => setDemoEmail(e.target.value)}
                            placeholder="Ej: robert@coach-iso.eu"
                            required
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider">Empresa / Dominio principal</label>
                        <input
                          type="text"
                          value={demoCompany}
                          onChange={(e) => setDemoCompany(e.target.value)}
                          placeholder="Ej: Coach ISO Consulting"
                          required
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider">Texto de Consulta o Mensaje</label>
                        <textarea
                          value={demoMessage}
                          onChange={(e) => setDemoMessage(e.target.value)}
                          placeholder="Escribe detalles sobre la escala de buzones deseada..."
                          rows={3}
                          required
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-extrabold text-xs uppercase font-mono tracking-wider transition rounded-xl shadow-lg shadow-pink-500/10 cursor-pointer"
                      >
                        RESERVAR LLAMADA DE NEGOCIO <ArrowRight className="h-4 w-4 ml-1.5 inline" />
                      </button>
                    </form>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
