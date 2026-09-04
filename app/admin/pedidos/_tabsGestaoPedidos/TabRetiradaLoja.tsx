// components/_tabsGestaoPedidos/TabRetiradaLoja.tsx
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Pedido } from '@/types/pedido';
import { doc, updateDoc } from 'firebase/firestore';

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

interface TabRetiradaLojaProps {
    pedidos: Pedido[];
    lojistaIdApp: string;
    db: any;
    dadosLoja: any;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    selecionados: string[];
    setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
    mudarStatusDireto: (pedido: Pedido, novoStatus: string) => Promise<void>;
    registrarFuncaoConcluirRetirada?: (fn: () => void) => void;
}

const formatarData = (dataStr: string | undefined): string => {
    if (!dataStr) return '-';
    try {
        const data = new Date(dataStr);
        return data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch (e) { return dataStr; }
};

const extrairFotoDoItem = (item: any): string => {
    const chavesPossiveis = ['dsFotoCapaProduto', 'foto', 'imagem', 'image', 'url', 'urlOriginal', 'thumb'];
    for (const chave of chavesPossiveis) {
        if (item[chave] && typeof item[chave] === 'string' && item[chave].startsWith('http')) return item[chave];
    }
    if (item.variacaoSelecionada?.foto) return item.variacaoSelecionada.foto;
    return "";
};

const obterSeloItem = (item: any, pedidoLogistica: any) => {
    const tipoProduto = String(item.dsTipoProduto || item.tipoProduto || '').trim().toLowerCase();
    if (tipoProduto === 'digital_download' || tipoProduto === 'digital_personalizado' || tipoProduto === 'digital' || item.isPrecisaFreteProduto === false || item.precisaFrete === false) {
        return { texto: "Digital", cor: "#3b82f6" };
    }

    const formaItem = String(item.dsFormaEntrega || pedidoLogistica?.dsFormaEntrega || '').trim().toLowerCase();
    if (formaItem === 'retirada') return { texto: "Retirada", cor: "#f59e0b" };
    if (formaItem === 'entrega_local' || pedidoLogistica?.dsTransportadoraId === 'entrega_local') return { texto: "Local", cor: "#8b5cf6" };

    return { texto: "Envio", cor: "#10b981" };
};

export default function TabRetiradaLoja({
    pedidos, lojistaIdApp, db, setLocalPedidos, selecionados = [], setSelecionados, mudarStatusDireto, registrarFuncaoConcluirRetirada
}: TabRetiradaLojaProps) {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO INÍCIO DO COMPONENTE
    const { theme } = useTheme();

    const [processandoMassa, setProcessandoMassa] = useState(false);
    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    // Paginação com seletor dinâmico (20, 40, 60)
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(20);

    const pedidosRetiradaLoja = useMemo(() => {
        return pedidos.filter(p => {
            if (!p) return false;
            const statusGeral = String(p.status || '').trim().toLowerCase();
            if (statusGeral === 'concluído' || statusGeral === 'enviado' || (p as any).enviado === true) return false;

            const pedidoLogistica = (p as any).logistica || {};
            const formaEntrega = String(pedidoLogistica.dsFormaEntrega || (p as any).dsFormaEntrega || '').toLowerCase();
            const isRetirada = pedidoLogistica.isRetirada === true || formaEntrega === 'retirada' || (p as any).retirada || (p as any).retirarNaLoja;

            if (!isRetirada) return false;

            return true;
        });
    }, [pedidos]);

    const pedidosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        return pedidosRetiradaLoja.slice(inicio, inicio + itensPorPagina);
    }, [pedidosRetiradaLoja, paginaAtual, itensPorPagina]);

    const totalPaginas = Math.ceil(pedidosRetiradaLoja.length / itensPorPagina) || 1;

    const idsVisiveisNestaAba = useMemo(() => pedidosRetiradaLoja.map(p => p.id), [pedidosRetiradaLoja]);

    const toggleExpandir = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPedidosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copiarIdCompleto = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        alert(`📋 ID do pedido copiado com sucesso!\n\n${id}`);
    };

    const concluirRetiradaEmLote = async () => {
        const selecionadosAtuais = (selecionados || []).filter(id => idsVisiveisNestaAba.includes(id));
        if (selecionadosAtuais.length === 0) return alert("Nenhum pedido selecionado para concluir a retirada.");
        if (!db || !lojistaIdApp) return;

        if (!confirm(`Deseja realmente marcar os ${selecionadosAtuais.length} pedidos selecionados como retirados/concluídos?`)) {
            return;
        }

        setProcessandoMassa(true);
        try {
            for (const idPedido of selecionadosAtuais) {
                const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", idPedido);
                await updateDoc(pedidoRef, {
                    status: 'Concluído',
                    enviado: true,
                    "StatusProducao.dsStatusProducao": "Concluído"
                });
            }

            setLocalPedidos(prev => prev.map(p => selecionadosAtuais.includes(p.id) ? {
                ...p,
                status: 'Concluído',
                enviado: true
            } : p));

            setSelecionados(prev => prev.filter(id => !selecionadosAtuais.includes(id)));
            alert("✅ Pedidos de retirada concluídos com sucesso!");
        } catch (e: any) {
            alert("Erro ao concluir pedidos em lote: " + e.message);
        } finally {
            setProcessandoMassa(false);
        }
    };

    useEffect(() => {
        if (registrarFuncaoConcluirRetirada) {
            registrarFuncaoConcluirRetirada(concluirRetiradaEmLote);
        }
    }, [selecionados, pedidosRetiradaLoja, idsVisiveisNestaAba, processandoMassa]);

    return (
        <div style={{ background: theme.bgCard, color: theme.textMain, padding: '16px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
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
                        background-color: ${theme.border} !important;
                        color: ${theme.textMain} !important;
                        padding: 4px 8px !important;
                        border-radius: 4px !important;
                        font-weight: 600 !important;
                        cursor: pointer !important;
                        border: 1px solid ${theme.border} !important;
                        white-space: nowrap !important;
                        display: inline-block !important;
                    }
                    .grid-expandido {
                        grid-template-columns: 1fr !important;
                        gap: 10px !important;
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', minHeight: '52px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h3 style={{ margin: 0, color: theme.textMain, fontSize: '18px' }}>🏪 Retirada na Loja</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSec }}>Gerencie os pedidos que os clientes selecionaram para retirar diretamente na loja física.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minHeight: '40px', marginLeft: 'auto' }}>
                    {/* Seletor de itens por página */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: theme.textSec, fontWeight: 'bold' }}>
                        <span>Mostrar:</span>
                        <select
                            value={itensPorPagina}
                            onChange={(e) => { setItensPorPagina(Number(e.target.value)); setPaginaAtual(1); }}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            <option value={20}>20</option>
                            <option value={40}>40</option>
                            <option value={60}>60</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pedidosRetiradaLoja.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>
                        Nenhum pedido de retirada na loja pendente no momento. 🎉
                    </div>
                ) : (
                    pedidosPaginados.map(pedido => {
                        const clienteObj = (pedido as any).dsCliente || {};
                        const nomeCliente = typeof clienteObj === 'object' ? (clienteObj.nmNomeCliente || clienteObj.nome || "Cliente") : (clienteObj || "Cliente");

                        // 🌟 Número do pedido direto da raiz
                        const numPedidoFormatado = String((pedido as any).nrNumeroPedido ?? (pedido as any).numeroPedido ?? (pedido as any).numero ?? (pedido as any).id?.slice(-4) ?? "").padStart(5, '0');

                        const expandido = !!pedidosExpandidos[pedido.id];
                        const idPedidoExibicao = String(pedido.id || "");
                        const idEncurtadoMobile = idPedidoExibicao.length > 10 ? `${idPedidoExibicao.slice(0, 6)}...${idPedidoExibicao.slice(-4)}` : idPedidoExibicao;

                        const pedidoLogistica = (pedido as any).logistica || {};
                        const endereco = (pedido as any).dsEndereco || pedido.endereco || (pedido as any).cliente?.endereco || {};
                        const formaEntrega = String(pedidoLogistica.dsFormaEntrega || (pedido as any).dsFormaEntrega || '').toLowerCase();
                        const isRetirada = pedidoLogistica.isRetirada === true || formaEntrega === 'retirada' || (pedido as any).retirada || (pedido as any).retirarNaLoja;

                        const temPersonalizacao = pedido.itens?.some((i: any) => {
                            const resp = i.dsRespostasPersonalizadasProduto || i.respostasFormatadas || i.personalizacao;
                            if (!resp) return false;
                            if (typeof resp === 'object' && Object.keys(resp).length > 0) return true;
                            if (typeof resp === 'string' && resp.trim() !== '') return true;
                            return false;
                        });

                        const isPagoReal = (pedido as any).pago === true || (pedido as any).StatusProducao?.isPago === true || String((pedido as any).statusPagamento || '').toLowerCase() === 'pago';
                        const corBordaCard = isPagoReal ? '#2ecc71' : '#e74c3c';

                        const fin = (pedido as any).financeiro || {};
                        const subtotalVal = Number(fin.vlSubtotal ?? fin.subtotal ?? 0);
                        const freteVal = Number(pedidoLogistica.vlFrete ?? fin.vlFrete ?? fin.valorFrete ?? 0);
                        const descontoVal = Number(fin.vlDesconto ?? fin.desconto ?? 0);
                        const totalVal = Number(fin.vlTotal ?? fin.total ?? (subtotalVal + freteVal - descontoVal));
                        const cupomStr = fin.dsCupom ?? fin.cupom ?? "-";

                        return (
                            <div key={pedido.id} style={{ ...localStyles.cardContainer, backgroundColor: theme.bgCard, border: `1.5px solid ${corBordaCard}` }}>
                                <div
                                    onClick={(e) => toggleExpandir(e, pedido.id)}
                                    className="card-header-linha"
                                    style={{ ...localStyles.cardHeaderLinha, backgroundColor: theme.inputBg, borderColor: theme.border }}
                                >
                                    <div className="pc-bloco-linha-unica">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selecionados.includes(pedido.id)}
                                                onChange={() => setSelecionados(prev => prev.includes(pedido.id) ? prev.filter(item => item !== pedido.id) : [...prev, pedido.id])}
                                                style={{ transform: 'scale(1.2)', cursor: 'pointer', flexShrink: 0 }}
                                            />
                                            <span style={{ fontWeight: '800', color: theme.primary, fontSize: '15px', width: '50px', flexShrink: 0 }}>#{numPedidoFormatado}</span>

                                            {/* 🌟 Badge de Origem PC */}
                                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: ((pedido as any).dsOrigemPedido || (pedido as any).origemPedido || "").toLowerCase() === 'pdv' ? '#8b5cf6' : '#3b82f6', color: '#fff', textTransform: 'uppercase', flexShrink: 0 }}>
                                                {(pedido as any).dsOrigemPedido || (pedido as any).origemPedido || 'Site'}
                                            </span>

                                            <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '14px', width: '220px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                            <span style={{ fontSize: '12px', color: theme.textSec, fontFamily: 'monospace', backgroundColor: theme.border, padding: '2px 6px', borderRadius: '4px', width: '220px', flexShrink: 0, wordBreak: 'break-all' }} title={idPedidoExibicao}>ID Pedido: {idPedidoExibicao}</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0, marginLeft: '10px' }}>
                                            <span style={{ fontSize: '12px', color: theme.textSec, fontWeight: '500' }}>
                                                {formatarData((pedido as any).data || clienteObj.data)}
                                            </span>
                                            <span style={{ fontSize: '12px', color: theme.textSec }}>{expandido ? '▲' : '▼'}</span>
                                        </div>
                                    </div>

                                    <div className="mobile-bloco-organizado" style={{ display: 'none' }}>
                                        <div className="mobile-linha-topo">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selecionados.includes(pedido.id)}
                                                    onChange={() => setSelecionados(prev => prev.includes(pedido.id) ? prev.filter(item => item !== pedido.id) : [...prev, pedido.id])}
                                                    style={{ transform: 'scale(1.2)', cursor: 'pointer', flexShrink: 0 }}
                                                />
                                                <span style={{ fontWeight: '800', color: theme.primary, fontSize: '15px', flexShrink: 0 }}>#{numPedidoFormatado}</span>

                                                {/* 🌟 Badge de Origem Mobile */}
                                                <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '4px', backgroundColor: ((pedido as any).dsOrigemPedido || (pedido as any).origemPedido || "").toLowerCase() === 'pdv' ? '#8b5cf6' : '#3b82f6', color: '#fff', textTransform: 'uppercase', flexShrink: 0 }}>
                                                    {(pedido as any).dsOrigemPedido || (pedido as any).origemPedido || 'Site'}
                                                </span>

                                                <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '14px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                            </div>
                                        </div>

                                        <div className="mobile-linha-baixo">
                                            <span
                                                className="mobile-id-badge"
                                                onClick={(e) => copiarIdCompleto(e, idPedidoExibicao)}
                                                title="Toque para copiar o ID completo"
                                            >
                                                📋 ID: {idEncurtadoMobile}
                                            </span>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                <span style={{ fontSize: '11px', color: theme.textSec, fontWeight: '500' }}>
                                                    {formatarData((pedido as any).data || clienteObj.data)}
                                                </span>
                                                <span style={{ fontSize: '12px', color: theme.textSec }}>{expandido ? '▲' : '▼'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pedido.itens?.map((item: any, idx: number) => (
                                        <ItemResumido key={idx} item={item} pedidoLogistica={pedidoLogistica} />
                                    ))}
                                </div>

                                {expandido && (() => {
                                    const embalagemData = (pedido as any).Embalagem || (pedido as any).embalagemRecomendada || {};

                                    // Mapeamento seguro para suportar a estrutura aninhada (recomendada / escolhida) e modelos antigos planos
                                    const recomendada = embalagemData.recomendada || embalagemData;
                                    const escolhida = embalagemData.escolhida || null;

                                    const modeloRecomendado = recomendada.dsModeloEmbalagemRecomendado || recomendada.nomeInsumo || recomendada.nome || "Não calculada";
                                    const tipoRecomendado = recomendada.dsTipoEmbalagem || recomendada.tipo || "-";
                                    const custoRecomendado = Number(recomendada.vlCustoEmbalagemRecomendado || recomendada.custo || 0);

                                    const modeloEscolhido = escolhida?.dsModeloEmbalagemEscolhida || escolhida?.dsModeloEmbalagemRecomendado || escolhida?.nome || "";
                                    const tipoEscolhido = escolhida?.dsTipoEmbalagem || escolhida?.tipo || "";
                                    const custoEscolhido = Number(escolhida?.vlCustoEmbalagemEscolhida || escolhida?.vlCustoEmbalagemRecomendado || escolhida?.custo || 0);

                                    return (
                                        <div style={{ ...localStyles.conteudoExpandido, backgroundColor: theme.inputBg, borderColor: theme.border }}>
                                            {/* 📦 Embalagens (Recomendada vs Escolhida) abaixo dos itens e acima dos 5 cards */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '15px' }}>📦</span>
                                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>Embalagem Recomendada:</span>
                                                    <span style={{ fontSize: '12px', fontWeight: '600', color: theme.primary, backgroundColor: theme.inputBg, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${theme.border}` }}>
                                                        {modeloRecomendado} ({String(tipoRecomendado).replace('_', ' ')})
                                                    </span>

                                                    {modeloEscolhido && modeloEscolhido !== modeloRecomendado && (
                                                        <>
                                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textSec, marginLeft: '8px' }}>| Escolhida:</span>
                                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a', backgroundColor: '#e6f4ea', padding: '2px 8px', borderRadius: '4px', border: '1px solid #34a853' }}>
                                                                {modeloEscolhido} ({String(tipoEscolhido).replace('_', ' ')})
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid-expandido" style={localStyles.gridExpandido}>
                                                <div style={{ ...localStyles.caixaPersonalizacao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                    <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '4px', fontSize: '12px' }}>
                                                        ✨ Personalização:
                                                    </div>
                                                    {temPersonalizacao ? (
                                                        pedido.itens.map((item: any, idx: number) => {
                                                            const resp = item.dsRespostasPersonalizadasProduto || item.respostasFormatadas || item.personalizacao;
                                                            if (!resp || (typeof resp === 'object' && Object.keys(resp).length === 0)) return null;
                                                            return (
                                                                <div key={idx} style={{ fontSize: '11px', color: theme.textMain, lineHeight: '1.3', marginBottom: '4px' }}>
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
                                                        <div style={{ fontSize: '11px', color: theme.textSec, fontStyle: 'italic' }}>Sem personalização.</div>
                                                    )}
                                                </div>

                                                <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                    <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>📍 Endereço</div>
                                                    <div style={{ fontSize: '11px', color: theme.textSec, lineHeight: '1.4' }}>
                                                        {isRetirada ? (
                                                            <strong>Retirada na Loja física</strong>
                                                        ) : (
                                                            <>
                                                                {endereco.dsRuaCliente || endereco.rua}, {endereco.dsNumeroCliente || endereco.numero}
                                                                <br />
                                                                {endereco.dsBairroCliente || endereco.bairro} - {endereco.dsCidadeCliente || endereco.cidade}/{endereco.dsUfCliente || endereco.uf}
                                                                <br />
                                                                CEP: {endereco.dsCepCliente || endereco.cep}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                    <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>🚚 Logística</div>
                                                    <div style={{ fontSize: '11px', color: theme.textSec, lineHeight: '1.4' }}>
                                                        <div><strong>Forma:</strong> Retirada na Loja</div>
                                                        <div><strong>Status:</strong> Retirar na Loja (Grátis)</div>
                                                    </div>
                                                </div>

                                                <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                    <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>🏷️ Etiqueta</div>
                                                    <div style={{ fontSize: '10px', color: theme.textSec, fontStyle: 'italic' }}>
                                                        Pedido sem etiqueta
                                                    </div>
                                                </div>

                                                <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                    <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '6px', fontSize: '13px' }}>💳 Pagamento</div>
                                                    <div style={{ fontSize: '11px', color: theme.textSec, lineHeight: '1.4' }}>
                                                        <div>
                                                            <strong>Forma:</strong> {
                                                                fin.dsFormaPagamentoCarrinho
                                                                    ? fin.dsFormaPagamentoCarrinho.replace('_', ' ').toUpperCase()
                                                                    : 'PIX'
                                                            }
                                                        </div>
                                                        {fin.vlEntrada > 0 ? (
                                                            <div style={{ marginTop: '4px', background: theme.inputBg, padding: '6px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                                                                <div style={{ color: theme.primary, fontWeight: 'bold', marginBottom: '2px' }}>📦 Venda Parcelada / Encomenda</div>
                                                                <div><strong>Entrada Paga:</strong> R$ {Number(fin.vlEntrada).toFixed(2).replace('.', ',')}</div>
                                                                <div><strong>Restante:</strong> R$ {Number(fin.vlRestante || (totalVal - fin.vlEntrada)).toFixed(2).replace('.', ',')}</div>
                                                                <div><strong>Quitação / Retirada:</strong> {fin.dsPrazoRestante || 'Não informada'}</div>
                                                                <div><strong>Status Parcial:</strong> <span style={{ color: fin.statusPagamento === 'pago' ? '#16a34a' : '#d97706', fontWeight: 'bold' }}>{fin.statusPagamento?.toUpperCase() || 'PARCIAL'}</span></div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ marginTop: '3px' }}>
                                                                <strong>Condição:</strong> Pagamento Total (À Vista)
                                                            </div>
                                                        )}
                                                        <div style={{ marginTop: '6px', borderTop: `1px solid ${theme.border}`, paddingTop: '4px' }}>
                                                            <strong>Subtotal:</strong> R$ {subtotalVal.toFixed(2).replace('.', ',')}
                                                        </div>
                                                        <div><strong>Frete:</strong> R$ {freteVal.toFixed(2).replace('.', ',')}</div>
                                                        <div style={{ color: descontoVal > 0 ? '#16a34a' : 'inherit' }}>
                                                            <strong>Desconto:</strong> {descontoVal > 0 ? `-R$ ${descontoVal.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                                                        </div>
                                                        <div><strong>Cupom:</strong> {cupomStr}</div>
                                                        <div style={{ marginTop: '4px', borderTop: `1px solid ${theme.border}`, paddingTop: '4px' }}>
                                                            <strong>Total:</strong> <span style={{ color: theme.primary, fontWeight: 'bold' }}>R$ {totalVal.toFixed(2).replace('.', ',')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })
                )}
            </div>

            {totalPaginas > 1 && (
                <div style={styles.paginationContainer}>
                    <button disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)} style={{ ...styles.pageBtn, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}>Anterior</button>
                    <span style={{ margin: '0 15px', fontSize: '13px', fontWeight: 'bold', color: theme.textSec }}>Página {paginaAtual} de {totalPaginas}</span>
                    <button disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => p + 1)} style={{ ...styles.pageBtn, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}>Próxima</button>
                </div>
            )}
        </div>
    );
}

