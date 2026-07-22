import { useMemo } from 'react';

// Importe ou defina aqui as constantes que a lógica utiliza
const TABELA_CUSTOS: Record<string, number> = {
  "Convite Marsala": 2.50,
  "Convite One Peace": 1.80,
  "Topo de Bolo Simples": 5.00,
  "Topo de Bolo Luxo": 12.00,
  "Digital": 0.00,
};
const CUSTO_PADRAO_GENERICO = 2.00;

export const useDashboardInteligencia = (
  pedidos: any[],
  canaisExternos: any[],
  despesasLojista: any[],
  dataInicio: string,
  dataFim: string,
  recursosLiberados: any,
  parseDataPedido: (data: string) => Date | null
) => {
  return useMemo(() => {
    const i = {
      faturamento: 0,
      faturamentoInternoPuro: 0,
      lucroReal: 0,
      custoTotal: 0,
      perdaDevolucao: 0,
      totalPedidosValidos: 0,
      despesaFreteLojista: 0,
      despesasOperacionaisLojista: 0,
      despesasFixas: 0,
      despesasVariaveis: 0,
      rankingProdutos: {} as Record<string, any>,
      clientesEstrela: {} as Record<string, any>,
      sazonalidade: Array(12).fill(0),
      nomesMeses: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
      evolucaoPorAno: {} as Record<string, { mes: string, lucro: number, ano: string }[]>
    };

    pedidos.forEach(p => {
      const dataPedido = parseDataPedido(p.data);
      const valorTotal = Number(p.financeiro?.total || 0);
      
      if (dataInicio && dataPedido && dataPedido < new Date(dataInicio + "T00:00:00")) return;
      if (dataFim && dataPedido && dataPedido > new Date(dataFim + "T23:59:59")) return;
      if (p.status?.toLowerCase() !== 'concluído') return;

      if (p.devolvido) { i.perdaDevolucao += valorTotal; return; }
      
      i.faturamento += valorTotal;
      i.faturamentoInternoPuro += valorTotal;
      i.totalPedidosValidos += 1;

      if (dataPedido && !isNaN(dataPedido.getTime())) {
        const ano = dataPedido.getFullYear().toString();
        if (!i.evolucaoPorAno[ano]) i.evolucaoPorAno[ano] = i.nomesMeses.map((m) => ({ mes: m, lucro: 0, ano }));
        i.sazonalidade[dataPedido.getMonth()] += valorTotal;
      }

      i.despesaFreteLojista += Number(p.freteCusto || p.custoFreteLojista || 0);

      const nomeCli = (p.cliente && typeof p.cliente === 'object') ? (p.cliente.nome || "Cliente Sem Nome") : (p.cliente || "Cliente Sem Nome");
      const numPed = String(p.numeroPedido || "");

      if (!i.clientesEstrela[nomeCli]) {
        i.clientesEstrela[nomeCli] = { compras: 0, total: 0, lucro: 0, codigosPedidos: [] };
      }
      i.clientesEstrela[nomeCli].compras += 1;
      i.clientesEstrela[nomeCli].total += valorTotal;
      if (numPed && !i.clientesEstrela[nomeCli].codigosPedidos.includes(numPed)) {
        i.clientesEstrela[nomeCli].codigosPedidos.push(numPed);
      }

      (p.itens || []).forEach((item: any) => {
        const nomeBase = item.nome || "Produto Não Identificado";
        const variacaoStr = item.variacao ? item.variacao.trim() : "";
        const n = variacaoStr ? `${nomeBase}|||${variacaoStr}` : `${nomeBase}|||`;
        const q = Number(item.qty || 0);
        const precoUnit = Number(item.preco || 0);
        const custoUnit = TABELA_CUSTOS[nomeBase] !== undefined ? TABELA_CUSTOS[nomeBase] : CUSTO_PADRAO_GENERICO;
        const lucroItem = (precoUnit * q) - (custoUnit * q);

        i.custoTotal += (custoUnit * q);
        i.lucroReal += lucroItem;
        i.clientesEstrela[nomeCli].lucro += lucroItem;

        if (dataPedido && !isNaN(dataPedido.getTime())) {
          const ano = dataPedido.getFullYear().toString();
          if (i.evolucaoPorAno[ano]) i.evolucaoPorAno[ano][dataPedido.getMonth()].lucro += lucroItem;
        }

        if (q > 0) {
          if (!i.rankingProdutos[n]) i.rankingProdutos[n] = { qtd: 0, valor: 0, lucro: 0 };
          i.rankingProdutos[n].qtd += q;
          i.rankingProdutos[n].valor += (q * precoUnit);
          i.rankingProdutos[n].lucro += lucroItem;
        }
      });
    });

    despesasLojista.forEach(d => {
      const dataDespesa = new Date(d.data + "T12:00:00");
      if (dataInicio && dataDespesa < new Date(dataInicio + "T00:00:00")) return;
      if (dataFim && dataDespesa > new Date(dataFim + "T23:59:59")) return;
      if (d.tipo === "fixa") i.despesasFixas += Number(d.valor || 0);
      else i.despesasVariaveis += Number(d.valor || 0);
    });

    i.despesasOperacionaisLojista = i.despesasFixas + i.despesasVariaveis;

    let faturamentoExternoLiquido = 0;
    if (recursosLiberados.temCanaisRenda) {
      canaisExternos.forEach(c => faturamentoExternoLiquido += Number(c.valorLiquidoRecebido || 0));
    }

    i.faturamento += faturamentoExternoLiquido;
    i.lucroReal = (i.lucroReal - i.despesaFreteLojista - i.despesasOperacionaisLojista) + faturamentoExternoLiquido;

    return i;
  }, [pedidos, canaisExternos, despesasLojista, dataInicio, dataFim, recursosLiberados, parseDataPedido]);
};