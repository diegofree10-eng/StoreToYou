const functions = require("firebase-functions/v1");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");

admin.initializeApp();
const db = getFirestore();

// ==========================================================================================
// FUNÇÃO AUXILIAR: GERAÇÃO SEGURA DE CHAVE DO MÊS
// ==========================================================================================
function obterChaveMes(rawData) {
  let data = rawData;
  if (data && typeof data.toDate === "function") {
    data = data.toDate();
  }
  const dataObj = new Date(data || Date.now());
  const anoValido = !isNaN(dataObj.getFullYear())
    ? dataObj.getFullYear()
    : 2026;
  const mesValido = !isNaN(dataObj.getMonth()) ? dataObj.getMonth() : 7; // Agosto = 7

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
  return `${mesesNomes[mesValido]}_${anoValido}`;
}

// ==========================================================================================
// 1. FUNÇÃO DE ATUALIZAR ESTATISTICAS DE VENDAS
// ==========================================================================================
exports.atualizarEstatisticasVenda = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onWrite(async (change, context) => {
    const lojistaId = context.params.lojistaId;
    const newData = change.after.exists ? change.after.data() : null;
    const antes = change.before.exists ? change.before.data() : null;

    if (!newData) return null;

    // Se o pedido estiver marcado como devolvido, ignora
    if (
      newData.devolvido === true ||
      newData.dadosDevolucao?.isDevolucaoSolicitado === true
    ) {
      return null;
    }

    const statusNovo = String(
      newData.dsStatusPedido || newData.statusPedido || "",
    )
      .toLowerCase()
      .trim();
    const statusAntigo = antes
      ? String(antes.dsStatusPedido || antes.statusPedido || "")
          .toLowerCase()
          .trim()
      : "";

    const statusConcluidoValidos = [
      "concluído",
      "concluido",
      "finalizado",
      "entregue",
    ];

    const eraConcluido = statusConcluidoValidos.includes(statusAntigo);
    const ehConcluido = statusConcluidoValidos.includes(statusNovo);

    const mudouParaConcluido = !eraConcluido && ehConcluido;
    const deixouDeSerConcluido = eraConcluido && !ehConcluido;

    if (mudouParaConcluido || deixouDeSerConcluido) {
      let multiplicador = mudouParaConcluido ? 1 : -1;

      // 🗓️ Geração da chave do mês baseada na data do pedido
      let rawData = newData.timestamp || newData.data || Date.now();
      if (rawData && typeof rawData.toDate === "function") {
        rawData = rawData.toDate();
      }
      const dataPedido = new Date(rawData);
      
      const anoValido = !isNaN(dataPedido.getFullYear()) ? dataPedido.getFullYear() : 2026;
      const mesValido = !isNaN(dataPedido.getMonth()) ? dataPedido.getMonth() : 7;

      const mesesNomes = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
      ];
      const chave = `${mesesNomes[mesValido]}_${anoValido}`;

      const statsRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chave}`);
      const masterStatsRef = db.doc(`master_dashboard/stats_${chave}`);

      const fin = newData.financeiro || {};
      const log = newData.logistica || {};

      // 🌟 Mapeamento financeiro corrigido
      const subtotal = Number(fin.vlSubtotal ?? fin.subtotal ?? 0); // Receita Bruta de Produtos
      const descontoCupom = Number(fin.vlDesconto ?? fin.desconto ?? 0); // Gasto com Cupons
      const freteCliente = Number(fin.vlFrete ?? log.vlFrete ?? 0); // Receita de Frete do Cliente
      
      const freteGratisFlag = Boolean(log.isFreteGratis || fin.freteGratis || log.dsTransportadoraId === "frete_gratis_ativado");

      const formaEntrega = String(log.dsFormaEntrega || log.dsTransportadoraId || "").trim().toLowerCase();
      const isEntregaLocal = formaEntrega.includes("local") || formaEntrega.includes("motoboy") || formaEntrega.includes("retirada");

      const custoEtiquetaValor = !isEntregaLocal
        ? Number(newData.Cotacao?.vlFreteCotado ?? 0)
        : 0;

      const custoEntregaLocalValor = isEntregaLocal
        ? Number(log.custoEntregaLocal ?? log.vlFrete ?? 0)
        : 0;

      const teveCupomUtilizado = descontoCupom > 0 ? 1 : 0;

      const calcManual = subtotal - descontoCupom + (freteGratisFlag ? 0 : freteCliente);
      const total = Number(
        fin.vlTotal ?? fin.total ?? fin.valorTotal ?? newData.total ?? (calcManual > 0 ? calcManual : 0),
      );

      const formaPagamento = String(
        fin.dsFormaPagamentoCarrinho || fin.metodo || newData.formaPagamento || "pix",
      ).trim().toLowerCase();
      
      const origem = String(newData.origemPedido || "site").trim().toLowerCase();

      const itensLista = newData.itens || [];
      let qtdTotalItensPedido = 0;
      const itensConsolidadosVenda = {};

      for (const item of itensLista) {
        const idProd = String(item.idProduto || item.id || "").trim();
        const qtdItem = Number(item.nrQuantidadeProduto || item.quantidade || item.qty || 1);
        const variacaoItem = String(item.dsVariacaoProduto || item.variacao || "Padrão").trim();
        const nomeProdItem = String(item.dsNomeProduto || item.nome || "Produto Sem Nome").trim();

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

      // A. Transação Atômica: Loja e Custos
      await db.runTransaction(async (t) => {
        const doc = await t.get(statsRef);

        let custoTotalPedidoCalculado = 0;
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

              if (
                itemU.variacaoProduto &&
                itemU.variacaoProduto !== "Padrão" &&
                variacoesAtuais.length > 0
              ) {
                const varEncontrada = variacoesAtuais.find((v) => {
                  const nomeVarBanco = String(
                    v.dsNomeProduto || v.dsModelo || v.nome || v.dsNome || "",
                  ).trim();
                  return nomeVarBanco.toLowerCase() === itemU.variacaoProduto.toLowerCase();
                });
                if (varEncontrada) {
                  const custoVar = Number(
                    varEncontrada.vlCustoUnitarioProduto ??
                      varEncontrada.custo ??
                      varEncontrada.vlCustoUnitario ??
                      0,
                  );
                  if (!isNaN(custoVar) && custoVar > 0) {
                    itemU.custoUnitario = custoVar;
                  }
                }
              } else {
                const custoRaiz = Number(
                  dadosProd.vlCustoUnitarioProduto ??
                    dadosProd.vlCustoUnitario ??
                    dadosProd.custo ??
                    0,
                );
                if (!isNaN(custoRaiz) && custoRaiz > 0) {
                  itemU.custoUnitario = custoRaiz;
                }
              }
            }
          }

          custoTotalPedidoCalculado += itemU.custoUnitario * itemU.qtdItem;
        }

        const stats = doc.exists
          ? doc.data()
          : {
              faturamentoLiquido: 0,
              lucroBrutoOperacao: 0,
              totalPedidos: 0,
              detalhamento: {
                receitaBrutaProdutos: 0,
                receitaFreteCliente: 0,
                gastoTotalCupons: 0,
                numeroCuponsUtilizado: 0,
                custoEtiquetasLojistaTotal: 0,
                custoFreteEntregaLocal: 0,
                custoTotalProdutos: 0,
                numeroItensVendidos: 0,
              },
              porFormaPagamento: {},
              porOrigem: {},
              porFormaEntrega: {},
            };

        const detAtual = stats.detalhamento || {};
        
        // Mantemos os cálculos locais para saber o faturamento e lucro da transação atual
        const detTemp = {
          receitaBrutaProdutos:
            (Number(detAtual.receitaBrutaProdutos) || 0) + (subtotal * multiplicador),
          receitaFreteCliente:
            (Number(detAtual.receitaFreteCliente) || 0) + (freteCliente * multiplicador),
          gastoTotalCupons:
            (Number(detAtual.gastoTotalCupons) || 0) + (descontoCupom * multiplicador),
          numeroCuponsUtilizado:
            (Number(detAtual.numeroCuponsUtilizado) || 0) + (teveCupomUtilizado * multiplicador),
          custoEtiquetasLojistaTotal:
            (Number(detAtual.custoEtiquetasLojistaTotal) || 0) + (custoEtiquetaValor * multiplicador),
          custoFreteEntregaLocal:
            (Number(detAtual.custoFreteEntregaLocal) || 0) + (custoEntregaLocalValor * multiplicador),
          custoTotalProdutos:
            (Number(detAtual.custoTotalProdutos) || 0) + (Number(custoTotalPedidoCalculado || 0) * multiplicador),
          numeroItensVendidos: Math.max(
            0,
            (Number(detAtual.numeroItensVendidos) || 0) + (Number(qtdTotalItensPedido) * multiplicador),
          ),
        };

        const receitaBrutaAtualizada = Number(detTemp.receitaBrutaProdutos) || 0;
        const gastoCuponsAtualizado = Number(detTemp.gastoTotalCupons) || 0;
        const faturamentoLiquidoAtualizado = Math.max(0, receitaBrutaAtualizada - gastoCuponsAtualizado);

        const freteClienteAtualizado = Number(detTemp.receitaFreteCliente) || 0;
        const custoFreteLocalAtualizado = Number(detTemp.custoFreteEntregaLocal) || 0;
        const custoEtiquetasAtualizado = Number(detTemp.custoEtiquetasLojistaTotal) || 0;
        const custoTotalProdAtualizado = Number(detTemp.custoTotalProdutos) || 0;

        const lucroBrutoOperacaoAtualizado = (
          faturamentoLiquidoAtualizado +
          freteClienteAtualizado -
          custoFreteLocalAtualizado -
          custoEtiquetasAtualizado -
          custoTotalProdAtualizado
        );

        // 🌟 METAS DE COLABORADORES REFINADAS
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
          const lucroGeradoColaborador = receitaLiquidaColaborador - custoTotalPedidoCalculado;

          t.set(
            metaRef,
            {
              nomeColaborador: operadorBruto,
              totalVendidoBruto: FieldValue.increment(total * multiplicador),
              totalReceitaProdutos: FieldValue.increment(receitaLiquidaColaborador * multiplicador),
              custoProdutosVendidos: FieldValue.increment(custoTotalPedidoCalculado * multiplicador),
              lucroBrutoGerado: FieldValue.increment(lucroGeradoColaborador * multiplicador),
              totalPedidosVendidos: FieldValue.increment(multiplicador),
              totalItens: FieldValue.increment(qtdTotalItensPedido * multiplicador),
              ultimaAtualizacao: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }

        const porFormaPagamento = stats.porFormaPagamento || {};
        const porOrigem = stats.porOrigem || {};
        const porFormaEntrega = stats.porFormaEntrega || {};

        if (multiplicador > 0) {
          porFormaPagamento[formaPagamento] = (porFormaPagamento[formaPagamento] || 0) + 1;
          porOrigem[origem] = (porOrigem[origem] || 0) + 1;
          porFormaEntrega[formaEntrega] = (porFormaEntrega[formaEntrega] || 0) + 1;
        } else {
          porFormaPagamento[formaPagamento] = Math.max(0, (porFormaPagamento[formaPagamento] || 0) - 1);
          porOrigem[origem] = Math.max(0, (porOrigem[origem] || 0) - 1);
          porFormaEntrega[formaEntrega] = Math.max(0, (porFormaEntrega[formaEntrega] || 0) - 1);
        }

        const totalPedidosAtual = Number(stats.totalPedidos || 0) + multiplicador;

        t.set(
          statsRef,
          {
            faturamentoLiquido: faturamentoLiquidoAtualizado,
            lucroBrutoOperacao: lucroBrutoOperacaoAtualizado,
            totalPedidos: FieldValue.increment(multiplicador),
            ticketMedio:
              totalPedidosAtual > 0
                ? Number((faturamentoLiquidoAtualizado / totalPedidosAtual).toFixed(2))
                : 0,
            detalhamento: {
              receitaBrutaProdutos: FieldValue.increment(subtotal * multiplicador),
              receitaFreteCliente: FieldValue.increment(freteCliente * multiplicador),
              gastoTotalCupons: FieldValue.increment(descontoCupom * multiplicador),
              numeroCuponsUtilizado: FieldValue.increment(teveCupomUtilizado * multiplicador),
              custoEtiquetasLojistaTotal: FieldValue.increment(custoEtiquetaValor * multiplicador),
              custoFreteEntregaLocal: FieldValue.increment(custoEntregaLocalValor * multiplicador),
              custoTotalProdutos: FieldValue.increment(Number(custoTotalPedidoCalculado || 0) * multiplicador),
              numeroItensVendidos: FieldValue.increment(Number(qtdTotalItensPedido) * multiplicador),
            },
            porFormaPagamento,
            porOrigem,
            porFormaEntrega,
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });

     // B. Ranking de Produtos e Clientes Aprimorado com Margem de Lucro
      await db.runTransaction(async (t) => {
        const valorSubtotalPedido = subtotal > 0 ? subtotal : 1;
        const descontoTotalPedido = descontoCupom || 0;

        // Custos e lucros calculados para os produtos
        let custoTotalPedidoCliente = 0;

        listaVendaUnica.forEach((itemU) => {
          const varSanitizada = itemU.variacaoProduto
            ? itemU.variacaoProduto
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "_")
                .replace(/_+/g, "_")
            : "padrao";
          const idDocRanking = `${itemU.idProduto}_${varSanitizada}`;
          const prodRef = db.doc(
            `lojistas/${lojistaId}/dashboard_stats/${chave}/produtos_ranking/${idDocRanking}`,
          );

          const qtdItemMod = itemU.qtdItem * multiplicador;
          
          const valorBrutoItem = itemU.precoUnitario * Math.abs(qtdItemMod);
          const proporcaoItem = valorSubtotalPedido > 0 ? (valorBrutoItem / valorSubtotalPedido) : 0;
          const cupomItem = Number((descontoTotalPedido * proporcaoItem).toFixed(2));
          const valorLiquidoItem = Math.max(0, valorBrutoItem - cupomItem);

          // Custo e lucro do item no ranking do produto
          const custoTotalItem = itemU.custoUnitario * Math.abs(qtdItemMod);
          const lucroLiquidoItem = Math.max(0, valorLiquidoItem - custoTotalItem);
          
          // Cálculo da margem percentual de lucro da variação
          const margemPercentual = valorLiquidoItem > 0 ? Number(((lucroLiquidoItem / valorLiquidoItem) * 100).toFixed(2)) : 0;

          custoTotalPedidoCliente += custoTotalItem;

          t.set(
            prodRef,
            {
              nome: itemU.nomeProduto,
              variacao: itemU.variacaoProduto || "Padrão",
              // 🌟 Acumula o custo total somando as unidades vendidas de cada pedido novo (ex: 5 por unidade)
              vlCustoUnitarioProduto: FieldValue.increment(multiplicador > 0 ? custoTotalItem : -custoTotalItem),
              quantidadeVendida: FieldValue.increment(qtdItemMod),
              valorBrutoVendas: FieldValue.increment(multiplicador > 0 ? valorBrutoItem : -valorBrutoItem),
              totalCupomAplicado: FieldValue.increment(multiplicador > 0 ? cupomItem : -cupomItem),
              valorLiquidoVendas: FieldValue.increment(multiplicador > 0 ? valorLiquidoItem : -valorLiquidoItem),
              custoTotalVendas: FieldValue.increment(multiplicador > 0 ? custoTotalItem : -custoTotalItem),
              lucroBrutoVendas: FieldValue.increment(multiplicador > 0 ? lucroLiquidoItem : -lucroLiquidoItem),
              margemLucroMedia: margemPercentual,
            },
            { merge: true },
          );
        });

        const clienteInfo = newData.dsCliente || {};
        const enderecoInfo = newData.dsEndereco || newData.endereco || {};

        const cpfBruto = clienteInfo.dsCpfCliente || clienteInfo.cpf || "";
        const cpfLimpo = cpfBruto.replace(/[^0-9]/g, "");

        const idCliente = cpfLimpo.length > 0 ? cpfLimpo : "cliente_anonimo";
        const nomeCliente = clienteInfo.nmNomeCliente || clienteInfo.nome || "Cliente Sem Nome";
        const telefoneCliente = clienteInfo.dsTelefoneCliente || clienteInfo.telefone || "";

        const cidadeCliente = clienteInfo.dsCidadeCliente || enderecoInfo.dsCidadeCliente || enderecoInfo.cidade || "";
        const ufCliente = clienteInfo.dsUfCliente || enderecoInfo.dsUfCliente || enderecoInfo.uf || "";

        const clienteRef = db.doc(
          `lojistas/${lojistaId}/dashboard_stats/${chave}/clientes_ranking/${idCliente}`,
        );

        const valorBrutoPedidoCliente = subtotal;
        const totalCupomPedidoCliente = descontoCupom;
        const valorLiquidoPedidoCliente = Math.max(0, subtotal - descontoCupom);
        const lucroBrutoPedidoCliente = Math.max(0, valorLiquidoPedidoCliente - custoTotalPedidoCliente);

        t.set(
          clienteRef,
          {
            cpf: cpfBruto,
            nome: nomeCliente,
            telefone: telefoneCliente,
            cidade: cidadeCliente,
            uf: ufCliente,
            numeroItensComprados: FieldValue.increment(qtdTotalItensPedido * multiplicador),
            valorBrutoCompras: FieldValue.increment(multiplicador > 0 ? valorBrutoPedidoCliente : -valorBrutoPedidoCliente),
            totalCupomAplicado: FieldValue.increment(multiplicador > 0 ? totalCupomPedidoCliente : -totalCupomPedidoCliente),
            valorLiquidoCompras: FieldValue.increment(multiplicador > 0 ? valorLiquidoPedidoCliente : -valorLiquidoPedidoCliente),
            custoTotalCompras: FieldValue.increment(multiplicador > 0 ? custoTotalPedidoCliente : -custoTotalPedidoCliente),
            lucroBrutoGerado: FieldValue.increment(multiplicador > 0 ? lucroBrutoPedidoCliente : -lucroBrutoPedidoCliente),
            totalPedidos: FieldValue.increment(multiplicador),
            dataUltimaCompra: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });

      // C. Dashboard Master Global
      await db.runTransaction(async (t) => {
        const masterDoc = await t.get(masterStatsRef);
        const masterStats = masterDoc.exists
          ? masterDoc.data()
          : {
              faturamentoPlataforma: 0,
              totalPedidosPlataforma: 0,
              rankingLojistas: {},
            };
        const rankingLojistas = masterStats.rankingLojistas || {};

        if (!rankingLojistas[lojistaId]) {
          rankingLojistas[lojistaId] = { faturamento: 0, pedidos: 0 };
        }

        rankingLojistas[lojistaId].faturamento = Math.max(
          0,
          rankingLojistas[lojistaId].faturamento + total * multiplicador,
        );
        rankingLojistas[lojistaId].pedidos = Math.max(
          0,
          rankingLojistas[lojistaId].pedidos + multiplicador,
        );

        const fatPlatAtualizado = Math.max(
          0,
          (masterStats.faturamentoPlataforma || 0) + total * multiplicador,
        );
        const pedPlatAtualizado = Math.max(
          0,
          (masterStats.totalPedidosPlataforma || 0) + multiplicador,
        );

        t.set(
          masterStatsRef,
          {
            faturamentoPlataforma: fatPlatAtualizado,
            totalPedidosPlataforma: pedPlatAtualizado,
            ticketMedioPlataforma:
              pedPlatAtualizado > 0
                ? Number((fatPlatAtualizado / pedPlatAtualizado).toFixed(2))
                : 0,
            rankingLojistas,
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    }
    return null;
  });

// ==========================================================================================
// 2. FUNÇÃO PREPARAR NOVO LOGISTA
// ==========================================================================================
// Função para Preparar estrutura para novo lojista (Blindada contra colaboradores)
// ==========================================================================================

exports.prepararNovoLojista = functions
  .region("us-central1")
  .auth.user()
  .onCreate(async (user) => {
    const userId = user.uid;

    // 🛡️ VERIFICAÇÃO DE SEGURANÇA:
    const userDocRef = db.doc(`usuarios/${userId}`);
    const userDocSnap = await userDocRef.get();

    let codigoIndicador = null;

    if (userDocSnap.exists) {
      const userData = userDocSnap.data();
      
      // Se for colaborador, bloqueia a criação na raiz
      if (
        userData.dsTipoConta === "colaborador" ||
        userData.role === "colaborador"
      ) {
        console.log(
          `🛑 [Trigger Bloqueado] O usuário ${userId} é um colaborador. Nenhuma loja será criada na raiz.`,
        );
        return null;
      }

      // ✨ Recupera o código de indicação que foi salvo no documento do usuário pelo front-end
      if (userData.indicadoPor) {
        codigoIndicador = userData.indicadoPor;
      }
    }

    const lojistaId = userId;

    const estruturaLojista = {
      uid: userId,
      email: user.email || "",
      dsTipoConta: "logista",
      indicadoPor: codigoIndicador, // 👈 Campo que guarda quem indicou este lojista
      dataCadastro: Date.now(),
      dadosPessoais: {
        dsNomeResponsavel: "",
        dsRuaResponsavel: "",
        nrNumeroResponsavel: "",
        dsCepResponsavel: "",
        dsBairroResponsavel: "",
        dsCidadeResponsavel: "",
        dsUfResponsavel: "",
        dsTelResponsavel: "",
        dsRole: "admin",
      },
      dadosLoja: {
        dsRuaLoja: "",
        nrNumeroLoja: "",
        dsCepLoja: "",
        dsBairroLoja: "",
        dsCidadeLoja: "",
        dsUfLoja: "",
        nrWhatssapLoja: "",
        tsCriacaoLoja: FieldValue.serverTimestamp(),
        nrCnpjCpfLoja: "",
        dsStatusLoja: "ativo",
        dsCicloLoja: "mensal",
        isAtivoLoja: "ativo",
        dsPlanoLoja: "Bronze",
        tsVencimentoLoja: Timestamp.fromDate(
          new Date(new Date().setMonth(new Date().getMonth() + 1)),
        ),
        dsLogoLoja: "",
        isLojaAberta: true,
        dsSeguimentoLoja: "",
        ultimoLogin: FieldValue.serverTimestamp(),
      },
      banners: {
        dsDesktop: [],
        dsMobile: [],
        dsBanner1: "",
        dsBanner2: "",
        dsBanner3: "",
      },
      pagamentos: {
        dsChavePix: "",
        dsMercadoPago: { publicKey: "", accessToken: "", ativo: false },
        dsPagSeguro: { token: "", email: "", ativo: false },
      },
      aparencia: {
        dscorFundo: "#f8fafc",
        dscorPrincipal: "#FF8C00",
        dscorSecundaria: "#F5F5DC",
        dscorTextoCard: "#1e293b",
        isModoNoturno: false,
      },
      sistema: {
        isFreteGratisAtivo: false,
        vlFreteGratisMinimo: 0,
        isFreteLocal: false,
        vlFreteLocal: 0,
        isRetiradaLoja: false,
        dsTokenMelhorEnvio: "",
        isAutomacaoCompletaMelhorEnvio: false,
        isTransportadoraAtivo: false,
        dsTransportadoras: {
          correios: true,
          jadlog: true,
          azul: true,
          latam: true,
        },
        nrDiasTesteOuro: 0,
        dsPlanoTeste: "",
        isTesteOuroAtivo: false,
        tsVencimentoTeste: null,
        isMelhorEnvioSandbox: false,
      },
      atualizacao: {
        nrVersaoSistemaLogista: "0.0.0",
        nrVersaoSchemaLogista: 0,
      },
      cupons: {},
      financeiro: {
        vlLucroReal: 0,
        vlMetaFaturamentoMensal: 0,
        vlTicketMedio: 0,
      },
      redesSociais: [],
    };

    await db
      .doc(`lojistas/${lojistaId}`)
      .set(estruturaLojista, { merge: true });

    // ✨ Se existe um indicador válido, registra automaticamente na subcoleção de indicações do "padrinho"
    if (codigoIndicador && codigoIndicador !== lojistaId) {
      try {
        const nomeLojaNovo = userDocSnap.exists ? (userDocSnap.data().nomeLoja || "Nova Loja") : "Nova Loja";
        await db
          .doc(`lojistas/${codigoIndicador}/indicacoes/${lojistaId}`)
          .set({
            uidIndicado: lojistaId,
            emailIndicado: user.email || "",
            nomeIndicado: nomeLojaNovo,
            dataCadastro: new Date().toISOString(),
            status: "pendente" // Ficará pendente até virar assinante pago
          });
      } catch (errInd) {
        console.error("Erro ao registrar indicação na função trigger:", errInd);
      }
    }

    await db
      .collection(`lojistas/${lojistaId}/assinaturas`)
      .doc("registro_inicial")
      .set({
        vlAssinaturaLojista: 0,
        tsAssinaturaLojista: FieldValue.serverTimestamp(),
        dsStatusPagamentoLojista: "Ativação",
        dsMesReferencia: "Cadastro Inicial",
        createdAt: FieldValue.serverTimestamp(),
      });

    await db.collection(`lojistas/${lojistaId}/mensagens`).add({
      titulo: "Bem-vindo!",
      texto: "...",
      dataEnvio: FieldValue.serverTimestamp(),
      lida: false,
      prioridade: "alta",
      categoria: "sistema",
    });

    await db
      .doc(`lojistas/${lojistaId}/categorias/geral`)
      .set({ nome: "Geral" });

    return null;
  });

// ==========================================================================================
// 3. FUNÇÃO REVERTER PLANOS VENCIDOS
// ==========================================================================================
// 3 Função para Reverter planos de teste Ouro vencidos
// ==========================================================================================

exports.reverterPlanosVencidos = functions
  .region("southamerica-east1")
  .pubsub.schedule("0 3 * * *")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    const agora = Timestamp.now();
    const snapshot = await db
      .collection("lojistas")
      .where("sistema.isTesteOuroAtivo", "==", true)
      .get();

    if (snapshot.empty) return null;

    const promessas = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const vencimento = data.sistema?.tsVencimentoTeste;
      if (vencimento && vencimento.toMillis() < agora.toMillis()) {
        promessas.push(
          doc.ref.update({
            "sistema.dsPlanoTeste": "",
            "sistema.tsVencimentoTeste": null,
            "sistema.isTesteOuroAtivo": false,
          }),
        );
      }
    });
    await Promise.all(promessas);
    return null;
  });

// ==========================================================================================
// 4. FUNÇÃO VERIFICAR PAGAMENTO DOS LOGISTAS
// ==========================================================================================
// Função para Verificar pagamento de lojistas
// ==========================================================================================

exports.verificarPagamentoLojistas = functions
  .region("southamerica-east1")
  .pubsub.schedule("0 8 * * *")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    const agora = Timestamp.now();

    const snapshot = await db
      .collection("lojistas")
      .where("dadosLoja.dsStatusLoja", "==", "ativo")
      .where("dadosLoja.tsVencimentoLoja", "<", agora)
      .get();

    if (snapshot.empty) return null;

    const promessas = snapshot.docs.map((doc) =>
      doc.ref.update({ "dadosLoja.dsStatusLoja": "suspenso" }),
    );

    await Promise.all(promessas);
    return null;
  });

// ==========================================================================================
// 5. FUNÇÃO CONTABILIZAR VENDAS PELO PDV
// ==========================================================================================
exports.contabilizarVendaPdvV2 = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onCreate(async (snap, context) => {
    const pedido = snap.data();
    const lojistaId = context.params.lojistaId;

    if (pedido.origemPedido !== "Pdv") {
      return null;
    }

    const fin = pedido.financeiro || {};
    const itens = pedido.itens || [];

    const operadorBruto = fin.dsOperadorCaixa || "Balcão";
    const operadorIdSanitizado = String(operadorBruto)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_");

    const qtdItensTotal = itens.reduce(
      (acc, item) =>
        acc +
        Number(item.nrQuantidadeProduto || item.quantidade || item.qty || 1),
      0,
    );
    const valorTotalPedido = Number(fin.vlTotal || 0);

    const dataPedido = new Date(pedido.data || Date.now());
    const dataChaveDiaria = `${dataPedido.getFullYear()}-${String(dataPedido.getMonth() + 1).padStart(2, "0")}-${String(dataPedido.getDate()).padStart(2, "0")}`;

    const metaRef = db.doc(
      `lojistas/${lojistaId}/meta_colaboradores/${operadorIdSanitizado}/diario/${dataChaveDiaria}`,
    );

    try {
      await metaRef.set(
        {
          nomeColaborador: operadorBruto,
          totalVendido: FieldValue.increment(valorTotalPedido),
          totalPedidosVendidos: FieldValue.increment(1),
          totalItens: FieldValue.increment(qtdItensTotal),
          ultimaAtualizacao: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Erro ao gravar meta PDV:", error);
    }

    return null;
  });

// ==========================================================================================
// 6. FUNÇÃO DAR BAIXA NO ESTOQUE (CORRIGIDA)
// ==========================================================================================

exports.darBaixaEstoqueUniversal = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onCreate(async (snap, context) => {
    const pedido = snap.data();
    const lojistaId = context.params.lojistaId;

    const itens = pedido.itens || [];
    if (itens.length === 0) return null;

    // 1. Consolida os itens do pedido por idProduto + idVariacao
    const itensConsolidados = {};
    for (const item of itens) {
      const idProduto = String(item.idProduto || "").trim();
      if (!idProduto) continue;

      const idVariacao = String(item.idVariacao || "").trim();
      const variacaoTexto = String(item.dsVariacaoProduto || "Padrão").trim();
      const qtdVendida = Number(item.nrQuantidadeProduto || item.qty || 1);

      // Chave única para agrupar caso o mesmo item/variação repita no carrinho
      const chaveUnica = `${idProduto}_${idVariacao || variacaoTexto}`;

      if (itensConsolidados[chaveUnica]) {
        itensConsolidados[chaveUnica].qtdVendida += qtdVendida;
      } else {
        itensConsolidados[chaveUnica] = {
          idProduto,
          idVariacao,
          variacaoTexto,
          qtdVendida: isNaN(qtdVendida) || qtdVendida <= 0 ? 1 : qtdVendida,
          itemOriginal: item,
        };
      }
    }

    const listaParaBaixa = Object.values(itensConsolidados);
    if (listaParaBaixa.length === 0) return null;

    await db.runTransaction(async (t) => {
      const acoesPorProduto = {};
      const insumosParaAtualizar = {};

      // FASE 1: LEITURA DOS PRODUTOS
      for (const itemUnico of listaParaBaixa) {
        if (!acoesPorProduto[itemUnico.idProduto]) {
          const produtoRef = db.doc(
            `lojistas/${lojistaId}/produtos/${itemUnico.idProduto}`
          );
          const produtoSnap = await t.get(produtoRef);

          if (!produtoSnap.exists) continue;

          acoesPorProduto[itemUnico.idProduto] = {
            ref: produtoRef,
            dados: produtoSnap.data(),
            itensParaBaixar: [],
          };
        }
        acoesPorProduto[itemUnico.idProduto].itensParaBaixar.push(itemUnico);
      }

      // FASE 1.1: LEITURA PRÉVIA DOS INSUMOS DE COMPOSIÇÃO NA COLEÇÃO CORRETA
      const insumosSnaps = {};
      for (const idProduto in acoesPorProduto) {
        const prodInfo = acoesPorProduto[idProduto];
        for (const itemUnico of prodInfo.itensParaBaixar) {
          const movComposicao = itemUnico.itemOriginal.movimentarEstoqueComposicao ?? true;
          const insumosLista = itemUnico.itemOriginal.insumosComposicaoProduto || [];

          if (movComposicao && Array.isArray(insumosLista)) {
            for (const ins of insumosLista) {
              const insumoId = String(ins.id || ins.idInsumo || "").trim();
              if (insumoId && !insumosSnaps[insumoId]) {
                const insumoRef = db.doc(`lojistas/${lojistaId}/insumos_composicao/${insumoId}`);
                insumosSnaps[insumoId] = { ref: insumoRef, snap: await t.get(insumoRef) };
              }
            }
          }
        }
      }

      // FASE 2: PROCESSAMENTO E CÁLCULOS DE ESTOQUE (PRODUTOS, VARIAÇÕES E INSUMOS)
      for (const idProduto in acoesPorProduto) {
        const prodInfo = acoesPorProduto[idProduto];
        const dadosProd = prodInfo.dados;

        const variacoesAtuais = dadosProd.variacoes || [];
        let estoqueSimplesAtual = Number(
          dadosProd.nrEstoqueProduto || dadosProd.estoque || 0
        );

        if (Array.isArray(variacoesAtuais) && variacoesAtuais.length > 0) {
          let novasVariacoes = JSON.parse(JSON.stringify(variacoesAtuais));

          for (const itemUnico of prodInfo.itensParaBaixar) {
            const movEstoqueVar = itemUnico.itemOriginal.movimentarEstoque ?? true;
            const movComposicaoVar = itemUnico.itemOriginal.movimentarEstoqueComposicao ?? true;
            const idVarPedido = itemUnico.idVariacao;
            const varPedidoLimpa = itemUnico.variacaoTexto.toLowerCase();

            novasVariacoes = novasVariacoes.map((v) => {
              const idVarBanco = String(v.idVariacao || "").trim();
              const nomeVarBanco = String(v.dsNomeVar1Produto || v.dsNomeProduto || "").trim().toLowerCase();
              const modeloBanco = String(v.dsModeloProduto || v.modelo || "").trim().toLowerCase();
              const varTextoBanco = String(v.dsVariacaoProduto || "").trim().toLowerCase();

              // 🌟 Identificação prioritária pelo ID único da variação
              const batePorId = idVarPedido && idVarBanco && idVarPedido === idVarBanco;
              const batePorTexto = 
                !varPedidoLimpa ||
                varPedidoLimpa === "padrão" ||
                nomeVarBanco === varPedidoLimpa ||
                modeloBanco === varPedidoLimpa ||
                varTextoBanco === varPedidoLimpa ||
                varPedidoLimpa.includes(modeloBanco) ||
                modeloBanco.includes(varPedidoLimpa);

              const bateVariacao = idVarPedido ? batePorId : batePorTexto;

              if (bateVariacao) {
                // 1. Baixa o estoque da variação específica do produto
                if (movEstoqueVar) {
                  const estoqueAtualVar = Number(
                    v.nrEstoqueProduto || v.estoque || v.nrEstoque || 0
                  );
                  const novoEstoqueVar = Math.max(
                    0,
                    estoqueAtualVar - itemUnico.qtdVendida
                  );

                  v.estoque = novoEstoqueVar;
                  v.nrEstoque = novoEstoqueVar;
                  v.nrEstoqueProduto = novoEstoqueVar;
                }

                // 2. Acumula os insumos da composição desta variação específica
                if (movComposicaoVar && Array.isArray(itemUnico.itemOriginal.insumosComposicaoProduto)) {
                  itemUnico.itemOriginal.insumosComposicaoProduto.forEach((ins) => {
                    const insumoId = String(ins.id || ins.idInsumo || "").trim();
                    if (insumoId) {
                      const qtdPorUnidade = Number(ins.nrQuantidadeConsumida || ins.quantidade || 0);
                      const qtdConsumidaTotal = qtdPorUnidade * itemUnico.qtdVendida;
                      insumosParaAtualizar[insumoId] = (insumosParaAtualizar[insumoId] || 0) + qtdConsumidaTotal;
                    }
                  });
                }
              }
              return v;
            });
          }

          t.update(prodInfo.ref, { variacoes: novasVariacoes });
        } else {
          // Produto Simples (Sem Variações cadastradas)
          let totalBaixaSimples = 0;
          let movEstoqueSimples = true;
          let movComposicaoSimples = true;

          for (const itemUnico of prodInfo.itensParaBaixar) {
            movEstoqueSimples = itemUnico.itemOriginal.movimentarEstoque ?? true;
            movComposicaoSimples = itemUnico.itemOriginal.movimentarEstoqueComposicao ?? true;
            totalBaixaSimples += itemUnico.qtdVendida;

            if (movComposicaoSimples && Array.isArray(itemUnico.itemOriginal.insumosComposicaoProduto)) {
              itemUnico.itemOriginal.insumosComposicaoProduto.forEach((ins) => {
                const insumoId = String(ins.id || ins.idInsumo || "").trim();
                if (insumoId) {
                  const qtdPorUnidade = Number(ins.nrQuantidadeConsumida || ins.quantidade || 0);
                  const qtdConsumidaTotal = qtdPorUnidade * itemUnico.qtdVendida;
                  insumosParaAtualizar[insumoId] = (insumosParaAtualizar[insumoId] || 0) + qtdConsumidaTotal;
                }
              });
            }
          }

          if (movEstoqueSimples) {
            const novoEstoqueSimples = Math.max(
              0,
              estoqueSimplesAtual - totalBaixaSimples
            );

            t.update(prodInfo.ref, {
              estoque: novoEstoqueSimples,
              nrEstoque: novoEstoqueSimples,
              nrEstoqueProduto: novoEstoqueSimples,
            });
          }
        }
      }

      // FASE 3: ESCRITA DAS BAIXAS DOS INSUMOS NA COLEÇÃO `insumos_composicao`
      for (const insumoId in insumosParaAtualizar) {
        const qtdTotalConsumida = insumosParaAtualizar[insumoId];
        const dadosInsumo = insumosSnaps[insumoId];

        if (dadosInsumo && dadosInsumo.snap.exists) {
          const insumoData = dadosInsumo.snap.data();
          const estoqueInsumoAtual = Number(
            insumoData.nrEstoqueAtualInsumo || insumoData.estoque || 0
          );
          
          const novoEstoqueInsumo = Math.max(0, estoqueInsumoAtual - qtdTotalConsumida);

          t.update(dadosInsumo.ref, {
            nrEstoqueAtualInsumo: novoEstoqueInsumo,
          });
        }
      }
    });

    return null;
  });

// ==========================================================================================
// 7. FUNÇÃO ATUALIZAR DEVOLUCAO PEDIDO
// ==========================================================================================
exports.atualizarDevolucaoPedido = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onWrite(async (change, context) => {
    const lojistaId = context.params.lojistaId;
    const newData = change.after.exists ? change.after.data() : null;
    const antes = change.before.exists ? change.before.data() : null;

    if (!newData) return null;

    const devolucaoAntes = Boolean(
      antes?.dadosDevolucao?.isDevolucaoSolicitado,
    );
    const devolucaoDepois = Boolean(
      newData?.dadosDevolucao?.isDevolucaoSolicitado,
    );

    const foiSolicitadaAgora = devolucaoDepois && !devolucaoAntes;
    const foiCanceladaAgora = !devolucaoDepois && devolucaoAntes;

    if (!foiSolicitadaAgora && !foiCanceladaAgora) return null;

    // 🔄 Fator multiplicador espelhado: Se solicitou devolução, desfaz a venda (-1). Se cancelou/restaurou, refaz (+1).
    let multiplicador = foiSolicitadaAgora ? -1 : 1;
    let fatorEstoqueReverso = foiSolicitadaAgora ? 1 : -1;

    // 🗓️ Geração da chave do mês baseada na data do pedido
    let rawData = newData.timestamp || newData.data || Date.now();
    if (rawData && typeof rawData.toDate === "function") {
      rawData = rawData.toDate();
    }
    const dataPedido = new Date(rawData);
    
    const anoValido = !isNaN(dataPedido.getFullYear()) ? dataPedido.getFullYear() : 2026;
    const mesValido = !isNaN(dataPedido.getMonth()) ? dataPedido.getMonth() : 7;

    const mesesNomes = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
    ];
    const chave = `${mesesNomes[mesValido]}_${anoValido}`;

    const statsRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chave}`);
    const masterStatsRef = db.doc(`master_dashboard/stats_${chave}`);

    const devolucaoStatsRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/devolucoes_${chave}`);

    const fin = newData.financeiro || {};
    const log = newData.logistica || {};

    const subtotal = Number(fin.vlSubtotal ?? fin.subtotal ?? 0); // Receita Bruta de Produtos
    const descontoCupom = Number(fin.vlDesconto ?? fin.desconto ?? 0); // Gasto com Cupons
    const freteCliente = Number(fin.vlFrete ?? log.vlFrete ?? 0); // Receita de Frete do Cliente
    
    const freteGratisFlag = Boolean(log.isFreteGratis || fin.freteGratis || log.dsTransportadoraId === "frete_gratis_ativado");

    const formaEntrega = String(log.dsFormaEntrega || log.dsTransportadoraId || "").trim().toLowerCase();
    const isEntregaLocal = formaEntrega.includes("local") || formaEntrega.includes("motoboy") || formaEntrega.includes("retirada");

    const custoEtiquetaValor = !isEntregaLocal
      ? Number(newData.Cotacao?.vlFreteCotado ?? 0)
      : 0;

    const custoEntregaLocalValor = isEntregaLocal
      ? Number(log.custoEntregaLocal ?? log.vlFrete ?? 0)
      : 0;

    const teveCupomUtilizado = descontoCupom > 0 ? 1 : 0;

    const calcManual = subtotal - descontoCupom + (freteGratisFlag ? 0 : freteCliente);
    const total = Number(
      fin.vlTotal ?? fin.total ?? fin.valorTotal ?? newData.total ?? (calcManual > 0 ? calcManual : 0),
    );

    const formaPagamento = String(
      fin.dsFormaPagamentoCarrinho || fin.metodo || newData.formaPagamento || "pix",
    ).trim().toLowerCase();
    
    const origem = String(newData.origemPedido || "site").trim().toLowerCase();

    const itensLista = newData.itens || [];
    let qtdTotalItensPedido = 0;
    const itensConsolidadosVenda = {};

    for (const item of itensLista) {
      const idProd = String(item.idProduto || item.id || "").trim();
      const qtdItem = Number(item.nrQuantidadeProduto || item.quantidade || item.qty || 1);
      const variacaoItem = String(item.dsVariacaoProduto || item.variacao || "Padrão").trim();
      const nomeProdItem = String(item.dsNomeProduto || item.nome || "Produto Sem Nome").trim();

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

    // A. Transação Atômica: Loja, Custos e Estatísticas Gerais
    await db.runTransaction(async (t) => {
      const doc = await t.get(statsRef);

      let custoTotalPedidoCalculado = 0;
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

            if (
              itemU.variacaoProduto &&
              itemU.variacaoProduto !== "Padrão" &&
              variacoesAtuais.length > 0
            ) {
              const varEncontrada = variacoesAtuais.find((v) => {
                const nomeVarBanco = String(
                  v.dsNomeProduto || v.dsModelo || v.nome || v.dsNome || "",
                ).trim();
                return nomeVarBanco.toLowerCase() === itemU.variacaoProduto.toLowerCase();
              });
              if (varEncontrada) {
                const custoVar = Number(
                  varEncontrada.vlCustoUnitarioProduto ??
                    varEncontrada.custo ??
                    varEncontrada.vlCustoUnitario ??
                    0,
                );
                if (!isNaN(custoVar) && custoVar > 0) {
                  itemU.custoUnitario = custoVar;
                }
              }
            } else {
              const custoRaiz = Number(
                dadosProd.vlCustoUnitarioProduto ??
                  dadosProd.vlCustoUnitario ??
                  dadosProd.custo ??
                  0,
              );
              if (!isNaN(custoRaiz) && custoRaiz > 0) {
                itemU.custoUnitario = custoRaiz;
              }
            }
          }
        }

        custoTotalPedidoCalculado += itemU.custoUnitario * itemU.qtdItem;
      }

      const stats = doc.exists ? doc.data() : { faturamentoLiquido: 0, lucroBrutoOperacao: 0, totalPedidos: 0, detalhamento: {} };
      const detAtual = stats.detalhamento || {};
      
      const detTemp = {
        receitaBrutaProdutos: (Number(detAtual.receitaBrutaProdutos) || 0) + (subtotal * multiplicador),
        receitaFreteCliente: (Number(detAtual.receitaFreteCliente) || 0) + (freteCliente * multiplicador),
        gastoTotalCupons: (Number(detAtual.gastoTotalCupons) || 0) + (descontoCupom * multiplicador),
        numeroCuponsUtilizado: (Number(detAtual.numeroCuponsUtilizado) || 0) + (teveCupomUtilizado * multiplicador),
        custoEtiquetasLojistaTotal: (Number(detAtual.custoEtiquetasLojistaTotal) || 0) + (custoEtiquetaValor * multiplicador),
        custoFreteEntregaLocal: (Number(detAtual.custoFreteEntregaLocal) || 0) + (custoEntregaLocalValor * multiplicador),
        custoTotalProdutos: (Number(detAtual.custoTotalProdutos) || 0) + (Number(custoTotalPedidoCalculado || 0) * multiplicador),
        numeroItensVendidos: Math.max(0, (Number(detAtual.numeroItensVendidos) || 0) + (Number(qtdTotalItensPedido) * multiplicador)),
      };

      const receitaBrutaAtualizada = Number(detTemp.receitaBrutaProdutos) || 0;
      const gastoCuponsAtualizado = Number(detTemp.gastoTotalCupons) || 0;
      const faturamentoLiquidoAtualizado = Math.max(0, receitaBrutaAtualizada - gastoCuponsAtualizado);

      const freteClienteAtualizado = Number(detTemp.receitaFreteCliente) || 0;
      const custoFreteLocalAtualizado = Number(detTemp.custoFreteEntregaLocal) || 0;
      const custoEtiquetasAtualizado = Number(detTemp.custoEtiquetasLojistaTotal) || 0;
      const custoTotalProdAtualizado = Number(detTemp.custoTotalProdutos) || 0;

      const lucroBrutoOperacaoAtualizado = (
        faturamentoLiquidoAtualizado +
        freteClienteAtualizado -
        custoFreteLocalAtualizado -
        custoEtiquetasAtualizado -
        custoTotalProdAtualizado
      );

      // Reversão de Metas de Colaboradores (caso aplicável)
      if (fin.dsOperadorCaixa) {
        const operadorBruto = String(fin.dsOperadorCaixa).trim();
        const operadorIdSanitizado = operadorBruto
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_");

        const dataChaveDiaria = `${dataPedido.getFullYear()}-${String(dataPedido.getMonth() + 1).padStart(2, "0")}-${String(dataPedido.getDate()).padStart(2, "0")}`;
        const metaRef = db.doc(`lojistas/${lojistaId}/meta_colaboradores/${operadorIdSanitizado}/diario/${dataChaveDiaria}`);

        const receitaLiquidaColaborador = subtotal - descontoCupom;
        const lucroGeradoColaborador = receitaLiquidaColaborador - custoTotalPedidoCalculado;

        t.set(
          metaRef,
          {
            nomeColaborador: operadorBruto,
            totalVendidoBruto: FieldValue.increment(total * multiplicador),
            totalReceitaProdutos: FieldValue.increment(receitaLiquidaColaborador * multiplicador),
            custoProdutosVendidos: FieldValue.increment(custoTotalPedidoCalculado * multiplicador),
            lucroBrutoGerado: FieldValue.increment(lucroGeradoColaborador * multiplicador),
            totalPedidosVendidos: FieldValue.increment(multiplicador),
            totalItens: FieldValue.increment(qtdTotalItensPedido * multiplicador),
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      const porFormaPagamento = stats.porFormaPagamento || {};
      const porOrigem = stats.porOrigem || {};
      const porFormaEntrega = stats.porFormaEntrega || {};

      if (multiplicador > 0) {
        porFormaPagamento[formaPagamento] = (porFormaPagamento[formaPagamento] || 0) + 1;
        porOrigem[origem] = (porOrigem[origem] || 0) + 1;
        porFormaEntrega[formaEntrega] = (porFormaEntrega[formaEntrega] || 0) + 1;
      } else {
        porFormaPagamento[formaPagamento] = Math.max(0, (porFormaPagamento[formaPagamento] || 0) - 1);
        porOrigem[origem] = Math.max(0, (porOrigem[origem] || 0) - 1);
        porFormaEntrega[formaEntrega] = Math.max(0, (porFormaEntrega[formaEntrega] || 0) - 1);
      }

      const totalPedidosAtual = Math.max(0, Number(stats.totalPedidos || 0) + multiplicador);

      t.set(
        statsRef,
        {
          faturamentoLiquido: faturamentoLiquidoAtualizado,
          lucroBrutoOperacao: lucroBrutoOperacaoAtualizado,
          totalPedidos: FieldValue.increment(multiplicador),
          ticketMedio:
            totalPedidosAtual > 0
              ? Number((faturamentoLiquidoAtualizado / totalPedidosAtual).toFixed(2))
              : 0,
          detalhamento: {
            receitaBrutaProdutos: FieldValue.increment(subtotal * multiplicador),
            receitaFreteCliente: FieldValue.increment(freteCliente * multiplicador),
            gastoTotalCupons: FieldValue.increment(descontoCupom * multiplicador),
            numeroCuponsUtilizado: FieldValue.increment(teveCupomUtilizado * multiplicador),
            custoEtiquetasLojistaTotal: FieldValue.increment(custoEtiquetaValor * multiplicador),
            custoFreteEntregaLocal: FieldValue.increment(custoEntregaLocalValor * multiplicador),
            custoTotalProdutos: FieldValue.increment(Number(custoTotalPedidoCalculado || 0) * multiplicador),
            numeroItensVendidos: FieldValue.increment(Number(qtdTotalItensPedido) * multiplicador),
          },
          porFormaPagamento,
          porOrigem,
          porFormaEntrega,
          ultimaAtualizacao: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    // B. Reversão no Ranking de Produtos e Clientes
    await db.runTransaction(async (t) => {
      const valorSubtotalPedido = subtotal > 0 ? subtotal : 1;
      const descontoTotalPedido = descontoCupom || 0;
      let custoTotalPedidoCliente = 0;

      listaVendaUnica.forEach((itemU) => {
        const varSanitizada = itemU.variacaoProduto
          ? itemU.variacaoProduto
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, "_")
              .replace(/_+/g, "_")
          : "padrao";
        const idDocRanking = `${itemU.idProduto}_${varSanitizada}`;
        const prodRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chave}/produtos_ranking/${idDocRanking}`);

        const qtdItemMod = itemU.qtdItem * multiplicador;
        const valorBrutoItem = itemU.precoUnitario * Math.abs(qtdItemMod);
        const proporcaoItem = valorSubtotalPedido > 0 ? (valorBrutoItem / valorSubtotalPedido) : 0;
        const cupomItem = Number((descontoTotalPedido * proporcaoItem).toFixed(2));
        const valorLiquidoItem = Math.max(0, valorBrutoItem - cupomItem);

        const custoTotalItem = itemU.custoUnitario * Math.abs(qtdItemMod);
        const lucroLiquidoItem = Math.max(0, valorLiquidoItem - custoTotalItem);
        const margemPercentual = valorLiquidoItem > 0 ? Number(((lucroLiquidoItem / valorLiquidoItem) * 100).toFixed(2)) : 0;

        custoTotalPedidoCliente += custoTotalItem;

        t.set(
          prodRef,
          {
            nome: itemU.nomeProduto,
            variacao: itemU.variacaoProduto || "Padrão",
            vlCustoUnitarioProduto: FieldValue.increment(multiplicador > 0 ? custoTotalItem : -custoTotalItem),
            quantidadeVendida: FieldValue.increment(qtdItemMod),
            valorBrutoVendas: FieldValue.increment(multiplicador > 0 ? valorBrutoItem : -valorBrutoItem),
            totalCupomAplicado: FieldValue.increment(multiplicador > 0 ? cupomItem : -cupomItem),
            valorLiquidoVendas: FieldValue.increment(multiplicador > 0 ? valorLiquidoItem : -valorLiquidoItem),
            custoTotalVendas: FieldValue.increment(multiplicador > 0 ? custoTotalItem : -custoTotalItem),
            lucroBrutoVendas: FieldValue.increment(multiplicador > 0 ? lucroLiquidoItem : -lucroLiquidoItem),
            margemLucroMedia: margemPercentual,
          },
          { merge: true },
        );
      });

      const clienteInfo = newData.dsCliente || {};
      const enderecoInfo = newData.dsEndereco || newData.endereco || {};
      const cpfBruto = clienteInfo.dsCpfCliente || clienteInfo.cpf || "";
      const cpfLimpo = cpfBruto.replace(/[^0-9]/g, "");

      const idCliente = cpfLimpo.length > 0 ? cpfLimpo : "cliente_anonimo";
      const nomeCliente = clienteInfo.nmNomeCliente || clienteInfo.nome || "Cliente Sem Nome";
      const telefoneCliente = clienteInfo.dsTelefoneCliente || clienteInfo.telefone || "";
      const cidadeCliente = clienteInfo.dsCidadeCliente || enderecoInfo.dsCidadeCliente || enderecoInfo.cidade || "";
      const ufCliente = clienteInfo.dsUfCliente || enderecoInfo.dsUfCliente || enderecoInfo.uf || "";

      const clienteRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chave}/clientes_ranking/${idCliente}`);

      const valorBrutoPedidoCliente = subtotal;
      const totalCupomPedidoCliente = descontoCupom;
      const valorLiquidoPedidoCliente = Math.max(0, subtotal - descontoCupom);
      const lucroBrutoPedidoCliente = Math.max(0, valorLiquidoPedidoCliente - custoTotalPedidoCliente);

      t.set(
        clienteRef,
        {
          cpf: cpfBruto,
          nome: nomeCliente,
          telefone: telefoneCliente,
          cidade: cidadeCliente,
          uf: ufCliente,
          numeroItensComprados: FieldValue.increment(qtdTotalItensPedido * multiplicador),
          valorBrutoCompras: FieldValue.increment(multiplicador > 0 ? valorBrutoPedidoCliente : -valorBrutoPedidoCliente),
          totalCupomAplicado: FieldValue.increment(multiplicador > 0 ? totalCupomPedidoCliente : -totalCupomPedidoCliente),
          valorLiquidoCompras: FieldValue.increment(multiplicador > 0 ? valorLiquidoPedidoCliente : -valorLiquidoPedidoCliente),
          custoTotalCompras: FieldValue.increment(multiplicador > 0 ? custoTotalPedidoCliente : -custoTotalPedidoCliente),
          lucroBrutoGerado: FieldValue.increment(multiplicador > 0 ? lucroBrutoPedidoCliente : -lucroBrutoPedidoCliente),
          totalPedidos: FieldValue.increment(multiplicador),
          dataUltimaCompra: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    // C. Reversão no Dashboard Master Global
    await db.runTransaction(async (t) => {
      const masterDoc = await t.get(masterStatsRef);
      const masterStats = masterDoc.exists
        ? masterDoc.data()
        : {
            faturamentoPlataforma: 0,
            totalPedidosPlataforma: 0,
            rankingLojistas: {},
          };
      const rankingLojistas = masterStats.rankingLojistas || {};

      if (!rankingLojistas[lojistaId]) {
        rankingLojistas[lojistaId] = { faturamento: 0, pedidos: 0 };
      }

      rankingLojistas[lojistaId].faturamento = Math.max(
        0,
        rankingLojistas[lojistaId].faturamento + total * multiplicador,
      );
      rankingLojistas[lojistaId].pedidos = Math.max(
        0,
        rankingLojistas[lojistaId].pedidos + multiplicador,
      );

      const fatPlatAtualizado = Math.max(
        0,
        (masterStats.faturamentoPlataforma || 0) + total * multiplicador,
      );
      const pedPlatAtualizado = Math.max(
        0,
        (masterStats.totalPedidosPlataforma || 0) + multiplicador,
      );

      t.set(
        masterStatsRef,
        {
          faturamentoPlataforma: fatPlatAtualizado,
          totalPedidosPlataforma: pedPlatAtualizado,
          ticketMedioPlataforma:
            pedPlatAtualizado > 0
              ? Number((fatPlatAtualizado / pedPlatAtualizado).toFixed(2))
              : 0,
          rankingLojistas,
          ultimaAtualizacao: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    // D. Retorno ou Baixa de Estoque Físico do Produto (Invertido da Baixa Universal)
    await db.runTransaction(async (t) => {
      const acoesPorProduto = {};

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

      // Se solicitou devolução agora: ADICIONA (+ qtd). Se cancelou a devolução: SUBTRAI (- qtd).
      const fatorAjuste = foiSolicitadaAgora ? 1 : -1;

      for (const idProduto in acoesPorProduto) {
        const prodInfo = acoesPorProduto[idProduto];
        const dadosProd = prodInfo.dados;

        const variacoesAtuais = dadosProd.variacoes || [];
        let estoqueSimplesAtual = Number(
          dadosProd.nrEstoqueProduto || dadosProd.estoque || dadosProd.nrEstoque || 0,
        );

        if (Array.isArray(variacoesAtuais) && variacoesAtuais.length > 0) {
          let novasVariacoes = JSON.parse(JSON.stringify(variacoesAtuais));

          for (const itemUnico of prodInfo.itensParaAjustar) {
            if (
              !itemUnico.variacaoProduto ||
              itemUnico.variacaoProduto === "Padrão"
            ) {
              // Caso o produto tenha variações gerais, mas o item específico seja padrão
              estoqueSimplesAtual = Math.max(
                0,
                estoqueSimplesAtual + (itemUnico.qtdItem * fatorAjuste),
              );
              continue;
            }

            novasVariacoes = novasVariacoes.map((v) => {
              // Usa estritamente o campo dsNomeProduto da variação do banco (mesmo padrão da baixa universal)
              const nomeVarBanco = String(v.dsNomeProduto || v.dsModelo || v.nome || v.dsNome || "").trim();

              if (nomeVarBanco.toLowerCase() === itemUnico.variacaoProduto.toLowerCase()) {
                const estoqueAtualVar = Number(
                  v.nrEstoqueProduto || v.estoque || v.nrEstoque || 0,
                );
                
                // O inverso exato da baixa universal: aqui somamos na devolução e subtraímos no cancelamento
                const novoEstoqueVar = Math.max(
                  0,
                  estoqueAtualVar + (itemUnico.qtdItem * fatorAjuste),
                );

                return {
                  ...v,
                  estoque: novoEstoqueVar,
                  nrEstoque: novoEstoqueVar,
                  nrEstoqueProduto: novoEstoqueVar,
                };
              }
              return v;
            });
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
          }

          const novoEstoqueSimples = Math.max(
            0,
            estoqueSimplesAtual + (totalAjusteSimples * fatorAjuste),
          );

          t.update(prodInfo.ref, {
            estoque: novoEstoqueSimples,
            nrEstoque: novoEstoqueSimples,
            nrEstoqueProduto: novoEstoqueSimples,
          });
        }
      }
    });

   // E. Atualização de Estatísticas e Subcoleção de Itens Devolvidos (Corrigido Cirurgicamente)
    await db.runTransaction(async (t) => {
      // 1. TODAS AS LEITURAS PRIMEIRO (Regra obrigatória do Firestore)
      const docDevSnap = await t.get(devolucaoStatsRef);
      
      const itensLeituras = [];
      for (const itemU of listaVendaUnica) {
        if (!itemU.idProduto) continue;

        const varSanitizada = itemU.variacaoProduto
          ? itemU.variacaoProduto.toLowerCase().replace(/[^a-z0-9_]/g, "_")
          : "padrao";
        const chaveItem = `${itemU.idProduto}_${varSanitizada}`;
        
        const itemRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/devolucoes_${chave}/itens_devolvidos/${chaveItem}`);

        const itemDoc = await t.get(itemRef);
        itensLeituras.push({
          itemRef,
          itemU,
          dadosItemAtual: itemDoc.exists ? itemDoc.data() : { total: 0, valorTotalPrejuizo: 0 }
        });
      }

      // 2. AGORA TODAS AS ESCRITAS DEPOIS
      const dadosDevAtual = docDevSnap.exists ? docDevSnap.data() : { totalDevolucoes: 0, valorTotalDevolucoes: 0, motivosDevolucao: {} };

      const totalDevolucoesAtualizado = Math.max(0, (dadosDevAtual.totalDevolucoes || 0) + multiplicador);
      const valorTotalDevolucoesAtualizado = Math.max(0, (dadosDevAtual.valorTotalDevolucoes || 0) + (total * multiplicador));

      const motivosDevolucao = dadosDevAtual.motivosDevolucao || {};
      const dadosDevPedido = newData.dadosDevolucao || {};
      const motivoKey = String(dadosDevPedido.dsMotivo || dadosDevPedido.motivo || "nao_informado").trim().toLowerCase();

      if (multiplicador > 0) {
        motivosDevolucao[motivoKey] = (motivosDevolucao[motivoKey] || 0) + 1;
      } else {
        motivosDevolucao[motivoKey] = Math.max(0, (motivosDevolucao[motivoKey] || 0) - 1);
      }

      t.set(devolucaoStatsRef, {
        totalDevolucoes: totalDevolucoesAtualizado,
        valorTotalDevolucoes: valorTotalDevolucoesAtualizado,
        motivosDevolucao,
        ultimaAtualizacao: FieldValue.serverTimestamp(),
      }, { merge: true });

      for (const reg of itensLeituras) {
        const qtdMod = reg.itemU.qtdItem * multiplicador;
        const prejuizoMod = (reg.itemU.precoUnitario * reg.itemU.qtdItem) * multiplicador;

        const novoTotalItem = Math.max(0, (reg.dadosItemAtual.total || 0) + qtdMod);
        const novoPrejuizoItem = Math.max(0, (reg.dadosItemAtual.valorTotalPrejuizo || 0) + prejuizoMod);

        t.set(reg.itemRef, {
          nome: reg.itemU.nomeProduto,
          variacao: reg.itemU.variacaoProduto || "Padrão",
          total: novoTotalItem,
          valorTotalPrejuizo: novoPrejuizoItem,
        }, { merge: true });
      }
    });

    return null;
  });
  

