const { FieldValue } = require("firebase-admin/firestore");

async function processarRankingProdutosClientes({
  db, lojistaId, chaveMes, subtotal, descontoCupom, qtdTotalItensPedido,
  custoTotalPedidoGeral, multiplicador, listaVendaUnica, newData
}) {
  const mesRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chaveMes}`);

  await db.runTransaction(async (t) => {
    const valorSubtotalPedido = subtotal > 0 ? subtotal : 1;
    const descontoTotalPedido = descontoCupom || 0;
    let custoTotalPedidoCliente = 0;

    // 1. Atualiza o ranking de produtos (Subcoleção detalhada de auditoria)
    listaVendaUnica.forEach((itemU) => {
      const varSanitizada = itemU.variacaoProduto
        ? itemU.variacaoProduto.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_")
        : "padrao";
      const idDocRanking = `${itemU.idProduto}_${varSanitizada}`;
      const prodRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chaveMes}/produtos_ranking/${idDocRanking}`);

      const qtdItemMod = itemU.qtdItem * multiplicador;
      const valorBrutoItem = itemU.precoUnitario * Math.abs(qtdItemMod);
      const proporcaoItem = valorSubtotalPedido > 0 ? (valorBrutoItem / valorSubtotalPedido) : 0;
      const cupomItem = Number((descontoTotalPedido * proporcaoItem).toFixed(2));
      const valorLiquidoItem = Math.max(0, valorBrutoItem - cupomItem);

      const custoTotalItem = itemU.custoUnitario * Math.abs(qtdItemMod);
      const lucroLiquidoItem = Math.max(0, valorLiquidoItem - custoTotalItem);
      const margemPercentual = valorLiquidoItem > 0 ? Number(((lucroLiquidoItem / valorLiquidoItem) * 100).toFixed(2)) : 0;

      custoTotalPedidoCliente += custoTotalItem;

      t.set(prodRef, {
        idProduto: itemU.idProduto || "",
        nome: itemU.nomeProduto,
        variacao: itemU.variacaoProduto || "Padrão",
        vlCustoUnitarioProduto: FieldValue.increment(multiplicador > 0 ? custoTotalItem : -custoTotalItem),
        quantidadeVendida: FieldValue.increment(qtdItemMod),
        valorBrutoVendas: FieldValue.increment(multiplicador > 0 ? valorBrutoItem : -valorBrutoItem),
        totalCupomAplicado: FieldValue.increment(multiplicador > 0 ? cupomItem : -cupomItem),
        valorLiquidoVendas: FieldValue.increment(multiplicador > 0 ? valorLiquidoItem : -valorLiquidoItem),
        custoTotalVendas: FieldValue.increment(multiplicador > 0 ? custoTotalItem : -custoTotalItem),
        lucroBrutoVendas: FieldValue.increment(multiplicador > 0 ? lucroLiquidoItem : -lucroLiquidoItem),
        margemLucroMedia: margemPercentual,
      }, { merge: true });
    });

    // 2. Atualiza o ranking de clientes (Subcoleção detalhada)
    const clienteInfo = newData.dsCliente || {};
    const enderecoInfo = newData.dsEndereco || newData.endereco || {};

    const cpfBruto = clienteInfo.dsCpfCliente || clienteInfo.cpf || "";
    const cpfLimpo = cpfBruto.replace(/[^0-9]/g, "");

    const idCliente = cpfLimpo.length > 0 ? cpfLimpo : "cliente_anonimo";
    const nomeCliente = clienteInfo.nmNomeCliente || clienteInfo.nome || "Cliente Sem Nome";
    const telefoneCliente = clienteInfo.dsTelefoneCliente || clienteInfo.telefone || "";

    const cidadeCliente = clienteInfo.dsCidadeCliente || enderecoInfo.dsCidadeCliente || enderecoInfo.cidade || "";
    const ufCliente = clienteInfo.dsUfCliente || enderecoInfo.dsUfCliente || enderecoInfo.uf || "";

    const clienteRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chaveMes}/clientes_ranking/${idCliente}`);

    const valorBrutoPedidoCliente = subtotal;
    const totalCupomPedidoCliente = descontoCupom;
    const valorLiquidoPedidoCliente = Math.max(0, subtotal - descontoCupom);
    const lucroBrutoPedidoCliente = Math.max(0, valorLiquidoPedidoCliente - (custoTotalPedidoCliente > 0 ? custoTotalPedidoCliente : custoTotalPedidoGeral));

    t.set(clienteRef, {
      cpf: cpfBruto,
      nome: nomeCliente,
      telefone: telefoneCliente,
      cidade: cidadeCliente,
      uf: ufCliente,
      numeroItensComprados: FieldValue.increment(qtdTotalItensPedido * multiplicador),
      valorBrutoCompras: FieldValue.increment(multiplicador > 0 ? valorBrutoPedidoCliente : -valorBrutoPedidoCliente),
      totalCupomAplicado: FieldValue.increment(multiplicador > 0 ? totalCupomPedidoCliente : -totalCupomPedidoCliente),
      valorLiquidoCompras: FieldValue.increment(multiplicador > 0 ? valorLiquidoPedidoCliente : -valorLiquidoPedidoCliente),
      custoTotalCompras: FieldValue.increment(multiplicador > 0 ? (custoTotalPedidoCliente > 0 ? custoTotalPedidoCliente : custoTotalPedidoGeral) : -(custoTotalPedidoCliente > 0 ? custoTotalPedidoCliente : custoTotalPedidoGeral)),
      lucroBrutoGerado: FieldValue.increment(multiplicador > 0 ? lucroBrutoPedidoCliente : -lucroBrutoPedidoCliente),
      totalPedidos: FieldValue.increment(multiplicador),
      dataUltimaCompra: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  // 3. Atualiza os arrays consolidados no documento pai do mês para Leitura Única (Zero Custo no Front)
  try {
    // 🚀 BUSCA TODOS OS PRODUTOS VENDIDOS NO MÊS (Até ~200 itens cabem tranquilamente no 1MB do doc pai)
    const produtosSnap = await db.collection(`lojistas/${lojistaId}/dashboard_stats/${chaveMes}/produtos_ranking`)
      .orderBy('lucroBrutoVendas', 'desc')
      .get(); // Sem .limit(15), trazendo o catálogo completo do mês para paginação em memória!

    const produtosRankingCompleto = produtosSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 🌟 Mantém os Top 15 para Clientes (já que clientes podem passar de 1.000 e estourar o 1MB)
    const clientesSnap = await db.collection(`lojistas/${lojistaId}/dashboard_stats/${chaveMes}/clientes_ranking`)
      .orderBy('valorLiquidoCompras', 'desc')
      .limit(15)
      .get();

    const clientesTop15 = clientesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Salva o array completo de produtos e o Top 15 de clientes direto no documento principal do mês
    await mesRef.set({
      produtosRanking: produtosRankingCompleto, // Catálogo completo do mês em 1 única leitura
      clientesRankingTop: clientesTop15          // Top clientes para o painel rápido
    }, { merge: true });

  } catch (err) {
    console.error("Erro ao atualizar os arrays consolidados no documento pai:", err);
  }
}

module.exports = { processarRankingProdutosClientes };
//(Focado apenas em atualizar os sub-rankings de produtos e clientes da loja).