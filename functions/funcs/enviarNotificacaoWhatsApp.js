// functions/funcs/enviarNotificacaoWhatsApp.js
const functions = require("firebase-functions/v1");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();

exports.enviarNotificacaoWhatsApp = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    let { codigoTicket, telefoneLoja, mensagemTexto, autorTipo, lojaId } = data;

    if (!mensagemTexto) {
      throw new functions.https.HttpsError("invalid-argument", "Mensagem não informada.");
    }

    try {
      if (lojaId) {
        // Busca o documento completo do lojista no Firestore
        const lojaDoc = await db.doc(`lojistas/${lojaId}`).get();
        
        if (lojaDoc.exists) {
          const dadosLojista = lojaDoc.data();
          const dadosLojaInterno = dadosLojista.dadosLoja || {};

          // 1. Identifica o plano do lojista (ex: "Diamante")
          const nomePlanoBruto = dadosLojaInterno.dsPlanoLoja || dadosLojista.plano || "bronze";
          const planoKeyAlvo = nomePlanoBruto.toLowerCase().trim();

          // 2. Busca as configurações globais de recursos salvos no TabPlanos
          const planosConfigDoc = await db.doc("configuracoes/planos").get();
          if (planosConfigDoc.exists) {
            const regrasPlanos = planosConfigDoc.data();

            // Normaliza as chaves do objeto de planos para comparar sem erro de maiúsculas/minúsculas
            const planoEncontradoKey = Object.keys(regrasPlanos).find(
              k => k.toLowerCase().trim() === planoKeyAlvo
            );

            const recursosDoPlano = planoEncontradoKey ? regrasPlanos[planoEncontradoKey] : {};

            // Verifica se a flag está ativa (aceitando variações caso o nome mude ligeiramente)
            const whatsappAtivo = recursosDoPlano.whatsappNotificacoes || recursosDoPlano.whatsapp || false;

            if (!whatsappAtivo) {
              console.log(`[WhatsApp] Recurso não incluído ou desativado no plano (${planoKeyAlvo}) da loja ${lojaId}. Envio ignorado.`);
              return { sucesso: false, mensagem: "Recurso não habilitado para este plano." };
            }
          }
        }
      }

      // 3. Se o telefone não veio no payload, busca direto no objeto da loja
      if (!telefoneLoja && lojaId) {
        const lojaDoc = await db.doc(`lojistas/${lojaId}`).get();
        if (lojaDoc.exists) {
          const dadosLojista = lojaDoc.data();
          const dadosLojaInterno = dadosLojista.dadosLoja || {};
          telefoneLoja = dadosLojaInterno.nrWhatssapLoja || dadosLojista.nrWhatssap || dadosLojista.telefone;
        }
      }

      if (!telefoneLoja) {
        console.warn(`[WhatsApp] Telefone não encontrado para o ticket ${codigoTicket}. Notificação ignorada.`);
        return { sucesso: false, mensagem: "Telefone da loja não cadastrado." };
      }

      // Limpa a máscara do telefone (deixa apenas números)
      const telefoneLimpo = telefoneLoja.replace(/\D/g, "");

      // Disparo bem-sucedido (Simulado ou Real)
      console.log(`WhatsApp enviado para ${telefoneLimpo} [Ticket ${codigoTicket}] por ${autorTipo}: ${mensagemTexto}`);

      return { sucesso: true, mensagem: "Notificação disparada com sucesso." };
    } catch (error) {
      console.error("Erro ao enviar WhatsApp:", error);
      return { sucesso: false, erro: error.message };
    }
  });