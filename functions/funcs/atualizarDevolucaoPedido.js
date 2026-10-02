const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const {
  processarRankingProdutosClientes,
} = require("./atualizarRankingProdutosClientes");
const { processarMasterDashboard } = require("./atualizarMasterDashboard");
const { processarRankingEmbalagens } = require("./atualizarRankingEmbalagens");
const { processarHistoricoLojista } = require("./atualizarHistoricoLojista");

const db = getFirestore();

// ==========================================================================================
// MOTOR DRE CORPORATIVO REVERSO
// ==========================================================================================
function calcularDREReverso(statsAtuais, alteracoes) {
  const receitaBruta = Number((Number(statsAtuais.receitaBrutaProdutos || 0) + (alteracoes.receitaBrutaDelta || 0)).toFixed(2));
  const deducoes = Number((Number(statsAtuais.deducoesVendas || 0) + (alteracoes.deducoesDelta || 0)).toFixed(2));
  const taxasCartao = Number((Number(statsAtuais.taxasGatewayCartao || 0) + (alteracoes.taxasDelta || 0)).toFixed(2));
  const comissoes = Number((Number(statsAtuais.comissoesVendas || 0) + (alteracoes.comissoesDelta || 0)).toFixed(2));

  const receitaLiquida = Number(Math.max(0, receitaBruta - deducoes - taxasCartao - comissoes).toFixed(2));

  const cmv = Number((Number(statsAtuais.cmv || 0) + (alteracoes.cmvDelta || 0)).toFixed(2));
  const lucroBruto = Number((receitaLiquida - cmv).toFixed(2));

  const custoTotalEmbalagens = Number((Number(statsAtuais.custoTotalEmbalagens || 0) + (alteracoes.embalagemDelta || 0)).toFixed(2));
  const despesasLogistica = Number((Number(statsAtuais.despesasLogistica || 0) + (alteracoes.logisticaDelta || 0)).toFixed(2));

  const resultadoOperacional = Number((lucroBruto - despesasLogistica - custoTotalEmbalagens).toFixed(2));

  let calcFixas = Number(statsAtuais.totalDespesasFixas || 0) + (alteracoes.fixasDelta || 0);
  let calcVariaveis = Number(statsAtuais.totalDespesasVariaveis || 0) + (alteracoes.variaveisDelta || 0);

  const totalDespesasFixas = Number(Math.max(0, calcFixas).toFixed(2));
  const totalDespesasVariaveis = Number(Math.max(0, calcVariaveis).toFixed(2));

  const lucroLiquidoReal = Number((resultadoOperacional - totalDespesasFixas - totalDespesasVariaveis).toFixed(2));

  return {
    receitaBrutaProdutos: receitaBruta,
    deducoesVendas: deducoes,
    taxasGatewayCartao: taxasCartao,
    comissoesVendas: comissoes,
    receitaLiquida: receitaLiquida,
    cmv: cmv,
    lucroBruto: lucroBruto,
    custoTotalEmbalagens: custoTotalEmbalagens,
    despesasLogistica: despesasLogistica,
    resultadoOperacional: resultadoOperacional,
    totalDespesasFixas: totalDespesasFixas,
    totalDespesasVariaveis: totalDespesasVariaveis,
    lucroLiquidoReal: lucroLiquidoReal,
  };
}

