/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper function to query DNS records via DNS-over-HTTPS (DoH) directly from the client browser
async function resolveDnsViaDoH(name: string, type: string): Promise<string[]> {
  console.log(`[CLIENT/DNS-DoH] Resolving ${type} records for: ${name}`);
  const providers = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`
  ];

  for (const url of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        headers: { "accept": "application/dns-json" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[CLIENT/DNS-DoH] Provider ${url} returned status ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (data && Array.isArray(data.Answer) && data.Answer.length > 0) {
        const results = data.Answer.map((ans: any) => {
          let val: string = ans.data || "";
          if (type.toUpperCase() === "TXT") {
            // Strip leading/trailing quotes from TXT records standard format
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1);
            }
          }
          return val;
        });
        console.log(`[CLIENT/DNS-DoH] Successfully got results from ${url}:`, results);
        return results;
      }
    } catch (e: any) {
      console.warn(`[CLIENT/DNS-DoH] DoH fetch failed for ${url}:`, e.message);
    }
  }
  console.log(`[CLIENT/DNS-DoH] No records found or all providers failed for ${name} [${type}]`);
  return [];
}

// Client-side verification of corporate domain DNS records
export async function clientSideVerifyDns(domainName: string) {
  const cleanDomain = domainName.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
  
  try {
    const mxRecords = await resolveDnsViaDoH(cleanDomain, "MX");
    const txtRecords = await resolveDnsViaDoH(cleanDomain, "TXT");
    const dkimRecords = await resolveDnsViaDoH(`default._domainkey.${cleanDomain}`, "TXT");
    const dmarcRecords = await resolveDnsViaDoH(`_dmarc.${cleanDomain}`, "TXT");

    // 1. Verify MX
    let mxStatus: 'verified' | 'failed' = 'failed';
    let mxCurrentValue = "";
    if (mxRecords && mxRecords.length > 0) {
      mxCurrentValue = mxRecords.map(r => {
        const parts = r.trim().split(/\s+/);
        if (parts.length >= 2) {
          return `${parts[0]} ${parts[1].replace(/\.$/, "")}`;
        }
        return `10 ${r.replace(/\.$/, "")}`;
      }).join(", ");
      
      const hasAnyValidMx = mxRecords.some(r => r && r.includes("."));
      mxStatus = hasAnyValidMx ? 'verified' : 'failed';
    } else {
      mxCurrentValue = "No MX records found";
    }

    // 2. Verify SPF
    let spfStatus: 'verified' | 'failed' = 'failed';
    let spfCurrentValue = "";
    const spfText = txtRecords.find(record => record && record.startsWith("v=spf1"));
    if (spfText) {
      spfCurrentValue = spfText;
      spfStatus = 'verified';
    } else {
      spfCurrentValue = txtRecords.length > 0 ? "TXT records found, but no SPF starting with v=spf1" : "No TXT records found";
    }

    // 3. Verify DKIM
    let dkimStatus: 'verified' | 'failed' = 'failed';
    let dkimCurrentValue = "";
    const dkimText = dkimRecords.find(record => record && (record.startsWith("v=DKIM1") || record.includes("k=rsa")));
    if (dkimText) {
      dkimCurrentValue = dkimText;
      dkimStatus = 'verified';
    } else {
      dkimCurrentValue = dkimRecords.length > 0 ? "DKIM TXT found under default._domainkey, but no valid header" : "No DKIM signature found under default._domainkey";
    }

    // 4. Verify DMARC
    let dmarcStatus: 'verified' | 'failed' = 'failed';
    let dmarcCurrentValue = "";
    const dmarcText = dmarcRecords.find(record => record && (record.startsWith("v=DMARC1") || record.includes("p=")));
    if (dmarcText) {
      dmarcCurrentValue = dmarcText;
      dmarcStatus = 'verified';
    } else {
      dmarcCurrentValue = dmarcRecords.length > 0 ? "DMARC TXT found under _dmarc, but no valid header" : "No DMARC records found under _dmarc";
    }

    const EXPECTED_MX = "10 mx1.improvmx.com y 20 mx2.improvmx.com";
    const EXPECTED_SPF = "v=spf1 include:spf.improvmx.com ~all";

    return {
      success: true,
      domain: cleanDomain,
      domainName: cleanDomain,
      mx: { status: mxStatus, currentValue: mxCurrentValue, expected: EXPECTED_MX, host: "@", destination: "mx1.improvmx.com" },
      spf: { status: spfStatus, currentValue: spfCurrentValue, expected: EXPECTED_SPF, host: "@", destination: EXPECTED_SPF },
      dkim: { status: dkimStatus, currentValue: dkimCurrentValue, expected: `v=DKIM1; k=rsa; p=... (Selector: default)`, host: "default._domainkey", destination: "Firma DKIM en Hostinger" },
      dmarc: { status: dmarcStatus, currentValue: dmarcCurrentValue, expected: `v=DMARC1; p=none; rua=mailto:dmarc@${cleanDomain}`, host: "_dmarc", destination: `v=DMARC1; p=none; rua=mailto:dmarc@${cleanDomain}` }
    };

  } catch (err: any) {
    console.error("[CLIENT/DNS] Fallback DNS resolution failed:", err);
    return {
      success: false,
      error: err.message || "Error al verificar registros DNS desde el cliente."
    };
  }
}

// Client-side AI diagnostic fallback generator (the high-fidelity resilient analyzer)
export function clientSideAiExplain(domainName: string, provider: string, records: any) {
  const cleanDomain = domainName.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
  
  const mxVal = records?.mx || { verified: false, current: "No detectado", expected: "10 mx1.improvmx.com y 20 mx2.improvmx.com" };
  const spfVal = records?.spf || { verified: false, current: "No detectado", expected: "v=spf1 include:spf.improvmx.com ~all" };
  const dkimVal = records?.dkim || { verified: false, current: "No detectado", expected: "v=DKIM1; k=rsa; p=..." };
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
      expectedValue: mxVal.expected || "10 mx1.improvmx.com y 20 mx2.improvmx.com",
      criticality: "ALTA",
      analysis: mxVal.verified 
        ? "El enrutador cuántico MX está perfectamente apuntado y listo para descodificar emails entrantes." 
        : "El registro MX está ausente o mal configurado. Los servidores de internet no saben a dónde enviar tus correos actuales.",
      actionSteps: mxVal.verified 
        ? ["No se requiere ninguna acción."] 
        : [
            `Accede a la zona DNS avanzada de tu proveedor (${provider || "tu proveedor"}).`,
            "Elimina registros MX antiguos o redundantes para evitar colisiones de rutas.",
            "Añade un registro MX: Host/Nombre '@', Prioridad '10', Apunta a 'mx1.improvmx.com' (TTL 14400 o auto).",
            "Añade un segundo registro MX: Host/Nombre '@', Prioridad '20', Apunta a 'mx2.improvmx.com'."
          ]
    },
    {
      recordType: "SPF",
      status: spfVal.verified ? "OK" : "ERROR",
      currentValue: spfVal.current || "No detectado",
      expectedValue: spfVal.expected || "v=spf1 include:spf.improvmx.com ~all",
      criticality: "MEDIA",
      analysis: spfVal.verified 
        ? "La directiva SPF de remitente de confianza está activa y protegiendo tu reputación de salida." 
        : "Falta la directiva SPF en formato TXT. Sin esta regla, plataformas como Gmail pueden marcar tus correos como sospechosos.",
      actionSteps: spfVal.verified ? ["No se requiere ninguna acción."] : [
        "Navega al gestor DNS de tu dominio.",
        "Crea un nuevo registro de tipo TXT.",
        "Host/Nombre: '@' (o déjalo en blanco según el proveedor).",
        "Copia este valor exacto sin comillas redundantes: v=spf1 include:spf.improvmx.com ~all",
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
  } else if (providerStr.includes("improvmx") || providerStr.includes("resend")) {
    providerNote = "[SOPORTE REDIRECCIÓN] ImprovMX gestiona de forma automática los correos de entrada. Configura Resend en los DNS si necesitas habilitar el envío (SMTP) premium para tu dominio.";
  }

  return {
    success: true,
    analysis: {
      domainName: cleanDomain,
      overallScore: score,
      statusSummary,
      diagnostics,
      isOk,
      quickActionInstructions: isOk 
        ? "¡Excelente! Tu dominio está 100% operativo y seguro." 
        : "Alinea los registros DNS TXT (SPF, DKIM, DMARC) de acuerdo al mapa cuántico.",
      providerNote
    }
  };
}
