const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

// ==========================================================================================
// 5. FUNÇÃO CONTABILIZAR VENDAS PELO PDV
// ==========================================================================================
exports.contabilizarVendaPdvV2 = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onCreate(async (snap, context) => {
    const pedido = snap.data();
    const lojistaId = context.params.lojistaId;

    if (pedido.origemPedido !== "Pdv") {
      return null;
    }

    const fin = pedido.financeiro || {};
    const itens = pedido.itens || [];

    const operadorBruto = fin.dsOperadorCaixa || "Balcão";
    const operadorIdSanitizado = String(operadorBruto)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_");

    const qtdItensTotal = itens.reduce(
      (acc, item) =>
        acc +
        Number(item.nrQuantidadeProduto || item.quantidade || item.qty || 1),
      0,
    );
    const valorTotalPedido = Number(fin.vlTotal || 0);

    const dataPedido = new Date(pedido.data || Date.now());
    const dataChaveDiaria = `${dataPedido.getFullYear()}-${String(dataPedido.getMonth() + 1).padStart(2, "0")}-${String(dataPedido.getDate()).padStart(2, "0")}`;

    const metaRef = db.doc(
      `lojistas/${lojistaId}/meta_colaboradores/${operadorIdSanitizado}/diario/${dataChaveDiaria}`,
    );

    try {
      await metaRef.set(
        {
          nomeColaborador: operadorBruto,
          totalVendido: FieldValue.increment(valorTotalPedido),
          totalPedidosVendidos: FieldValue.increment(1),
          totalItens: FieldValue.increment(qtdItensTotal),
          ultimaAtualizacao: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Erro ao gravar meta PDV:", error);
    }

    return null;
  });

  /*
      =========================================================================================
      DOCUMENTAÇÃO DA ETAPA: CONTABILIZAR VENDAS PELO PDV (V2)
      =========================================================================================
      
      1. Trigger de Criação (Firestore): 
         Monitora a criação de novos documentos de pedidos na subcoleção de cada lojista 
         (lojistas/{lojistaId}/pedidos/{pedidoId}), disparando assim que um pedido é gerado.
         
      2. Filtro de Origem: 
         Verifica se a origem da venda (`pedido.origemPedido`) é estritamente igual a "Pdv". 
         Caso contrário, a execução é interrompida imediatamente para evitar sobreposição com 
         vendas feitas pelo site ou outros canais.
         
      3. Sanitização do Operador de Caixa: 
         Extrai o nome do colaborador responsável pelo atendimento (`fin.dsOperadorCaixa`) 
         ou define "Balcão" como padrão. Em seguida, sanitiza o texto transformando em letras 
         minúsculas e substituindo caracteres especiais para criar um ID seguro de pasta.
         
      4. Consolidação de Metas Diárias: 
         Calcula a quantidade total de itens e o valor financeiro consolidado do pedido, 
         gravando ou incrementando os dados de desempenho no documento diário correspondente 
         ao operador (`lojistas/{lojistaId}/meta_colaboradores/{operadorIdSanitizado}/diario/{dataChaveDiaria}`).
      =========================================================================================
    */