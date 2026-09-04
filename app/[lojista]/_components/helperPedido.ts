// app/admin/produtos/_helpers/executarFluxoPedido.ts
import { db } from "@/lib/firebase";
import {
  doc,
  runTransaction,
  collection,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { calcularEmbalagemEspecificaDoPedido } from "@/utils/calculoEmbalagens";

export const executarFluxoPedido = async ({
  lojistaId,
  lojistaSlug,
  cliente,
  endereco,
  safeCart,
  personalizacoes,
  requisitosDoBanco,
  valorSubtotalProdutos,
  valorDesconto,
  totalGeral,
  whatsappNumero,
  dadosLoja,
  logistica,
  cupomDigitado,
  freteGratisConfig,
  payloadPixBruto,
  freteSel,
  dsFormaPagamentoCarrinho = "pix",
  vlEntrada = 0,
  vlRestante = 0,
  dsPrazoRestante = "À vista",
  dsOperadorCaixa = "Balcão",
  embalagemDoCheckout = null,
  embalagemRecomendada = null, // 🌟 Parquet capturado diretamente da API de frete
}: any) => {
  try {
    // 🛡️ BLINDAGEM FINANCEIRA: Garantia de precisão matemática antes de salvar
    const subtotalFinal = Number(Number(valorSubtotalProdutos || 0).toFixed(2));
    const descontoFinal = Number(Number(valorDesconto || 0).toFixed(2));
    const freteFinal = Number(
      Number(logistica?.valorFrete || logistica?.vlFrete || 0).toFixed(2),
    );

    const totalCalculadoManual = Number(
      (subtotalFinal - descontoFinal + freteFinal).toFixed(2),
    );
    const totalGeralFinal = Number(
      Number(totalGeral || totalCalculadoManual).toFixed(2),
    );

    // 🌟 Identificação rigorosa da origem do pedido antes de prosseguir
    const origemIdentificada =
      lojistaSlug === "pdv-balcao" ||
      logistica?.origem === "Pdv" ||
      logistica?.origem === "pdv"
        ? "Pdv"
        : "Site";

    // 🌟 Incremento seguro do contador sequencial do pedido no Firebase
    const contadorRef = doc(
      db,
      "lojistas",
      lojistaId,
      "config",
      "contador_pedidos",
    );

    const numPedidoSequencial = await runTransaction(
      db,
      async (transaction) => {
        const docSnapContador = await transaction.get(contadorRef);
        let proximo = 1;
        if (docSnapContador.exists()) {
          proximo = (docSnapContador.data().ultimoNumero || 0) + 1;
        }

        transaction.set(
          contadorRef,
          { ultimoNumero: proximo },
          { merge: true },
        );

        return proximo;
      },
    );

    // 🌟 Classificação rigorosa e padronizada da forma de entrega
    const temFreteCarrinho = safeCart.some(
      (item: any) =>
        item.precisaFrete !== false && item.isPrecisaFreteProduto !== false,
    );
    let dsFormaEntregaPadrao = "transportadora";

    const formaEnviadaBruta = String(
      logistica?.dsFormaEntrega || logistica?.formaEnvio || "",
    ).toLowerCase();

    if (
      formaEnviadaBruta === "retirada" ||
      formaEnviadaBruta === "retirar_loja"
    ) {
      dsFormaEntregaPadrao = "retirada";
    } else if (formaEnviadaBruta === "entrega_local") {
      dsFormaEntregaPadrao = "entrega_local";
    } else if (formaEnviadaBruta === "transportadora") {
      dsFormaEntregaPadrao = "transportadora";
    } else if (formaEnviadaBruta === "digital" || !temFreteCarrinho) {
      const temApenasDigital = safeCart.every(
        (item: any) =>
          item.precisaFrete === false || item.isPrecisaFreteProduto === false,
      );
      dsFormaEntregaPadrao = temApenasDigital ? "digital" : "transportadora";
    } else if (
      freteSel?.id === "retirada" ||
      freteSel?.id === "retirar_loja" ||
      String(freteSel?.name || "")
        .toLowerCase()
        .includes("retirada")
    ) {
      dsFormaEntregaPadrao = "retirada";
    } else if (
      freteSel?.id === "entrega_local" ||
      String(freteSel?.name || "")
        .toLowerCase()
        .includes("entrega local")
    ) {
      dsFormaEntregaPadrao = "entrega_local";
    } else {
      dsFormaEntregaPadrao = "transportadora";
    }

    // 📦 IDENTIFICAÇÃO ANINHADA E BLINDADA DA EMBALAGEM (API -> CARRINHO -> HELPER)
    const fonteEmbalagem = embalagemRecomendada || embalagemDoCheckout || {};
    
    // Se a API retornou o formato { recomendada: {...}, escolhida: {...} }
    const recRaw = fonteEmbalagem?.recomendada || fonteEmbalagem;
    const escRaw = fonteEmbalagem?.escolhida || fonteEmbalagem;

    const dadosEmbalagemIdentificada = {
      recomendada: {
        id: recRaw?.id || recRaw?.insumoId || "cB40vmcKnP3nqInpI3yd",
        dsModeloEmbalagemRecomendado: recRaw?.dsModeloEmbalagemRecomendado || recRaw?.dsNomeEmbalagem || recRaw?.nome || "Embalagem Ecomerce 26x36",
        vlCustoEmbalagemRecomendado: Number(recRaw?.vlCustoEmbalagemRecomendado ?? recRaw?.vlCustoUnitarioEmbalagem ?? recRaw?.custo ?? 1.64),
        dsTipoEmbalagem: recRaw?.dsTipoEmbalagem || recRaw?.tipo || "envelope_seguranca",
        altura: Number(recRaw?.altura ?? 4),
        comprimento: Number(recRaw?.comprimento ?? 32),
        largura: Number(recRaw?.largura ?? 22),
        pesoEmbarque: Number(recRaw?.pesoEmbarque ?? 0),
      },
      escolhida: {
        id: escRaw?.id || escRaw?.insumoId || "cB40vmcKnP3nqInpI3yd",
        dsModeloEmbalagemEscolhida: escRaw?.dsModeloEmbalagemEscolhida || escRaw?.dsModeloEmbalagemRecomendado || escRaw?.dsNomeEmbalagem || escRaw?.nome || "Embalagem Ecomerce 26x36",
        vlCustoEmbalagemEscolhida: Number(escRaw?.vlCustoEmbalagemEscolhida ?? escRaw?.vlCustoEmbalagemRecomendado ?? escRaw?.vlCustoUnitarioEmbalagem ?? 1.64),
        dsTipoEmbalagem: escRaw?.dsTipoEmbalagem || escRaw?.tipo || "envelope_seguranca",
        altura: Number(escRaw?.altura ?? 4),
        comprimento: Number(escRaw?.comprimento ?? 32),
        largura: Number(escRaw?.largura ?? 22),
        pesoEmbarque: Number(escRaw?.pesoEmbarque ?? 0),
      }
    };

    const itensFormatados = safeCart.map((item: any, index: number) => {
      const chaveUnica = `${item.cartItemKey || item.cartItemId || item.id || "prod"}_${index}`;
      const rawRespostas =
        personalizacoes[chaveUnica] ||
        personalizacoes[item.cartItemKey] ||
        personalizacoes[item.id] ||
        personalizacoes[index] ||
        {};

      const requisitos =
        item.dsRequisitosProduto ||
        item.requisitos ||
        requisitosDoBanco?.[item.id] ||
        [];
      const respostasFormatadas: Record<string, string> = {};

      if (Array.isArray(requisitos) && requisitos.length > 0) {
        requisitos.forEach((req: any) => {
          const campoId = String(req.id || "");
          let labelBruto = String(req.label || req.nome || "Campo").trim();
          const labelLimpo = labelBruto.replace(/:+$/, "").trim();

          const val =
            rawRespostas[campoId] ||
            rawRespostas[labelBruto] ||
            rawRespostas[labelLimpo] ||
            "";

          if (val && String(val).trim() !== "") {
            respostasFormatadas[labelLimpo] = String(val).trim();
          }
        });
      } else {
        Object.keys(rawRespostas).forEach((key) => {
          if (rawRespostas[key] && String(rawRespostas[key]).trim() !== "") {
            const chaveLimpa = String(key).replace(/:+$/, "").trim();
            respostasFormatadas[chaveLimpa] = String(rawRespostas[key]).trim();
          }
        });
      }

      const nomeProdutoFinal = String(
        item.dsNomeProduto || item.dsNome || item.nome || "Produto",
      ).trim();

      let variacaoFinal = String(
        item.dsVariacaoProduto || item.variacao || "",
      ).trim();

      if (
        item.isTemVariacoesProduto === false ||
        !variacaoFinal ||
        variacaoFinal.toLowerCase() === nomeProdutoFinal.toLowerCase()
      ) {
        variacaoFinal = "";
      }

      const custoExtraido = Number(
        item.vlCustoUnitarioProduto ?? item.vlCustoUnitario ?? item.custo ?? 0,
      );

      const qtdFinal = Number(
        item.nrQuantidadeProduto || item.quantidade || item.qty || 1,
      );

      const precoFinal = Number(
        Number(item.vlPrecoProduto || item.preco || item.price || 0).toFixed(2),
      );

      return {
        idProduto: item.id || item.idProduto || "",
        dsNomeProduto: nomeProdutoFinal,
        nrQuantidadeProduto: qtdFinal,
        vlPrecoProduto: precoFinal,
        vlCustoUnitarioProduto: isNaN(custoExtraido)
          ? 0
          : Number(custoExtraido.toFixed(2)),
        dsVariacaoProduto: variacaoFinal,
        isPrecisaFreteProduto:
          item.isPrecisaFreteProduto ?? item.precisaFrete ?? true,

        dsRespostasPersonalizadasProduto: respostasFormatadas,

        dsFotoCapaProduto:
          item.dsFotoProduto ||
          item.dsCapaProduto ||
          item.foto ||
          item.imagem ||
          "",
        
        dsSkuProduto: item.dsSkuProduto || item.sku || "SEM-SKU",
        dsGtinProduto: item.dsGtinProduto || item.gtin || "",

        nrDiasProducaoProduto: Number(
          item.nrDiasProducaoProduto || item.nrDiasProducao || 0,
        ),
        dsTipoProduto: String(item.dsTipoProduto || "Fisico_Sem"),
        nrPesoProduto: Number(item.nrPesoProduto || item.weight || 0.3),
        nrAlturaProduto: Number(item.nrAlturaProduto || item.height || 0),
        nrLarguraProduto: Number(item.nrLarguraProduto || item.width || 0),
        nrComprimentoProduto: Number(
          item.nrComprimentoProduto || item.length || 0,
        ),

        insumosComposicao: item.insumosComposicao || [],
        vlOutrosCustosProduto: item.vlOutrosCustosProduto || 0,
        movimentarEstoque: item.movimentarEstoque ?? true,
        movimentarEstoqueComposicao: item.movimentarEstoqueComposicao ?? true,
      };
    });

    const dadosCliente = {
      nmNomeCliente: cliente?.nmNomeCliente || cliente?.nome || "Cliente",
      dsCpfCliente: cliente?.dsCpfCliente || cliente?.cpf || "",
      dsEmailCliente: cliente?.dsEmailCliente || cliente?.email || "",
      dsTelefoneCliente:
        cliente?.dsTelefoneCliente || cliente?.dsTelefone || "",
    };

    const dadosEnderecoCliente = {
      dsCepCliente:
        endereco?.dsCepCliente || endereco?.cep || cliente?.dsCepCliente || "",
      dsRuaCliente: endereco?.dsRuaCliente || endereco?.rua || "",
      dsNumeroCliente: endereco?.dsNumeroCliente || endereco?.numero || "",
      dsBairroCliente: endereco?.dsBairroCliente || endereco?.bairro || "",
      dsCidadeCliente: endereco?.dsCidadeCliente || endereco?.cidade || "",
      dsUfCliente: endereco?.dsUfCliente || endereco?.uf || "",
      dsComplementoCliente:
        endereco?.dsComplementoCliente || endereco?.complemento || "",
    };

    const novoPedidoRef = doc(collection(db, "lojistas", lojistaId, "pedidos"));
    const pedidoIdGerado = novoPedidoRef.id;

    const operadorFinal =
      origemIdentificada === "Pdv"
        ? dsOperadorCaixa || "Balcão"
        : "Site / E-commerce";

    const formaEntregaNat = String(logistica?.dsFormaEntrega || "").trim();

    const ehRetiradaProntaEntrega =
      formaEntregaNat === "retirada" &&
      safeCart.every(
        (item: any) => String(item.dsTipoProduto || "").trim() === "Fisico_Sem",
      );

    const statusInicialPedido = ehRetiradaProntaEntrega ? "Concluído" : "";

    const dadosDoPedidoParaSalvar = {
      nrIdpedido: pedidoIdGerado,
      dsOrigemPedido: origemIdentificada,
      dsCliente: dadosCliente,
      dsEndereco: dadosEnderecoCliente,
      nrNumeroPedido: Number(numPedidoSequencial),
      data: new Date().toISOString(),
      timestamp: serverTimestamp(),
      dsStatusPedido: statusInicialPedido,

      financeiro: {
        vlSubtotal: subtotalFinal,
        vlDesconto: descontoFinal,
        vlFrete: freteFinal,
        vlTotal: totalGeralFinal,
        dsCupom: cupomDigitado || null,
        dsFormaPagamentoCarrinho: dsFormaPagamentoCarrinho,

        vlEntrada: vlEntrada || 0,
        vlRestante: Math.max(0, totalGeralFinal - (vlEntrada || 0)),
        dsPrazoRestante: dsPrazoRestante || "À vista",
        dsStatusPagamento:
          (vlEntrada || 0) >= totalGeralFinal ? "pago" : "parcial",
        dsOperadorCaixa: operadorFinal,
      },

      logistica: {
        isRetirada: dsFormaEntregaPadrao === "retirada",
        dsFormaEntrega: dsFormaEntregaPadrao,
        isFreteGratis: freteGratisConfig?.atingido || false,
        dsServico: logistica?.servico || logistica?.dsServico || "N/A",
        vlFrete: freteFinal,
        vlPrazo: Number(
          logistica?.prazoEntrega ||
            logistica?.prazo ||
            logistica?.vlPrazo ||
            0,
        ),
        dsFormaPagamentoEtiqueta:
          logistica?.formaPagamentoEtiqueta || "saldo_melhor_envio",
        dsTransportadoraId:
          dsFormaEntregaPadrao === "transportadora"
            ? logistica?.transportadoraId ||
              logistica?.dsTransportadoraId ||
              null
            : dsFormaEntregaPadrao === "entrega_local"
              ? "entrega_local"
              : null,
      },

      itens: itensFormatados,

      Cotacao: {
        dsServicoCotado: null,
        vlFreteCotado: 0,
        dsFormaPagamentoEtiquetaCotado: null,
        dsTransportadoraIdCotado: null,
        nrPrazoEntregaCotado: 0,
      },

      Etiqueta: {
        dsPedido: pedidoIdGerado,
        IdEtiqueta: null,
        nrCodigoEnvio: null,
        dsNumRastreio: null,
        urlEtiqueta: null,
        dsStatusEtiqueta: "pendente",
        dsServicoVinculado: String(logistica?.transportadoraId || ""),
        vlValorCobrado: 0,
        dataGeracaoEtiqueta: null,
        isEtiquetaGerada: false,
      },

      dadosDevolucao: {
        isDevolucaoSolicitado: false,
        dsStatusDevolucao: "pendente",
        vlCustoFreteReverso: null,
        dataSolicitacaoDevolucao: 0,
        dsEstadoProduto: null,
        dsMotivo: null,
        dsCodigoRastreioReverso: "",
        dsTipoReembolso: "",
        vlReembolsoEfetivado: 0,
        dsObservacoes: "",
        isRecebidoPeloLojista: false,
        dataRecebidoPeloLojista: 0,
        dsOperadorConferencia: "",
      },

      Embalagem: dadosEmbalagemIdentificada,

      StatusProducao: {
        dsStatusProducao: "PEDIDOS",
        isPago: false,
        historico: [
          {
            fase: "PEDIDOS",
            dataModificacao: new Date().toISOString(),
          },
        ],
      },
    };

    await setDoc(novoPedidoRef, dadosDoPedidoParaSalvar);

    const msgLojista = `*NOVO PEDIDO #${numPedidoSequencial}*
👤 *CLIENTE:* ${dadosCliente.nmNomeCliente}
📱 *WHATSAPP:* ${dadosCliente.dsTelefoneCliente}
${dadosCliente.dsEmailCliente ? `✉️ *E-MAIL:* ${dadosCliente.dsEmailCliente}\n` : ""}📦 *ITENS:*
${itensFormatados.map((i: any) => `• ${i.nrQuantidadeProduto}x ${i.dsNomeProduto}${i.dsVariacaoProduto ? ` (${i.dsVariacaoProduto})` : ""}`).join("\n")}

💰 *TOTAL:* R$ ${totalGeralFinal.toFixed(2).replace(".", ",")}
Acesse seu painel para processar este pedido!`;

    const urlLojista = `https://wa.me/${String(whatsappNumero || "").replace(/\D/g, "")}?text=${encodeURIComponent(msgLojista)}`;
    window.open(urlLojista, "_blank");

    let telefoneClienteLimpo = dadosCliente.dsTelefoneCliente.replace(
      /\D/g,
      "",
    );
    if (
      !telefoneClienteLimpo.startsWith("55") &&
      telefoneClienteLimpo.length >= 10
    ) {
      telefoneClienteLimpo = "55" + telefoneClienteLimpo;
    }

    if (telefoneClienteLimpo.length >= 12) {
      const nomeLojaExibicao =
        dadosLoja?.dadosLoja?.dsNomeLoja || dadosLoja?.nomeLoja || "Nossa Loja";

      let msgCliente = `*Olá, ${dadosCliente.nmNomeCliente}!* Seu pedido *#${numPedidoSequencial}* foi realizado com sucesso em *${nomeLojaExibicao}*! 🎉

📦 *RESUMO DO PEDIDO:*
${itensFormatados.map((i: any) => `• ${i.nrQuantidadeProduto}x ${i.dsNomeProduto}${i.dsVariacaoProduto ? ` (${i.dsVariacaoProduto})` : ""} - R$ ${(i.vlPrecoProduto * i.nrQuantidadeProduto).toFixed(2).replace(".", ",")}`).join("\n")}

💰 *TOTAL DO PEDIDO:* R$ ${totalGeralFinal.toFixed(2).replace(".", ",")}`;

      if (payloadPixBruto) {
        msgCliente += `

💳 *PAGAMENTO VIA PIX:*
Caso ainda não tenha realizado o pagamento pela loja, copie e cole o código abaixo no aplicativo do seu banco:
\`${payloadPixBruto}\``;
      }

      msgCliente += `

⚠️ *LEMBRETE:* Lembre-se de enviar o comprovante do pagamento via Pix por aqui para agilizar a liberação e produção do seu pedido. Muito obrigado pela preferência! 🙏`;

      const urlCliente = `https://wa.me/${telefoneClienteLimpo}?text=${encodeURIComponent(msgCliente)}`;
      setTimeout(() => {
        window.open(urlCliente, "_blank");
      }, 500);
    }

    return true;
  } catch (e) {
    console.error("Erro ao salvar pedido:", e);
    return false;
  }
};