const { FieldValue } = require("firebase-admin/firestore");

async function processarMasterDashboard({
  db, lojistaId, chaveMes, chaveAnual, anoValido,
  faturamentoLiquidoAtualizadoGlobal, lucroBrutoOperacaoAtualizadoGlobal,
  totalPedidosAtualGlobal, ticketMedioGlobal, total, multiplicador
}) {
  // 1. Referências com caminhos de contagem global perfeitamente pares (4 componentes)
  const lojistaMasterRef = db.doc(`master_dashboard/dados_master/lojistas_stats/${lojistaId}`);
  const globalMensalRef = db.doc(`master_dashboard/contagem_global/meses/${chaveMes}`);
  const globalAnualRef = db.doc(`master_dashboard/contagem_global/anos/${chaveAnual}`);

  // 2. Busca o nome real da loja no cadastro raiz do lojista
  let nomeLojaCache = "Loja Sem Nome";
  try {
    const lojaRef = db.doc(`lojistas/${lojistaId}`);
    const lojaSnap = await lojaRef.get();
    if (lojaSnap.exists) {
      const dadosLojaDoc = lojaSnap.data();
      nomeLojaCache = dadosLojaDoc.dadosLoja?.dsNomeLoja || 
                      dadosLojaDoc.dsNomeLoja || 
                      dadosLojaDoc.nomeLoja || 
                      dadosLojaDoc.nmLoja || 
                      "Loja Sem Nome";
    }
  } catch (err) {
    console.error("Erro ao buscar nome da loja para o Master:", err);
  }

  // 3. Busca as despesas fixas e variáveis do mês atual da loja para calcular o lucro líquido real
  let lucroLiquidoRealLoja = lucroBrutoOperacaoAtualizadoGlobal;
  try {
    const statsMesRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chaveMes}`);
    const statsMesSnap = await statsMesRef.get();
    if (statsMesSnap.exists) {
      const dadosStats = statsMesSnap.data();
      const despesasFixas = Number(dadosStats.totalDespesasFixas || 0);
      const despesasVariaveis = Number(dadosStats.totalDespesasVariaveis || 0);
      
      // Abate as despesas fixas e variáveis do lucro bruto da operação
      lucroLiquidoRealLoja = lucroBrutoOperacaoAtualizadoGlobal - despesasFixas - despesasVariaveis;
    }
  } catch (errDespesas) {
    console.error("Erro ao buscar despesas fixas/variáveis para o Master:", errDespesas);
  }

  // 4. Atualiza os dados da conta da loja no Master (usando o lucro já descontando as despesas)
  await db.runTransaction(async (t) => {
    const lojaMasterSnap = await t.get(lojistaMasterRef);
    const dadosLojaMaster = lojaMasterSnap.exists ? lojaMasterSnap.data() : {};

    const acumuladoAnoAtual = Number(dadosLojaMaster.faturamentoAcumuladoAno || 0);
    const novoAcumuladoAno = acumuladoAnoAtual + (total * multiplicador);
    
    const pedidosAnoAtual = Number(dadosLojaMaster.pedidosAcumuladosAno || 0);
    const novoPedidosAno = pedidosAnoAtual + multiplicador;

    t.set(lojistaMasterRef, {
      nomeLoja: nomeLojaCache,
      faturamentoMes: faturamentoLiquidoAtualizadoGlobal,
      lucroMes: lucroLiquidoRealLoja, // 👈 Lucro atualizado abatendo despesas fixas e variáveis
      pedidosMes: totalPedidosAtualGlobal,
      ticketMedioLoja: ticketMedioGlobal,
      faturamentoAcumuladoAno: novoAcumuladoAno,
      pedidosAcumuladosAno: novoPedidosAno,
      ultimaAtualizacao: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  // 5. Sincroniza a subcoleção de Top 10 Produtos deste lojista no Master (com o idProduto incluído)
  try {
    const produtosRankingRef = db.collection(`lojistas/${lojistaId}/dashboard_stats/${chaveMes}/produtos_ranking`);
    const topProdutosSnap = await produtosRankingRef.orderBy("quantidadeVendida", "desc").limit(10).get();
    
    const masterTopProdutosRef = db.collection(`master_dashboard/dados_master/lojistas_stats/${lojistaId}/top10_produtos`);
    
    const batch = db.batch();
    topProdutosSnap.docs.forEach(docSnap => {
      const pData = docSnap.data();
      const qtdVend = Number(pData.quantidadeVendida || 0);
      const valLiq = Number(pData.valorLiquidoVendas || 0);
      
      const docTopRef = masterTopProdutosRef.doc(docSnap.id);
      batch.set(docTopRef, {
        idProduto: docSnap.id,
        nome: pData.nome || "Produto",
        variacao: pData.variacao || "Padrão",
        quantidadeTotalVendida: qtdVend,
        valorUnitarioMedio: qtdVend > 0 ? Number((valLiq / qtdVend).toFixed(2)) : 0,
        valorAcumuladoVendas: valLiq
      }, { merge: true });
    });
    await batch.commit();
  } catch (errTop) {
    console.error("Erro ao atualizar top 10 produtos na subcoleção do Master:", errTop);
  }

  // 6. Atualiza a Contagem Global Mensal da Plataforma
  try {
    const todosLojistasSnap = await db.collection("master_dashboard/dados_master/lojistas_stats").get();
    
    let fatPlatTotal = 0;
    let pedPlatTotal = 0;
    let lucroPlatTotal = 0;
    let lojistasAtivosCount = 0;

    todosLojistasSnap.forEach(doc => {
      const l = doc.data();
      fatPlatTotal += Number(l.faturamentoMes || 0);
      pedPlatTotal += Number(l.pedidosMes || 0);
      lucroPlatTotal += Number(l.lucroMes || 0);
      if (Number(l.pedidosMes || 0) > 0) {
        lojistasAtivosCount++;
      }
    });

    const ticketMedioPlat = pedPlatTotal > 0 ? Number((fatPlatTotal / pedPlatTotal).toFixed(2)) : 0;

    await globalMensalRef.set({
      faturamentoPlataforma: fatPlatTotal,
      totalPedidosPlataforma: pedPlatTotal,
      ticketMedioPlataforma: ticketMedioPlat,
      lucroTotalPlataforma: lucroPlatTotal,
      totalLojistasAtivos: lojistasAtivosCount,
      ultimaAtualizacao: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (errGlobal) {
    console.error("Erro ao atualizar contagem global mensal:", errGlobal);
  }

  // 7. Atualiza a Contagem Global Anual da Plataforma
  try {
    const todosLojistasAnualSnap = await db.collection("master_dashboard/dados_master/lojistas_stats").get();
    
    let fatPlatAnual = 0;
    let pedPlatAnual = 0;

    todosLojistasAnualSnap.forEach(doc => {
      const l = doc.data();
      fatPlatAnual += Number(l.faturamentoAcumuladoAno || 0);
      pedPlatAnual += Number(l.pedidosAcumuladosAno || 0);
    });

    const ticketMedioAnual = pedPlatAnual > 0 ? Number((fatPlatAnual / pedPlatAnual).toFixed(2)) : 0;

    await globalAnualRef.set({
      ano: anoValido,
      faturamentoPlataformaAnual: fatPlatAnual,
      totalPedidosPlataformaAnual: pedPlatAnual,
      ticketMedioAnual: ticketMedioAnual,
      ultimaAtualizacao: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (errAnual) {
    console.error("Erro ao atualizar contagem global anual:", errAnual);
  }
}

module.exports = { processarMasterDashboard };

//Ele recebe o resumo consolidado da loja após uma venda e cuida
// exclusivamente de atualizar o documento mensal
// (master_dashboard/stats_{chave}) e o anual
// (master_dashboard/stats_anual_{ano}).
// processarMasterDashboard é um módulo de apoio interno (funcs/) 
// e  é executada internamente pela função principal atualizarEstatisticasVenda