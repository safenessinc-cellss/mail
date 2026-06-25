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
// CONFIGURACIÓN SMTP DESDE VARIABLES DE ENTORNO
// ============================================

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.resend.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || "resend",
  pass: process.env.SMTP_PASS || process.env.RESEND_API_KEY || "",
  from: process.env.SMTP_FROM || "hola@coach-iso.eu",
  auth: process.env.SMTP_AUTH === 'true'
};

console.log("[SMTP] Configuración cargada:");
console.log(`  Host: ${SMTP_CONFIG.host}`);
console.log(`  Port: ${SMTP_CONFIG.port}`);
console.log(`  Secure: ${SMTP_CONFIG.secure}`);
console.log(`  User: ${SMTP_CONFIG.user}`);
console.log(`  From: ${SMTP_CONFIG.from}`);
console.log(`  Auth: ${SMTP_CONFIG.auth}`);
console.log(`  Pass: ${SMTP_CONFIG.pass ? '✅ Configurada' : '❌ No configurada'}`);

// ============================================
// HEALTH CHECK
// ============================================

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    config: {
      smtp_host: !!process.env.SMTP_HOST,
      smtp_port: !!process.env.SMTP_PORT,
      smtp_user: !!process.env.SMTP_USER,
      smtp_pass: !!process.env.SMTP_PASS,
      smtp_from: !!process.env.SMTP_FROM,
      resend_api_key: !!process.env.RESEND_API_KEY,
      smtp_secure: process.env.SMTP_SECURE || 'false',
      smtp_auth: process.env.SMTP_AUTH || 'false'
    }
  });
});

// ============================================
// ENVÍO DE CORREOS (Usando SMTP con Nodemailer)
// ============================================

app.post("/api/mail/send", async (req, res) => {
  try {
    console.log("[SMTP] Recibida solicitud de envío");
    
    const { senderEmail, to, subject, body } = req.body || {};
    
    if (!senderEmail || !to) {
      return res.status(400).json({ 
        success: false, 
        error: "senderEmail y to son requeridos" 
      });
    }

    // Verificar configuración SMTP
    if (!SMTP_CONFIG.pass) {
      console.error("[SMTP] Error: Contraseña SMTP no configurada");
      return res.status(400).json({
        success: false,
        error: "Contraseña SMTP no configurada. Verifica SMTP_PASS en variables de entorno."
      });
    }

    // Importar Nodemailer dinámicamente
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: {
        user: SMTP_CONFIG.user,
        pass: SMTP_CONFIG.pass,
      },
      connectionTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verificar conexión
    try {
      await transporter.verify();
      console.log("[SMTP] Conexión verificada correctamente");
    } catch (verifyErr: any) {
      console.error("[SMTP] Error de verificación:", verifyErr.message);
      return res.status(500).json({
        success: false,
        error: "No se pudo conectar con el servidor SMTP",
        details: verifyErr.message
      });
    }

    // Preparar correo
    const mailOptions = {
      from: `"${senderEmail.split('@')[0]}" <${senderEmail}>`,
      to,
      subject: subject || "(Sin Asunto)",
      text: body || "",
      html: (body || "").replace(/\n/g, "<br/>"),
    };

    // Enviar
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Correo enviado exitosamente. MessageId: ${info.messageId}`);
    
    return res.json({ 
      success: true, 
      messageId: info.messageId,
      message: "Correo enviado correctamente"
    });

  } catch (err: any) {
    console.error("[SMTP] Error detallado:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Error al enviar el correo",
      details: err.response || err.code || "Error desconocido"
    });
  }
});

// ============================================
// ENVÍO DE CORREOS CON RESEND (Alternativa)
// ============================================

app.post("/api/mail/send-resend", async (req, res) => {
  try {
    const { senderEmail, to, subject, body } = req.body || {};
    
    if (!senderEmail || !to) {
      return res.status(400).json({ 
        success: false, 
        error: "senderEmail y to son requeridos" 
      });
    }

    const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "RESEND_API_KEY o SMTP_PASS no configurada"
      });
    }

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

    if (!response.ok) {
      console.error("[Resend] Error:", data);
      return res.status(response.status).json({ 
        success: false, 
        error: data.message || "Error al enviar el correo" 
      });
    }

    return res.json({ 
      success: true, 
      messageId: data.id,
      message: "Correo enviado correctamente con Resend"
    });

  } catch (err: any) {
    console.error("[Resend] Error:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || "Error al enviar el correo" 
    });
  }
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
      "/api/mail/send-resend",
      "/api/ai/draft",
      "/api/dns/verify-dns"
    ]
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
    console.log(`[FreeMail Hub] SMTP Pass: ${SMTP_CONFIG.pass ? '✅ Configurada' : '❌ No configurada'}`);
    console.log(`[FreeMail Hub] SMTP Host: ${SMTP_CONFIG.host}`);
  });
}
