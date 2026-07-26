import { NextResponse } from "next/server";
import { dbAdmin as adminDb } from "@/lib/firebaseAdmin"; // 👈 Importa como dbAdmin e apelida de adminDb para o resto do código funcionar sem alterações

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lojistaId = searchParams.get("lojistaId");

    if (!lojistaId) {
      return NextResponse.json(
        { error: "ID do lojista não informado." },
        { status: 400 },
      );
    }

    // Busca o documento do lojista utilizando o Firebase Admin (servidor)
    const docRef = await adminDb.collection("lojistas").doc(lojistaId).get();

    if (!docRef.exists) {
      return NextResponse.json(
        { error: "Loja não encontrada." },
        { status: 404 },
      );
    }

    const dadosLoja = docRef.data();

    // Extrai apenas os dados de pagamento necessários de forma segura
    const dadosPagamento = {
      chavePix:
        dadosLoja?.pagamentos?.dsChavePix ||
        dadosLoja?.chavePix ||
        dadosLoja?.pix ||
        "",
      mercadoPagoAtivo: !!dadosLoja?.mercadoPago?.ativo,
      pagseguroAtivo: !!dadosLoja?.pagseguro?.ativo,
    };

    return NextResponse.json(dadosPagamento, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao buscar dados de pagamento no servidor:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar pagamento." },
      { status: 500 },
    );
  }
}

// Para blindar as chaves Pix e as configurações de pagamento,
// vamos criar uma API Route segura no Next.js utilizando o Firebase Admin SDK no lado do servidor.
// Dessa forma, as chaves confidenciais nunca serão expostas no código do navegador do cliente.
