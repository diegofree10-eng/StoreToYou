import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function validarPrecosNoServidor(safeCart: any[], lojistaId: string) {
    const itensValidados = [];

    for (const item of safeCart) {
        if (!item.id) continue;

        // Busca o produto real direto do Firestore
        const prodRef = doc(db, "lojistas", lojistaId, "produtos", item.id);
        const prodSnap = await getDoc(prodRef);

        if (!prodSnap.exists()) {
            throw new Error(`O produto "${item.nome}" não está mais disponível.`);
        }

        const dadosServidor = prodSnap.data();
        let precoReal = Number(dadosServidor.precoBasico || 0);

        // 📦 Validação de Estoque (se a loja utiliza controle de estoque)
        const controlaEstoque = dadosServidor.controlaEstoque === true || dadosServidor.gerenciaEstoque === true;
        const estoqueDisponivel = Number(dadosServidor.estoque ?? dadosServidor.quantidadeEstoque ?? 999999);
        const qtdDesejada = Number(item.qty || item.quantidade || 1);

        if (controlaEstoque && estoqueDisponivel < qtdDesejada) {
            throw new Error(`Estoque insuficiente para o produto "${item.nome}". Disponível em estoque: ${estoqueDisponivel} unidade(s).`);
        }

        // Se o item tem variação, valida se o preço da variação bate com o servidor
        if (item.variacao && dadosServidor.variacoes) {
            const varMatch = dadosServidor.variacoes.find((v: any) => {
                const nomeVar = (v.v1 || v.sabor || v.cor || v.modelo || "").trim();
                return item.variacao.includes(nomeVar);
            });
            if (varMatch) {
                precoReal = Number(varMatch.preco || precoReal);
            }
        }

        itensValidados.push({
            ...item,
            preco: precoReal,
            price: precoReal
        });
    }

    return itensValidados;
}

// Etapa 1: Busca no Banco de Dados: Quando o cliente clica em "Finalizar",
// o sistema pega os IDs dos produtos que estão no carrinho.

//Etapa 2: Conferência de Preço Real: Ele faz uma consulta rápida no Firestore
// (lojistas/${lojistaId}/produtos/${item.id}) para buscar o precoBasico oficial
// (ou o preço da variação exata selecionada).

// Etapa 3: Substituição Segura: O preço utilizado no cálculo final e no texto enviado
// ao WhatsApp passa a ser obrigatoriamente o que veio do banco de dados,
// ignorando qualquer alteração feita no navegador.

//também checa e retornar o estoque atualizado.