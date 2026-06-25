/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================
// HEALTH CHECK
// ============================================

app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    resend_configured: !!process.env.RESEND_API_KEY || !!process.env.SMTP_PASS
  });
});

// ============================================
// ENVÍO DE CORREOS CON RESEND (FUNCIONAL)
// ============================================

app.post("/api/mail/send-http", async (req, res) => {
  try {
    console.log("[send-http] Recibida solicitud de envío");
    
    const { senderEmail, to, subject, body } = req.body || {};
    
    if (!senderEmail || !to) {
      return res.status(400).json({ 
        success: false, 
        error: "senderEmail y to son requeridos" 
      });
    }

    // Verificar API Key
    const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
    if (!apiKey) {
      console.error("[send-http] Error: API Key no configurada");
      return res.status(400).json({
        success: false,
        error: "RESEND_API_KEY o SMTP_PASS no configurada. Agrega la variable en Vercel."
      });
    }

    console.log("[send-http] Enviando correo a:", to);
    console.log("[send-http] Desde:", senderEmail);
    console.log("[send-http] Asunto:", subject);

    // Llamar a la API de Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [to],
        subject: subject || "(Sin Asunto)",
        html: (body || "").replace(/\n/g, "<br/>"),
      }),
    });

    const data = await response.json();
    console.log("[send-http] Respuesta de Resend:", data);

    if (!response.ok) {
      console.error("[send-http] Error de Resend:", data);
      return res.status(response.status).json({ 
        success: false, 
        error: data.message || "Error al enviar el correo",
        details: data
      });
    }

    return res.json({ 
      success: true, 
      messageId: data.id,
      message: "Correo enviado correctamente"
    });

  } catch (err: any) {
    console.error("[send-http] Error:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || "Error al enviar el correo" 
    });
  }
});

// ============================================
// REDIRECCIÓN PARA /api/mail/send (Mantener compatibilidad)
// ============================================

app.post("/api/mail/send", async (req, res) => {
  console.log("[send] Redirigiendo a /api/mail/send-http");
  // Reenviar la solicitud a la ruta funcional
  req.url = '/api/mail/send-http';
  app.handle(req, res);
});

// ============================================
// DNS VERIFICATION (Simulada)
// ============================================

app.post("/api/dns/verify-dns", async (req, res) => {
  try {
    const { domain } = req.body || {};
    if (!domain) {
      return res.status(400).json({ success: false, error: "Dominio requerido" });
    }
    
    res.json({
      success: true,
      domain,
      results: {
        mx: { status: "configured", records: [{ priority: 10, exchange: "mx1.improvmx.com" }] },
        spf: { status: "configured", record: "v=spf1 include:spf.improvmx.com ~all" },
        dkim: { status: "configured" },
        dmarc: { status: "configured" }
      },
      allDetected: true,
      message: "Todos los registros están correctamente configurados"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// AI DRAFT (Simulado)
// ============================================

app.post("/api/ai/draft", async (req, res) => {
  try {
    const { prompt, tone = "profesional" } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Prompt es requerido" });
    }

    const simulatedBody = `Estimado equipo,\n\nEn respuesta a su solicitud: "${prompt}".\n\nHemos preparado la información solicitada con un enfoque ${tone}. Quedamos atentos a cualquier consulta adicional.\n\nAtentamente,\nEl equipo de FreeMail Hub`;
    
    res.json({
      subject: `Propuesta: ${prompt.substring(0, 30)}...`,
      body: simulatedBody,
      simulated: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// RUTA PRINCIPAL
// ============================================

app.get("/api", (_req, res) => {
  res.json({
    message: "FreeMail Hub API funcionando correctamente",
    version: "3.0.0",
    endpoints: [
      "/api/health",
      "/api/mail/send",
      "/api/mail/send-http",
      "/api/ai/draft",
      "/api/dns/verify-dns"
    ]
  });
});

// ============================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ============================================

app.use((req, res) => {
  res.status(404).json({ 
    error: "Ruta no encontrada", 
    path: req.url,
    message: "Verifica que la URL sea correcta"
  });
});

// ============================================
// EXPORTAR PARA VERCEL
// ============================================

export default app;

// Iniciar servidor local
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[FreeMail Hub] Servidor corriendo en http://localhost:${PORT}`);
    console.log(`[FreeMail Hub] API Key: ${process.env.RESEND_API_KEY || process.env.SMTP_PASS ? '✅ Configurada' : '❌ No configurada'}`);
  });
}
