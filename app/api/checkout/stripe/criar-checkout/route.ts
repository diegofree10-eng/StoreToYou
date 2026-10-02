// app/api/checkout/stripe/criar-checkout/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lojistaId, safeCart, cliente, endereco, totalGeral, freteSel } = body;

    console.log("🔍 [Stripe API] lojistaId recebido do front:", lojistaId);

    if (!lojistaId) {
      return NextResponse.json({ error: "ID ou Slug da loja não informado no corpo da requisição." }, { status: 400 });
    }

    let lojaData: any = null;

    // 1. Tenta buscar diretamente pelo ID do documento do Firestore
    try {
      const lojistaRef = doc(db, "lojistas", lojistaId);
      const lojistaSnap = await getDoc(lojistaRef);
      if (lojistaSnap.exists()) {
        lojaData = lojistaSnap.data();
      }
    } catch (e) {
      // Ignora erro
    }

    // 2. Se não encontrou pelo ID, tenta buscar pelo Slug
    if (!lojaData) {
      let q = query(collection(db, "lojistas"), where("dsSlug", "==", lojistaId), limit(1));
      let querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        q = query(collection(db, "lojistas"), where("dadosLoja.dsSlug", "==", lojistaId), limit(1));
        querySnapshot = await getDocs(q);
      }

      if (!querySnapshot.empty) {
        lojaData = querySnapshot.docs[0].data();
      }
    }

    if (!lojaData) {
      return NextResponse.json({ error: "Lojista não encontrado no banco de dados." }, { status: 404 });
    }

    // 3. Busca o ID da conta conectada em vários caminhos possíveis para evitar falhas
    const stripeConfig = lojaData?.pagamentos?.dsStripe || {};
    const stripeConnectedAccountId = 
      stripeConfig.stripeConnectedAccountId || 
      stripeConfig.accountId || 
      lojaData?.stripeConnectedAccountId || 
      lojaData?.pagamentos?.stripeConnectedAccountId;

    const isStripeAtivo = stripeConfig?.ativo === true || Boolean(stripeConnectedAccountId);

    console.log("🔍 [Stripe API] Verificação final:", { isStripeAtivo, stripeConnectedAccountId });

    if (!isStripeAtivo || !stripeConnectedAccountId) {
      return NextResponse.json(
        { error: "Conta Stripe Connect não vinculada ou inativa para este lojista. Verifique se o ID da conta foi salvo no Firestore." },
        { status: 400 }
      );
    }

    // 4. Monta os itens do carrinho para o formato aceito pela Stripe
    const lineItems = Array.isArray(safeCart) ? safeCart.map((item: any) => {
      const precoUnitario = Number(item.preco ?? item.vlPrecoProduto ?? item.vlPrecoBasicoProduto ?? 0);
      const imagemProduto = item.dsCapaProduto || item.dsFotoProduto || item.foto || "";

      return {
        price_data: {
          currency: "brl",
          product_data: {
            name: item.dsNomeProduto || item.nome || "Produto",
            images: imagemProduto ? [imagemProduto] : [],
          },
          unit_amount: Math.round(precoUnitario * 100),
        },
        quantity: Number(item.qty || item.quantidade || 1),
      };
    }) : [];

    // 5. Adiciona o valor do frete, se houver
    const valorFrete = Number(freteSel?.price || 0);
    if (valorFrete > 0) {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: `Frete: ${freteSel?.name || "Envio"}`,
            images: [],
          },
          unit_amount: Math.round(valorFrete * 100),
        },
        quantity: 1,
      });
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";
    const slugLoja = lojaData?.dadosLoja?.dsSlug || lojaData?.dsSlug || lojistaId;

    // 6. Cria a sessão de Checkout na Stripe utilizando 'as any' para contornar divergências de tipagem da SDK
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${origin}/${slugLoja}?status=sucesso`,
        cancel_url: `${origin}/${slugLoja}/carrinho?status=cancelado`,
        customer_email: cliente?.dsEmailCliente || cliente?.email || undefined,
      } as any,
      {
        stripeAccount: stripeConnectedAccountId,
      }
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ [Stripe API] Erro crítico:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao processar pagamento." },
      { status: 500 }
    );
  }
}