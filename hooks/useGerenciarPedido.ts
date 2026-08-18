// hooks/useGerenciarPedido.ts
import { useState } from 'react';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Pedido } from '@/types/pedido';

interface UseGerenciarPedidoProps {
    db: any;
    lojistaIdApp: string;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
}

export function useGerenciarPedido({ db, lojistaIdApp, setLocalPedidos }: UseGerenciarPedidoProps) {
    const [processando, setProcessando] = useState(false);

    const estornarEstoqueDoPedido = async (pedido: Pedido) => {
        if (!pedido || !Array.isArray(pedido.itens) || pedido.itens.length === 0) return;

        for (const item of pedido.itens) {
            const produtoId = item.idProduto || item.id;
            if (!produtoId) continue;

            const prodRef = doc(db, "lojistas", lojistaIdApp, "produtos", produtoId);
            const prodSnap = await getDoc(prodRef);

            if (!prodSnap.exists()) continue;
            const dadosProd = prodSnap.data();
            const qtdEstornar = Number(item.qty || item.quantidade || 1);
            const nomeVar = item.variacao || (item as any).nomeVariacao;

            if (nomeVar && nomeVar !== "Produto Único" && Array.isArray(dadosProd.variacoes)) {
                const novasVariacoes = dadosProd.variacoes.map((v: any) => {
                    if (v.nome === nomeVar) {
                        const estoqueAtual = Number(v.estoque || 0);
                        const novoEstoque = estoqueAtual + qtdEstornar;
                        return { ...v, estoque: String(novoEstoque) };
                    }
                    return v;
                });
                await updateDoc(prodRef, { variacoes: novasVariacoes });
            } else {
                const estoqueAtual = Number(dadosProd.estoque || 0);
                const novoEstoque = estoqueAtual + qtdEstornar;
                await updateDoc(prodRef, { estoque: String(novoEstoque) });
            }
        }
    };

    const alterarStatusPedido = async (pedidoId: string, novoStatus: string, extras: Record<string, any> = {}) => {
        setProcessando(true);
        try {
            const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoId);
            
            const payload: Record<string, any> = {
                "StatusProducao.dsStatusProducao": novoStatus,
                ...extras
            };

            await updateDoc(pedidoRef, payload);

            // 🎯 ATUALIZAÇÃO OTIMISTA CORRIGIDA: Assegura mapeamento profundo de StatusProducao e extras sem acento
            setLocalPedidos(prev => prev.map(p => {
                if (p.id === pedidoId) {
                    const statusProducaoAtual = (p as any).StatusProducao || {};
                    return {
                        ...p,
                        ...extras,
                        StatusProducao: {
                            ...statusProducaoAtual,
                            dsStatusProducao: novoStatus,
                            ...(extras["StatusProducao.dsStatusProducao"] ? { dsStatusProducao: extras["StatusProducao.dsStatusProducao"] } : {})
                        }
                    };
                }
                return p;
            }));

            return { sucesso: true };
        } catch (error: any) {
            console.error("Erro ao alterar status:", error);
            return { sucesso: false, erro: error.message };
        } finally {
            setProcessando(false);
        }
    };

    const excluirPedidoComEstorno = async (pedido: Pedido) => {
        setProcessando(true);
        try {
            await estornarEstoqueDoPedido(pedido);
            await deleteDoc(doc(db, "lojistas", lojistaIdApp, "pedidos", pedido.id));

            setLocalPedidos(prev => prev.filter(p => p.id !== pedido.id));

            return { sucesso: true };
        } catch (error: any) {
            console.error("Erro ao excluir pedido:", error);
            return { sucesso: false, erro: error.message };
        } finally {
            setProcessando(false);
        }
    };

    return {
        processando,
        alterarStatusPedido,
        excluirPedidoComEstorno,
        estornarEstoqueDoPedido
    };
}

/**
 * 💡 EXPLICAÇÃO DO HOOK:
 * Este hook centraliza toda a lógica de mutação e escrita no Firestore referente aos pedidos 
 * (como alteração de status de produção, pagamentos e exclusão definitiva com estorno de estoque).
 * Ele utiliza atualizações otimistas no `setLocalPedidos` para refletir as mudanças instantaneamente 
 * na interface do usuário sem a necessidade de realizar novas consultas de leitura desnecessárias no banco,
 * economizando custos operacionais e garantindo alta performance.
 */