// ==========================================================================================
// 8. FUNÇÃO DESPESAS FIXAS
// ==========================================================================================
exports.atualizarEstatisticasDespesasFixas = onDocumentWritten(
  {
    document: "lojistas/{lojistaId}/despesas_fixas/{despesaId}",
    region: "southamerica-east1",
  },
  async (event) => {
    const lojistaId = event.params.lojistaId;
    const newData = event.data?.after.exists ? event.data.after.data() : null;
    const oldData = event.data?.before.exists ? event.data.before.data() : null;

    if (!newData && !oldData) return null;

    if (oldData) {
      const valorAntigo = Number(oldData.valor ?? oldData.vlDespesa ?? 0);
      const chaveAntiga = obterChaveMes(
        oldData.timestamp || oldData.data || Date.now(),
      );
      const statsRefAntigo = db.doc(
        `lojistas/${lojistaId}/dashboard_stats/${chaveAntiga}`,
      );

      await db.runTransaction(async (t) => {
        t.set(
          statsRefAntigo,
          {
            totalDespesasFixas: FieldValue.increment(-valorAntigo),
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    }

    if (newData) {
      const valorNovo = Number(newData.valor ?? newData.vlDespesa ?? 0);
      const chaveNova = obterChaveMes(
        newData.timestamp || newData.data || Date.now(),
      );
      const statsRefNovo = db.doc(
        `lojistas/${lojistaId}/dashboard_stats/${chaveNova}`,
      );

      await db.runTransaction(async (t) => {
        t.set(
          statsRefNovo,
          {
            totalDespesasFixas: FieldValue.increment(valorNovo),
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    }

    return null;
  },
);

// ==========================================================================================
// 9. FUNÇÃO DESPESAS VARIÁVEIS / INSUMOS
// ==========================================================================================
exports.atualizarEstatisticasDespesasVariaveis = onDocumentWritten(
  {
    document: "lojistas/{lojistaId}/despesas_variaveis/{despesaId}",
    region: "southamerica-east1",
  },
  async (event) => {
    const lojistaId = event.params.lojistaId;
    const newData = event.data?.after.exists ? event.data.after.data() : null;
    const oldData = event.data?.before.exists ? event.data.before.data() : null;

    if (!newData && !oldData) return null;

    if (oldData) {
      const valorAntigo = Number(
        oldData.valor ?? oldData.vlCompra ?? oldData.custoTotal ?? 0,
      );
      const chaveAntiga = obterChaveMes(
        oldData.timestamp || oldData.data || Date.now(),
      );
      const statsRefAntigo = db.doc(
        `lojistas/${lojistaId}/dashboard_stats/${chaveAntiga}`,
      );

      await db.runTransaction(async (t) => {
        t.set(
          statsRefAntigo,
          {
            totalDespesasVariaveis: FieldValue.increment(-valorAntigo),
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    }

    if (newData) {
      const valorNovo = Number(
        newData.valor ?? newData.vlCompra ?? newData.custoTotal ?? 0,
      );
      const chaveNova = obterChaveMes(
        newData.timestamp || newData.data || Date.now(),
      );
      const statsRefNovo = db.doc(
        `lojistas/${lojistaId}/dashboard_stats/${chaveNova}`,
      );

      await db.runTransaction(async (t) => {
        t.set(
          statsRefNovo,
          {
            totalDespesasVariaveis: FieldValue.increment(valorNovo),
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    }

    return null;
  },
);
