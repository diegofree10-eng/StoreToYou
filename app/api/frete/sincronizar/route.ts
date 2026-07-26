import { NextResponse } from "next/server";
import { dbAdmin as db } from "@/lib/firebaseAdmin";

// Força a rota a ser tratada como dinâmica no runtime
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { lojistaId, token, isSandbox } = body;

    if (!lojistaId) {
      return NextResponse.json({ error: "Lojista ID é obrigatório." }, { status: 400 });
    }

    // 🎯 Se o token não foi enviado no body, busca direto do Firestore do lojista
    let dadosLoja: any = {};
    if (!token) {
      const lojistaSnap = await db.collection("lojistas").doc(lojistaId).get();
      if (!lojistaSnap.exists) {
        return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
      }
      dadosLoja = lojistaSnap.data() || {};
      token = dadosLoja?.sistema?.dsTokenMelhorEnvio || dadosLoja?.tokenMelhorEnvio;
      isSandbox = dadosLoja?.melhorEnvioSandbox ?? isSandbox;
    }

    if (!token) {
      return NextResponse.json({ error: "Token do Melhor Envio não configurado para este lojista." }, { status: 400 });
    }

    const baseUrl = isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
    console.log(`[SYNC] Iniciando sincronização para o lojista: ${lojistaId}`);

    const pedidosRef = db.collection("lojistas").doc(lojistaId).collection("pedidos");
    
    // Busca pedidos que já tiveram a etiqueta gerada mas ainda estão pendentes
    const snapshot = await pedidosRef
      .where("etiquetaGerada", "==", true)
      .where("statusEtiqueta", "in", ["pendente", "gerada"])
      .get();
    
    let atualizados = 0;

    for (const pDoc of snapshot.docs) {
      const pedido = pDoc.data();
      const shipmentId = pedido.idEtiquetaMelhorEnvio || pedido.protocoloMelhorEnvio; 

      if (!shipmentId) {
        console.warn(`[SYNC] Pedido ${pDoc.id} não possui idEtiquetaMelhorEnvio.`);
        continue;
      }

      try {
        // Endpoint ajustado para consultar o status da ordem/etiqueta no Melhor Envio
        const res = await fetch(`${baseUrl}/api/v2/me/shipment/orders?ids=${shipmentId}`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${String(token).trim()}`, 
            'Accept': 'application/json',
            'User-Agent': 'FestaEmTopo (contato@festaemtopo.com)'
          }
        });
        
        const orderData = await res.json().catch(() => ({ data: [] }));

        if (!res.ok) {
          console.error(`[SYNC] Erro ME para etiqueta ${shipmentId}:`, orderData);
          continue;
        }

        // O Melhor Envio costuma retornar um array ou objeto paginado de ordens
        const ordemDetalhe = Array.isArray(orderData) ? orderData[0] : (orderData.data?.[0] || orderData);

        if (ordemDetalhe && (ordemDetalhe.status === 'paid' || ordemDetalhe.status === 'released' || ordemDetalhe.status === 'processing')) {
          await pDoc.ref.update({
            statusEtiqueta: 'paga',
            urlEtiqueta: ordemDetalhe.url || ordemDetalhe.checkout?.url_print || pedido.urlEtiqueta || "",
            dataGeracaoEtiqueta: new Date().toISOString()
          });
          atualizados++;
        }
      } catch (fetchError) {
        console.error(`[SYNC] Falha de conexão ao consultar pedido ${pDoc.id}:`, fetchError);
      }

      // Delay para evitar bloqueio por requisições em massa (Rate Limit)
      await new Promise(r => setTimeout(r, 500));
    }

    return NextResponse.json({ success: true, atualizados });
  } catch (error: any) {
    console.error("Erro fatal na sincronização:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}