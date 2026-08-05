const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

admin.initializeApp();
const db = getFirestore();

// 1. Função: Calcular estatísticas
exports.atualizarEstatisticas = functions
  .region("southamerica-east1")
  .firestore.document("lojistas/{lojistaId}/pedidos/{pedidoId}")
  .onWrite(async (change, context) => {
    const lojistaId = context.params.lojistaId;
    const newData = change.after.exists ? change.after.data() : null;
    const antes = change.before.data();

    if (
      antes &&
      antes.status === "concluído" &&
      newData &&
      newData.status === "concluído"
    ) {
      return null;
    }

    if (newData && newData.status?.toLowerCase() === "concluído") {
      const total = Number(
        newData.financeiro?.vlTotal ||
          newData.financeiro?.total ||
          newData.total ||
          0,
      );
      const data = new Date(newData.data || Date.now());
      const chave = `${data.getFullYear()}_${data.getMonth() + 1}`;
      const statsRef = db.doc(`lojistas/${lojistaId}/dashboard_stats/${chave}`);

      await db.runTransaction(async (t) => {
        const doc = await t.get(statsRef);
        const stats = doc.exists
          ? doc.data()
          : { faturamento: 0, totalPedidos: 0 };
        t.set(
          statsRef,
          {
            faturamento: (stats.faturamento || 0) + total,
            totalPedidos: (stats.totalPedidos || 0) + 1,
            ultimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    }
  });

// 2. Função: Preparar estrutura para novo lojista
exports.prepararNovoLojista = functions
  .region("us-central1")
  .auth.user()
  .onCreate(async (user) => {
    const lojistaId = user.uid;

    const estruturaLojista = {
      dadosPessoais: {
        dsNomeResponsavel: "",
        dsRuaResponsavel: "",
        nrNumeroResponsavel: "",
        dsCepResponsavel: "",
        dsBairroResponsavel: "",
        dsCidadeResponsavel: "",
        dsUfResponsavel: "",
        dsTelResponsavel: "",
        dsRole: "admin",
      },
      dadosLoja: {
        dsRuaLoja: "",
        nrNumeroLoja: "",
        dsCepLoja: "",
        dsBairroLoja: "",
        dsCidadeLoja: "",
        dsUfLoja: "",
        nrWhatssapLoja: "",
        tsCriacaoLoja: FieldValue.serverTimestamp(),
        nrCnpjCpfLoja: "",
        dsStatusLoja: "ativo",
        dsCicloLoja: "mensal",
        isAtivoLoja: "ativo",
        dsPlanoLoja: "Bronze",
        tsVencimentoLoja: Timestamp.fromDate(
          new Date(new Date().setMonth(new Date().getMonth() + 1)),
        ),
        dsLogoLoja: "",
        isLojaAberta: true,
        dsSeguimentoLoja: "",
        ultimoLogin: FieldValue.serverTimestamp(),
      },
      banners: {
        dsDesktop: [],
        dsMobile: [],
        dsBanner1: "",
        dsBanner2: "",
        dsBanner3: "",
      },
      pagamentos: {
        dsChavePix: "",
        dsMercadoPago: { publicKey: "", accessToken: "", ativo: false },
        dsPagSeguro: { token: "", email: "", ativo: false },
      },
      aparencia: {
        dscorFundo: "#f8fafc",
        dscorPrincipal: "#FF8C00",
        dscorSecundaria: "#F5F5DC",
        dscorTextoCard: "#1e293b",
      },
      sistema: {
        isFreteGratisAtivo: false,
        vlFreteGratisMinimo: 0,
        isFreteLocal: false,
        vlFreteLocal: 0,
        dsTokenMelhorEnvio: "",
        dsTransportadoras: {
          correios: true,
          jadlog: true,
          azul: true,
          latam: true,
        },
        nrDiasTesteOuro: 0,
        dsPlanoTeste: "",
        isTesteOuroAtivo: false,
        tsVencimentoTeste: null,
      },
      cupons: {},
      financeiro: {
        vlLucroReal: 0,
        vlMetaFaturamentoMensal: 0,
        vlTicketMedio: 0,
      },
      redesSociais: [],
    };

    await db.doc(`lojistas/${lojistaId}`).set(estruturaLojista, { merge: true });
    await db.collection(`lojistas/${lojistaId}/assinaturas`).doc("registro_inicial").set({
      vlAssinaturaLojista: 0,
      tsAssinaturaLojista: FieldValue.serverTimestamp(),
      dsStatusPagamentoLojista: "Ativação",
      dsMesReferencia: "Cadastro Inicial",
      createdAt: FieldValue.serverTimestamp(),
    });
    await db.collection(`lojistas/${lojistaId}/mensagens`).add({
      titulo: "Bem-vindo!",
      texto: "...",
      dataEnvio: FieldValue.serverTimestamp(),
      lida: false,
      prioridade: "alta",
      categoria: "sistema",
    });
    await db.doc(`lojistas/${lojistaId}/categorias/geral`).set({ nome: "Geral" });
    return null;
  });

// 3. Função: Reverter planos de teste Ouro vencidos
exports.reverterPlanosVencidos = functions
  .region("southamerica-east1")
  .pubsub.schedule("0 3 * * *")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    const agora = Timestamp.now();
    const snapshot = await db
      .collection("lojistas")
      .where("sistema.isTesteOuroAtivo", "==", true)
      .get();

    if (snapshot.empty) return null;

    const promessas = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const vencimento = data.sistema?.tsVencimentoTeste;
      if (vencimento && vencimento.toMillis() < agora.toMillis()) {
        promessas.push(
          doc.ref.update({
            "sistema.dsPlanoTeste": "",
            "sistema.tsVencimentoTeste": null,
            "sistema.isTesteOuroAtivo": false,
          }),
        );
      }
    });
    await Promise.all(promessas);
    return null;
  });

// 4. Função: Verificar pagamento de lojistas
exports.verificarPagamentoLojistas = functions
  .region("southamerica-east1")
  .pubsub.schedule("0 8 * * *")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    const agora = Timestamp.now();
    
    const snapshot = await db.collection("lojistas")
      .where("dadosLoja.dsStatusLoja", "==", "ativo")
      .where("dadosLoja.tsVencimentoLoja", "<", agora)
      .get();

    if (snapshot.empty) return null;

    const promessas = snapshot.docs.map((doc) => 
      doc.ref.update({ "dadosLoja.dsStatusLoja": "suspenso" })
    );

    await Promise.all(promessas);
    return null;
  });