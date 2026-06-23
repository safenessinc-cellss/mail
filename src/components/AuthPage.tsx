/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup 
} from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { Mail, Shield, AlertTriangle, ArrowLeft, Loader2, Sparkles, LogIn, ChevronRight } from 'lucide-react';

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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onAuthSuccess(result.user);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError("El navegador bloqueó la ventana de inicio de sesión de Google. Por favor, habilita las ventanas emergentes en tu navegador o inicia sesión con correo y contraseña.");
      } else {
        setError(err.message || "Error al iniciar sesión con Google");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (isRegister && !displayName) {
      setError("Por favor define tu nombre completo.");
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm relative z-10 transition">
        
        {/* Back Button */}
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Volver a la portada
        </button>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-600 p-2.5 rounded-2xl text-white inline-block shadow-sm mb-3">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            {isRegister ? "Crear una cuenta gratis" : "Ingresar a la consola"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-light">
            {isRegister ? "Obtén tus correos personalizados hoy" : "Administra tus dominios y buzones gratuitos"}
          </p>
        </div>

        {/* Rapid Demo Bypass Trigger */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                ¿Quieres probar la aplicación de inmediato?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-light leading-relaxed">
                Haz clic abajo para iniciar sesión instantáneamente con un perfil demo completamente preconfigurado con dominios y correos de ejemplo.
              </p>
              <button
                id="btn-auth-demo"
                onClick={onDemoBypass}
                className="mt-3.5 w-full inline-flex items-center justify-center py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
              >
                Ingresar como Usuario Demo <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-4 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start space-x-2.5 mb-6">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Email Auth Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
              <input
                id="auth-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nombre Ejemplo"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tuemail@gmail.com"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
              required
              minLength={6}
            />
          </div>

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-850 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center shadow-xs disabled:bg-slate-300 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isRegister ? (
              "Crear cuenta gratis"
            ) : (
              "Ingresar con correo"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
          </div>
          <span className="relative bg-white dark:bg-slate-905 px-3 text-xs text-slate-400 font-mono">O BIEN</span>
        </div>

        {/* Google Oauth Trigger */}
        <button
          id="btn-auth-google"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 px-4 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 transition flex items-center justify-center hover:shadow-xs cursor-pointer"
        >
          <svg className="h-4 w-4 mr-2 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.59 5.59 0 0 1 8.4 12.9a5.59 5.59 0 0 1 5.591-5.614c1.474 0 2.802.534 3.824 1.417l3.12-3.12C18.981 3.738 16.65 2.7 13.991 2.7C8.167 2.7 3.4 7.467 3.4 13.29s4.767 10.59 10.591 10.59c6.438 0 10.154-4.52 10.154-10.32c0-.525-.046-1.125-.13-1.275H12.24Z"
            />
          </svg>
          {isRegister ? "Registrarse con Google" : "Iniciar sesión con Google"}
        </button>

        {/* Switch Register/Login */}
        <div className="mt-6 text-center text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-light">
            {isRegister ? "¿Ya tienes una cuenta? " : "¿No tienes una cuenta? "}
          </span>
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
          >
            {isRegister ? "Inicia sesión" : "Regístrate gratis"}
          </button>
        </div>

        {/* Terms footer */}
        <p className="mt-8 text-[10px] text-center text-slate-400 flex items-center justify-center gap-1 font-light">
          <Shield className="h-3 w-3 shrink-0" /> Conexiones cifradas mediante TLS de primer nivel.
        </p>
      </div>
    </div>
  );
}
