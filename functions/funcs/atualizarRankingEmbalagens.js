const { FieldValue } = require("firebase-admin/firestore");

async function processarRankingEmbalagens({
  db,
  lojistaId,
  chaveMes,
  embalagemDados,
  multiplicador,
}) {
  if (!embalagemDados) return;

  const embEscolhida = embalagemDados.escolhida || {};
  const embRecomendada = embalagemDados.recomendada || {};

  const embalagemId = String(embEscolhida.id || "").trim();
  if (!embalagemId || embalagemId === "sem_id") return;

  const nomeEmbalagem = String(
    embEscolhida.dsModeloEmbalagemEscolhida || "Embalagem Padrão"
  ).trim();

  const custoEmbalagem = Number(
    Number(embEscolhida.vlCustoEmbalagemEscolhida || 0).toFixed(2)
  );

  const idRecomendado = String(embRecomendada.id || "").trim();
  const foiDiferenteDaRecomendada = idRecomendado && idRecomendado !== embalagemId ? 1 : 0;

  // 🌟 Caminho do documento principal do mês
  const statsDocRef = db.doc(
    `lojistas/${lojistaId}/dashboard_stats/${chaveMes}`
  );

  await db.runTransaction(async (t) => {
    const docSnap = await t.get(statsDocRef);
    let embalagemRanking = [];

    if (docSnap.exists && docSnap.data().embalagemRanking) {
      embalagemRanking = [...docSnap.data().embalagemRanking];
    }

    // Procura se essa embalagem já existe no array do mês
    const index = embalagemRanking.findIndex((e) => e.embalagemId === embalagemId);

    const qtdIncremento = 1 * multiplicador;
    const custoIncremento = Number((custoEmbalagem * multiplicador).toFixed(2));
    const desvioIncremento = foiDiferenteDaRecomendada * multiplicador;

    if (index > -1) {
      // Atualiza o item existente no array
      const itemAtual = embalagemRanking[index];
      embalagemRanking[index] = {
        ...itemAtual,
        quantidadeUtilizada: (itemAtual.quantidadeUtilizada || 0) + qtdIncremento,
        custoTotalGasto: Number(((itemAtual.custoTotalGasto || 0) + custoIncremento).toFixed(2)),
        vezesDiferenteRecomendada: (itemAtual.vezesDiferenteRecomendada || 0) + desvioIncremento,
        custoUnitarioPadrao: custoEmbalagem, // Atualiza para o mais recente se necessário
        nomeEmbalagem: nomeEmbalagem,
        ultimaAtualizacao: new Date(),
      };
    } else {
      // Adiciona um novo item no array
      embalagemRanking.push({
        embalagemId: embalagemId,
        nomeEmbalagem: nomeEmbalagem,
        custoUnitarioPadrao: custoEmbalagem,
        quantidadeUtilizada: qtdIncremento,
        custoTotalGasto: custoIncremento,
        vezesDiferenteRecomendada: desvioIncremento,
        ultimaAtualizacao: new Date(),
      });
    }

    // Salva o array atualizado de volta no documento principal
    t.set(
      statsDocRef,
      {
        embalagemRanking: embalagemRanking,
      },
      { merge: true }
    );
  });
}

exports.processarRankingEmbalagens = processarRankingEmbalagens;