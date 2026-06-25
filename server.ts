/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dns from "dns";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import dnsRoutes from "./src/dns-routes";

dotenv.config();

const app = express();
const PORT = 3000;

// Set Cross-Origin headers to allow popups to communicate correctly
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// Helper to generate UUIDs for Apple Profiles
function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch (_e) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }
}

// Helper to read raw text body (for Autodiscover query xml matching)
function getRawBody(req: express.Request): Promise<string> {
  return new Promise((resolve) => {
    if (typeof req.body === 'string') {
      return resolve(req.body);
    }
    if (req.body && Buffer.isBuffer(req.body)) {
      return resolve(req.body.toString('utf8'));
    }
    if (req.body && typeof req.body === 'object') {
      try {
        return resolve(JSON.stringify(req.body));
      } catch (_e) {
        return resolve('');
      }
    }
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', () => {
      resolve('');
    });
  });
}

app.use((req, res, next) => {
  if (req.body) {
    if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString("utf8"));
      } catch (_e) {}
    } else if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body);
      } catch (_e) {}
    }
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      return next();
    }
  }

  express.json({ limit: '15mb' })(req, res, (err) => {
    if (err) {
      console.error("Error parsing JSON body with express.json:", err);
      req.body = {};
    }
    next();
  });
});

// Lazy initializer for Gemini API client to avoid startup crash if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({ apiKey });
    }
  }
  return aiClient;
}

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Secure Encryption Helpers for QR Code tokens
const CRYPTO_SECRET = process.env.GEMINI_API_KEY || "freemail-secret-key-salt-placeholder-9876";
const ENCRYPTION_KEY = crypto.createHash('sha256').update(CRYPTO_SECRET).digest();
const IV_LENGTH = 16;

