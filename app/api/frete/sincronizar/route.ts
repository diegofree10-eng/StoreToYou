import { NextResponse } from "next/server";
import { dbAdmin as db } from "@/lib/firebaseAdmin";

// Força a rota a ser tratada como dinâmica no runtime
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
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
      .where("statusEtiqueta", "==", "pendente")
      .get();
    
    let atualizados = 0;

    for (const pDoc of snapshot.docs) {
      const pedido = pDoc.data();
      const shipmentId = pedido.idEtiquetaMelhorEnvio; 

      if (!shipmentId) {
        console.warn(`[SYNC] Pedido ${pDoc.id} não possui idEtiquetaMelhorEnvio.`);
        continue;
      }

      try {
        const res = await fetch(`${baseUrl}/api/v2/me/shipment/orders/${shipmentId}`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${String(token).trim()}`, 
            'Accept': 'application/json',
            'User-Agent': 'FestaEmTopo (contato@festaemtopo.com)'
          }
        });
        
        const orderData = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error(`[SYNC] Erro ME para etiqueta ${shipmentId}:`, orderData);
          continue;
        }

        // Se o status retornado pelo Melhor Envio for 'paid'
        if (orderData.status === 'paid') {
          await pDoc.ref.update({
            statusEtiqueta: 'paga',
            urlEtiqueta: orderData.url || orderData.checkout?.url_print || "",
            dataGeracaoEtiqueta: new Date().toISOString()
          });
          atualizados++;
        }
      } catch (fetchError) {
        console.error(`[SYNC] Falha de conexão ao consultar pedido ${pDoc.id}:`, fetchError);
      }
    }

    return NextResponse.json({ success: true, atualizados });
  } catch (error: any) {
    console.error("Erro fatal na sincronização:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}