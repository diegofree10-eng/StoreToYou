const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");

admin.initializeApp();
const db = getFirestore();

// 1. Função: Calcular estatísticas completas (Loja + Subcoleções + Master Global)
exports.atualizarEstatisticas = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onWrite(async (change, context) => {
    const lojistaId = context.params.lojistaId;
    const newData = change.after.exists ? change.after.data() : null;
    const antes = change.before.exists ? change.before.data() : null;

    if (!newData) return null;

    const statusNovo = String(newData.status || "").toLowerCase();
    const statusAntigo = antes ? String(antes.status || "").toLowerCase() : "";

    const eraConcluido = statusAntigo === "concluído";
    const ehConcluido = statusNovo === "concluído";

    const foiDevolvidoAgora =
      newData.devolvido === true && antes?.devolvido !== true;
    const deixouDeSerDevolvido =
      newData.devolvido !== true && antes?.devolvido === true;

    const data = new Date(newData.data || Date.now());
    const chave = `${data.getFullYear()}_${data.getMonth() + 1}`;

    // Referências principais do Firestore
    const statsRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chave}`);
    const devolucoesRef = db.doc(
      `lojistas/${lojistaId}/dashboard_stats/devolucoes_${chave}`,
    );
    const masterStatsRef = db.doc(`master_dashboard/stats_${chave}`);

    // 🛡️ EXTRAÇÃO BLINDADA DOS DADOS FINANCEIROS
    const fin = newData.financeiro || {};
    const log = newData.logistica || {};

    const subtotal = Number(
      fin.vlSubtotal ?? fin.subtotal ?? fin.valorSubtotal ?? 0,
    );
    const desconto = Number(
      fin.vlDesconto ?? fin.discount ?? fin.descontos ?? 0,
    );
    const frete = Number(log.vlFrete ?? fin.frete ?? fin.vlFrete ?? 0);
    const freteGratisFlag =
      fin.freteGratis || fin.dsTransportadoraId === "frete_gratis_ativado";

    const freteAplicado = freteGratisFlag ? 0 : frete;
    const calcManual = subtotal - desconto + freteAplicado;

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

    const origem = String(newData.origemPedido || "site")
      .trim()
      .toLowerCase();

    // --- TRANSAÇÃO 1: FATURAMENTO, RAIO-X DE FRETES, SUBCOLEÇÕES E MASTER ---
    if (
      (!eraConcluido && ehConcluido) ||
      (eraConcluido && !ehConcluido) ||
      (eraConcluido && ehConcluido && newData.devolvido !== antes?.devolvido)
    ) {
      // 🛡️ MULTIPLICADOR BLINDADO (Garante que só é negativo se realmente for devolução/estorno)
      let multiplicador = 0;
      if (ehConcluido && !newData.devolvido) {
        multiplicador = 1; // Venda normal / Concluída
      } else if (eraConcluido && (!ehConcluido || newData.devolvido)) {
        multiplicador = -1; // Devolução ou deixou de ser concluído
      }

      if (multiplicador !== 0) {
        const descontoCupomPedido = Number(fin.vlDesconto ?? 0);
        const freteClientePedido = Number(
          fin.vlFrete > 0 ? fin.vlFrete : (log.vlFrete ?? 0),
        );

        const formaEntrega = String(
          log.dsFormaEntrega ||
            log.dsTransportadoraId ||
            (log.isRetirada ? "retirada" : "transportadora"),
        )
          .trim()
          .toLowerCase();

        const isEntregaLocal =
          formaEntrega.includes("local") || formaEntrega.includes("motoboy");

        const custoEtiquetaValor = !isEntregaLocal
          ? Number(
              newData.Cotacao?.vlFreteCotado ??
                newData.Etiqueta?.valorCobrado ??
                0,
            )
          : 0;

        const custoEntregaLocalValor = isEntregaLocal
          ? Number(log.custoEntregaLocal ?? log.vlFrete ?? 0)
          : 0;

        // A. Atualização do Documento Resumo da Loja e Contadores Globais do Mês
        await db.runTransaction(async (t) => {
          const doc = await t.get(statsRef);
          const stats = doc.exists
            ? doc.data()
            : {
                faturamentoLiquido: 0,
                totalPedidos: 0,
                detalhamento: {
                  receitaBrutaProdutos: 0,
                  gastoTotalCupons: 0,
                  receitaFreteCliente: 0,
                  custoFreteGratisLoja: 0,
                  custoEtiquetasLojistaTotal: 0,
                  custoFreteEntregaLocal: 0,
                },
                porFormaPagamento: {},
                porOrigem: {},
                porFormaEntrega: {},
              };

          const det = stats.detalhamento || {
            receitaBrutaProdutos: 0,
            gastoTotalCupons: 0,
            receitaFreteCliente: 0,
            custoFreteGratisLoja: 0,
            custoEtiquetasLojistaTotal: 0,
            custoFreteEntregaLocal: 0,
          };

          det.receitaBrutaProdutos += subtotal * multiplicador;
          det.gastoTotalCupons += descontoCupomPedido * multiplicador;
          det.receitaFreteCliente += freteClientePedido * multiplicador;
          det.custoEtiquetasLojistaTotal += custoEtiquetaValor * multiplicador;
          det.custoFreteEntregaLocal += custoEntregaLocalValor * multiplicador;

          if (freteGratisFlag) {
            det.custoFreteGratisLoja += freteClientePedido * multiplicador;
          }

          const porFormaPagamento = stats.porFormaPagamento || {};
          const porOrigem = stats.porOrigem || {};
          const porFormaEntrega = stats.porFormaEntrega || {};

          if (multiplicador > 0) {
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

          const fatAtualizado = Math.max(
            0,
            (stats.faturamentoLiquido || 0) + total * multiplicador,
          );
          const pedAtualizado = Math.max(
            0,
            (stats.totalPedidos || 0) + multiplicador,
          );

          t.set(
            statsRef,
            {
              faturamentoLiquido: fatAtualizado,
              totalPedidos: pedAtualizado,
              ticketMedio:
                pedAtualizado > 0
                  ? Number((fatAtualizado / pedAtualizado).toFixed(2))
                  : 0,
              detalhamento: det,
              porFormaPagamento: porFormaPagamento,
              porOrigem: porOrigem,
              porFormaEntrega: porFormaEntrega,
              ultimaAtualizacao: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        });

        // B. Atualização via Subcoleções (Produtos com preço unitário correto e Clientes)
        const itensLista = newData.itens || [];

        await db.runTransaction(async (t) => {
          // 1. Ranking de Produtos: Usa o preço unitário real de cada item (Sem divisão de frete)
          itensLista.forEach((item) => {
            const idProd = item.idProduto || item.id || "desconhecido";
            const nomeProd = item.nome || "Produto Sem Nome";
            const qtdItem =
              Number(item.qty || item.quantidade || 1) * multiplicador;

            const precoUnitario = Number(item.preco || item.valor || 0);
            const valorTotalDoItem = precoUnitario * Math.abs(qtdItem);

            const prodRef = db.doc(
              `lojistas/${lojistaId}/dashboard_stats/${chave}/produtos_ranking/${idProd}`,
            );

            t.set(
              prodRef,
              {
                nome: nomeProd,
                quantidadeVendida: FieldValue.increment(qtdItem),
                valorTotalAcumulado: FieldValue.increment(
                  multiplicador > 0 ? valorTotalDoItem : -valorTotalDoItem,
                ),
              },
              { merge: true },
            );
          });

          // 2. Ranking de Melhores Clientes
          const cliente = newData.cliente || {};
          const idCliente =
            cliente.id ||
            cliente.dsCpfCliente ||
            cliente.email ||
            "cliente_anonimo";
          const nomeCliente =
            cliente.nmNomeCliente || cliente.nome || "Cliente Sem Nome";
          const telefoneCliente =
            cliente.dsTelefoneCliente || cliente.telefone || "";

          const clienteRef = db.doc(
            `lojistas/${lojistaId}/dashboard_stats/${chave}/clientes_ranking/${idCliente}`,
          );

          t.set(
            clienteRef,
            {
              nome: nomeCliente,
              telefone: telefoneCliente,
              totalGasto: FieldValue.increment(total * multiplicador),
              totalPedidos: FieldValue.increment(multiplicador),
            },
            { merge: true },
          );
        });

        // C. Atualização do Dashboard Master Global
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
              rankingLojistas: rankingLojistas,
              ultimaAtualizacao: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        });
      }
    }

    // --- TRANSAÇÃO 2: ATUALIZAR RANKING DE ITENS E MÉTRICAS DE DEVOLUÇÃO ---
    if (foiDevolvidoAgora || deixouDeSerDevolvido) {
      const fatorDevolucao = foiDevolvidoAgora ? 1 : -1;

      const dadosDev = newData.dadosDevolucao || {};
      const motivo = String(dadosDev.motivo || "nao_informado")
        .trim()
        .toLowerCase();
      const estadoProduto = String(dadosDev.estadoProduto || "nao_informado")
        .trim()
        .toLowerCase();
      const custoFreteReverso =
        Number(dadosDev.custoFreteReverso || 0) * fatorDevolucao;

      await db.runTransaction(async (t) => {
        const doc = await t.get(devolucoesRef);
        const stats = doc.exists
          ? doc.data()
          : {
              rankingItens: {},
              motivosDevolucao: {},
              estadosProduto: {},
              totalDevolucoes: 0,
              custoTotalReverso: 0,
            };

        const rankingItens = stats.rankingItens || {};
        const motivosDevolucao = stats.motivosDevolucao || {};
        const estadosProduto = stats.estadosProduto || {};

        (newData.itens || []).forEach((item) => {
          const idProduto = item.idProduto || item.id || "desconhecido";
          const nomeProduto = item.nome || "Produto Sem Nome";
          const variacaoProduto = item.variacao || "Padrão";
          const qtdItem = Number(item.quantidade || item.qty || 1);

          const precoUnitario = Number(item.preco || item.valor || 0);
          
          // Chave composta para diferenciar variações do mesmo produto no ranking
          const chaveItem = `${idProduto}_${variacaoProduto.replace(/\s+/g, '_')}`;

          if (!rankingItens[chaveItem]) {
            rankingItens[chaveItem] = {
              nome: nomeProduto,
              variacao: variacaoProduto,
              total: 0,
              valorUnitario: precoUnitario,
              valorTotalPrejuizo: 0,
            };
          }

          const qtdAtual = rankingItens[chaveItem].total || 0;
          const novaQuantidade = Math.max(
            0,
            qtdAtual + qtdItem * fatorDevolucao,
          );

          const valorTotalPrejuizoAtual =
            rankingItens[chaveItem].valorTotalPrejuizo || 0;
          const novoPrejuizo = Math.max(
            0,
            valorTotalPrejuizoAtual + precoUnitario * qtdItem * fatorDevolucao,
          );

          rankingItens[chaveItem] = {
            nome: nomeProduto,
            variacao: variacaoProduto,
            total: novaQuantidade,
            valorUnitario: precoUnitario,
            valorTotalPrejuizo: novoPrejuizo,
          };
        });

        motivosDevolucao[motivo] = Math.max(
          0,
          (motivosDevolucao[motivo] || 0) + fatorDevolucao,
        );

        estadosProduto[estadoProduto] = Math.max(
          0,
          (estadosProduto[estadoProduto] || 0) + fatorDevolucao,
        );

        t.set(
          devolucoesRef,
          {
            rankingItens: rankingItens,
            motivosDevolucao: motivosDevolucao,
            estadosProduto: estadosProduto,
            totalDevolucoes: Math.max(
              0,
              (stats.totalDevolucoes || 0) + fatorDevolucao,
            ),
            custoTotalReverso: Math.max(
              0,
              (stats.custoTotalReverso || 0) + custoFreteReverso,
            ),
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    }

    return null;
  });

// 2. Função: Preparar estrutura para novo lojista
exports.prepararNovoLojista = functions
  .region("us-central1")
  .auth.user()
  .onCreate(async (user) => {
    const lojistaId = user.uid;

    const estruturaLojista = {
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

// 3. Função: Reverter planos de teste Ouro vencidos
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

// 4. Função: Verificar pagamento de lojistas
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