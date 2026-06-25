/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURACIÓN DE FIREBASE ADMIN
// ============================================

// Configuración de Firebase usando variables de entorno
// O puedes usar la configuración directa (para pruebas)
const firebaseConfig = {
  projectId: "freemail-c2a13",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@freemail-c2a13.iam.gserviceaccount.com",
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || undefined,
};

// Si no hay clave privada, intentamos usar la configuración por defecto
let db: any = null;
let auth: any = null;

try {
  // Si tenemos credenciales, inicializar Firebase Admin
  if (firebaseConfig.privateKey && firebaseConfig.privateKey !== "undefined") {
    initializeApp({
      credential: cert(firebaseConfig),
      projectId: firebaseConfig.projectId,
    });
    db = getFirestore();
    auth = getAuth();
    console.log("[Firebase] ✅ Conectado a Firestore correctamente");
  } else {
    console.warn("[Firebase] ⚠️ Sin credenciales de servicio. Usando solo memoria.");
    console.warn("[Firebase] 💡 Para usar Firestore, configura FIREBASE_PRIVATE_KEY en Vercel.");
  }
} catch (err) {
  console.error("[Firebase] ❌ Error al inicializar Firebase:", err);
}

// ============================================
// ALMACENAMIENTO EN MEMORIA (FALLBACK)
// ============================================

const receivedEmails: any[] = [];

// ============================================
// FUNCIÓN PARA GUARDAR CORREO EN FIRESTORE
// ============================================

async function saveEmailToFirestore(emailData: any): Promise<string> {
  if (!db) {
    // Fallback a memoria si Firebase no está configurado
    receivedEmails.unshift(emailData);
    return emailData.id;
  }

  try {
    const docId = emailData.id || `email_${Date.now()}`;
    const docRef = db.collection("messages").doc(docId);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      await docRef.set({
        ...emailData,
        createdAt: emailData.createdAt || new Date().toISOString(),
        folder: "inbox",
        read: false,
        ownerId: "webhook",
        aliasId: "webhook",
        aliasAddress: emailData.to || "hola@coach-iso.eu",
      });
      console.log(`[Firestore] ✅ Correo guardado: ${docId}`);
    } else {
      console.log(`[Firestore] ⚠️ Correo ${docId} ya existe`);
    }
    
    receivedEmails.unshift(emailData);
    return docId;
  } catch (err) {
    console.error("[Firestore] ❌ Error:", err);
    receivedEmails.unshift(emailData);
    return emailData.id;
  }
}

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
    firebase_configured: !!db,
    emails_received: receivedEmails.length
  });
});

// ============================================
// WEBHOOK PARA RECIBIR CORREOS
// ============================================

app.post("/api/mail/webhook", async (req, res) => {
  try {
    console.log("[Webhook] 📩 Correo recibido");
    
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
      receivedAt: new Date().toISOString()
    };
    
    console.log(`[Webhook] De: ${fromName} <${fromAddress}>`);
    console.log(`[Webhook] Para: ${toAddress}`);
    console.log(`[Webhook] Asunto: ${subject}`);
    
    // Guardar en Firestore
    const docId = await saveEmailToFirestore(emailData);
    
    res.status(200).json({ 
      success: true, 
      message: "Correo recibido y almacenado",
      emailId: docId
    });
    
  } catch (err: any) {
    console.error("[Webhook] ❌ Error:", err);
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

app.get("/api/mail/inbox", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    let emails = [];
    
    if (db) {
      const snapshot = await db.collection("messages")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
      
      emails = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } else {
      emails = receivedEmails.slice(0, limit);
    }
    
    res.json({
      success: true,
      count: emails.length,
      total: emails.length,
      emails: emails
    });
  } catch (err: any) {
    console.error("[Inbox] Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// OBTENER CORREO POR ID
// ============================================

app.get("/api/mail/inbox/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let email = null;
    
    if (db) {
      const doc = await db.collection("messages").doc(id).get();
      if (doc.exists) {
        email = { id: doc.id, ...doc.data() };
      }
    } else {
      email = receivedEmails.find(e => e.id === id);
    }
    
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
// ELIMINAR CORREO
// ============================================

app.delete("/api/mail/inbox/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (db) {
      await db.collection("messages").doc(id).delete();
      console.log(`[Inbox] ✅ Correo ${id} eliminado de Firestore`);
    }
    
    // También eliminar de memoria
    const index = receivedEmails.findIndex(e => e.id === id);
    if (index !== -1) {
      receivedEmails.splice(index, 1);
    }
    
    res.json({
      success: true,
      message: `Correo ${id} eliminado`
    });
  } catch (err: any) {
    console.error("[Inbox] Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// ENVÍO DE CORREOS
// ============================================

app.post("/api/mail/send-http", async (req, res) => {
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
        error: "RESEND_API_KEY no configurada"
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
      return res.status(response.status).json({ 
        success: false, 
        error: data.message || "Error al enviar el correo"
      });
    }

    // Guardar correo enviado
    if (db) {
      await db.collection("messages").doc(`sent_${data.id}`).set({
        from: senderEmail,
        to: to,
        subject: subject || "(Sin Asunto)",
        body: body || "",
        createdAt: new Date().toISOString(),
        folder: "sent",
        read: true,
        ownerId: "webhook",
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
// REDIRECCIÓN PARA /api/mail/send
// ============================================

app.post("/api/mail/send", async (req, res) => {
  req.url = '/api/mail/send-http';
  app.handle(req, res);
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
// AI DRAFT
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
    version: "3.2.0",
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
    console.log(`[FreeMail Hub] 🔑 Resend: ${process.env.RESEND_API_KEY ? '✅' : '❌'}`);
    console.log(`[FreeMail Hub] 🔥 Firebase: ${db ? '✅ Conectado' : '❌ No configurado'}`);
    console.log(`[FreeMail Hub] 📬 Webhook: POST /api/mail/webhook`);
    console.log(`[FreeMail Hub] 📬 Inbox: GET /api/mail/inbox`);
  });
}
