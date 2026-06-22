// src/dns-routes.ts
import express, { Request, Response, Router, NextFunction } from "express";
import dns from "dns";
import { GoogleGenAI } from "@google/genai";

const router: Router = express.Router();

// ==========================================
// CONFIGURAÇÕES GLOBAIS
// ==========================================
const DNS_TIMEOUT = 5000; // 5 segundos
const DNS_RETRIES = 2;
const EXPECTED_MX = "10 mx1.hostinger.com y 10 mx2.hostinger.com";
const EXPECTED_SPF = "v=spf1 include:spf.hostinger.com ~all";

// ==========================================
// CLIENTE GEMINI (LAZY INIT)
// ==========================================
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("[DNS] Inicializando Gemini. API Key presente:", !!apiKey);
    
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: { 'User-Agent': 'freemailhub-dns' }
          }
        });
        console.log("[DNS] Gemini inicializado com sucesso!");
      } catch (err: any) {
        console.error("[DNS] Erro ao inicializar Gemini:", err.message);
        aiClient = null;
      }
    }
  }
  return aiClient;
}

// ==========================================
// FUNÇÕES DNS COM FALLBACK ROBUSTO
// ==========================================

/**
 * Consulta DNS via HTTPS (DoH) com múltiplos provedores
 */
async function queryDnsViaDoH(domain: string, type: string): Promise<string[]> {
  console.log(`[DNS-DoH] Buscando ${type} para: ${domain}`);
  
  const providers = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`
  ];

  const allResults: string[] = [];

  for (const url of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DNS_TIMEOUT);

      const response = await fetch(url, {
        headers: { 
          "accept": "application/dns-json",
          "User-Agent": "FreeMailHub-DNS/1.0"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[DNS-DoH] ${url} retornou status ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data?.Answer?.length > 0) {
        const results = data.Answer.map((ans: any) => {
          let val = ans.data || "";
          // Limpa aspas de registros TXT
          if (type.toUpperCase() === "TXT") {
            while (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1);
            }
          }
          return val;
        });
        
        console.log(`[DNS-DoH] ${url}: ${results.length} resultados`);
        allResults.push(...results);
      }
    } catch (err: any) {
      console.warn(`[DNS-DoH] Falha em ${url}:`, err.message);
    }
  }

  // Remove duplicatas
  const unique = [...new Set(allResults)];
  console.log(`[DNS-DoH] Total: ${unique.length} resultados únicos`);
  return unique;
}

/**
 * Resolve MX com fallback (NUNCA LANÇA ERRO)
 */
async function resolveMxSecure(domain: string): Promise<{ priority: number; exchange: string }[]> {
  // Tenta DNS nativo primeiro
  try {
    console.log(`[DNS-MX] Nativo para: ${domain}`);
    const records = await new Promise<dns.MxRecord[]>((resolve, reject) => {
      dns.resolveMx(domain, (err, result) => {
        if (err) reject(err);
        else resolve(result || []);
      });
    });

    if (records?.length > 0) {
      console.log(`[DNS-MX] Nativo: ${records.length} registros`);
      return records;
    }
    throw new Error('Sem registros MX');
    
  } catch (err: any) {
    console.warn(`[DNS-MX] Nativo falhou, usando DoH:`, err.message);
    
    try {
      const dohResults = await queryDnsViaDoH(domain, "MX");
      
      if (dohResults.length > 0) {
        const parsed = dohResults.map(result => {
          const parts = result.trim().split(/\s+/);
          if (parts.length >= 2) {
            return {
              priority: parseInt(parts[0], 10) || 10,
              exchange: parts[1].replace(/\.$/, "").toLowerCase()
            };
          }
          return {
            priority: 10,
            exchange: result.replace(/\.$/, "").toLowerCase()
          };
        });
        console.log(`[DNS-MX] DoH: ${parsed.length} registros`);
        return parsed;
      }
      
      console.warn(`[DNS-MX] DoH sem resultados`);
      return [];
      
    } catch (dohErr: any) {
      console.error(`[DNS-MX] DoH falhou:`, dohErr.message);
      return [];
    }
  }
}

/**
 * Resolve TXT com fallback (NUNCA LANÇA ERRO)
 */
async function resolveTxtSecure(domain: string): Promise<string[][]> {
  // Tenta DNS nativo primeiro
  try {
    console.log(`[DNS-TXT] Nativo para: ${domain}`);
    const records = await new Promise<string[][]>((resolve, reject) => {
      dns.resolveTxt(domain, (err, result) => {
        if (err) reject(err);
        else resolve(result || []);
      });
    });

    if (records?.length > 0) {
      console.log(`[DNS-TXT] Nativo: ${records.length} registros`);
      return records;
    }
    throw new Error('Sem registros TXT');
    
  } catch (err: any) {
    console.warn(`[DNS-TXT] Nativo falhou, usando DoH:`, err.message);
    
    try {
      const dohResults = await queryDnsViaDoH(domain, "TXT");
      
      if (dohResults.length > 0) {
        const parsed = dohResults.map(result => [result]);
        console.log(`[DNS-TXT] DoH: ${parsed.length} registros`);
        return parsed;
      }
      
      console.warn(`[DNS-TXT] DoH sem resultados`);
      return [];
      
    } catch (dohErr: any) {
      console.error(`[DNS-TXT] DoH falhou:`, dohErr.message);
      return [];
    }
  }
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Verifica se um domínio é válido
 */
function isValidDomain(domain: string): boolean {
  const regex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return regex.test(domain);
}

/**
 * Limpa e normaliza um domínio
 */
function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\/.*$/, '');
}

// ==========================================
// ROTAS DA API
// ==========================================

/**
 * POST /api/dns/verify
 * Verifica todos os registros DNS (MX, SPF, DKIM, DMARC)
 */
router.post("/verify", async (req: Request, res: Response): Promise<any> => {
  console.log("[DNS] POST /verify - Body:", JSON.stringify(req.body));
  
  try {
    const domainRaw = req.body?.domain || req.body?.domainName;
    
    if (!domainRaw || typeof domainRaw !== "string" || !domainRaw.trim()) {
      return res.status(400).json({
        success: false,
        error: "Domínio é obrigatório",
        domainName: "",
        allConfigured: false,
        allDetected: false
      });
    }

    const domain = normalizeDomain(domainRaw);
    
    if (!isValidDomain(domain)) {
      return res.status(400).json({
        success: false,
        error: "Domínio inválido. Verifique o formato (ex: exemplo.com)",
        domainName: domain,
        allConfigured: false,
        allDetected: false
      });
    }

    console.log(`[DNS] Verificando: ${domain}`);

    // ==========================================
    // 1. VERIFICAÇÃO MX
    // ==========================================
    let mxStatus = "failed";
    let mxCurrentValue = "";
    
    try {
      const mxRecords = await resolveMxSecure(domain);
      
      if (mxRecords && mxRecords.length > 0) {
        mxCurrentValue = mxRecords.map(r => `${r.priority} ${r.exchange}`).join(", ");
        
        const isHostinger = mxRecords.some(r => 
          r.exchange?.toLowerCase().includes("hostinger") ||
          r.exchange?.toLowerCase().includes("freemailhub")
        );
        
        mxStatus = isHostinger ? "verified" : "failed";
      } else {
        mxCurrentValue = "Nenhum registro MX encontrado";
      }
    } catch (err: any) {
      mxCurrentValue = `Erro: ${err.message || "Falha na consulta"}`;
    }

    // ==========================================
    // 2. VERIFICAÇÃO SPF
    // ==========================================
    let spfStatus = "failed";
    let spfCurrentValue = "";
    
    try {
      const txtRecords = await resolveTxtSecure(domain);
      
      if (txtRecords && txtRecords.length > 0) {
        const allTxt = txtRecords.flat();
        const spf = allTxt.find(t => typeof t === "string" && t.startsWith("v=spf1"));
        
        if (spf) {
          spfCurrentValue = spf;
          const isHostinger = spf.includes("hostinger") || spf.includes("freemailhub");
          spfStatus = isHostinger ? "verified" : "failed";
        } else {
          spfCurrentValue = "Registros TXT encontrados, mas sem SPF";
        }
      } else {
        spfCurrentValue = "Nenhum registro TXT encontrado";
      }
    } catch (err: any) {
      spfCurrentValue = `Erro: ${err.message || "Falha na consulta"}`;
    }

    // ==========================================
    // 3. VERIFICAÇÃO DKIM
    // ==========================================
    let dkimStatus = "failed";
    let dkimCurrentValue = "";
    
    try {
      const dkimDomain = `default._domainkey.${domain}`;
      const txtRecords = await resolveTxtSecure(dkimDomain);
      
      if (txtRecords && txtRecords.length > 0) {
        const allTxt = txtRecords.flat();
        const dkim = allTxt.find(t => 
          typeof t === "string" && 
          (t.startsWith("v=DKIM1") || t.includes("k=rsa"))
        );
        
        if (dkim) {
          dkimCurrentValue = dkim;
          dkimStatus = "verified";
        } else {
          dkimCurrentValue = "Registros encontrados, mas sem DKIM válido";
        }
      } else {
        dkimCurrentValue = "Nenhum registro DKIM encontrado";
      }
    } catch (err: any) {
      dkimCurrentValue = `Erro: ${err.message || "Falha na consulta"}`;
    }

    // ==========================================
    // 4. VERIFICAÇÃO DMARC
    // ==========================================
    let dmarcStatus = "failed";
    let dmarcCurrentValue = "";
    
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const txtRecords = await resolveTxtSecure(dmarcDomain);
      
      if (txtRecords && txtRecords.length > 0) {
        const allTxt = txtRecords.flat();
        const dmarc = allTxt.find(t => 
          typeof t === "string" && 
          (t.startsWith("v=DMARC1") || t.includes("p="))
        );
        
        if (dmarc) {
          dmarcCurrentValue = dmarc;
          dmarcStatus = "verified";
        } else {
          dmarcCurrentValue = "Registros encontrados, mas sem DMARC válido";
        }
      } else {
        dmarcCurrentValue = "Nenhum registro DMARC encontrado";
      }
    } catch (err: any) {
      dmarcCurrentValue = `Erro: ${err.message || "Falha na consulta"}`;
    }

    // ==========================================
    // RESULTADO FINAL
    // ==========================================
    const allVerified = mxStatus === "verified" && spfStatus === "verified";

    const response = {
      success: true,
      domain,
      domainName: domain,
      allConfigured: allVerified,
      allDetected: allVerified,
      timestamp: new Date().toISOString(),
      mx: {
        status: mxStatus,
        currentValue: mxCurrentValue,
        expected: EXPECTED_MX,
        host: "@",
        destination: "mx1.hostinger.com"
      },
      spf: {
        status: spfStatus,
        currentValue: spfCurrentValue,
        expected: EXPECTED_SPF,
        host: "@",
        destination: EXPECTED_SPF
      },
      dkim: {
        status: dkimStatus,
        currentValue: dkimCurrentValue,
        expected: "v=DKIM1; k=rsa; p=... (Selector: default)",
        host: "default._domainkey",
        destination: "Firma DKIM no Hostinger"
      },
      dmarc: {
        status: dmarcStatus,
        currentValue: dmarcCurrentValue,
        expected: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
        host: "_dmarc",
        destination: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`
      },
      results: {
        mx: mxStatus,
        spf: spfStatus,
        dkim: dkimStatus,
        dmarc: dmarcStatus
      }
    };

    console.log(`[DNS] Verificação concluída para ${domain}`);
    return res.json(response);

  } catch (error: any) {
    console.error("[DNS] Erro crítico:", error);
    
    return res.status(500).json({
      success: false,
      error: "Erro interno ao verificar DNS",
      details: error.message || String(error),
      domainName: req.body?.domainName || req.body?.domain || "",
      allConfigured: false,
      allDetected: false
    });
  }
});

