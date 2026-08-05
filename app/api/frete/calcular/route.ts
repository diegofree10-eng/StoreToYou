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
    const transportadorasAtivas = dados?.sistema?.dsTransportadoras || dados?.Transportadoras || {};
    
    // Configurações de Entrega Local
    const entregaLocalAtiva = dados?.sistema?.isFreteLocal || dados?.isFreteLocal || false;
    
    // 🛠️ Tratamento blindado para aceitar número ou string com vírgula do Firebase (ex: "20,00" -> 20)
    const valorFreteLocalBruto = 
      dados?.sistema?.vlFreteLocal || 
      dados?.vlFreteLocal || 
      dados?.dadosLoja?.vlFreteLocal || 
      0;

    const valorFreteLocalFixo = typeof valorFreteLocalBruto === 'string'
      ? parseFloat(valorFreteLocalBruto.replace(/\./g, "").replace(",", ".")) || 0
      : Number(valorFreteLocalBruto) || 0;

    const cidadeLoja = String(dados?.dadosLoja?.dsCidadeLoja || dados?.cidade || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (!token || cepOrigem.length !== 8) {
      return NextResponse.json({ error: "Configuração de Frete incompleta no Firebase (Token ou CEP de origem inválido)." }, { status: 400 });
    }

    // Consulta a cidade do cliente via ViaCEP para validar a Entrega Local e a Retirada na Loja
    let cidadeCliente = "";
    try {
      const rVia = await fetch(`https://viacep.com.br/ws/${cepDestinoLimpo}/json/`);
      const dadosClienteVia = await rVia.json();
      if (!dadosClienteVia.erro && dadosClienteVia.localidade) {
        cidadeCliente = dadosClienteVia.localidade.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }
    } catch (err) {
      console.error("Erro ao consultar ViaCEP no back-end:", err);
    }

    const mesmaCidade = cidadeCliente && cidadeLoja && cidadeCliente === cidadeLoja;
    const mesmoCepLoja = cepDestinoLimpo === cepOrigem;

    const apenasItensComFrete = Array.isArray(itensFiltrados)
      ? itensFiltrados.filter((item: any) => item.precisaFrete !== false)
      : [];

    if (Array.isArray(itensFiltrados) && itensFiltrados.length > 0 && apenasItensComFrete.length === 0) {
      return NextResponse.json([]); 
    }

    let pesoTotalCalculado = 0;
    let maiorLargura = 11;
    let maiorAltura = 2;
    let maiorComprimento = 16;
    
    if (apenasItensComFrete.length > 0) {
      apenasItensComFrete.forEach((item: any) => {
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

    let fretesFiltrados: any[] = [];

    if (Array.isArray(data)) {
      fretesFiltrados = data
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
    }

    // 📍 Injeta Retirada na Loja se for do mesmo CEP ou da mesma cidade (com verificação para evitar duplicidade)
    const jaTemRetirada = fretesFiltrados.some((f: any) => f.id === "retirar_loja");
    if ((mesmoCepLoja || mesmaCidade) && !jaTemRetirada) {
      fretesFiltrados.unshift({ 
        id: "retirar_loja", 
        name: "Retirar na Loja", 
        price: 0, 
        delivery_time: 0 
      });
    }

    // 🛵 Injeta Entrega Local se estiver ativa e for da mesma cidade (com verificação para evitar duplicidade)
    const jaTemEntregaLocal = fretesFiltrados.some((f: any) => f.id === "entrega_local");
    if (entregaLocalAtiva && mesmaCidade && !jaTemEntregaLocal) {
      fretesFiltrados.unshift({
        id: "entrega_local",
        name: "Entrega Local",
        price: valorFreteLocalFixo,
        delivery_time: 1
      });
    }

    return NextResponse.json(fretesFiltrados);

  } catch (error: any) {
    console.error("🚨 Erro interno na API de frete:", error);
    return NextResponse.json({ error: "Erro interno ao processar frete." }, { status: 500 });
  }
}