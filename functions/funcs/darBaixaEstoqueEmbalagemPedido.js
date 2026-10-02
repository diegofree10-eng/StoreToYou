const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();

exports.darBaixaEstoqueEmbalagemPedido = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onUpdate(async (change, context) => {
    const lojistaId = context.params.lojistaId;
    const pedidoId = context.params.pedidoId;

    const antes = change.before.exists ? change.before.data() : null;
    const newData = change.after.exists ? change.after.data() : null;

    if (!newData) return null;

    console.log(`🔍 [Baixa Estoque] Analisando pedido ${pedidoId} para o lojista ${lojistaId}...`);

    // 1. Verificações de Gatilho
    const contadorAntes = Number(antes?.nrContadorMudancas || 0);
    const contadorDepois = Number(newData.nrContadorMudancas || 0);
    
    const eraConcluido = antes ? Boolean(antes.isStatusPedidoConcluido) : false;
    const ehConcluido = Boolean(newData.isStatusPedidoConcluido);
    const mudouParaConcluido = !eraConcluido && ehConcluido;

    if (contadorAntes === contadorDepois && !mudouParaConcluido) return null;
    if (!ehConcluido) return null;

    // 2. Trava de Segurança
    const embalagemPayload = newData.Embalagem || {};
    if (embalagemPayload.isEmbalagemBaixada === true) {
      console.log(`🛡️ Ignorado: A baixa deste pedido já foi realizada anteriormente.`);
      return null;
    }

    // 3. Captura do ID da Embalagem
    const embEscolhida = embalagemPayload.escolhida || {};
    const embRecomendada = embalagemPayload.recomendada || {};

    const idEmbAlvo = String(
      embEscolhida.id || 
      embRecomendada.id || 
      embalagemPayload.id || 
      ""
    ).trim();

    if (!idEmbAlvo) {
      console.log(`❌ ERRO: Nenhum ID de embalagem encontrado no pedido ${pedidoId}.`);
      return null;
    }

    const insumosComposicao = Array.isArray(embEscolhida.insumosComposicaoEmbalagem)
      ? embEscolhida.insumosComposicaoEmbalagem
      : (Array.isArray(embRecomendada.insumosComposicaoEmbalagem) ? embRecomendada.insumosComposicaoEmbalagem : []);

    const dataMovimentacaoIso = new Date().toISOString();

    await db.runTransaction(async (t) => {
      // ==========================================
      // FASE 1: TODAS AS LEITURAS (OBRIGATÓRIO PRIMEIRO)
      // ==========================================
      const embalagemRef = db.doc(`lojistas/${lojistaId}/embalagem/${idEmbAlvo}`);
      const embalagemSnap = await t.get(embalagemRef);

      if (!embalagemSnap.exists) {
        console.log(`❌ ERRO: Embalagem ID '${idEmbAlvo}' não encontrada na coleção 'embalagem'.`);
        return;
      }

      const insumosLeituras = [];
      for (const ins of insumosComposicao) {
        const insumoId = String(ins.insumoId || ins.id || "").trim();
        if (!insumoId) continue;

        const insumoRef = db.doc(`lojistas/${lojistaId}/insumos_composicao/${insumoId}`);
        const insumoSnap = await t.get(insumoRef);
        if (insumoSnap.exists) {
          insumosLeituras.push({
            ins,
            insumoRef,
            insumoData: insumoSnap.data()
          });
        }
      }

      // ==========================================
      // FASE 2: TODAS AS ESCRITAS (APÓS AS LEITURAS)
      // ==========================================
      const logsParaSalvar = [];

      // Baixa da Embalagem Principal
      const embData = embalagemSnap.data();
      const estoqueEmbAtual = Number(embData.nrEstoqueAtualEmbalagem ?? 0);
      const qtdConsumidaEmb = 1; // Sempre positivo
      const novoEstoqueEmb = Math.max(0, estoqueEmbAtual - qtdConsumidaEmb);
      const nomeEmbalagem = String(embData.dsNomeEmbalagem || embData.nome || "Embalagem").trim();

      t.update(embalagemRef, {
        nrEstoqueAtualEmbalagem: novoEstoqueEmb,
        estoque: novoEstoqueEmb
      });

      const logEmbRef = db.collection(`lojistas/${lojistaId}/movimentacoes_estoque`).doc();
      logsParaSalvar.push({
        ref: logEmbRef,
        data: {
          dataMovimentacao: dataMovimentacaoIso,
          nomeItem: nomeEmbalagem,
          variacao: "",
          tipoItem: "embalagem",
          tipoMovimentacao: "SAIDA",
          origem: `Uso em Embalagem de Pedido (Pedido #${(newData.nrNumeroPedido || pedidoId.slice(-4))})`,
          quantidade: qtdConsumidaEmb, // 🌟 Garantido positivo
          estoqueAnterior: estoqueEmbAtual,
          estoqueAtual: novoEstoqueEmb,
          operador: "Sistema",
          pedidoId: pedidoId
        }
      });

      // Baixa dos Insumos
      for (const item of insumosLeituras) {
        const { ins, insumoRef, insumoData } = item;
        const qtdPorUnidade = Math.abs(Number(ins.quantidade || 1)); // 🌟 Garantido positivo
        const nomeInsumo = String(ins.nome || "Insumo").trim();

        const estoqueInsumoAtual = Number(insumoData.nrEstoqueAtualInsumo ?? insumoData.estoque ?? 0);
        const novoEstoqueInsumo = Math.max(0, estoqueInsumoAtual - qtdPorUnidade);

        t.update(insumoRef, {
          nrEstoqueAtualInsumo: novoEstoqueInsumo,
          estoque: novoEstoqueInsumo
        });

        const logInsumoRef = db.collection(`lojistas/${lojistaId}/movimentacoes_estoque`).doc();
        logsParaSalvar.push({
          ref: logInsumoRef,
          data: {
            dataMovimentacao: dataMovimentacaoIso,
            nomeItem: nomeInsumo,
            variacao: "",
            tipoItem: "insumo",
            tipoMovimentacao: "SAIDA",
            origem: `Consumo Composição (Embalagem) (Pedido #${(newData.nrNumeroPedido || pedidoId.slice(-4))})`,
            quantidade: qtdPorUnidade, // 🌟 Garantido positivo
            estoqueAnterior: estoqueInsumoAtual,
            estoqueAtual: novoEstoqueInsumo,
            operador: "Sistema",
            pedidoId: pedidoId
          }
        });
      }

      // Salva todos os logs
      for (const logItem of logsParaSalvar) {
        t.set(logItem.ref, logItem.data);
      }

      // Trava de segurança no pedido
      t.update(change.after.ref, {
        "Embalagem.isEmbalagemBaixada": true
      });

      console.log(`🎉 SUCESSO: Baixa de estoque da embalagem e insumos concluída para o pedido ${pedidoId}!`);
    });

    return null;
  });