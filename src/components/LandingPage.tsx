/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Mail, Globe, Shield, RefreshCw, Layers, ArrowRight, CheckCircle2, User, HelpCircle } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onDemoBypass: () => void;
}

export default function LandingPage({ onGetStarted, onDemoBypass }: LandingPageProps) {
  const features = [
    {
      icon: <Globe className="h-5 w-5 text-emerald-600" />,
      title: "Dominio Personalizado",
      description: "Conecta tu propio dominio (ej: midominio.com) y destaca profesionalmente con una dirección que te represente."
    },
    {
      icon: <Layers className="h-5 w-5 text-slate-700 dark:text-slate-300" />,
      title: "Hasta 15 Buzones Gratuito",
      description: "Crea cuentas independientes como ventas@, hola@ o tu-nombre@ sin pagar costos extra por casilla."
    },
    {
      icon: <Shield className="h-5 w-5 text-emerald-600" />,
      title: "Configuración de DNS Segura",
      description: "Generamos registros MX, SPF, DKIM y DMARC automáticamente para asegurar la máxima entregabilidad y filtros antispam."
    },
    {
      icon: <Mail className="h-5 w-5 text-slate-700 dark:text-slate-300" />,
      title: "Poderoso Cliente Webmail",
      description: "Una interfaz rápida y responsiva para recibir, buscar y enviar correos, provista de un asistente de redacción con Inteligencia Artificial."
    },
    {
      icon: <RefreshCw className="h-5 w-5 text-emerald-600" />,
      title: "Gmail Integrado & Reenvío",
      description: "Visualiza o reenvía tus correos hacia cuentas externas, o utilízalo de forma directa integrándolo con tu cliente de Gmail tradicional."
    },
    {
      icon: <CheckCircle2 className="h-5 w-5 text-slate-700 dark:text-slate-300" />,
      title: "100% Gratis",
      description: "Aprovecha los recursos del plan Starter Tier de Google Cloud con límites generosos (hasta 1 GB de espacio interno y 100 envíos diarios)."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-600 selection:text-white select-none">
      {/* Top Bar / Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-slate-900 dark:bg-slate-800 p-2 rounded-xl text-white shadow-xs">
                <Mail className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
                FreeMail Hub
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                id="btn-nav-demo"
                onClick={onDemoBypass}
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/85 rounded-xl transition cursor-pointer"
              >
                <User className="h-4 w-4 mr-1.5" /> Probador Rápido (Demo)
              </button>
              <button
                id="btn-nav-login"
                onClick={onGetStarted}
                className="inline-flex items-center justify-center px-4.5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl transition cursor-pointer"
              >
                Entrar a la Consola <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-24 px-4 overflow-hidden border-b border-slate-200 dark:border-slate-900 bg-linear-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-955">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-850 dark:text-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 shadow-xs border border-emerald-200/50 dark:border-emerald-900/30"
          >
            <Globe className="h-3.5 w-3.5 animate-pulse text-emerald-605" />
            <span className="font-light text-slate-600 dark:text-slate-350">Aloja gratis tus correos bajo tu propio dominio</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black font-display tracking-tight text-slate-955 dark:text-white max-w-4xl mx-auto leading-tight"
          >
            Servicio de Correo Profesional <br />
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-slate-800 dark:to-slate-300 bg-clip-text text-transparent">
              100% Gratis para tu Dominio
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-sm sm:text-base text-slate-550 dark:text-slate-400 max-w-2xl mx-auto font-light leading-relaxed font-sans"
          >
            Deja de pagar costosas licencias por casilla de correo. Configura tus DNS, crea alias para todo tu negocio y envía correos con máxima confianza de forma gratuita.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4"
          >
            <button
              id="btn-hero-start"
              onClick={onGetStarted}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl transition transform hover:-translate-y-0.5 cursor-pointer shadow-sm"
            >
              Crea tu Cuenta Gratis <ArrowRight className="h-4 w-4 ml-1.5" />
            </button>
            <button
              id="btn-hero-demo"
              onClick={onDemoBypass}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-xs font-semibold text-slate-705 dark:text-slate-300 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-805 border border-slate-205 dark:border-slate-800 rounded-xl transition transform hover:-translate-y-0.5 cursor-pointer shadow-xs"
            >
              Probar Consola al Instante
            </button>
          </motion.div>
        </div>

        {/* Decorative Grid SVG background */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      </header>

      {/* Interactive Visual DNS preview */}
      <section className="py-12 bg-white dark:bg-slate-900 border-b border-slate-205 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-slate-950 rounded-3xl p-6 sm:p-8 text-left shadow-lg overflow-hidden border border-slate-850">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center space-x-3">
                <span className="h-3 w-3 rounded-full bg-slate-800" />
                <span className="h-3 w-3 rounded-full bg-slate-750" />
                <span className="h-3 w-3 rounded-full bg-slate-700" />
                <span className="text-xs text-slate-400 font-mono pl-2">dns_records_generator.json</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-955/40 px-2 py-0.5 rounded border border-emerald-900/40 font-semibold tracking-wider">
                PROVEEDOR ACTIVO
              </span>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold font-display text-white">¿Cómo configurarlo? Generamos tus DNS listos para copiar:</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs text-slate-300">
                <div className="bg-white/5 p-4 rounded-xl border border-slate-800/80">
                  <span className="text-emerald-400 block mb-1 text-[10px] font-semibold">TIPO</span>
                  <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">MX (Correo)</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block mb-1 text-[10px] font-semibold">HOST</span>
                  <span>@</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-slate-800/80 md:col-span-2">
                  <span className="text-emerald-400 block mb-1 text-[10px] font-semibold">VALOR DESTINO</span>
                  <span className="break-all select-all text-white">10 mail.freemailhub.com</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs text-slate-300">
                <div className="bg-white/5 p-4 rounded-xl border border-slate-800/80">
                  <span className="text-emerald-400 block mb-1 text-[10px] font-semibold">TIPO</span>
                  <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">TXT (SPF)</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block mb-1 text-[10px] font-semibold">HOST</span>
                  <span>@</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-slate-800/80 md:col-span-2">
                  <span className="text-emerald-400 block mb-1 text-[10px] font-semibold">VALOR DESTINO</span>
                  <span className="break-all select-all text-white">v=spf1 include:spf.freemailhub.com ~all</span>
                </div>
              </div>
            </div>
            <p className="text-slate-400 text-[11px] text-center mt-6 font-sans font-light">
              * El sistema comprobará cada 30 segundos si has modificado estos valores antes de habilitar tus aliases.
            </p>
          </div>
        </div>
      </section>
      {/* Feature Bento Grid */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Solución Todo-en-Uno Sin Fronteras de Pago
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-slate-550 dark:text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
            Hemos reunido las mejores tecnologías nativas en la nube de Google Cloud y Firebase para ofrecerte un servicio de correo electrónico sólido y seguro.
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
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition duration-200 hover:border-emerald-400"
            >
              <div className="bg-slate-50 dark:bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center mb-5">
                {feat.icon}
              </div>
              <h3 className="text-sm font-bold font-display text-slate-955 dark:text-white mb-2">{feat.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Limits & Details Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/40 border-t border-b border-slate-205 dark:border-slate-850">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold font-display text-slate-950 dark:text-slate-100 mb-6">
            Límites del Plan Gratuito (Starter Tier)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
              <span className="block text-3xl font-extrabold font-display text-emerald-600">1</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">Dominio Privado</span>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
              <span className="block text-3xl font-extrabold font-display text-emerald-600">15</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">Direcciones Alias</span>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
              <span className="block text-3xl font-extrabold font-display text-emerald-600">1 GB</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">Espacio en Disco</span>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
              <span className="block text-3xl font-extrabold font-display text-emerald-600">100</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">Correos / Día</span>
            </div>
          </div>
          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto font-light leading-relaxed">
            ¿Necesitas más? Exporta todo el código fuente con 1 click a tu cuenta de GitHub y despliega en tu propio clúster de Google Cloud Run para remover cualquier limitación.
          </p>
        </div>
      </section>

      {/* Guide Steps */}
      <section className="py-24 max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-bold font-display text-center text-slate-900 dark:text-white mb-12">
          Listo en 3 sencillos pasos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-left shadow-xs">
            <span className="absolute -top-4 -left-4 w-9 h-9 rounded-full bg-slate-900 dark:bg-emerald-600 text-white font-bold flex items-center justify-center shadow-xs font-display text-xs">1</span>
            <h3 className="text-sm font-bold font-display mt-2 mb-2 text-slate-950 dark:text-white">Registra tu Cuenta</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-light">Entra con correo o mediante Google Sign-In de forma instantánea y segura.</p>
          </div>
          <div className="relative p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-left shadow-xs">
            <span className="absolute -top-4 -left-4 w-9 h-9 rounded-full bg-slate-700 dark:bg-slate-800 text-white font-bold flex items-center justify-center shadow-xs font-display text-xs">2</span>
            <h3 className="text-sm font-bold font-display mt-2 mb-2 text-slate-950 dark:text-white">Añade tu Dominio</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-light">Copia las DNS que autogeneramos especificadas en paneles como Cloudflare o GoDaddy.</p>
          </div>
          <div className="relative p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-left shadow-xs">
            <span className="absolute -top-4 -left-4 w-9 h-9 rounded-full bg-emerald-600 dark:bg-emerald-700 text-white font-bold flex items-center justify-center shadow-xs font-display text-xs">3</span>
            <h3 className="text-sm font-bold font-display mt-2 mb-2 text-slate-950 dark:text-white">Crea tu correo</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-light">Da de alta tus primeros casilleros (ventas@, etc) y comienza a recibir inmediatamente.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-205 dark:border-slate-850 bg-white dark:bg-slate-955 py-12 text-center text-xs text-slate-500 dark:text-slate-400 font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className="bg-slate-900 dark:bg-slate-800 p-1.5 rounded-lg text-white">
              <Mail className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-855 dark:text-white font-display">FreeMail Hub</span>
          </div>
          <p className="font-light">© 2026 FreeMail Hub. Diseñado bajo los estándares del plan Starter Tier de Google Cloud. Código libre.</p>
        </div>
      </footer>
    </div>
  );
}
