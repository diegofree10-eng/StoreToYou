const functions = require("firebase-functions/v1");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

const mesesNomes = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

// --- 1. FUNÇÃO DE CRIAR TICKET (Com métricas mensais e anuais) ---
exports.criarTicketSuporte = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "O usuário precisa estar autenticado.");
    }

    const uidUsuario = context.auth.uid;
    const { tipoOcorrencia, descricaoProblema, pedidoVinculado } = data;

    if (!descricaoProblema || !descricaoProblema.trim()) {
      throw new functions.https.HttpsError("invalid-argument", "A descrição do problema é obrigatória.");
    }

    try {
      let lojistaIdFinal = uidUsuario;
      const userDoc = await db.doc(`usuarios/${uidUsuario}`).get();
      if (userDoc.exists) {
        lojistaIdFinal = userDoc.data().lojaId || uidUsuario;
      }

      let nomeLojaCache = "Loja Sem Nome";
      const lojaSnap = await db.doc(`lojistas/${lojistaIdFinal}`).get();
      if (lojaSnap.exists) {
        const dadosLojaDoc = lojaSnap.data();
        nomeLojaCache = dadosLojaDoc.dadosLoja?.dsNomeLoja || 
                        dadosLojaDoc.dsNomeLoja || 
                        dadosLojaDoc.nomeLoja || 
                        dadosLojaDoc.nmLoja || 
                        "Loja Sem Nome";
      }

      const dataAtual = new Date();
      const anoValido = dataAtual.getFullYear();
      const mesValido = dataAtual.getMonth();
      const chaveMes = `${mesesNomes[mesValido]}_${anoValido}`;
      const anoStr = String(anoValido);

      const numeroTicketRandom = Math.floor(10000 + Math.random() * 90000);
      const codigoTicket = `TK-${numeroTicketRandom}`;
      const tipoOcorrênciaLimpo = tipoOcorrencia || "suporte";
      const dataCriacaoIso = dataAtual.toISOString();

      const novoTicket = {
        dsCodigoTicket: codigoTicket,
        lojistaId: lojistaIdFinal,
        nmLoja: nomeLojaCache,
        dsTipoOcorrencia: tipoOcorrênciaLimpo,
        dsDescricaoProblema: String(descricaoProblema).trim(),
        pedidoVinculado: pedidoVinculado || null,
        dsStatus: "aberto",
        tsCriacao: dataCriacaoIso,
        dtCriacaoString: dataCriacaoIso,
        historicoMensagens: []
      };

      const docMesRef = db.doc(`master_dashboard/tickets_suporte/meses/${chaveMes}`);
      const docAnoRef = db.doc(`master_dashboard/tickets_suporte/anos/${anoStr}`);

      await db.runTransaction(async (t) => {
        // ==========================================
        // 1. TODAS AS LEITURAS PRIMEIRO (Obrigatório)
        // ==========================================
        const docMesSnap = await t.get(docMesRef);
        const docAnoSnap = await t.get(docAnoRef);

        // ==========================================
        // 2. PROCESSAMENTO E LÓGICA DE DADOS
        // ==========================================
        let ticketsMes = docMesSnap.exists ? (docMesSnap.data().tickets || []) : [];
        ticketsMes.push(novoTicket);

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

        let ticketsAno = docAnoSnap.exists ? (docAnoSnap.data().ticketsResumidos || []) : [];
        ticketsAno.push({
          dsCodigoTicket: codigoTicket,
          dsTipoOcorrencia: tipoOcorrênciaLimpo,
          dsStatus: "aberto",
          tsCriacao: dataCriacaoIso,
          tsFechamento: null,
          tempoResolucaoMinutos: null
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

      return { sucesso: true, codigoTicket, mensagem: "Ticket criado com sucesso." };
    } catch (error) {
      console.error("Erro ao criar ticket:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  });


// --- 2. FUNÇÃO DE ATUALIZAR STATUS OU RESPONDER (Calcula tempo de resolução) ---
exports.atualizarStatusOuResponderTicket = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    const { codigoTicket, chaveMes, novaResposta, novoStatus } = data;

    if (!codigoTicket || !chaveMes) {
      throw new functions.https.HttpsError("invalid-argument", "Dados insuficientes.");
    }

    try {
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

        ticketsMes = ticketsMes.map(tkt => {
          if (tkt.dsCodigoTicket === codigoTicket) {
            let historico = tkt.historicoMensagens || [];
            if (novaResposta && novaResposta.trim()) {
              historico.push({
                autorId: context.auth.uid,
                autorTipo: context.auth.token.role === "master" ? "Master" : "Lojista",
                mensagem: novaResposta.trim(),
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