function encryptConfig(config: any): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(config), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptConfig(token: string): any {
  try {
    const textParts = token.split(':');
    if (textParts.length !== 2) return null;
    const iv = Buffer.from(textParts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(textParts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (_err) {
    console.error("Failed to decrypt QR code token");
    return null;
  }
}

// Helper to generate a .mobileconfig content for given parameters
function buildMobileConfigPayload(params: any): string {
  const { email, password, displayName, imapHost, imapPort, smtpHost, smtpPort, smtpSecure } = params;
  const cleanEmail = String(email || "").trim().toLowerCase();
  const parts = cleanEmail.split("@");
  const alias = parts[0] || "user";
  const domain = parts[1] || "domain.com";

  const finalImapHost = imapHost ? String(imapHost).trim() : `imap.${domain}`;
  const finalImapPort = imapPort ? Number(imapPort) : 993;
  const finalSmtpHost = smtpHost ? String(smtpHost).trim() : `smtp.${domain}`;
  const finalSmtpPort = smtpPort ? Number(smtpPort) : 465;
  const finalSmtpSecure = smtpSecure !== undefined ? Boolean(smtpSecure) : (finalSmtpPort === 465);

  const nameUser = displayName ? String(displayName).trim() : (alias.charAt(0).toUpperCase() + alias.slice(1));

  const mailUuid = generateUUID();
  const profileUuid = generateUUID();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>ConsentText</key>
    <dict>
        <key>default</key>
        <string>Configuración automática de correo para FreeMail Hub</string>
    </dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>EmailAccountDescription</key>
            <string>FreeMail - ${alias}</string>
            <key>EmailAccountName</key>
            <string>${nameUser}</string>
            <key>EmailAccountType</key>
            <string>EmailTypeIMAP</string>
            <key>EmailAddress</key>
            <string>${cleanEmail}</string>
            
            <!-- Incoming Mail (IMAP) -->
            <key>IncomingMailServerAuthentication</key>
            <string>EmailAuthPassword</string>
            <key>IncomingMailServerHostName</key>
            <string>${finalImapHost}</string>
            <key>IncomingMailServerPortNumber</key>
            <integer>${finalImapPort}</integer>
            <key>IncomingMailServerUseSSL</key>
            <${(finalImapPort === 993 || finalImapPort === 465) ? 'true' : 'false'}/>
            <key>IncomingMailServerUsername</key>
            <string>${cleanEmail}</string>
            <key>IncomingPassword</key>
            <string>${password}</string>
            
            <!-- Outgoing Mail (SMTP) -->
            <key>OutgoingMailServerAuthentication</key>
            <string>EmailAuthPassword</string>
            <key>OutgoingMailServerHostName</key>
            <string>${finalSmtpHost}</string>
            <key>OutgoingMailServerPortNumber</key>
            <integer>${finalSmtpPort}</integer>
            <key>OutgoingMailServerUseSSL</key>
            <${finalSmtpSecure ? 'true' : 'false'}/>
            <key>OutgoingMailServerUsername</key>
            <string>${cleanEmail}</string>
            <key>OutgoingPassword</key>
            <string>${password}</string>
            
            <!-- Metadata -->
            <key>PayloadDescription</key>
            <string>Configuración automática para FreeMail Hub</string>
            <key>PayloadDisplayName</key>
            <string>FreeMail - ${alias}</string>
            <key>PayloadIdentifier</key>
            <string>com.freemailhub.mail.${alias}</string>
            <key>PayloadType</key>
            <string>com.apple.mail.managed</string>
            <key>PayloadUUID</key>
            <string>${mailUuid}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>PreventMove</key>
            <false/>
            <key>PreventTrash</key>
            <false/>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>Configuración de correo electrónico para FreeMail Hub.</string>
    <key>PayloadDisplayName</key>
    <string>Configuración Correo FreeMail Hub</string>
    <key>PayloadIdentifier</key>
    <string>com.freemailhub.profile.${alias}</string>
    <key>PayloadOrganization</key>
    <string>FreeMail Hub</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${profileUuid}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;
}

// Función auxiliar para firmar perfiles con OpenSSL
function signProfileWithOpenSSL(plistXml: string, alias: string, res: express.Response): boolean {
  try {
    const tmpDir = os.tmpdir();
    const profileUuid = generateUUID();
    const rawPath = path.join(tmpDir, `raw-${profileUuid}.xml`);
    const signedPath = path.join(tmpDir, `signed-${profileUuid}.mobileconfig`);
    const certPath = path.join(tmpDir, `cert-${profileUuid}.pem`);
    const keyPath = path.join(tmpDir, `key-${profileUuid}.pem`);

    fs.writeFileSync(rawPath, plistXml, "utf8");

    // Generate random ca key and self certificate
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=FreeMail Hub Signed profile/O=FreeMail Hub/C=ES"`,
      { stdio: "ignore" }
    );

    // Sign the file using generated cert
    execSync(
      `openssl smime -sign -signer "${certPath}" -inkey "${keyPath}" -nodetach -outform der -in "${rawPath}" -out "${signedPath}"`,
      { stdio: "ignore" }
    );

    if (fs.existsSync(signedPath)) {
      const signedContent = fs.readFileSync(signedPath);
      // Limpiar archivos temporales
      try {
        fs.unlinkSync(rawPath);
        fs.unlinkSync(signedPath);
        fs.unlinkSync(certPath);
        fs.unlinkSync(keyPath);
      } catch (_cleanErr) {
        // Ignorar errores de limpieza
      }
      res.send(signedContent);
      return true;
    }
  } catch (_err) {
    console.warn("Autosigning failed, using raw cleartext instead");
  }
  return false;
}

// 1b. Apple .mobileconfig Profile Gen Route Handler
const handleProfileGenerate = (req: express.Request, res: express.Response) => {
  const authHeader = req.headers.authorization;
  let authenticated = false;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        const now = Math.floor(Date.now() / 1000);
        const isExpValid = (payload.exp > now);
        if (isExpValid) {
          authenticated = true;
        } else {
          console.warn("Firebase token expired. Exp:", payload.exp, "Now:", now);
        }
      }
    } catch (_err) {
      console.error("Error decoding Firebase ID Token");
    }
  }

  if (!authenticated) {
    return res.status(401).json({ error: "No autorizado: Debes iniciar sesión con Firebase en FreeMail Hub para descargar perfiles." });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son obligatorios" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const alias = cleanEmail.split("@")[0] || "usuario";

  const plistXml = buildMobileConfigPayload(req.body || {});

  res.setHeader("Content-Type", "application/x-apple-aspen-config; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="configuracion-${alias}.mobileconfig"`);

  // Intentar firmar con OpenSSL
  if (signProfileWithOpenSSL(plistXml, alias, res)) {
    return;
  }

  // Fallback: enviar sin firmar
  res.send(plistXml);
};

app.post("/api/profile/generate", handleProfileGenerate);
app.post("/api/generate-mobileconfig", handleProfileGenerate);

// Multi-device endpoint returning a simple base64 encoded string
app.post("/api/profile/base64", (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const plistXml = buildMobileConfigPayload(req.body || {});
    const base64 = Buffer.from(plistXml, "utf8").toString("base64");
    res.json({ base64 });
  } catch (err: any) {
    console.error("Failed to generate base64 profile:", err);
    res.status(500).json({ error: "No se pudo generar el formato base64 del perfil", details: err.message });
  }
});

// --- QR CODE ENDPOINTS ---

app.post("/api/profile/qr-token", (req, res) => {
  try {
    const { email, password, displayName, imapHost, imapPort, smtpHost, smtpPort, smtpSecure } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const token = encryptConfig({
      email,
      password,
      displayName,
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
      smtpSecure
    });
    res.json({ token });
  } catch (err: any) {
    console.error("Failed to generate QR token:", err);
    res.status(500).json({ error: "No se pudo generar el token QR", details: err.message });
  }
});

// Direct download via QR token
app.get("/api/profile/download-qr", (req, res) => {
  const token = req.query.token;
  if (!token || typeof token !== "string") {
    return res.status(400).send("<h1>Error de QR</h1><p>Enlace de descarga inválido o corrupto.</p>");
  }

  const params = decryptConfig(token);
  if (!params || !params.email || !params.password) {
    return res.status(400).send("<h1>Error de QR</h1><p>El código QR ha expirado o es incorrecto.</p>");
  }

  const cleanEmail = params.email.trim().toLowerCase();
  const alias = cleanEmail.split("@")[0] || "usuario";

  const plistXml = buildMobileConfigPayload(params);

  res.setHeader("Content-Type", "application/x-apple-aspen-config; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="configuracion-${alias}.mobileconfig"`);

  // Intentar firmar con OpenSSL
  if (signProfileWithOpenSSL(plistXml, alias, res)) {
    return;
  }

  // Fallback: enviar sin firmar
  res.send(plistXml);
});

// 1c. Android Autodiscover XML route
const handleAutodiscover = async (req: express.Request, res: express.Response) => {
  let email = "usuario@midominio.com";
  let displayName = "Usuario FreeMail";

  try {
    if (req.method === "POST") {
      const bodyText = await getRawBody(req);
      if (bodyText) {
        const match = bodyText.match(/<EMailAddress>(.*?)<\/EMailAddress>/i);
        if (match && match[1]) {
          email = match[1].trim();
        }
      }
    } else if (req.query.email) {
      email = String(req.query.email).trim();
    }

    if (req.query.name) {
      displayName = String(req.query.name).trim();
    } else {
      const localPart = email.split("@")[0];
      displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    }

    const domain = email.split("@")[1] || "midominio.com";
    const imapHost = `imap.${domain}`;
    const smtpHost = `smtp.${domain}`;

    const autodiscoverXml = `<?xml version="1.0" encoding="UTF-8"?>
<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/responseschema/2006">
  <Response>
    <User>
      <DisplayName>${displayName}</DisplayName>
      <EmailAddress>${email}</EmailAddress>
    </User>
    <Action>
      <Settings>
        <Server>
          <Type>IMAP</Type>
          <Server>${imapHost}</Server>
          <Port>993</Port>
          <SSL>on</SSL>
          <AuthRequired>on</AuthRequired>
          <Authentication>password</Authentication>
        </Server>
        <Server>
          <Type>SMTP</Type>
          <Server>${smtpHost}</Server>
          <Port>587</Port>
          <SSL>off</SSL>
          <STARTTLS>on</STARTTLS>
          <AuthRequired>on</AuthRequired>
          <Authentication>password</Authentication>
        </Server>
      </Settings>
    </Action>
  </Response>
</Autodiscover>`;

    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.end(autodiscoverXml);
  } catch (err: any) {
    res.status(500).setHeader("Content-Type", "text/xml").send(`<Error>${err.message}</Error>`);
  }
};

app.all("/autodiscover/autodiscover.xml", handleAutodiscover);
app.all("/Autodiscover/Autodiscover.xml", handleAutodiscover);

// 2. DNS Lookup Helpers with DoH Fail-Safe Fallbacks
async function resolveDnsViaDoH(name: string, type: string): Promise<string[]> {
  const providers = [
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
          headers: { "Accept": "application/dns-json" },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Cloudflare DoH error: ${res.status}`);
        const json = (await res.json()) as any;
        if (json.Answer && Array.isArray(json.Answer)) {
          return json.Answer.map((ans: any) => {
            let data = ans.data || "";
            data = data.replace(/^"|"$/g, "").trim();
            if (data.endsWith(".") && data.length > 1) {
              data = data.slice(0, -1);
            }
            return data;
          });
        }
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
      return [];
    },
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Google DoH error: ${res.status}`);
        const json = (await res.json()) as any;
        if (json.Answer && Array.isArray(json.Answer)) {
          return json.Answer.map((ans: any) => {
            let data = ans.data || "";
            data = data.replace(/^"|"$/g, "").trim();
            if (data.endsWith(".") && data.length > 1) {
              data = data.slice(0, -1);
            }
            return data;
          });
        }
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
      return [];
    }
  ];

  for (const provider of providers) {
    try {
      return await provider();
    } catch (e: any) {
      console.warn(`DoH Provider failed for ${name} (${type}):`, e.message || e);
    }
  }
  return [];
}

