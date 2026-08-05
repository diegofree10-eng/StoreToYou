'use client';
import React, { useState, useMemo } from 'react';
import { Pedido } from '@/types/pedido';
import useSWR from 'swr';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface TabEmitirEtiquetasProps {
    pedidos: Pedido[];
    lojistaIdApp: string;
    db: any;
    dadosLoja: any;
    setModalProgresso: React.Dispatch<React.SetStateAction<any>>;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    selecionados: string[];
    setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
}

const formatarData = (dataStr: string | undefined): string => {
    if (!dataStr) return '-';
    try {
        const data = new Date(dataStr);
        return data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch (e) { return dataStr; }
};

const extrairFotoDoItem = (item: any): string => {
    const chavesPossiveis = ['foto', 'imagem', 'image', 'url', 'urlOriginal', 'thumb'];
    for (const chave of chavesPossiveis) {
        if (item[chave] && typeof item[chave] === 'string' && item[chave].startsWith('http')) return item[chave];
    }
    if (item.variacaoSelecionada?.foto) return item.variacaoSelecionada.foto;
    return "";
};

const fetchProduto = async (path: string, db: any) => {
    const [_, lojistaId, __, idProd] = path.split('/');
    const docRef = doc(db, "lojistas", lojistaId, "produtos", idProd);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
};

const obterSeloItem = (item: any, pedidoLogistica: any) => {
    const formaItem = String(item.dsFormaEntrega || pedidoLogistica?.dsFormaEntrega || '').trim().toLowerCase();
    const isRetirada = pedidoLogistica?.isRetirada === true || formaItem === 'retirada';
    const isDigital = item.precisaFrete === false || formaItem === 'digital';

    if (isRetirada) return { texto: "Retirada", cor: "#f59e0b" };
    if (isDigital) return { texto: "Digital", cor: "#3b82f6" };
    return { texto: "Envio", cor: "#10b981" };
};

export default function TabEmitirEtiquetas({
    pedidos, lojistaIdApp, db, setModalProgresso, setLocalPedidos, selecionados = [], setSelecionados
}: TabEmitirEtiquetasProps) {
    const [processandoMassa, setProcessandoMassa] = useState(false);
    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    // Paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 30;

    const pedidosProntosParaEtiqueta = useMemo(() => {
        return pedidos.filter(p => {
            if (p.status === 'Concluído' || p.status === 'enviado' || (p as any).enviado === true) return false;

            const etiquetaData = (p as any).Etiqueta || {};
            const statusEtq = String(etiquetaData.statusEtiqueta || p.statusEtiqueta || '').toLowerCase();
            const isGerada = Boolean(etiquetaData.isEtiquetaGerada || p.etiquetaGerada);

            if (isGerada && statusEtq === 'paga') {
                return false;
            }

            const transpFinanceiro = String(p.financeiro?.dsTransportadoraId || "").trim();
            const transpLogistica = String((p as any).logistica?.dsTransportadoraId || "").trim();
            const transpCotacao = String((p as any).Cotacao?.dsTransportadoraIdCotado || "").trim();

            if (transpFinanceiro === "frete_gratis_ativado" || transpLogistica === "frete_gratis_ativado" || transpCotacao === "frete_gratis_ativado") {
                return false;
            }

            const temTransportadoraId =
                (transpFinanceiro !== "" && transpFinanceiro !== "null" && transpFinanceiro !== "undefined" && transpFinanceiro !== "0") ||
                (transpLogistica !== "" && transpLogistica !== "null" && transpLogistica !== "undefined" && transpLogistica !== "0") ||
                (transpCotacao !== "" && transpCotacao !== "null" && transpCotacao !== "undefined" && transpCotacao !== "0");

            return temTransportadoraId;
        });
    }, [pedidos]);

    const pedidosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        return pedidosProntosParaEtiqueta.slice(inicio, inicio + itensPorPagina);
    }, [pedidosProntosParaEtiqueta, paginaAtual, itensPorPagina]);

    const totalPaginas = Math.ceil(pedidosProntosParaEtiqueta.length / itensPorPagina);

    const idsVisiveisNestaAba = useMemo(() => pedidosProntosParaEtiqueta.map(p => p.id), [pedidosProntosParaEtiqueta]);
    const selecionadosNestaAbaCount = useMemo(() => {
        return (selecionados || []).filter(id => idsVisiveisNestaAba.includes(id)).length;
    }, [selecionados, idsVisiveisNestaAba]);

    const toggleExpandir = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPedidosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copiarIdCompleto = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        alert(`📋 ID do pedido copiado com sucesso!\n\n${id}`);
    };

    const gerarEtiquetasEmLote = async () => {
        const aptos = pedidosProntosParaEtiqueta.filter(p => (selecionados || []).includes(p.id));

        if (aptos.length === 0) return alert("Nenhum pedido selecionado apto para emissão.");

        setModalProgresso({
            aberto: true,
            titulo: "Gerando etiquetas em lote...",
            itens: aptos.map(p => ({ id: p.id, numero: String(p.numeroPedido || p.id.slice(-4)), status: 'processando' }))
        });

        setProcessandoMassa(true);

        for (const pedido of aptos) {
            try {
                const res = await fetch("/api/frete/gerar-massa", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lojistaId: lojistaIdApp, orders: [pedido] })
                });
                const data = await res.json();

                const erroEncontrado = Array.isArray(data.errors) ? data.errors.find((e: any) => e.pedido === pedido.id || e.id === pedido.id) : null;
                let mensagemErro = erroEncontrado?.message || data.message || (Array.isArray(data.errors) ? data.errors[0]?.message : "") || "";
                const mensagemLower = mensagemErro.toLowerCase();

                const etiquetaRetornada = Array.isArray(data.etiquetas) ? data.etiquetas.find((e: any) => e.pedido === pedido.id) : null;
                const temIdEtiqueta = Boolean(data.IdEtiqueta || etiquetaRetornada?.IdEtiqueta || data.success);

                const isPendenteSaldo = mensagemLower.includes('checkout') || mensagemLower.includes('saldo') || mensagemLower.includes('balance') || mensagemLower.includes('insufficient') || mensagemLower.includes('erro ao realizar checkout');

                if (isPendenteSaldo) {
                    mensagemErro = "Erro de pagamento por falta de saldo na carteira do Melhor Envios";
                }

                const isGerada = temIdEtiqueta || isPendenteSaldo || Boolean(data.success);
                const statusEtiquetaFinal = isPendenteSaldo ? 'pendente_saldo' : (isGerada ? 'paga' : 'erro');

                if (db) {
                    const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedido.id);
                    await updateDoc(pedidoRef, {
                        etiquetaGerada: isGerada,
                        statusEtiqueta: statusEtiquetaFinal,
                        "Etiqueta.isEtiquetaGerada": isGerada,
                        "Etiqueta.statusEtiqueta": statusEtiquetaFinal,
                        "Etiqueta.mensagemErro": mensagemErro,
                        "Etiqueta.IdEtiqueta": etiquetaRetornada?.IdEtiqueta || data.IdEtiqueta || null,
                        "Etiqueta.codigoEnvio": etiquetaRetornada?.codigoEnvio || data.codigoEnvio || null
                    });
                }

                setModalProgresso((prev: any) => ({
                    ...prev,
                    itens: prev.itens.map((i: any) => i.id === pedido.id ? {
                        ...i,
                        status: isPendenteSaldo ? 'erro' : (isGerada ? 'sucesso' : 'erro'),
                        mensagem: mensagemErro
                    } : i)
                }));

                setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
                    ...p,
                    etiquetaGerada: isGerada,
                    statusEtiqueta: statusEtiquetaFinal,
                    Etiqueta: {
                        ...(p as any).Etiqueta,
                        isEtiquetaGerada: isGerada,
                        statusEtiqueta: statusEtiquetaFinal,
                        mensagemErro: mensagemErro,
                        IdEtiqueta: etiquetaRetornada?.IdEtiqueta || data.IdEtiqueta || (p as any).Etiqueta?.IdEtiqueta,
                        codigoEnvio: etiquetaRetornada?.codigoEnvio || data.codigoEnvio || (p as any).Etiqueta?.codigoEnvio
                    }
                } : p));

            } catch (err: any) {
                const errMessage = err?.message || "Erro de rede";
                setModalProgresso((prev: any) => ({
                    ...prev,
                    itens: prev.itens.map((i: any) => i.id === pedido.id ? { ...i, status: 'erro', mensagem: errMessage } : i)
                }));
            }
        }
        setProcessandoMassa(false);
        setSelecionados([]);
    };

    const enviarPedidosEmLote = async () => {
        const selecionadosAtuais = (selecionados || []).filter(id => idsVisiveisNestaAba.includes(id));
        if (selecionadosAtuais.length === 0) return alert("Nenhum pedido selecionado para envio.");
        if (!db || !lojistaIdApp) return;

        const pedidosComEtiquetaNaoPaga = pedidos.filter(p => {
            if (!selecionadosAtuais.includes(p.id)) return false;
            const etiquetaData = (p as any).Etiqueta || {};
            const statusEtq = String(etiquetaData.statusEtiqueta || p.statusEtiqueta || '').toLowerCase();
            const isGerada = Boolean(etiquetaData.isEtiquetaGerada || p.etiquetaGerada);

            return !isGerada || statusEtq === 'pendente_saldo' || statusEtq === 'erro' || statusEtq !== 'paga';
        });

        if (pedidosComEtiquetaNaoPaga.length > 0) {
            alert(`❌ Ação bloqueada: Há ${pedidosComEtiquetaNaoPaga.length} pedido(s) selecionado(s) com erro de pagamento por falta de saldo na carteira do Melhor Envios. Regularize o saldo e pague as etiquetas antes de enviá-los.`);
            return;
        }

        if (!confirm(`Deseja realmente enviar os ${selecionadosAtuais.length} pedidos selecionados? Eles serão movidos para a aba de Enviados.`)) {
            return;
        }

        try {
            for (const idPedido of selecionadosAtuais) {
                const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", idPedido);
                await updateDoc(pedidoRef, {
                    status: 'enviado',
                    enviado: true
                });
            }

            setLocalPedidos(prev => prev.map(p => selecionadosAtuais.includes(p.id) ? {
                ...p,
                status: 'enviado',
                enviado: true
            } : p));

            setSelecionados(prev => prev.filter(id => !selecionadosAtuais.includes(id)));
            alert("✅ Pedidos enviados com sucesso e movidos para a aba de Enviados!");
        } catch (e: any) {
            alert("Erro ao enviar pedidos em lote: " + e.message);
        }
    };

    return (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <style jsx>{`
                @media (max-width: 768px) {
                    .card-header-linha {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 8px !important;
                        padding: 10px 12px !important;
                    }
                    .pc-bloco-linha-unica {
                        display: none !important;
                    }
                    .mobile-bloco-organizado {
                        display: flex !important;
                        flex-direction: column !important;
                        width: 100% !important;
                        gap: 8px !important;
                    }
                    .mobile-linha-topo {
                        display: flex !important;
                        align-items: center !important;
                        gap: 10px !important;
                        width: 100% !important;
                    }
                    .mobile-linha-baixo {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        width: 100% !important;
                        padding-left: 0 !important;
                        gap: 8px !important;
                        cursor: pointer !important;
                    }
                    .mobile-id-badge {
                        font-size: 11px !important;
                        font-family: monospace !important;
                        background-color: #e2e8f0 !important;
                        color: #1e293b !important;
                        padding: 4px 8px !important;
                        border-radius: 4px !important;
                        font-weight: 600 !important;
                        cursor: pointer !important;
                        border: 1px solid #cbd5e1 !important;
                        white-space: nowrap !important;
                        display: inline-block !important;
                    }
                    .mobile-linha-erro {
                        display: block !important;
                        width: 100% !important;
                        padding-left: 0 !important;
                    }
                    .grid-expandido {
                        grid-template-columns: 1fr !important;
                        gap: 10px !important;
                    }
                    .acoes-massa-container {
                        width: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 12px !important;
                    }
                    .acoes-massa-wrapper {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        box-sizing: border-box !important;
                    }
                    .acoes-massa-wrapper button {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                }

                @media (min-width: 769px) {
                    .mobile-bloco-organizado {
                        display: none !important;
                    }
                    .pc-bloco-linha-unica {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        width: 100% !important;
                        cursor: pointer !important;
                    }
                }
            `}</style>

            <div className="acoes-massa-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', minHeight: '52px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>🏷️ Central de Emissão de Etiquetas</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Selecione os pedidos para emitir etiquetas ou finalizar o envio.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                    {selecionadosNestaAbaCount > 0 ? (
                        <div className="acoes-massa-wrapper" style={{ display: 'flex', gap: '10px', backgroundColor: '#eff6ff', padding: '8px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af', textAlign: 'center' }}>{selecionadosNestaAbaCount} selecionados</span>
                            <button onClick={gerarEtiquetasEmLote} disabled={processandoMassa} style={{ padding: '8px 14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                {processandoMassa ? "⏳ Emitindo..." : "🏷️ Emitir Etiquetas em Lote"}
                            </button>
                            <button onClick={enviarPedidosEmLote} disabled={processandoMassa} style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                📦 Enviar Pedidos em Lote
                            </button>
                        </div>
                    ) : (
                        <div style={{ visibility: 'hidden', height: '40px' }} />
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pedidosProntosParaEtiqueta.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Nenhum pedido aguardando emissão ou envio no momento. 🎉
                    </div>
                ) : (
                    pedidosPaginados.map(pedido => {
                        const nomeCliente = typeof pedido.cliente === 'object' ? (pedido.cliente?.nmNomeCliente || pedido.cliente?.nome || "Cliente") : (pedido.cliente || "Cliente");
                        const numPedidoFormatado = String(pedido.numeroPedido || pedido.numero || pedido.id?.slice(-4) || "").padStart(5, '0');
                        const expandido = !!pedidosExpandidos[pedido.id];
                        const idPedidoExibicao = String(pedido.id || "");
                        const idEncurtadoMobile = idPedidoExibicao.length > 10 ? `${idPedidoExibicao.slice(0, 6)}...${idPedidoExibicao.slice(-4)}` : idPedidoExibicao;

                        const pedidoLogistica = (pedido as any).logistica || {};
                        const cotacao = (pedido as any).Cotacao || {};
                        const etiquetaData = (pedido as any).Etiqueta || {};
                        const endereco = pedido.endereco || (pedido as any).cliente?.endereco || {};
                        const formaEntrega = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();
                        const isRetirada = pedidoLogistica.isRetirada === true || formaEntrega === 'retirada' || pedido.retirada || pedido.retirarNaLoja;
                        const isDigital = formaEntrega === 'digital';
                        const precisaFrete = pedido.itens?.some((i: any) => i.precisaFrete !== false) && !isRetirada && !isDigital;

                        const statusEtq = String(etiquetaData.statusEtiqueta || pedido.statusEtiqueta || '').toLowerCase();
                        const msgErroEtq = String(etiquetaData.mensagemErro || '').toLowerCase();
                        const textoCompleto = statusEtq + " " + msgErroEtq;
                        const isPendenteSaldo = statusEtq === 'pendente_saldo' || textoCompleto.includes('checkout') || textoCompleto.includes('saldo') || textoCompleto.includes('falta de saldo');

                        const temPersonalizacao = pedido.itens?.some(i => {
                            const resp = i.respostasFormatadas || i.personalizacao;
                            if (!resp) return false;
                            if (typeof resp === 'object' && Object.keys(resp).length > 0) return true;
                            if (typeof resp === 'string' && resp.trim() !== '') return true;
                            return false;
                        });

                        const isEtqGerada = Boolean(etiquetaData.isEtiquetaGerada || pedido.etiquetaGerada);

                        const isPagoReal = pedido.pago === true || (pedido as any).StatusProducao?.isPago === true || (pedido as any).statusPagamento === 'pago';
                        const corBordaCard = isPagoReal ? '#2ecc71' : '#e74c3c';

                        const fin = pedido.financeiro || {};
                        const subtotalVal = Number(fin.vlSubtotal ?? fin.subtotal ?? 0);
                        const freteVal = Number(fin.vlFrete ?? fin.valorFrete ?? 0);
                        const descontoVal = Number(fin.vlDesconto ?? fin.desconto ?? 0);
                        const totalVal = Number(fin.vlTotal ?? fin.total ?? (subtotalVal + freteVal - descontoVal));
                        const cupomStr = fin.dsCupom ?? fin.cupom ?? null;

                        return (
                            <div key={pedido.id} style={{ ...localStyles.cardContainer, border: `1.5px solid ${corBordaCard}` }}>
                                <div
                                    onClick={(e) => toggleExpandir(e, pedido.id)}
                                    className="card-header-linha"
                                    style={localStyles.cardHeaderLinha}
                                >
                                    <div className="pc-bloco-linha-unica">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={(selecionados || []).includes(pedido.id)}
                                                onChange={() => setSelecionados(prev => (prev || []).includes(pedido.id) ? (prev || []).filter(i => i !== pedido.id) : [...(prev || []), pedido.id])}
                                                style={{ transform: 'scale(1.2)', cursor: 'pointer', flexShrink: 0 }}
                                            />
                                            <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '15px', width: '70px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
                                            <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px', width: '220px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                            <span style={{ fontSize: '12px', color: '#16181b', fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', width: '220px', flexShrink: 0, wordBreak: 'break-all' }} title={idPedidoExibicao}>ID Pedido: {idPedidoExibicao}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                {isPendenteSaldo ? (
                                                    <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fdf2f2', color: '#b91c1c', padding: '3px 5px', borderRadius: '4px', border: '1px solid #fecaca', whiteSpace: 'nowrap' }} title={etiquetaData.mensagemErro || "Erro de pagamento por falta de saldo na carteira do Melhor Envios"}>
                                                        ⚠️falha Pgto - Acesse Painel Melhor Envios
                                                    </span>
                                                ) : msgErroEtq && msgErroEtq !== 'paga' && msgErroEtq !== 'pendente_saldo' ? (
                                                    <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fffbeb', color: '#b45309', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fde68a', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={etiquetaData.mensagemErro}>
                                                        ⚠️ Erro: {etiquetaData.mensagemErro}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0, marginLeft: '10px' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                                                {formatarData(pedido.data || (pedido.cliente as any)?.data)}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>{expandido ? '▲' : '▼'}</span>
                                        </div>
                                    </div>

                                    <div className="mobile-bloco-organizado" style={{ display: 'none' }}>
                                        <div className="mobile-linha-topo">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={(selecionados || []).includes(pedido.id)}
                                                    onChange={() => setSelecionados(prev => (prev || []).includes(pedido.id) ? (prev || []).filter(i => i !== pedido.id) : [...(prev || []), pedido.id])}
                                                    style={{ transform: 'scale(1.2)', cursor: 'pointer', flexShrink: 0 }}
                                                />
                                                <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '15px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
                                                <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                            </div>
                                        </div>

                                        <div className="mobile-linha-baixo">
                                            <span
                                                className="mobile-id-badge"
                                                onClick={(e) => copiarIdCompleto(e, idPedidoExibicao)}
                                                title="Toque para copiar o ID completo"
                                            >
                                                📋ID: {idEncurtadoMobile}
                                            </span>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                                                    {formatarData(pedido.data || (pedido.cliente as any)?.data)}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>{expandido ? '▲' : '▼'}</span>
                                            </div>
                                        </div>

                                        {(isPendenteSaldo || (msgErroEtq && msgErroEtq !== 'paga' && msgErroEtq !== 'pendente_saldo')) && (
                                            <div className="mobile-linha-erro">
                                                {isPendenteSaldo ? (
                                                    <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fdf2f2', color: '#b91c1c', padding: '3px 5px', borderRadius: '4px', border: '1px solid #fecaca', display: 'inline-block' }} title={etiquetaData.mensagemErro || "Erro de pagamento por falta de saldo na carteira do Melhor Envios"}>
                                                        ⚠️falha Pgto - Acesse Painel Melhor Envios
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fffbeb', color: '#b45309', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fde68a', display: 'inline-block' }} title={etiquetaData.mensagemErro}>
                                                        ⚠️ Erro: {etiquetaData.mensagemErro}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pedido.itens?.map((item: any, idx: number) => (
                                        <ItemResumido key={idx} item={item} lojistaId={lojistaIdApp} pedidoLogistica={pedidoLogistica} db={db} />
                                    ))}
                                </div>

                                {expandido && (
                                    <div style={localStyles.conteudoExpandido}>
                                        <div className="grid-expandido" style={localStyles.gridExpandido}>
                                            {/* BLOCO 1: PERSONALIZAÇÃO */}
                                            <div style={localStyles.caixaPersonalizacao}>
                                                <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '4px', fontSize: '12px' }}>
                                                    ✨ Personalização:
                                                </div>
                                                {temPersonalizacao ? (
                                                    pedido.itens.map((item: any, idx: number) => {
                                                        const resp = item.respostasFormatadas || item.personalizacao;
                                                        if (!resp || (typeof resp === 'object' && Object.keys(resp).length === 0)) return null;
                                                        return (
                                                            <div key={idx} style={{ fontSize: '11px', color: '#78350f', lineHeight: '1.3', marginBottom: '4px' }}>
                                                                {typeof resp === 'object' ? (
                                                                    Object.entries(resp).map(([k, v]) => (
                                                                        <div key={k}>{k}: <strong>{String(v)}</strong></div>
                                                                    ))
                                                                ) : (
                                                                    <div>{String(resp)}</div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div style={{ fontSize: '11px', color: '#92400e', fontStyle: 'italic' }}>Sem personalização.</div>
                                                )}
                                            </div>

                                           {/* BLOCO 2: ENDEREÇO DE ENTREGA */}
<div style={localStyles.caixaBlocoPadrao}>
    <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '4px', fontSize: '12px' }}>📍 Endereço</div>
    <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
        {isRetirada ? (
            <strong>Retirada na Loja física</strong>
        ) : (
            <>
                <strong>Rua:</strong> {endereco.dsRuaCliente || endereco.rua || '-'}<br />
                <strong>Número:</strong> {endereco.dsNumeroCliente || endereco.numero || '-'}<br />
                <strong>Bairro:</strong> {endereco.dsBairroCliente || endereco.bairro || '-'}<br />
                <strong>Cidade:</strong> {endereco.dsCidadeCliente || endereco.cidade || '-'}<br />
                <strong>UF:</strong> {endereco.dsUfCliente || endereco.uf || '-'}<br />
                <strong>CEP:</strong> {endereco.dsCepCliente || endereco.cep || '-'}
            </>
        )}
    </div>
</div>

                                            {/* BLOCO 3: TRANSPORTADORA / LOGÍSTICA */}
                                            <div style={localStyles.caixaBlocoPadrao}>
                                                <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '4px', fontSize: '12px' }}>🚚 Logística</div>
                                                <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
                                                    {!precisaFrete ? (
                                                        <div style={{ color: '#64748b', fontStyle: 'italic' }}>Pedido sem Frete</div>
                                                    ) : isRetirada ? (
                                                        <div>
                                                            <div><strong>Forma:</strong> Retirada</div>
                                                            <div><strong>Status:</strong> Grátis</div>
                                                        </div>
                                                    ) : isDigital ? (
                                                        <div>
                                                            <div><strong>Forma:</strong> Digital</div>
                                                        </div>
                                                    ) : (pedido.financeiro?.dsTransportadoraId || cotacao.dsTransportadoraIdCotado || isEtqGerada) ? (
                                                        <div>
                                                            <div><strong>Método:</strong> {cotacao.dsMetodoPagamentoCotado || pedido.financeiro?.metodo?.replace('Logística: ', '') || pedidoLogistica.dsMetodoPagamento || "Definida"}</div>
                                                            <div><strong>Valor:</strong> R$ {Number(cotacao.vlFreteCotado ?? pedido.financeiro?.vlFrete ?? 0).toFixed(2).replace('.', ',')}</div>
                                                            <div><strong>Prazo:</strong> {cotacao.prazoEntregaCotado ?? pedido.financeiro?.prazoEntrega ?? 0} dias</div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ color: '#d97706', marginBottom: '4px' }}>Precisa Cotar Frete</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* BLOCO 4: DADOS DA ETIQUETA */}
                                            <div style={localStyles.caixaBlocoPadrao}>
                                                <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '4px', fontSize: '12px' }}>🏷️ Etiqueta</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                                                    {!precisaFrete ? (
                                                        <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>
                                                            Sem etiquetas
                                                        </div>
                                                    ) : pedido.etiquetaGerada || etiquetaData.statusEtiqueta ? (
                                                        <div style={{ fontSize: '10px', color: '#047857', lineHeight: '1.3' }}>
                                                            <div><b>Id:</b> {etiquetaData.IdEtiqueta || pedido.idEtiqueta || '-'}</div>
                                                            <div><b>Cód Envio:</b> {etiquetaData.codigoEnvio || '-'}</div>
                                                            <div><b>Status Pagto:</b> <span style={{ color: isPendenteSaldo ? '#b91c1c' : '#047857', fontWeight: 'bold' }}>{etiquetaData.statusEtiqueta || pedido.statusEtiqueta || 'Pendente'}</span></div>
                                                            {etiquetaData.mensagemErro && (
                                                                <div style={{ color: isPendenteSaldo ? '#b91c1c' : '#b45309' }}><b>Erro:</b> {etiquetaData.mensagemErro}</div>
                                                            )}
                                                            <div><b>Rastreio:</b> {etiquetaData.dsNumRastreio || pedido.dsNumRastreio || '-'}</div>
                                                            <div><b>Serviço:</b> {etiquetaData.servicoVinculado || '-'}</div>
                                                            <div><b>Valor Cobrado:</b> R$ {Number(etiquetaData.valorCobrado ?? 0).toFixed(2).replace('.', ',')}</div>
                                                            {etiquetaData.urlEtiqueta || pedido.urlEtiqueta ? (
                                                                <a href={etiquetaData.urlEtiqueta || pedido.urlEtiqueta} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'block', marginTop: '2px' }}>
                                                                    Ver Etiqueta PDF
                                                                </a>
                                                            ) : null}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                                                            Aguardando emissão
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            
                                            {/* BLOCO 5: PAGAMENTO / RESUMO FINANCEIRO COMPLETO */}
                                            <div style={localStyles.caixaBlocoPadrao}>
                                                <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '6px', fontSize: '13px' }}>💳 Pagamento</div>
                                                <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
                                                    <div><strong>Subtotal:</strong> R$ {subtotalVal.toFixed(2).replace('.', ',')}</div>
                                                    <div><strong>Frete:</strong> R$ {freteVal.toFixed(2).replace('.', ',')}</div>
                                                    <div style={{ color: descontoVal > 0 ? '#16a34a' : 'inherit' }}>
                                                        <strong>Desconto:</strong> {descontoVal > 0 ? `-R$ ${descontoVal.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                                                    </div>
                                                    <div><strong>Cupom:</strong> {cupomStr}</div>

                                                    <div style={{ marginTop: '3px', borderTop: '1px solid #e2e8f0', paddingTop: '3px' }}>
                                                        <strong>Total:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>R$ {totalVal.toFixed(2).replace('.', ',')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {totalPaginas > 1 && (
                <div style={styles.paginationContainer}>
                    <button disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)} style={styles.pageBtn}>Anterior</button>
                    <span style={{ margin: '0 15px', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Página {paginaAtual} de {totalPaginas}</span>
                    <button disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => p + 1)} style={styles.pageBtn}>Próxima</button>
                </div>
            )}
        </div>
    );
}

const ItemResumido = React.memo(({ item, lojistaId, pedidoLogistica, db }: any) => {
    const idProd = item.idProduto || item.id;
    const { data: produtoData } = useSWR(
        idProd && lojistaId ? `lojistas/${lojistaId}/produtos/${idProd}` : null,
        (key) => fetchProduto(key, db),
        { revalidateOnFocus: false }
    );

    const selo = obterSeloItem(item, pedidoLogistica);
    const qtd = item.quantidade || item.qty || 1;

    const fotoUrl = useMemo(() => {
        const fotoDireta = extrairFotoDoItem(item);
        if (fotoDireta) return fotoDireta;
        if (produtoData) {
            if (item.variacao && Array.isArray(produtoData.variacoes)) {
                const match = produtoData.variacoes.find((v: any) => v.nome === item.variacao);
                if (match?.foto) return match.foto;
            }
            return produtoData.capa || "";
        }
        return "";
    }, [item, produtoData]);

    return (
        <div style={localStyles.itemLinhaResumida}>
            <img src={fotoUrl || "https://placehold.co/40x40?text=Prod"} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', backgroundColor: selo.cor, color: '#fff' }}>
                        {selo.texto}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                        {qtd}x {item.nome || item.title}
                    </span>
                </div>
                {item.variacao && (
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '2px' }}>
                        Variação: {item.variacao}
                    </span>
                )}
            </div>
        </div>
    );
});

const styles: { [key: string]: React.CSSProperties } = {
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', marginTop: '10px' },
    pageBtn: { padding: '8px 16px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }
};

const localStyles: { [key: string]: React.CSSProperties } = {
    cardContainer: { borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    cardHeaderLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', minHeight: '45px', boxSizing: 'border-box' },
    itemLinhaResumida: { display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 8px', backgroundColor: '#fdfdfd', borderRadius: '6px', border: '1px solid #f1f5f9' },
    conteudoExpandido: { padding: '16px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' },
    gridExpandido: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px' },
    caixaPersonalizacao: { backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px' },
    caixaBlocoPadrao: { backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' }
};