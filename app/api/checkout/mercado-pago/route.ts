import { MercadoPagoConfig, Preference } from 'mercadopago';

// 1. Inicializa o cliente com o Access Token
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export async function POST(req: Request) {
  try {
    const { items, frete } = await req.json();

    // 2. Instancia o serviço de Preferências
    const preference = new Preference(client);

    // 3. Cria a preferência com a nova sintaxe
    const response = await preference.create({
      body: {
        items: [
          ...items.map((i: any) => ({
            title: i.name,
            quantity: Number(i.qty),
            unit_price: Number(i.price)
          })),
          {
            title: "Frete",
            quantity: 1,
            unit_price: Number(frete)
          }
        ],
        auto_return: "approved"
      }
    });

    // 4. Retorna o init_point (o ID da resposta agora está dentro de 'id')
    return Response.json({
      init_point: response.init_point
    });

  } catch (error) {
    console.error("Erro ao criar preferência:", error);
    return Response.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}