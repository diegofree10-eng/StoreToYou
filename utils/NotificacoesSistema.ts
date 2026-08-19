// utils/NotificacoesSistema.ts
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Lógica centralizada para lidar com Notificações de Versão, Mensagens Globais e Direcionadas do Sistema
 */

// --- 1. VERSÕES DO SISTEMA ---

export const verificarNovaVersao = async (lojistaId: string) => {
  try {
    const configSnap = await getDoc(doc(db, "configuracoes", "sistema"));
    if (!configSnap.exists()) return null;

    const ultimaVersao = configSnap.data()?.historicoVersoes;
    // Só prossegue se houver versão e se estiver configurado para exibir ao logista
    if (!ultimaVersao || !ultimaVersao.isExibirLogista) return null;

    const lojistaSnap = await getDoc(doc(db, "lojistas", lojistaId));
    const ultVersaoVista = lojistaSnap.data()?.ultimaVersaoVista;

    // Se o lojista ainda não viu essa versão específica
    if (ultVersaoVista !== ultimaVersao.nrVersaoSistemaSistema) {
      return ultimaVersao;
    }
    return null;
  } catch (e) {
    console.error("Erro ao verificar versão no NotificacoesSistema:", e);
    return null;
  }
};

export const marcarVersaoComoVista = async (lojistaId: string, versaoId: string) => {
  try {
    await updateDoc(doc(db, "lojistas", lojistaId), {
      ultimaVersaoVista: versaoId
    });
    return true;
  } catch (e) {
    console.error("Erro ao marcar versão como vista:", e);
    return false;
  }
};


// --- 2. MENSAGENS (DIRECIONADAS E GLOBAIS) ---

/**
 * Busca todas as mensagens não lidas de um lojista específico (subcoleção do lojista + globais)
 */
export const buscarMensagensPendentesDoLojista = async (lojistaId: string, configGlobal?: any) => {
  try {
    const mensagensNaoLidas: any[] = [];

    // A. Busca mensagens direcionadas na subcoleção exclusiva do lojista (lojistas/{lojistaId}/mensagens)
    if (lojistaId) {
      const mensagensRef = collection(db, "lojistas", lojistaId, "mensagens");
      const q = query(mensagensRef, orderBy("dataEnvio", "desc"));
      const snapshot = await getDocs(q);

      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        if (dados && !dados.lida) {
          mensagensNaoLidas.push({
            id: docSnap.id,
            origem: "direcionada",
            ...dados
          });
        }
      });
    }

    // B. Busca mensagens globais (caso existam no configuration/sistema)
    const historicoGlobal = configGlobal?.historicoMensagens || [];
    const globaisNaoLidas = historicoGlobal
      .filter((m: any) => !m.lida)
      .map((m: any) => ({ ...m, origem: "global" }));
      
    mensagensNaoLidas.push(...globaisNaoLidas);

    return mensagensNaoLidas;
  } catch (e) {
    console.error("Erro ao buscar mensagens pendentes do lojista:", e);
    return [];
  }
};

/**
 * Marca uma mensagem específica como lida, tratando automaticamente se ela é direcionada ou global
 */
export const marcarMensagemComoLida = async (
  lojistaId: string, 
  mensagemId: string, 
  origem: "direcionada" | "global" = "direcionada",
  historicoGlobalAtual?: any[]
) => {
  try {
    if (origem === "direcionada" && lojistaId) {
      // Atualiza o documento na subcoleção do lojista
      const msgRef = doc(db, "lojistas", lojistaId, "mensagens", mensagemId);
      await updateDoc(msgRef, { 
        lida: true, 
        dataLeitura: new Date() 
      });
    } else {
      // Atualiza no array global de mensagens (configuracoes/sistema)
      if (!historicoGlobalAtual) return false;
      const novoHistorico = historicoGlobalAtual.map((m: any) => 
        m.id === mensagemId ? { ...m, lida: true } : m
      );
      const configRef = doc(db, "configuracoes", "sistema");
      await updateDoc(configRef, { historicoMensagens: novoHistorico });
    }
    return true;
  } catch (e) {
    console.error("Erro ao marcar mensagem como lida:", e);
    return false;
  }
};

/**
 * Facilita o disparo de ações de leitura genéricas
 */
export const processarLeitura = async (
  acao: () => Promise<void>
) => {
  try {
    await acao();
    return true;
  } catch (e) {
    console.error("Erro ao processar leitura:", e);
    return false;
  }
};

/**
 * unifica e centraliza tudo: a checagem e marcação de versões do sistema,
 * além da busca e marcação de mensagens direcionadas
 * (buscadas diretamente na subcoleção lojistas/{lojistaId}/mensagens que o Master envia)
 * e mensagens globais.
 */