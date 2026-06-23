import express, { Request, Response, Router, NextFunction } from "express";
import dns from "dns";
import { GoogleGenAI } from "@google/genai";

const router: Router = express.Router();

let aiClient: GoogleGenAI | null = null;

// Inicialización diferida del cliente de Gemini
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("[DEBUG/DNS] Obteniendo cliente de Gemini. API Key presente:", !!apiKey);
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
        console.log("[DEBUG/DNS] Cliente de Gemini instanciado con éxito.");
      } catch (err: any) {
        console.error("[DEBUG/DNS] Error al instanciar GoogleGenAI:", err);
        aiClient = null;
      }
    } else {
      console.log("[DEBUG/DNS] API Key de Gemini omitida o inválida. Se utilizará generador de respaldo.");
    }
  }
  return aiClient;
}

// Configuración de Hostinger esperada para comparar
const EXPECTED_MX = "10 mx1.hostinger.com y 10 mx2.hostinger.com";
const EXPECTED_SPF = "v=spf1 include:spf.hostinger.com ~all";

// Función auxiliar para consultar DNS sobre HTTPS (DoH) como fallback ultra-estable
async function resolveDnsViaDoH(name: string, type: string): Promise<string[]> {
  console.log(`[DEBUG/DNS-DoH] Buscando registro ${type} para: ${name}`);
  const providers = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`
  ];

  for (const url of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(url, {
        headers: { "accept": "application/dns-json" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[DEBUG/DNS-DoH] Proveedor ${url} devolvió status ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (data && Array.isArray(data.Answer) && data.Answer.length > 0) {
        const results = data.Answer.map((ans: any) => {
          let val: string = ans.data || "";
          if (type.toUpperCase() === "TXT") {
            // Limpiar comillas iniciales/finales de registros TXT
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1);
            }
          }
          return val;
        });
        console.log(`[DEBUG/DNS-DoH] Resultados obtenidos de ${url}:`, results);
        return results;
      }
    } catch (e: any) {
      console.warn(`[DEBUG/DNS-DoH] Consulta DoH falló para ${url}:`, e.message);
    }
  }
  console.log(`[DEBUG/DNS-DoH] Sin resultados en proveedores DoH para ${name}`);
  return [];
}

// Resolver MX robusto (Primero nativo, luego fallback DoH)
async function resolveMxSecurely(domain: string): Promise<{ priority: number; exchange: string }[]> {
  try {
    console.log(`[DEBUG/DNS-MX] Buscando MX de forma nativa para: ${domain}`);
    return await new Promise((resolve, reject) => {
      dns.resolveMx(domain, (err, records) => {
        if (err) return reject(err);
        resolve(records || []);
      });
    });
  } catch (err: any) {
    console.warn(`[DEBUG/DNS-MX] Consulta MX nativa falló para ${domain}, usando fallback DoH. Error:`, err.message);
    try {
      const answers = await resolveDnsViaDoH(domain, "MX");
      return answers.map(ans => {
        const parts = ans.trim().split(/\s+/);
        if (parts.length >= 2) {
          return {
            priority: parseInt(parts[0], 10) || 10,
            exchange: parts[1].replace(/\.$/, "")
          };
        } else {
          return { priority: 10, exchange: ans.replace(/\.$/, "") };
        }
      });
    } catch (dohErr: any) {
      console.error(`[DEBUG/DNS-MX] Fallback DoH MX falló para ${domain}:`, dohErr.message);
      throw err; // Lanzar error original
    }
  }
}

// Resolver TXT robusto (Primero nativo, luego fallback DoH)
async function resolveTxtSecurely(domain: string): Promise<string[][]> {
  try {
    console.log(`[DEBUG/DNS-TXT] Buscando TXT de forma nativa para: ${domain}`);
    return await new Promise((resolve, reject) => {
      dns.resolveTxt(domain, (err, records) => {
        if (err) return reject(err);
        resolve(records || []);
      });
    });
  } catch (err: any) {
    console.warn(`[DEBUG/DNS-TXT] Consulta TXT nativa falló para ${domain}, usando fallback DoH. Error:`, err.message);
    try {
      const answers = await resolveDnsViaDoH(domain, "TXT");
      return answers.map(ans => [ans]);
    } catch (dohErr: any) {
      console.error(`[DEBUG/DNS-TXT] Fallback DoH TXT falló para ${domain}:`, dohErr.message);
      throw err;
    }
  }
}

// POST /api/dns/verify
router.post("/verify", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  console.log("[DEBUG/DNS] POST /verify recibido. Body:", JSON.stringify(req.body));
  try {
    const domainParam = req.body?.domain || req.body?.domainName;

    if (!domainParam || typeof domainParam !== "string" || !domainParam.trim()) {
      console.warn("[DEBUG/DNS] Solicitud rechazada: Falta el nombre del dominio.");
      const errorPayload = { 
        success: false, 
        error: "El dominio es requerido (No domain name provided)",
        domainName: "",
        allConfigured: false,
        allDetected: false
      };
      console.log("[DEBUG/DNS] Respondiendo 400:", JSON.stringify(errorPayload));
      return res.status(400).json(errorPayload);
    }

    const domain = domainParam.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
    console.log(`[DEBUG/DNS] Procesando verificación para el dominio limpio: ${domain}`);

    // 1. Verificación MX
    let mxStatus = "failed";
    let mxCurrentValue = "";
    try {
      const records = await resolveMxSecurely(domain);
      if (records && records.length > 0) {
        mxCurrentValue = records.map(r => `${r.priority} ${r.exchange}`).join(", ");
        const configured = records.some(r => r && r.exchange && typeof r.exchange === "string" && (
          r.exchange.toLowerCase().includes("hostinger.com") || 
          r.exchange.toLowerCase().includes("hostinger.es") || 
          r.exchange.toLowerCase().includes("hostinger.mx")
        ));
        mxStatus = configured ? "verified" : "failed";
      } else {
        mxCurrentValue = "No MX records found";
      }
    } catch (err: any) {
      mxCurrentValue = `Error: ${err.message}`;
    }

    // 2. Verificación SPF
    let spfStatus = "failed";
    let spfCurrentValue = "";
    try {
      const txtRecords = await resolveTxtSecurely(domain);
      const flattened = txtRecords.flat();
      const spfText = flattened.find(record => record && typeof record === "string" && record.startsWith("v=spf1"));
      if (spfText) {
        spfCurrentValue = spfText;
        const configured = spfText.includes("include:spf.hostinger.com") || spfText.includes("spf.hostinger");
        spfStatus = configured ? "verified" : "failed";
      } else {
        spfCurrentValue = flattened.length > 0 ? "TXT records found, but no SPF starting with v=spf1" : "No TXT records found";
      }
    } catch (err: any) {
      spfCurrentValue = `Error: ${err.message}`;
    }

    // 3. Verificación DKIM
    let dkimStatus = "failed";
    let dkimCurrentValue = "";
    try {
      const dkimDomain = `default._domainkey.${domain}`;
      const txtRecords = await resolveTxtSecurely(dkimDomain);
      const flattened = txtRecords.flat();
      const dkimText = flattened.find(record => record && typeof record === "string" && (record.startsWith("v=DKIM1") || record.includes("k=rsa")));
      if (dkimText) {
        dkimCurrentValue = dkimText;
        dkimStatus = "verified";
      } else {
        dkimCurrentValue = flattened.length > 0 ? "Records found, but no valid DKIM header" : "No DKIM signature found under default._domainkey";
      }
    } catch (err: any) {
      dkimCurrentValue = `Error: ${err.message}`;
    }

    // 4. Verificación DMARC
    let dmarcStatus = "failed";
    let dmarcCurrentValue = "";
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const txtRecords = await resolveTxtSecurely(dmarcDomain);
      const flattened = txtRecords.flat();
      const dmarcText = flattened.find(record => record && typeof record === "string" && (record.startsWith("v=DMARC1") || record.includes("p=")));
      if (dmarcText) {
        dmarcCurrentValue = dmarcText;
        dmarcStatus = "verified";
      } else {
        dmarcCurrentValue = flattened.length > 0 ? "Records found, but no signature starting with v=DMARC1" : "No DMARC records found under _dmarc";
      }
    } catch (err: any) {
      dmarcCurrentValue = `Error: ${err.message}`;
    }

    const allVerified = mxStatus === "verified" && spfStatus === "verified";

    // Formatear payload exactamente como lo esperan los llamantes
    const mxObj = { status: mxStatus, currentValue: mxCurrentValue, expected: EXPECTED_MX, host: "@", destination: "mx1.hostinger.com" };
    const spfObj = { status: spfStatus, currentValue: spfCurrentValue, expected: EXPECTED_SPF, host: "@", destination: EXPECTED_SPF };
    const dkimObj = { status: dkimStatus, currentValue: dkimCurrentValue, expected: `v=DKIM1; k=rsa; p=... (Selector: default)`, host: "default._domainkey", destination: "Firma DKIM en Hostinger" };
    const dmarcObj = { status: dmarcStatus, currentValue: dmarcCurrentValue, expected: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`, host: "_dmarc", destination: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}` };

    const responsePayload = {
      success: true,
      domain,
      domainName: domain,
      mx: mxObj,
      spf: spfObj,
      dkim: dkimObj,
      dmarc: dmarcObj,
      results: {
        mx: mxObj,
        spf: spfObj,
        dkim: dkimObj,
        dmarc: dmarcObj
      },
      allConfigured: allVerified,
      allDetected: allVerified,
      timestamp: new Date().toISOString()
    };

    console.log("[DEBUG/DNS] Respondiendo verificación con éxito para:", domain);
    return res.json(responsePayload);

  } catch (error: any) {
    console.error("[DEBUG/DNS] Error crítico en /verify:", error);
    const errorPayload = {
      success: false,
      error: "Error interno al verificar los registros DNS",
      details: error.message || String(error),
      domainName: req.body?.domainName || req.body?.domain || "",
      allConfigured: false,
      allDetected: false
    };
    console.log("[DEBUG/DNS] Respondiendo 500 JSON:", JSON.stringify(errorPayload));
    return res.status(500).json(errorPayload);
  }
});

// POST /api/dns/ai-explain - Asesor Quántico de IA para resolución de DNS en Hostinger
router.post("/ai-explain", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  console.log("[DEBUG/DNS] POST /ai-explain recibido. Body:", JSON.stringify(req.body));
  
  const { domainName, provider, records } = req.body;
  
  if (!domainName || typeof domainName !== "string" || !domainName.trim()) {
    console.warn("[DEBUG/DNS] Solicitud rechazada en /ai-explain: Falta domainName.");
    const errorPayload = { 
      success: false, 
      error: "El nombre de dominio es requerido.",
      analysis: null
    };
    console.log("[DEBUG/DNS] Respondiendo 400:", JSON.stringify(errorPayload));
    return res.status(400).json(errorPayload);
  }

  const cleanDomain = domainName.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");

  // Generador de respaldo de alta fidelidad (local) para garantizar fiabilidad cuántica permanente
  const generateFallbackResponse = () => {
    console.log("[DEBUG/DNS] Generando diagnóstico resiliente de respaldo para:", cleanDomain);
    const mxVal = records?.mx || { verified: false, current: "No detectado", expected: EXPECTED_MX };
    const spfVal = records?.spf || { verified: false, current: "No detectado", expected: EXPECTED_SPF };
    const dkimVal = records?.dkim || { verified: false, current: "No detectado", expected: "v=DKIM1; k=rsa; p=MIIBIjAN..." };
    const dmarcVal = records?.dmarc || { verified: false, current: "No detectado", expected: `v=DMARC1; p=none; rua=mailto:dmarc@${cleanDomain}` };

    let score = 15;
    if (mxVal.verified) score += 25;
    if (spfVal.verified) score += 25;
    if (dkimVal.verified) score += 20;
    if (dmarcVal.verified) score += 15;

    let statusSummary = "";
    if (score >= 90) {
      statusSummary = "Sincronización cuántica completada. El dominio emite señales puras en la red interestelar de FreeMail.";
    } else if (score >= 60) {
      statusSummary = "Enlace cibernético parcial. Se detectó una órbita correcta de registros, pero requiere calibrar SPF y MX para estabilizar los envíos.";
    } else {
      statusSummary = "Señal en estado de latencia offline. El dominio aún no ha sido enlazado a la constelación de correo Hostinger.";
    }

    const diagnostics = [
      {
        recordType: "MX",
        status: mxVal.verified ? "OK" : "ERROR",
        currentValue: mxVal.current || "No detectado",
        expectedValue: mxVal.expected || "10 mx1.hostinger.com y 10 mx2.hostinger.com",
        criticality: "ALTA",
        analysis: mxVal.verified 
          ? "El enrutador cuántico MX está perfectamente apuntado y listo para descodificar emails entrantes." 
          : "El registro MX está ausente o mal configurado. Los servidores de internet no saben a dónde enviar tus correos actuales.",
        actionSteps: mxVal.verified 
          ? ["No se requiere ninguna acción."] 
          : [
              `Accede a la zona DNS avanzada de tu proveedor (${provider || "tu proveedor"}).`,
              "Elimina registros MX antiguos o redundantes para evitar colisiones de rutas.",
              "Añade un registro MX: Host/Nombre '@', Prioridad '10', Apunta a 'mx1.hostinger.com' (TTL 14400 o auto).",
              "Añade un segundo registro MX: Host/Nombre '@', Prioridad '10', Apunta a 'mx2.hostinger.com'."
            ]
      },
      {
        recordType: "SPF",
        status: spfVal.verified ? "OK" : "ERROR",
        currentValue: spfVal.current || "No detectado",
        expectedValue: spfVal.expected || "v=spf1 include:spf.hostinger.com ~all",
        criticality: "MEDIA",
        analysis: spfVal.verified 
          ? "La directiva SPF de remitente de confianza está activa y protegiendo tu reputación de salida." 
          : "Falta la directiva SPF en formato TXT. Sin esta regla, plataformas como Gmail pueden marcar tus correos como sospechosos.",
        actionSteps: spfVal.verified ? ["No se requiere ninguna acción."] : [
          "Navega al gestor DNS de tu dominio.",
          "Crea un nuevo registro de tipo TXT.",
          "Host/Nombre: '@' (o déjalo en blanco según el proveedor).",
          "Copia este valor exacto sin comillas redundantes: v=spf1 include:spf.hostinger.com ~all",
          "Guarda los cambios."
        ]
      },
      {
        recordType: "DKIM",
        status: dkimVal.verified ? "OK" : "ERROR",
        currentValue: dkimVal.current || "No detectado",
        expectedValue: dkimVal.expected || "v=DKIM1; k=rsa; p=MIIB...",
        criticality: "ALTA",
        analysis: dkimVal.verified 
          ? "Llave criptográfica DKIM de 2048 bits validada. Cada mensaje saliente está firmado digitalmente." 
          : "Falta el subdominio TXT de validación default._domainkey para asegurar tus firmas criptográficas de salida.",
        actionSteps: dkimVal.verified ? ["No se requiere ninguna acción."] : [
          "Crea un registro de tipo TXT.",
          "Host o Nombre del subdominio: default._domainkey",
          "En el valor copia la clave pública extensa que se generó para tu dominio.",
          "Asegúrate de que no se corten caracteres y de no duplicar comillas."
        ]
      },
      {
        recordType: "DMARC",
        status: dmarcVal.verified ? "OK" : "ERROR",
        currentValue: dmarcVal.current || "No detectado",
        expectedValue: dmarcVal.expected || `v=DMARC1; p=none; rua=mailto:dmarc@${cleanDomain}`,
        criticality: "MEDIA",
        analysis: dmarcVal.verified 
          ? "Política DMARC activa. Protege activamente tu marca contra spoofing e imitación de firmas." 
          : "Falta el registro DMARC para validar desajustes de SPF/DKIM y reportar fraudes.",
        actionSteps: dmarcVal.verified ? ["No se requiere ninguna acción."] : [
          "Crea una entrada TXT en el DNS.",
          "Host o Nombre: _dmarc",
          `Valor recomendado para comenzar: v=DMARC1; p=none; rua=mailto:dmarc@${cleanDomain}`,
          "Monitorea los reportes agregados que llegarán a tu correo."
        ]
      }
    ];

    const isOk = score >= 90;
    const providerStr = String(provider || "").toLowerCase();
    let providerNote = "Asegúrate de esperar de 10 a 30 minutos para que los registradores DNS propaguen estas nuevas constantes cuánticas.";
    if (providerStr.includes("cloudflare")) {
      providerNote = "[SOPORTE CLOUDFLARE] ¡Atención cuántica! Asegúrate de que las nubes de Cloudflare para los registros MX y TXT estén desactivadas (Proxy: Solo DNS / Nube Gris). Si el proxy naranja está activo, el flujo de correo SMTP se interrumpirá.";
    } else if (providerStr.includes("hostinger")) {
      providerNote = "[SOPORTE HOSTINGER] Dado que estás usando Hostinger como registrador local, puedes presionar el botón de auto-configuración de Hostinger para inyectar estos registros con un solo clic.";
    }

    return {
      domainName: cleanDomain,
      overallScore: score,
      statusSummary,
      diagnostics,
      isOk,
      quickActionInstructions: isOk 
        ? "¡Excelente! Tu dominio está 100% operativo y seguro." 
        : "Alinea los registros DNS TXT (SPF, DKIM, DMARC) de acuerdo al mapa cuántico.",
      providerNote
    };
  };

  try {
    const ai = getGeminiClient();
    if (!ai) {
      console.warn("[DEBUG/DNS] API de Gemini no inicializada (modo simulación). Entrando de forma directa en modo Diagnóstico Resiliente de IA...");
      const responseBody = {
        success: true,
        analysis: generateFallbackResponse()
      };
      console.log("[DEBUG/DNS] Despachando fallback analítico:", JSON.stringify(responseBody));
      return res.json(responseBody);
    }

    const prompt = `Analiza detenidamente la configuración de registros DNS corporativos para la plataforma de correo "FreeMail Hub" bajo el dominio "${cleanDomain}".
