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
  tipoCupomCarrinho = "valor_fixo",
  freteGratisConfig,
  payloadPixBruto,
  freteSel,
  dsFormaPagamentoCarrinho = "pix",
  vlEntrada = 0,
  vlRestante = 0,
  dsPrazoRestante = "À vista",
  dsOperadorCaixa = "Balcão",
  embalagemDoCheckout = null,
  embalagemRecomendada = null,
}: any) => {
  try {
    const rawSubtotal = Number(valorSubtotalProdutos);
    const subtotalFinal = Number((isNaN(rawSubtotal) ? 0 : rawSubtotal).toFixed(2));
    
    const rawDesconto = Number(valorDesconto);
    const descontoFinal = Number((isNaN(rawDesconto) ? 0 : rawDesconto).toFixed(2));

    const codigoCupomStr = cupomDigitado ? String(cupomDigitado).trim() : "";
    const tipoCupomIdentificado = tipoCupomCarrinho ? String(tipoCupomCarrinho).trim().toLowerCase() : "valor_fixo";

    const logFreteVal = logistica?.valorFrete !== undefined ? logistica.valorFrete : logistica?.vlFrete;
    const freteFinalNum = Number(logFreteVal);
    const freteFinal = Number((isNaN(freteFinalNum) ? 0 : freteFinalNum).toFixed(2));

    const totalCalculadoManual = Number(
      (subtotalFinal - descontoFinal + freteFinal).toFixed(2),
    );
    const totalGeralParam = Number(totalGeral);
    const totalGeralFinal = Number(
      (isNaN(totalGeralParam) ? totalCalculadoManual : totalGeralParam).toFixed(2),
    );

    const origemIdentificada =
      lojistaSlug === "pdv-balcao" ||
      logistica?.origem === "Pdv" ||
      logistica?.origem === "pdv"
        ? "Pdv"
        : "Site";

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
          const ultimoNum = docSnapContador.data().ultimoNumero;
          proximo = (typeof ultimoNum === "number" ? ultimoNum : 0) + 1;
        }

        transaction.set(
          contadorRef,
          { ultimoNumero: proximo },
          { merge: true },
        );

        return proximo;
      },
    );

    const temFreteCarrinho = safeCart.some(
      (item: any) =>
        item.precisaFrete !== false && item.isPrecisaFreteProduto !== false,
    );
    let dsFormaEntregaPadrao = "transportadora";

    const formaEnviadaBruta = logistica?.dsFormaEntrega
      ? String(logistica.dsFormaEntrega).toLowerCase()
      : logistica?.formaEnvio
      ? String(logistica.formaEnvio).toLowerCase()
      : "";

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
    } else {
      const freteId = freteSel?.id ? String(freteSel.id) : "";
      const freteName = freteSel?.name ? String(freteSel.name).toLowerCase() : "";
      if (
        freteId === "retirada" ||
        freteId === "retirar_loja" ||
        freteName.includes("retirada")
      ) {
        dsFormaEntregaPadrao = "retirada";
      } else if (
        freteId === "entrega_local" ||
        freteName.includes("entrega local")
      ) {
        dsFormaEntregaPadrao = "entrega_local";
      } else {
        dsFormaEntregaPadrao = "transportadora";
      }
    }

    const fonteEmbalagem = embalagemRecomendada ? embalagemRecomendada : (embalagemDoCheckout ? embalagemDoCheckout : {});

    const recRaw = fonteEmbalagem?.recomendada ? fonteEmbalagem.recomendada : fonteEmbalagem;
    const escRaw = fonteEmbalagem?.escolhida ? fonteEmbalagem.escolhida : fonteEmbalagem;

    const insumosEmbalagemRecomendada = Array.isArray(
      recRaw?.insumosComposicaoEmbalagem,
    )
      ? recRaw.insumosComposicaoEmbalagem
      : Array.isArray(recRaw?.itensComposicao)
        ? recRaw.itensComposicao
        : [];

    const insumosEmbalagemEscolhida = Array.isArray(
      escRaw?.insumosComposicaoEmbalagem,
    )
      ? escRaw.insumosComposicaoEmbalagem
      : Array.isArray(escRaw?.itensComposicao)
        ? escRaw.itensComposicao
        : [];

    const dadosEmbalagemIdentificada = {
      recomendada: {
        id: recRaw?.id ? recRaw.id : (recRaw?.insumoId ? recRaw.insumoId : "cB40vmcKnP3nqInpI3yd"),
        dsModeloEmbalagemRecomendado:
          recRaw?.dsModeloEmbalagemRecomendado
            ? recRaw.dsModeloEmbalagemRecomendado
            : recRaw?.dsNomeEmbalagem
            ? recRaw.dsNomeEmbalagem
            : recRaw?.nome
            ? recRaw.nome
            : "Embalagem Ecomerce 26x36",
        vlCustoEmbalagemRecomendado: Number(
          recRaw?.vlCustoEmbalagemRecomendado !== undefined
            ? recRaw.vlCustoEmbalagemRecomendado
            : recRaw?.vlCustoUnitarioEmbalagem !== undefined
            ? recRaw.vlCustoUnitarioEmbalagem
            : recRaw?.custo !== undefined
            ? recRaw.custo
            : 1.64,
        ),
        dsTipoEmbalagem:
          recRaw?.dsTipoEmbalagem ? recRaw.dsTipoEmbalagem : (recRaw?.tipo ? recRaw.tipo : "envelope_seguranca"),
        altura: Number(recRaw?.altura !== undefined ? recRaw.altura : 4),
        comprimento: Number(recRaw?.comprimento !== undefined ? recRaw.comprimento : 32),
        largura: Number(recRaw?.largura !== undefined ? recRaw.largura : 22),
        pesoEmbarque: Number(recRaw?.pesoEmbarque !== undefined ? recRaw.pesoEmbarque : 0),
        insumosComposicaoEmbalagem: insumosEmbalagemRecomendada,
      },
      escolhida: {
        id: escRaw?.id ? escRaw.id : (escRaw?.insumoId ? escRaw.insumoId : ""),
        dsModeloEmbalagemEscolhida:
          escRaw?.dsModeloEmbalagemEscolhida
            ? escRaw.dsModeloEmbalagemEscolhida
            : escRaw?.dsModeloEmbalagemRecomendado
            ? escRaw.dsModeloEmbalagemRecomendado
            : escRaw?.dsNomeEmbalagem
            ? escRaw.dsNomeEmbalagem
            : escRaw?.nome
            ? escRaw.nome
            : "",
        vlCustoEmbalagemEscolhida: Number(
          escRaw?.vlCustoEmbalagemEscolhida !== undefined
            ? escRaw.vlCustoEmbalagemEscolhida
            : escRaw?.vlCustoEmbalagemRecomendado !== undefined
            ? escRaw.vlCustoEmbalagemRecomendado
            : escRaw?.vlCustoUnitarioEmbalagem !== undefined
            ? escRaw.vlCustoUnitarioEmbalagem
            : 0,
        ),
        dsTipoEmbalagem: escRaw?.dsTipoEmbalagem ? escRaw.dsTipoEmbalagem : (escRaw?.tipo ? escRaw.tipo : ""),
        altura: Number(escRaw?.altura !== undefined ? escRaw.altura : 0),
        comprimento: Number(escRaw?.comprimento !== undefined ? escRaw.comprimento : 0),
        largura: Number(escRaw?.largura !== undefined ? escRaw.largura : 0),
        pesoEmbarque: Number(escRaw?.pesoEmbarque !== undefined ? escRaw.pesoEmbarque : 0),
        insumosComposicaoEmbalagem: insumosEmbalagemEscolhida,
      },
    };

    const itensFormatados = safeCart.map((item: any, index: number) => {
      const itemKeyStr = item.cartItemKey ? item.cartItemKey : (item.cartItemId ? item.cartItemId : (item.id ? item.id : "prod"));
      const chaveUnica = `${itemKeyStr}_${index}`;
      
      const rawRespostas =
        personalizacoes[chaveUnica]
          ? personalizacoes[chaveUnica]
          : personalizacoes[item.cartItemKey]
          ? personalizacoes[item.cartItemKey]
          : personalizacoes[item.id]
          ? personalizacoes[item.id]
          : personalizacoes[index]
          ? personalizacoes[index]
          : {};

      const requisitos =
        item.dsRequisitosProduto
          ? item.dsRequisitosProduto
          : item.requisitos
          ? item.requisitos
          : (requisitosDoBanco && item.id && requisitosDoBanco[item.id])
          ? requisitosDoBanco[item.id]
          : [];

      const respostasFormatadas: Record<string, string> = {};

      if (Array.isArray(requisitos) && requisitos.length > 0) {
        requisitos.forEach((req: any) => {
          const campoId = req?.id ? String(req.id) : "";
          const labelBruto = req?.label ? String(req.label) : (req?.nome ? String(req.nome) : "Campo");
          const labelLimpo = labelBruto.replace(/:+$/, "").trim();

          const val =
            rawRespostas[campoId]
              ? rawRespostas[campoId]
              : rawRespostas[labelBruto]
              ? rawRespostas[labelBruto]
              : rawRespostas[labelLimpo]
              ? rawRespostas[labelLimpo]
              : "";

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
        item.dsNomeProduto ? item.dsNomeProduto : (item.dsNome ? item.dsNome : (item.nome ? item.nome : "Produto")),
      ).trim();

      let variacaoFinal = String(
        item.dsVariacaoProduto ? item.dsVariacaoProduto : (item.variacao ? item.variacao : ""),
      ).trim();

      if (
        item.isTemVariacoesProduto === false ||
        !variacaoFinal ||
        variacaoFinal.toLowerCase() === nomeProdutoFinal.toLowerCase()
      ) {
        variacaoFinal = "";
      }

      const custoExtraido = Number(
        item.vlCustoUnitarioProduto !== undefined
          ? item.vlCustoUnitarioProduto
          : item.vlCustoUnitario !== undefined
          ? item.vlCustoUnitario
          : item.custo !== undefined
          ? item.custo
          : 0,
      );

      const qtdFinal = Number(
        item.nrQuantidadeProduto !== undefined
          ? item.nrQuantidadeProduto
          : item.quantidade !== undefined
          ? item.quantidade
          : item.qty !== undefined
          ? item.qty
          : 1,
      );

      const precoItemRaw = item.vlPrecoProduto !== undefined ? item.vlPrecoProduto : (item.preco !== undefined ? item.preco : (item.price !== undefined ? item.price : 0));
      const precoFinal = Number(
        Number(isNaN(Number(precoItemRaw)) ? 0 : Number(precoItemRaw)).toFixed(2),
      );

      return {
        idProduto: item.id ? item.id : (item.idProduto ? item.idProduto : ""),
        idVariacao: item.idVariacao ? item.idVariacao : null,
        dsNomeProduto: nomeProdutoFinal,
        nrQuantidadeProduto: isNaN(qtdFinal) ? 1 : qtdFinal,
        vlPrecoProduto: precoFinal,
        vlCustoUnitarioProduto: isNaN(custoExtraido)
          ? 0
          : Number(custoExtraido.toFixed(2)),
        dsVariacaoProduto: variacaoFinal,

        dsNomeVar1Produto: item.dsNomeVar1Produto ? item.dsNomeVar1Produto : (item.nomeVar1 ? item.nomeVar1 : null),
        v1: item.v1 ? item.v1 : null,
        dsNomeVar2Produto: item.dsNomeVar2Produto ? item.dsNomeVar2Produto : (item.nomeVar2 ? item.nomeVar2 : null),
        v2: item.v2 ? item.v2 : null,

        isPrecisaFreteProduto:
          item.isPrecisaFreteProduto !== undefined
            ? item.isPrecisaFreteProduto
            : item.precisaFrete !== undefined
            ? item.precisaFrete
            : true,

        dsRespostasPersonalizadasProduto: respostasFormatadas,

        dsFotoCapaProduto:
          item.dsFotoProduto
            ? item.dsFotoProduto
            : item.dsCapaProduto
            ? item.dsCapaProduto
            : item.foto
            ? item.foto
            : item.imagem
            ? item.imagem
            : "",

        dsSkuProduto: item.dsSkuProduto ? item.dsSkuProduto : (item.sku ? item.sku : "SEM-SKU"),
        dsGtinProduto: item.dsGtinProduto ? item.dsGtinProduto : (item.gtin ? item.gtin : ""),

        nrDiasProducaoProduto: Number(
          item.nrDiasProducaoProduto !== undefined
            ? item.nrDiasProducaoProduto
            : item.nrDiasProducao !== undefined
            ? item.nrDiasProducao
            : 0,
        ),
        dsTipoProduto: String(
          item.dsTipoProduto
            ? item.dsTipoProduto
            : item.tipoProduto
            ? item.tipoProduto
            : item.tipo
            ? item.tipo
            : "Fisico_Padrao",
        ),
        nrPesoProduto: Number(item.nrPesoProduto !== undefined ? item.nrPesoProduto : (item.weight !== undefined ? item.weight : 0.3)),
        nrAlturaProduto: Number(item.nrAlturaProduto !== undefined ? item.nrAlturaProduto : (item.height !== undefined ? item.height : 0)),
        nrLarguraProduto: Number(item.nrLarguraProduto !== undefined ? item.nrLarguraProduto : (item.width !== undefined ? item.width : 0)),
        nrComprimentoProduto: Number(
          item.nrComprimentoProduto !== undefined
            ? item.nrComprimentoProduto
            : item.length !== undefined
            ? item.length
            : 0,
        ),

        insumosComposicaoProduto: Array.isArray(item.insumosComposicaoProduto) ? item.insumosComposicaoProduto : [],
        vlOutrosCustosProduto: item.vlOutrosCustosProduto !== undefined ? item.vlOutrosCustosProduto : 0,
        movimentarEstoque: item.movimentarEstoque !== undefined ? item.movimentarEstoque : true,
        movimentarEstoqueComposicao: item.movimentarEstoqueComposicao !== undefined ? item.movimentarEstoqueComposicao : true,
      };
    });

    const dadosCliente = {
      nmNomeCliente: cliente?.nmNomeCliente ? cliente.nmNomeCliente : (cliente?.nome ? cliente.nome : "Cliente"),
      dsCpfCliente: cliente?.dsCpfCliente ? cliente.dsCpfCliente : (cliente?.cpf ? cliente.cpf : ""),
      dsEmailCliente: cliente?.dsEmailCliente ? cliente.dsEmailCliente : (cliente?.email ? cliente.email : ""),
      dsTelefoneCliente:
        cliente?.dsTelefoneCliente ? cliente.dsTelefoneCliente : (cliente?.dsTelefone ? cliente.dsTelefone : ""),
    };

    const dadosEnderecoCliente = {
      dsCepCliente:
        endereco?.dsCepCliente
          ? endereco.dsCepCliente
          : endereco?.cep
          ? endereco.cep
          : cliente?.dsCepCliente
          ? cliente.dsCepCliente
          : "",
      dsRuaCliente: endereco?.dsRuaCliente ? endereco.dsRuaCliente : (endereco?.rua ? endereco.rua : ""),
      dsNumeroCliente: endereco?.dsNumeroCliente ? endereco.dsNumeroCliente : (endereco?.numero ? endereco.numero : ""),
      dsBairroCliente: endereco?.dsBairroCliente ? endereco.dsBairroCliente : (endereco?.bairro ? endereco.bairro : ""),
      dsCidadeCliente: endereco?.dsCidadeCliente ? endereco.dsCidadeCliente : (endereco?.cidade ? endereco.cidade : ""),
      dsUfCliente: endereco?.dsUfCliente ? endereco.dsUfCliente : (endereco?.uf ? endereco.uf : ""),
      dsComplementoCliente:
        endereco?.dsComplementoCliente
          ? endereco.dsComplementoCliente
          : endereco?.complemento
          ? endereco.complemento
          : "",
    };

    const novoPedidoRef = doc(collection(db, "lojistas", lojistaId, "pedidos"));
    const pedidoIdGerado = novoPedidoRef.id;

    const operadorFinal =
      origemIdentificada === "Pdv"
        ? (dsOperadorCaixa ? dsOperadorCaixa : "Balcão")
        : "Site / E-commerce";

    const formaEntregaNat = logistica?.dsFormaEntrega ? String(logistica.dsFormaEntrega).trim() : "";

    const ehRetiradaProntaEntrega =
      formaEntregaNat === "retirada" &&
      safeCart.every(
        (item: any) => String(item.dsTipoProduto ? item.dsTipoProduto : "").trim() === "Fisico_Sem",
      );

    const isStatusPedidoConcluido = ehRetiradaProntaEntrega;

    const dadosDoPedidoParaSalvar = {
      nrIdpedido: pedidoIdGerado,
      dsOrigemPedido: origemIdentificada,
      dsCliente: dadosCliente,
      dsEndereco: dadosEnderecoCliente,
      nrNumeroPedido: Number(numPedidoSequencial),
      data: new Date().toISOString(),
      timestamp: serverTimestamp(),
      isStatusPedidoConcluido: isStatusPedidoConcluido,

      financeiro: {
        vlSubtotal: subtotalFinal,
        vlDesconto: descontoFinal,
        vlFrete: freteFinal,
        vlTotal: totalGeralFinal,
        dsCupom: cupomDigitado ? cupomDigitado : null,
        tpDesconto: tipoCupomIdentificado,
        dsFormaPagamentoCarrinho: dsFormaPagamentoCarrinho,

        vlEntrada: vlEntrada ? vlEntrada : 0,
        vlRestante: Math.max(0, totalGeralFinal - (vlEntrada ? vlEntrada : 0)),
        dsPrazoRestante: dsPrazoRestante ? dsPrazoRestante : "À vista",
        dsStatusPagamento:
          (vlEntrada ? vlEntrada : 0) >= totalGeralFinal ? "pago" : "parcial",
        dsOperadorCaixa: operadorFinal,
      },

      logistica: {
        isRetirada: dsFormaEntregaPadrao === "retirada",
        dsFormaEntrega: dsFormaEntregaPadrao,
        isFreteGratis: freteGratisConfig?.atingido ? freteGratisConfig.atingido : false,
        isEntregaLocal: dsFormaEntregaPadrao === "entrega_local",
        isEntregaTransportadora: dsFormaEntregaPadrao === "transportadora",
        dsServico: logistica?.servico ? logistica.servico : (logistica?.dsServico ? logistica.dsServico : "N/A"),
        vlFrete: freteFinal,
        vlPrazo: Number(
          logistica?.prazoEntrega !== undefined
            ? logistica.prazoEntrega
            : logistica?.prazo !== undefined
            ? logistica.prazo
            : logistica?.vlPrazo !== undefined
            ? logistica.vlPrazo
            : 0,
        ),
        dsFormaPagamentoEtiqueta:
          logistica?.formaPagamentoEtiqueta ? logistica.formaPagamentoEtiqueta : "saldo_melhor_envio",
        dsTransportadoraId:
          dsFormaEntregaPadrao === "transportadora"
            ? (logistica?.transportadoraId
              ? logistica.transportadoraId
              : logistica?.dsTransportadoraId
              ? logistica.dsTransportadoraId
              : null)
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
        dsServicoVinculado: String(logistica?.transportadoraId ? logistica.transportadoraId : ""),
        vlValorCobrado: 0,
        dataGeracaoEtiqueta: null,
        isEtiquetaGerada: false,
      },

      dadosDevolucao: {
        isDevolucaoSolicitado: false,
        dsStatusDevolucao: "pendente",
        vlCustoFreteReverso: null,
        dataSolicitacaoDevolucao: 0,
        isVoltaparaVenda: false,
        dsMotivo: null,
        dsCodigoRastreioReverso: "",
        dsTipoReembolso: "",
        vlReembolsoEfetivado: 0,
        dsObservacoes: "",
        isRecebidoPeloLojista: false,
        dataRecebidoPeloLojista: 0,
        dsOperadorConferencia: "",
        isReembolsarFreteCliente: false,
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
📱 *WHATSAPP:* ${dadosCliente.dsTelefoneCliente}${dadosCliente.dsEmailCliente ? `✉️ *E-MAIL:* ${dadosCliente.dsEmailCliente}\n` : ""}📦 *ITENS:*
${itensFormatados.map((i: any) => `• ${i.nrQuantidadeProduto}x ${i.dsNomeProduto}${i.dsVariacaoProduto ? ` (${i.dsVariacaoProduto})` : ""}`).join("\n")}

💰 *TOTAL:* R$ ${totalGeralFinal.toFixed(2).replace(".", ",")}
Acesse seu painel para processar este pedido!`;

    const whatsNumSanitized = whatsappNumero ? String(whatsappNumero) : "";
    const urlLojista = `https://wa.me/${whatsNumSanitized.replace(/\D/g, "")}?text=${encodeURIComponent(msgLojista)}`;
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
        dadosLoja?.dadosLoja?.dsNomeLoja
          ? dadosLoja.dadosLoja.dsNomeLoja
          : dadosLoja?.nomeLoja
          ? dadosLoja.nomeLoja
          : "Nossa Loja";

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