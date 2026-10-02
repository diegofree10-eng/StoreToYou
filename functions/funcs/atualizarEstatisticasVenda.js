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
// MOTOR DRE CORPORATIVO - BLINDAGEM MATEMÁTICA ABSOLUTA E EMBALAGENS
// ==========================================================================================
function calcularDRE(statsAtuais, alteracoes) {
  const receitaBruta = Number(
    (
      Number(statsAtuais.receitaBrutaProdutos || 0) +
      (alteracoes.receitaBrutaDelta || 0)
    ).toFixed(2),
  );
  const deducoes = Number(
    (
      Number(statsAtuais.deducoesVendas || 0) + (alteracoes.deducoesDelta || 0)
    ).toFixed(2),
  );
  const taxasCartao = Number(
    (
      Number(statsAtuais.taxasGatewayCartao || 0) + (alteracoes.taxasDelta || 0)
    ).toFixed(2),
  );
  const comissoes = Number(
    (
      Number(statsAtuais.comissoesVendas || 0) +
      (alteracoes.comissoesDelta || 0)
    ).toFixed(2),
  );

  const receitaLiquida = Number(
    Math.max(0, receitaBruta - deducoes - taxasCartao - comissoes).toFixed(2),
  );

  const cmv = Number(
    (Number(statsAtuais.cmv || 0) + (alteracoes.cmvDelta || 0)).toFixed(2),
  );
  const lucroBruto = Number((receitaLiquida - cmv).toFixed(2));

  const custoTotalEmbalagens = Number(
    (
      Number(statsAtuais.custoTotalEmbalagens || 0) +
      (alteracoes.embalagemDelta || 0)
    ).toFixed(2),
  );

  const despesasLogistica = Number(
    (
      Number(statsAtuais.despesasLogistica || 0) +
      (alteracoes.logisticaDelta || 0)
    ).toFixed(2),
  );

  const resultadoOperacional = Number(
    (lucroBruto - despesasLogistica - custoTotalEmbalagens).toFixed(2),
  );

  let calcFixas =
    Number(statsAtuais.totalDespesasFixas || 0) + (alteracoes.fixasDelta || 0);
  let calcVariaveis =
    Number(statsAtuais.totalDespesasVariaveis || 0) +
    (alteracoes.variaveisDelta || 0);

  const totalDespesasFixas = Number(Math.max(0, calcFixas).toFixed(2));
  const totalDespesasVariaveis = Number(Math.max(0, calcVariaveis).toFixed(2));

  const lucroLiquidoReal = Number(
    (
      resultadoOperacional -
      totalDespesasFixas -
      totalDespesasVariaveis
    ).toFixed(2),
  );

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

// ==========================================================================================
// 1. FUNÇÃO PRINCIPAL: ATUALIZAR ESTATISTICAS DE VENDAS E MASTER (COM CONTADOR DE MUDANÇAS)
// ==========================================================================================
exports.atualizarEstatisticasVenda = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onWrite(async (change, context) => {
    const lojistaId = context.params.lojistaId;
    const newData = change.after.exists ? change.after.data() : null;
    const antes = change.before.exists ? change.before.data() : null;

    if (!newData) return null;

    const contadorAntes = Number(antes?.nrContadorMudancas || 0);
    const contadorDepois = Number(newData.nrContadorMudancas || 0);
    
    const eraConcluido = antes ? Boolean(antes.isStatusPedidoConcluido) : false;
    const ehConcluido = Boolean(newData.isStatusPedidoConcluido);

    const mudouParaConcluido = !eraConcluido && ehConcluido;
    const deixouDeSerConcluido = eraConcluido && !ehConcluido;
    const foiEditadoConcluido = (contadorAntes !== contadorDepois) && ehConcluido && eraConcluido;

    if (!mudouParaConcluido && !deixouDeSerConcluido && !foiEditadoConcluido) {
      return null;
    }

    const multiplicador = mudouParaConcluido ? 1 : (deixouDeSerConcluido ? -1 : 0);
    const multFinal = foiEditadoConcluido ? 1 : multiplicador;

    let rawData = newData.timestamp || newData.data || Date.now();
    if (rawData && typeof rawData.toDate === "function") {
      rawData = rawData.toDate();
    }
    const dataPedido = new Date(rawData);

    const anoValido = !isNaN(dataPedido.getFullYear())
      ? dataPedido.getFullYear()
      : 2026;
    const mesValido = !isNaN(dataPedido.getMonth()) ? dataPedido.getMonth() : 7;

    const mesesNomes = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ];
    const chaveMes = `${mesesNomes[mesValido]}_${anoValido}`;
    const chaveAnual = `anual_${anoValido}`;

    const statsRef = db.doc(
      `lojistas/${lojistaId}/dashboard_stats/${chaveMes}`,
    );

    const fin = newData.financeiro || {};
    const log = newData.logistica || {};
    const etiqueta = newData.Etiqueta || {};
    const embalagem = newData.Embalagem || {};
    const embEscolhida = embalagem.escolhida || {};
    const embRecomendada = embalagem.recomendada || {};

    const subtotal = Number(fin.vlSubtotal ?? fin.subtotal ?? 0);
    const descontoCupom = Number(fin.vlDesconto ?? fin.desconto ?? 0);
    const freteCliente = Number(fin.vlFrete ?? fin.frete ?? log.vlFrete ?? 0);

    const taxaGatewayCartaoPedido = Number(
      fin.vlTaxaCartao ?? fin.taxaCartao ?? fin.vlGateway ?? 0,
    );
    const comissaoVendaPedido = Number(fin.vlComissao ?? fin.comissao ?? 0);

    const freteGratisFlag = Boolean(
      log.isFreteGratis ||
      fin.freteGratis ||
      log.dsTransportadoraId === "frete_gratis_ativado",
    );

    const formaEntrega = String(
      log.dsFormaEntrega || log.dsTransportadoraId || "",
    )
      .trim()
      .toLowerCase();

    const codigoCupom = String(fin.dsCupom || "").trim();
    const tipoCupom = String(
      fin.tpDesconto ||
        fin.tipoCupom ||
        (codigoCupom.includes("%") ? "porcentagem" : "valor_fixo"),
    )
      .trim()
      .toLowerCase();

    const isRetirada =
      log.isRetirada === true ||
      formaEntrega === "retirada" ||
      formaEntrega === "retirar_loja";

    const isEntregaLocal =
      log.isEntregaLocal === true && formaEntrega === "entrega_local";

    const isEntregaTransportadora =
      log.isEntregaTransportadora === true && formaEntrega === "transportadora";

    let receitaFreteEntregaLocalValor = 0;
    let custoEntregaLocalValor = 0;
    let receitaFreteTransportadoraValor = 0;
    let custoEtiquetaValor = 0;

    const valorEtiquetaBruto = Number(
      etiqueta.valorCobrado ?? etiqueta.vlValorCobrado ?? 0,
    );

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

      // 🌟 Custo da etiqueta para o lojista ocorre APENAS se for frete grátis real
      if (freteGratisFlag) {
        custoEtiquetaValor = valorEtiquetaBruto;
      } else {
        custoEtiquetaValor = 0; 
      }
    }

    const dadosDevPedido = newData.dadosDevolucao || {};
    const custoFreteReversoPedido = Number(
      dadosDevPedido.vlCustoFreteReverso ?? dadosDevPedido.custoFreteReverso ?? 0
    );

    const custoLogisticaTotalPedido = Number(
      (custoEtiquetaValor + custoFreteReversoPedido).toFixed(2)
    );

    const custoEmbalagemPedido = Number(
      embEscolhida.vlCustoEmbalagemEscolhida || 0,
    );
    const idEmbEscolhida = String(embEscolhida.id || "").trim();
    const idEmbRecomendada = String(embRecomendada.id || "").trim();
    const desvioEmbalagemPedido =
      idEmbRecomendada && idEmbEscolhida !== idEmbRecomendada ? 1 : 0;

    const divergenciaFretePedido = Number(
      (freteCliente - valorEtiquetaBruto).toFixed(2),
    );

    const teveCupomUtilizado = descontoCupom > 0 ? 1 : 0;

    const calcManual =
      subtotal - descontoCupom + (freteGratisFlag ? 0 : freteCliente);
    const total = Number(
      fin.vlTotal ??
        fin.total ??
        fin.valorTotal ??
        newData.total ??
        (calcManual > 0 ? calcManual : 0),
    );

    const formaPagamento = String(
      fin.dsFormaPagamentoCarrinho ||
        fin.metodo ||
        newData.formaPagamento ||
        "pix",
    )
      .trim()
      .toLowerCase();

    let origemBruta = String(
      newData.dsOrigemPedido ||
        newData.origemPedido ||
        newData.origem ||
        "site",
    ).trim();

    const origem = origemBruta.toLowerCase();

    const itensLista = newData.itens || [];
    let qtdTotalItensPedido = 0;
    const itensConsolidadosVenda = {};

    for (const item of itensLista) {
      const idProd = String(item.idProduto || item.id || "").trim();
      const qtdItem = Number(
        item.nrQuantidadeProduto || item.quantidade || item.qty || 1,
      );
      const variacaoItem = String(
        item.dsVariacaoProduto || item.variacao || "Padrão",
      ).trim();
      const nomeProdItem = String(
        item.dsNomeProduto || item.nome || "Produto Sem Nome",
      ).trim();

      let custoUnitarioItem = Number(
        item.vlCustoUnitarioProduto ?? item.custoUnitario ?? item.custo ?? 0,
      );
      if (isNaN(custoUnitarioItem)) custoUnitarioItem = 0;

      const qFinal = isNaN(qtdItem) || qtdItem <= 0 ? 1 : Number(qtdItem);
      qtdTotalItensPedido += qFinal;

      const chaveUnica = `${idProd}_${variacaoItem}`;
      if (itensConsolidadosVenda[chaveUnica]) {
        itensConsolidadosVenda[chaveUnica].qtdItem += qFinal;
      } else {
        itensConsolidadosVenda[chaveUnica] = {
          idProduto: idProd,
          variacaoProduto: variacaoItem,
          nomeProduto: nomeProdItem,
          qtdItem: qFinal,
          precoUnitario: Number(item.vlPrecoProduto ?? item.preco ?? 0),
          custoUnitario: custoUnitarioItem,
        };
      }
    }

    const listaVendaUnica = Object.values(itensConsolidadosVenda);

    let totalPedidosAtualGlobal = 0;
    let ticketMedioGlobal = 0;
    let custoTotalPedidoGeral = 0;
    let dreRecalculadaFinal = {};

    await db.runTransaction(async (t) => {
      const doc = await t.get(statsRef);
      const cacheProdutosVenda = {};

      for (const itemU of listaVendaUnica) {
        if (itemU.idProduto) {
          if (!cacheProdutosVenda[itemU.idProduto]) {
            const prodRef = db.doc(
              `lojistas/${lojistaId}/produtos/${itemU.idProduto}`,
            );
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

            if (
              itemU.variacaoProduto &&
              itemU.variacaoProduto !== "Padrão" &&
              variacoesAtuais.length > 0
            ) {
              const varEncontrada = variacoesAtuais.find((v) => {
                const nomeVarBanco = String(
                  v.dsNomeProduto || v.dsModelo || v.nome || v.dsNome || "",
                ).trim();
                return (
                  nomeVarBanco.toLowerCase() ===
                  itemU.variacaoProduto.toLowerCase()
                );
              });
              if (varEncontrada) {
                const custoVar = Number(
                  varEncontrada.vlCustoUnitarioProduto ??
                    varEncontrada.custo ??
                    varEncontrada.vlCustoUnitario ??
                    0,
                );
                if (!isNaN(custoVar) && custoVar > 0)
                  itemU.custoUnitario = custoVar;
              }
            } else {
              const custoRaiz = Number(
                dadosProd.vlCustoUnitarioProduto ??
                  dadosProd.vlCustoUnitario ??
                  dadosProd.custo ??
                  0,
              );
              if (!isNaN(custoRaiz) && custoRaiz > 0)
                itemU.custoUnitario = custoRaiz;
            }
          }
        }
        custoTotalPedidoGeral += itemU.custoUnitario * itemU.qtdItem;
      }

      const statsAtuais = doc.exists ? doc.data() : {};

      const alteracoes = {
        receitaBrutaDelta: subtotal * multFinal,
        deducoesDelta: descontoCupom * multFinal,
        taxasDelta: taxaGatewayCartaoPedido * multFinal,
        comissoesDelta: comissaoVendaPedido * multFinal,
        cmvDelta: custoTotalPedidoGeral * multFinal,
        logisticaDelta: custoLogisticaTotalPedido * multFinal,
        embalagemDelta: custoEmbalagemPedido * multFinal,
        fixasDelta: 0,
        variaveisDelta: 0,
      };

      dreRecalculadaFinal = calcularDRE(statsAtuais, alteracoes);

      if (fin.dsOperadorCaixa) {
        const operadorBruto = String(fin.dsOperadorCaixa).trim();
        const operadorIdSanitizado = operadorBruto
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_");
        const dataChaveDiaria = `${dataPedido.getFullYear()}-${String(dataPedido.getMonth() + 1).padStart(2, "0")}-${String(dataPedido.getDate()).padStart(2, "0")}`;
        const metaRef = db.doc(
          `lojistas/${lojistaId}/meta_colaboradores/${operadorIdSanitizado}/diario/${dataChaveDiaria}`,
        );

        const receitaLiquidaColaborador = subtotal - descontoCupom;
        const lucroGeradoColaborador =
          receitaLiquidaColaborador - custoTotalPedidoGeral;

        t.set(
          metaRef,
          {
            nomeColaborador: operadorBruto,
            totalVendidoBruto: FieldValue.increment(total * multFinal),
            totalReceitaProdutos: FieldValue.increment(
              receitaLiquidaColaborador * multFinal,
            ),
            custoProdutosVendidos: FieldValue.increment(
              custoTotalPedidoGeral * multFinal,
            ),
            lucroBrutoGerado: FieldValue.increment(
              lucroGeradoColaborador * multFinal,
            ),
            totalPedidosVendidos: FieldValue.increment(multFinal),
            totalItens: FieldValue.increment(
              qtdTotalItensPedido * multFinal,
            ),
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
          porCupom[codigoCupom] = {
            quantidadeUtilizada: 0,
            tipo: tipoCupom,
          };
        }

        if (multFinal > 0) {
          porCupom[codigoCupom].quantidadeUtilizada =
            (porCupom[codigoCupom].quantidadeUtilizada || 0) + 1;
        } else {
          porCupom[codigoCupom].quantidadeUtilizada = Math.max(
            0,
            (porCupom[codigoCupom].quantidadeUtilizada || 0) - 1,
          );
        }
      }

      if (multFinal > 0) {
        porFormaPagamento[formaPagamento] =
          (porFormaPagamento[formaPagamento] || 0) + 1;
        porOrigem[origem] = (porOrigem[origem] || 0) + 1;
        porFormaEntrega[formaEntrega] =
          (porFormaEntrega[formaEntrega] || 0) + 1;
      } else {
        porFormaPagamento[formaPagamento] = Math.max(
          0,
          (porFormaPagamento[formaPagamento] || 0) - 1,
        );
        porOrigem[origem] = Math.max(0, (porOrigem[origem] || 0) - 1);
        porFormaEntrega[formaEntrega] = Math.max(
          0,
          (porFormaEntrega[formaEntrega] || 0) - 1,
        );
      }

      totalPedidosAtualGlobal =
        Number(statsAtuais.totalPedidos || 0) + multFinal;
      ticketMedioGlobal =
        totalPedidosAtualGlobal > 0
          ? Number(
              (
                dreRecalculadaFinal.receitaLiquida / totalPedidosAtualGlobal
              ).toFixed(2),
            )
          : 0;

      t.set(
        statsRef,
        {
          ...dreRecalculadaFinal,
          totalPedidos: FieldValue.increment(multFinal),
          ticketMedio: ticketMedioGlobal,
          detalhamento: {
            receitaBrutaProdutos: FieldValue.increment(
              Number((subtotal * multFinal).toFixed(2)),
            ),
            receitaFreteEntregaLocal: FieldValue.increment(
              Number((receitaFreteEntregaLocalValor * multFinal).toFixed(2)),
            ),
            receitaFreteTransportadora: FieldValue.increment(
              Number((receitaFreteTransportadoraValor * multFinal).toFixed(2)),
            ),
            gastoTotalCupons: FieldValue.increment(
              Number((descontoCupom * multFinal).toFixed(2)),
            ),
            numeroCuponsUtilizado: FieldValue.increment(
              teveCupomUtilizado * multFinal,
            ),
            taxasGatewayCartao: FieldValue.increment(
              Number((taxaGatewayCartaoPedido * multFinal).toFixed(2)),
            ),
            comissoesVendas: FieldValue.increment(
              Number((comissaoVendaPedido * multFinal).toFixed(2)),
            ),
            custoEtiquetasLojistaTotal: FieldValue.increment(
              Number((custoEtiquetaValor * multFinal).toFixed(2)),
            ),
            custoFreteReversoTotal: FieldValue.increment(
              Number((custoFreteReversoPedido * multFinal).toFixed(2)),
            ),
            custoFreteEntregaLocal: FieldValue.increment(
              Number((custoEntregaLocalValor * multFinal).toFixed(2)),
            ),
            custoTotalProdutos: FieldValue.increment(
              Number((custoTotalPedidoGeral * multFinal).toFixed(2)),
            ),
            numeroItensVendidos: FieldValue.increment(
              qtdTotalItensPedido * multFinal,
            ),
            saldoDivergenciaFrete: FieldValue.increment(
              Number((divergenciaFretePedido * multFinal).toFixed(2)),
            ),
            custoTotalEmbalagens: FieldValue.increment(
              Number((custoEmbalagemPedido * multFinal).toFixed(2)),
            ),
            totalDesviosEmbalagemRecomendada: FieldValue.increment(
              desvioEmbalagemPedido * multFinal,
            ),
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

    await processarRankingProdutosClientes({
      db,
      lojistaId,
      chaveMes,
      subtotal,
      descontoCupom,
      qtdTotalItensPedido,
      custoTotalPedidoGeral,
      multiplicador: multFinal,
      listaVendaUnica,
      newData,
    });

    await processarRankingEmbalagens({
      db,
      lojistaId,
      chaveMes,
      embalagemDados: newData.Embalagem,
      multiplicador: multFinal,
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
      multiplicador: multFinal,
    });

    await processarHistoricoLojista({
      db,
      lojistaId,
      chaveMes,
      anoValido,
      faturamentoLiquidoAtualizadoGlobal: dreRecalculadaFinal.receitaLiquida,
      total,
      multiplicador: multFinal,
    });

    return null;
  });