async function resolveMxSecurely(domain: string): Promise<{ priority: number, exchange: string }[]> {
  try {
    const native = await dns.promises.resolveMx(domain);
    if (native && native.length > 0) return native;
  } catch (_e) {}

  const rawList = await resolveDnsViaDoH(domain, "MX");
  return rawList.map(str => {
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      const priority = parseInt(parts[0], 10);
      const exchange = parts.slice(1).join(" ");
      return { priority: isNaN(priority) ? 10 : priority, exchange };
    } else {
      return { priority: 10, exchange: str };
    }
  });
}

async function resolveTxtSecurely(domain: string): Promise<string[][]> {
  try {
    const native = await dns.promises.resolveTxt(domain);
    if (native && native.length > 0) return native;
  } catch (_e) {}

  const rawList = await resolveDnsViaDoH(domain, "TXT");
  return rawList.map(str => [str]);
}

async function resolve4Securely(domain: string): Promise<string[]> {
  try {
    const native = await dns.promises.resolve4(domain);
    if (native && native.length > 0) return native;
  } catch (_e) {}

  return await resolveDnsViaDoH(domain, "A");
}

async function resolveCnameSecurely(domain: string): Promise<string[]> {
  try {
    const native = await dns.promises.resolveCname(domain);
    if (native && native.length > 0) return native;
  } catch (_e) {}

  return await resolveDnsViaDoH(domain, "CNAME");
}

// 2. DNS Verification Route (Delegated to /backend/routes/dns.js)
app.use("/api/dns", dnsRoutes);

