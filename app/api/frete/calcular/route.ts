import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cepDestino, pacote, lojistaId, itensFiltrados } = body;

    if (!lojistaId || !cepDestino) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
    }

    // 🎯 Busca o lojista por ID direto ou pelas variações de slug no Firebase
    let lojistaSnap = await getDoc(doc(db, "lojistas", lojistaId));
    
    if (!lojistaSnap.exists()) {
      let qSlug = query(collection(db, "lojistas"), where("dsSlug", "==", lojistaId), limit(1));
      let snapSlug = await getDocs(qSlug);
      
      if (!snapSlug.empty) {
        lojistaSnap = snapSlug.docs[0];
      } else {
        qSlug = query(collection(db, "lojistas"), where("dadosLoja.dsSlug", "==", lojistaId), limit(1));
        snapSlug = await getDocs(qSlug);
        if (!snapSlug.empty) {
          lojistaSnap = snapSlug.docs[0];
        }
      }
    }

    if (!lojistaSnap.exists()) {
      return NextResponse.json({ error: "Lojista não encontrado." }, { status: 404 });
    }

    const dados = lojistaSnap.data();

    const token = dados?.sistema?.dsTokenMelhorEnvio || dados?.tokenMelhorEnvio; 
    const cepOrigem = String(dados?.dsCepLoja || dados?.dadosLoja?.dsCepLoja || dados?.cep || "").replace(/\D/g, "");
    const transportadorasAtivas = dados?.sistema?.dstransportadoras || dados?.transportadoras || {};

    if (!token || !cepOrigem) {
      return NextResponse.json({ error: "Configuração de Frete incompleta no Firebase (Token ou CEP de origem ausente)." }, { status: 400 });
    }

    const apenasItensComFrete = Array.isArray(itensFiltrados)
      ? itensFiltrados.filter((item: any) => item.precisaFrete !== false)
      : [];

    if (Array.isArray(itensFiltrados) && itensFiltrados.length > 0 && apenasItensComFrete.length === 0) {
      return NextResponse.json([]); 
    }

    let pesoTotalCalculado = 0;
    let maiorLargura = 20;
    let maiorAltura = 10;
    let maiorComprimento = 20;
    
    if (apenasItensComFrete.length > 0) {
      apenasItensComFrete.forEach((item: any) => {
        const pesoItem = Number(item.peso || item.weight || item.dsPeso || 0.2);
        const quantidade = Number(item.qty || item.quantity || 1);
        pesoTotalCalculado += pesoItem * quantidade;

        const a = Number(item.altura || item.height || item.dsAltura || 10);
        const c = Number(item.comprimento || item.length || item.dsComprimento || 20);
        const l = Number(item.largura || item.width || item.dsLargura || 20);

        if (a > maiorAltura) maiorAltura = a;
        if (c > maiorComprimento) maiorComprimento = c;
        if (l > maiorLargura) maiorLargura = l;
      });
    } else {
      pesoTotalCalculado = Number(pacote?.peso || 0.5);
    }

    if (pesoTotalCalculado <= 0) pesoTotalCalculado = 0.1;

    const pacoteSeguro = {
      largura: maiorLargura,
      altura: maiorAltura,
      comprimento: maiorComprimento,
      peso: pesoTotalCalculado
    };

    const IsMelhorEnvioSandbox = dados?.melhorEnvioSandbox === true;
    const UrlMelhorEnvio = IsMelhorEnvioSandbox
      ? 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate'
      : 'https://melhorenvio.com.br/api/v2/me/shipment/calculate';

    console.log("📦 DADOS ENVIADOS PARA O MELHOR ENVIO:", {
      url: UrlMelhorEnvio,
      cepOrigem,
      cepDestino: cepDestino.replace(/\D/g, ""),
      pacote: pacoteSeguro,
      temToken: !!token
    });

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
        to: { postal_code: cepDestino.replace(/\D/g, "") },
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

    if (!response.ok) {
      const errorText = await response.text();
      console.log("🚨 RESPOSTA DE ERRO DO MELHOR ENVIO:", response.status, errorText);
    }

    if (response.status === 401) {
      console.error("🚨 Melhor Envio retornou 401. Verifique se o token inserido é válido.");
      return NextResponse.json({ error: "Token do Melhor Envio inválido ou expirado." }, { status: 401 });
    }

    const responseText = await response.text();
    let data: any = {};

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({ error: "Resposta inválida da API de frete." }, { status: 502 });
    }

    if (!response.ok || data.message) {
      return NextResponse.json({ error: data.message || "Falha na cotação." }, { status: response.status });
    }

    if (Array.isArray(data)) {
      data.forEach((servico: any) => {
        if (servico.error) {
          console.log(`⚠️ Transportadora ${servico.name} (${servico.company?.name}) retornou erro:`, servico.error);
        }
      });

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
    console.error("🚨 Erro na API de frete:", error);
    return NextResponse.json({ error: "Erro interno ao processar frete." }, { status: 500 });
  }
}