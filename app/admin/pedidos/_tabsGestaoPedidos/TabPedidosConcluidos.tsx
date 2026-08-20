// components/_tabsGestaoPedidos/TabPedidosConcluidos.tsx
'use client';
import React, { useState, useMemo } from 'react';
import { Pedido } from '@/types/pedido';

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

interface TabPedidosConcluidosProps {
    pedidos: Pedido[];
    lojistaIdApp: string;
    db: any;
    dadosLoja: any;
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

// 🛠️ Padrão idêntico ao de TabTodosPedidos para os selos de entrega
const obterSeloItem = (item: any, pedidoLogistica: any) => {
    const tipoProduto = String(item.dsTipoProduto || item.tipoProduto || '').trim().toLowerCase();

    if (tipoProduto === 'digital_download' || tipoProduto === 'digital_personalizado' || tipoProduto === 'digital') {
        return { texto: "Digital", cor: "#3b82f6" };
    }

    const formaItem = String(item.dsFormaEntrega || pedidoLogistica?.dsFormaEntrega || '').trim().toLowerCase();

    if (formaItem === 'retirada') return { texto: "Retirada", cor: "#f59e0b" };
    if (formaItem === 'entrega_local') return { texto: "Entrega Local", cor: "#8b5cf6" };

    return { texto: "Envio", cor: "#10b981" };
};

export default function TabPedidosConcluidos({
    pedidos, lojistaIdApp, db, setLocalPedidos, selecionados = [], setSelecionados
}: TabPedidosConcluidosProps) {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO INÍCIO DO COMPONENTE
    const { theme } = useTheme();

    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(20);

    const pedidosConcluidos = useMemo(() => {
        return pedidos.filter(p => {
            if (!p) return false;
            const statusGeral = String(p.status || '').trim().toLowerCase();
            const statusProd = String((p as any).StatusProducao?.dsStatusProducao || '').trim().toLowerCase();

            const isConcluido =
                statusGeral === 'concluído' ||
                statusGeral === 'concluido' ||
                statusGeral === 'enviado' ||
                statusProd === 'concluído' ||
                statusProd === 'concluido' ||
                (p as any).enviado === true;

            return isConcluido;
        });
    }, [pedidos]);

    const pedidosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        return pedidosConcluidos.slice(inicio, inicio + itensPorPagina);
    }, [pedidosConcluidos, paginaAtual, itensPorPagina]);

    const totalPaginas = Math.ceil(pedidosConcluidos.length / itensPorPagina) || 1;

    const toggleExpandir = (id: string) => {
        setPedidosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copiarIdCompleto = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        alert(`📋 ID do pedido copiado com sucesso!\n\n${id}`);
    };

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
                    }
                }
            `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', minHeight: '52px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#059669', fontSize: '18px' }}>🏁 Pedidos Concluídos</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSec }}>Histórico de todos os pedidos finalizados, entregues ou concluídos da loja.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                {pedidosConcluidos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>
                        Nenhum pedido concluído registrado até o momento. 📁
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
                        const statusProdAtual = (pedido as any).StatusProducao?.dsStatusProdução || pedido.status || 'Concluído';

                        const formaEntrega = pedidoLogistica.formaEntrega || pedidoLogistica.dsFormaEntrega || pedido.formaEntrega || '-';

                        const temPersonalizacao = pedido.itens?.some(i => {
                            const resp = i.respostasFormatadas || i.personalizacao;
                            if (!resp) return false;
                            if (typeof resp === 'object' && Object.keys(resp).length > 0) return true;
                            if (typeof resp === 'string' && resp.trim() !== '') return true;
                            return false;
                        });

                        const fin = pedido.financeiro || {};
                        const log = (pedido as any).logistica || {};

                        const subtotalVal = Number(fin.vlSubtotal ?? fin.subtotal ?? fin.valorTotal ?? 0);
                        const freteVal = Number(log.vlFrete ?? fin.vlFrete ?? 0);
                        const descontoVal = Number(fin.vlDesconto ?? fin.desconto ?? 0);
                        const totalVal = Number(fin.vlTotal ?? fin.total ?? fin.valorTotal ?? (subtotalVal + freteVal - descontoVal));

                        const cupomStr = fin.dsCupom ?? fin.cupom ?? "-";

                        return (
                            <div key={pedido.id} style={{ ...localStyles.cardContainer, backgroundColor: theme.bgCard, border: '1.5px solid #059669' }}>
                                <div
                                    onClick={() => toggleExpandir(pedido.id)}
                                    className="card-header-linha"
                                    style={{ ...localStyles.cardHeaderLinha, backgroundColor: theme.inputBg, borderColor: theme.border }}
                                >
                                    <div className="pc-bloco-linha-unica" onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }}>
                                            <span style={{ fontWeight: '800', color: '#059669', fontSize: '15px', width: '70px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
                                            <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '14px', width: '220px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                            <span style={{ fontSize: '12px', color: theme.textMain, fontFamily: 'monospace', backgroundColor: theme.border, padding: '2px 6px', borderRadius: '4px', width: '235px', flexShrink: 0, wordBreak: 'break-all' }} title={idPedidoExibicao}>ID Pedido: {idPedidoExibicao}</span>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px' }}>
                                                {statusProdAtual}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0, marginLeft: '10px' }}>
                                            <span style={{ fontSize: '12px', color: theme.textSec, fontWeight: '500' }}>
                                                {formatarData(pedido.data || (pedido.cliente as any)?.data)}
                                            </span>
                                            <span style={{ fontSize: '12px', color: theme.textSec }}>{expandido ? '▲' : '▼'}</span>
                                        </div>
                                    </div>

                                    <div className="mobile-bloco-organizado" style={{ display: 'none' }}>
                                        <div className="mobile-linha-topo" onClick={(e) => e.stopPropagation()}>
                                            <span style={{ fontWeight: '800', color: '#059669', fontSize: '15px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
                                            <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '14px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                            <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>
                                                {statusProdAtual}
                                            </span>
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
                                                    {formatarData(pedido.data || (pedido.cliente as any)?.data)}
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

                                {expandido && (
                                    <div style={{ ...localStyles.conteudoExpandido, backgroundColor: theme.inputBg, borderColor: theme.border }}>
                                        <div className="grid-expandido" style={localStyles.gridExpandido}>
                                            <div style={{ ...localStyles.caixaPersonalizacao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '6px', fontSize: '13px' }}>
                                                    ✨ Personalização / Dados:
                                                </div>
                                                {temPersonalizacao ? (
                                                    pedido.itens.map((item: any, idx: number) => {
                                                        const resp = item.respostasFormatadas || item.personalizacao;
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
                                                    <div style={{ fontSize: '12px', color: theme.textSec, fontStyle: 'italic' }}>Nenhuma personalização informada.</div>
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
                                                    <div><strong>Forma de Entrega:</strong> {formaEntrega}</div>
                                                    <div><strong>Método de Pagamento:</strong> {fin.dsMetodoPagamento || fin.metodo || 'PIX'}</div>
                                                    <div><strong>Transportadora ID:</strong> {fin.dsTransportadoraId || cotacao.dsTransportadoraIdCotado || '-'}</div>
                                                    <div><strong>Serviço:</strong> {pedido?.logistica?.dsServico || etiquetaData.servicoVinculado || pedido.servicoVinculado || 'Retirar na Loja'}</div>
                                                </div>
                                            </div>

                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '6px', fontSize: '13px' }}>🏷️ Outros / Detalhes</div>
                                                <div style={{ fontSize: '11px', color: theme.textSec, fontStyle: 'italic' }}>
                                                    Pedido finalizado com sucesso
                                                </div>
                                            </div>

                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '6px', fontSize: '13px' }}>💳 Pagamento</div>
                                                <div style={{ fontSize: '11px', color: theme.textSec, lineHeight: '1.4' }}>

                                                    {/* 🌟 Exibição da Forma de Pagamento salva no pedido */}
                                                    <div style={{ marginTop: '3px', borderTop: `1px solid ${theme.border}`, paddingTop: '3px' }}>
                                                        <strong>Forma de Pagamento:</strong> {
                                                            pedido.financeiro?.dsFormaPagamentoCarrinho
                                                                ? pedido.financeiro.dsFormaPagamentoCarrinho.replace('_', ' ').toUpperCase()
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

const ItemResumido = React.memo(({ item, pedidoLogistica }: any) => {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO ITEM RESUMIDO
    const { theme } = useTheme();

    const selo = obterSeloItem(item, pedidoLogistica);
    const qtd = item.quantidade || item.qty || 1;

    // 🌟 Captura o preço unitário do item padronizado (compatível com 'preco', 'valor', etc.)
    const precoUnitario = Number(item.preco || item.valor || item.valorUnitario || 0);
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
                            {qtd}x {item.nome || item.title}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {item.variacao && (
                            <span style={{ fontSize: '12px', color: theme.textSec, marginLeft: '2px' }}>
                                Variação: {item.variacao}
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