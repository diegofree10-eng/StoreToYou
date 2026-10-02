const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

// ==========================================================================================
// MOTOR DRE CORPORATIVO - BLINDAGEM MATEMÁTICA ABSOLUTA
// ==========================================================================================
function calcularDRE(statsAtuais, alteracoes) {
  // 1. Receitas e Deduções Globais (com toFixed para evitar lixo flutuante)
  const receitaBruta = Number((Number(statsAtuais.receitaBrutaProdutos || 0) + (alteracoes.receitaBrutaDelta || 0)).toFixed(2));
  const deducoes = Number((Number(statsAtuais.deducoesVendas || 0) + (alteracoes.deducoesDelta || 0)).toFixed(2));
  const taxasCartao = Number((Number(statsAtuais.taxasGatewayCartao || 0) + (alteracoes.taxasDelta || 0)).toFixed(2));
  const comissoes = Number((Number(statsAtuais.comissoesVendas || 0) + (alteracoes.comissoesDelta || 0)).toFixed(2));

  // Receita Líquida (Nunca abaixo de 0)
  const receitaLiquida = Number(Math.max(0, receitaBruta - deducoes - taxasCartao - comissoes).toFixed(2));

  // 2. CMV e Lucro Bruto
  const cmv = Number((Number(statsAtuais.cmv || 0) + (alteracoes.cmvDelta || 0)).toFixed(2));
  const lucroBruto = Number((receitaLiquida - cmv).toFixed(2));

  // 3. Logística e Resultado Operacional
  const despesasLogistica = Number((Number(statsAtuais.despesasLogistica || 0) + (alteracoes.logisticaDelta || 0)).toFixed(2));
  const resultadoOperacional = Number((lucroBruto - despesasLogistica).toFixed(2));

  // 4. DESPESAS FIXAS E VARIÁVEIS (BLINDADAS CONTRA NEGATIVOS E ESTORNOS FANTASMAS)
  // Calculamos o bruto com o delta
  let calcFixas = Number(statsAtuais.totalDespesasFixas || 0) + (alteracoes.fixasDelta || 0);
  let calcVariaveis = Number(statsAtuais.totalDespesasVariaveis || 0) + (alteracoes.variaveisDelta || 0);

  // SANITY CHECK: Despesa jamais pode ser menor que zero na raiz sintética
  const totalDespesasFixas = Number(Math.max(0, calcFixas).toFixed(2));
  const totalDespesasVariaveis = Number(Math.max(0, calcVariaveis).toFixed(2));

  // 5. O Lucro Líquido Real (Derivado estaticamente e imune a erros de sinal)
  const lucroLiquidoReal = Number((resultadoOperacional - totalDespesasFixas - totalDespesasVariaveis).toFixed(2));

  return {
    receitaBrutaProdutos: receitaBruta,
    deducoesVendas: deducoes,
    taxasGatewayCartao: taxasCartao,
    comissoesVendas: comissoes,
    receitaLiquida: receitaLiquida,
    cmv: cmv,
    lucroBruto: lucroBruto,
    despesasLogistica: despesasLogistica,
    resultadoOperacional: resultadoOperacional,
    totalDespesasFixas: totalDespesasFixas,
    totalDespesasVariaveis: totalDespesasVariaveis,
    lucroLiquidoReal: lucroLiquidoReal,
  };
}

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
// 8. FUNÇÃO DESPESAS FIXAS (Com Motor de Recálculo Absoluto e Suporte ao Raio-X)
// ==========================================================================================
exports.atualizarEstatisticasDespesasFixas = onDocumentWritten(
  {
    document: "lojistas/{lojistaId}/pagamentos_financeiro/{pagamentoId}",
    region: "southamerica-east1",
  },
  async (event) => {
    const lojistaId = event.params.lojistaId;
    const pagamentoId = event.params.pagamentoId;
    const newData = event.data?.after.exists ? event.data.after.data() : null;
    const oldData = event.data?.before.exists ? event.data.before.data() : null;

    if (!newData && !oldData) return null;

    const tipoNovo = String(newData?.tipo || "").toLowerCase();
    const tipoAntigo = String(oldData?.tipo || "").toLowerCase();
    const ehFixaOuOperacional = (tipo) => tipo !== "compra";

    // 1. Processa dados anteriores (Estorno / Remoção / Mudança)
    if (oldData) {
      const eraPago = String(oldData.status || "").toLowerCase() === "pago";
      const eraValido = ehFixaOuOperacional(tipoAntigo);

      if (eraPago && eraValido) {
        const valorAntigo = Number(oldData.valor ?? oldData.vlDespesa ?? 0);
        const dataReferenciaAntiga = oldData.dataPagamento || oldData.vencimento || oldData.createdAt || Date.now();
        const chaveAntiga = obterChaveMes(dataReferenciaAntiga);
        
        const statsRefAntigo = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chaveAntiga}`);
        const detalheRefAntigo = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chaveAntiga}/despesas_fixas_detalhe/${pagamentoId}`);

        await db.runTransaction(async (t) => {
          const statsDoc = await t.get(statsRefAntigo);
          const statsAtuais = statsDoc.exists ? statsDoc.data() : {};

          // Configura o delta de estorno (-valorAntigo nas despesas fixas)
          const alteracoes = {
            receitaBrutaDelta: 0,
            deducoesDelta: 0,
            taxasDelta: 0,
            comissoesDelta: 0,
            cmvDelta: 0,
            logisticaDelta: 0,
            fixasDelta: -valorAntigo,
            variaveisDelta: 0,
          };

          // 🧠 Motor de recálculo absoluto
          const dreRecalculada = calcularDRE(statsAtuais, alteracoes);

          t.set(
            statsRefAntigo,
            {
              ...dreRecalculada,
              ultimaAtualizacao: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          t.delete(detalheRefAntigo);
        });
      }
    }

    // 2. Processa novos dados (Lançamento / Pagamento)
    if (newData) {
      const estaPago = String(newData.status || "").toLowerCase() === "pago";
      const estaValido = ehFixaOuOperacional(tipoNovo);

      if (estaPago && estaValido) {
        const valorNovo = Number(newData.valor ?? newData.vlDespesa ?? 0);
        const dataReferenciaNova = newData.dataPagamento || newData.vencimento || newData.createdAt || Date.now();
        const chaveNova = obterChaveMes(dataReferenciaNova);
        
        const statsRefNovo = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chaveNova}`);
        const detalheRefNovo = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chaveNova}/despesas_fixas_detalhe/${pagamentoId}`);

        await db.runTransaction(async (t) => {
          const statsDoc = await t.get(statsRefNovo);
          const statsAtuais = statsDoc.exists ? statsDoc.data() : {};

          // Configura o delta de inclusão (+valorNovo nas despesas fixas)
          const alteracoes = {
            receitaBrutaDelta: 0,
            deducoesDelta: 0,
            taxasDelta: 0,
            comissoesDelta: 0,
            cmvDelta: 0,
            logisticaDelta: 0,
            fixasDelta: valorNovo,
            variaveisDelta: 0,
          };

          // 🧠 Motor de recálculo absoluto (Atualiza a raiz inteira e o Lucro Líquido Real)
          const dreRecalculada = calcularDRE(statsAtuais, alteracoes);

          t.set(
            statsRefNovo,
            {
              ...dreRecalculada,
              ultimaAtualizacao: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );

          // Salva o item individual na subcoleção para permitir o clique (Raio-X)
          t.set(
            detalheRefNovo,
            {
              descricao: newData.descricao || "Despesa Fixa",
              valor: valorNovo,
              fornecedor: newData.fornecedor || "Não informado",
              vencimento: newData.vencimento || null,
              dataPagamento: newData.dataPagamento || null,
              status: "pago",
              atualizadoEm: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        });
      }
    }

    return null;
  },
);
/*
      =========================================================================================
      DOCUMENTAÇÃO DA ETAPA: ATUALIZAR ESTATÍSTICAS DE DESPESAS FIXAS
      =========================================================================================
      
      1. Trigger de Escrita (onDocumentWritten v2): 
         Monitora a criação, atualização ou remoção de documentos na subcoleção de despesas fixas 
         de cada lojista (lojistas/{lojistaId}/despesas_fixas/{despesaId}).
         
      2. Tratamento de Dados Antigos (Exclusão ou Alteração): 
         Caso exista um registro anterior (`oldData`), extrai o valor monetário e calcula a chave 
         do mês correspondente (`obterChaveMes`), executando uma transação para decrementar 
         (`FieldValue.increment(-valorAntigo)`) o somatório de despesas fixas daquele período.
         
      3. Tratamento de Novos Dados (Criação ou Atualização): 
         Caso exista um novo registro (`newData`), extrai o valor atualizado e a chave do mês nova, 
         executando uma transação para incrementar (`FieldValue.increment(valorNovo)`) o total de 
         despesas fixas no documento de estatísticas mensais do lojista (`dashboard_stats/{chaveNova}`).
      =========================================================================================
    */