/// ==========================================================================================
// FUNÇÃO PRINCIPAL: ATUALIZAR DEVOLUCAO DE PEDIDO (CAMINHO REVERSO ÚNICO E DEFINITIVO)
// ==========================================================================================
exports.atualizarDevolucaoPedido = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onWrite(async (change, context) => {
    const lojistaId = context.params.lojistaId;
    const pedidoId = context.params.pedidoId;
    const newData = change.after.exists ? change.after.data() : null;
    const antes = change.before.exists ? change.before.data() : null;

    if (!newData) return null;

    const devolucaoAntes = Boolean(
      antes?.dadosDevolucao?.isDevolucaoSolicitado || 
      antes?.devolvido || 
      antes?.dadosDevolucao?.dsStatusDevolucao === "solicitada"
    );
    const devolucaoDepois = Boolean(
      newData?.dadosDevolucao?.isDevolucaoSolicitado || 
      newData?.devolvido || 
      newData?.dadosDevolucao?.dsStatusDevolucao === "solicitada"
    );

    // 🛡️ TRAVA DE GUARDA ABSOLUTA (EXECUÇÃO ÚNICA):
    if (devolucaoAntes || !devolucaoDepois) {
      return null;
    }

    console.log(`🔄 [Devolução Única] Processando estorno definitivo do pedido ${pedidoId}`);

    const multiplicadorDRE = -1; // Estorna a venda definitivamente do DRE
    const multiplicadorDevolucao = 1; // Soma 1 nas estatísticas de devolução

    const dadosDevPedido = newData.dadosDevolucao || {};
    const isVoltaparaVenda = dadosDevPedido.isVoltaparaVenda === true;
    
    // 🌟 CAPTURA DA REGRA DE REEMBOLSO DO FRETE DO CLIENTE DECIDIDA NO MODAL
    const isReembolsarFreteCliente = dadosDevPedido.isReembolsarFreteCliente === true;
    
    // 🌟 PROTEÇÃO ABSOLUTA: Garante que o frete reverso seja sempre positivo
    const custoFreteReversoPedido = Math.abs(
      Number(dadosDevPedido.vlCustoFreteReverso ?? dadosDevPedido.custoFreteReverso ?? 0)
    );

    const fatorEstoqueReverso = isVoltaparaVenda ? 1 : 0; 

    console.log(`📦 [Devolução] Item volta para prateleira? ${isVoltaparaVenda} | Fator Estoque: ${fatorEstoqueReverso} | Reembolsar Frete Cliente? ${isReembolsarFreteCliente}`);

    let rawData = newData.timestamp || newData.data || Date.now();
    if (rawData && typeof rawData.toDate === "function") {
      rawData = rawData.toDate();
    } else if (typeof rawData === "string" || typeof rawData === "number") {
      rawData = new Date(rawData);
    }
    const dataPedido = rawData instanceof Date && !isNaN(rawData) ? rawData : new Date();

    const anoValido = !isNaN(dataPedido.getFullYear()) ? dataPedido.getFullYear() : 2026;
    const mesValido = !isNaN(dataPedido.getMonth()) ? dataPedido.getMonth() : 7;
    const mesesNomes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const chaveMes = `${mesesNomes[mesValido]}_${anoValido}`;
    const chaveAnual = `anual_${anoValido}`;

    const statsRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chaveMes}`);
    const devolucaoStatsRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/devolucoes_${chaveMes}`);

    const fin = newData.financeiro || {};
    const log = newData.logistica || {};
    const etiqueta = newData.Etiqueta || {};
    const embalagem = newData.Embalagem || {};
    const embEscolhida = embalagem.escolhida || {};
    const embRecomendada = embalagem.recomendada || {};

    const subtotal = Number(fin.vlSubtotal ?? fin.subtotal ?? 0);
    const descontoCupom = Number(fin.vlDesconto ?? fin.desconto ?? 0);
    const freteCliente = Number(fin.vlFrete ?? log.vlFrete ?? 0);
    const taxaGatewayCartaoPedido = Number(fin.vlTaxaCartao ?? fin.taxaCartao ?? fin.vlGateway ?? 0);
    const comissaoVendaPedido = Number(fin.vlComissao ?? fin.comissao ?? 0);

    const freteGratisFlag = Boolean(log.isFreteGratis || fin.freteGratis || log.dsTransportadoraId === "frete_gratis_ativado");
    const formaEntrega = String(log.dsFormaEntrega || log.dsTransportadoraId || "").trim().toLowerCase();
    const isRetirada = log.isRetirada === true || formaEntrega === "retirada" || formaEntrega === "retirar_loja";
    const isEntregaLocal = log.isEntregaLocal === true && formaEntrega === "entrega_local";
    const isEntregaTransportadora = log.isEntregaTransportadora === true && formaEntrega === "transportadora";

    let receitaFreteEntregaLocalValor = 0;
    let custoEntregaLocalValor = 0;
    let receitaFreteTransportadoraValor = 0;
    let custoEtiquetaValor = 0;
    const valorEtiquetaBruto = Number(etiqueta.valorCobrado ?? etiqueta.vlValorCobrado ?? 0);

    if (isRetirada) {
      receitaFreteEntregaLocalValor = 0;
      custoEntregaLocalValor = 0;
      receitaFreteTransportadoraValor = 0;
      custoEtiquetaValor = 0;
    } else if (isEntregaLocal) {
      receitaFreteEntregaLocalValor = freteCliente;
      custoEntregaLocalValor = freteCliente;
    } else if (isEntregaTransportadora) {
      receitaFreteTransportadoraValor = freteCliente;
      if (freteGratisFlag) custoEtiquetaValor = valorEtiquetaBruto;
    }

    // 🌟 SE O LOJISTA DECIDIU REEMBOLSAR O FRETE DO CLIENTE, ESSE VALOR ENTRA COMO UMA DEDUÇÃO/ABATIMENTO EXTRA
    const freteReembolsadoDelta = isReembolsarFreteCliente ? freteCliente : 0;
    const deducoesTotaisDevolucao = Number((descontoCupom + freteReembolsadoDelta).toFixed(2));

    // 🌟 A logística total da devolução soma o custo da etiqueta (estorno) + o frete reverso pago
    const custoLogisticaTotalDevolucao = Number((custoEtiquetaValor + custoFreteReversoPedido).toFixed(2));
    const custoEmbalagemPedido = Number(embEscolhida.vlCustoEmbalagemEscolhida || 0);
    const idEmbEscolhida = String(embEscolhida.id || "").trim();
    const idEmbRecomendada = String(embRecomendada.id || "").trim();
    const desvioEmbalagemPedido = idEmbRecomendada && idEmbEscolhida !== idEmbRecomendada ? 1 : 0;
    const divergenciaFretePedido = Number((freteCliente - valorEtiquetaBruto).toFixed(2));
    const teveCupomUtilizado = descontoCupom > 0 ? 1 : 0;

    const calcManual = subtotal - descontoCupom + (freteGratisFlag ? 0 : freteCliente);
    const total = Number(fin.vlTotal ?? fin.total ?? fin.valorTotal ?? newData.total ?? (calcManual > 0 ? calcManual : 0));
    const formaPagamento = String(fin.dsFormaPagamentoCarrinho || fin.metodo || "pix").trim().toLowerCase();
    const origem = String(newData.dsOrigemPedido || newData.origem || "site").trim().toLowerCase();
    const codigoCupom = String(fin.dsCupom || "").trim();
    const tipoCupom = String(fin.tpDesconto || fin.tipoCupom || (codigoCupom.includes("%") ? "porcentagem" : "valor_fixo")).trim().toLowerCase();

    const itensLista = newData.itens || [];
    let qtdTotalItensPedido = 0;
    const itensConsolidadosVenda = {};

    for (const item of itensLista) {
      const idProd = String(item.idProduto || item.id || "").trim();
      const idVar = String(item.idVariacao || "").trim();
      if (!idProd) continue;

      const qtdItem = Number(item.nrQuantidadeProduto || item.quantidade || item.qty || 1);
      const variacaoItem = String(item.dsVariacaoProduto || item.variacao || "Padrão").trim();
      const nomeProdItem = String(item.dsNomeProduto || item.nome || "Produto Sem Nome").trim();

      let custoUnitarioItem = Number(item.vlCustoUnitarioProduto ?? item.custoUnitario ?? item.custo ?? 0);
      if (isNaN(custoUnitarioItem)) custoUnitarioItem = 0;

      const qFinal = isNaN(qtdItem) || qtdItem <= 0 ? 1 : Number(qtdItem);
      qtdTotalItensPedido += qFinal;

      const chaveUnica = `${idProd}_${idVar || "raiz"}`;
      if (itensConsolidadosVenda[chaveUnica]) {
        itensConsolidadosVenda[chaveUnica].qtdItem += qFinal;
      } else {
        itensConsolidadosVenda[chaveUnica] = {
          idProduto: idProd,
          idVariacao: idVar,
          variacaoProduto: variacaoItem,
          nomeProduto: nomeProdItem,
          qtdItem: qFinal,
          precoUnitario: Number(item.vlPrecoProduto ?? item.preco ?? 0),
          custoUnitario: custoUnitarioItem,
          itemOriginal: item,
          insumosComposicaoProduto: item.insumosComposicaoProduto || []
        };
      }
    }

    const listaVendaUnica = Object.values(itensConsolidadosVenda);
    if (listaVendaUnica.length === 0) return null;

    let custoTotalPedidoGeral = 0;
    let totalPedidosAtualGlobal = 0;
    let ticketMedioGlobal = 0;
    let dreRecalculadaFinal = {};

    // ======================================================================================
    // 1. TRANSAÇÃO PRINCIPAL: DRE E ESTATÍSTICAS DO MÊS
    // ======================================================================================
    await db.runTransaction(async (t) => {
      const doc = await t.get(statsRef);
      const cacheProdutosVenda = {};

      for (const itemU of listaVendaUnica) {
        if (itemU.idProduto) {
          if (!cacheProdutosVenda[itemU.idProduto]) {
            const prodRef = db.doc(`lojistas/${lojistaId}/produtos/${itemU.idProduto}`);
            const prodSnap = await t.get(prodRef);
            cacheProdutosVenda[itemU.idProduto] = {
              snap: prodSnap,
              dados: prodSnap.exists ? prodSnap.data() : null,
            };
          }

          const prodInfo = cacheProdutosVenda[itemU.idProduto];
          if (prodInfo && prodInfo.dados) {
            const dadosProd = prodInfo.dados;
            const variacoesAtuais = dadosProd.variacoes || [];

            if (itemU.idVariacao && variacoesAtuais.length > 0) {
              const varEncontrada = variacoesAtuais.find((v) => String(v.idVariacao || "").trim() === itemU.idVariacao);
              if (varEncontrada) {
                const custoVar = Number(varEncontrada.vlCustoUnitarioProduto ?? varEncontrada.custo ?? varEncontrada.vlCustoUnitario ?? 0);
                if (!isNaN(custoVar) && custoVar > 0) itemU.custoUnitario = custoVar;
              }
            } else {
              const custoRaiz = Number(dadosProd.vlCustoUnitarioProduto ?? dadosProd.vlCustoUnitario ?? dadosProd.custo ?? 0);
              if (!isNaN(custoRaiz) && custoRaiz > 0) itemU.custoUnitario = custoRaiz;
            }
          }
        }
        custoTotalPedidoGeral += itemU.custoUnitario * itemU.qtdItem;
      }

      const statsAtuais = doc.exists ? doc.data() : {};
      const alteracoes = {
        receitaBrutaDelta: subtotal * multiplicadorDRE,
        deducoesDelta: deducoesTotaisDevolucao * multiplicadorDRE,
        taxasDelta: taxaGatewayCartaoPedido * multiplicadorDRE,
        comissoesDelta: comissaoVendaPedido * multiplicadorDRE,
        cmvDelta: custoTotalPedidoGeral * multiplicadorDRE,
        logisticaDelta: custoLogisticaTotalDevolucao, // 🌟 Aumenta a despesa de logística no DRE
        embalagemDelta: 0, 
        fixasDelta: 0,
        variaveisDelta: 0,
      };

      dreRecalculadaFinal = calcularDREReverso(statsAtuais, alteracoes);

      // Meta Colaborador Reverso
      if (fin.dsOperadorCaixa) {
        const operadorBruto = String(fin.dsOperadorCaixa).trim();
        const operadorIdSanitizado = operadorBruto.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
        const dataChaveDiaria = `${dataPedido.getFullYear()}-${String(dataPedido.getMonth() + 1).padStart(2, "0")}-${String(dataPedido.getDate()).padStart(2, "0")}`;
        const metaRef = db.doc(`lojistas/${lojistaId}/meta_colaboradores/${operadorIdSanitizado}/diario/${dataChaveDiaria}`);

        const receitaLiquidaColaborador = subtotal - deducoesTotaisDevolucao;
        const lucroGeradoColaborador = receitaLiquidaColaborador - custoTotalPedidoGeral;

        t.set(
          metaRef,
          {
            nomeColaborador: operadorBruto,
            totalVendidoBruto: FieldValue.increment(total * multiplicadorDRE),
            totalReceitaProdutos: FieldValue.increment(receitaLiquidaColaborador * multiplicadorDRE),
            custoProdutosVendidos: FieldValue.increment(custoTotalPedidoGeral * multiplicadorDRE),
            lucroBrutoGerado: FieldValue.increment(lucroGeradoColaborador * multiplicadorDRE),
            totalPedidosVendidos: FieldValue.increment(multiplicadorDRE),
            totalItens: FieldValue.increment(qtdTotalItensPedido * multiplicadorDRE),
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      const porFormaPagamento = statsAtuais.porFormaPagamento || {};
      const porOrigem = statsAtuais.porOrigem || {};
      const porFormaEntrega = statsAtuais.porFormaEntrega || {};
      const porCupom = statsAtuais.porCupom || {};

      if (codigoCupom) {
        if (!porCupom[codigoCupom]) {
          porCupom[codigoCupom] = { quantidadeUtilizada: 0, tipo: tipoCupom };
        }
        porCupom[codigoCupom].quantidadeUtilizada = Math.max(0, (porCupom[codigoCupom].quantidadeUtilizada || 0) - 1);
      }

      porFormaPagamento[formaPagamento] = Math.max(0, (porFormaPagamento[formaPagamento] || 0) - 1);
      porOrigem[origem] = Math.max(0, (porOrigem[origem] || 0) - 1);
      porFormaEntrega[formaEntrega] = Math.max(0, (porFormaEntrega[formaEntrega] || 0) - 1);

      totalPedidosAtualGlobal = Number(statsAtuais.totalPedidos || 0) + multiplicadorDRE;
      ticketMedioGlobal = totalPedidosAtualGlobal > 0 ? Number((dreRecalculadaFinal.receitaLiquida / totalPedidosAtualGlobal).toFixed(2)) : 0;

      t.set(
        statsRef,
        {
          ...dreRecalculadaFinal,
          totalPedidos: FieldValue.increment(multiplicadorDRE),
          ticketMedio: ticketMedioGlobal,
          detalhamento: {
            receitaBrutaProdutos: FieldValue.increment(subtotal * multiplicadorDRE),
            receitaFreteEntregaLocal: FieldValue.increment(receitaFreteEntregaLocalValor * multiplicadorDRE),
            receitaFreteTransportadora: FieldValue.increment(receitaFreteTransportadoraValor * multiplicadorDRE),
            gastoTotalCupons: FieldValue.increment(descontoCupom * multiplicadorDRE),
            numeroCuponsUtilizado: FieldValue.increment(teveCupomUtilizado * multiplicadorDRE),
            taxasGatewayCartao: FieldValue.increment(taxaGatewayCartaoPedido * multiplicadorDRE),
            comissoesVendas: FieldValue.increment(comissaoVendaPedido * multiplicadorDRE),
            custoEtiquetasLojistaTotal: FieldValue.increment(custoEtiquetaValor * multiplicadorDRE),
            custoFreteReversoTotal: FieldValue.increment(custoFreteReversoPedido), 
            custoFreteEntregaLocal: FieldValue.increment(custoEntregaLocalValor * multiplicadorDRE),
            custoTotalProdutos: FieldValue.increment(custoTotalPedidoGeral * multiplicadorDRE),
            numeroItensVendidos: FieldValue.increment(qtdTotalItensPedido * multiplicadorDRE),
            saldoDivergenciaFrete: FieldValue.increment(divergenciaFretePedido * multiplicadorDRE),
            totalDesviosEmbalagemRecomendada: FieldValue.increment(desvioEmbalagemPedido * multiplicadorDRE),
          },
          porFormaPagamento,
          porOrigem,
          porFormaEntrega,
          porCupom,
          ultimaAtualizacao: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    // ======================================================================================
    // 2. CHAMADA DOS MÓDULOS EXTERNOS
    // ======================================================================================
    await processarRankingProdutosClientes({
      db,
      lojistaId,
      chaveMes,
      subtotal,
      descontoCupom,
      qtdTotalItensPedido,
      custoTotalPedidoGeral,
      multiplicador: multiplicadorDRE,
      listaVendaUnica,
      newData,
    });

    await processarRankingEmbalagens({
      db,
      lojistaId,
      chaveMes,
      embalagemDados: newData.Embalagem,
      multiplicador: multiplicadorDRE,
    });

    await processarMasterDashboard({
      db,
      lojistaId,
      chaveMes,
      chaveAnual,
      anoValido,
      faturamentoLiquidoAtualizadoGlobal: dreRecalculadaFinal.receitaLiquida,
      lucroBrutoOperacaoAtualizadoGlobal: dreRecalculadaFinal.lucroBruto,
      totalPedidosAtualGlobal,
      ticketMedioGlobal,
      total,
      multiplicador: multiplicadorDRE,
    });

    await processarHistoricoLojista({
      db,
      lojistaId,
      chaveMes,
      anoValido,
      faturamentoLiquidoAtualizadoGlobal: dreRecalculadaFinal.receitaLiquida,
      total,
      multiplicador: multiplicadorDRE,
    });

    // ======================================================================================
    // 3. RETORNO / ESTORNO DO ESTOQUE FÍSICO DO PRODUTO E DOS INSUMOS DE COMPOSIÇÃO
    // ======================================================================================
    const dataMovimentacaoIso = new Date().toISOString();

    await db.runTransaction(async (t) => {
      const acoesPorProduto = {};
      const insumosParaAtualizar = {};
      const logsParaSalvar = [];

      const insumosSnaps = {};
      for (const itemU of listaVendaUnica) {
        if (fatorEstoqueReverso > 0 && Array.isArray(itemU.insumosComposicaoProduto)) {
          for (const ins of itemU.insumosComposicaoProduto) {
            const insumoId = String(ins.id || ins.idInsumo || "").trim();
            if (insumoId && !insumosSnaps[insumoId]) {
              const insumoRef = db.doc(`lojistas/${lojistaId}/insumos_composicao/${insumoId}`);
              insumosSnaps[insumoId] = { ref: insumoRef, snap: await t.get(insumoRef) };
            }
          }
        }
      }

      for (const itemU of listaVendaUnica) {
        if (!itemU.idProduto) continue;

        if (!acoesPorProduto[itemU.idProduto]) {
          const produtoRef = db.doc(`lojistas/${lojistaId}/produtos/${itemU.idProduto}`);
          const produtoSnap = await t.get(produtoRef);

          if (!produtoSnap.exists) continue;

          acoesPorProduto[itemU.idProduto] = {
            ref: produtoRef,
            dados: produtoSnap.data(),
            itensParaAjustar: [],
          };
        }
        acoesPorProduto[itemU.idProduto].itensParaAjustar.push(itemU);
      }

      for (const idProduto in acoesPorProduto) {
        const prodInfo = acoesPorProduto[idProduto];
        const dadosProd = prodInfo.dados;
        const nomeProdutoGeral = String(dadosProd.dsNomeProduto || dadosProd.nmProduto || dadosProd.nome || "Produto").trim();

        const variacoesAtuais = dadosProd.variacoes || [];
        let estoqueSimplesAtual = Number(
          dadosProd.nrEstoqueProduto || dadosProd.estoque || dadosProd.nrEstoque || 0
        );

        if (Array.isArray(variacoesAtuais) && variacoesAtuais.length > 0) {
          let novasVariacoes = JSON.parse(JSON.stringify(variacoesAtuais));

          for (const itemUnico of prodInfo.itensParaAjustar) {
            const idVarAlvo = String(itemUnico.idVariacao || "").trim();
            const qtdEfetivaAjuste = itemUnico.qtdItem * fatorEstoqueReverso;

            if (!idVarAlvo) {
              estoqueSimplesAtual = Math.max(0, estoqueSimplesAtual + qtdEfetivaAjuste);
              continue;
            }

            novasVariacoes = novasVariacoes.map((v) => {
              const idVarBanco = String(v.idVariacao || "").trim();

              if (idVarBanco && idVarBanco === idVarAlvo) {
                const estoqueAtualVar = Number(v.nrEstoqueProduto || v.estoque || v.nrEstoque || 0);
                const novoEstoqueVar = Math.max(0, estoqueAtualVar + qtdEfetivaAjuste);

                v.estoque = novoEstoqueVar;
                v.nrEstoque = novoEstoqueVar;
                v.nrEstoqueProduto = novoEstoqueVar;

                const nomeVariacaoDescritiva = String(v.dsVariacaoProduto || v.dsNomeProduto || itemUnico.variacaoProduto || "Padrão");

                if (fatorEstoqueReverso !== 0) {
                  const logRef = db.collection(`lojistas/${lojistaId}/movimentacoes_estoque`).doc();
                  logsParaSalvar.push({
                    ref: logRef,
                    data: {
                      dataMovimentacao: dataMovimentacaoIso,
                      nomeItem: nomeProdutoGeral,
                      variacao: nomeVariacaoDescritiva,
                      tipoItem: "produto",
                      tipoMovimentacao: "ENTRADA",
                      origem: `Devolução Pedido #${newData.nrNumeroPedido || pedidoId.slice(-4)}`,
                      quantidade: Math.abs(qtdEfetivaAjuste),
                      estoqueAnterior: estoqueAtualVar,
                      estoqueAtual: novoEstoqueVar,
                      operador: "Sistema",
                      pedidoId: pedidoId
                    }
                  });
                }
              }
              return v;
            });

            if (fatorEstoqueReverso > 0 && Array.isArray(itemUnico.insumosComposicaoProduto)) {
              for (const ins of itemUnico.insumosComposicaoProduto) {
                const insumoId = String(ins.id || ins.idInsumo || "").trim();
                if (insumoId) {
                  const qtdPorUnidade = Number(ins.nrQuantidadeConsumida || ins.quantidade || 0);
                  const qtdConsumidaTotal = qtdPorUnidade * itemUnico.qtdItem;
                  const nomeInsumo = String(ins.dsNomeInsumo || ins.nmInsumo || ins.nome || "Insumo").trim();

                  if (!insumosParaAtualizar[insumoId]) {
                    insumosParaAtualizar[insumoId] = {
                      quantidadeTotal: 0,
                      nomeInsumo: nomeInsumo
                    };
                  }
                  insumosParaAtualizar[insumoId].quantidadeTotal += qtdConsumidaTotal;
                }
              }
            }
          }

          t.update(prodInfo.ref, {
            variacoes: novasVariacoes,
            estoque: estoqueSimplesAtual,
            nrEstoque: estoqueSimplesAtual,
            nrEstoqueProduto: estoqueSimplesAtual,
          });
        } else {
          let totalAjusteSimples = 0;
          for (const itemUnico of prodInfo.itensParaAjustar) {
            totalAjusteSimples += itemUnico.qtdItem;

            if (fatorEstoqueReverso > 0 && Array.isArray(itemUnico.insumosComposicaoProduto)) {
              for (const ins of itemUnico.insumosComposicaoProduto) {
                const insumoId = String(ins.id || ins.idInsumo || "").trim();
                if (insumoId) {
                  const qtdPorUnidade = Number(ins.nrQuantidadeConsumida || ins.quantidade || 0);
                  const qtdConsumidaTotal = qtdPorUnidade * itemUnico.qtdItem;
                  const nomeInsumo = String(ins.dsNomeInsumo || ins.nmInsumo || ins.nome || "Insumo").trim();

                  if (!insumosParaAtualizar[insumoId]) {
                    insumosParaAtualizar[insumoId] = {
                      quantidadeTotal: 0,
                      nomeInsumo: nomeInsumo
                    };
                  }
                  insumosParaAtualizar[insumoId].quantidadeTotal += qtdConsumidaTotal;
                }
              }
            }
          }

          const qtdEfetivaAjusteSimples = totalAjusteSimples * fatorEstoqueReverso;
          const novoEstoqueSimples = Math.max(0, estoqueSimplesAtual + qtdEfetivaAjusteSimples);

          t.update(prodInfo.ref, {
            estoque: novoEstoqueSimples,
            nrEstoque: novoEstoqueSimples,
            nrEstoqueProduto: novoEstoqueSimples,
          });

          if (fatorEstoqueReverso !== 0) {
            const logRef = db.collection(`lojistas/${lojistaId}/movimentacoes_estoque`).doc();
            logsParaSalvar.push({
              ref: logRef,
              data: {
                dataMovimentacao: dataMovimentacaoIso,
                nomeItem: nomeProdutoGeral,
                variacao: "",
                tipoItem: "produto",
                tipoMovimentacao: "ENTRADA",
                origem: `Devolução Pedido #${newData.nrNumeroPedido || pedidoId.slice(-4)}`,
                quantidade: Math.abs(qtdEfetivaAjusteSimples),
                estoqueAnterior: estoqueSimplesAtual,
                estoqueAtual: novoEstoqueSimples,
                operador: "Sistema",
                pedidoId: pedidoId
              }
            });
          }
        }
      }

      for (const insumoId in insumosParaAtualizar) {
        const infoInsumo = insumosParaAtualizar[insumoId];
        const dadosInsumo = insumosSnaps[insumoId];

        if (dadosInsumo && dadosInsumo.snap.exists) {
          const insData = dadosInsumo.snap.data();
          const estoqueInsumoAtual = Number(insData.nrEstoqueAtualInsumo || insData.estoque || 0);
          const novoEstoqueInsumo = estoqueInsumoAtual + infoInsumo.quantidadeTotal;

          t.update(dadosInsumo.ref, { nrEstoqueAtualInsumo: novoEstoqueInsumo });

          const logInsumoRef = db.collection(`lojistas/${lojistaId}/movimentacoes_estoque`).doc();
          logsParaSalvar.push({
            ref: logInsumoRef,
            data: {
              dataMovimentacao: dataMovimentacaoIso,
              nomeItem: infoInsumo.nomeInsumo,
              variacao: "",
              tipoItem: "insumo",
              tipoMovimentacao: "ENTRADA",
              origem: `Retorno Composição (Devolução Pedido #${newData.nrNumeroPedido || pedidoId.slice(-4)})`,
              quantidade: infoInsumo.quantidadeTotal,
              estoqueAnterior: estoqueInsumoAtual,
              estoqueAtual: novoEstoqueInsumo,
              operador: "Sistema",
              pedidoId: pedidoId
            }
          });
        }
      }

      for (const logItem of logsParaSalvar) {
        t.set(logItem.ref, logItem.data);
      }
    });

    // ======================================================================================
    // 4. REGISTRO DE ESTATÍSTICAS E SEPARAÇÃO NOS ARRAYS DE DEVOLUÇÕES
    // ======================================================================================
    await db.runTransaction(async (t) => {
      const docDevSnap = await t.get(devolucaoStatsRef);
      const dadosDevAtual = docDevSnap.exists ? docDevSnap.data() : { 
        totalDevolucoes: 0, 
        valorTotalDevolucoes: 0, 
        custoFreteReversoAcumulado: 0, 
        motivosDevolucao: {}, 
        itensPrateleira: [],    
        itensDescartados: []    
      };

      const totalDevolucoesAtualizado = Math.max(0, (dadosDevAtual.totalDevolucoes || 0) + multiplicadorDevolucao);
      const valorTotalDevolucoesAtualizado = Math.max(0, (dadosDevAtual.valorTotalDevolucoes || 0) + (total * multiplicadorDevolucao));
      const custoFreteReversoAcumuladoAtualizado = Math.max(0, (Number(dadosDevAtual.custoFreteReversoAcumulado) || 0) + (custoFreteReversoPedido * multiplicadorDevolucao));

      const motivosDevolucao = dadosDevAtual.motivosDevolucao || {};
      const motivoKey = String(dadosDevPedido.dsMotivo || dadosDevPedido.motivo || "nao_informado").trim().toLowerCase();

      motivosDevolucao[motivoKey] = Math.max(0, (motivosDevolucao[motivoKey] || 0) + multiplicadorDevolucao);

      let itensPrateleiraArray = Array.isArray(dadosDevAtual.itensPrateleira) ? [...dadosDevAtual.itensPrateleira] : [];
      let itensDescartadosArray = Array.isArray(dadosDevAtual.itensDescartados) ? [...dadosDevAtual.itensDescartados] : [];

      for (const itemU of listaVendaUnica) {
        if (!itemU.idProduto) continue;

        const chaveItem = `${itemU.idProduto}_${itemU.idVariacao || "raiz"}`;

        if (isVoltaparaVenda) {
          const dadosPrateleiraObj = {
            pedidoId: pedidoId,
            chaveItem: chaveItem,
            idProduto: itemU.idProduto,
            idVariacao: itemU.idVariacao,
            nome: itemU.nomeProduto,
            variacao: itemU.variacaoProduto || "Padrão",
            total: itemU.qtdItem,
            valorTotalPrejuizo: itemU.precoUnitario * itemU.qtdItem,
            isVoltaparaVenda: true,
            custoFreteReverso: custoFreteReversoPedido,
            dataDevolucao: new Date().toISOString(),
            dadosProdutoCompleto: itemU.itemOriginal || {}
          };
          itensPrateleiraArray.push(dadosPrateleiraObj);
        } else {
          const dadosDescarteObj = {
            pedidoId: pedidoId,
            chaveItem: chaveItem,
            idProduto: itemU.idProduto,
            idVariacao: itemU.idVariacao,
            nome: itemU.nomeProduto,
            variacao: itemU.variacaoProduto || "Padrão",
            quantidade: itemU.qtdItem,
            custoUnitario: itemU.custoUnitario,
            precoUnitario: itemU.precoUnitario,
            custoTotalPrejuizo: itemU.custoUnitario * itemU.qtdItem,
            isVoltaparaVenda: false,
            dataDescarte: new Date().toISOString(),
            dadosProdutoCompleto: itemU.itemOriginal || {}
          };
          itensDescartadosArray.push(dadosDescarteObj);
        }
      }

      t.set(
        devolucaoStatsRef,
        {
          totalDevolucoes: totalDevolucoesAtualizado,
          valorTotalDevolucoes: valorTotalDevolucoesAtualizado,
          custoFreteReversoAcumulado: custoFreteReversoAcumuladoAtualizado,
          motivosDevolucao,
          itensPrateleira: itensPrateleiraArray,
          itensDescartados: itensDescartadosArray,
          ultimaAtualizacao: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    console.log(`✅ [Devolução Única] Processamento completo concluído com sucesso para o pedido ${pedidoId}`);
    return null;
  });