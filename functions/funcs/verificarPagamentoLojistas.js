const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const db = getFirestore();

// ==========================================================================================
// 4. FUNÇÃO VERIFICAR PAGAMENTO DOS LOGISTAS
// ==========================================================================================
exports.verificarPagamentoLojistas = functions
  .region("southamerica-east1")
  .pubsub.schedule("0 8 * * *")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    const agora = Timestamp.now();

    const snapshot = await db
      .collection("lojistas")
      .where("dadosLoja.dsStatusLoja", "==", "ativo")
      .where("dadosLoja.tsVencimentoLoja", "<", agora)
      .get();

    if (snapshot.empty) return null;

    const promessas = snapshot.docs.map((doc) =>
      doc.ref.update({ "dadosLoja.dsStatusLoja": "suspenso" }),
    );

    await Promise.all(promessas);
    return null;
  });

  /*
      =========================================================================================
      DOCUMENTAÇÃO DA ETAPA: VERIFICAR PAGAMENTO DOS LOJISTAS (INADIMPLÊNCIA)
      =========================================================================================
      
      1. Agendamento Diário (PubSub): 
         Configurada para rodar automaticamente todos os dias às 08:00 da manhã 
         no fuso horário de Brasília ("America/Sao_Paulo"), realizando a varredura matinal de faturas.
         
      2. Filtro de Lojistas Inadimplentes: 
         Consulta a coleção raiz de lojistas buscando por lojas que estejam com o status 
         atual 'dadosLoja.dsStatusLoja' igual a "ativo", mas cuja data limite de vencimento 
         ('dadosLoja.tsVencimentoLoja') seja inferior ao momento atual ('agora').
         
      3. Suspensão Automática por Atraso: 
         Mapeia todas as lojas encontradas nessa condição e executa a atualização em lote 
         alterando o status do plano de "ativo" para "suspenso", bloqueando o acesso operacional 
         até que o lojista regularize o pagamento da mensalidade.
      =========================================================================================
    */