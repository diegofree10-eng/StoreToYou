// utils/atualizarNovosCampos.tsx
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Define o modelo oficial e atualizado com todos os campos que uma conta DEVE ter.
 * Sempre que você criar um campo novo no futuro, basta adicioná-lo aqui.
 */
export const obterModeloPadrao = () => ({
    isFreteGratisAtivo: false,
    vlFreteGratisMinimo: 0,
    isFreteLocal: false,
    vlFreteLocal: 0,
    isRetiradaLoja: false,
    dsTokenMelhorEnvio: "",
    isTransportadoraAtivo: false,
    dsTransportadoras: {
        correios: true,
        jadlog: true,
        azul: true,
        latam: true,
    },
    isLojaAberta: true,
});

/**
 * Compara recursivamente um objeto antigo com o modelo padrão atual.
 * Se faltar alguma propriedade (campo novo), ela é inserida mantendo os valores existentes.
 */
const mesclarComPadrao = (atual: any, padrao: any) => {
    const resultado = { ...padrao };

    for (const chave of Object.keys(padrao)) {
        if (atual[chave] !== undefined && atual[chave] !== null) {
            // Se for um objeto aninhado (ex: dsTransportadoras), mescla os subcampos também
            if (
                typeof padrao[chave] === "object" &&
                !Array.isArray(padrao[chave]) &&
                typeof atual[chave] === "object" &&
                !Array.isArray(atual[chave])
            ) {
                resultado[chave] = mesclarComPadrao(atual[chave], padrao[chave]);
            } else {
                resultado[chave] = atual[chave];
            }
        }
    }

    return resultado;
};

/**
 * Função principal que verifica a conta do lojista, identifica o que falta com base no index/padrão,
 * atualiza o estado local e sincroniza automaticamente o Firebase.
 */
export async function sincronizarNovosCamposLojista(uid: string, dadosAtuaisDoLojista: any, setConfigModal?: Function) {
    if (!uid || !dadosAtuaisDoLojista) return dadosAtuaisDoLojista;

    const sistemaPadrao = obterModeloPadrao();
    const sistemaAtualDoLojista = dadosAtuaisDoLojista.sistema || {};

    // Mescla o que o lojista já tem com o novo padrão oficial
    const sistemaAtualizado = mesclarComPadrao(sistemaAtualDoLojista, sistemaPadrao);

    // Verifica se houve alguma alteração real (se faltava algum campo novo)
    const stringAntes = JSON.stringify(sistemaAtualDoLojista);
    const stringDepois = JSON.stringify(sistemaAtualizado);
    const temCamposNovosFaltando = stringAntes !== stringDepois;

    const dadosFinal = {
        ...dadosAtuaisDoLojista,
        sistema: sistemaAtualizado,
    };

    // Se o sistema identificou campos novos faltando, atualiza o Firebase em segundo plano (silenciosamente)
    if (temCamposNovosFaltando) {
        try {
            const docRef = doc(db, "lojistas", uid);
            await updateDoc(docRef, {
                sistema: sistemaAtualizado,
                updatedAt: Date.now()
            });
            console.log("🔄 Banco atualizado automaticamente com os novos campos do index!");
        } catch (error) {
            console.error("Erro ao atualizar automaticamente os campos da conta:", error);
        }
    }

    // Se você estiver passando a função de setState, ela já devolve o objeto corrigido
    if (setConfigModal) {
        setConfigModal(dadosFinal);
    }

    return dadosFinal;
}

// Esta função atua como um motor de inteligência automática (smart merge).
// Ela compara o objeto salvo da conta antiga com o seu modelo mais atual do index (padrão),
// preenchendo automaticamente qualquer campo novo que tenha sido criado,
// sem sobrescrever as customizações que o lojista já fez e salvando a correção
// de volta no Firebase de forma silenciosa para que o banco de dados fique 100% atualizado.