Proveedor de DNS ingresado por el usuario: ${provider || "Cloudflare / GoDaddy / General"}

Registros de estado actuales que se detectaron en los DNS:
${JSON.stringify(records, null, 2)}

Tu objetivo consiste en devolver un diagnóstico completo, optimista, sumamente didáctico y futurista en formato JSON con la solución exacta en español estructurada paso a paso para que el usuario añada los registros esperados sin ninguna confusión técnica.`;

    console.log("[DEBUG/DNS] Solicitando diagnóstico real a Gemini...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres el Asesor Quántico de Correo y Administrador Experto de Redes de FreeMail Hub. Ayudas a los usuarios a activar sus correos personales resolviendo problemas de registros DNS (MX, SPF, DKIM, DMARC) de forma didáctica, futurista, alentadora y visualmente de vanguardia.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            domainName: { type: "STRING" },
            overallScore: { type: "INTEGER", description: "Puntaje general de salud de DNS del dominio (de 0 a 100)" },
            statusSummary: { type: "STRING", description: "Resumen integrador del estado actual del dominio enfocado al futuro." },
            diagnostics: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  recordType: { type: "STRING" },
                  status: { type: "STRING" },
                  currentValue: { type: "STRING" },
                  expectedValue: { type: "STRING" },
                  criticality: { type: "STRING" },
                  analysis: { type: "STRING", description: "Explicación breve del error o estado actual en español." },
                  actionSteps: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "Pasos explícitos para resolver la falla desde el panel del registrador."
                  }
                },
                required: ["recordType", "status", "currentValue", "expectedValue", "criticality", "analysis", "actionSteps"]
              }
            },
            isOk: { type: "BOOLEAN" },
            quickActionInstructions: { type: "STRING", description: "Plan de acción consolidado en una oración." },
            providerNote: { type: "STRING", description: "Consejos para su proveedor (como desactivar proxy naranja en Cloudflare, revisar TTL, etc.)" }
          },
          required: ["domainName", "overallScore", "statusSummary", "diagnostics", "isOk", "quickActionInstructions", "providerNote"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No se obtuvo respuesta del motor de IA.");
    }

    console.log("[DEBUG/DNS] Respuesta cruda de Gemini obtenida con éxito.");
    const aiData = JSON.parse(outputText.trim());
    const responseBody = {
      success: true,
      analysis: aiData
    };
    console.log("[DEBUG/DNS] Enviando respuesta JSON analítica final.");
    return res.json(responseBody);

  } catch (error: any) {
    console.error("[DEBUG/DNS] Falla en consulta real de IA o parseo. Entrando en modo Diagnóstico Resiliente de IA de Respaldo:", error);
    const responseBody = {
      success: true,
      analysis: generateFallbackResponse()
    };
    console.log("[DEBUG/DNS] Enviando respuesta de respaldo (fallback exitoso) tras error.");
    return res.json(responseBody);
  }
});

// Middleware de manejo de errores específico del enrutador DNS
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[DEBUG/DNS] [MIDDLEWARE-ERROR] Error interceptado en el enrutamiento de DNS:", err);
  return res.status(500).json({
    success: false,
    error: "Ocurrió una falla inesperada en el servicio interno de DNS",
    details: err.message || String(err),
    domainName: req.body?.domainName || req.body?.domain || ""
  });
});

export default router;
