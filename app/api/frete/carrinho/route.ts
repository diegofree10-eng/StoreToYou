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

    // 🎯 Puxa o token e transportadoras de dentro de 'sistema'
    const TOKEN = dadosLojista?.sistema?.dsTokenMelhorEnvio || dadosLojista?.tokenMelhorEnvio;
    const CEP_ORIGEM = String(dadosLojista?.dsCepLoja || dadosLojista?.dadosLoja?.dsCepLoja || dadosLojista?.cep || "").replace(/\D/g, "");
    const transportadorasPermitidas = dadosLojista?.sistema?.dstransportadoras || dadosLojista?.transportadoras || {};

    const freteEscolhido = pedido.cliente?.freteSelecionado;
    const nomeTransportadora = String(freteEscolhido?.company || freteEscolhido?.name || "").toLowerCase();

    let permitida = false;
    if (nomeTransportadora.includes("azul") && transportadorasPermitidas.azul === true) permitida = true;
    if (nomeTransportadora.includes("jadlog") && transportadorasPermitidas.jadlog === true) permitida = true;
    if (nomeTransportadora.includes("latam") && transportadorasPermitidas.latam === true) permitida = true;
    if ((nomeTransportadora.includes("correios") || nomeTransportadora.includes("pac") || nomeTransportadora.includes("sedex")) && transportadorasPermitidas.correios === true) permitida = true;

    if (!permitida && freteEscolhido?.id !== "retirar_loja") {
      return NextResponse.json({ error: `A transportadora ${nomeTransportadora} não está ativa para este lojista no momento.` }, { status: 403 });
    }

    if (!TOKEN || !CEP_ORIGEM) {
      return NextResponse.json({ error: "Lojista com configuração de frete incompleta (Token ou CEP ausente)." }, { status: 500 });
    }

    const idServicoMelhorEnvio = Number(freteEscolhido?.id || 3);

    const maiorComprimento = Math.max(...pedido.itens.map((i: any) => Number(i.comprimento || 20)));
    const maiorLargura = Math.max(...pedido.itens.map((i: any) => Number(i.largura || 20)));
    const somaAlturas = pedido.itens.reduce((acc: number, i: any) => acc + (Number(i.altura || 10) * Number(i.qty || 1)), 0);
    const somaPesos = pedido.itens.reduce((acc: number, i: any) => acc + (Number(i.peso || 0.3) * Number(i.qty || 1)), 0);

    const payload = {
      service: idServicoMelhorEnvio, 
      from: {
        name: (dadosLojista?.dadosLoja?.dsNomeLoja || dadosLojista?.nomeLoja || "Remetente").substring(0, 60),
        phone: dadosLojista?.dadosLoja?.nrWhatssapLoja?.replace(/\D/g, "") || "",
        email: dadosLojista?.email || "contato@festaemtopo.com",
        document: dadosLojista?.dadosLoja?.nrCnpjCpfLoja?.replace(/\D/g, "") || "",
        address: dadosLojista?.dadosLoja?.dsRuaLoja || "",
        number: dadosLojista?.dadosLoja?.nrNumeroLoja || "S/N",
        district: dadosLojista?.dadosLoja?.dsBairroLoja || "",
        city: dadosLojista?.dadosLoja?.dsCidadeLoja || "",
        state_abbr: String(dadosLojista?.dadosLoja?.dsUfLoja || "").toUpperCase().substring(0, 2),
        postal_code: CEP_ORIGEM
      },
      to: {
        name: pedido.cliente?.nome || "Cliente Destinatário",
        phone: String(pedido.cliente?.whatsapp || "").replace(/\D/g, ""),
        email: pedido.cliente?.email || "cliente@email.com",
        document: String(pedido.cliente?.cpf || "").replace(/\D/g, ""),
        address: pedido.cliente?.endereco?.rua || "",
        number: pedido.cliente?.endereco?.numero || "S/N",
        district: pedido.cliente?.endereco?.bairro || "",
        city: pedido.cliente?.endereco?.cidade || pedido.cliente?.endereco?.city || "",
        state_abbr: String(pedido.cliente?.endereco?.uf || "").toUpperCase().substring(0, 2),
        postal_code: String(pedido.cliente?.endereco?.cep || pedido.cliente?.cep || "").replace(/\D/g, "")
      },
      products: pedido.itens.map((item: any) => ({
        name: (item.nome || item.title || "Produto").substring(0, 40),
        quantity: Number(item.qty || item.quantity || 1),
        unitary_value: Number(item.preco || item.price || 0)
      })),
      volumes: [{
        height: Math.max(10, somaAlturas),
        width: Math.max(15, maiorLargura),
        length: Math.max(15, maiorComprimento),
        weight: Math.max(0.1, somaPesos)
      }],
      options: {
        insurance_value: Number(pedido.itens.reduce((a: number, b: any) => a + (Number(b.preco || b.price || 0) * Number(b.qty || b.quantity || 1)), 0)),
        non_commercial: true 
      }
    };

    const response = await fetch('https://melhorenvio.com.br/api/v2/me/cart', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN.trim()}`,
        'User-Agent': 'FestaEmTopo (contato@festaemtopo.com)'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("🚨 Erro na API do Melhor Envio:", result);
      return NextResponse.json({ 
        error: "Falha ao adicionar etiqueta ao carrinho.", 
        detalhes: result.message || result 
      }, { status: response.status });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("🚨 Erro Crítico na Rota:", error);
    return NextResponse.json({ error: "Erro interno no processamento do frete." }, { status: 500 });
  }
}