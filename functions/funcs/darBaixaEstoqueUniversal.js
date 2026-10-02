const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();

// ==========================================================================================
// FUNÇÃO DAR BAIXA NO ESTOQUE (COM TRAVA ATÔMICA CONTRA CONCORRÊNCIA)
// ==========================================================================================
exports.darBaixaEstoqueUniversal = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onCreate(async (snap, context) => {
    const lojistaId = context.params.lojistaId;
    const pedidoId = context.params.pedidoId;
    const pedidoRef = snap.ref;

    try {
      await db.runTransaction(async (t) => {
        // 1. LEITURA ATÔMICA DO PEDIDO DENTRO DA TRANSAÇÃO
        const pedidoSnap = await t.get(pedidoRef);
        if (!pedidoSnap.exists) return;
        
        const pedido = pedidoSnap.data();

        // 🛡️ TRAVA ATÔMICA: Se já foi baixado, cancela imediatamente na hora
        if (pedido.isEstoqueBaixadoUniversal === true) {
          console.log(`🛡️ Ignorado: O estoque do pedido (${pedidoId}) já foi processado.`);
          return;
        }

        const itens = pedido.itens || [];
        if (itens.length === 0) return;

        const itensConsolidados = {};
        for (const item of itens) {
          const idProduto = String(item.idProduto || "").trim();
          if (!idProduto) continue;

          const idVariacao = String(item.idVariacao || "").trim();
          const variacaoTexto = String(item.dsVariacaoProduto || "Padrão").trim();
          const qtdVendida = Number(item.nrQuantidadeProduto || item.qty || 1);

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
        if (listaParaBaixa.length === 0) return;

        const acoesPorProduto = {};
        const insumosParaAtualizar = {};
        const logsParaSalvar = []; 
        const dataMovimentacaoIso = new Date().toISOString();

        // 2. LEITURA DOS PRODUTOS
        for (const itemUnico of listaParaBaixa) {
          if (!acoesPorProduto[itemUnico.idProduto]) {
            const produtoRef = db.doc(`lojistas/${lojistaId}/produtos/${itemUnico.idProduto}`);
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

        // 2.1 LEITURA PRÉVIA DOS INSUMOS DE COMPOSIÇÃO
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

        // 3. PROCESSAMENTO E CÁLCULOS DE ESTOQUE
        for (const idProduto in acoesPorProduto) {
          const prodInfo = acoesPorProduto[idProduto];
          const dadosProd = prodInfo.dados;
          
          const nomeProdutoGeral = String(dadosProd.dsNomeProduto || dadosProd.nmProduto || dadosProd.nome || "Produto sem nome").trim();
          const variacoesAtuais = dadosProd.variacoes || [];
          let estoqueSimplesAtual = Number(dadosProd.nrEstoqueProduto || dadosProd.estoque || 0);

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

                const batePorId = idVarPedido && idVarBanco && idVarPedido === idVarBanco;
                const batePorTexto = 
                  !varPedidoLimpa ||
                  varPedidoLimpa === "padrão" ||
                  nomeVarBanco === varPedidoLimpa ||
                  modeloBanco === varPedidoLimpa ||
                  varTextoBanco === varPedidoLimpa;

                const bateVariacao = idVarPedido ? batePorId : batePorTexto;

                if (bateVariacao) {
                  if (movEstoqueVar) {
                    const estoqueAtualVar = Number(v.nrEstoqueProduto || v.estoque || v.nrEstoque || 0);
                    const novoEstoqueVar = Math.max(0, estoqueAtualVar - itemUnico.qtdVendida);

                    v.estoque = novoEstoqueVar;
                    v.nrEstoque = novoEstoqueVar;
                    v.nrEstoqueProduto = novoEstoqueVar;

                    const nomeVariacaoDescritiva = String(v.dsVariacaoProduto || v.dsNomeProduto || itemUnico.variacaoTexto || "Padrão");
                    const logRef = db.collection(`lojistas/${lojistaId}/movimentacoes_estoque`).doc();
                    logsParaSalvar.push({
                      ref: logRef,
                      data: {
                        dataMovimentacao: dataMovimentacaoIso,
                        nomeItem: nomeProdutoGeral,
                        variacao: nomeVariacaoDescritiva,
                        tipoItem: "produto",
                        tipoMovimentacao: "SAIDA",
                        origem: "Venda E-commerce",
                        quantidade: itemUnico.qtdVendida,
                        estoqueAnterior: estoqueAtualVar,
                        estoqueAtual: novoEstoqueVar,
                        operador: "Sistema",
                        pedidoId: pedidoId
                      }
                    });
                  }

                  if (movComposicaoVar && Array.isArray(itemUnico.itemOriginal.insumosComposicaoProduto)) {
                    itemUnico.itemOriginal.insumosComposicaoProduto.forEach((ins) => {
                      const insumoId = String(ins.id || ins.idInsumo || "").trim();
                      if (insumoId) {
                        const qtdPorUnidade = Number(ins.nrQuantidadeConsumida || ins.quantidade || 0);
                        const qtdConsumidaTotal = qtdPorUnidade * itemUnico.qtdVendida;
                        insumosParaAtualizar[insumoId] = {
                          quantidadeTotal: (insumosParaAtualizar[insumoId]?.quantidadeTotal || 0) + qtdConsumidaTotal,
                          nomeInsumo: String(ins.dsNomeInsumo || ins.nmInsumo || ins.nome || "Insumo").trim()
                        };
                      }
                    });
                  }
                }
                return v;
              });
            }

            t.update(prodInfo.ref, { variacoes: novasVariacoes });
          } else {
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
                    insumosParaAtualizar[insumoId] = {
                      quantidadeTotal: (insumosParaAtualizar[insumoId]?.quantidadeTotal || 0) + qtdConsumidaTotal,
                      nomeInsumo: String(ins.dsNomeInsumo || ins.nmInsumo || ins.nome || "Insumo").trim()
                    };
                  }
                });
              }
            }

            if (movEstoqueSimples) {
              const novoEstoqueSimples = Math.max(0, estoqueSimplesAtual - totalBaixaSimples);

              t.update(prodInfo.ref, {
                estoque: novoEstoqueSimples,
                nrEstoque: novoEstoqueSimples,
                nrEstoqueProduto: novoEstoqueSimples,
              });

              const logRef = db.collection(`lojistas/${lojistaId}/movimentacoes_estoque`).doc();
              logsParaSalvar.push({
                ref: logRef,
                data: {
                  dataMovimentacao: dataMovimentacaoIso,
                  nomeItem: nomeProdutoGeral,
                  variacao: "",
                  tipoItem: "produto",
                  tipoMovimentacao: "SAIDA",
                  origem: "Venda E-commerce",
                  quantidade: totalBaixaSimples,
                  estoqueAnterior: estoqueSimplesAtual,
                  estoqueAtual: novoEstoqueSimples,
                  operador: "Sistema",
                  pedidoId: pedidoId
                }
              });
            }
          }
        }

        // 4. GRAVAÇÃO DAS BAIXAS DOS INSUMOS
        for (const insumoId in insumosParaAtualizar) {
          const infoInsumo = insumosParaAtualizar[insumoId];
          const qtdTotalConsumida = infoInsumo.quantidadeTotal;
          const dadosInsumo = insumosSnaps[insumoId];

          if (dadosInsumo && dadosInsumo.snap.exists) {
            const insumoData = dadosInsumo.snap.data();
            const estoqueInsumoAtual = Number(insumoData.nrEstoqueAtualInsumo || insumoData.estoque || 0);
            const novoEstoqueInsumo = Math.max(0, estoqueInsumoAtual - qtdTotalConsumida);

            t.update(dadosInsumo.ref, { nrEstoqueAtualInsumo: novoEstoqueInsumo });

            const logInsumoRef = db.collection(`lojistas/${lojistaId}/movimentacoes_estoque`).doc();
            logsParaSalvar.push({
              ref: logInsumoRef,
              data: {
                dataMovimentacao: dataMovimentacaoIso,
                nomeItem: infoInsumo.nomeInsumo,
                variacao: "",
                tipoItem: "insumo",
                tipoMovimentacao: "SAIDA",
                origem: "Consumo Composição (Pedido)",
                quantidade: qtdTotalConsumida,
                estoqueAnterior: estoqueInsumoAtual,
                estoqueAtual: novoEstoqueInsumo,
                operador: "Sistema",
                pedidoId: pedidoId
              }
            });
          }
        }

        // 5. GRAVAÇÃO DOS LOGS
        for (const logItem of logsParaSalvar) {
          t.set(logItem.ref, logItem.data);
        }

        // 🌟 GRAVA A TRAVA ATÔMICA DENTRO DA PRÓPRIA TRANSAÇÃO
        t.update(pedidoRef, {
          isEstoqueBaixadoUniversal: true
        });
      });
    } catch (error) {
      console.error(`❌ Erro ao processar baixa de estoque do pedido ${pedidoId}:`, error);
    }

    return null;
  });