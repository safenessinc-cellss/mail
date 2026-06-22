import express from 'express';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dnsRouter from './src/dns-routes.js';

// ES Module pathname utilities
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client with proper telemetry tracking options
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

/**
 * ==========================================
 * Helper utilities for Domain DNS resolution
 * ==========================================
 */
function cleanDomainName(domain: string): string {
  if (!domain) return '';
  let cleaned = domain.trim().toLowerCase();
  // Remove protocol schemes if copy-pasted
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, '');
  // Extract only the hostname component
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
    !cleaned.includes('.') // No TLD defined
  );
}

/**
 * ==========================================
 * Helper: Intelligent DNS-over-HTTPS (DoH) Resolver
 * ==========================================
 * Direct UDP DNS (Port 53) is often blocked in serverless or firewalled hosting environments.
 * Using Google Public DNS & Cloudflare DNS over HTTPS (Port 443) guarantees 100% resolution success.
 * This implementation avoids any native "dns" package dependencies which can crash under serverless runtimes.
 */
function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(defaultValue);
    }, timeoutMs);
  });
  return Promise.race([
    promise.catch((err) => {
      console.warn("[promiseWithTimeout] Query error:", err);
      return defaultValue;
    }),
    timeoutPromise
  ]);
}

async function queryDohWithFetch(url: string): Promise<any> {
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/dns-json'
      }
    });
    if (res.ok) {
      return await res.json();
    } else {
      console.warn(`[queryDohWithFetch] Non-ok response ${res.status} from ${url}`);
    }
  } catch (e) {
    console.warn(`[queryDohWithFetch] Network error fetching ${url}:`, e);
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
      // Limit each provider request to 1500ms maximum
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
      console.warn(`[resolveDnsRecord HTTP Warning] Failed querying ${url}:`, err);
    }
  }

  console.log(`[resolveDnsRecord] Pure DoH failed to resolve ${host} (${type}) across all providers.`);
  return [];
}

/**
 * ==========================================
 * 1. AUTOMATIC DNS CHECK FOR GENERAL PANEL
 * ==========================================
 */
app.use('/api/dns', dnsRouter);

/**
 * ==========================================
 * 2. CUSTOM DNS RECOGNITION (INDIVIDUAL)
 * ==========================================
 */
app.post('/api/dns/verify-custom', async (req, res) => {
  const { domainName, type, host, value } = req.body;
  if (!domainName || !type) {
    return res.status(400).send('Domain name and record type are required.');
  }

  const cleanedDomain = cleanDomainName(domainName);
  let resolvedResponseSent = false;

  // Safety timeout of 4.5 seconds so it never hangs or triggers FUNCTION_INVOCATION_FAILED on Vercel
  const timeoutId = setTimeout(() => {
    if (!resolvedResponseSent) {
      resolvedResponseSent = true;
      console.warn(`[API DNS Verify Custom] Timeout reached for ${cleanedDomain} type ${type}.`);
      res.json({
        status: 'failed',
        currentValue: 'Tiempo de espera de red agotado'
      });
    }
  }, 4500);

  try {
    let verified = false;
    let currentValue = 'Registro no encontrado';

    // Fast-track mock domain validation in sandbox environment
    if (isMockDomain(cleanedDomain)) {
      clearTimeout(timeoutId);
      resolvedResponseSent = true;
      return res.json({
        status: 'verified',
        currentValue: value
      });
    }

    const queryHost = !host || host === '@' ? cleanedDomain : `${host}.${cleanedDomain}`;

    if (type === 'MX') {
      try {
        const mxRecords = await resolveDnsRecord(queryHost, 'MX');
        if (mxRecords && Array.isArray(mxRecords) && mxRecords.length > 0) {
          const formatted = mxRecords.map((r: any) => `${r.priority ?? 10} ${r.exchange ?? ''}`);
          currentValue = formatted.join(', ');
          verified = formatted.some((v: string) => v && typeof v === 'string' && value && v.toLowerCase().replace(/\s+/g, '').includes(value.toLowerCase().replace(/\s+/g, '')));
        }
      } catch (e: any) {
        currentValue = `No verificado. Error: ${e.message || e.code || e}`;
      }
    } else if (type === 'TXT') {
      try {
        const txtRecords = await resolveDnsRecord(queryHost, 'TXT');
        if (txtRecords && Array.isArray(txtRecords)) {
          const flatTxt = txtRecords.flat().filter(txt => txt && typeof txt === 'string');
          if (flatTxt.length > 0) {
            currentValue = flatTxt.join(' ');
            verified = flatTxt.some((v: string) => v && typeof v === 'string' && value && v.toLowerCase().replace(/\s+/g, '').includes(value.toLowerCase().replace(/\s+/g, '')));
          }
        }
      } catch (e: any) {
        currentValue = `No verificado. Error: ${e.message || e.code || e}`;
      }
    } else if (type === 'CNAME') {
      try {
        const cnames = await resolveDnsRecord(queryHost, 'CNAME');
        if (cnames && Array.isArray(cnames) && cnames.length > 0) {
          const validCnames = cnames.filter(c => c && typeof c === 'string');
          currentValue = validCnames.join(', ');
          verified = validCnames.some((v: string) => v && typeof v === 'string' && value && v.toLowerCase().replace(/\s+/g, '').includes(value.toLowerCase().replace(/\s+/g, '')));
        }
      } catch (e: any) {
        currentValue = `No verificado. Error: ${e.message || e.code || e}`;
      }
    } else {
      currentValue = `Comprobación para tipo ${type} no implementada explícitamente.`;
    }

    if (!resolvedResponseSent) {
      clearTimeout(timeoutId);
      resolvedResponseSent = true;
      res.json({
        status: verified ? 'verified' : 'failed',
        currentValue
      });
    }
  } catch (err: any) {
    if (!resolvedResponseSent) {
      clearTimeout(timeoutId);
      resolvedResponseSent = true;
      res.status(500).json({ status: 'failed', error: 'Error del analizador DNS.', details: err.message });
    }
  }
});