// 2c. Custom direct DNS verify-dns endpoint
app.post("/api/dns/verify-dns", async (req, res) => {
  const domainParam = req.body?.domain || req.body?.domainName;

  if (!domainParam) {
    return res.status(400).json({ 
      success: false, 
      error: "El dominio es requerido" 
    });
  }

  const domain = domainParam.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");

  try {
    const checkMX = async (dom: string) => {
      try {
        const records = await resolveMxSecurely(dom);
        const configured = records.some(r => r && r.exchange && typeof r.exchange === "string" && (
          r.exchange.toLowerCase().includes("improvmx.com") || 
          r.exchange.toLowerCase().includes("resend.com") ||
          r.exchange.toLowerCase().includes("hostinger.com") || 
          r.exchange.toLowerCase().includes("hostinger.es") || 
          r.exchange.toLowerCase().includes("hostinger.mx")
        ));
        return {
          status: configured ? "configured" : "pending",
          records,
          expected: [
            { priority: 10, exchange: "mx1.improvmx.com" },
            { priority: 20, exchange: "mx2.improvmx.com" }
          ],
          host: "@",
          destination: "10 mx1.improvmx.com y 20 mx2.improvmx.com"
        };
      } catch {
        return { 
          status: "pending", 
          message: "No se encontraron registros MX" 
        };
      }
    };

    const checkSPF = async (dom: string) => {
      try {
        const txtRecords = await resolveTxtSecurely(dom);
        const spfText = txtRecords.flat().find(record => record && typeof record === "string" && record.startsWith("v=spf1"));
        const configured = spfText && (
          spfText.includes("include:spf.improvmx.com") || 
          spfText.includes("include:spf.resend.com") || 
          spfText.includes("include:spf.hostinger.com")
        );
        return {
          status: configured ? "configured" : "pending",
          record: spfText ? spfText : null,
          expected: "v=spf1 include:spf.improvmx.com ~all",
          host: "@",
          destination: "v=spf1 include:spf.improvmx.com ~all"
        };
      } catch {
        return { 
          status: "pending", 
          message: "No se encontraron registros SPF" 
        };
      }
    };

    const checkDKIM = async (dom: string) => {
      try {
        const dkimDomain = `default._domainkey.${dom}`;
        const txtRecords = await resolveTxtSecurely(dkimDomain);
        const dkimText = txtRecords.flat().find(record => record && typeof record === "string" && record.startsWith("v=DKIM1"));
        const configured = dkimText && dkimText.includes("k=rsa");
        return {
          status: configured ? "configured" : "pending",
          records: txtRecords,
          expected: "v=DKIM1; k=rsa; p=MIIBIjAN...",
          host: "default._domainkey",
          destination: "v=DKIM1; k=rsa; p=TU_CLAVE_PUBLICA"
        };
      } catch {
        return { 
          status: "pending", 
          message: "No se encontraron registros DKIM" 
        };
      }
    };

    const checkDMARC = async (dom: string) => {
      try {
        const dmarcDomain = `_dmarc.${dom}`;
        const txtRecords = await resolveTxtSecurely(dmarcDomain);
        const dmarcText = txtRecords.flat().find(record => record && typeof record === "string" && record.startsWith("v=DMARC1"));
        const configured = dmarcText && (dmarcText.includes("p=none") || dmarcText.includes("p=quarantine") || dmarcText.includes("p=reject"));
        const expectedStr = `v=DMARC1; p=none; rua=mailto:dmarc@${dom}`;
        return {
          status: configured ? "configured" : "pending",
          records: txtRecords,
          expected: expectedStr,
          host: "_dmarc",
          destination: expectedStr
        };
      } catch {
        return { 
          status: "pending", 
          message: "No se encontraron registros DMARC" 
        };
      }
    };

    const results = {
      mx: await checkMX(domain),
      spf: await checkSPF(domain),
      dkim: await checkDKIM(domain),
      dmarc: await checkDMARC(domain)
    };

    const allDetected = results.mx.status === "configured" &&
                        results.spf.status === "configured" &&
                        results.dkim.status === "configured" &&
                        results.dmarc.status === "configured";

    res.json({
      success: true,
      domain,
      results,
      allDetected,
      message: allDetected ? "Todos los registros están correctamente configurados" : "Algunos registros aún no se detectan"
    });

  } catch (error: any) {
    console.error("Error verificando DNS:", error);
    res.status(500).json({
      success: false,
      error: "Error al verificar los registros DNS",
      details: error.message
    });
  }
});

// 2b. Custom DNS Verification Route
app.post("/api/dns/verify-custom", async (req, res) => {
  const { domainName, type, host, value } = req.body || {};
  if (!domainName || !type || !value) {
    return res.status(400).json({ error: "Faltan parámetros obligatorios" });
  }

  const cleanDomain = domainName.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
  const cleanHost = (host || "").trim();
  const queryHost = !cleanHost || cleanHost === "@" ? cleanDomain : `${cleanHost}.${cleanDomain}`;
  const recordType = type.toUpperCase();
  const expectedValue = value.trim();

  let status: "verified" | "failed" = "failed";
  let currentValue = "";

  try {
    if (recordType === "A") {
      const ips = await resolve4Securely(queryHost);
      currentValue = ips.join(", ");
      if (ips.some(ip => ip === expectedValue)) {
        status = "verified";
      }
    } else if (recordType === "CNAME") {
      const targets = await resolveCnameSecurely(queryHost);
      currentValue = targets.join(", ");
      if (targets.some(t => t.toLowerCase() === expectedValue.toLowerCase() || t.toLowerCase() === `${expectedValue.toLowerCase()}.`)) {
        status = "verified";
      }
    } else if (recordType === "TXT") {
      const txtRecords = await resolveTxtSecurely(queryHost);
      const flattened = txtRecords.flat();
      currentValue = flattened.join(", ");
      if (flattened.some(txt => txt.includes(expectedValue) || expectedValue.includes(txt))) {
        status = "verified";
      }
    } else {
      return res.status(400).json({ error: "Tipo de registro no soportado" });
    }
  } catch (err: any) {
    currentValue = `Error: ${err.message}`;
  }

  return res.json({ status, currentValue });
});