/**
 * POST /api/dns/ai-explain
 * Diagnóstico com IA ou fallback local
 */
router.post("/ai-explain", async (req: Request, res: Response): Promise<any> => {
  console.log("[DNS] POST /ai-explain - Body:", JSON.stringify(req.body));
  
  const { domainName, provider, records } = req.body;
  
  if (!domainName || typeof domainName !== "string" || !domainName.trim()) {
    return res.status(400).json({
      success: false,
      error: "Domínio é obrigatório",
      analysis: null
    });
  }

  const domain = normalizeDomain(domainName);

  // ==========================================
  // FALLBACK LOCAL (SEMPRE FUNCIONA)
  // ==========================================
  const generateFallback = () => {
    console.log(`[DNS] Gerando fallback para: ${domain}`);
    
    const mx = records?.mx || { verified: false, current: "Não detectado" };
    const spf = records?.spf || { verified: false, current: "Não detectado" };
    const dkim = records?.dkim || { verified: false, current: "Não detectado" };
    const dmarc = records?.dmarc || { verified: false, current: "Não detectado" };

    let score = 10;
    if (mx.verified) score += 25;
    if (spf.verified) score += 25;
    if (dkim.verified) score += 20;
    if (dmarc.verified) score += 20;

    const isOk = score >= 80;

    return {
      domainName: domain,
      overallScore: score,
      isOk,
      statusSummary: isOk 
        ? "✅ Domínio configurado corretamente! Todos os registros DNS estão no lugar."
        : "⚠️ Configuração incompleta. Verifique os registros abaixo.",
      diagnostics: [
        {
          recordType: "MX",
          status: mx.verified ? "OK" : "ERROR",
          currentValue: mx.current || "Não detectado",
          expectedValue: EXPECTED_MX,
          criticality: "ALTA",
          analysis: mx.verified 
            ? "MX configurado corretamente para recebimento de emails."
            : "MX não encontrado. Seus emails não serão entregues.",
          actionSteps: mx.verified 
            ? ["✅ Nenhuma ação necessária."]
            : [
                "Acesse o painel DNS do seu provedor",
                "Adicione MX: @ → mx1.hostinger.com (prioridade 10)",
                "Adicione MX: @ → mx2.hostinger.com (prioridade 10)"
              ]
        },
        {
          recordType: "SPF",
          status: spf.verified ? "OK" : "ERROR",
          currentValue: spf.current || "Não detectado",
          expectedValue: EXPECTED_SPF,
          criticality: "MÉDIA",
          analysis: spf.verified
            ? "SPF configurado. Seus emails serão autenticados."
            : "SPF ausente. Emails podem ser marcados como spam.",
          actionSteps: spf.verified
            ? ["✅ Nenhuma ação necessária."]
            : [
                "Crie um registro TXT: @",
                `Valor: ${EXPECTED_SPF}`
              ]
        },
        {
          recordType: "DKIM",
          status: dkim.verified ? "OK" : "ERROR",
          currentValue: dkim.current || "Não detectado",
          expectedValue: "v=DKIM1; k=rsa; p=...",
          criticality: "MÉDIA",
          analysis: dkim.verified
            ? "DKIM ativo. Emails assinados digitalmente."
            : "DKIM ausente. Reduz a confiabilidade dos emails.",
          actionSteps: dkim.verified
            ? ["✅ Nenhuma ação necessária."]
            : [
                "Crie um registro TXT: default._domainkey",
                "Adicione a chave pública fornecida pelo Hostinger"
              ]
        },
        {
          recordType: "DMARC",
          status: dmarc.verified ? "OK" : "ERROR",
          currentValue: dmarc.current || "Não detectado",
          expectedValue: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
          criticality: "BAIXA",
          analysis: dmarc.verified
            ? "DMARC ativo. Proteção contra spoofing."
            : "DMARC ausente. Recomendado para segurança.",
          actionSteps: dmarc.verified
            ? ["✅ Nenhuma ação necessária."]
            : [
                "Crie um registro TXT: _dmarc",
                `Valor: v=DMARC1; p=none; rua=mailto:dmarc@${domain}`
              ]
        }
      ],
      quickActionInstructions: isOk
        ? "🎉 Tudo pronto! Seu domínio está totalmente configurado."
        : "🔧 Corrija os registros com status ERROR seguindo os passos acima.",
      providerNote: provider?.toLowerCase().includes("cloudflare")
        ? "⚠️ Cloudflare: Desative o proxy (nuvem laranja) para MX e TXT."
        : "⏱️ Aguarde 10-30 minutos para propagação completa dos DNS."
    };
  };

  // ==========================================
  // TENTA IA PRIMEIRO
  // ==========================================
  try {
    const ai = getGeminiClient();
    
    if (!ai) {
      console.log("[DNS] IA indisponível, usando fallback local");
      return res.json({
        success: true,
        analysis: generateFallback()
      });
    }

    const prompt = `Analise os registros DNS para o domínio "${domain}" no serviço FreeMail Hub.
    
    Registros atuais:
    ${JSON.stringify(records, null, 2)}
    
    Retorne um diagnóstico JSON com:
    - overallScore (0-100)
    - statusSummary
    - diagnostics (array com MX, SPF, DKIM, DMARC)
    - isOk (boolean)
    - quickActionInstructions
    - providerNote
    
    Seja claro, otimista e prático. Use português.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        systemInstruction: "Você é um especialista em DNS e emails. Dê diagnósticos claros e acionáveis.",
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    const data = JSON.parse(text.trim());
    
    return res.json({
      success: true,
      analysis: data
    });

  } catch (error: any) {
    console.error("[DNS] Erro na IA, usando fallback:", error.message);
    
    return res.json({
      success: true,
      analysis: generateFallback()
    });
  }
});

/**
 * GET /api/dns/health
 * Health check do serviço DNS
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "dns-verification",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    features: ["MX", "SPF", "DKIM", "DMARC", "DoH Fallback"]
  });
});

// ==========================================
// MIDDLEWARE DE ERRO
// ==========================================
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[DNS] Middleware de erro:", err);
  
  res.status(500).json({
    success: false,
    error: "Erro interno no serviço DNS",
    details: err.message || String(err),
    domainName: req.body?.domainName || req.body?.domain || ""
  });
});

export default router;
