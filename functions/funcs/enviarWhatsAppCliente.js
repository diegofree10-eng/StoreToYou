// functions/funcs/enviarWhatsAppCliente.js
const functions = require("firebase-functions/v1");
const { getFirestore } = require("firebase-admin/firestore");
const axios = require("axios");

const db = getFirestore();

exports.enviarWhatsAppCliente = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojaId}/pedidos/{pedidoId}")
  .onUpdate(async (change, context) => {
    const antes = change.before.data();
    const depois = change.after.data();
    const lojaId = context.params.lojaId;

    const cliente = depois.dsCliente || {};
    const telefoneCliente = cliente.dsTelefoneCliente;
    const nomeCliente = cliente.nmNomeCliente || "Cliente";
    const numeroPedido = depois.logistica?.nrNumeroPedido || "N/A";
    
    // Flags e dados de logística
    const isRetirada = depois.logistica?.isRetirada || false;
    const isEntregaLocal = depois.logistica?.isEntregaLocal || false;

    if (!telefoneCliente) return null;

    try {
      // 1. Busca os dados da loja (incluindo plano, configurações visuais/whatsapp e o endereço da loja)
      const lojaDoc = await db.doc(`lojistas/${lojaId}`).get();
      if (!lojaDoc.exists) return null;

      const dadosLojista = lojaDoc.data();
      const dadosLojaInterno = dadosLojista.dadosLoja || {};
      const nomePlanoBruto = dadosLojaInterno.dsPlanoLoja || dadosLojista.plano || "bronze";
      const planoKeyAlvo = nomePlanoBruto.toLowerCase().trim();

      const planosConfigDoc = await db.doc("configuracoes/planos").get();
      if (!planosConfigDoc.exists) return null;

      const regrasPlanos = planosConfigDoc.data();
      const planoEncontradoKey = Object.keys(regrasPlanos).find(
        k => k.toLowerCase().trim() === planoKeyAlvo
      );
      const recursosDoPlano = planoEncontradoKey ? regrasPlanos[planoEncontradoKey] : {};
      
      // Valida se o plano possui automação de WhatsApp ativa
      const whatsappAtivo = recursosDoPlano.whatsappNotificacoes || recursosDoPlano.whatsapp || false;
      if (!whatsappAtivo) {
        return null;
      }

      const Z_API_URL = process.env.WHATSAPP_URL || "https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text";
      const Z_API_TOKEN = process.env.WHATSAPP_TOKEN || "SEU_TOKEN_HEADER";
      const telefoneLimpo = telefoneCliente.replace(/\D/g, "");

      // Pega os templates configurados pelo lojista dentro de aparencia
      const configWpp = dadosLojista.aparencia?.configuracoesWhatsapp || {};
      let templateMensagem = "";

      const statusProdAntes = antes.StatusProducao?.dsStatusProducao;
      const statusProdDepois = depois.StatusProducao?.dsStatusProducao;
      const concluidoAntes = antes.isStatusPedidoConcluido;
      const concluidoDepois = depois.isStatusPedidoConcluido;

      // -------------------------------------------------------------
      // ETAPA 1: Entrou em Produção
      // -------------------------------------------------------------
      if (statusProdAntes !== "Produção" && statusProdDepois === "Produção") {
        const padrao = "Olá *{nome}*! 🎨 Boas notícias! O seu pedido *#{pedido}* acabou de entrar em *Produção*. Em breve teremos novidades!";
        templateMensagem = configWpp.msgProducao || padrao;
      }

      // -------------------------------------------------------------
      // ETAPA 2: Enviado via Transportadora / Correios (Com Rastreio)
      // -------------------------------------------------------------
      if (!isRetirada && !isEntregaLocal && statusProdAntes !== "enviado" && statusProdDepois === "enviado") {
        const padrao = "🚚 Oba, *{nome}*! O seu pedido *#{pedido}* foi enviado com sucesso!\nCódigo de rastreio: *{rastreio}*.\nAcompanhe a entrega!";
        templateMensagem = configWpp.msgEnviado || padrao;
      }

      // -------------------------------------------------------------
      // ETAPA 3: Saiu para Entrega Local (Motoboy)
      // -------------------------------------------------------------
      if (isEntregaLocal && statusProdAntes !== "enviado" && statusProdDepois === "enviado") {
        const padrao = "🛵 Olá *{nome}*! O motoboy acabou de sair para entregar o seu pedido *#{pedido}*. Fique atento para receber!";
        templateMensagem = configWpp.msgEntregaLocal || padrao;
      }

      // -------------------------------------------------------------
      // ETAPA 4: Pronto para Retirada na Loja (Com Endereço da Loja)
      // -------------------------------------------------------------
      if (isRetirada && statusProdAntes !== "pronto_retirada" && (statusProdDepois === "pronto_retirada" || statusProdDepois === "retirada")) {
        const padrao = "📦 Olá *{nome}*! O seu pedido *#{pedido}* está *pronto para retirada* em nossa loja!\nEndereço: *{endereco_loja}*.\nVenha nos visitar!";
        templateMensagem = configWpp.msgRetirada || padrao;
      }

      // -------------------------------------------------------------
      // ETAPA 5: Pedido Concluído / Finalizado
      // -------------------------------------------------------------
      if (!concluidoAntes && concluidoDepois === true) {
        const padrao = "✨ Olá *{nome}*! O seu pedido *#{pedido}* foi finalizado com sucesso. Agradecemos muito pela preferência! ❤️";
        templateMensagem = configWpp.msgConcluido || padrao;
      }

      // Se encontrou uma mensagem para disparar, faz a substituição das variáveis
      if (templateMensagem) {
        const codigoRastreio = depois.Etiqueta?.dsNumRastreio || "Disponível em breve";
        
        // Formata o endereço completo da loja cadastrado no ERP
        const ruaLoja = dadosLojaInterno.dsRuaLoja || "";
        const numLoja = dadosLojaInterno.nrNumeroLoja || "";
        const bairroLoja = dadosLojaInterno.dsBairroLoja || "";
        const cidadeLoja = dadosLojaInterno.dsCidadeLoja || "";
        const ufLoja = dadosLojaInterno.dsUfLoja || "";
        
        const enderecoCompletoLoja = ruaLoja 
          ? `${ruaLoja}, ${numLoja} - ${bairroLoja}, ${cidadeLoja}/${ufLoja}`
          : "Endereço da loja indisponível";

        const mensagemFinal = templateMensagem
          .replace(/{nome}/g, nomeCliente)
          .replace(/{pedido}/g, numeroPedido)
          .replace(/{rastreio}/g, codigoRastreio)
          .replace(/{endereco_loja}/g, enderecoCompletoLoja);

        await axios.post(Z_API_URL, {
          phone: telefoneLimpo,
          message: mensagemFinal
        }, {
          headers: { "Client-Token": Z_API_TOKEN }
        });

        console.log(`[WhatsApp Cliente] Mensagem enviada para ${telefoneLimpo} (Pedido #${numeroPedido})`);
      }

      return null;
    } catch (error) {
      console.error("[WhatsApp Cliente] Erro:", error.response?.data || error.message);
      return null;
    }
  });

  // funcao exclusiva para disparar mensagens para whatssap do cliente em 3 estagios do pedido
  // apenas quando ele esta em um plano que assina Notificações via WhatsApp
 
  // Etapa 1: Quando o pedido entra em Produção
  // Gatilho: StatusProducao.dsStatusProducao muda para "Produção".

  // Mensagem enviada:

  // Olá DIEGO DE MAGALHAES! 🎨 Boas notícias! O seu pedido #564 acabou de entrar em Produção. Em breve teremos novidades sobre o seu produto!

  // Etapa 2: Quando o pedido é Enviado / Postado
  // Gatilho: StatusProducao.dsStatusProducao:  muda para "enviado"  (puxando o código de rastreio da etiqueta).

  // Mensagem enviada:

  // 🚚 Oba, DIEGO DE MAGALHAES! O seu pedido #564 foi enviado com sucesso!
  // Código de rastreio: jtyujytu5u.
  // Acompanhe a entrega e prepare-se para receber seu pacote!

  // Etapa 3: Quando o pedido é Concluído / Finalizado
  // Gatilho: isStatusPedidoConcluido muda para true.

  // Mensagem enviada:

  // ✨ Olá DIEGO DE MAGALHAES! O seu pedido #564 foi finalizado com sucesso. Agradecemos muito pela preferência e esperamos te ver em breve novamente! ❤️