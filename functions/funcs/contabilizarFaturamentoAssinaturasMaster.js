const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

// ==========================================================================================
// FUNÇÃO AUXILIAR: GERAÇÃO SEGURA DE CHAVE DO MÊS E ANO
// ==========================================================================================
function obterChavesTempo(rawData) {
  let data = rawData;
  if (data && typeof data.toDate === "function") {
    data = data.toDate();
  }
  const dataObj = new Date(data || Date.now());
  const anoValido = !isNaN(dataObj.getFullYear()) ? dataObj.getFullYear() : 2026;
  const mesValido = !isNaN(dataObj.getMonth()) ? dataObj.getMonth() : 7; // Agosto = 7

  const mesesNomes = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  
  return {
    chaveMes: `${mesesNomes[mesValido]}_${anoValido}`,
    chaveAnual: `anual_${anoValido}`,
  };
}

// ==========================================================================================
// FUNÇÃO CENTRALIZADA: CONTABILIZAR FATURAMENTO DE ASSINATURAS (MENSAL, ANUAL E GLOBAL)
// ==========================================================================================
exports.contabilizarFaturamentoAssinaturasMaster = onDocumentWritten(
  {
    document: "lojistas/{lojistaId}/assinaturas/financeiro/historicoComprovantes/{comprovanteId}",
    region: "southamerica-east1",
  },
  async (event) => {
    try {
      const lojistaId = event.params ? event.params.lojistaId : null;
      const dataEvent = event.data;
      
      if (!dataEvent) return null;

      const newData = dataEvent.after && dataEvent.after.exists ? dataEvent.after.data() : null;
      const oldData = dataEvent.before && dataEvent.before.exists ? dataEvent.before.data() : null;

      if (!newData) return null;

      const statusNovo = String(newData.dsStatusPagamentoLojista || "").trim().toLowerCase();
      const statusAntigo = oldData ? String(oldData.dsStatusPagamentoLojista || "").trim().toLowerCase() : "";

      const foiAprovadoAgora = statusNovo === "aprovado" && statusAntigo !== "aprovado";
      const deixouDeSerAprovado = statusNovo !== "aprovado" && statusAntigo === "aprovado";

      if (!foiAprovadoAgora && !deixouDeSerAprovado) return null;

      const multiplicador = foiAprovadoAgora ? 1 : -1;
      const valorTransacao = Number(newData.vlAssinaturaLojista || 0);
      const planoLoja = String(newData.dsPlanoLojista || "Bronze").trim();

      // 🗓️ Geração das chaves de tempo (Mensal e Anual)
      const rawData = newData.timestamp || newData.data || newData.createdAt || Date.now();
      const { chaveMes, chaveAnual } = obterChavesTempo(rawData);

      // 🎯 REFERÊNCIAS
      const masterStatsRef = db.doc(`master_dashboard/stats_${chaveMes}`);
      const masterAnualRef = db.doc(`master_dashboard/stats_${chaveAnual}`);
      const masterGlobalRef = db.doc("master_dashboard/faturamento_assinaturas_global");

      const planoKey = planoLoja.toLowerCase().replace(/[^a-z0-9_]/g, "_");

      // 1. ATUALIZAÇÃO DO MÊS/ANO ESPECÍFICO (`master_dashboard/stats_{chave}`)
      await db.runTransaction(async (t) => {
        const masterSnap = await t.get(masterStatsRef);
        const dadosAtuais = masterSnap.exists ? masterSnap.data() : {};

        const planosCount = dadosAtuais.planosAtivosCount || {};
        const faturamentoPorPlano = dadosAtuais.faturamentoPorPlano || {};

        if (multiplicador > 0) {
          planosCount[planoKey] = (planosCount[planoKey] || 0) + 1;
          faturamentoPorPlano[planoKey] = (faturamentoPorPlano[planoKey] || 0) + valorTransacao;
        } else {
          planosCount[planoKey] = Math.max(0, (planosCount[planoKey] || 0) - 1);
          faturamentoPorPlano[planoKey] = Math.max(0, (faturamentoPorPlano[planoKey] || 0) - valorTransacao);
        }

        t.set(
          masterStatsRef,
          {
            faturamentoTotalAssinaturas: FieldValue.increment(valorTransacao * multiplicador),
            totalAssinaturasAprovadas: FieldValue.increment(multiplicador),
            planosAtivosCount: planosCount,
            faturamentoPorPlano: faturamentoPorPlano,
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      // 2. ATUALIZAÇÃO DO ANUAL ESPECÍFICO (`master_dashboard/stats_anual_{ano}`)
      await db.runTransaction(async (t) => {
        const anualSnap = await t.get(masterAnualRef);
        const dadosAnual = anualSnap.exists ? anualSnap.data() : {};

        const planosAnualCount = dadosAnual.planosAtivosCount || {};
        const faturamentoAnualPorPlano = dadosAnual.faturamentoPorPlano || {};

        if (multiplicador > 0) {
          planosAnualCount[planoKey] = (planosAnualCount[planoKey] || 0) + 1;
          faturamentoAnualPorPlano[planoKey] = (faturamentoAnualPorPlano[planoKey] || 0) + valorTransacao;
        } else {
          planosAnualCount[planoKey] = Math.max(0, (planosAnualCount[planoKey] || 0) - 1);
          faturamentoAnualPorPlano[planoKey] = Math.max(0, (faturamentoAnualPorPlano[planoKey] || 0) - valorTransacao);
        }

        t.set(
          masterAnualRef,
          {
            faturamentoTotalAssinaturasAnual: FieldValue.increment(valorTransacao * multiplicador),
            totalAssinaturasAprovadasAnual: FieldValue.increment(multiplicador),
            planosAtivosCount: planosAnualCount,
            faturamentoPorPlano: faturamentoAnualPorPlano,
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      // 3. ATUALIZAÇÃO DA MÉTRICA GLOBAL DA PLATAFORMA (`master_dashboard/faturamento_assinaturas_global`)
      await db.runTransaction(async (t) => {
        const globalSnap = await t.get(masterGlobalRef);
        const dadosGlobal = globalSnap.exists ? globalSnap.data() : {};

        const planosGlobalCount = dadosGlobal.planosAtivosCount || {};
        const faturamentoGlobalPorPlano = dadosGlobal.faturamentoPorPlano || {};

        if (multiplicador > 0) {
          planosGlobalCount[planoKey] = (planosGlobalCount[planoKey] || 0) + 1;
          faturamentoGlobalPorPlano[planoKey] = (faturamentoGlobalPorPlano[planoKey] || 0) + valorTransacao;
        } else {
          planosGlobalCount[planoKey] = Math.max(0, (planosGlobalCount[planoKey] || 0) - 1);
          faturamentoGlobalPorPlano[planoKey] = Math.max(0, (faturamentoGlobalPorPlano[planoKey] || 0) - valorTransacao);
        }

        t.set(
          masterGlobalRef,
          {
            faturamentoTotalAssinaturasGlobal: FieldValue.increment(valorTransacao * multiplicador),
            totalAssinaturasAprovadasGlobal: FieldValue.increment(multiplicador),
            planosAtivosCount: planosGlobalCount,
            faturamentoPorPlano: faturamentoGlobalPorPlano,
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      console.log(`📊 [Master Dashboard] Assinaturas (${chaveMes}, ${chaveAnual} e Global) atualizadas para a loja ${lojistaId}. Valor: R$ ${valorTransacao * multiplicador}`);
      return null;
    } catch (error) {
      console.error("Erro na função contabilizarFaturamentoAssinaturasMaster:", error);
      return null;
    }
  }
);