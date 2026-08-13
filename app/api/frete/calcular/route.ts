import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { cepDestino, pacote, lojistaId, itensFiltrados } = body;

    // 🔄 Suporte flexível: Se a API recebeu um "pedido" inteiro em vez de cepDestino isolado
    if (!cepDestino && body.endereco) {
      cepDestino =
        body.endereco.dsCepCliente ||
        body.endereco.cep ||
        body.cliente?.dsCepCliente ||
        body.cliente?.cep;
    }
    if (!lojistaId && body.lojistaIdApp) {
      lojistaId = body.lojistaIdApp;
    }
    if (!itensFiltrados && body.itens) {
      itensFiltrados = body.itens;
    }

    if (!lojistaId || !cepDestino) {
      return NextResponse.json(
        { error: "Dados obrigatórios ausentes (lojistaId ou cepDestino)." },
        { status: 400 },
      );
    }

    // Sanitiza o CEP de destino
    const cepDestinoLimpo = String(cepDestino).replace(/\D/g, "");
    if (cepDestinoLimpo.length !== 8) {
      return NextResponse.json(
        { error: "CEP de destino inválido." },
        { status: 400 },
      );
    }

    // 🎯 Busca o lojista usando o dbAdmin (Server-Side seguro)
    let dados: any = null;

    try {
      const lojistaDoc = await dbAdmin
        .collection("lojistas")
        .doc(lojistaId)
        .get();
      if (lojistaDoc.exists) {
        dados = lojistaDoc.data();
      }
    } catch (e) {
      // Caso o lojistaId passado seja na verdade um slug, tentamos buscar pelo campo de slug
    }

    if (!dados) {
      let snapSlug = await dbAdmin
        .collection("lojistas")
        .where("dsSlug", "==", lojistaId)
        .limit(1)
        .get();
      if (!snapSlug.empty) {
        dados = snapSlug.docs[0].data();
      } else {
        snapSlug = await dbAdmin
          .collection("lojistas")
          .where("dadosLoja.dsSlug", "==", lojistaId)
          .limit(1)
          .get();
        if (!snapSlug.empty) {
          dados = snapSlug.docs[0].data();
        }
      }
    }

    if (!dados) {
      return NextResponse.json(
        { error: "Lojista não encontrado." },
        { status: 404 },
      );
    }

    // ✨ Verificação rigorosa do ambiente Sandbox vs Produção
    const isSandbox =
      dados?.melhorEnvioSandbox === true ||
      dados?.dadosLoja?.melhorEnvioSandbox === true ||
      dados?.sistema?.melhorEnvioSandbox === true;

    // Seleciona o token estritamente correspondente ao ambiente ativado
    let token = "";
    if (isSandbox) {
      token = dados?.sistema?.dsTokenMelhorEnvioSandbox || dados?.tokenMelhorEnvioSandbox || "";
    } else {
      token =
        dados?.sistema?.dsTokenMelhorEnvio || 
        dados?.tokenMelhorEnvio ||
        dados?.dadosLoja?.dsTokenMelhorEnvio || "";
    }

    const cepOrigem = String(
      dados?.dsCepLoja || dados?.dadosLoja?.dsCepLoja || dados?.cep || "",
    ).replace(/\D/g, "");

    // ✨ Captura as flags e configurações centralizadas no objeto 'sistema'
    const sistema = dados?.sistema || {};
    const transportadorasAtivas =
      sistema.dsTransportadoras || dados?.Transportadoras || {};

    // Configurações de Regras do Lojista com tratamento blindado (aceita booleano ou string "true"/"false")
    const transportadoraAtivoGeral = sistema.isTransportadoraAtivo ?? true;
    const retiradaLojaAtiva =
      sistema.isRetiradaLoja === true || sistema.isRetiradaLoja === "true";
    const entregaLocalAtiva =
      sistema.isFreteLocal === true ||
      sistema.isFreteLocal === "true" ||
      dados?.isFreteLocal === true;

    // 🛠️ Tratamento blindado para aceitar número ou string com vírgula/ponto do Firebase (ex: "1,22" ou 1.22 -> 1.22)
    const valorFreteLocalBruto =
      sistema.vlFreteLocal ??
      dados?.vlFreteLocal ??
      dados?.dadosLoja?.vlFreteLocal ??
      0;

    let valorFreteLocalFixo = 0;
    if (typeof valorFreteLocalBruto === "string") {
      valorFreteLocalFixo =
        parseFloat(valorFreteLocalBruto.replace(/\./g, "").replace(",", ".")) ||
        0;
    } else {
      valorFreteLocalFixo = Number(valorFreteLocalBruto) || 0;
    }

    const cidadeLoja = String(
      dados?.dadosLoja?.dsCidadeLoja || dados?.cidade || "",
    )
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Consulta a cidade do cliente via ViaCEP para validar a Entrega Local e a Retirada na Loja
    let cidadeCliente = "";
    try {
      const rVia = await fetch(
        `https://viacep.com.br/ws/${cepDestinoLimpo}/json/`,
      );
      const dadosClienteVia = await rVia.json();
      if (!dadosClienteVia.erro && dadosClienteVia.localidade) {
        cidadeCliente = dadosClienteVia.localidade
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      }
    } catch (err) {
      console.error("Erro ao consultar ViaCEP no back-end:", err);
    }

    const mesmaCidade =
      cidadeCliente && cidadeLoja && cidadeCliente === cidadeLoja;
    const mesmoCepLoja = cepDestinoLimpo === cepOrigem;

    const apenasItensComFrete = Array.isArray(itensFiltrados)
      ? itensFiltrados.filter((item: any) => item.precisaFrete !== false)
      : [];

    if (
      Array.isArray(itensFiltrados) &&
      itensFiltrados.length > 0 &&
      apenasItensComFrete.length === 0
    ) {
      return NextResponse.json([]);
    }

    let fretesFiltrados: any[] = [];

    // 🚚 Se o lojista ATIVOU as transportadoras e possui token e CEP de origem, consulta o Melhor Envio
    if (transportadoraAtivoGeral && token && cepOrigem.length === 8) {
      let pesoTotalCalculado = 0;
      let maiorLargura = 11;
      let maiorAltura = 2;
      let maiorComprimento = 16;

      if (apenasItensComFrete.length > 0) {
        apenasItensComFrete.forEach((item: any) => {
          const pesoItem = Number(
            item.weight || item.peso || item.dsPeso || 0.2,
          );
          const quantidade = Number(
            item.qty || item.quantity || item.quantidade || 1,
          );
          pesoTotalCalculado += pesoItem * quantidade;

          const a = Number(item.height || item.altura || item.dsAltura || 2);
          const c = Number(
            item.length || item.comprimento || item.dsComprimento || 16,
          );
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
        peso: pesoTotalCalculado,
      };

      const UrlMelhorEnvio = isSandbox
        ? "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate"
        : "https://melhorenvio.com.br/api/v2/me/shipment/calculate";

      const response = await fetch(UrlMelhorEnvio, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${String(token).trim()}`,
          "User-Agent": "StoreToYou (contato@storetoyou.com)",
        },
        body: JSON.stringify({
          from: { postal_code: cepOrigem },
          to: { postal_code: cepDestinoLimpo },
          volumes: [
            {
              width: pacoteSeguro.largura,
              height: pacoteSeguro.altura,
              length: pacoteSeguro.comprimento,
              weight: pacoteSeguro.peso,
            },
          ],
        }),
      });

      const responseText = await response.text();
      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Se der erro no parse, prossegue com lista vazia de transportadoras
      }

      if (response.ok && Array.isArray(data)) {
        fretesFiltrados = data
          .filter((servico: any) => {
            if (servico.error) return false;

            const nomeEmpresa = String(
              servico.company?.name || "",
            ).toLowerCase();
            const nomeServico = String(servico.name || "").toLowerCase();

            if (
              !transportadorasAtivas ||
              Object.keys(transportadorasAtivas).length === 0
            ) {
              return true;
            }

            if (
              nomeEmpresa.includes("correios") ||
              nomeServico.includes("pac") ||
              nomeServico.includes("sedex")
            ) {
              return (
                transportadorasAtivas.correios === true ||
                transportadorasAtivas.correios === undefined
              );
            }

            if (nomeEmpresa.includes("azul")) {
              return (
                transportadorasAtivas.azul === true ||
                transportadorasAtivas.azul === undefined
              );
            }

            if (nomeEmpresa.includes("jadlog")) {
              return (
                transportadorasAtivas.jadlog === true ||
                transportadorasAtivas.jadlog === undefined
              );
            }

            if (nomeEmpresa.includes("latam")) {
              return (
                transportadorasAtivas.latam === true ||
                transportadorasAtivas.latam === undefined
              );
            }

            return true;
          })
          .map((servico: any) => ({
            id: servico.id,
            name: servico.name,
            company: servico.company?.name || "Transportadora",
            price: Number(servico.price),
            delivery_time: servico.delivery_time,
            custom_delivery_time: servico.custom_delivery_time,
          }));
      }
    }

    // 🧹 Limpeza de segurança para evitar duplicidades na lista de fretes
    fretesFiltrados = fretesFiltrados.filter(
      (f: any) => f.id !== "retirar_loja" && f.id !== "entrega_local",
    );

    // 📍 Injeta Retirada na Loja APENAS SE o lojista explicitamente ativou `isRetiradaLoja` e for do mesmo CEP/cidade
    if (retiradaLojaAtiva && (mesmoCepLoja || mesmaCidade)) {
      fretesFiltrados.unshift({
        id: "retirar_loja",
        name: "Retirar na Loja",
        price: 0,
        delivery_time: 0,
      });
    }

    // 🛵 Injeta Entrega Local se estiver ativa (`isFreteLocal: true`), for da mesma cidade e usando o valor correto `vlFreteLocal`
    if (entregaLocalAtiva && mesmaCidade) {
      fretesFiltrados.unshift({
        id: "entrega_local",
        name: "Entrega Local",
        price: valorFreteLocalFixo,
        delivery_time: 1,
      });
    }

    return NextResponse.json(fretesFiltrados);
  } catch (error: any) {
    console.error("🚨 Erro interno na API de frete:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao processar frete.",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}