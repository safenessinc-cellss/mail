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
// ALMACENAMIENTO EN MEMORIA (PARA PRUEBAS)
// ============================================

// Array para guardar los correos recibidos
const receivedEmails: any[] = [];

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
    resend_configured: !!process.env.RESEND_API_KEY || !!process.env.SMTP_PASS,
    emails_received: receivedEmails.length
  });
});

// ============================================
// WEBHOOK PARA RECIBIR CORREOS (RESEND) - MEJORADO
// ============================================

app.post("/api/mail/webhook", async (req, res) => {
  try {
    console.log("[Webhook] 📩 Correo recibido:");
    console.log("[Webhook] Body completo:", JSON.stringify(req.body, null, 2));
    
    // Extraer datos del correo según el formato de Resend
    // Resend envía los datos en el campo 'data' o directamente en el body
    const data = req.body.data || req.body;
    
    // Extraer información del remitente y destinatario
    const from = data.from || data.sender || data.fromAddress || 'remitente@desconocido.com';
    const to = data.to || data.recipient || data.toAddress || 'destinatario@desconocido.com';
    const subject = data.subject || '(Sin Asunto)';
    const text = data.text || data.body || '';
    const html = data.html || data.bodyHtml || '';
    const attachments = data.attachments || [];
    
    // Extraer el nombre del remitente (si está disponible)
    let fromName = 'Remitente';
    let fromAddress = from;
    
    if (typeof from === 'string' && from.includes('<')) {
      // Formato: "Nombre <email@dominio.com>"
      const match = from.match(/^(.*?)\s*<(.+?)>$/);
      if (match) {
        fromName = match[1].trim() || 'Remitente';
        fromAddress = match[2].trim();
      }
    } else if (typeof from === 'string' && from.includes('@')) {
      // Solo email
      fromName = from.split('@')[0] || 'Remitente';
      fromAddress = from;
    } else if (typeof from === 'object' && from.address) {
      // Formato objeto
      fromName = from.name || from.address.split('@')[0] || 'Remitente';
      fromAddress = from.address;
    }
    
    // Extraer el destinatario
    let toAddress = to;
    if (typeof to === 'string' && to.includes('<')) {
      const match = to.match(/^(.*?)\s*<(.+?)>$/);
      if (match) {
        toAddress = match[2].trim();
      }
    } else if (typeof to === 'object' && to.address) {
      toAddress = to.address;
    }
    
    // Crear objeto del correo con datos completos
    const emailData = {
      id: data.id || `email_${Date.now()}`,
      from: fromAddress,
      fromName: fromName,
      to: toAddress,
      subject: subject,
      text: text,
      html: html || text,
      attachments: attachments,
      createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
      receivedAt: new Date().toISOString()
    };
    
    console.log("[Webhook] 📧 Datos extraídos:");
    console.log(`  De: ${fromName} <${fromAddress}>`);
    console.log(`  Para: ${toAddress}`);
    console.log(`  Asunto: ${subject}`);
    
    // Almacenar en memoria
    receivedEmails.unshift(emailData);
    
    // Mantener solo los últimos 100 correos
    if (receivedEmails.length > 100) {
      receivedEmails.pop();
    }
    
    console.log(`[Webhook] ✅ Correo almacenado. Total: ${receivedEmails.length}`);
    
    // Responder a Resend (debe ser 200 OK)
    res.status(200).json({ 
      success: true, 
      message: "Correo recibido y almacenado correctamente",
      emailId: emailData.id
    });
    
  } catch (err: any) {
    console.error("[Webhook] ❌ Error:", err);
    // Siempre responder con 200 para evitar que Resend reintente
    res.status(200).json({ 
      success: false, 
      error: err.message,
      message: "Error procesando el correo, pero confirmamos recepción"
    });
  }
});
// ============================================
// OBTENER CORREOS RECIBIDOS (PARA EL FRONTEND)
// ============================================

app.get("/api/mail/inbox", (req, res) => {
  try {
    // Obtener el límite de la query (default 20)
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Devolver los correos más recientes
    const emails = receivedEmails.slice(0, limit);
    
    res.json({
      success: true,
      count: emails.length,
      total: receivedEmails.length,
      emails: emails
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// OBTENER UN CORREO ESPECÍFICO POR ID
// ============================================

app.get("/api/mail/inbox/:id", (req, res) => {
  try {
    const { id } = req.params;
    const email = receivedEmails.find(e => e.id === id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: "Correo no encontrado"
      });
    }
    
    res.json({
      success: true,
      email
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// ELIMINAR TODOS LOS CORREOS (PARA PRUEBAS)
// ============================================

app.delete("/api/mail/inbox", (req, res) => {
  try {
    const count = receivedEmails.length;
    receivedEmails.length = 0; // Vaciar el array
    
    res.json({
      success: true,
      message: `${count} correos eliminados`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
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
        mx: { status: "configured", records: [{ priority: 10, exchange: "feedback-smtp.sa-east-1.amazonses.com" }] },
        spf: { status: "configured", record: "v=spf1 include:amazonses.com ~all" },
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
    version: "3.1.0",
    endpoints: [
      "/api/health",
      "/api/mail/send",
      "/api/mail/send-http",
      "/api/mail/webhook",
      "/api/mail/inbox",
      "/api/mail/inbox/:id",
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
    console.log(`[FreeMail Hub] Webhook: POST /api/mail/webhook`);
    console.log(`[FreeMail Hub] Inbox: GET /api/mail/inbox`);
  });
}
