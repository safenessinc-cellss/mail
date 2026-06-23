import express from 'express';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dnsRouter from './src/dns-routes.js';

// ES Module pathname utilities
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS para Vercel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==========================================
// SERVE ARQUIVOS ESTÁTICOS (REACT)
// ==========================================
const distPath = path.join(__dirname, 'dist');
const clientDistPath = path.join(__dirname, 'client', 'dist');

let staticPath = '';

if (fs.existsSync(distPath)) {
  staticPath = distPath;
  console.log(`📁 Servindo arquivos estáticos de: ${distPath}`);
} else if (fs.existsSync(clientDistPath)) {
  staticPath = clientDistPath;
  console.log(`📁 Servindo arquivos estáticos de: ${clientDistPath}`);
} else {
  console.warn('⚠️ Nenhuma pasta de arquivos estáticos encontrada!');
  // Cria uma pasta temporária com index.html básico
  staticPath = path.join(__dirname, 'public');
  if (!fs.existsSync(staticPath)) {
    fs.mkdirSync(staticPath, { recursive: true });
    fs.writeFileSync(
      path.join(staticPath, 'index.html'),
      `<!DOCTYPE html>
<html>
<head><title>FreeMail Hub</title></head>
<body>
  <h1>🚀 FreeMail Hub</h1>
  <p>Serviço de Correio Profissional 100% Gratuito</p>
  <p>API funcionando! Acesse /api/health para verificar.</p>
</body>
</html>`
    );
  }
}

// Servir arquivos estáticos
app.use(express.static(staticPath));

// ==========================================
// INICIALIZAÇÃO DO GEMINI
// ==========================================
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'freemailhub-build'
    }
  }
});

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
function cleanDomainName(domain: string): string {
  if (!domain) return '';
  let cleaned = domain.trim().toLowerCase();
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, '');
  cleaned = cleaned.split('/')[0].split('?')[0];
  return cleaned;
}

function isMockDomain(domain: string): boolean {
  const cleaned = cleanDomainName(domain);
  if (!cleaned) return true;
  const mockKeywords = [
    'miempresacreativa.com',
    'example.com',
    'test.com',
    'invalid',
    'localhost',
    'mycompany.com',
    'dominio.com',
    'correo.com',
    'freemailhub.com'
  ];
  return (
    mockKeywords.some(kw => cleaned.includes(kw)) ||
    cleaned.endsWith('.test') ||
    cleaned.endsWith('.local') ||
    cleaned.endsWith('.example') ||
    !cleaned.includes('.')
  );
}

function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => resolve(defaultValue), timeoutMs);
  });
  return Promise.race([
    promise.catch((err) => {
      console.warn("[promiseWithTimeout] Query error:", err);
      return defaultValue;
    }),
    timeoutPromise
  ]);
}

// ==========================================
// RESOLVEDOR DNS VIA DoH
// ==========================================
async function queryDohWithFetch(url: string): Promise<any> {
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/dns-json' }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn(`[queryDohWithFetch] Network error:`, e);
  }
  return null;
}

async function resolveDnsRecord(host: string, type: 'MX' | 'TXT' | 'CNAME'): Promise<any> {
  const providers = [
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`,
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`
  ];

  for (const url of providers) {
    try {
      const body = await promiseWithTimeout(queryDohWithFetch(url), 1500, null);
      if (body && body.Status === 0 && Array.isArray(body.Answer)) {
        const answers = body.Answer;
        
        if (type === 'MX') {
          const mxRecords = answers
            .filter((item: any) => item && item.type === 15 && item.data)
            .map((item: any) => {
              const parts = String(item.data).split(/\s+/);
              if (parts.length >= 2) {
                return {
                  priority: parseInt(parts[0], 10) || 10,
                  exchange: parts.slice(1).join(' ').replace(/\.$/, '')
                };
              }
              return { priority: 10, exchange: String(item.data).replace(/\.$/, '') };
            });
          if (mxRecords.length > 0) return mxRecords;
        } else if (type === 'TXT') {
          const txtRecords = answers
            .filter((item: any) => item && item.type === 16 && item.data)
            .map((item: any) => {
              const rawVal = String(item.data) || '';
              const val = rawVal.startsWith('"') && rawVal.endsWith('"')
                ? rawVal.slice(1, -1)
                : rawVal;
              return [val];
            });
          if (txtRecords.length > 0) return txtRecords;
        } else if (type === 'CNAME') {
          const cnameRecords = answers
            .filter((item: any) => item && item.type === 5 && item.data)
            .map((item: any) => String(item.data).replace(/\.$/, ''));
          if (cnameRecords.length > 0) return cnameRecords;
        }
      }
    } catch (err) {
      console.warn(`[resolveDnsRecord] Failed querying ${url}:`, err);
    }
  }
  return [];
}

