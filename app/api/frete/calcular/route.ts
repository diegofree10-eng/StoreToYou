import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebaseAdmin";
import { calcularEmbalagemEspecificaDoPedido } from "@/utils/calculoEmbalagens";

// 🌐 Função para traduzir códigos e mensagens brutas do Melhor Envio para o português claro
function traduzirErroMelhorEnvio(
  mensagemBruta: string,
  status: number,
): string {
  const msg = mensagemBruta.toLowerCase();

  if (status === 401 || msg.includes("unauthorized") || msg.includes("token")) {
    return "Token de acesso do Melhor Envio inválido ou expirado. Por favor, reconecte sua conta nas configurações.";
  }
  if (msg.includes("from postal code") || msg.includes("cep de origem")) {
    return "O CEP de origem da sua loja cadastrado no painel é inválido ou não foi encontrado.";
  }
  if (msg.includes("to postal code") || msg.includes("cep de destino")) {
    return "O CEP de destino informado pelo cliente é inválido ou inexistente.";
  }
  if (
    msg.includes("weight") ||
    msg.includes("pesos") ||
    msg.includes("volume")
  ) {
    return "As dimensões ou o peso dos produtos ultrapassam os limites permitidos pelas transportadoras.";
  }
  if (msg.includes("balance") || msg.includes("saldo")) {
    return "Saldo insuficiente na carteira do Melhor Envio para realizar esta operação.";
  }
  if (status === 429 || msg.includes("too many requests")) {
    return "Muitas consultas simultâneas ao Melhor Envio. Tente novamente em alguns instantes.";
  }
  if (status >= 500) {
    return "Os servidores do Melhor Envio estão instáveis no momento. Tente mais tarde.";
  }

  return `Erro na integração com Melhor Envio: ${mensagemBruta || "Falha desconhecida."}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    let { cepDestino, pacote, lojistaId, itensFiltrados } = body;

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
        { error: "Dados obrigatórios ausentes (lojistaId or cepDestino)." },
        { status: 400 },
      );
    }

    const cepDestinoLimpo = String(cepDestino).replace(/\D/g, "");
    if (cepDestinoLimpo.length !== 8) {
      return NextResponse.json(
        { error: "CEP de destino inválido." },
        { status: 400 },
      );
    }

    let dados: any = null;
    let lojistaDocId = lojistaId;

    try {
      const lojistaDoc = await dbAdmin
        .collection("lojistas")
        .doc(lojistaId)
        .get();
      if (lojistaDoc.exists) {
        dados = lojistaDoc.data();
      }
    } catch (e) {}

    if (!dados) {
      let snapSlug = await dbAdmin
        .collection("lojistas")
        .where("dsSlug", "==", lojistaId)
        .limit(1)
        .get();
      if (!snapSlug.empty) {
        dados = snapSlug.docs[0].data();
        lojistaDocId = snapSlug.docs[0].id;
      } else {
        snapSlug = await dbAdmin
          .collection("lojistas")
          .where("dadosLoja.dsSlug", "==", lojistaId)
          .limit(1)
          .get();
        if (!snapSlug.empty) {
          dados = snapSlug.docs[0].data();
          lojistaDocId = snapSlug.docs[0].id;
        }
      }
    }

    if (!dados) {
      return NextResponse.json(
        { error: "Lojista não encontrado." },
        { status: 404 },
      );
    }

    const isSandbox =
      dados?.melhorEnvioSandbox === true ||
      dados?.dadosLoja?.melhorEnvioSandbox === true ||
      dados?.sistema?.melhorEnvioSandbox === true;

    let token = "";
    if (isSandbox) {
      token =
        dados?.sistema?.dsTokenMelhorEnvioSandbox ||
        dados?.tokenMelhorEnvioSandbox ||
        "";
    } else {
      token =
        dados?.sistema?.dsTokenMelhorEnvio ||
        dados?.tokenMelhorEnvio ||
        dados?.dadosLoja?.dsTokenMelhorEnvio ||
        "";
    }

    const cepOrigem = String(
      dados?.dsCepLoja || dados?.dadosLoja?.dsCepLoja || dados?.cep || "",
    ).replace(/\D/g, "");

    const sistema = dados?.sistema || {};
    const transportadorasAtivas =
      sistema.dsTransportadoras || dados?.Transportadoras || {};

    const transportadoraAtivoGeral = sistema.isTransportadoraAtivo ?? true;
    const retiradaLojaAtiva =
      sistema.isRetiradaLoja === true || sistema.isRetiradaLoja === "true";
    const entregaLocalAtiva =
      sistema.isFreteLocal === true ||
      sistema.isFreteLocal === "true" ||
      dados?.isFreteLocal === true;

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
      ? itensFiltrados.filter(
          (item: any) =>
            item.precisaFrete !== false && item.isPrecisaFreteProduto !== false,
        )
      : [];

    if (
      Array.isArray(itensFiltrados) &&
      itensFiltrados.length > 0 &&
      apenasItensComFrete.length === 0
    ) {
      return NextResponse.json({
        opcoesFrete: [],
        embalagemRecomendada: null,
        Embalagem: null,
      });
    }

    // --- 📦 MOTOR DE CUBAGEM E EMPILHAMENTO UNIFICADO VIA UTILITÁRIO ---
    let insumoRecomendadoId = "";
    let insumoRecomendadoNome = "Embalagem Padrão";
    let insumoRecomendadoCusto = 0;
    let insumoRecomendadoTipo = "envelope_seguranca";

    let pacoteSeguro = {
      largura: Number(pacote?.largura || 11),
      altura: Number(pacote?.altura || 2),
      comprimento: Number(pacote?.comprimento || 16),
      peso: Number(pacote?.peso || 0.5),
    };

    try {
      // 🔄 Consulta alterada para a nova subcoleção "embalagem"
      const insumosSnap = await dbAdmin
        .collection("lojistas")
        .doc(lojistaDocId)
        .collection("embalagem")
        .get();
      const insumosDisponiveis = insumosSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const resultadoCalculo = calcularEmbalagemEspecificaDoPedido(
        apenasItensComFrete,
        insumosDisponiveis,
      );

      insumoRecomendadoId = resultadoCalculo.embalagemPadrao.id || "";
      insumoRecomendadoNome =
        resultadoCalculo.embalagemPadrao.dsModeloEmbalagemRecomendado;
      insumoRecomendadoCusto =
        resultadoCalculo.embalagemPadrao.vlCustoEmbalagemRecomendado;
      insumoRecomendadoTipo = resultadoCalculo.embalagemPadrao.dsTipoEmbalagem;

      pacoteSeguro = {
        largura: resultadoCalculo.dimensoesPacoteFinal.largura,
        altura: resultadoCalculo.dimensoesPacoteFinal.altura,
        comprimento: resultadoCalculo.dimensoesPacoteFinal.comprimento,
        peso: resultadoCalculo.dimensoesPacoteFinal.pesoTotal,
      };
    } catch (embErr) {
      console.error(
        "Erro ao calcular embalagem e empilhamento na API de frete:",
        embErr,
      );
    }

    let fretesFiltrados: any[] = [];

    if (transportadoraAtivoGeral && token && cepOrigem.length === 8) {
      const UrlMelhorEnvio = isSandbox
        ? "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate"
        : "https://melhorenvio.com.br/api/v2/me/shipment/calculate";

      const payloadEnvio = {
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
      };

      console.log(
        `📦 [API FRETE] Consultando Melhor Envio (${isSandbox ? "SANDBOX" : "PRODUÇÃO"})`,
        {
          cepOrigem,
          cepDestino: cepDestinoLimpo,
          pacote: pacoteSeguro,
        },
      );

      const response = await fetch(UrlMelhorEnvio, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${String(token).trim()}`,
          "User-Agent": "StoreToYou (contato@storetoyou.com)",
        },
        body: JSON.stringify(payloadEnvio),
      });

      const responseText = await response.text();
      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch (e) {}

      console.log(
        `📥 [API FRETE] Resposta bruta do Melhor Envio (Status ${response.status}):`,
        responseText,
      );

      if (
        !response.ok ||
        data.error ||
        data.message ||
        (Array.isArray(data) && data.length === 0)
      ) {
        const mensagemBruta =
          data.error || data.message || responseText || "Erro desconhecido";
        const mensagemTraduzida = traduzirErroMelhorEnvio(
          String(mensagemBruta),
          response.status,
        );

        return NextResponse.json({ error: mensagemTraduzida }, { status: 400 });
      }

      if (Array.isArray(data)) {
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

    fretesFiltrados = fretesFiltrados.filter(
      (f: any) => f.id !== "retirar_loja" && f.id !== "entrega_local",
    );

    if (retiradaLojaAtiva && (mesmoCepLoja || mesmaCidade)) {
      fretesFiltrados.unshift({
        id: "retirar_loja",
        name: "Retirar na Loja",
        price: 0,
        delivery_time: 0,
      });
    }

    if (entregaLocalAtiva && mesmaCidade) {
      fretesFiltrados.unshift({
        id: "entrega_local",
        name: "Entrega Local",
        price: valorFreteLocalFixo,
        delivery_time: 1,
      });
    }

    // 🛡️ TRATAMENTO DE FALLBACK: Se nenhuma transportadora comercial for retornada (ex: restrição de rota),
    // injeta uma opção padrão de envio manual/personalizado para que o lojista não fique travado.
    if (fretesFiltrados.length === 0) {
      console.warn(
        `⚠️ [API FRETE] Nenhuma transportadora retornada pelo Melhor Envio para o CEP ${cepDestinoLimpo}. Injetando frete manual de fallback.`,
      );

      fretesFiltrados.push({
        id: "envio_manual_personalizado",
        name: "Envio Manual / Personalizado",
        company: "Transporte Próprio",
        price: 0,
        delivery_time: 3,
      });
    }

    // Retorno estruturado contendo as opções de frete, a recomendação e o objeto pronto para o helper salvar no Firebase
    return NextResponse.json({
      opcoesFrete: fretesFiltrados,
      Embalagem: {
        recomendada: {
          id: insumoRecomendadoId,
          dsModeloEmbalagemRecomendado: insumoRecomendadoNome,
          vlCustoEmbalagemRecomendado: insumoRecomendadoCusto,
          dsTipoEmbalagem: insumoRecomendadoTipo,
        },
        escolhida: {
          id: insumoRecomendadoId, // Começa igual à recomendada por padrão
          dsModeloEmbalagemEscolhida: insumoRecomendadoNome,
          vlCustoEmbalagemEscolhida: insumoRecomendadoCusto,
          dsTipoEmbalagem: insumoRecomendadoTipo,
        },
      },
    });
  } catch (error: any) {
    console.error("🚨 Erro interno na API de frete:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao processar frete.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
