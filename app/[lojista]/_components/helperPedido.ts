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
}: any) => {
  try {
    // 1. Geração do número sequencial
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
        const docSnap = await transaction.get(contadorRef);
        let proximo = 1;
        if (docSnap.exists()) proximo = (docSnap.data().ultimoNumero || 0) + 1;
        transaction.set(
          contadorRef,
          { ultimoNumero: proximo },
          { merge: true },
        );
        return String(proximo).padStart(4, "0");
      },
    );

    // 2. Montagem dos itens formatados com as respostas dos requisitos padronizadas
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
        preco: Number(item.preco || item.price || 0),
        variacao: item.variacao || "",
        precisaFrete: item.precisaFrete !== false,
        respostasFormatadas: respostasFormatadas,
        foto: item.foto || item.imagem || item.url || "",
        sku:
          item.sku ||
          (item.variacaoSelecionada ? item.variacaoSelecionada.sku : "SEM-SKU"),

        // 📦 Pesos e Medidas Padronizados com Fallback
        weight: Number(
          item.weight || item.peso || item.variacaoSelecionada?.peso || 0.3,
        ),
        height: Number(
          item.height || item.altura || item.variacaoSelecionada?.altura || 4,
        ),
        width: Number(
          item.width || item.largura || item.variacaoSelecionada?.largura || 11,
        ),
        length: Number(
          item.length ||
            item.comprimento ||
            item.variacaoSelecionada?.comprimento ||
            16,
        ),
      };
    });

    // 3. Estrutura padronizada de Dados do Cliente e Endereço
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

    // 🔑 PRIMEIRO: Criamos a referência e extraímos o ID antes de usá-lo no objeto
    const novoPedidoRef = doc(collection(db, "lojistas", lojistaId, "pedidos"));
    const pedidoIdGerado = novoPedidoRef.id;

    // 4. Objeto estruturado contendo todos os campos solicitados
    const dadosDoPedidoParaSalvar = {
      pedido: pedidoIdGerado,

      cliente: dadosCliente,
      endereco: dadosEnderecoCliente,

      numeroPedido: Number(numPedidoSequencial),
      status: "Pendente",
      pago: false,
      data: new Date().toISOString(),
      timestamp: serverTimestamp(),

      financeiro: {
        vlSubtotal: Number(valorSubtotalProdutos || 0),
        vlDesconto: Number(valorDesconto || 0),
        vlFrete: Number(logistica?.valorFrete || 0),
        vlTotal: Number(totalGeral || 0),
        dsCupom: cupomDigitado || null,
      },

      logistica: {
        isRetirada: logistica?.formaEnvio === "retirada",
        dsFormaEntrega: logistica?.formaEnvio || "desconhecida",
        isFreteGratis: freteGratisConfig?.atingido || false,
        dsMetodoPagamento: logistica?.servico || logistica?.formaEnvio || "pix",
        dsTransportadoraId: logistica?.transportadoraId || null,
      },

      itens: itensFormatados,

      Cotacao: {
        vlFreteCotado: Number(
          logistica?.valorFrete || logistica?.vlFreteCotado || 0,
        ),
        dsMetodoPagamentoCotado:
          logistica?.servico || logistica?.formaEnvio || "pix",
        dsTransportadoraIdCotado:
          logistica?.transportadoraId || logistica?.dsTransportadoraId || null,
        prazoEntregaCotado: Number(
          logistica?.prazoEntrega || logistica?.prazo || 0,
        ),
      },

      // 🏷️ Estrutura da Etiqueta com todos os campos obrigatórios criados
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
      },
    };

    // Salvando na coleção de pedidos com setDoc
    await setDoc(novoPedidoRef, dadosDoPedidoParaSalvar);

    // 5. Mensagem para o Lojista
    const msgLojista = `*NOVO PEDIDO #${numPedidoSequencial}*
👤 *CLIENTE:* ${dadosCliente.nmNomeCliente}
📱 *WHATSAPP:* ${dadosCliente.dsTelefoneCliente}
${dadosCliente.dsEmailCliente ? `✉️ *E-MAIL:* ${dadosCliente.dsEmailCliente}\n` : ""}📦 *ITENS:*
${safeCart.map((i: any) => `• ${i.qty || 1}x ${i.dsNomeProduto || i.nome || i.title || "Produto"}`).join("\n")}

💰 *TOTAL:* R$ ${Number(totalGeral || 0)
      .toFixed(2)
      .replace(".", ",")}
Acesse seu painel para processar este pedido!`;

    const urlLojista = `https://wa.me/${String(whatsappNumero || "").replace(/\D/g, "")}?text=${encodeURIComponent(msgLojista)}`;
    window.open(urlLojista, "_blank");

    // 6. Mensagem para o Cliente
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

💰 *TOTAL DO PEDIDO:* R$ ${Number(totalGeral || 0)
        .toFixed(2)
        .replace(".", ",")}`;

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