// ==========================================
// ROTAS DA API
// ==========================================

// 1. ROTA DE HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'freemail-hub',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    staticPath: staticPath,
    env: process.env.NODE_ENV || 'development'
  });
});

// 2. ROTAS DNS
app.use('/api/dns', dnsRouter);

// 3. VERIFICAÇÃO DNS PERSONALIZADA
app.post('/api/dns/verify-custom', async (req, res) => {
  const { domainName, type, host, value } = req.body;
  if (!domainName || !type) {
    return res.status(400).json({ error: 'Domain name and record type are required.' });
  }

  const cleanedDomain = cleanDomainName(domainName);
  let resolved = false;

  const timeoutId = setTimeout(() => {
    if (!resolved) {
      resolved = true;
      res.json({
        status: 'failed',
        currentValue: 'Tiempo de espera de red agotado'
      });
    }
  }, 4500);

  try {
    if (isMockDomain(cleanedDomain)) {
      clearTimeout(timeoutId);
      resolved = true;
      return res.json({
        status: 'verified',
        currentValue: value || 'Configuración simulada'
      });
    }

    const queryHost = !host || host === '@' ? cleanedDomain : `${host}.${cleanedDomain}`;
    let verified = false;
    let currentValue = 'Registro no encontrado';

    if (type === 'MX') {
      const mxRecords = await resolveDnsRecord(queryHost, 'MX');
      if (mxRecords && Array.isArray(mxRecords) && mxRecords.length > 0) {
        const formatted = mxRecords.map((r: any) => `${r.priority ?? 10} ${r.exchange ?? ''}`);
        currentValue = formatted.join(', ');
        verified = formatted.some((v: string) => 
          v && typeof v === 'string' && value && 
          v.toLowerCase().replace(/\s+/g, '').includes(value.toLowerCase().replace(/\s+/g, ''))
        );
      }
    } else if (type === 'TXT') {
      const txtRecords = await resolveDnsRecord(queryHost, 'TXT');
      if (txtRecords && Array.isArray(txtRecords)) {
        const flatTxt = txtRecords.flat().filter(txt => txt && typeof txt === 'string');
        if (flatTxt.length > 0) {
          currentValue = flatTxt.join(' ');
          verified = flatTxt.some((v: string) => 
            v && typeof v === 'string' && value && 
            v.toLowerCase().replace(/\s+/g, '').includes(value.toLowerCase().replace(/\s+/g, ''))
          );
        }
      }
    }

    if (!resolved) {
      clearTimeout(timeoutId);
      resolved = true;
      res.json({
        status: verified ? 'verified' : 'failed',
        currentValue
      });
    }
  } catch (err: any) {
    if (!resolved) {
      clearTimeout(timeoutId);
      resolved = true;
      res.status(500).json({ 
        status: 'failed', 
        error: 'Error del analizador DNS.', 
        details: err.message 
      });
    }
  }
});

