import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// INCREMENTE ESTE NÚMERO apenas quando adicionar novos campos obrigatórios estruturais
const VERSAO_SCHEMA_CODIGO_ATUAL = 2; 

// Adicionado export para a função de modelo padrão (para resolver o erro que apareceu no terminal)
export function obterModeloPadrao() {
    return {
        atualizacao: { nrVersaoSistemaLogista: "0.0.0", nrVersaoSchemaLogista: 0 },
        aparencia: { dscorFundo: "#f8fafc", dscorPrincipal: "#FF8C00", dscorSecundaria: "#F5F5DC", dscorTextoCard: "#1e293b", isModoNoturno: false }
    };
}

export async function sincronizarNovosCamposLojista(
    uid: string, 
    dadosAtuaisDoLojista: any, 
    nrVersaoSchemaSistemaGlobal: number, 
    nrVersaoSistemaGlobal: string, 
    setConfigModal?: Function
) {
    if (!uid || !dadosAtuaisDoLojista) return dadosAtuaisDoLojista;

    const schemaLogista = Number(dadosAtuaisDoLojista.atualizacao?.nrVersaoSchemaLogista) || 0;
    const schemaSistema = Number(nrVersaoSchemaSistemaGlobal) || 0;
    
    const versaoSistemaLogista = dadosAtuaisDoLojista.atualizacao?.nrVersaoSistemaLogista || "0.0.0";
    const versaoSistemaSistema = nrVersaoSistemaGlobal || "0.0.0";

    // ✨ Valida tanto o Schema quanto a Versão do Sistema. 
    // Só pula se o schema for igual/maior E a versão do sistema também for a mesma.
    if (schemaLogista >= schemaSistema && versaoSistemaLogista === versaoSistemaSistema) {
        if (setConfigModal) setConfigModal(dadosAtuaisDoLojista);
        return dadosAtuaisDoLojista;
    }

    let houveAlteracao = false;
    const dadosAtualizados = { ...dadosAtuaisDoLojista };

    if (!dadosAtualizados.atualizacao) {
        dadosAtualizados.atualizacao = {
            nrVersaoSistemaLogista: "",
            nrVersaoSchemaLogista: 0
        };
        houveAlteracao = true;
    }

    // ==========================================
    // BLOCOS DE MIGRAÇÃO CONDICIONAL POR VERSÃO
    // ==========================================
    if (schemaLogista < 2) {
        if (!dadosAtualizados.aparencia) dadosAtualizados.aparencia = {};
        if (dadosAtualizados.aparencia.isModoNoturno === undefined) {
            dadosAtualizados.aparencia.isModoNoturno = false;
        }
        houveAlteracao = true;
    }

    // Atualiza os dados da versão para refletir os valores mais recentes globais
    if (dadosAtualizados.atualizacao.nrVersaoSchemaLogista !== schemaSistema || dadosAtualizados.atualizacao.nrVersaoSistemaLogista !== versaoSistemaSistema) {
        dadosAtualizados.atualizacao.nrVersaoSchemaLogista = schemaSistema;
        dadosAtualizados.atualizacao.nrVersaoSistemaLogista = versaoSistemaSistema;
        houveAlteracao = true;
    }

    // 3. GRAVAÇÃO SILENCIOSA NO FIRESTORE DO LOJISTA
    if (houveAlteracao) {
        try {
            const docRef = doc(db, "lojistas", uid);
            await updateDoc(docRef, {
                "atualizacao": dadosAtualizados.atualizacao,
                "aparencia": dadosAtualizados.aparencia || {},
                updatedAt: Date.now()
            });
            console.log(`🔄 Conta atualizada automaticamente para o Schema v${schemaSistema} (Versão: ${versaoSistemaSistema})!`);
        } catch (error) {
            console.error("Erro ao atualizar campos de versão do lojista:", error);
        }
    }

    if (setConfigModal) {
        setConfigModal(dadosAtualizados);
    }

    return dadosAtualizados;
}

// Este arquivo (atualizarNovosCampos.ts) gerencia a rotina utilitária de sincronização e migração de dados dos lojistas.
// Ele é acionado automaticamente a cada login na plataforma para verificar se há defasagens estruturais no banco de dados 
// comparando o Schema atual do lojista com o Schema global do sistema, aplicando migrações condicionais quando necessário. 
// Além disso, valida e atualiza a tag da versão visível do sistema para garantir que os painéis reflitam sempre os lançamentos recentes.