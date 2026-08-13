// app/api/frete/tentar-pagamento/route.ts
import { NextResponse } from "next/server";
import { dbAdmin as db } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { lojistaId, orders } = body;

    if (!lojistaId || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "Dados inválidos para reprocessamento." }, { status: 400 });
    }

    const lojistaSnap = await db.collection("lojistas").doc(lojistaId).get();
    if (!lojistaSnap.exists) {
      return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
    }

    const dadosLoja = lojistaSnap.data() || {};

    const isSandbox =
      dadosLoja?.melhorEnvioSandbox === true ||
      dadosLoja?.dadosLoja?.melhorEnvioSandbox === true ||
      dadosLoja?.sistema?.melhorEnvioSandbox === true;

    const baseUrl = isSandbox
      ? "https://sandbox.melhorenvio.com.br"
      : "https://melhorenvio.com.br";

    let token = "";
    if (isSandbox) {
      token = dadosLoja?.sistema?.dsTokenMelhorEnvioSandbox || dadosLoja?.tokenMelhorEnvioSandbox || "";
    } else {
      token =
        dadosLoja?.sistema?.dsTokenMelhorEnvio ||
        dadosLoja?.tokenMelhorEnvio ||
        dadosLoja?.dadosLoja?.dsTokenMelhorEnvio ||
        "";
    }

    if (!token) {
      return NextResponse.json({ error: "Token do Melhor Envio não configurado." }, { status: 400 });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const p of orders) {
      const pedidoId = p.id || p.pedido;
      const idEtiquetaMelhorEnvio = p?.Etiqueta?.IdEtiqueta || p?.idEtiquetaMelhorEnvio;

      if (!pedidoId || !idEtiquetaMelhorEnvio) {
        errors.push({ pedido: pedidoId, message: "ID da etiqueta do Melhor Envio ausente." });
        continue;
      }

      const pedidoRef = db
        .collection("lojistas")
        .doc(lojistaId)
        .collection("pedidos")
        .doc(String(pedidoId));

      try {
        // 1. Refaz o Checkout (tentando debitar do saldo recarregado)
        const checkoutRes = await fetch(`${baseUrl}/api/v2/me/shipment/checkout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ orders: [idEtiquetaMelhorEnvio] }),
        });

        const checkoutData = await checkoutRes.json().catch(() => ({}));

        if (!checkoutRes.ok) {
          const msgErro = checkoutData.message || JSON.stringify(checkoutData.errors) || "Erro ao realizar checkout";
          
          await pedidoRef.update({
            statusEtiqueta: "pendente_saldo",
            erroPagamento: msgErro,
            "Etiqueta.statusEtiqueta": "pendente_saldo",
            "Etiqueta.erroPagamento": msgErro,
          });

          errors.push({ pedido: pedidoId, message: msgErro });
          continue;
        }

        // 2. Se o pagamento deu certo, busca o link de impressão da etiqueta
        let urlEtiquetaFinal = null;
        try {
          const printRes = await fetch(`${baseUrl}/api/v2/me/shipment/print`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token.trim()}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ orders: [idEtiquetaMelhorEnvio] }),
          });

          const printData = await printRes.json().catch(() => ({}));
          urlEtiquetaFinal = printData?.url || printData?.data?.url || printData?.print || null;
        } catch (printErr) {
          console.error(`Erro ao gerar PDF de impressão para o pedido ${pedidoId}:`, printErr);
        }

        // 3. Atualiza o Firestore com o status PAGO e dados limpos
        await pedidoRef.update({
          statusEtiqueta: "pago",
          urlEtiqueta: urlEtiquetaFinal,
          erroPagamento: null,
          "Etiqueta.isEtiquetaGerada": true,
          "Etiqueta.statusEtiqueta": "pago",
          "Etiqueta.urlEtiqueta": urlEtiquetaFinal,
          "Etiqueta.erroPagamento": null,
        });

        results.push({ pedido: pedidoId, status: "sucesso" });
      } catch (err: any) {
        errors.push({ pedido: pedidoId, message: err.message });
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    return NextResponse.json({ success: true, results, errors });
  } catch (error: any) {
    console.error("Erro na API de tentativa de pagamento:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
 //api/frete/tentar-pagamento/routeModule.ts