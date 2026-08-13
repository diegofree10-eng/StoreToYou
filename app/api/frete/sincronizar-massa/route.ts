import { NextResponse } from "next/server";
import { dbAdmin as db } from "@/lib/firebaseAdmin";

// Garante que a rota seja dinâmica no servidor
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const lojistaId = body?.lojistaId;
    const pedidoIdEspecifico = body?.pedidoId; // Opcional: para sincronizar um pedido específico selecionado

    if (!lojistaId) {
      return NextResponse.json({ error: "Lojista ID não informado." }, { status: 400 });
    }

    // Busca o lojista no Firestore Admin
    const lojistaSnap = await db.collection("lojistas").doc(lojistaId).get();
    if (!lojistaSnap.exists) {
      return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
    }

    const dadosLoja = lojistaSnap.data() || {};
    
    // Suporte robusto para pegar o token correto (Produção vs Sandbox)
    const isSandbox = dadosLoja?.melhorEnvioSandbox === true || dadosLoja?.sistema?.melhorEnvioSandbox === true;
    const token = isSandbox 
      ? (dadosLoja?.sistema?.dsTokenMelhorEnvioSandbox || dadosLoja?.tokenMelhorEnvioSandbox)
      : (dadosLoja?.sistema?.dsTokenMelhorEnvio || dadosLoja?.tokenMelhorEnvio || dadosLoja?.dadosLoja?.dsTokenMelhorEnvio);

    const baseUrl = isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';

    if (!token) {
      return NextResponse.json({ error: "Token do Melhor Envio não configurado." }, { status: 400 });
    }

    // Se passou um pedido específico, busca só ele. Senão, busca todos os pendentes/gerados
    let pedidosDocs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] = [];
    
    const pedidosRef = db.collection("lojistas").doc(lojistaId).collection("pedidos");

    if (pedidoIdEspecifico) {
      const pDoc = await pedidosRef.doc(pedidoIdEspecifico).get();
      if (pDoc.exists) pedidosDocs = [pDoc as any];
    } else {
      const pendentesSnap = await pedidosRef
        .where("statusEtiqueta", "in", ["pendente", "gerada", "erro"]).get();
      pedidosDocs = pendentesSnap.docs;
    }

    let sucessos = 0;
    let falhasCount = 0;

    for (const doc of pedidosDocs) {
      const data = doc.data();
      const idEtiqueta = data?.idEtiquetaMelhorEnvio || data?.Etiqueta?.IdEtiqueta;

      if (!idEtiqueta) continue;

      // 1. Tenta fazer o Checkout (caso esteja pendente de pagamento de saldo)
      const checkoutRes = await fetch(`${baseUrl}/api/v2/me/shipment/checkout`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${String(token).trim()}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'StoreToYou (contato@storetoyou.com)'
        },
        body: JSON.stringify({ orders: [idEtiqueta] })
      });

      const checkoutData = await checkoutRes.json().catch(() => ({}));
      const foiPago = checkoutRes.ok && (!!checkoutData?.purchase || checkoutData?.status === 'paid' || checkoutRes.status === 200);

      // 2. Consulta os detalhes da etiqueta no Melhor Envio para resgatar Rastreio e Status Oficial
      let trackingCode = data?.dsNumRastreio || data?.Etiqueta?.dsNumRastreio || "";
      let urlPrint = data?.urlEtiqueta || data?.Etiqueta?.urlEtiqueta || "";
      let statusFinal = foiPago ? 'pago' : (data?.statusEtiqueta || 'pendente');

      try {
        const infoRes = await fetch(`${baseUrl}/api/v2/me/orders/${idEtiqueta}`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${String(token).trim()}`, 
            'Accept': 'application/json',
            'User-Agent': 'StoreToYou (contato@storetoyou.com)'
          }
        });
        
        if (infoRes.ok) {
          const infoData = await infoRes.json();
          if (infoData) {
            trackingCode = infoData.tracking || trackingCode;
            if (infoData.status === 'paid' || infoData.status === 'released' || infoData.status === 'printed') {
              statusFinal = 'pago';
            }
          }
        }
      } catch (err) {
        console.error("Erro ao buscar detalhes da etiqueta no ME:", err);
      }

      // 3. Se foi pago ou se já está liberado, busca a URL de impressão
      if (statusFinal === 'pago' || foiPago) {
        const printRes = await fetch(`${baseUrl}/api/v2/me/shipment/print`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${String(token).trim()}`, 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'StoreToYou (contato@storetoyou.com)'
          },
          body: JSON.stringify({ mode: "private", orders: [idEtiqueta] })
        });
        
        const printData = await printRes.json().catch(() => ({}));
        if (printData?.url || printData?.checkout?.url_print) {
          urlPrint = printData?.url || printData?.checkout?.url_print;
        }

        // Atualiza tanto a raiz quanto o objeto Etiqueta para manter compatibilidade total com o seu painel
        await doc.ref.update({ 
          statusEtiqueta: 'pago',
          dsNumRastreio: trackingCode,
          urlEtiqueta: urlPrint,
          dataGeracaoEtiqueta: data.dataGeracaoEtiqueta || new Date().toISOString(),
          erroPagamento: null,
          "Etiqueta.isEtiquetaGerada": true,
          "Etiqueta.statusEtiqueta": "pago",
          "Etiqueta.dsNumRastreio": trackingCode,
          "Etiqueta.urlEtiqueta": urlPrint
        });
        sucessos++;
      } else {
        falhasCount++;
        const msg = checkoutData?.message || checkoutData?.error || JSON.stringify(checkoutData?.errors) || "Aguardando pagamento / processamento";
        const isSaldo = typeof msg === 'string' && msg.toLowerCase().includes("saldo");

        if (!isSaldo) {
          await doc.ref.update({ 
            statusEtiqueta: 'erro',
            erroPagamento: String(msg),
            "Etiqueta.statusEtiqueta": "erro"
          });
        }
      }
      
      // Delay de resiliência
      await new Promise(r => setTimeout(r, 600));
    }

    return NextResponse.json({ success: true, sucessos, falhas: falhasCount });
  } catch (error: unknown) {
    console.error("Erro na sincronização de checkout:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}