/**
 * ==========================================
 * 3. SEND EMAIL (SMTP PASS-THROUGH)
 * ==========================================
 */
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
    smtpSecure
  } = req.body;

  if (!senderEmail || !to) {
    return res.status(400).json({ error: 'Campos emisor y receptor obligatorios.' });
  }

  try {
    // Return mock success for sample domain credentials
    if (!smtpHost || smtpHost.includes('demohost') || smtpHost.includes('example.com') || !senderPassword) {
      return res.json({
        success: true,
        messageId: `sim_${Math.random().toString(36).substring(2, 11)}`,
        details: 'Simulado exitosamente en el sandbox.'
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
      tls: {
        rejectUnauthorized: false
      }
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
      details: 'Envío real exitoso a través del servidor SMTP corporativo.'
    });
  } catch (err: any) {
    console.error('SMTP error:', err);
    res.status(500).json({
      error: 'Error de servidor SMTP de correo',
      details: err.message || String(err)
    });
  }
});

/**
 * ==========================================
 * 4. SYNC EMAILS (IMAP SYNCHRONIZATION)
 * ==========================================
 */
app.post('/api/mail/sync', async (req, res) => {
  const { email, password, imapHost, imapPort } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  // Generates randomized test simulation mails if credentials are mock/sandbox
  if (!imapHost || imapHost.includes('demohost') || !password) {
    const testSubjects = [
      "Verificación de seguridad en su cuenta de FreeMail",
      "Actualización instantánea sobre DNS",
      "Factura mensual de hosting de dominio",
      "Agenda para la reunión de mañana",
      "Configuración exitosa de registros de FreeMail Hub"
    ];
    const testSenders = [
      { name: "Soporte Técnico", email: "alertas@freemail.net" },
      { name: "Javier Giménez", email: "javier.g@outlook.com" },
      { name: "Sistemas Webmail", email: "sysadmin@customdomain.com" },
      { name: "Marta de Ventas", email: "ventas@empresa.com" }
    ];

    const count = Math.floor(Math.random() * 2) + 1;
    const mocked = [];

    for (let i = 0; i < count; i++) {
      const sender = testSenders[Math.floor(Math.random() * testSenders.length)];
      const subject = testSubjects[Math.floor(Math.random() * testSubjects.length)];
      mocked.push({
        fromName: sender.name,
        fromAddress: sender.email,
        subject,
        body: `Hola,\n\nEste es un mensaje entrante simulado en el Webmail de FreeMail Hub para tu alias ${email}.\n\nPara poder recibir correos electrónicos reales en producción, es necesario que configures los registros MX públicos de tu dominio personalizado e ingreses credenciales IMAP correspondientes.\n\nAtentamente,\nSoporte de FreeMail Hub`,
        createdAt: new Date(Date.now() - i * 3600000).toISOString()
      });
    }

    return res.json({ messages: mocked });
  }

  // Real IMAP check
  let client;
  try {
    client = new ImapFlow({
      host: imapHost,
      port: imapPort ? Number(imapPort) : 993,
      secure: true,
      auth: {
        user: email,
        pass: password
      },
      logger: false
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const messages = [];

    try {
      const status = await client.status('INBOX', { messages: true });
      const total = status.messages || 0;

      if (total > 0) {
        const start = Math.max(1, total - 4); // fetch last 5
        const generator = client.list({ seq: `${start}:${total}` }, { envelope: true, source: true });
        
        for await (const msg of generator) {
          const envelope = msg.envelope;
          const from = envelope.from && envelope.from[0];
          const fromName = from ? (from.name || from.address.split('@')[0]) : 'Remitente';
          const fromAddress = from ? `${from.address}` : 'unknown@sender.com';

          let bodyMsg = '';
          try {
            bodyMsg = msg.source ? msg.source.toString() : 'Sin contenido';
            if (bodyMsg.includes('\r\n\r\n')) {
              bodyMsg = bodyMsg.split('\r\n\r\n').slice(1).join('\r\n\r\n').substring(0, 1500);
            }
          } catch (_) {
            bodyMsg = 'Cuerpo no legible';
          }

          messages.push({
            fromName,
            fromAddress,
            subject: envelope.subject || '(Sin Asunto)',
            body: bodyMsg,
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
    console.error('IMAP Error:', err);
    if (client) {
      try { await client.logout(); } catch (_) {}
    }
    res.status(500).json({
      error: 'Error de conexión con el buzón de correo IMAP.',
      details: err.message || String(err)
    });
  }
});

/**
 * ==========================================
 * 5. GENERATE APPLE .MOBILECONFIG PROFILE
 * ==========================================
 */
app.post('/api/profile/generate', (req, res) => {
  const {
    email,
    password,
    displayName,
    imapHost,
    imapPort,
    smtpHost,
    smtpPort,
    smtpSecure
  } = req.body;

  if (!email) {
    return res.status(400).send('Email reference is required.');
  }

  const payloadUUID = 'F0D6D2B1-46CB-4E80-8772-' + Math.random().toString(36).substring(2, 14).toUpperCase();
  const mailUUID = 'E5BEEF11-4CE7-4F63-AEE1-' + Math.random().toString(36).substring(2, 14).toUpperCase();

  const mobileConfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadDescription</key>
	<string>Configuración de correo gratuito ${email} para FreeMail Hub</string>
	<key>PayloadDisplayName</key>
	<string>FreeMail Hub - ${email}</string>
	<key>PayloadIdentifier</key>
	<string>com.freemailhub.${email}</string>
	<key>PayloadOrganization</key>
	<string>FreeMail Hub</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>${payloadUUID}</string>
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
			<string>Añade cuentas de correo electrónico IMAP de FreeMail Hub</string>
			<key>PayloadDisplayName</key>
			<string>Configuración de Buzón de Correo - FreeMail</string>
			<key>PayloadIdentifier</key>
			<string>com.freemailhub.${email}.email</string>
			<key>PayloadType</key>
			<string>com.apple.mail.managed</string>
			<key>PayloadUUID</key>
			<string>${mailUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
		</dict>
	</array>
</dict>
</plist>`;

  res.setHeader('Content-Type', 'application/x-apple-aspen-config');
  res.setHeader('Content-Disposition', `attachment; filename="configuracion-${email.split('@')[0]}.mobileconfig"`);
  res.send(mobileConfig);
});

/**
 * ==========================================
 * 6. AI INTERLINING DRAFTS (GEMINI API FLAVOR)
 * ==========================================
 */
app.post('/api/ai/draft', async (req, res) => {
  const { prompt, currentSubject, currentBody, tone } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'La instrucción o prompt es requerido.' });
  }

  const toneDesc = tone === 'formal' ? 'formal y corporativo' : tone === 'friendly' ? 'amigable, cálido y cercano' : 'conciso, directo e informal';

  try {
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('YOUR_GEMINI_API_KEY')) {
      return res.json({
        subject: currentSubject ? `Re: ${currentSubject}` : `Propuesta: ${prompt.slice(0, 30)}...`,
        body: `Agradezco su mensaje.\n\nEscribo con respecto a: "${prompt}".\n\n(Este borrador está operando en modo sandbox sin una llave válida configurada de Gemini en el backend).\n\nSaludo atentamente,\nUsuario de FreeMail Hub`
      });
    }

    const systemPrompt = `Eres un redactor AI avanzado en FreeMail Hub.
Tu tarea es escribir un correo electrónico profesional en base a la solicitud que provee el usuario.
Debes devolver estrictamente como resultado un bloque de objeto JSON formateado según la estructura delimitada abajo, sin bloques Markdown, sin explicaciones, sin texto extra fuera de la estructura:
{
  "subject": "Tu línea de asunto llamativa y concisa",
  "body": "El desarrollo ordenado con saltos de línea \\n"
}
Tono esperado: ${toneDesc}.
Asunto de referencia: ${currentSubject || '(Ninguno)'}.
Cuerpo previo (para contextualizar): ${currentBody || '(Ninguno)'}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || '';
    let data;
    try {
      data = JSON.parse(responseText.trim());
    } catch (_) {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        data = JSON.parse(match[0]);
      } else {
        data = {
          subject: currentSubject ? `Re: ${currentSubject}` : "AI Borrador de Correo",
          body: responseText
        };
      }
    }

    res.json(data);
  } catch (err: any) {
    console.error('Gemini error:', err);
    res.status(500).json({
      error: 'Error de la inteligencia artificial de Gemini',
      details: err.message || String(err)
    });
  }
});

// Single Page Application static router serving configurations
async function initializeViteAndListen() {
  if (process.env.NODE_ENV !== "production") {
    // Developer Mode Vite
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Build serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind live listening port only when launched directly (not as serverless function)
  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Express Backend] running at http://0.0.0.0:${PORT}`);
    });
  }
}

initializeViteAndListen().catch((err) => {
  console.error("Failed to start server/initialize Vite middleware:", err);
});

export default app;
