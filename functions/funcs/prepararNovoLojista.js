const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

const db = getFirestore();

// ==========================================================================================
// 2. FUNÇÃO PREPARAR NOVO LOGISTA
// ==========================================================================================
exports.prepararNovoLojista = functions
  .region("us-central1")
  .auth.user()
  .onCreate(async (user) => {
    const userId = user.uid;

    // 🛡️ VERIFICAÇÃO DE SEGURANÇA:
    const userDocRef = db.doc(`usuarios/${userId}`);
    const userDocSnap = await userDocRef.get();

    let codigoIndicador = null;

    if (userDocSnap.exists) {
      const userData = userDocSnap.data();
      
      // Se for colaborador, bloqueia a criação na raiz
      if (
        userData.dsTipoConta === "colaborador" ||
        userData.role === "colaborador"
      ) {
        console.log(
          `🛑 [Trigger Bloqueado] O usuário ${userId} é um colaborador. Nenhuma loja será criada na raiz.`,
        );
        return null;
      }

      // ✨ Recupera o código de indicação que foi salvo no documento do usuário pelo front-end
      if (userData.indicadoPor) {
        codigoIndicador = userData.indicadoPor;
      }
    }

    const lojistaId = userId;

    const estruturaLojista = {
      uid: userId,
      email: user.email || "",
      dsTipoConta: "logista",
      indicadoPor: codigoIndicador, // 👈 Campo que guarda quem indicou este lojista
      dataCadastro: Date.now(),
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
        isModoNoturno: false,
      },
      sistema: {
        isFreteGratisAtivo: false,
        vlFreteGratisMinimo: 0,
        isFreteLocal: false,
        vlFreteLocal: 0,
        isRetiradaLoja: false,
        dsTokenMelhorEnvio: "",
        isAutomacaoCompletaMelhorEnvio: false,
        isTransportadoraAtivo: false,
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
        isMelhorEnvioSandbox: false,
      },
      atualizacao: {
        nrVersaoSistemaLogista: "0.0.0",
        nrVersaoSchemaLogista: 0,
      },
      cupons: {},
      financeiro: {
        vlLucroReal: 0,
        vlMetaFaturamentoMensal: 0,
        vlTicketMedio: 0,
      },
      redesSociais: [],
    };

    await db
      .doc(`lojistas/${lojistaId}`)
      .set(estruturaLojista, { merge: true });

    // ✨ Se existe um indicador válido, registra automaticamente na subcoleção de indicações do "padrinho"
    if (codigoIndicador && codigoIndicador !== lojistaId) {
      try {
        const nomeLojaNovo = userDocSnap.exists ? (userDocSnap.data().nomeLoja || "Nova Loja") : "Nova Loja";
        await db
          .doc(`lojistas/${codigoIndicador}/indicacoes/${lojistaId}`)
          .set({
            uidIndicado: lojistaId,
            emailIndicado: user.email || "",
            nomeIndicado: nomeLojaNovo,
            dataCadastro: new Date().toISOString(),
            status: "pendente" // Ficará pendente até virar assinante pago
          });
      } catch (errInd) {
        console.error("Erro ao registrar indicação na função trigger:", errInd);
      }
    }

    await db
      .collection(`lojistas/${lojistaId}/assinaturas`)
      .doc("registro_inicial")
      .set({
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

    await db
      .doc(`lojistas/${lojistaId}/categorias/geral`)
      .set({ nome: "Geral" });

    return null;
  });

  /*
      =========================================================================================
      DOCUMENTAÇÃO DA ETAPA: PREPARAR NOVO LOJISTA
      =========================================================================================
      
      1. Segurança de Colaboradores: 
         Bloqueia imediatamente a criação de documentos na raiz caso o usuário recém-criado 
         no Firebase Auth possua a propriedade de perfil correspondente a um colaborador.
         
      2. Sistema de Indicações: 
         Captura o campo 'indicadoPor' salvo previamente no documento do usuário e cria 
         o registro pendente de indicação na subcoleção do lojista "padrinho":
         (lojistas/{codigoIndicador}/indicacoes/{lojistaId}).
         
      3. Estrutura Base do Lojista: 
         Grava todos os objetos padrão necessários na raiz (dadosLoja, aparencia, sistema, 
         pagamentos, etc.), inicializando o lojista com o plano padrão "Bronze" e concedendo 
         automaticamente 1 mês de vigência inicial para o vencimento.
         
      4. Assinaturas e Utilitários: 
         Cria o documento inicial de ativação em 'assinaturas/registro_inicial', envia a 
         mensagem padrão de boas-vindas na subcoleção de mensagens e gera a categoria 
         padrão "Geral" para os produtos.
      =========================================================================================
    */