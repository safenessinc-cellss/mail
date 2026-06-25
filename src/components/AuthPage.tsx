/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  auth, 
  googleProvider, 
  microsoftProvider,
  signInWithPopup,
  signOut
} from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { Mail, Shield, AlertTriangle, ArrowLeft, Loader2, Sparkles, Key, ChevronRight } from 'lucide-react';
import DnsParticles from "./DnsParticles";

interface AuthPageProps {
  onAuthSuccess: (user: any) => void;
  onBackToLanding: () => void;
  onDemoBypass: () => void;
}

export default function AuthPage({ onAuthSuccess, onBackToLanding, onDemoBypass }: AuthPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exclude consumer domains, but allow safeness.c.a@gmail.com for admin
  const isFreeEmail = (enteredEmail: string): boolean => {
    const emailLower = enteredEmail.trim().toLowerCase();
    if (emailLower === 'safeness.c.a@gmail.com') {
      return false; // Allowed exemption
    }
    const freeDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com',
      'aol.com', 'mail.ru', 'mail.com', 'zoho.com', 'protonmail.com', 'proton.me',
      'yandex.com', 'yandex.ru', 'live.cl', 'msn.com', 'gmx.com'
    ];
    const parts = emailLower.split('@');
    if (parts.length < 2) return false;
    const domain = parts[1];
    return freeDomains.some(fDom => domain === fDom || domain.endsWith('.' + fDom));
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const userEmail = result.user.email || '';
        if (isFreeEmail(userEmail)) {
          await signOut(auth);
          setError("Acceso denegado. Google OAuth detectó una cuenta de consumidor (@gmail.com). Regístrate o ingresa exclusivamente con tu correo corporativo de Google Workspace.");
          setLoading(false);
          return;
        }
        onAuthSuccess(result.user);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError("El navegador bloqueó la ventana de Google. Por favor, habilita las ventanas emergentes o ingresa con correo corporativo y contraseña.");
      } else {
        setError(err.message || "Error al iniciar sesión con Google");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      if (result.user) {
        const userEmail = result.user.email || '';
        if (isFreeEmail(userEmail)) {
          await signOut(auth);
          setError("Acceso denegado. Microsoft OAuth detectó una cuenta personal (@outlook/hotmail). Regístrate o ingresa exclusivamente con tu correo corporativo de Office 365 o Azure.");
          setLoading(false);
          return;
        }
        onAuthSuccess(result.user);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError("El navegador bloqueó la ventana de Microsoft. Por favor, habilita las ventanas emergentes para continuar.");
      } else {
        setError(err.message || "Error al iniciar sesión con Microsoft.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    // Check for corporate email domain
    if (isFreeEmail(email)) {
      setError("Acceso denegado. Freemail Hub es exclusivo para empresas. No se permiten registros ni inicios de sesión con correos gratuitos (Gmail, Yahoo, Outlook.com, etc.).");
      return;
    }

    if (isRegister && !displayName) {
      setError("Por favor define tu nombre completo corporativo.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        onAuthSuccess(userCredential.user);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(userCredential.user);
      }
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message;
      if (err.code === 'auth/invalid-credential') {
        friendlyMessage = "Correo o contraseña incorrectos.";
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = "Este correo electrónico ya está registrado.";
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = "La contraseña es muy débil (mínimo 6 caracteres).";
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Interactive Spaceship Particles */}
      <ParticlesBackground />

      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel-heavy rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 transition border border-cyan-500/30">
        
        {/* Back Button */}
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center text-xs text-cyan-400 hover:text-cyan-300 mb-6 transition cursor-pointer font-semibold font-mono"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> VOLVER A PORTADA
        </button>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-tr from-cyan-500 to-pink-500 p-3 rounded-2xl text-white inline-block shadow-lg shadow-cyan-500/20 mb-3">
            <Mail className="h-6 w-6 text-white" />
          </div>
          
          <h2 className="text-3xl font-black font-display tracking-wider text-white neon-text-cyan">
            FREEMAIL
          </h2>
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-2 font-mono">
            by Safeness.Inc
          </span>

          <p className="text-xs text-slate-300 mt-1 font-light max-w-xs mx-auto">
            {isRegister 
              ? "Registra hoy tu correo corporativo seguro en la nube" 
              : "Consola descentralizada de correo corporativo automatizado"}
          </p>
        </div>

        {/* Rapid Demo Bypass Trigger */}
        <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-2xl p-4 mb-6 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0 animate-pulse" />
            <div>
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Acceso Rápido Sandbox
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 font-light leading-relaxed">
                Haz clic abajo para saltar el login corporativo e iniciar sesión al instante con un dominio de prueba ya verificado y buzones ficticios.
              </p>
              <button
                id="btn-auth-demo"
                onClick={onDemoBypass}
                className="mt-3 w-full inline-flex items-center justify-center py-2 px-3 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white text-xs font-bold font-mono uppercase rounded-xl transition shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                AUTENTICACIÓN DEMO <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="bg-red-950/60 border border-red-500/50 p-4 rounded-xl text-xs text-red-200 flex items-start space-x-2.5 mb-6 shadow-inner animate-shake">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed font-light">{error}</span>
          </div>
        )}

        {/* Standard Email Auth Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-300 font-mono mb-1">
                Nombre Completo Corporativo
              </label>
              <input
                id="auth-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nombre de la empresa / Tu nombre"
                className="w-full px-4 py-2.5 glass-input rounded-xl text-xs"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-300 font-mono mb-1">
              Correo Corporativo
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ej: usuario@la-empresa.co"
              className="w-full px-4 py-2.5 glass-input rounded-xl text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-300 font-mono mb-1">
              Contraseña
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 glass-input rounded-xl text-xs font-mono"
              required
              minLength={6}
            />
          </div>

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition flex items-center justify-center shadow-lg shadow-pink-500/20 disabled:opacity-55 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isRegister ? (
              "CREAR CUENTA CORPORATIVA"
            ) : (
              "ENTRAR CON CREDENCIALES"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative bg-slate-950 px-3 text-[10px] font-bold tracking-widest text-slate-400 font-mono">
            O DE FORMA DIRECTA
          </span>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Google */}
          <button
            id="btn-auth-google"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 border border-cyan-500/20 bg-slate-950/80 hover:bg-slate-900 rounded-xl text-xs font-semibold font-mono tracking-tight text-white transition flex items-center justify-center cursor-pointer border-neon-cyan/20 hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-500/10"
          >
            <svg className="h-4 w-4 mr-2 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.59 5.59 0 0 1 8.4 12.9a5.59 5.59 0 0 1 5.591-5.614c1.474 0 2.802.534 3.824 1.417l3.12-3.12C18.981 3.738 16.65 2.7 13.991 2.7C8.167 2.7 3.4 7.467 3.4 13.29s4.767 10.59 10.591 10.59c6.438 0 10.154-4.52 10.154-10.32c0-.525-.046-1.125-.13-1.275H12.24Z"
              />
            </svg>
            Google OAuth
          </button>

          {/* Microsoft */}
          <button
            id="btn-auth-microsoft"
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 border border-pink-500/20 bg-slate-950/80 hover:bg-slate-900 rounded-xl text-xs font-semibold font-mono tracking-tight text-white transition flex items-center justify-center cursor-pointer border-neon-pink/20 hover:border-pink-400 hover:shadow-md hover:shadow-pink-500/10"
          >
            {/* Microsoft Windows Layout Logo shape */}
            <svg className="h-4 w-4 mr-2 shrink-0" viewBox="0 0 23 23">
              <path fill="#f35325" d="M0 0h11v11H0z" />
              <path fill="#81bc06" d="M12 0h11v11H12z" />
              <path fill="#05a6f0" d="M0 12h11v11H0z" />
              <path fill="#ffba08" d="M12 12h11v11H12z" />
            </svg>
            Microsoft 365
          </button>
        </div>

        {/* Switch Register/Login */}
        <div className="mt-6 text-center text-xs">
          <span className="text-slate-400 font-light">
            {isRegister ? "¿Tu empresa ya tiene una cuenta? " : "¿Nuevo en Freemail Hub? "}
          </span>
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-cyan-400 font-bold hover:underline cursor-pointer font-mono"
          >
            {isRegister ? "INICIAR SESIÓN" : "REGISTRAR DOMINIO"}
          </button>
        </div>

        {/* Terms footer */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-[10px] text-center text-slate-450 flex flex-col items-center justify-center gap-1 font-mono">
          <p className="flex items-center gap-1 text-slate-400 justify-center">
            <Shield className="h-3.5 w-3.5 text-cyan-400 shrink-0" /> Cifrado asimétrico TLS corporativo de extremo a extremo.
          </p>
          <p className="text-[9px] text-slate-500 mt-2 hover:text-cyan-400 transition">
            © 2026 Safeness.Inc - Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}

