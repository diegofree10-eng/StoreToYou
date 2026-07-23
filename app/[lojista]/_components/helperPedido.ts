import { db } from "@/lib/firebase";
import { doc, runTransaction, collection, addDoc, serverTimestamp } from "firebase/firestore";

export const executarFluxoPedido = async ({
  lojistaId, cliente, endereco, safeCart, personalizacoes, requisitosDoBanco,
  valorSubtotalProdutos, valorDesconto, totalGeral, whatsappNumero,
  dadosLoja, logistica, cupomDigitado, freteGratisConfig
}: any) => {
  
  try {
    // 1. Geração do número sequencial
    const contadorRef = doc(db, "lojistas", lojistaId, "config", "contador_pedidos");
    const numPedidoSequencial = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(contadorRef);
      let proximo = 1;
      if (docSnap.exists()) proximo = (docSnap.data().ultimoNumero || 0) + 1;
      transaction.set(contadorRef, { ultimoNumero: proximo }, { merge: true });
      return String(proximo).padStart(4, '0');
    });

    // 2. Montagem dos itens formatados com as respostas dos requisitos padronizadas
    const itensFormatados = safeCart.map((item: any, index: number) => {
      const chaveUnica = `${item.cartItemId || item.id || 'prod'}_${index}`;
      const rawRespostas = personalizacoes[chaveUnica] || personalizacoes[item.cartItemKey] || {};
      
      // Pega os requisitos cadastrados no produto
      const requisitos = item.requisitos || requisitosDoBanco?.[item.id] || [];
      const respostasFormatadas: Record<string, string> = {};

      if (Array.isArray(requisitos) && requisitos.length > 0) {
        requisitos.forEach((req: any) => {
          const campoId = String(req.id || "");
          const labelCampo = req.nome || req.label || "Campo";
          
          // Busca o valor digitado pelo ID ou pelo label do requisito
          const val = rawRespostas[campoId] || rawRespostas[labelCampo] || "";
          if (val) {
            respostasFormatadas[labelCampo] = val;
          }
        });
      } else {
        // Fallback caso não encontre a lista de requisitos estruturada
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
        qty: Number(item.qty || 1),
        preco: Number(item.preco || item.price || 0),
        variacao: item.variacao || "",
        precisaFrete: item.precisaFrete !== false,
        respostasFormatadas: respostasFormatadas, // 👈 Requisitos salvos com rótulos e valores corretos
        foto: item.foto || item.imagem || item.url || "",
        sku: item.sku || (item.variacaoSelecionada ? item.variacaoSelecionada.sku : "SEM-SKU")
      };
    });

    // 3. Estrutura padronizada de Dados do Cliente e Endereço com sufixo Cliente
    const dadosCliente = {
      nmNomeCliente: cliente?.nmNomeCliente || cliente?.nome || "Cliente", 
      dsCpfCliente: cliente?.dsCpfCliente || cliente?.cpf || "",
      dsEmailCliente: cliente?.dsEmailCliente || cliente?.email || "",
      dsTelefoneCliente: cliente?.dsTelefoneCliente || cliente?.dsTelefone || ""
    };

    const dadosEnderecoCliente = {
      dsCepCliente: endereco?.dsCepCliente || endereco?.cep || cliente?.dsCepCliente || cliente?.cep || "",
      dsRuaCliente: endereco?.dsRuaCliente || endereco?.rua || "",
      dsNumeroCliente: endereco?.dsNumeroCliente || endereco?.numero || "",
      dsBairroCliente: endereco?.dsBairroCliente || endereco?.bairro || "",
      dsCidadeCliente: endereco?.dsCidadeCliente || endereco?.cidade || endereco?.city || "",
      dsUfCliente: endereco?.dsUfCliente || endereco?.uf || "",
      dsComplementoCliente: endereco?.dsComplementoCliente || endereco?.complemento || ""
    };

    // 4. Objeto estruturado para salvar no Firebase
    const dadosDoPedidoParaSalvar = {
      nrPedido: Number(numPedidoSequencial),
      dsStatus: "pendente",
      isPago: false,
      tsCriacao: serverTimestamp(),
      dtCriacao: new Date().toISOString(),
      mesAno: new Date().toISOString().substring(0, 7),

      // Cliente & Endereço Padronizados
      cliente: dadosCliente,
      dadosCliente: dadosCliente,
      endereco: dadosEnderecoCliente,
      dadosEndereco: dadosEnderecoCliente,

      // Financeiro
      financeiro: { 
        vlSubtotal: Number(valorSubtotalProdutos || 0), 
        vlDesconto: Number(valorDesconto || 0), 
        vlFrete: Number(logistica?.valorFrete || 0),
        vlTotal: Number(totalGeral || 0),
        dsCupom: cupomDigitado || null, 
        isFreteGratis: freteGratisConfig?.atingido || false, 
        dsMetodoPagamento: logistica?.servico || logistica?.formaEnvio || "pix",
        dsTransportadoraId: logistica?.transportadoraId || null
      },

      // Logística
      logistica: {
        isRetirada: logistica?.formaEnvio === 'retirada',
        dsFormaEntrega: logistica?.formaEnvio || "desconhecida"
      },

      itens: itensFormatados,

      // --- CAMPOS LEGADOS (MANTIDOS PARA COMPATIBILIDADE) ---
      numeroPedido: Number(numPedidoSequencial),
      status: "Pendente",
      pago: false,
      data: new Date().toISOString(),
      timestamp: serverTimestamp(),
      retirada: logistica?.formaEnvio === 'retirada',
      retirarNaLoja: logistica?.formaEnvio === 'retirada',
      formaEntrega: logistica?.formaEnvio
    };

    // Salvando na coleção de pedidos
    await addDoc(collection(db, "lojistas", lojistaId, "pedidos"), dadosDoPedidoParaSalvar);

    // 5. Mensagem WhatsApp
    const msg = `*NOVO PEDIDO #${numPedidoSequencial}*
👤 *CLIENTE:* ${dadosCliente.nmNomeCliente}
📱 *WHATSAPP:* ${dadosCliente.dsTelefoneCliente}
${dadosCliente.dsEmailCliente ? `✉️ *E-MAIL:* ${dadosCliente.dsEmailCliente}\n` : ""}📦 *ITENS:*
${safeCart.map((i: any) => `• ${i.qty || 1}x ${i.dsNomeProduto || i.nome || i.title || "Produto"}`).join('\n')}

💰 *TOTAL:* R$ ${Number(totalGeral || 0).toFixed(2).replace('.', ',')}
Acesse seu painel para processar este pedido!`;

    const url = `https://wa.me/${String(whatsappNumero || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    return true;
  } catch (e) {
    console.error("Erro ao salvar pedido:", e);
    return false;
  }
};