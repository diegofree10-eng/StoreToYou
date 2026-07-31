import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { cepDestino, pacote, lojistaId, itensFiltrados } = body;

    // 🔄 Suporte flexível: Se a API recebeu um "pedido" inteiro em vez de cepDestino isolado
    if (!cepDestino && body.endereco) {
      cepDestino = body.endereco.dsCepCliente || body.endereco.cep || body.cliente?.dsCepCliente || body.cliente?.cep;
    }
    if (!lojistaId && body.lojistaIdApp) {
      lojistaId = body.lojistaIdApp;
    }
    if (!itensFiltrados && body.itens) {
      itensFiltrados = body.itens;
    }

    if (!lojistaId || !cepDestino) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes (lojistaId ou cepDestino)." }, { status: 400 });
    }

    // Sanitiza o CEP de destino
    const cepDestinoLimpo = String(cepDestino).replace(/\D/g, "");
    if (cepDestinoLimpo.length !== 8) {
      return NextResponse.json({ error: "CEP de destino inválido." }, { status: 400 });
    }

    // 🎯 Busca o lojista usando o dbAdmin (Server-Side seguro)
    let dados: any = null;

    try {
      const lojistaDoc = await dbAdmin.collection("lojistas").doc(lojistaId).get();
      if (lojistaDoc.exists) {
        dados = lojistaDoc.data();
      }
    } catch (e) {
      // Caso o lojistaId passado seja na verdade um slug, tentamos buscar pelo campo de slug
    }

    if (!dados) {
      let snapSlug = await dbAdmin.collection("lojistas").where("dsSlug", "==", lojistaId).limit(1).get();
      if (!snapSlug.empty) {
        dados = snapSlug.docs[0].data();
      } else {
        snapSlug = await dbAdmin.collection("lojistas").where("dadosLoja.dsSlug", "==", lojistaId).limit(1).get();
        if (!snapSlug.empty) {
          dados = snapSlug.docs[0].data();
        }
      }
    }

    if (!dados) {
      return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
    }

    const token = dados?.sistema?.dsTokenMelhorEnvio || dados?.tokenMelhorEnvio; 
    const cepOrigem = String(dados?.dsCepLoja || dados?.dadosLoja?.dsCepLoja || dados?.cep || "").replace(/\D/g, "");
    const transportadorasAtivas = dados?.sistema?.dstransportadoras || dados?.transportadoras || {};

    if (!token || cepOrigem.length !== 8) {
      return NextResponse.json({ error: "Configuração de Frete incompleta no Firebase (Token ou CEP de origem inválido)." }, { status: 400 });
    }

    const apenasItensComFrete = Array.isArray(itensFiltrados)
      ? itensFiltrados.filter((item: any) => item.precisaFrete !== false)
      : [];

    if (Array.isArray(itensFiltrados) && itensFiltrados.length > 0 && apenasItensComFrete.length === 0) {
      return NextResponse.json([]); 
    }

    let pesoTotalCalculado = 0;
    // Dimensões mínimas seguras recomendadas pelas transportadoras / Melhor Envio
    let maiorLargura = 11;
    let maiorAltura = 2;
    let maiorComprimento = 16;
    
    if (apenasItensComFrete.length > 0) {
      apenasItensComFrete.forEach((item: any) => {
        // 📦 Lê peso e dimensões priorizando os novos campos salvos no pedido, com fallbacks seguros
        const pesoItem = Number(item.weight || item.peso || item.dsPeso || 0.2);
        const quantidade = Number(item.qty || item.quantity || item.quantidade || 1);
        pesoTotalCalculado += pesoItem * quantidade;

        const a = Number(item.height || item.altura || item.dsAltura || 2);
        const c = Number(item.length || item.comprimento || item.dsComprimento || 16);
        const l = Number(item.width || item.largura || item.dsLargura || 11);

        if (a > maiorAltura) maiorAltura = a;
        if (c > maiorComprimento) maiorComprimento = c;
        if (l > maiorLargura) maiorLargura = l;
      });
    } else {
      pesoTotalCalculado = Number(pacote?.peso || 0.5);
    }

    if (pesoTotalCalculado <= 0) pesoTotalCalculado = 0.1;

    const pacoteSeguro = {
      largura: Math.max(11, maiorLargura),
      altura: Math.max(2, maiorAltura),
      comprimento: Math.max(16, maiorComprimento),
      peso: pesoTotalCalculado
    };

    const IsMelhorEnvioSandbox = dados?.melhorEnvioSandbox === true;
    const UrlMelhorEnvio = IsMelhorEnvioSandbox
      ? 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate'
      : 'https://melhorenvio.com.br/api/v2/me/shipment/calculate';

    const response = await fetch(UrlMelhorEnvio, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${String(token).trim()}`,
        'User-Agent': 'FestaEmTopo (contato@festaemtopo.com)'
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigem },
        to: { postal_code: cepDestinoLimpo },
        volumes: [
          {
            width: pacoteSeguro.largura,
            height: pacoteSeguro.altura,
            length: pacoteSeguro.comprimento,
            weight: pacoteSeguro.peso
          }
        ]
      })
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({ error: "Resposta inválida da API de frete." }, { status: 502 });
    }

    if (response.status === 401) {
      console.error("🚨 Melhor Envio retornou 401. Token inválido ou expirado.");
      return NextResponse.json({ error: "Token do Melhor Envio inválido ou expirado." }, { status: 401 });
    }

    if (!response.ok || data.message) {
      return NextResponse.json({ error: data.message || "Falha na cotação de frete." }, { status: response.status });
    }

    if (Array.isArray(data)) {
      const fretesFiltrados = data
        .filter((servico: any) => {
          if (servico.error) return false;

          const nomeEmpresa = String(servico.company?.name || "").toLowerCase();
          const nomeServico = String(servico.name || "").toLowerCase();

          if (!transportadorasAtivas || Object.keys(transportadorasAtivas).length === 0) {
            return true;
          }

          if (nomeEmpresa.includes("correios") || nomeServico.includes("pac") || nomeServico.includes("sedex")) {
            return transportadorasAtivas.correios === true || transportadorasAtivas.correios === undefined; 
          }
          
          if (nomeEmpresa.includes("azul")) {
            return transportadorasAtivas.azul === true || transportadorasAtivas.azul === undefined;
          }

          if (nomeEmpresa.includes("jadlog")) {
            return transportadorasAtivas.jadlog === true || transportadorasAtivas.jadlog === undefined;
          }

          if (nomeEmpresa.includes("latam")) {
            return transportadorasAtivas.latam === true || transportadorasAtivas.latam === undefined;
          }

          return true; 
        })
        .map((servico: any) => ({
          id: servico.id,
          name: servico.name,
          company: servico.company?.name || "Transportadora",
          price: Number(servico.price),
          delivery_time: servico.delivery_time,
          custom_delivery_time: servico.custom_delivery_time
        }));

      return NextResponse.json(fretesFiltrados);
    }

    return NextResponse.json([]);

  } catch (error: any) {
    console.error("🚨 Erro interno na API de frete:", error);
    return NextResponse.json({ error: "Erro interno ao processar frete." }, { status: 500 });
  }
}