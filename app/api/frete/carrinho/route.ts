import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pedido, lojistaId } = body;

    if (!pedido || !lojistaId || !pedido.cliente) {
      return NextResponse.json({ error: "Dados insuficientes para gerar a etiqueta." }, { status: 400 });
    }

    // 🎯 Busca o lojista de forma flexível (por ID direto ou pelas variações de slug)
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

    const dadosLojista = lojistaSnap.data();

    // 🎯 Puxa o token, ambiente sandbox e transportadoras
    const TOKEN = dadosLojista?.sistema?.dsTokenMelhorEnvio || dadosLojista?.tokenMelhorEnvio;
    const CEP_ORIGEM = String(dadosLojista?.dsCepLoja || dadosLojista?.dadosLoja?.dsCepLoja || dadosLojista?.cep || "").replace(/\D/g, "");
    const transportadorasPermitidas = dadosLojista?.sistema?.dstransportadoras || dadosLojista?.transportadoras || {};
    const IsMelhorEnvioSandbox = dadosLojista?.melhorEnvioSandbox === true;

    const freteEscolhido = pedido.cliente?.freteSelecionado;
    const nomeTransportadora = String(freteEscolhido?.company || freteEscolhido?.name || "").toLowerCase();

    // Se for retirada na loja, não deve chamar a API de etiquetas
    if (freteEscolhido?.id === "retirar_loja") {
      return NextResponse.json({ error: "Este pedido é de retirada na loja e não gera etiqueta de envio." }, { status: 400 });
    }

    let permitida = false;
    if (nomeTransportadora.includes("azul") && transportadorasPermitidas.azul === true) permitida = true;
    if (nomeTransportadora.includes("jadlog") && transportadorasPermitidas.jadlog === true) permitida = true;
    if (nomeTransportadora.includes("latam") && transportadorasPermitidas.latam === true) permitida = true;
    if ((nomeTransportadora.includes("correios") || nomeTransportadora.includes("pac") || nomeTransportadora.includes("sedex")) && transportadorasPermitidas.correios === true) permitida = true;

    // Se o lojista não possui configuração restrita de transportadoras ativa, permite por padrão
    if (!transportadorasPermitidas || Object.keys(transportadorasPermitidas).length === 0) {
      permitida = true;
    }

    if (!permitida) {
      return NextResponse.json({ error: `A transportadora ${nomeTransportadora} não está ativa para este lojista no momento.` }, { status: 403 });
    }

    if (!TOKEN || CEP_ORIGEM.length !== 8) {
      return NextResponse.json({ error: "Lojista com configuração de frete incompleta (Token ou CEP de origem inválido)." }, { status: 500 });
    }

    // Validação segura do ID do serviço do Melhor Envio
    const idServicoMelhorEnvio = Number(freteEscolhido?.id);
    if (!idServicoMelhorEnvio || isNaN(idServicoMelhorEnvio)) {
      return NextResponse.json({ error: "ID do serviço de frete selecionado é inválido." }, { status: 400 });
    }

    const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
    if (itens.length === 0) {
      return NextResponse.json({ error: "O pedido não possui itens para o envio." }, { status: 400 });
    }

    const maiorComprimento = Math.max(16, ...itens.map((i: any) => Number(i.comprimento || i.length || 20)));
    const maiorLargura = Math.max(11, ...itens.map((i: any) => Number(i.largura || i.width || 20)));
    const somaAlturas = Math.max(2, itens.reduce((acc: number, i: any) => acc + (Number(i.altura || i.height || 10) * Number(i.qty || i.quantity || 1)), 0));
    const somaPesos = Math.max(0.1, itens.reduce((acc: number, i: any) => acc + (Number(i.peso || i.weight || 0.3) * Number(i.qty || i.quantity || 1)), 0));

    const payload = {
      service: idServicoMelhorEnvio, 
      from: {
        name: String(dadosLojista?.dadosLoja?.dsNomeLoja || dadosLojista?.nomeLoja || "Remetente").substring(0, 60),
        phone: String(dadosLojista?.dadosLoja?.nrWhatssapLoja || "").replace(/\D/g, ""),
        email: String(dadosLojista?.email || "contato@festaemtopo.com"),
        document: String(dadosLojista?.dadosLoja?.nrCnpjCpfLoja || "").replace(/\D/g, ""),
        address: String(dadosLojista?.dadosLoja?.dsRuaLoja || ""),
        number: String(dadosLojista?.dadosLoja?.nrNumeroLoja || "S/N"),
        district: String(dadosLojista?.dadosLoja?.dsBairroLoja || ""),
        city: String(dadosLojista?.dadosLoja?.dsCidadeLoja || ""),
        state_abbr: String(dadosLojista?.dadosLoja?.dsUfLoja || "").toUpperCase().substring(0, 2),
        postal_code: CEP_ORIGEM
      },
      to: {
        name: String(pedido.cliente?.nome || "Cliente Destinatário").substring(0, 60),
        phone: String(pedido.cliente?.whatsapp || "").replace(/\D/g, ""),
        email: String(pedido.cliente?.email || "cliente@email.com"),
        document: String(pedido.cliente?.cpf || "").replace(/\D/g, ""),
        address: String(pedido.cliente?.endereco?.rua || ""),
        number: String(pedido.cliente?.endereco?.numero || "S/N"),
        district: String(pedido.cliente?.endereco?.bairro || ""),
        city: String(pedido.cliente?.endereco?.cidade || pedido.cliente?.endereco?.city || ""),
        state_abbr: String(pedido.cliente?.endereco?.uf || "").toUpperCase().substring(0, 2),
        postal_code: String(pedido.cliente?.endereco?.cep || pedido.cliente?.cep || "").replace(/\D/g, "")
      },
      products: itens.map((item: any) => ({
        name: String(item.nome || item.title || "Produto").substring(0, 40),
        quantity: Number(item.qty || item.quantity || 1),
        unitary_value: Number(item.preco || item.price || 0)
      })),
      volumes: [{
        height: somaAlturas,
        width: maiorLargura,
        length: maiorComprimento,
        weight: somaPesos
      }],
      options: {
        insurance_value: Number(itens.reduce((a: number, b: any) => a + (Number(b.preco || b.price || 0) * Number(b.qty || b.quantity || 1)), 0)),
        non_commercial: true 
      }
    };

    const UrlMelhorEnvio = IsMelhorEnvioSandbox
      ? 'https://sandbox.melhorenvio.com.br/api/v2/me/cart'
      : 'https://melhorenvio.com.br/api/v2/me/cart';

    const response = await fetch(UrlMelhorEnvio, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${String(TOKEN).trim()}`,
        'User-Agent': 'FestaEmTopo (contato@festaemtopo.com)'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let result: any = {};

    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({ error: "Resposta inválida da API do Melhor Envio." }, { status: 502 });
    }

    if (!response.ok) {
      console.error("🚨 Erro na API do Melhor Envio:", result);
      return NextResponse.json({ 
        error: "Falha ao adicionar etiqueta ao carrinho.", 
        detalhes: result.message || result 
      }, { status: response.status });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("🚨 Erro Crítico na Rota de Carrinho do Melhor Envio:", error);
    return NextResponse.json({ error: "Erro interno no processamento da etiqueta." }, { status: 500 });
  }
}