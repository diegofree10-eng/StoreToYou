// components/_tabsGestaoPedidos/TabEnviados.tsx
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Pedido } from '@/types/pedido';

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

interface TabEnviadosProps {
    pedidos: Pedido[];
    loading: boolean;
    lojistaIdApp: string;
    db: any;
    mudarStatusDireto: (p: Pedido, status: string) => void;
    setLocalPedidos?: React.Dispatch<React.SetStateAction<Pedido[]>>;
    selecionados?: string[];
    setSelecionados?: React.Dispatch<React.SetStateAction<string[]>>;
    registrarFuncaoConfirmarRecebimento?: (fn: () => void) => void;
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
    const formaItem = String(item.dsFormaEntrega || pedidoLogistica?.dsFormaEntrega || '').trim().toLowerCase();
    const isRetirada = pedidoLogistica?.isRetirada === true || formaItem === 'retirada';
    const isDigital = item.isPrecisaFreteProduto === false || item.precisaFrete === false || formaItem === 'digital';

    if (isRetirada) return { texto: "Retirada", cor: "#f59e0b" };
    if (isDigital) return { texto: "Digital", cor: "#3b82f6" };
    return { texto: "Envio", cor: "#10b981" };
};

export default function TabPedidosEnviados({
    pedidos, loading, lojistaIdApp, db, mudarStatusDireto, setLocalPedidos, selecionados = [], setSelecionados = () => { }, registrarFuncaoConfirmarRecebimento
}: TabEnviadosProps) {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO INÍCIO DO COMPONENTE
    const { theme } = useTheme();

    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(20);

    const pedidosEnviados = useMemo(() => {
        return (pedidos || []).filter(p => {
            if (!p) return false;

            const statusGeral = String(p.dsStatusPedido || p.status || '').trim().toLowerCase();
            const statusProd = String((p as any).StatusProducao?.dsStatusProducao || '').trim().toLowerCase();
            const isConcluidoFlag = (p as any).enviado === true && statusGeral === 'concluído';

            // 🛑 Bloqueio absoluto: Se o pedido estiver concluído por qualquer via, remove imediatamente da aba de enviados
            if (statusGeral === 'concluído' || statusGeral === 'concluido' || statusProd === 'concluído' || statusProd === 'concluido' || isConcluidoFlag) {
                return false;
            }

            const etiquetaGerada = (p as any).Etiqueta?.isEtiquetaGerada === true || p.etiquetaGerada === true || p.statusEtiqueta === 'paga' || p.statusEtiqueta === 'enviado';
            return etiquetaGerada || p.dsNumRastreio || p.rastreio || p.codigoRastreio || (p as any).logistica?.tracking;
        });
    }, [pedidos]);

    const totalPaginas = Math.ceil(pedidosEnviados.length / itensPorPagina) || 1;

    useEffect(() => {
        if (paginaAtual > totalPaginas) {
            setPaginaAtual(totalPaginas);
        }
    }, [totalPaginas, paginaAtual]);

    const pedidosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        return pedidosEnviados.slice(inicio, inicio + itensPorPagina);
    }, [pedidosEnviados, paginaAtual, itensPorPagina]);

    const idsVisiveisNestaAba = useMemo(() => pedidosEnviados.map(p => p.id), [pedidosEnviados]);

    const toggleExpandir = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPedidosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copiarIdCompleto = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        alert(`📋 ID do pedido copiado com sucesso!\n\n${id}`);
    };

    const executarConclusao = (pedidoAlvo: Pedido) => {
        mudarStatusDireto(pedidoAlvo, 'Concluído');

        if (setLocalPedidos) {
            setLocalPedidos(prev => prev.map(p => {
                if (p.id === pedidoAlvo.id) {
                    return {
                        ...p,
                        dsStatusPedido: 'Concluído',
                        enviado: true,
                        StatusProducao: {
                            ...(p as any).StatusProducao,
                            dsStatusProducao: 'Concluído',
                            isConcluido: true
                        }
                    };
                }
                return p;
            }));
        }
    };

    const confirmarRecebimentoEmLote = () => {
        const aptos = pedidosEnviados.filter(p => (selecionados || []).includes(p.id));
        if (aptos.length === 0) return alert("Nenhum pedido selecionado.");

        if (!confirm(`Deseja realmente marcar ${aptos.length} pedido(s) como entregue/concluído?`)) return;

        for (const pedido of aptos) {
            executarConclusao(pedido);
        }

        setSelecionados(prev => prev.filter(id => !idsVisiveisNestaAba.includes(id)));
    };

    useEffect(() => {
        if (registrarFuncaoConfirmarRecebimento) {
            registrarFuncaoConfirmarRecebimento(confirmarRecebimentoEmLote);
        }
    }, [selecionados, pedidosEnviados]);

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
                    <h3 style={{ margin: 0, color: theme.textMain, fontSize: '18px' }}>🚚 Pedidos Enviados / Em Trânsito ({pedidosEnviados.length})</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSec }}>Acompanhe o rastreio e atualize para concluído assim que forem entregues.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: theme.textSec, fontWeight: 'bold', marginLeft: 'auto' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>Carregando pedidos enviados...</div>
                ) : pedidosEnviados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec, background: theme.inputBg, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                        Nenhum pedido enviado ou em trânsito no momento. 🎉
                    </div>
                ) : (
                    pedidosPaginados.map(pedido => {
                        const clienteObj = (pedido as any).cliente || {};
                        const nomeCliente = typeof clienteObj === 'object' ? (clienteObj.nmNomeCliente || clienteObj.nome || "Cliente") : (pedido.cliente || "Cliente");
                        const numPedidoFormatado = String((pedido as any).nrNumeroPedido || pedido.numeroPedido || pedido.numero || pedido.id?.slice(-4) || "").padStart(5, '0');
                        const idPedidoExibicao = String(pedido.id || "");
                        const idEncurtadoMobile = idPedidoExibicao.length > 10 ? `${idPedidoExibicao.slice(0, 6)}...${idPedidoExibicao.slice(-4)}` : idPedidoExibicao;
                        const expandido = !!pedidosExpandidos[pedido.id];

                        const logistica = (pedido as any).logistica || {};
                        const etiquetaData = (pedido as any).Etiqueta || {};
                        const codigoRastreio = (pedido as any).dsNumRastreio || etiquetaData.dsNumRastreio || logistica.dsNumRastreio || "Indisponível";
                        const linkRastreio = (pedido as any).linkRastreio || logistica.linkRastreio || `https://www.melhorrastreio.com.br/rastreio/${codigoRastreio}`;

                        const pedidoLogistica = (pedido as any).logistica || {};
                        const cotacao = (pedido as any).Cotacao || {};
                        const endereco = (pedido as any).endereco || clienteObj.endereco || {};
                        const formaEntrega = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();
                        const isRetirada = pedidoLogistica.isRetirada === true || formaEntrega === 'retirada' || (pedido as any).retirada || (pedido as any).retirarNaLoja;
                        const isDigital = formaEntrega === 'digital';
                        const precisaFrete = pedido.itens?.some((i: any) => i.isPrecisaFreteProduto !== false && i.precisaFrete !== false) && !isRetirada && !isDigital;

                        const temPersonalizacao = pedido.itens?.some((i: any) => {
                            const resp = i.dsRespostasPersonalizadasProduto || i.respostasFormatadas || i.personalizacao;
                            if (!resp) return false;
                            if (typeof resp === 'object' && Object.keys(resp).length > 0) return true;
                            if (typeof resp === 'string' && resp.trim() !== '') return true;
                            return false;
                        });

                        const isPagoReal = pedido.pago === true || (pedido as any).StatusProducao?.isPago === true || (pedido as any).financeiro?.dsStatusPagamento === 'pago' || (pedido as any).statusPagamento === 'pago';
                        const corBordaCard = isPagoReal ? '#2ecc71' : '#e74c3c';

                        const fin = pedido.financeiro || {};
                        const subtotalVal = Number(fin.vlSubtotal ?? 0);
                        const freteVal = Number(fin.vlFrete ?? 0);
                        const descontoVal = Number(fin.vlDesconto ?? 0);
                        const totalVal = Number(fin.vlTotal ?? (subtotalVal + freteVal - descontoVal));
                        const cupomStr = fin.dsCupom ?? "-";

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
                                                checked={(selecionados || []).includes(pedido.id)}
                                                onChange={() => setSelecionados(prev => (prev || []).includes(pedido.id) ? (prev || []).filter(i => i !== pedido.id) : [...(prev || []), pedido.id])}
                                                style={{ transform: 'scale(1.2)', cursor: 'pointer', flexShrink: 0 }}
                                            />
                                            <span style={{ fontWeight: '800', color: theme.primary, fontSize: '15px', width: '70px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
                                            <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '14px', width: '220px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                            <span style={{ fontSize: '12px', color: theme.textMain, fontFamily: 'monospace', backgroundColor: theme.border, padding: '2px 6px', borderRadius: '4px', width: '220px', flexShrink: 0, wordBreak: 'break-all' }} title={idPedidoExibicao}>ID Pedido: {idPedidoExibicao}</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0, marginLeft: '10px' }}>
                                            <span style={{ fontSize: '12px', color: theme.textSec, fontWeight: '500' }}>
                                                {formatarData(pedido.timestamp || (pedido as any).data || clienteObj.data)}
                                            </span>
                                            <span style={{ fontSize: '12px', color: theme.textSec }}>{expandido ? '▲' : '▼'}</span>
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
                                                <span style={{ fontWeight: '800', color: theme.primary, fontSize: '15px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
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
                                                    {formatarData(pedido.timestamp || (pedido as any).data || clienteObj.data)}
                                                </span>
                                                <span style={{ fontSize: '12px', color: theme.textSec }}>{expandido ? '▲' : '▼'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pedido.itens?.map((item: any, idx: number) => (
                                        <ItemResumido
                                            key={idx}
                                            item={item}
                                            pedidoLogistica={pedidoLogistica}
                                            pedido={pedido}
                                            isFirstItem={idx === 0}
                                        />
                                    ))}
                                </div>

                                {expandido && (
                                    <div style={{ ...localStyles.conteudoExpandido, backgroundColor: theme.inputBg, borderColor: theme.border }}>
                                        <div className="grid-expandido" style={localStyles.gridExpandido}>
                                            <div style={{ ...localStyles.caixaPersonalizacao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '6px', fontSize: '13px' }}>
                                                    ✨ Personalização:
                                                </div>
                                                {temPersonalizacao ? (
                                                    pedido.itens.map((item: any, idx: number) => {
                                                        const resp = item.dsRespostasPersonalizadasProduto || item.respostasFormatadas || item.personalizacao;
                                                        if (!resp || (typeof resp === 'object' && Object.keys(resp).length === 0)) return null;
                                                        return (
                                                            <div key={idx} style={{ fontSize: '12px', color: theme.textMain, lineHeight: '1.4', marginBottom: '4px' }}>
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
                                                    <div style={{ fontSize: '12px', color: theme.textSec, fontStyle: 'italic' }}>Este pedido não tem personalização.</div>
                                                )}
                                            </div>

                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>📍 Endereço de entrega </div>
                                                <div style={{ fontSize: '11px', color: theme.textSec, lineHeight: '1.4' }}>
                                                    <strong>Rua:</strong> {endereco.dsRuaCliente || endereco.rua || '-'}<br />
                                                    <strong>Número:</strong> {endereco.dsNumeroCliente || endereco.numero || '-'}<br />
                                                    <strong>Bairro:</strong> {endereco.dsBairroCliente || endereco.bairro || '-'}<br />
                                                    <strong>Cidade:</strong> {endereco.dsCidadeCliente || endereco.cidade || '-'}&nbsp;&nbsp;<strong>UF:</strong> {endereco.dsUfCliente || endereco.uf || '-'}<br />
                                                    <strong>CEP:</strong> {endereco.dsCepCliente || endereco.cep || '-'}
                                                </div>
                                            </div>

                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>🚚 Logística</div>
                                                <div style={{ fontSize: '11px', color: theme.textSec, lineHeight: '1.4' }}>
                                                    {!precisaFrete ? (
                                                        <div style={{ color: theme.textSec, fontStyle: 'italic' }}>Pedido sem Frete</div>
                                                    ) : isRetirada ? (
                                                        <div>
                                                            <div><strong>Forma:</strong> Retirada na Loja</div>
                                                            <div><strong>Status:</strong> {pedidoLogistica.dsServico || pedidoLogistica.dsMetodoPagamento || "Retirar na Loja (Grátis)"}</div>
                                                        </div>
                                                    ) : isDigital ? (
                                                        <div>
                                                            <div><strong>Forma:</strong> Digital</div>
                                                            <div><strong>Status:</strong> Envio por E-mail</div>
                                                        </div>
                                                    ) : (pedido.financeiro?.dsTransportadoraId || cotacao.dsTransportadoraIdCotado || etiquetaData.isEtiquetaGerada) ? (
                                                        <div>
                                                            <div><strong>Método:</strong> {cotacao.dsServicoCotado || pedidoLogistica.dsServico || "Definida"}</div>
                                                            <div><strong>Valor:</strong> R$ {Number(cotacao.vlFreteCotado ?? pedido.financeiro?.vlFrete ?? 0).toFixed(2).replace('.', ',')}</div>
                                                            <div><strong>Prazo:</strong> {cotacao.nrPrazoEntregaCotado ?? 0} dias</div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ color: '#d97706', marginBottom: '6px' }}>Precisa Cotar Frete</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>🏷️ Rastreio e Ação</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ fontSize: '11px', color: '#047857', lineHeight: '1.4' }}>
                                                        <div><b>Código Rastreio:</b> {codigoRastreio}</div>
                                                        {codigoRastreio !== "Indisponível" && (
                                                            <a href={linkRastreio} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', display: 'block', marginTop: '2px', fontWeight: 'bold' }}>
                                                                🔍 Rastrear Envio
                                                            </a>
                                                        )}
                                                        {etiquetaData.urlEtiqueta || (pedido as any).urlEtiqueta ? (
                                                            <a href={etiquetaData.urlEtiqueta || (pedido as any).urlEtiqueta} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'block', marginTop: '2px' }}>
                                                                Ver Etiqueta PDF
                                                            </a>
                                                        ) : null}
                                                    </div>

                                                    <div style={{ marginTop: '6px' }}>
                                                        <button onClick={() => executarConclusao(pedido)} style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer' }}>
                                                            ✅ Marcar como Entregue
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '6px', fontSize: '13px' }}>💳 Pagamento</div>
                                                <div style={{ fontSize: '11px', color: theme.textSec, lineHeight: '1.4' }}>
                                                    <div style={{ marginTop: '3px', borderTop: `1px solid ${theme.border}`, paddingTop: '3px' }}>
                                                        <strong>Forma de Pagamento:</strong> {
                                                            fin.dsFormaPagamentoCarrinho
                                                                ? fin.dsFormaPagamentoCarrinho.replace('_', ' ').toUpperCase()
                                                                : 'PIX'
                                                        }
                                                    </div>

                                                    <div style={{ marginTop: '3px', borderTop: `1px solid ${theme.border}`, paddingTop: '3px' }}>
                                                        <strong>Subtotal:</strong> R$ {subtotalVal.toFixed(2).replace('.', ',')}</div>
                                                    <div><strong>Frete:</strong> R$ {freteVal.toFixed(2).replace('.', ',')}</div>
                                                    <div style={{ color: descontoVal > 0 ? '#16a34a' : 'inherit' }}>
                                                        <strong>Desconto:</strong> {descontoVal > 0 ? `-R$ ${descontoVal.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                                                    </div>
                                                    <div><strong>Cupom:</strong> {cupomStr}</div>

                                                    <div style={{ marginTop: '3px', borderTop: `1px solid ${theme.border}`, paddingTop: '3px' }}>
                                                        <strong>Total:</strong> <span style={{ color: theme.primary, fontWeight: 'bold' }}>R$ {totalVal.toFixed(2).replace('.', ',')}</span>
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
                    <button disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)} style={{ ...styles.pageBtn, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}>Anterior</button>
                    <span style={{ margin: '0 15px', fontSize: '13px', fontWeight: 'bold', color: theme.textSec }}>Página {paginaAtual} de {totalPaginas}</span>
                    <button disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => p + 1)} style={{ ...styles.pageBtn, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}>Próxima</button>
                </div>
            )}
        </div>
    );
}

const ItemResumido = React.memo(({ item, pedidoLogistica, pedido, isFirstItem }: any) => {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO ITEM RESUMIDO
    const { theme } = useTheme();

    const selo = obterSeloItem(item, pedidoLogistica);
    const qtd = item.nrQuantidadeProduto || item.quantidade || item.qty || 1;

    // 🌟 Captura o preço unitário do item padronizado (compatível com 'vlPrecoProduto', 'preco', etc.)
    const precoUnitario = Number(item.vlPrecoProduto ?? item.preco ?? item.valor ?? item.valorUnitario ?? 0);
    const valorTotalItem = precoUnitario * qtd;

    // 🚀 Lógica otimizada: Consome a foto diretamente do item salvo no pedido, sem consultas ao Firebase
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
                        {(item.dsVariacaoProduto || item.variacao) && (
                            <span style={{ fontSize: '12px', color: theme.textSec, marginLeft: '2px' }}>
                                Variação: {item.dsVariacaoProduto || item.variacao}
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
    caixaPersonalizacao: { border: '1px solid', borderRadius: '8px', padding: '12px' },
    caixaBlocoPadrao: { border: '1px solid', borderRadius: '8px', padding: '12px' }
};