import { useMemo } from 'react';

export const useDashboardInteligencia = (
  statsMensais: any,
  canaisExternos: any[],
  despesasLojista: any[],
  recursosLiberados: any
) => {
  return useMemo(() => {
    // Dados já mastigados pela Cloud Function no Firestore
    const stats = statsMensais || {};
    const detalhamento = stats.detalhamento || {};

    let faturamentoBase = Number(stats.receitaLiquida || stats.receitaBrutaProdutos || 0);
    let lucroBase = Number(stats.lucroLiquidoReal || 0);
    let custoTotal = Number(stats.cmv || 0);
    let perdaDevolucao = Number(detalhamento.custoTotalDevolucoes || 0);
    let totalPedidosValidos = Number(stats.totalPedidos || 0);
    let ticketMedio = Number(stats.ticketMedio || 0);

    let faturamentoExternoLiquido = 0;
    if (recursosLiberados.temCanaisRenda) {
      canaisExternos.forEach(c => faturamentoExternoLiquido += Number(c.valorLiquidoRecebido || 0));
    }

    let despesasFixasCalc = 0;
    let despesasVariaveisCalc = 0;
    despesasLojista.forEach(d => {
      if (d.tipo === "fixa") despesasFixasCalc += Number(d.valor || 0);
      else despesasVariaveisCalc += Number(d.valor || 0);
    });
    const despesasOperacionaisTotal = despesasFixasCalc + despesasVariaveisCalc;

    // Se houver canais externos ou despesas dinâmicas locais, ajustamos o consolidado
    const faturamentoFinal = faturamentoBase + faturamentoExternoLiquido;
    const lucroFinal = (lucroBase - despesasOperacionaisTotal) + faturamentoExternoLiquido;

    return {
      faturamento: faturamentoFinal,
      faturamentoInternoPuro: faturamentoBase,
      lucroReal: lucroFinal,
      custoTotal: custoTotal,
      perdaDevolucao: perdaDevolucao,
      totalPedidosValidos: totalPedidosValidos,
      ticketMedio: ticketMedio,
      despesaFreteLojista: Number(stats.despesasLogistica || 0),
      despesasOperacionaisLojista: despesasOperacionaisTotal,
      despesasFixas: despesasFixasCalc,
      despesasVariaveis: despesasVariaveisCalc,
      rankingProdutos: stats.rankingProdutos || {},
      clientesRankingTop: stats.clientesRankingTop || [],
      sazonalidade: stats.sazonalidade || Array(12).fill(0),
      evolucaoPorAno: stats.evolucaoPorAno || {}
    };
  }, [statsMensais, canaisExternos, despesasLojista, recursosLiberados]);
};