import { db } from "@/lib/firebase";
import { doc, runTransaction, collection, addDoc, serverTimestamp } from "firebase/firestore";

export const executarFluxoPedido = async ({
  lojistaId, cliente, endereco, safeCart, personalizacoes,
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

    // 2. Montagem dos itens formatados
    const itensFormatados = safeCart.map((item: any, index: number) => {
      const key = item.cartItemKey || `item_${index}`;
      const rawRespostas = personalizacoes[key] || {};
      const requisitos = item.requisitos;
      
      const respostasFormatadas: Record<string, string> = {};

      if (Array.isArray(requisitos)) {
        requisitos.forEach((req: any) => {
          const val = rawRespostas[req.id] || rawRespostas[req.label] || "";
          if (val) respostasFormatadas[req.label || req.id] = val;
        });
      }

      return {
        id: item.id || "",
        idProduto: item.idProduto || item.id,
        nome: item.nome || item.title || "Produto",
        qty: Number(item.qty || 1),
        preco: Number(item.preco || item.price || 0),
        variacao: item.variacao || "",
        precisaFrete: item.precisaFrete !== false,
        respostasFormatadas: respostasFormatadas,
        foto: item.foto || item.imagem || item.url || "",
        sku: item.sku || (item.variacaoSelecionada ? item.variacaoSelecionada.sku : "SEM-SKU")
      };
    });

    // 3. Objeto estruturado com novo padrão (prefixos e organização)
    const dadosDoPedidoParaSalvar = {
      // Identificação
      nrPedido: Number(numPedidoSequencial),
      dsStatus: "pendente",
      isPago: false,
      tsCriacao: serverTimestamp(),
      dtCriacao: new Date().toISOString(),
      mesAno: new Date().toISOString().substring(0, 7),

      // Cliente
      cliente: { 
        nmNome: cliente?.nome || "Cliente", 
        dsCpf: cliente?.cpf || "",
        dsEmail: cliente?.email || "",
        dsTelefone: cliente?.dsTelefone || ""
      },

      // Endereço
      endereco: {
        dsCep: endereco?.cep || cliente?.cep || "",
        dsRua: endereco?.rua || "",
        dsNumero: endereco?.numero || "",
        dsBairro: endereco?.bairro || "",
        dsCidade: endereco?.cidade || endereco?.city || "",
        dsUf: endereco?.uf || "",
        dsComplemento: endereco?.complemento || ""
      },

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

    // 4. Mensagem WhatsApp
    const msg = `*NOVO PEDIDO #${numPedidoSequencial}*
👤 *CLIENTE:* ${cliente?.nome || "Cliente"}
📱 *WHATSAPP:* ${cliente?.dsTelefone || ""}
📦 *ITENS:*
${safeCart.map((i: any) => `• ${i.qty || 1}x ${i.nome || i.title || "Produto"}`).join('\n')}

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