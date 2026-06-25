/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Contact } from '../types';
import { 
  ArrowRightLeft, 
  Download, 
  Upload, 
  UserPlus, 
  Trash2, 
  Users, 
  Mail, 
  Globe, 
  HelpCircle, 
  ArrowRight, 
  Check, 
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

interface GmailConnectorProps {
  contacts: Contact[];
  onAddContact: (name: string, email: string, notes?: string) => Promise<void>;
  onDeleteContact: (contactId: string) => Promise<void>;
  onImportContacts: (imported: Array<{ name: string; email: string; notes?: string }>) => Promise<void>;
  loading: boolean;
}

export default function GmailConnector({
  contacts,
  onAddContact,
  onDeleteContact,
  onImportContacts,
  loading
}: GmailConnectorProps) {
  // Add contact form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);

  // Connection states
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Handle contact Addition
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);

    if (!name.trim() || !email.trim()) {
      setContactError("Por favor escribe un nombre y dirección de correo válidos.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setContactError("El formato de correo no es válido.");
      return;
    }

    await onAddContact(name.trim(), email.trim().toLowerCase(), notes.trim());
    setName('');
    setEmail('');
    setNotes('');
  };

  // Export contacts as JSON download
  const handleExport = () => {
    if (contacts.length === 0) {
      alert("Aún no tienes contactos para exportar.");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contacts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `freemail_hub_contacts_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  // Import contacts files converter
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed)) {
          alert("El archivo JSON debe contener un arreglo de contactos [{name, email, notes}].");
          return;
        }

        const validContacts = parsed.filter(c => c.name && c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email));
        if (validContacts.length === 0) {
          alert("No se encontraron registros de contactos válidos en el archivo.");
          return;
        }

        await onImportContacts(validContacts);
        alert(`¡Se importaron con éxito ${validContacts.length} contactos a tu catálogo!`);
      } catch (err) {
        alert("Ocurrió un error al leer el archivo. Asegúrate que sea un formato JSON válido.");
      }
    };

    reader.readAsText(file);
  };

  const handleConnectGmail = () => {
    setConnecting(true);
    setTimeout(() => {
      setIsGmailConnected(true);
      setConnecting(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 select-none animate-none">
      {/* Overview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <h2 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-blue-600" /> Integración con Gmail y Contactos
        </h2>
        <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 font-light">
          Vincula tu correo personalizado con Gmail para usarlo como cliente, e importa/exporta tus contactos de forma rápida.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Gmail API Connection tutorial */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-red-50 dark:bg-red-950/40 p-2 rounded-xl text-rose-600 shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">Usa Gmail como tu cliente de correo primario</h3>
              <p className="text-xs text-slate-450 dark:text-slate-400 font-light mt-0.5">Paso a paso para recibir y contestar desde tu bandeja habitual.</p>
            </div>
          </div>

          <div className="p-5 bg-slate-50/50 dark:bg-slate-950 rounded-2xl border border-slate-205 dark:border-slate-850 space-y-4">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center">
              <Check className="h-4 w-4 text-blue-600 mr-1.5 shrink-0" />
              Guía de SMTP externo y envío desde Gmail:
            </h4>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-3 pl-1 font-light leading-relaxed">
              <li>
                <strong>1. Configura reenvío automático:</strong> En la pestaña de <em>"Buzon y Aliases"</em>, apunta la casilla redirigida hacia tu dirección de Gmail habitual.
              </li>
              <li>
                <strong>2. Agrega la cuenta de envío:</strong> En Gmail, ve a <em>Configuración</em> &gt; <em>Cuentas e importación</em> &gt; <em>Enviar correo como</em> y presiona <strong>"Añadir otra dirección"</strong>.
              </li>
              <li>
                <strong>3. Conecta a nuestro Servidor SMTP:</strong> 
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl mt-2 border border-slate-150 dark:border-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 select-text">
                  <p>• Servidor: <strong>smtp.resend.com</strong></p>
                  <p>• Puerto: <strong>587 (TLS / SSL recomendado)</strong></p>
                  <p>• Usuario: <strong>[Tu Cuenta Alias de FreeMail]</strong></p>
                  <p>• Contraseña: <strong>[La clave secreta generada en tu consola]</strong></p>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between p-4 border border-blue-100/50 dark:border-blue-900/10 bg-blue-50/10 dark:bg-blue-955/10 rounded-2xl">
            <div className="space-y-0.5 mr-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">API Conexión Rápida Google Account</h4>
              <p className="text-[10px] text-slate-450 dark:text-slate-400 font-light">Permite realizar sincronización rápida de contactos desde tu cuenta Google.</p>
            </div>
            {isGmailConnected ? (
              <span className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-850 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                <Check className="h-3.5 w-3.5 mr-1" /> Vinculado
              </span>
            ) : (
              <button
                id="btn-oauth-gmail-trigger"
                onClick={handleConnectGmail}
                disabled={connecting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition flex items-center shrink-0 shadow-xs"
              >
                {connecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Vincular Google"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Card: Contact Manager list, with Import / Export triggers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col h-full shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800 mb-4 bg-white dark:bg-slate-900">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-50 dark:bg-blue-955/40 p-2 rounded-xl text-blue-650 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-white font-display">Tus Contactos Agendados</h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 font-light">Guarda destinatarios frecuentes o muévelos entre plataformas.</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-export-contacts"
                onClick={handleExport}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-650 rounded-lg text-xs font-medium cursor-pointer transition"
                title="Exportar contactos (JSON)"
              >
                <Download className="h-4 w-4" />
              </button>

              <div className="relative">
                <input
                  id="input-import-contacts"
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-650 rounded-lg text-xs font-medium cursor-pointer transition" title="Importar contactos (JSON)">
                  <Upload className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Creator Contact Form */}
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850">
            <div className="md:col-span-3">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Añadir Contacto Nuevo</h4>
              {contactError && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{contactError}</p>}
            </div>
            <div>
              <input
                id="input-contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <input
                id="input-contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>
            <div className="flex gap-2">
              <input
                id="input-contact-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas"
                className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white font-light"
              />
              <button
                id="btn-add-contact"
                type="submit"
                className="p-2 bg-slate-900 hover:bg-slate-850 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl transition cursor-pointer shrink-0"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Contacts list Container */}
          <div className="flex-1 overflow-y-auto max-h-[220px] divide-y divide-slate-150 dark:divide-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
            {contacts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-light">
                Aún no tienes contactos guardados.
              </div>
            ) : (
              contacts.map((c) => (
                <div key={c.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition">
                  <div className="min-w-0 select-text">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-slate-400 font-mono text-[10px] truncate mt-0.5">{c.email}</p>
                    {c.notes && <p className="text-slate-500 text-[10px] italic truncate mt-0.5 font-light">Nota: {c.notes}</p>}
                  </div>
                  <button
                    id={`btn-del-contact-${c.id}`}
                    onClick={() => onDeleteContact(c.id)}
                    className="p-1 px-1.5 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
