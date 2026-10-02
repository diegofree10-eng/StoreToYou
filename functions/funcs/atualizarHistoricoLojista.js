// atualizarHistoricoLojista.js
const { FieldValue } = require("firebase-admin/firestore");

async function processarHistoricoLojista({
  db,
  lojistaId,
  chaveMes,
  anoValido,
  faturamentoLiquidoAtualizadoGlobal,
  total,
  multiplicador,
  multiplicadorPedidos = 1, // 🌟 Padrão 1 para novas vendas (pode ser -1 caso precise estornar)
}) {
  const mesNome = chaveMes.split("_")[0]; // Ex: "janeiro"
  const historicoRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/historico_geral`);
  const mesAnoKey = `${mesNome}_${anoValido}`;

  await db.runTransaction(async (t) => {
    const histSnap = await t.get(historicoRef);
    let dadosHist = histSnap.exists ? histSnap.data() : {
      anosAtivos: [],
      faturamentoAcumulado: 0,
      lucroAcumulado: 0,
      totalPedidosAcumulado: 0, // 🌟 Novo acumulado geral de pedidos
      melhorMes: { mes: "-", ano: "-", lucro: 0, quantidadePedidos: 0 },
      melhorAno: { ano: "N/A", faturamento: 0, lucro: 0, quantidadePedidos: 0 },
      consolidadoAnual: [],
      consolidadoMensal: {} 
    };

    // 1. Acumula o faturamento global do lojista
    dadosHist.faturamentoAcumulado = Number(
      (Number(dadosHist.faturamentoAcumulado || 0) + (total * multiplicador)).toFixed(2)
    );
    
    // 1.1 Acumula o total de pedidos gerais do lojista
    dadosHist.totalPedidosAcumulado = Math.max(
      0,
      Number(dadosHist.totalPedidosAcumulado || 0) + (1 * multiplicador * multiplicadorPedidos)
    );

    // 2. Busca o lucro líquido real e o número de pedidos atualizado daquele mês específico na collection do lojista
    const mesRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chaveMes}`);
    const mesSnap = await t.get(mesRef);
    
    const mesData = mesSnap.exists ? mesSnap.data() : {};
    const lucroLiquidoMesReal = Number(mesData.lucroLiquidoReal || 0);
    const quantidadePedidosMesReal = Number(mesData.quantidadePedidos || mesData.totalPedidos || 1);

    if (!dadosHist.consolidadoMensal) dadosHist.consolidadoMensal = {};
    
    // Mantém o faturamento e lucro, salvando também a quantidade de pedidos do mês
    dadosHist.consolidadoMensal[mesAnoKey] = {
      faturamento: faturamentoLiquidoAtualizadoGlobal,
      lucro: lucroLiquidoMesReal,
      quantidadePedidos: quantidadePedidosMesReal,
      ano: String(anoValido),
      mes: mesNome
    };

    // 3. Atualiza os anos ativos do lojista
    let anosSet = new Set(dadosHist.anosAtivos || []);
    anosSet.add(String(anoValido));
    dadosHist.anosAtivos = Array.from(anosSet);

    // 4. Reconstrói o consolidado anual, o acumulado de lucro e o total de pedidos por ano
    let consolidadoAnualTemp = {};
    let lucroTotalGeral = 0;

    for (const [mKey, mVal] of Object.entries(dadosHist.consolidadoMensal)) {
      const anoPart = mVal.ano;
      if (!consolidadoAnualTemp[anoPart]) {
        consolidadoAnualTemp[anoPart] = { 
          ano: anoPart, 
          faturamento: 0, 
          lucro: 0, 
          quantidadePedidos: 0 
        };
      }
      consolidadoAnualTemp[anoPart].faturamento += (mVal.faturamento || 0);
      consolidadoAnualTemp[anoPart].lucro += (mVal.lucro || 0);
      consolidadoAnualTemp[anoPart].quantidadePedidos += (mVal.quantidadePedidos || 0);
      
      lucroTotalGeral += (mVal.lucro || 0);
    }

    dadosHist.lucroAcumulado = Number(lucroTotalGeral.toFixed(2));
    dadosHist.consolidadoAnual = Object.values(consolidadoAnualTemp).sort((a, b) => Number(a.ano) - Number(b.ano));

    // 5. Descobre o Melhor Mês da História do Lojista (baseado no lucro e trazendo a quantidade de pedidos)
    let melhorM = { mes: "-", ano: "-", lucro: -999999, quantidadePedidos: 0 };
    for (const [mKey, mVal] of Object.entries(dadosHist.consolidadoMensal)) {
      if (mVal.lucro > melhorM.lucro) {
        melhorM = { 
          mes: mVal.mes, 
          ano: mVal.ano, 
          lucro: mVal.lucro, 
          quantidadePedidos: mVal.quantidadePedidos || 0 
        };
      }
    }
    dadosHist.melhorMes = melhorM;

    // 6. Descobre o Melhor Ano da História do Lojista (baseado no lucro e trazendo a quantidade de pedidos)
    let melhorA = { ano: "N/A", faturamento: 0, lucro: -999999, quantidadePedidos: 0 };
    for (const anoObj of dadosHist.consolidadoAnual) {
      if (anoObj.lucro > melhorA.lucro) {
        melhorA = { 
          ano: anoObj.ano, 
          faturamento: anoObj.faturamento, 
          lucro: anoObj.lucro, 
          quantidadePedidos: anoObj.quantidadePedidos || 0 
        };
      }
    }
    dadosHist.melhorAno = melhorA;

    t.set(historicoRef, dadosHist, { merge: true });
  });
}

module.exports = { processarHistoricoLojista };