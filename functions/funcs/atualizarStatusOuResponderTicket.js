const functions = require("firebase-functions/v1");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

exports.atualizarStatusOuResponderTicket = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    const { codigoTicket, chaveMes, novaResposta, novoStatus, origemEnvio, anexoUrl } = data;

    if (!codigoTicket || !chaveMes) {
      throw new functions.https.HttpsError("invalid-argument", "Dados insuficientes.");
    }

    try {
      const uidLogado = context.auth.uid;
      
      // 🌟 Define com precisão absoluta se o autor é Master ou Lojista com base na origem vinda do front-end
      let tipoAutorFinal = origemEnvio === "Master" ? "Master" : "Lojista";

      // Fallback de segurança caso a origem não venha preenchida
      if (!origemEnvio) {
        const userDocCheck = await db.doc(`usuarios/${uidLogado}`).get();
        if (userDocCheck.exists && userDocCheck.data().role === "master") {
          tipoAutorFinal = "Master";
        }
      }

      const docMesRef = db.doc(`master_dashboard/tickets_suporte/meses/${chaveMes}`);
      const anoStr = chaveMes.split("_")[1];
      const docAnoRef = db.doc(`master_dashboard/tickets_suporte/anos/${anoStr}`);

      await db.runTransaction(async (t) => {
        // ==========================================
        // 1. TODAS AS LEITURAS PRIMEIRO (Obrigatório)
        // ==========================================
        const docMesSnap = await t.get(docMesRef);
        const docAnoSnap = await t.get(docAnoRef);

        if (!docMesSnap.exists) {
          throw new functions.https.HttpsError("not-found", "Mês não encontrado.");
        }

        // ==========================================
        // 2. PROCESSAMENTO E LÓGICA DE DADOS
        // ==========================================
        const dadosMes = docMesSnap.data();
        let ticketsMes = dadosMes.tickets || [];
        let dataFechamentoIso = new Date().toISOString();
        let tempoCalculadoMinutos = null;

        // Atualiza no array do mês
        ticketsMes = ticketsMes.map(tkt => {
          if (tkt.dsCodigoTicket === codigoTicket) {
            let historico = tkt.historicoMensagens || [];
            
            // 🌟 Adiciona a mensagem e/ou o anexo de imagem no histórico
            if ((novaResposta && novaResposta.trim()) || anexoUrl) {
              historico.push({
                autorId: uidLogado,
                autorTipo: tipoAutorFinal, 
                mensagem: novaResposta ? novaResposta.trim() : "",
                anexoUrl: anexoUrl || null, // 👈 Salva a URL da evidência otimizada
                data: dataFechamentoIso
              });
            }

            const statusAnterior = tkt.dsStatus;
            const statusFinal = novoStatus ? novoStatus : statusAnterior;

            if ((statusFinal === "resolvido" || statusFinal === "fechado") && statusAnterior === "aberto") {
              const inicio = new Date(tkt.tsCriacao).getTime();
              const fim = new Date(dataFechamentoIso).getTime();
              tempoCalculadoMinutos = Math.max(1, Math.round((fim - inicio) / (1000 * 60)));
            }

            return {
              ...tkt,
              dsStatus: statusFinal,
              historicoMensagens: historico,
              tempoResolucaoMinutos: tempoCalculadoMinutos !== null ? tempoCalculadoMinutos : (tkt.tempoResolucaoMinutos || null),
              tsFechamento: (statusFinal === "resolvido" || statusFinal === "fechado") ? dataFechamentoIso : (tkt.tsFechamento || null),
              ultimaAtualizacao: dataFechamentoIso
            };
          }
          return tkt;
        });

        // Recalcula métricas do mês
        let totalGlobalMes = ticketsMes.length;
        let totalAbertosMes = 0;
        let totalFechadosMes = 0;
        let porTipoMes = {};

        ticketsMes.forEach(tkt => {
          if (tkt.dsStatus === "resolvido" || tkt.dsStatus === "fechado") totalFechadosMes++;
          else totalAbertosMes++;
          const tipo = tkt.dsTipoOcorrencia || "geral";
          porTipoMes[tipo] = (porTipoMes[tipo] || 0) + 1;
        });

        // Processa o ano
        let ticketsAno = docAnoSnap.exists ? (docAnoSnap.data().ticketsResumidos || []) : [];
        ticketsAno = ticketsAno.map(tkt => {
          if (tkt.dsCodigoTicket === codigoTicket) {
            const statusFinal = novoStatus ? novoStatus : tkt.dsStatus;
            return {
              ...tkt,
              dsStatus: statusFinal,
              tsFechamento: (statusFinal === "resolvido" || statusFinal === "fechado") ? dataFechamentoIso : tkt.tsFechamento,
              tempoResolucaoMinutos: tempoCalculadoMinutos !== null ? tempoCalculadoMinutos : tkt.tempoResolucaoMinutos
            };
          }
          return tkt;
        });

        let totalGlobalAno = ticketsAno.length;
        let totalAbertosAno = 0;
        let totalFechadosAno = 0;
        let porTipoAno = {};
        let tempoTotalMinutos = 0;
        let qtdResolvidosComTempo = 0;

        ticketsAno.forEach(tkt => {
          if (tkt.dsStatus === "resolvido" || tkt.dsStatus === "fechado") {
            totalFechadosAno++;
            if (tkt.tempoResolucaoMinutos) {
              tempoTotalMinutos += tkt.tempoResolucaoMinutos;
              qtdResolvidosComTempo++;
            }
          } else {
            totalAbertosAno++;
          }
          const tipo = tkt.dsTipoOcorrencia || "geral";
          porTipoAno[tipo] = (porTipoAno[tipo] || 0) + 1;
        });

        const tempoMedioResolucaoMinutos = qtdResolvidosComTempo > 0 ? Math.round(tempoTotalMinutos / qtdResolvidosComTempo) : 0;

        // ==========================================
        // 3. TODAS AS ESCRITAS POR ÚLTIMO (Obrigatório)
        // ==========================================
        t.set(docMesRef, {
          tickets: ticketsMes,
          metricas: {
            totalGlobal: totalGlobalMes,
            totalAbertos: totalAbertosMes,
            totalFechados: totalFechadosMes,
            porTipoOcorrencia: porTipoMes,
            ultimaAtualizacao: FieldValue.serverTimestamp()
          },
          ultimaAtualizacao: FieldValue.serverTimestamp()
        }, { merge: true });

        t.set(docAnoRef, {
          ticketsResumidos: ticketsAno,
          metricasAnuais: {
            totalGlobal: totalGlobalAno,
            totalAbertos: totalAbertosAno,
            totalFechados: totalFechadosAno,
            porTipoOcorrencia: porTipoAno,
            tempoMedioResolucaoMinutos,
            ultimaAtualizacao: FieldValue.serverTimestamp()
          },
          ultimaAtualizacao: FieldValue.serverTimestamp()
        }, { merge: true });
      });

      return { sucesso: true, mensagem: "Ticket atualizado com sucesso." };
    } catch (error) {
      console.error("Erro ao atualizar ticket:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });