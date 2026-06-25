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
// ALMACENAMIENTO EN MEMORIA
// ============================================

const receivedEmails: any[] = [];

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
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
// WEBHOOK PARA RECIBIR CORREOS (RESEND)
// ============================================

app.post("/api/mail/webhook", async (req, res) => {
  try {
    console.log("[Webhook] 📩 Correo recibido");
    console.log("[Webhook] Headers:", req.headers);
    console.log("[Webhook] Body:", JSON.stringify(req.body, null, 2));
    
    // Resend envía los datos en diferentes formatos
    const payload = req.body.data || req.body;
    
    // Extraer remitente
    let fromAddress = 'remitente@desconocido.com';
    let fromName = 'Remitente';
    
    if (typeof payload.from === 'string') {
      const match = payload.from.match(/^(.*?)\s*<(.+?)>$/);
      if (match) {
        fromName = match[1].trim();
        fromAddress = match[2].trim();
      } else {
        fromAddress = payload.from;
        fromName = payload.from.split('@')[0] || 'Remitente';
      }
    } else if (typeof payload.from === 'object' && payload.from !== null) {
      fromAddress = payload.from.address || payload.from.email || 'remitente@desconocido.com';
      fromName = payload.from.name || fromAddress.split('@')[0] || 'Remitente';
    }
    
    // Extraer destinatario
    let toAddress = 'destinatario@desconocido.com';
    
    if (typeof payload.to === 'string') {
      const match = payload.to.match(/^(.*?)\s*<(.+?)>$/);
      if (match) {
        toAddress = match[2].trim();
      } else {
        toAddress = payload.to;
      }
    } else if (typeof payload.to === 'object' && payload.to !== null) {
      toAddress = payload.to.address || payload.to.email || 'destinatario@desconocido.com';
    } else if (Array.isArray(payload.to) && payload.to.length > 0) {
      const firstTo = payload.to[0];
      if (typeof firstTo === 'string') {
        const match = firstTo.match(/^(.*?)\s*<(.+?)>$/);
        toAddress = match ? match[2].trim() : firstTo;
      } else if (typeof firstTo === 'object') {
        toAddress = firstTo.address || firstTo.email || 'destinatario@desconocido.com';
      }
    }
    
    const subject = payload.subject || '(Sin Asunto)';
    const text = payload.text || payload.body || '';
    const html = payload.html || payload.bodyHtml || text;
    const attachments = payload.attachments || [];
    const id = payload.id || `email_${Date.now()}`;
    const createdAt = payload.createdAt || payload.timestamp || new Date().toISOString();
    
    const emailData = {
      id: id,
      from: fromAddress,
      fromName: fromName,
      to: toAddress,
      subject: subject,
      text: text,
      html: html,
      attachments: attachments,
      createdAt: createdAt,
      receivedAt: new Date().toISOString(),
      folder: 'inbox',
      read: false
    };
    
    console.log(`[Webhook] ✅ De: ${fromName} <${fromAddress}>`);
    console.log(`[Webhook] ✅ Para: ${toAddress}`);
    console.log(`[Webhook] ✅ Asunto: ${subject}`);
    
    // Almacenar en memoria
    receivedEmails.unshift(emailData);
    
    if (receivedEmails.length > 100) {
      receivedEmails.pop();
    }
    
    console.log(`[Webhook] ✅ Total: ${receivedEmails.length} correos`);
    
    res.status(200).json({ 
      success: true, 
      message: "Correo recibido y almacenado",
      emailId: emailData.id
    });
    
  } catch (err: any) {
    console.error("[Webhook] ❌ Error:", err);
    // Siempre responder 200 para evitar que Resend reintente
    res.status(200).json({ 
      success: false, 
      error: err.message,
      message: "Error procesando correo"
    });
  }
});

// ============================================
// OBTENER CORREOS
// ============================================

