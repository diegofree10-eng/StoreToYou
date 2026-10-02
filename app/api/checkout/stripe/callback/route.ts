// app/api/checkout/stripe/callback/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { dbAdmin } from '@/lib/firebaseAdmin'; // Usando o Admin SDK do Firebase para bypassar regras de segurança

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const origin = url.origin;

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/admin?erro=stripe_falha_autorizacao`);
  }

  try {
    // Decodifica o state para recuperar o ID do lojista
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    const lojistaId = decodedState.lojistaId;

    if (!lojistaId) {
      throw new Error('Lojista não identificado no state.');
    }

    // Troca o código temporário fornecido pela Stripe pelo ID da conta conectada do lojista
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const connectedAccountId = response.stripe_user_id;

    if (!connectedAccountId) {
      throw new Error('Não foi possível obter o ID da conta conectada da Stripe.');
    }

    // Salva o ID da conta conectada no Firebase usando Admin SDK
    let docRef = dbAdmin.collection('lojistas').doc(lojistaId);
    let snap = await docRef.get();

    if (!snap.exists) {
      // Se não achar pelo ID direto, busca pelo slug
      const q = dbAdmin.collection('lojistas').where('slug', '==', lojistaId).limit(1);
      const querySnapshot = await q.get();
      if (!querySnapshot.empty) {
        docRef = dbAdmin.collection('lojistas').doc(querySnapshot.docs[0].id);
      }
    }

    // Atualiza o documento do lojista com o ID da Stripe e ativa o meio de pagamento
    await docRef.set({
      pagamentos: {
        stripeConnectedAccountId: connectedAccountId,
        dsStripe: { ativo: true }
      }
    }, { merge: true });

    // Redireciona de volta para o painel de administração do lojista com sucesso
    return NextResponse.redirect(`${origin}/admin?sucesso=stripe_conectado`);
  } catch (err: any) {
    console.error('Erro no callback do Stripe Connect:', err);
    return NextResponse.redirect(`${origin}/admin?erro=stripe_conexao_falhou`);
  }
}