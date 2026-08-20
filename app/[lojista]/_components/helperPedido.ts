import { db } from "@/lib/firebase";
import {
  doc,
  runTransaction,
  collection,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export const executarFluxoPedido = async ({
  lojistaId,
  lojistaSlug,
  cliente,
  endereco,
  safeCart,
  personalizacoes,
  requisitosDoBanco,
  valorSubtotalProdutos,
  valorDesconto,
  totalGeral,
  whatsappNumero,
  dadosLoja,
  logistica,
  cupomDigitado,
  freteGratisConfig,
  payloadPixBruto,
  freteSel,
  dsFormaPagamentoCarrinho = "pix", // 🌟 Parâmetro flexível com "pix" como padrão atual
}: any) => {
  try {
    // 🛡️ BLINDAGEM FINANCEIRA: Garantia de precisão matemática antes de salvar
    const subtotalFinal = Number(Number(valorSubtotalProdutos || 0).toFixed(2));
    const descontoFinal = Number(Number(valorDesconto || 0).toFixed(2));
    const freteFinal = Number(Number(logistica?.valorFrete || logistica?.vlFrete || 0).toFixed(2));
    
    // Cálculo de controle para total líquido (Subtotal - Desconto + Frete)
    const totalCalculadoManual = Number((subtotalFinal - descontoFinal + freteFinal).toFixed(2));
    const totalGeralFinal = Number(Number(totalGeral || totalCalculadoManual).toFixed(2));

    const contadorRef = doc(
      db,
      "lojistas",
      lojistaId,
      "config",
      "contador_pedidos",
    );

    const numPedidoSequencial = await runTransaction(
      db,
      async (transaction) => {
        // ==========================================
        // FASE 1: TODAS AS LEITURAS (READS) PRIMEIRO
        // ==========================================

        const docSnapContador = await transaction.get(contadorRef);
        let proximo = 1;
        if (docSnapContador.exists()) {
          proximo = (docSnapContador.data().ultimoNumero || 0) + 1;
        }

        const produtosParaAtualizar: Array<{
          prodRef: any;
          prodSnap: any;
          qtdComprada: number;
          nomeVar: string;
        }> = [];

        for (const item of safeCart) {
          const produtoId = item.idProduto || item.id;
          if (!produtoId) continue;

          const prodRef = doc(db, "lojistas", lojistaId, "produtos", produtoId);
          const prodSnap = await transaction.get(prodRef);

          if (!prodSnap.exists()) continue;

          const qtdComprada = Number(item.qty || item.quantidade || 1);
          const nomeVar = item.variacao || item.nomeVariacao;

          produtosParaAtualizar.push({
            prodRef,
            prodSnap,
            qtdComprada,
            nomeVar,
          });
        }

        // ==========================================
        // FASE 2: TODAS AS ESCRITAS (WRITES) DEPOIS
        // ==========================================

        transaction.set(
          contadorRef,
          { ultimoNumero: proximo },
          { merge: true },
        );

        for (const itemAtualizacao of produtosParaAtualizar) {
          const { prodRef, prodSnap, qtdComprada, nomeVar } = itemAtualizacao;
          const dadosProd = prodSnap.data();

          if (
            nomeVar &&
            nomeVar !== "Produto Único" &&
            Array.isArray(dadosProd.variacoes)
          ) {
            const novasVariacoes = dadosProd.variacoes.map((v: any) => {
              if (v.nome === nomeVar) {
                const estoqueAtual = Number(v.estoque || 0);
                const novoEstoque = Math.max(0, estoqueAtual - qtdComprada);
                return { ...v, estoque: String(novoEstoque) };
              }
              return v;
            });
            transaction.update(prodRef, { variacoes: novasVariacoes });
          } else {
            const estoqueAtual = Number(dadosProd.estoque || 0);
            const novoEstoque = Math.max(0, estoqueAtual - qtdComprada);
            transaction.update(prodRef, { estoque: String(novoEstoque) });
          }
        }

        return String(proximo).padStart(4, "0");
      },
    );

    // 🌟 Classificação rigorosa e padronizada da forma de entrega (Compatível com Site e PDV)
    const temFreteCarrinho = safeCart.some((item: any) => item.precisaFrete !== false);
    let dsFormaEntregaPadrao = 'transportadora';

    const formaEnviadaBruta = String(logistica?.dsFormaEntrega || logistica?.formaEnvio || "").toLowerCase();

    if (formaEnviadaBruta === 'retirada' || formaEnviadaBruta === 'retirar_loja') {
      dsFormaEntregaPadrao = 'retirada';
    } else if (formaEnviadaBruta === 'entrega_local') {
      dsFormaEntregaPadrao = 'entrega_local';
    } else if (formaEnviadaBruta === 'transportadora') {
      dsFormaEntregaPadrao = 'transportadora';
    } else if (formaEnviadaBruta === 'digital' || !temFreteCarrinho) {
      const temApenasDigital = safeCart.every((item: any) => item.precisaFrete === false);
      dsFormaEntregaPadrao = temApenasDigital ? 'digital' : 'transportadora';
    } else if (
      freteSel?.id === 'retirada' ||
      freteSel?.id === 'retirar_loja' ||
      String(freteSel?.name || "").toLowerCase().includes("retirada")
    ) {
      dsFormaEntregaPadrao = 'retirada';
    } else if (
      freteSel?.id === 'entrega_local' ||
      String(freteSel?.name || "").toLowerCase().includes("entrega local")
    ) {
      dsFormaEntregaPadrao = 'entrega_local';
    } else {
      dsFormaEntregaPadrao = 'transportadora';
    }

    const itensFormatados = safeCart.map((item: any, index: number) => {
      const chaveUnica = `${item.cartItemId || item.id || "prod"}_${index}`;
      const rawRespostas =
        personalizacoes[chaveUnica] || personalizacoes[item.cartItemKey] || {};

      const requisitos = item.requisitos || requisitosDoBanco?.[item.id] || [];
      const respostasFormatadas: Record<string, string> = {};

      if (Array.isArray(requisitos) && requisitos.length > 0) {
        requisitos.forEach((req: any) => {
          const campoId = String(req.id || "");
          const labelCampo = req.nome || req.label || "Campo";

          const val = rawRespostas[campoId] || rawRespostas[labelCampo] || "";
          if (val) {
            respostasFormatadas[labelCampo] = val;
          }
        });
      } else {
        Object.keys(rawRespostas).forEach((key) => {
          if (rawRespostas[key]) {
            respostasFormatadas[key] = rawRespostas[key];
          }
        });
      }

      return {
        id: item.id || "",
        idProduto: item.idProduto || item.id,
        nome: item.dsNomeProduto || item.nome || item.title || "Produto",
        qty: Number(item.qty || item.quantidade || 1),
        preco: Number(Number(item.preco || item.price || 0).toFixed(2)),
        variacao: item.variacao || "",
        precisaFrete: item.precisaFrete !== false,
        respostasFormatadas: respostasFormatadas,
        foto: item.foto || item.imagem || item.url || "",
        sku:
          item.sku ||
          (item.variacaoSelecionada ? item.variacaoSelecionada.sku : "SEM-SKU"),

        nrDiasProducao: Number(item.nrDiasProducao || item.diasProducao || 0),
        dsTipoProduto: String(
          item.dsTipoProduto || item.tipoProduto || "Fisico_Sem",
        ),

        weight: Number(item.weight || item.peso || item.variacaoSelecionada?.peso || 0.3),
        height: Number(item.height || item.altura || item.variacaoSelecionada?.altura || 4),
        width: Number(item.width || item.largura || item.variacaoSelecionada?.largura || 11),
        length: Number(
          item.length ||
            item.comprimento ||
            item.variacaoSelecionada?.comprimento ||
            16,
        ),
      };
    });

    const dadosCliente = {
      nmNomeCliente: cliente?.nmNomeCliente || cliente?.nome || "Cliente",
      dsCpfCliente: cliente?.dsCpfCliente || cliente?.cpf || "",
      dsEmailCliente: cliente?.dsEmailCliente || cliente?.email || "",
      dsTelefoneCliente:
        cliente?.dsTelefoneCliente || cliente?.dsTelefone || "",
    };

    const dadosEnderecoCliente = {
      dsCepCliente:
        endereco?.dsCepCliente ||
        endereco?.cep ||
        cliente?.dsCepCliente ||
        cliente?.cep ||
        "",
      dsRuaCliente: endereco?.dsRuaCliente || endereco?.rua || "",
      dsNumeroCliente: endereco?.dsNumeroCliente || endereco?.numero || "",
      dsBairroCliente: endereco?.dsBairroCliente || endereco?.bairro || "",
      dsCidadeCliente:
        endereco?.dsCidadeCliente || endereco?.cidade || endereco?.city || "",
      dsUfCliente: endereco?.dsUfCliente || endereco?.uf || "",
      dsComplementoCliente:
        endereco?.dsComplementoCliente || endereco?.complemento || "",
    };

    const novoPedidoRef = doc(collection(db, "lojistas", lojistaId, "pedidos"));
    const pedidoIdGerado = novoPedidoRef.id;

    const origemIdentificada = (lojistaSlug === "pdv-balcao" || logistica?.origem === "Pdv") ? "Pdv" : "Site";

    const dadosDoPedidoParaSalvar = {
      Idpedido: pedidoIdGerado,
      origemPedido: origemIdentificada,
      cliente: dadosCliente,
      endereco: dadosEnderecoCliente,
      numeroPedido: Number(numPedidoSequencial),
      data: new Date().toISOString(),
      timestamp: serverTimestamp(),
      
      financeiro: {
        vlSubtotal: subtotalFinal,
        vlDesconto: descontoFinal,
        vlFrete: freteFinal,
        vlTotal: totalGeralFinal,
        dsCupom: cupomDigitado || null,
        dsFormaPagamentoCarrinho: dsFormaPagamentoCarrinho,
      },

      logistica: {
        isRetirada: dsFormaEntregaPadrao === "retirada",
        dsFormaEntrega: dsFormaEntregaPadrao,
        isFreteGratis: freteGratisConfig?.atingido || false,
        dsServico: logistica?.servico || logistica?.dsServico || "N/A",
        vlFrete: freteFinal,
        vlPrazo: Number(logistica?.prazoEntrega || logistica?.prazo || logistica?.vlPrazo || 0),
        dsFormaPagamentoEtiqueta:
          logistica?.formaPagamentoEtiqueta || "saldo_melhor_envio",
        dsTransportadoraId:
          dsFormaEntregaPadrao === 'transportadora' 
            ? (logistica?.transportadoraId || logistica?.dsTransportadoraId || null)
            : (dsFormaEntregaPadrao === 'entrega_local' ? 'entrega_local' : null),
      },

      itens: itensFormatados,

      Cotacao: {
        dsServicoCotado: null,
        vlFreteCotado: 0,
        dsFormaPagamentoEtiquetaCotado: null,
        dsTransportadoraIdCotado: null,
        prazoEntregaCotado: 0,
      },

      Etiqueta: {
        pedido: pedidoIdGerado,
        IdEtiqueta: null,
        codigoEnvio: null,
        dsNumRastreio: null,
        urlEtiqueta: null,
        statusEtiqueta: "pendente",
        servicoVinculado: String(logistica?.transportadoraId || ""),
        valorCobrado: 0,
        dataGeracaoEtiqueta: null,
        isEtiquetaGerada: false,
      },
      StatusProducao: {
        dsStatusProducao: "PEDIDOS",
        isPago: false,
        historico: [
          {
            fase: "PEDIDOS",
            dataModificacao: new Date().toISOString(),
          },
        ],
      },
    };

    await setDoc(novoPedidoRef, dadosDoPedidoParaSalvar);

    const msgLojista = `*NOVO PEDIDO #${numPedidoSequencial}*
👤 *CLIENTE:* ${dadosCliente.nmNomeCliente}
📱 *WHATSAPP:* ${dadosCliente.dsTelefoneCliente}
${dadosCliente.dsEmailCliente ? `✉️ *E-MAIL:* ${dadosCliente.dsEmailCliente}\n` : ""}📦 *ITENS:*
${safeCart.map((i: any) => `• ${i.qty || 1}x ${i.dsNomeProduto || i.nome || i.title || "Produto"}`).join("\n")}

💰 *TOTAL:* R$ ${totalGeralFinal.toFixed(2).replace(".", ",")}
Acesse seu painel para processar este pedido!`;

    const urlLojista = `https://wa.me/${String(whatsappNumero || "").replace(/\D/g, "")}?text=${encodeURIComponent(msgLojista)}`;
    window.open(urlLojista, "_blank");

    let telefoneClienteLimpo = dadosCliente.dsTelefoneCliente.replace(
      /\D/g,
      "",
    );
    if (
      !telefoneClienteLimpo.startsWith("55") &&
      telefoneClienteLimpo.length >= 10
    ) {
      telefoneClienteLimpo = "55" + telefoneClienteLimpo;
    }

    if (telefoneClienteLimpo.length >= 12) {
      const nomeLojaExibicao =
        dadosLoja?.dadosLoja?.dsNomeLoja || dadosLoja?.nomeLoja || "Nossa Loja";

      let msgCliente = `*Olá, ${dadosCliente.nmNomeCliente}!* Seu pedido *#${numPedidoSequencial}* foi realizado com sucesso em *${nomeLojaExibicao}*! 🎉

📦 *RESUMO DO PEDIDO:*
${safeCart.map((i: any) => `• ${i.qty || 1}x ${i.dsNomeProduto || i.nome || i.title || "Produto"} - R$ ${(Number(i.preco || i.price || 0) * Number(i.qty || 1)).toFixed(2).replace(".", ",")}`).join("\n")}

💰 *TOTAL DO PEDIDO:* R$ ${totalGeralFinal.toFixed(2).replace(".", ",")}`;

      if (payloadPixBruto) {
        msgCliente += `

💳 *PAGAMENTO VIA PIX:*
Caso ainda não tenha realizado o pagamento pela loja, copie e cole o código abaixo no aplicativo do seu banco:
\`${payloadPixBruto}\``;
      }

      msgCliente += `

⚠️ *LEMBRETE:* Lembre-se de enviar o comprovante do pagamento via Pix por aqui para agilizar a liberação e produção do seu pedido. Muito obrigado pela preferência! 🙏`;

      const urlCliente = `https://wa.me/${telefoneClienteLimpo}?text=${encodeURIComponent(msgCliente)}`;
      setTimeout(() => {
        window.open(urlCliente, "_blank");
      }, 500);
    }

    return true;
  } catch (e) {
    console.error("Erro ao salvar pedido:", e);
    return false;
  }
};