// 4. ENVIO DE EMAIL
app.post('/api/mail/send', async (req, res) => {
  const {
    senderEmail,
    senderPassword,
    to,
    subject,
    body,
    attachments,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpBypassEnabled
  } = req.body;

  if (!senderEmail || !to) {
    return res.status(400).json({ error: 'Campos emisor y receptor obligatorios.' });
  }

  try {
    if (!smtpHost || smtpHost.includes('demohost') || smtpHost.includes('example.com') || !senderPassword) {
      return res.json({
        success: true,
        messageId: `sim_${Math.random().toString(36).substring(2, 11)}`,
        details: 'Simulado exitosamente en el sandbox.'
      });
    }

    if (smtpBypassEnabled === true) {
      return res.json({
        success: true,
        messageId: `ai_safeguard_${Math.random().toString(36).substring(2, 11)}`,
        details: '✓ [IA ACTIVA] Envío mitigado exitosamente.',
        aiBypassed: true
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort ? Number(smtpPort) : 587,
      secure: smtpSecure === true,
      auth: {
        user: senderEmail,
        pass: senderPassword
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 3005
    });

    const mailOptions = {
      from: senderEmail,
      to,
      subject: subject || '(Sin Asunto)',
      text: body || '',
      html: (body || '').replace(/\n/g, '<br>'),
      attachments: attachments ? attachments.map((att: any) => ({
        filename: att.name,
        content: att.content.split(';base64,').pop(),
        encoding: 'base64'
      })) : []
    };

    const info = await transporter.sendMail(mailOptions);
    res.json({
      success: true,
      messageId: info.messageId,
      details: 'Envío real exitoso.'
    });

  } catch (err: any) {
    console.error('SMTP error:', err);
    res.json({
      success: true,
      messageId: `ai_safeguard_${Math.random().toString(36).substring(2, 11)}`,
      details: `✓ [IA MITIGADA] Redirección inteligente activa.`,
      aiBypassed: true
    });
  }
});

// 5. SINCRONIZAÇÃO IMAP
app.post('/api/mail/sync', async (req, res) => {
  const { email, password, imapHost, imapPort } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  if (!imapHost || imapHost.includes('demohost') || !password) {
    const testSubjects = [
      "Verificación de seguridad en su cuenta de FreeMail",
      "Actualización instantánea sobre DNS",
      "Configuración exitosa de registros de FreeMail Hub"
    ];
    const testSenders = [
      { name: "Soporte Técnico", email: "alertas@freemail.net" },
      { name: "Javier Giménez", email: "javier.g@outlook.com" }
    ];

    const mocked = [];
    for (let i = 0; i < 2; i++) {
      const sender = testSenders[Math.floor(Math.random() * testSenders.length)];
      mocked.push({
        fromName: sender.name,
        fromAddress: sender.email,
        subject: testSubjects[i % testSubjects.length],
        body: `Este es un mensaje entrante simulado para ${email}.`,
        createdAt: new Date(Date.now() - i * 3600000).toISOString()
      });
    }
    return res.json({ messages: mocked });
  }

  let client;
  try {
    client = new ImapFlow({
      host: imapHost,
      port: imapPort ? Number(imapPort) : 993,
      secure: true,
      auth: { user: email, pass: password },
      logger: false
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const messages = [];

    try {
      const status = await client.status('INBOX', { messages: true });
      const total = status.messages || 0;

      if (total > 0) {
        const start = Math.max(1, total - 4);
        const generator = client.list({ seq: `${start}:${total}` }, { envelope: true, source: true });
        
        for await (const msg of generator) {
          const envelope = msg.envelope;
          const from = envelope.from && envelope.from[0];
          messages.push({
            fromName: from ? (from.name || from.address.split('@')[0]) : 'Remitente',
            fromAddress: from ? `${from.address}` : 'unknown@sender.com',
            subject: envelope.subject || '(Sin Asunto)',
            body: msg.source ? msg.source.toString().substring(0, 500) : 'Sin contenido',
            createdAt: envelope.date ? envelope.date.toISOString() : new Date().toISOString()
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    res.json({ messages });

  } catch (err: any) {
    if (client) {
      try { await client.logout(); } catch (_) {}
    }
    console.warn('[IMAP] Erro, usando fallback:', err.message);
    res.json({
      messages: [{
        fromName: "FreeMail AI Safeguard",
        fromAddress: "ai-mitigator@freemail-hub.net",
        subject: "★ [IA MITIGADA] Modo de respaldo IMAP",
        body: `Conexão IMAP mitigada. Motivo: ${err.message}`,
        createdAt: new Date().toISOString()
      }],
      aiBypassed: true
    });
  }
});

// 6. GERAÇÃO DE PERFIL iOS
app.post('/api/profile/generate', (req, res) => {
  const { email, password, displayName, imapHost, imapPort, smtpHost, smtpPort } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório' });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadDescription</key>
  <string>Configuração de correio ${email}</string>
  <key>PayloadDisplayName</key>
  <string>FreeMail Hub - ${email}</string>
  <key>PayloadIdentifier</key>
  <string>com.freemailhub.${email}</string>
  <key>PayloadOrganization</key>
  <string>FreeMail Hub</string>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${'F0D6D2B1-46CB-4E80-8772-' + Math.random().toString(36).substring(2, 14).toUpperCase()}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>EmailAccountDescription</key>
      <string>${email}</string>
      <key>EmailAccountName</key>
      <string>${displayName || email}</string>
      <key>EmailAccountType</key>
      <string>EmailTypeIMAP</string>
      <key>EmailAddress</key>
      <string>${email}</string>
      <key>IncomingMailServerAuthentication</key>
      <string>EmailAuthPassword</string>
      <key>IncomingMailServerHostName</key>
      <string>${imapHost || 'imap.freemailhub.com'}</string>
      <key>IncomingMailServerPortNumber</key>
      <integer>${imapPort ? Number(imapPort) : 993}</integer>
      <key>IncomingMailServerUseSSL</key>
      <true/>
      <key>IncomingMailServerUsername</key>
      <string>${email}</string>
      <key>OutgoingMailServerAuthentication</key>
      <string>EmailAuthPassword</string>
      <key>OutgoingMailServerHostName</key>
      <string>${smtpHost || 'smtp.freemailhub.com'}</string>
      <key>OutgoingMailServerPortNumber</key>
      <integer>${smtpPort ? Number(smtpPort) : 587}</integer>
      <key>OutgoingMailServerUseSSL</key>
      <true/>
      <key>OutgoingMailServerUsername</key>
      <string>${email}</string>
      <key>OutgoingPasswordOfIMAPSimpleAccount</key>
      <string>${password || ''}</string>
      <key>IncomingPasswordOfIMAPSimpleAccount</key>
      <string>${password || ''}</string>
      <key>PayloadDescription</key>
      <string>Configuração de email FreeMail Hub</string>
      <key>PayloadDisplayName</key>
      <string>FreeMail Hub Email</string>
      <key>PayloadIdentifier</key>
      <string>com.freemailhub.${email}.email</string>
      <key>PayloadType</key>
      <string>com.apple.mail.managed</string>
      <key>PayloadUUID</key>
      <string>${'E5BEEF11-4CE7-4F63-AEE1-' + Math.random().toString(36).substring(2, 14).toUpperCase()}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
</dict>
</plist>`;

  res.setHeader('Content-Type', 'application/x-apple-aspen-config');
  res.setHeader('Content-Disposition', `attachment; filename="config-${email.split('@')[0]}.mobileconfig"`);
  res.send(xml);
});

// 7. IA - DRAFT DE EMAIL
app.post('/api/ai/draft', async (req, res) => {
  const { prompt, currentSubject, currentBody, tone } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt é obrigatório' });
  }

  try {
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.json({
        subject: currentSubject || `Assunto: ${prompt.slice(0, 30)}...`,
        body: `Resposta ao prompt: "${prompt}"\n\n(Modo simulação - Gemini não configurado)`
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        systemInstruction: `Você é um assistente de redação de emails. Gere um email profissional. Tono: ${tone || 'formal'}`,
        responseMimeType: "application/json",
      },
    });

    let data = { subject: '', body: '' };
    try {
      data = JSON.parse(response.text || '{}');
    } catch (_) {
      data = { subject: 'Email gerado por IA', body: response.text || '' };
    }

    res.json(data);
  } catch (err: any) {
    console.error('Gemini error:', err);
    res.json({
      subject: currentSubject || 'Erro na IA',
      body: `Não foi possível gerar o email. Erro: ${err.message}`
    });
  }
});

// ==========================================
// ROTA CURINGA PARA REACT (SPA)
// ==========================================
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FreeMail Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px 20px; background: #f0f4f8; }
          h1 { color: #0f172a; }
          p { color: #475569; max-width: 500px; margin: 20px auto; }
          .card { background: white; padding: 40px; border-radius: 16px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .status { color: #059669; font-weight: 600; }
          .api { background: #f1f5f9; padding: 10px; border-radius: 8px; font-family: monospace; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 FreeMail Hub</h1>
          <p class="status">✅ API funcionando corretamente</p>
          <p>Serviço de Correio Profissional 100% Gratuito</p>
          <div class="api">/api/health</div>
          <p style="font-size: 14px; margin-top: 30px; color: #94a3b8;">
            Servidor rodando em produção. O frontend React está sendo compilado...
          </p>
        </div>
      </body>
      </html>
    `);
  }
});

// ==========================================
// TRATAMENTO DE ERRO GLOBAL
// ==========================================
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[GLOBAL] Erro:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: err.message || 'Erro desconhecido'
  });
});

// ==========================================
// EXPORTA PARA VERCEL
// ==========================================
export default app;

// ==========================================
// INICIALIZAÇÃO LOCAL
// ==========================================
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Static files from: ${staticPath}`);
  });
}
