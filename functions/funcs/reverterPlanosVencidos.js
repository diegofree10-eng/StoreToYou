const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const db = getFirestore();

// ==========================================================================================
// 3. FUNÇÃO REVERTER PLANOS VENCIDOS
// ==========================================================================================
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

  /*
      =========================================================================================
      DOCUMENTAÇÃO DA ETAPA: REVERTER PLANOS DE TESTE OURO VENCIDOS
      =========================================================================================
      
      1. Agendamento Automático (Cron/PubSub): 
         Configurada para ser executada automaticamente todos os dias às 03:00 da manhã 
         no fuso horário de Brasília ("America/Sao_Paulo"), garantindo varreduras periódicas 
         sem intervenção manual.
         
      2. Varredura de Lojistas em Teste: 
         Consulta a coleção raiz de lojistas buscando por documentos que possuam o campo 
         'sistema.isTesteOuroAtivo' definido como verdadeiro (true).
         
      3. Verificação de Validade: 
         Compara o timestamp do momento atual ('Timestamp.now()') com a data limite 
         armazenada em 'sistema.tsVencimentoTeste' para identificar períodos promocionais expirados.
         
      4. Reversão de Status: 
         Para cada lojista cujo prazo de teste tenha vencido, executa a atualização atômica 
         removendo o plano de teste ativo, limpando a data limite e desativando a flag promocional, 
         retornando a conta ao estado regular.
      =========================================================================================
    */