// 2b. Real SMTP send route
app.post("/api/mail/send", async (req, res) => {
  let host = process.env.SMTP_HOST || "smtp.resend.com";
  let port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  try {
    const { senderEmail, senderPassword, to, subject, body, attachments, smtpHost, smtpPort, smtpSecure } = req.body || {};
    if (!senderEmail || !to) {
      return res.status(400).json({ success: false, error: "Campos SMTP obligatorios incompletos (Emisor o receptor faltante)" });
    }
    if (!senderPassword && !process.env.SMTP_PASS) {
      return res.status(400).json({ success: false, error: "Contraseña SMTP requerida" });
    }

    host = process.env.SMTP_HOST || smtpHost || "smtp.resend.com";
    port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : (smtpPort ? Number(smtpPort) : 587);
    const secure = smtpSecure !== undefined ? Boolean(smtpSecure) : (port === 465);
    const finalUser = process.env.SMTP_USER || senderEmail;
    const finalPass = process.env.SMTP_PASS || senderPassword;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: finalUser,
        pass: finalPass,
      },
      connectionTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions: any = {
      from: `"${(senderEmail || "").split('@')[0]}" <${senderEmail}>`,
      to,
      subject: subject || "(Sin Asunto)",
      text: body || "",
      html: (body || "").replace(/\n/g, "<br/>"),
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((att: any) => {
        if (att && att.content && typeof att.content === "string") {
          const base64PrefixMatch = att.content.match(/^data:(.*?);base64,/);
          if (base64PrefixMatch) {
            const contentWithoutPrefix = att.content.replace(/^data:(.*?);base64,/, "");
            return {
              filename: att.name || "archivo",
              content: Buffer.from(contentWithoutPrefix, "base64"),
            };
          }
        }
        return {
          filename: (att && att.name) || "archivo",
          content: (att && att.content) || "",
        };
      });
    }

    const info = await transporter.sendMail(mailOptions);
    return res.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    console.error("Nodemailer SMTP sending error:", err);
    const smtpErrorMessage = err.response || err.message || "Error desconocido devuelto por el servidor SMTP";
    return res.status(500).json({ 
      success: false, 
      error: `Error de autenticación o de envío en servidor SMTP (${host}:${port}).`, 
      details: smtpErrorMessage 
    });
  }
});

