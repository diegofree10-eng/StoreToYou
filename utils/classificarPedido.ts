// utils/classificarPedido.ts
import { Pedido } from '@/types/pedido';

export const descobrirAbaDoPedido = (p: Pedido): { idAba: string; nomeAba: string } => {
    if (!p) return { idAba: 'pedidos', nomeAba: 'Pedidos' };

    const statusGeral = String(p.status || '').trim().toLowerCase();

    // 1. Concluídos
    if (statusGeral === 'concluído' || statusGeral === 'concluido') {
        return { idAba: 'concluidos', nomeAba: 'Concluídos' };
    }

    // 2. Enviados
    const isEnviado =
        statusGeral === 'enviado' ||
        statusGeral === 'postado' ||
        (p as any).enviado === true ||
        (p as any).statusEnvio === 'enviado' ||
        Boolean(p.codigoRastreio || (p as any).rastreio || (p as any).logistica?.codigoRastreio);

    if (isEnviado) {
        return { idAba: 'enviados', nomeAba: 'Enviados' };
    }

    const statusProdObj = (p as any).StatusProducao || {};
    // 🌟 CORREÇÃO CIRÚRGICA: Removido o acento para ler exatamente 'dsStatusProducao' do Firebase
    const statusProdAtual = String(statusProdObj.dsStatusProducao || p.statusProducao || '').toLowerCase();
    const isPago = Boolean(statusProdObj.isPago !== undefined ? statusProdObj.isPago : p.pago);

    // 3. Pedidos (Não pagos e não prontos)
    if (!isPago && statusProdAtual !== 'pronto') {
        return { idAba: 'pedidos', nomeAba: 'Pedidos' };
    }

    // 4. Pendente (Pago mas aguardando)
    if (statusProdAtual === 'pendente' && isPago) {
        return { idAba: 'pendente', nomeAba: 'Pendente' };
    }

    // 5. Produção
    if (statusProdAtual === 'produção' && isPago) {
        return { idAba: 'producao', nomeAba: 'Produção' };
    }

    // 6. Pronto (Pago e com status de produção pronto)
    if (statusProdAtual === 'pronto' && isPago) {
        const pedidoLogistica = (p as any).logistica || {};
        const formaEntregaLogistica = String(pedidoLogistica.dsFormaEntrega || '').trim().toLowerCase();
        const transportadoraIdLogistica = String(pedidoLogistica.dsTransportadoraId || '').trim().toLowerCase();

        const isRetirada = pedidoLogistica.isRetirada === true || formaEntregaLogistica === 'retirada' || transportadoraIdLogistica === 'retirada' || p.retirada || p.retirarNaLoja;
        if (isRetirada) return { idAba: 'retirada', nomeAba: 'Retirada' };

        const isEntregaLocal =
            formaEntregaLogistica === 'entrega_local' ||
            formaEntregaLogistica === 'entregalocal' ||
            formaEntregaLogistica === 'motoboy' ||
            transportadoraIdLogistica === 'entrega_local' ||
            transportadoraIdLogistica === 'entregalocal' ||
            (p as any).entregaLocal === true;

        if (isEntregaLocal) return { idAba: 'entregalocal', nomeAba: 'Entrega Local' };

        // 🛡️ VERIFICAÇÃO BLINDADA DE ITENS: Prioridade absoluta para itens físicos em pedidos mistos
        const itens = Array.isArray(p.itens) ? p.itens : [];
        const temItemFisicoReal = itens.some((item: any) => {
            const tipo = String(item.dsTipoProduto || item.tipoProduto || '').toLowerCase();
            const naoEhDigital = !tipo.includes('digital') && tipo !== 'digital_download';
            const exigeFrete = item.precisaFrete === true || item.precisaFrete === undefined;
            return naoEhDigital && exigeFrete;
        });

        // Se TEM item físico real, ele NUNCA pode ir para a aba digital, mesmo que seja misto!
        if (!temItemFisicoReal) {
            const isDigitalPuramente = formaEntregaLogistica === 'digital' || itens.some((i: any) => i.precisaFrete === false);
            if (isDigitalPuramente) return { idAba: 'digital', nomeAba: 'Digital' };
        }

        if (!p.etiquetaGerada) {
            const transpFinanceiro = String(p.financeiro?.dsTransportadoraId || "").trim().toLowerCase();
            const transpCotacao = String((p as any).Cotacao?.dsTransportadoraIdCotado || "").trim().toLowerCase();

            // Verifica se há transportadora real válida cadastrada
            const temTransportadoraReal =
                (transpFinanceiro !== "" && transpFinanceiro !== "null" && transpFinanceiro !== "undefined" && transpFinanceiro !== "0" && transpFinanceiro !== "frete_gratis_ativado") ||
                (transportadoraIdLogistica !== "" && transportadoraIdLogistica !== "null" && transportadoraIdLogistica !== "undefined" && transportadoraIdLogistica !== "0" && transportadoraIdLogistica !== "frete_gratis_ativado") ||
                (transpCotacao !== "" && transpCotacao !== "null" && transpCotacao !== "undefined" && transpCotacao !== "0" && transpCotacao !== "frete_gratis_ativado");

            // 🎯 CORREÇÃO: Se tem item físico real e NÃO tem transportadora real definida (mesmo com frete grátis promocional), vai para Cotar Frete!
            if (temItemFisicoReal && !temTransportadoraReal) {
                return { idAba: 'cotar', nomeAba: 'Cotar Frete' };
            }
        }
        return { idAba: 'etiquetas', nomeAba: 'Etiquetas' };
    }

    const pedidoLogistica = (p as any).logistica || {};
    const formaEntregaLogistica = String(pedidoLogistica.dsFormaEntrega || '').trim().toLowerCase();

    if (formaEntregaLogistica === 'retirada') return { idAba: 'retirada', nomeAba: 'Retirada' };
    if (formaEntregaLogistica === 'entrega_local') return { idAba: 'entregalocal', nomeAba: 'Entrega Local' };

    const itens = Array.isArray(p.itens) ? p.itens : [];
    const temFisico = itens.some((i: any) => {
        const tipo = String(i.dsTipoProduto || i.tipoProduto || '').toLowerCase();
        return !tipo.includes('digital') && i.precisaFrete !== false;
    });
    
    if (!temFisico) return { idAba: 'digital', nomeAba: 'Digital' };

    return { idAba: 'pedidos', nomeAba: 'Pedidos' };
};

/**
 * Classifica um pedido e determina em qual aba da Gestão de Pedidos 
 * ele deve ser exibido com base no status, pagamento, modalidade de 
 * entrega e prioridade de itens físicos/mistos.
 */