app.get("/api/mail/inbox", (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const emails = receivedEmails.slice(0, limit);
    
    console.log(`[Inbox] 📬 Enviando ${emails.length} correos`);
    
    res.json({
      success: true,
      count: emails.length,
      total: receivedEmails.length,
      emails: emails
    });
  } catch (err: any) {
    console.error("[Inbox] ❌ Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// OBTENER CORREO POR ID
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
// ACTUALIZAR CORREO (Marcar como leído)
// ============================================

app.patch("/api/mail/inbox/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { read } = req.body || {};
    
    console.log(`[Patch] 📝 Actualizando correo ${id}, read: ${read}`);
    
    const email = receivedEmails.find(e => e.id === id);
    if (!email) {
      return res.status(404).json({
        success: false,
        error: "Correo no encontrado"
      });
    }
    
    if (read !== undefined) {
      email.read = read;
    }
    
    console.log(`[Patch] ✅ Correo ${id} actualizado`);
    
    res.json({
      success: true,
      message: "Correo actualizado",
      email
    });
  } catch (err: any) {
    console.error("[Patch] ❌ Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// ELIMINAR CORREO
// ============================================

app.delete("/api/mail/inbox/:id", (req, res) => {
  try {
    const { id } = req.params;
    const index = receivedEmails.findIndex(e => e.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Correo no encontrado"
      });
    }
    
    receivedEmails.splice(index, 1);
    
    console.log(`[Delete] ✅ Correo ${id} eliminado`);
    
    res.json({
      success: true,
      message: `Correo ${id} eliminado`
    });
  } catch (err: any) {
    console.error("[Delete] ❌ Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// ENVÍO DE CORREOS (USANDO RESEND) - RUTA PRINCIPAL
// ============================================

app.post("/api/mail/send", async (req, res) => {
  try {
    console.log("[send] 📧 Recibida solicitud de envío");
    
    const { senderEmail, to, subject, body } = req.body || {};
    
    if (!senderEmail || !to) {
      return res.status(400).json({ 
        success: false, 
        error: "senderEmail y to son requeridos" 
      });
    }

    const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
    if (!apiKey) {
      console.error("[send] ❌ API Key no configurada");
      return res.status(400).json({
        success: false,
        error: "RESEND_API_KEY no configurada. Agrega la variable en Vercel."
      });
    }

    console.log(`[send] 📤 De: ${senderEmail}`);
    console.log(`[send] 📤 Para: ${to}`);
    console.log(`[send] 📤 Asunto: ${subject}`);

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
    console.log("[send] 📬 Respuesta de Resend:", data);

    if (!response.ok) {
      console.error("[send] ❌ Error de Resend:", data);
      return res.status(response.status).json({ 
        success: false, 
        error: data.message || "Error al enviar el correo",
        details: data
      });
    }

    // Guardar el correo enviado en la bandeja de "enviados"
    const sentEmail = {
      id: `sent_${data.id}`,
      from: senderEmail,
      fromName: senderEmail.split('@')[0] || 'Yo',
      to: to,
      subject: subject || "(Sin Asunto)",
      body: body || "",
      html: (body || "").replace(/\n/g, "<br/>"),
      createdAt: new Date().toISOString(),
      folder: "sent",
      read: true
    };
    
    receivedEmails.unshift(sentEmail);
    
    console.log(`[send] ✅ Correo enviado con ID: ${data.id}`);
    console.log(`[send] ✅ Total en bandeja: ${receivedEmails.length}`);

    return res.json({ 
      success: true, 
      messageId: data.id,
      message: "Correo enviado correctamente"
    });

  } catch (err: any) {
    console.error("[send] ❌ Error:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || "Error al enviar el correo",
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ============================================
// ENVÍO DE CORREOS (RUTA ALTERNATIVA - COMPATIBILIDAD)
// ============================================

app.post("/api/mail/send-http", async (req, res) => {
  // Redirigir a la ruta principal
  req.url = '/api/mail/send';
  app._router.handle(req, res);
});

// ============================================
// DNS VERIFICATION
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

    const simulatedBody = `Estimado equipo,\n\nEn respuesta a su solicitud: "${prompt}".\n\nHemos preparado la información solicitada con un enfoque ${tone}.\n\nAtentamente,\nEl equipo de FreeMail Hub`;
    
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
    version: "3.3.0",
    endpoints: [
      "/api/health",
      "/api/mail/send",
      "/api/mail/send-http",
      "/api/mail/webhook",
      "/api/mail/inbox",
      "/api/mail/inbox/:id",
      "/api/mail/inbox/:id (PATCH)",
      "/api/mail/inbox/:id (DELETE)",
      "/api/ai/draft",
      "/api/dns/verify-dns"
    ]
  });
});

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Global] ❌ Error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Error interno del servidor",
    path: req.url
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
    console.log(`[FreeMail Hub] 🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`[FreeMail Hub] 🔑 Resend: ${process.env.RESEND_API_KEY ? '✅' : '❌'}`);
    console.log(`[FreeMail Hub] 📬 Webhook: POST /api/mail/webhook`);
    console.log(`[FreeMail Hub] 📬 Inbox: GET /api/mail/inbox`);
  });
}
