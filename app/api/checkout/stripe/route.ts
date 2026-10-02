// app/api/checkout/stripe/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const lojistaId = body.lojistaId; // ID ou slug do lojista vindo do front-end

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const redirectUri = `${origin}/api/checkout/stripe/callback`;

    const clientId = process.env.STRIPE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'STRIPE_CLIENT_ID não configurado no ambiente.' }, { status: 500 });
    }

    // Passamos o lojistaId no 'state' para recuperá-lo no callback e salvar no Firebase correto
    const stateData = Buffer.from(JSON.stringify({ lojistaId })).toString('base64');

    const accountLinkUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${stateData}`;

    return NextResponse.json({ url: accountLinkUrl });
  } catch (err: any) {
    console.error("Erro ao gerar link do Stripe Connect:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// meio de pagamentos da stripe. usada na pagina de configuracoes do logista, apos clicar em Conectar com a Stripe 🚀.