import { NextResponse } from 'next/server';
import { dbAdmin as db } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { lojistaId, pedidoId } = await request.json();

    if (!lojistaId || !pedidoId) {
      return NextResponse.json({ error: "Lojista ID e Pedido ID são obrigatórios." }, { status: 400 });
    }

    const pedidoRef = db.collection("lojistas").doc(lojistaId).collection("pedidos").doc(pedidoId);
    const pedidoSnap = await pedidoRef.get();
    
    if (!pedidoSnap.exists) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    const pedidoData = pedidoSnap.data();
    
    // FONTE DA VERDADE: Apenas o idEtiquetaMelhorEnvio serve para pagar.
    const orderIdMelhorEnvio = pedidoData?.idEtiquetaMelhorEnvio;

    if (!orderIdMelhorEnvio) {
      return NextResponse.json({ error: "ID da etiqueta (idEtiquetaMelhorEnvio) não encontrado no pedido." }, { status: 400 });
    }

    const lojistaSnap = await db.collection("lojistas").doc(lojistaId).get();
    if (!lojistaSnap.exists) {
      return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
    }

    const dadosLoja = lojistaSnap.data() || {};
    
    // 🎯 CORRIGIDO: Puxa o token de dentro de 'sistema' ou da raiz
    const token = dadosLoja?.sistema?.dsTokenMelhorEnvio || dadosLoja?.tokenMelhorEnvio;
    const isSandbox = dadosLoja?.melhorEnvioSandbox === true;
    const baseUrl = isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';

    if (!token) {
      return NextResponse.json({ error: "Token do Melhor Envio não configurado para este lojista." }, { status: 400 });
    }

    // 1. Checkout (Pagamento)
    const checkoutRes = await fetch(`${baseUrl}/api/v2/me/shipment/checkout`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${String(token).trim()}`, 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'User-Agent': 'FestaEmTopo (contato@festaemtopo.com)'
      },
      body: JSON.stringify({ orders: [orderIdMelhorEnvio] })
    });

    const checkoutData = await checkoutRes.json().catch(() => ({}));
    
    // Verificação de sucesso baseada na resposta da API
    const eSucesso = checkoutRes.ok && checkoutData.purchase && checkoutData.purchase.status !== 'pending';

    if (!eSucesso) {
      const msgErro = checkoutData.message || (checkoutData.purchase?.status === 'pending' ? "Saldo insuficiente." : "Erro na transação.");
      
      await pedidoRef.update({
        statusEtiqueta: 'pendente',
        erroPagamento: String(msgErro)
      });

      return NextResponse.json({ success: false, message: msgErro }, { status: 400 });
    }

    // 2. Imprime a etiqueta
    const printRes = await fetch(`${baseUrl}/api/v2/me/shipment/print`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${String(token).trim()}`, 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'User-Agent': 'FestaEmTopo (contato@festaemtopo.com)'
      },
      body: JSON.stringify({ mode: "private", orders: [orderIdMelhorEnvio] })
    });
    
    const printData = await printRes.json().catch(() => ({}));

    await pedidoRef.update({
      statusEtiqueta: 'paga',
      urlEtiqueta: printData?.url || "",
      dataGeracaoEtiqueta: new Date().toISOString(),
      erroPagamento: null
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erro no processamento do pagamento da etiqueta:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}