// 2c. Real IMAP sync route
app.post("/api/mail/sync", async (req, res) => {
  try {
    const { email, password, imapHost, imapPort } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Parámetros IMAP obligatorios incompletos" });
    }

    const host = imapHost || "imap.hostinger.com";
    const port = imapPort ? Number(imapPort) : 993;

    const client = new ImapFlow({
      host,
      port,
      secure: true,
      auth: {
        user: email,
        pass: password,
      },
      logger: false,
      connectionTimeout: 15000,
    });

    const parsedEmails: any[] = [];
    await client.connect();

    let lock = await client.getMailboxLock("INBOX");
    try {
      let status = await client.status("INBOX", { messages: true });
      const totalMessagesCount = status.messages || 0;
      
      if (totalMessagesCount > 0) {
        const startRange = Math.max(1, totalMessagesCount - 14);
        const range = `${startRange}:${totalMessagesCount}`;
        
        for await (let msg of client.fetch(range, { envelope: true, source: true })) {
          let bodyText = "";
          if (msg.source) {
            const rawEmailString = msg.source.toString("utf8");
            const bodyMatch = rawEmailString.split("\r\n\r\n");
            if (bodyMatch.length > 1) {
              bodyText = bodyMatch.slice(1).join("\n");
              if (bodyText.includes("Content-Type:")) {
                const parts = bodyText.split(/--\w+/);
                const textPart = parts.find(p => p.includes("Content-Type: text/plain"));
                if (textPart) {
                  const cleanedText = textPart.split("\n")
                    .filter(line => !line.includes("Content-") && !line.includes("Content-Transfer-Encoding"))
                    .join("\n")
                    .trim();
                  bodyText = cleanedText;
                } else {
                  bodyText = bodyText.substring(0, 1500);
                }
              }
            } else {
              bodyText = rawEmailString.substring(0, 500);
            }
          }

          bodyText = bodyText
            .replace(/Content-Type:[\s\S]*$/i, "")
            .replace(/------=_Part[\s\S]*$/i, "")
            .trim();

          parsedEmails.push({
            fromName: msg.envelope.from && msg.envelope.from[0]?.name ? msg.envelope.from[0].name : (msg.envelope.from && msg.envelope.from[0]?.address ? msg.envelope.from[0].address.split("@")[0] : 'Desconocido'),
            fromAddress: msg.envelope.from && msg.envelope.from[0]?.address ? msg.envelope.from[0].address : 'unknown@domain.com',
            subject: msg.envelope.subject || "(Sin Asunto)",
            body: bodyText || "Buzón de entrada vacío o formato de correo multipart no estructurado",
            createdAt: msg.envelope.date ? msg.envelope.date.toISOString() : new Date().toISOString(),
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    parsedEmails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, messages: parsedEmails });
  } catch (err: any) {
    console.error("imapflow connection error:", err);
    res.status(500).json({ error: "Fallo de autenticación o conexión con imap.hostinger.com (puerto 993). Verifique sus credenciales.", details: err.message });
  }
});

// 3. AI Helper: Autowrite / Improve email draft using Gemini
app.post("/api/ai/draft", async (req, res) => {
  try {
    const { prompt, currentSubject, currentBody, tone } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      const simulatedSubjects: Record<string, string> = {
        professional: "Propuesta de colaboración comercial",
        formal: "Solicitud de información oficial",
        casual: "¡Hola! Quería ponerme en contacto",
        marketing: "Oferta exclusiva de FreeMail Hub"
      };
      
      const selectedTone = tone || "professional";
      const simulatedSubject = currentSubject || simulatedSubjects[selectedTone] || "Planificación y Detalles";
      const simulatedBody = `[Simulado - Configures su clave GEMINI_API_KEY para respuestas reales de IA]\n\nEstimado contacto,\n\nEscribo con respecto a su solicitud: "${prompt}".\n\nHemos preparado la información correspondiente de manera ${selectedTone}. Quedamos atentos a cualquier duda o aclaración.\n\nAtentamente,\nEl equipo de FreeMail Hub (Drafting Engine)`;
      
      return res.json({
        subject: simulatedSubject,
        body: simulatedBody,
        simulated: true,
        hint: "Para utilizar el servicio de IA de Gemini real, configure su clave GEMINI_API_KEY."
      });
    }

    try {
      const fullPrompt = `Genera un asunto y un cuerpo de correo electrónico profesional y claro basado en la siguiente instrucción del usuario:
      
      Instrucción: "${prompt}"
      Tono deseado: ${tone || 'profesional'}
      Asunto actual: "${currentSubject || '(Vacío)'}"
      Cuerpo actual: "${currentBody || '(Vacío)'}"
      
      Por favor devuelve EXACTAMENTE una respuesta con formato JSON con el formato:
      {
        "subject": "El asunto recomendado",
        "body": "El cuerpo del correo electrónico completo, formateado con saltos de línea elegantes y sin código markdown excesivo"
      }
      No agregues introducciones, bloques de código markdown triple barra, ni notas adicionales. Devuelve solo el objeto JSON válido.`;

      const modelName = 'gemini-2.5-flash';
      const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt
      });

      const text = response.text || "";
      const cleanJson = text.trim()
        .replace(/^```json/, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();

      try {
        const parsed = JSON.parse(cleanJson);
        res.json({
          subject: parsed.subject || currentSubject || "Asunto sugerido por IA",
          body: parsed.body || text,
          simulated: false
        });
      } catch (_parseErr) {
        res.json({
          subject: currentSubject || "Respuesta de IA",
          body: text,
          simulated: false
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Error contacting Gemini API", details: err.message });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Error en el endpoint", details: err.message });
  }
});

// Configure Vite integration or static file rendering
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (_err) {
      console.warn("Vite no disponible en modo producción");
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("Carpeta dist no encontrada");
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FreeMail Hub Server] Running on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;

// Solo iniciar el servidor si no está en Vercel
if (!process.env.VERCEL) {
  startServer().catch(console.error);
}
