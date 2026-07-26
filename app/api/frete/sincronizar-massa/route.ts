import { NextResponse } from "next/server";
import { dbAdmin as db } from "@/lib/firebaseAdmin";

// Garante que a rota seja dinâmica no servidor
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const lojistaId = body?.lojistaId;

    if (!lojistaId) {
      return NextResponse.json({ error: "Lojista ID não informado." }, { status: 400 });
    }

    // Busca o lojista no Firestore Admin
    const lojistaSnap = await db.collection("lojistas").doc(lojistaId).get();
    if (!lojistaSnap.exists) {
      return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
    }

    const dadosLoja = lojistaSnap.data() || {};
    
    const token = dadosLoja?.sistema?.dsTokenMelhorEnvio || dadosLoja?.tokenMelhorEnvio;
    const isSandbox = dadosLoja?.melhorEnvioSandbox ?? false;
    const baseUrl = isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';

    if (!token) {
      return NextResponse.json({ error: "Token do Melhor Envio não configurado." }, { status: 400 });
    }

    const pendentesSnap = await db.collection("lojistas").doc(lojistaId).collection("pedidos")
      .where("statusEtiqueta", "in", ["pendente", "gerada"]).get();

    let sucessos = 0;
    let falhasCount = 0;

    for (const doc of pendentesSnap.docs) {
      const data = doc.data();
      const idEtiqueta = data?.idEtiquetaMelhorEnvio;

      if (!idEtiqueta) continue;

      // 1. Checkout (Pagamento da Etiqueta no Carrinho do Melhor Envio)
      const checkoutRes = await fetch(`${baseUrl}/api/v2/me/shipment/checkout`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${String(token).trim()}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FestaEmTopo (contato@festaemtopo.com)'
        },
        body: JSON.stringify({ orders: [idEtiqueta] })
      });

      const checkoutData = await checkoutRes.json().catch(() => ({}));
      // O Melhor Envio retorna a propriedade 'purchase' ou sucesso indicando pagamento efetuado
      const foiPago = checkoutRes.ok && (!!checkoutData?.purchase || checkoutData?.status === 'paid' || checkoutRes.status === 200);

      if (foiPago) {
        // 2. Geração do link de impressão da etiqueta paga
        const printRes = await fetch(`${baseUrl}/api/v2/me/shipment/print`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${String(token).trim()}`, 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'FestaEmTopo (contato@festaemtopo.com)'
          },
          body: JSON.stringify({ mode: "private", orders: [idEtiqueta] })
        });
        
        const printData = await printRes.json().catch(() => ({}));
        
        await doc.ref.update({ 
          statusEtiqueta: 'paga',
          urlEtiqueta: printData?.url || printData?.checkout?.url_print || data.urlEtiqueta || "",
          dataGeracaoEtiqueta: new Date().toISOString(),
          erroPagamento: null
        });
        sucessos++;
      } else {
        falhasCount++;
        const msg = checkoutData?.message || checkoutData?.error || JSON.stringify(checkoutData?.errors) || "Erro na transação";
        
        const isSaldo = typeof msg === 'string' && msg.toLowerCase().includes("saldo");

        // Se o erro NÃO for de saldo insuficiente, marca como 'erro' para o lojista saber
        if (!isSaldo) {
          await doc.ref.update({ 
            statusEtiqueta: 'erro',
            erroPagamento: String(msg)
          });
        }
      }
      
      // Delay de resiliência para evitar Rate Limit na API externa
      await new Promise(r => setTimeout(r, 800));
    }

    return NextResponse.json({ success: true, sucessos, falhas: falhasCount });
  } catch (error: unknown) {
    console.error("Erro na sincronização de checkout:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}