const ItemResumido = React.memo(({ item, pedidoLogistica }: any) => {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO ITEM RESUMIDO
    const { theme } = useTheme();

    const selo = obterSeloItem(item, pedidoLogistica);
    const qtd = item.nrQuantidadeProduto || item.quantidade || item.qty || 1;

    // 🌟 Captura o preço unitário do item usando as novas chaves
    const precoUnitario = Number(item.vlPrecoProduto || item.preco || item.valor || item.valorUnitario || 0);
    const valorTotalItem = precoUnitario * qtd;

    // 🚀 Lógica otimizada: Consome a foto diretamente do item salvo no pedido
    const fotoUrl = useMemo(() => {
        return extrairFotoDoItem(item);
    }, [item]);

    return (
        <div style={{ ...localStyles.itemLinhaResumida, backgroundColor: theme.inputBg, borderColor: theme.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <img src={fotoUrl || "https://placehold.co/40x40?text=Prod"} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', backgroundColor: selo.cor, color: '#fff' }}>
                            {selo.texto}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>
                            {qtd}x {item.dsNomeProduto || item.nome || item.title}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {item.dsVariacaoProduto && (
                            <span style={{ fontSize: '12px', color: theme.textSec, marginLeft: '2px' }}>
                                Variação: {item.dsVariacaoProduto}
                            </span>
                        )}
                        {/* 🌟 Exibição padronizada do valor unitário e total do item */}
                        <span style={{ fontSize: '12px', fontWeight: '600', color: theme.primary }}>
                            R$ {precoUnitario.toFixed(2).replace('.', ',')} un {qtd > 1 ? `(Total: R$ ${valorTotalItem.toFixed(2).replace('.', ',')})` : ''}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

const styles: { [key: string]: React.CSSProperties } = {
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', marginTop: '10px' },
    pageBtn: { padding: '8px 16px', cursor: 'pointer', border: '1px solid', borderRadius: '4px', fontWeight: 'bold' }
};

const localStyles: { [key: string]: React.CSSProperties } = {
    cardContainer: { borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    cardHeaderLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid', cursor: 'pointer', minHeight: '45px', boxSizing: 'border-box' },
    itemLinhaResumida: { display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 8px', borderRadius: '6px', border: '1px solid' },
    conteudoExpandido: { padding: '16px', borderTop: '1px solid' },
    gridExpandido: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px' },
    caixaPersonalizacao: { border: '1px solid', borderRadius: '8px', padding: '10px' },
    caixaBlocoPadrao: { border: '1px solid', borderRadius: '8px', padding: '10px' }
};