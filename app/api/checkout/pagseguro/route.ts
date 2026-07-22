export const dynamic = 'force-dynamic'; // Isso diz à Vercel para não tentar ler esse arquivo no Build
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // IMPORTAÇÃO DINÂMICA: O Firebase só carrega dentro da função, 
    // nunca durante a compilação do build da Vercel.
    const { db } = await import("@/lib/firebase");
    const { doc, getDoc } = await import("firebase/firestore");

    const body = await request.json().catch(() => ({}));
    const { lojistaId, numeroPedido, items, cliente } = body;

    if (!lojistaId) {
      return NextResponse.json({ error: "Lojista ID não fornecido." }, { status: 400 });
    }

    const lojistaRef = doc(db, "lojistas", lojistaId);
    const lojistaSnap = await getDoc(lojistaRef);

    if (!lojistaSnap.exists()) {
      return NextResponse.json({ error: "Estabelecimento não encontrado." }, { status: 404 });
    }

    // ... restante da sua lógica igual ...
    const dadosLoja = lojistaSnap.data();
    const configPagSeguro = dadosLoja?.pagseguro;
    
    // ... (restante do código permanece idêntico ao que você já tem)
    
  } catch (error: any) {
    console.error("Erro interno na rota do PagSeguro:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}