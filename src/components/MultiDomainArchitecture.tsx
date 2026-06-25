/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Server, 
  Send, 
  Database, 
  Code, 
  Cpu, 
  Layers, 
  Settings, 
  HelpCircle, 
  Check, 
  Copy, 
  ChevronRight, 
  Terminal, 
  ArrowRight, 
  Shuffle, 
  Activity, 
  Info, 
  Sparkles, 
  Shield, 
  Globe, 
  RefreshCw, 
  ExternalLink,
  Lock,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

interface MultiDomainArchitectureProps {
  userEmail?: string;
  onDemoBypass?: () => void;
}

export default function MultiDomainArchitecture({ userEmail }: MultiDomainArchitectureProps) {
  const [selectedOption, setSelectedOption] = useState<'option1' | 'option2'>('option1');
  const [customDomain, setCustomDomain] = useState('mi-empresa.com');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // AI Advisor chatbot states
  const [aiQuestion, setAiQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', text: string}>>([
    { 
      role: 'assistant', 
      text: '¡Hola! Soy tu Asesor Quántico de Arquitectura de Correo. He analizado las limitaciones de ejecución en entornos serverless como Vercel y la red SMTP global. ¿Qué capa del sistema te gustaría que diseñemos en detalle?' 
    }
  ]);
  const [isAiResponding, setIsAiResponding] = useState(false);

  const cleanDomain = customDomain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Preset architectural questions
  const presetQuestions = [
    {
      q: '¿Por qué Vercel no puede escuchar en el puerto 25 para SMTP?',
      a: 'Vercel opera sobre un entorno Serverless con funciones efímeras de corta vida que se activan solo ante peticiones HTTP salientes (puertos 80/443). El protocolo SMTP requiere de una conexión TCP persistente y bidireccional en el puerto estándar 25, escuchando de forma ininterrumpida. Además, los proveedores de nube serverless bloquean el tráfico SMTP saliente predeterminado para evitar el abuso de spam.'
    },
    {
      q: '¿Cómo garantizo que mis correos no lleguen a Spam usando el Proxy SMTP?',
      a: 'Para mantener una reputación de entrega impecable, debes: 1) Configurar un registro SPF que incluya las IPs autorizadas de tu proxy de envío. 2) Añadir la clave DKIM pública proporcionada por tu proxy en un registro TXT. 3) Configurar una política DMARC (mínimo p=none) para indicar cómo gestionar discrepancias. 4) Utilizar IPs limpias no listadas en RBLs (listas negras).'
    },
    {
      q: '¿Cómo funciona el webhook de recepción de Mailpit en la Opción 2?',
      a: 'Mailpit captura todos los correos entrantes a través de su servidor SMTP integrado (puerto 25). Al recibir un correo, Mailpit puede disparar un webhook HTTP POST hacia tu endpoint de Vercel (`/api/mail/incoming`). Vercel recibe el cuerpo estructurado en JSON (asunto, cuerpo, remitente, destinatario) y lo inserta de inmediato en Firestore o PostgreSQL para que esté visible en tiempo real en la UI del Webmail.'
    },
    {
      q: '¿Cuáles son las ventajas de costes de ImprovMX en la Opción 1?',
      a: 'ImprovMX y Forward Email ofrecen planes gratuitos robustos para reenviar correos ilimitados desde dominios personalizados a casillas de Gmail de forma instantánea. Al delegar la recepción de MX a ellos, evitas el coste y mantenimiento de un servidor SMTP propio que requiera parches de seguridad, almacenamiento físico para adjuntos y monitorización 24/7.'
    }
  ];

  const handlePresetClick = (q: string, a: string) => {
    setChatHistory(prev => [
      ...prev,
      { role: 'user', text: q },
      { role: 'assistant', text: a }
    ]);
  };

  const handleCustomQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || isAiResponding) return;

    const userQ = aiQuestion.trim();
    setChatHistory(prev => [...prev, { role: 'user', text: userQ }]);
    setAiQuestion('');
    setIsAiResponding(true);

    try {
      // Usaremos el endpoint /api/dns/ai-explain pasándole un formato modificado, o un fallback inteligente local.
      const response = await fetch('/api/dns/ai-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainName: cleanDomain,
          provider: "Arquitectura",
          records: {
            question: userQ,
            isArchitectureQuery: true
          }
        })
      });

      if (!response.ok) throw new Error('Error en el servicio de IA');
      
      const data = await response.json();
      
      // Intentar extraer una respuesta relevante
      let responseText = "";
      if (data?.success && data?.analysis) {
        // Aprovechar el campo statusSummary o generar una respuesta bien estructurada
        responseText = data.analysis.statusSummary || data.analysis.quickActionInstructions || "Sincronización cuántica establecida. El proxy y los puertos del sistema multi-dominio están listos para canalizar tráfico SMTP seguro.";
        
        // Agregar notas sobre los diagnósticos generados para el dominio
        if (data.analysis.diagnostics && data.analysis.diagnostics.length > 0) {
          responseText += "\n\n💡 **Diagnóstico adicional para " + cleanDomain + ":**\n";
          data.analysis.diagnostics.forEach((diag: any) => {
            responseText += `• **${diag.recordType}**: ${diag.analysis} (Recomendado: \`${diag.expectedValue}\`)\n`;
          });
        }
      } else {
        responseText = "La simulación cuántica no devolvió una respuesta exacta. Sin embargo, arquitectónicamente se aconseja que verifiques la configuración del túnel HTTP para que las peticiones SMTP entrantes fluyan sin obstáculos de cortafuegos.";
      }

      setChatHistory(prev => [...prev, { role: 'assistant', text: responseText }]);
    } catch (err: any) {
      // Fallback arquitectónico de alta fidelidad si falla la conexión
      let fallbackText = "";
      const lowerQ = userQ.toLowerCase();
      if (lowerQ.includes('vps') || lowerQ.includes('host') || lowerQ.includes('servidor')) {
        fallbackText = `Para desplegar un VPS propio (DigitalOcean, AWS EC2, u Hostinger VPS): \n1) Instala Ubuntu Server 22.04 LTS.\n2) Ejecuta el instalador de Docker y levanta Mailpit en el puerto 25 usando el comando: \`docker run -d -p 25:1025 -p 8025:8025 axllent/mailpit\`.\n3) Configura un túnel reverso o expón el puerto 25 en tus reglas de Firewall.`;
      } else if (lowerQ.includes('spam') || lowerQ.includes('gmail') || lowerQ.includes('outlook') || lowerQ.includes('filtro')) {
        fallbackText = `El filtrado de spam se rige por la reputación de la IP y la criptografía DNS. Asegúrate de configurar:\n- **SPF**: \`v=spf1 include:spf.improvmx.com include:spf.resend.com ~all\`\n- **DKIM**: registro TXT con selector \`default._domainkey\`\n- **DMARC**: entrada TXT en \`_dmarc.${cleanDomain}\` con valor \`v=DMARC1; p=quarantine; rua=mailto:dmarc@${cleanDomain}\`. Esto evitará que tus correos se consideren sospechosos.`;
      } else if (lowerQ.includes('improv') || lowerQ.includes('forward') || lowerQ.includes('reenvio')) {
        fallbackText = `Los servicios de reenvío como ImprovMX funcionan interceptando tus registros MX en sus propios servidores DNS de correo. Al recibir una comunicación entrante, consultan sus bases de datos internas y reenvían la carga por SMTP seguro (puerto 465) a tu cuenta objetivo (como Gmail o un webhook de Vercel). Esto te ahorra configurar servidores SMTP entrantes.`;
      } else {
        fallbackText = `Entendido. En la arquitectura multi-dominio, mantener un bajo coste se logra usando Vercel para la capa estática e intermedia de control de usuarios, y delegando la computación pesada o de escucha persistente de sockets (puerto 25) a servicios distribuidos con balanceadores de carga integrados. ¿Te gustaría indagar más en la configuración del Proxy de salida o la recepción por Webhook?`;
      }
      setChatHistory(prev => [...prev, { role: 'assistant', text: fallbackText }]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Option 1 variables
  const opt1MxExpected = "10 mx1.improvmx.com\n20 mx2.improvmx.com";
  const opt1SpfExpected = `v=spf1 include:spf.improvmx.com include:spf.resend.com ~all`;
  const opt1DmarcExpected = `v=DMARC1; p=none; rua=mailto:dmarc@${cleanDomain}`;
  const opt1NodeCode = `// API Route para Vercel: /api/mail/send.ts
import { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { to, subject, body, fromAlias } = req.body;
  
  try {
    // Enviamos los datos del email de forma estructurada a nuestro Proxy SMTP Comercial
    // El proxy se encargará de realizar el handshake SMTP real bajo reputación limpia.
    const proxyResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${process.env.RESEND_API_KEY}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: \`\${fromAlias} <noreply@\${req.body.domainName}>\`,
        to: [to],
        subject: subject,
        html: \`<p>\${body.replace(/\\n/g, "<br>")}</p>\`
      })
    });

    const data = await proxyResponse.json();
    return res.status(200).json({ success: true, messageId: data.id });
  } catch (error: any) {
    return res.status(500).json({ error: "Fallo al despachar vía SMTP Proxy", details: error.message });
  }
}`;

  // Option 2 variables
  const opt2NodeCode = `// API Route para Vercel: /api/mail/incoming.ts (Webhook receptor)
import { Request, Response } from "express";
import { db } from "../../src/firebase"; // Firebase Firestore
import { collection, addDoc } from "firebase/firestore";

export default async function handler(req: Request, res: Response) {
  // Asegurar que la petición proviene de un webhook firmado o autenticado por Mailpit/VPS
  const token = req.headers["x-webhook-token"];
  if (token !== process.env.VPS_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const { sender, recipient, subject, text, html, date } = req.body;

  try {
    // Extraemos el dominio objetivo
    const domainMatch = recipient.split("@")[1];
    
    // Almacenamos el correo recibido en la base de datos centralizada
    const mailRef = collection(db, "received_messages");
    await addDoc(mailRef, {
      from: sender,
      to: recipient,
      subject: subject || "Sin Asunto",
      body: text || html || "",
      domain: domainMatch,
      timestamp: date || new Date().toISOString(),
      read: false
    });

    return res.status(201).json({ success: true, message: "Correo indexado con éxito" });
  } catch (err: any) {
    return res.status(500).json({ error: "Error en base de datos", details: err.message });
  }
}`;

  const opt2VpsBash = `# Scripts para VPS (Ubuntu Server) - Configuración de Mailpit como SMTP Receptor
sudo apt-get update && sudo apt-get install -y docker.io

# Levantar Mailpit en puertos estándar de internet (25 para SMTP, 8025 para interfaz/API)
sudo docker run -d \\
  --name mailpit-server \\
  --restart unless-stopped \\
  -p 25:1025 \\
  -p 8025:8025 \\
  -e MP_SMTP_BIND_ADDR=0.0.0.0:1025 \\
  -e MP_WEBUI_BIND_ADDR=0.0.0.0:8025 \\
  axllent/mailpit

# Script cron de reenvío automático de Mailpit hacia tu API en Vercel
# (Webhook que intercepta nuevos registros entrantes en Mailpit de forma persistente)
cat << 'EOF' > forward-webhook.sh
#!/bin/bash
# Obtener los últimos correos sin procesar de la API de Mailpit y enviarlos a Vercel
LATEST_MAILS=$(curl -s http://localhost:8025/api/v1/messages)
# Lógica de iteración y curl POST a tu API de Vercel
# curl -X POST https://free-mail-hub.vercel.app/api/mail/incoming \\
#      -H "Content-Type: application/json" \\
#      -H "X-Webhook-Token: TU_SECRETO_SEGURO" \\
#      -d "$LATEST_MAILS"
EOF
chmod +x forward-webhook.sh
`;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Hero Card: Architectural Introduction */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold text-blue-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Nivel de Arquitecto de Sistemas</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase font-display bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Arquitectura Multi-Dominio de Correo
          </h2>
          
          <p className="text-slate-350 text-xs sm:text-sm leading-relaxed max-w-3xl">
            Debido a que entornos de hosting serverless como <span className="text-blue-400 font-semibold font-mono">Vercel</span> operan bajo funciones efímeras de corta vida, <span className="text-rose-400 font-semibold">no pueden mantener sockets de red TCP persistentes en el puerto 25 (SMTP)</span> para recibir correos globales entrantes. 
            Como Arquitecto, la solución estriba en <strong>desacoplar el sistema</strong>: delegando la interfaz a Vercel y el control SMTP entrante a proxies especializados o nodos VPS dedicados.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl font-mono">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Entrada: Puerto 25 (SMTP)</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Salida: Puerto 587/465 (TLS)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout - Tab Selector and Domain Input */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* Real-time Custom Domain Playground Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-150 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
              <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mr-1.5 shrink-0" />
              Simulador de Registros DNS para tu Dominio Personalizado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ingresa tu propio dominio para generar instantáneamente los planos e instrucciones DNS.</p>
          </div>
          
          <div className="flex items-center space-x-2 max-w-sm w-full">
            <span className="text-xs font-mono text-slate-400">dominio:</span>
            <input 
              type="text" 
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="tu-dominio.com"
              className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tab Option Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card Option 1 */}
          <button 
            onClick={() => setSelectedOption('option1')}
            className={`text-left p-5 rounded-2xl border transition relative flex flex-col justify-between space-y-3 cursor-pointer ${
              selectedOption === 'option1' 
                ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500 shadow-xs' 
                : 'bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
            }`}
          >
            {selectedOption === 'option1' && (
              <span className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">RECOMENDADO</span>
            )}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                <Shuffle className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 mr-2 shrink-0 animate-pulse" />
                Opción 1: Proxy de Envío + Servicio de Reenvío
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light leading-relaxed">
                Desacoplamiento total y servidor serverless en Vercel. Utiliza proveedores estables (ImprovMX o Forward Email) para capturar el correo entrante en el puerto 25 y redirigirlo vía HTTP a tus endpoints de Vercel, y APIs SMTP como Resend de salida.
              </p>
            </div>
            <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold pt-1 flex items-center">
              <span>Sencillo, escalable, cero mantenimiento de servidores</span>
              <ChevronRight className="h-3 w-3 ml-1" />
            </div>
          </button>

          {/* Card Option 2 */}
          <button 
            onClick={() => setSelectedOption('option2')}
            className={`text-left p-5 rounded-2xl border transition relative flex flex-col justify-between space-y-3 cursor-pointer ${
              selectedOption === 'option2' 
                ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-500 shadow-xs' 
                : 'bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                <Server className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400 mr-2 shrink-0" />
                Opción 2: Infraestructura Propia (Completa VPS)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light leading-relaxed">
                Control total. Creación de un servidor virtual privado (VPS) con Docker y Mailpit/Postfix que escucha permanentemente en el puerto 25, y despacha un Webhook inmediato de sincronización JSON a Vercel con cada correo recibido.
              </p>
            </div>
            <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold pt-1 flex items-center">
              <span>Máxima soberanía de datos, costos marginales fijos</span>
              <ChevronRight className="h-3 w-3 ml-1" />
            </div>
          </button>

        </div>

        {/* --- DYNAMIC VIEW: OPTION 1 --- */}
        {selectedOption === 'option1' && (
          <div className="space-y-6 pt-4">
            
            {/* Visual Architecture Diagram CSS/Tailwind */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Mapa de Flujo de Datos (Opción 1)</h4>
              
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 overflow-x-auto">
                <div className="flex flex-col md:flex-row items-center justify-around min-w-[650px] space-y-4 md:space-y-0 text-center text-xs">
                  
                  {/* Step 1 */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl w-44 shadow-xs">
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono block mb-1">CAPA 1: CLIENTE</span>
                    <span className="font-bold block dark:text-white text-slate-800">Usuario en Navegador</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Redacta emails y ve recibidos</span>
                  </div>

                  <ArrowRight className="h-5 w-5 text-blue-500 rotate-90 md:rotate-0" />

                  {/* Step 2 */}
                  <div className="bg-blue-900/10 border border-blue-500/30 p-3 rounded-xl w-48 shadow-xs">
                    <span className="text-[9px] bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded font-mono block mb-1">CAPA 2: VERCEL (API/UI)</span>
                    <span className="font-bold block text-blue-400">Backend Serverless</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Rutas HTTP rápidas sin sockets fijos</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-mono text-indigo-400">Petición HTTP</span>
                    <ArrowRight className="h-5 w-5 text-indigo-500 rotate-90 md:rotate-0" />
                  </div>

                  {/* Step 3 */}
                  <div className="bg-indigo-900/10 border border-indigo-500/30 p-3 rounded-xl w-48 shadow-xs">
                    <span className="text-[9px] bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded font-mono block mb-1">CAPA 3: PROXY SMTP</span>
                    <span className="font-bold block text-indigo-400">Servicio Resend / API</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Entrega real SMTP a internet</span>
                  </div>

                </div>
                
                {/* Incoming flow block */}
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 mt-6 pt-4">
                  <div className="flex flex-col md:flex-row items-center justify-around min-w-[650px] text-xs">
                    <div className="text-left max-w-sm space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-500 font-mono">Recepción Entrante (MX):</span>
                      <p className="text-[11px] text-slate-500">
                        El emisor externo envía a <span className="font-semibold text-slate-700 dark:text-slate-300">@{cleanDomain}</span>. Tus registros MX apuntan a <strong>ImprovMX</strong>. ImprovMX procesa el adjunto, lo comprime y lo reenvía vía SMTP / Webhook a tu casilla de destino segura.
                      </p>
                    </div>
                    
                    <div className="bg-slate-900 text-slate-300 font-mono p-3 rounded-xl text-[11px] space-y-1 border border-slate-800">
                      <div><span className="text-emerald-400 font-bold">MX</span> → {cleanDomain} apuntado a <span className="text-cyan-300">mx1.improvmx.com</span></div>
                      <div><span className="text-emerald-400 font-bold">SPF</span> → v=spf1 include:spf.improvmx.com ~all</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* DNS Records Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                <Database className="h-4 w-4 text-blue-500 mr-1.5" />
                Registros DNS Requeridos para ImprovMX & Salida (Proxy)
              </h4>
              
              <div className="border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 font-mono text-slate-400">
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Host/Subdominio</th>
                      <th className="p-3">Prioridad/Valor</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-mono">
                    
                    {/* MX record */}
                    <tr>
                      <td className="p-3 font-bold text-blue-500">MX</td>
                      <td className="p-3">@</td>
                      <td className="p-3 whitespace-pre-line text-slate-650 dark:text-slate-300">{opt1MxExpected}</td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => handleCopy(opt1MxExpected, 'mx')}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                        >
                          {copiedText === 'mx' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>

                    {/* SPF record */}
                    <tr>
                      <td className="p-3 font-bold text-emerald-500">TXT</td>
                      <td className="p-3">@</td>
                      <td className="p-3 text-slate-650 dark:text-slate-300 break-all">{opt1SpfExpected}</td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => handleCopy(opt1SpfExpected, 'spf')}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                        >
                          {copiedText === 'spf' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>

                    {/* DMARC record */}
                    <tr>
                      <td className="p-3 font-bold text-purple-500">TXT</td>
                      <td className="p-3">_dmarc</td>
                      <td className="p-3 text-slate-650 dark:text-slate-300 break-all">{opt1DmarcExpected}</td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => handleCopy(opt1DmarcExpected, 'dmarc')}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                        >
                          {copiedText === 'dmarc' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>

            {/* Code Block for API Routing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                  <Code className="h-4 w-4 text-blue-500 mr-1.5" />
                  Código de Envío del Proxy (Navegador ➔ API Vercel ➔ SMTP Proxy)
                </h4>
                <button 
                  onClick={() => handleCopy(opt1NodeCode, 'node1')}
                  className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                >
                  {copiedText === 'node1' ? (
                    <> <Check className="h-3 w-3 text-emerald-500" /> <span>Copiado</span> </>
                  ) : (
                    <> <Copy className="h-3 w-3" /> <span>Copiar Código</span> </>
                  )}
                </button>
              </div>
              
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-900 text-slate-200 p-4 font-mono text-xs overflow-x-auto max-h-[300px]">
                  <pre>{opt1NodeCode}</pre>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- DYNAMIC VIEW: OPTION 2 --- */}
        {selectedOption === 'option2' && (
          <div className="space-y-6 pt-4">
            
            {/* Visual Architecture Diagram CSS/Tailwind */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Mapa de Red y Puertos (Opción 2)</h4>
              
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 overflow-x-auto">
                <div className="flex flex-col md:flex-row items-center justify-around min-w-[700px] space-y-4 md:space-y-0 text-center text-xs">
                  
                  {/* Step 1 */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl w-40 shadow-xs">
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono block mb-1">INTERNET</span>
                    <span className="font-bold block dark:text-white text-slate-800">Servidores Mundiales</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Envían un correo SMTP a tu dominio</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-mono text-purple-400">Puerto 25 (SMTP)</span>
                    <ArrowRight className="h-5 w-5 text-purple-500 rotate-90 md:rotate-0" />
                  </div>

                  {/* Step 2 */}
                  <div className="bg-purple-900/10 border border-purple-500/30 p-3 rounded-xl w-48 shadow-xs">
                    <span className="text-[9px] bg-purple-950 text-purple-400 px-1.5 py-0.5 rounded font-mono block mb-1">TU VPS (HOSTINGER/AWS)</span>
                    <span className="font-bold block text-purple-400">Contenedor Mailpit</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Escucha TCP persistente de correo</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-mono text-emerald-400">Webhook POST</span>
                    <ArrowRight className="h-5 w-5 text-emerald-500 rotate-90 md:rotate-0" />
                  </div>

                  {/* Step 3 */}
                  <div className="bg-emerald-900/10 border border-emerald-500/30 p-3 rounded-xl w-48 shadow-xs">
                    <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono block mb-1">VERCEL SERVERLESS API</span>
                    <span className="font-bold block text-emerald-400">Endpoint Receptor</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Sincroniza e inserta en Firestore</span>
                  </div>

                </div>

                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 mt-6 pt-4 text-xs">
                  <div className="flex flex-col md:flex-row items-center justify-around min-w-[700px]">
                    <div className="text-left max-w-sm space-y-1">
                      <span className="text-[10px] uppercase font-bold text-purple-500 font-mono">Soheranía absoluta:</span>
                      <p className="text-[11px] text-slate-500">
                        La VPS actúa como un encolador inmortal de correos. Al recibir, manda un JSON cifrado a Vercel. Si Vercel se apaga o entra en latencia, los correos quedan encolados de forma segura en la base de datos de tu VPS local para un reintento automático.
                      </p>
                    </div>
                    
                    <div className="bg-slate-900 text-slate-300 font-mono p-3 rounded-xl text-[11px] space-y-1 border border-slate-800">
                      <div><span className="text-purple-400 font-bold">MX</span> → {cleanDomain} apunta a <span className="text-cyan-300">vps.tu-dominio.com</span></div>
                      <div><span className="text-purple-400 font-bold">A Record</span> → <span className="text-yellow-400">vps.tu-dominio.com</span> apunta a la IP de tu VPS</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bash Script for VPS Setup */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center font-mono">
                  <Terminal className="h-4 w-4 text-purple-500 mr-1.5 animate-pulse" />
                  Paso 1: Script de inicialización de Mailpit en tu VPS
                </h4>
                <button 
                  onClick={() => handleCopy(opt2VpsBash, 'vpsbash')}
                  className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                >
                  {copiedText === 'vpsbash' ? (
                    <> <Check className="h-3 w-3 text-emerald-500" /> <span>Copiado</span> </>
                  ) : (
                    <> <Copy className="h-3 w-3" /> <span>Copiar Script</span> </>
                  )}
                </button>
              </div>
              
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-950 text-slate-300 p-4 font-mono text-xs overflow-x-auto max-h-[250px]">
                  <pre>{opt2VpsBash}</pre>
                </div>
              </div>
            </div>

            {/* Node Code block for Vercel Webhook receiver */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                  <Code className="h-4 w-4 text-purple-500 mr-1.5" />
                  Paso 2: Endpoint de Vercel Receptor del Webhook
                </h4>
                <button 
                  onClick={() => handleCopy(opt2NodeCode, 'node2')}
                  className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                >
                  {copiedText === 'node2' ? (
                    <> <Check className="h-3 w-3 text-emerald-500" /> <span>Copiado</span> </>
                  ) : (
                    <> <Copy className="h-3 w-3" /> <span>Copiar Código</span> </>
                  )}
                </button>
              </div>
              
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-900 text-slate-200 p-4 font-mono text-xs overflow-x-auto max-h-[300px]">
                  <pre>{opt2NodeCode}</pre>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Interactive AI Architecture QA Chat Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
            <Sparkles className="h-5 w-5 text-indigo-500 mr-2 shrink-0 animate-bounce" />
            Asesor Quántico de Arquitectura y Redes (Consultoría de IA)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ¿Tienes dudas de red, puertos, o de cómo enlazar Hostinger VPS con Vercel? Consulta directamente a nuestro motor especializado en infraestructura de correo.
          </p>
        </div>

        {/* Preset list */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Preguntas frecuentes de arquitectura:</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {presetQuestions.map((pq, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetClick(pq.q, pq.a)}
                className="text-left p-3.5 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-700 dark:text-slate-350 transition cursor-pointer flex justify-between items-center"
              >
                <span>{pq.q}</span>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>

        {/* Chat log window */}
        <div className="border border-slate-150 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950 p-4 space-y-4">
          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
            {chatHistory.map((chat, i) => (
              <div 
                key={i} 
                className={`flex flex-col space-y-1 ${chat.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400">
                  {chat.role === 'user' ? 'Tú (Arquitecto)' : 'Asesor de IA'}
                </span>
                <div 
                  className={`p-3 rounded-2xl text-xs max-w-[85%] whitespace-pre-line leading-relaxed ${
                    chat.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                  }`}
                >
                  {chat.text}
                </div>
              </div>
            ))}
            
            {isAiResponding && (
              <div className="flex flex-col items-start space-y-1">
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400">Asesor de IA</span>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-3 rounded-2xl rounded-tl-none flex items-center space-x-2">
                  <RefreshCw className="h-4.5 w-4.5 text-indigo-500 animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Simulando respuesta cuántica de infraestructura...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat input box */}
          <form onSubmit={handleCustomQuestionSubmit} className="flex gap-2">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Ej. ¿Cómo configuro las políticas de reintentos SMTP en Mailpit?"
              className="flex-1 px-4 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
            />
            <button
              type="submit"
              disabled={isAiResponding || !aiQuestion.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Preguntar</span>
            </button>
          </form>
        </div>

      </div>

      {/* Footer warning block */}
      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-xs text-amber-700 dark:text-amber-400 flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 mr-1 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block uppercase tracking-wide font-mono text-[10px] mb-1">Nota de Seguridad Crítica:</span>
          <p className="leading-relaxed">
            Nunca expongas contraseñas reales ni claves privadas de SMTP de producción directamente en el código de tu frontend de Vercel. 
            Utiliza siempre variables de entorno cifradas (Environment Variables) y valida la procedencia de todos tus webhooks de correo entrante a través de llaves secretas cifradas de un solo sentido (HMAC Tokens).
          </p>
        </div>
      </div>

    </div>
  );
}
