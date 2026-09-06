// components/_tabsGestaoPedidos/TabTodosPedidos.tsx
'use client';
import React, { useState, useMemo } from 'react';
import { Pedido } from '@/types/pedido';

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface TabProps {
    pedidos: Pedido[];
    loading: boolean;
    lojistaIdApp: string;
    db: any;
    mudarStatusDireto?: (p: Pedido, status: string) => void;
    alternarPago?: (p: Pedido) => void;
    dispararSegurancaDeletar?: (p: Pedido) => void;
    cotarFrete?: (p: Pedido) => Promise<any[]>;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    dadosLoja: any;
    selecionados: string[];
    setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
    alterarStatusPedido?: (pedidoId: string, novoStatus: string, extras?: Record<string, any>) => Promise<any>;
    excluirPedidoComEstorno?: (pedido: Pedido) => Promise<any>;
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

    if (tipoProduto === 'digital_download' || tipoProduto === 'digital_personalizado' || tipoProduto === 'digital') {
        return { texto: "Digital", cor: "#3b82f6" };
    }

    const formaItem = String(item.dsFormaEntrega || pedidoLogistica?.dsFormaEntrega || '').trim().toLowerCase();

    if (formaItem === 'retirada') return { texto: "Retirada", cor: "#f59e0b" };
    if (formaItem === 'entrega_local') return { texto: "Entrega Local", cor: "#8b5cf6" };

    return { texto: "Envio", cor: "#10b981" };
};

const gerarLinkWhatsApp = (pedido: Pedido) => {
    const clienteObj = typeof (pedido as any).dsCliente === 'object' && (pedido as any).dsCliente !== null ? (pedido as any).dsCliente : ({} as any);
    const telefoneBruto = clienteObj.dsTelefoneCliente || clienteObj.telefone || clienteObj.whatsapp || clienteObj.celular || (pedido as any).telefone || "";

    if (!telefoneBruto) return "";

    const apenasNumeros = String(telefoneBruto).replace(/\D/g, '');
    if (!apenasNumeros) return "";

    const telefoneFinal = apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
    const nomeCliente = clienteObj.nmNomeCliente || clienteObj.nome || "Cliente";

    const pedidoLogistica = (pedido as any).logistica || {};
    const numPed = pedidoLogistica.nrNumeroPedido !== undefined && pedidoLogistica.nrNumeroPedido !== null ? pedidoLogistica.nrNumeroPedido : (pedido.id?.slice(-4));

    const mensagem = encodeURIComponent(`Olá ${nomeCliente}, tudo bem? Estou entrando em contato referente ao seu pedido #${numPed}.`);
    return `https://wa.me/${telefoneFinal}?text=${mensagem}`;
};

const ItemResumido = React.memo(({ item, pedidoLogistica, pedido, isFirstItem }: any) => {
    const { theme } = useTheme();

    const selo = obterSeloItem(item, pedidoLogistica);
    const qtd = item.nrQuantidadeProduto || item.quantidade || item.qty || 1;

    const precoUnitario = Number(item.vlPrecoProduto || item.preco || item.valor || item.valorUnitario || 0);
    const valorTotalItem = precoUnitario * qtd;

    const fotoUrl = useMemo(() => {
        return extrairFotoDoItem(item);
    }, [item]);

    const linkWhats = gerarLinkWhatsApp(pedido);

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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.dsVariacaoProduto && (
                            <span style={{ fontSize: '12px', color: theme.textSec, marginLeft: '2px' }}>
                                Variação: {item.dsVariacaoProduto}
                            </span>
                        )}
                        <span style={{ fontSize: '12px', fontWeight: '600', color: theme.primary }}>
                            R$ {precoUnitario.toFixed(2).replace('.', ',')} un {qtd > 1 ? `(Total: R$ ${valorTotalItem.toFixed(2).replace('.', ',')})` : ''}
                        </span>
                    </div>
                </div>
            </div>

            {isFirstItem && linkWhats && (
                <a
                    href={linkWhats}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Chamar cliente no WhatsApp"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', textDecoration: 'none', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', marginLeft: '12px' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                </a>
            )}
        </div>
    );
});

export default function TabTodosPedidos({
    pedidos, loading, selecionados, setSelecionados
}: TabProps) {
    const { theme } = useTheme();
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(20);

    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    const pedidosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        return pedidos.slice(inicio, inicio + itensPorPagina);
    }, [pedidos, paginaAtual, itensPorPagina]);

    const totalPaginas = Math.ceil(pedidos.length / itensPorPagina) || 1;

    const toggleExpandir = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
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
                    <h3 style={{ margin: 0, color: theme.textMain, fontSize: '18px' }}>📦 Todos os Pedidos</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSec }}>Visualização completa de todos os pedidos cadastrados na loja.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.inputBg, padding: '5px 10px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                    <span style={{ fontSize: '11px', color: theme.textSec }}>Exibir:</span>
                    <select
                        value={itensPorPagina}
                        onChange={(e) => { setItensPorPagina(Number(e.target.value)); setPaginaAtual(1); }}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', color: theme.textMain, cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <option value={20} style={{ background: theme.bgCard }}>20</option>
                        <option value={40} style={{ background: theme.bgCard }}>40</option>
                        <option value={60} style={{ background: theme.bgCard }}>60</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loading ? <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>Carregando...</div>
                    : pedidosPaginados.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>Nenhum pedido encontrado.</div>
                        : pedidosPaginados.map((pedido) => {
                            const pedidoLogistica = (pedido as any).logistica || {};
                            const cotacao = (pedido as any).Cotacao || {};
                            const etiquetaData = (pedido as any).Etiqueta || {};
                            const endereco = (pedido as any).dsEndereco || (pedido as any).endereco || (pedido as any).cliente?.endereco || {};
                            const clienteObj = (pedido as any).dsCliente || (pedido as any).cliente || {};
                            const expandido = !!pedidosExpandidos[pedido.id];

                            const numPedidoFormatado = String((pedido as any).nrNumeroPedido ?? '').padStart(5, '0');

                            const nomeCliente = typeof clienteObj === 'object' ? (clienteObj.nmNomeCliente || clienteObj.nome || "Cliente") : (clienteObj || "Cliente");
                            const idPedidoExibicao = String(pedido.id || "");
                            const idEncurtadoMobile = idPedidoExibicao.length > 10 ? `${idPedidoExibicao.slice(0, 6)}...${idPedidoExibicao.slice(-4)}` : idPedidoExibicao;

                            const formaEntrega = String(pedidoLogistica.dsFormaEntrega || (pedido as any).dsFormaEntrega || '').toLowerCase();
                            const isRetirada = formaEntrega === 'retirada' || pedidoLogistica.isRetirada === true || (pedido as any).retirada || (pedido as any).retirarNaLoja;

                            const isEntregaLocal = formaEntrega === 'entrega_local' || String(pedidoLogistica.dsTransportadoraId || '').toLowerCase() === 'entrega_local' || (pedido as any).entregaLocal;
                            const isDigital = pedido.itens?.some((i: any) => {
                                const tipoProd = String(i.dsTipoProduto || i.tipoProduto || '').toLowerCase();
                                return tipoProd.includes('digital') || i.isPrecisaFreteProduto === false || i.precisaFrete === false;
                            });

                            const statusEtiquetaStr = String(etiquetaData.dsStatusEtiqueta || etiquetaData.statusEtiqueta || pedido.statusEtiqueta || '').toLowerCase();
                            const isPendenteSaldo = statusEtiquetaStr.includes('saldo') || statusEtiquetaStr.includes('pendente') || statusEtiquetaStr.includes('erro');

                            const temPersonalizacao = pedido.itens?.some((i: any) => {
                                const resp = i.dsRespostasPersonalizadasProduto || i.respostasFormatadas || i.personalizacao;
                                if (!resp) return false;
                                if (typeof resp === 'object' && Object.keys(resp).length > 0) return true;
                                if (typeof resp === 'string' && resp.trim() !== '') return true;
                                return false;
                            });

                            const isPagoReal = (pedido as any).pago === true || (pedido as any).StatusProducao?.isPago === true || (pedido as any).statusPagamento === 'pago';
                            const corBordaCard = isPagoReal ? '#2ecc71' : '#e74c3c';

                            const fin = (pedido as any).financeiro || {};
                            const log = (pedido as any).logistica || {};

                            const subtotalVal = Number(fin.vlSubtotal ?? fin.subtotal ?? fin.valorSubtotal ?? (pedido as any).subtotal ?? 0);
                            const freteVal = Number(log.vlFrete ?? fin.vlFrete ?? 0);
                            const descontoVal = Number(fin.vlDesconto ?? fin.desconto ?? fin.vlDescontos ?? 0);

                            const totalCalculadoManual = subtotalVal + freteVal - descontoVal;
                            const totalVal = Number(fin.vlTotal ?? fin.total ?? fin.valorTotal ?? (pedido as any).total ?? (totalCalculadoManual > 0 ? totalCalculadoManual : 0));
                            const cupomStr = fin.dsCupom ?? fin.cupom ?? fin.codigoCupom ?? "-";

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
                                                <span style={{ fontWeight: '800', color: theme.primary, fontSize: '15px', width: '60px', flexShrink: 0 }}>#{numPedidoFormatado}</span>

                                                <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: ((pedido as any).dsOrigemPedido || pedido.origemPedido || "").toLowerCase() === 'pdv' ? '#8b5cf6' : '#3b82f6', color: '#fff', textTransform: 'uppercase', flexShrink: 0 }}>
                                                    {(pedido as any).dsOrigemPedido || pedido.origemPedido || 'Site'}
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

                                                    <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '4px', backgroundColor: ((pedido as any).dsOrigemPedido || pedido.origemPedido || "").toLowerCase() === 'pdv' ? '#8b5cf6' : '#3b82f6', color: '#fff', textTransform: 'uppercase', flexShrink: 0 }}>
                                                        {(pedido as any).dsOrigemPedido || pedido.origemPedido || 'Site'}
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
                                                    📋ID: {idEncurtadoMobile}
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
                                        {pedido.itens?.map((item, idx) => (
                                            <ItemResumido
                                                key={idx}
                                                item={item}
                                                pedidoLogistica={pedidoLogistica}
                                                pedido={pedido}
                                                isFirstItem={idx === 0}
                                            />
                                        ))}
                                    </div>

                                    {expandido && (() => {
                                        const embalagemData = (pedido as any).Embalagem || (pedido as any).embalagemRecomendada || {};
                                        const recomendada = embalagemData.recomendada || embalagemData;
                                        const escolhida = embalagemData.escolhida || null;

                                        const modeloRecomendado = recomendada.dsModeloEmbalagemRecomendado || recomendada.nomeInsumo || recomendada.nome || "Não calculada";
                                        const tipoRecomendado = recomendada.dsTipoEmbalagem || recomendada.tipo || "-";

                                        const modeloEscolhido = escolhida?.dsModeloEmbalagemEscolhida || escolhida?.dsModeloEmbalagemRecomendado || escolhida?.nome || "";
                                        const tipoEscolhido = escolhida?.dsTipoEmbalagem || escolhida?.tipo || "";

                                        return (
                                            <div style={{ ...localStyles.conteudoExpandido, backgroundColor: theme.inputBg, borderColor: theme.border }}>
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
                                                        <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '6px', fontSize: '12px' }}>
                                                            ✨ Personalização:
                                                        </div>
                                                        {temPersonalizacao ? (
                                                            pedido.itens.map((item: any, idx: number) => {
                                                                const resp = item.dsRespostasPersonalizadasProduto || item.respostasFormatadas || item.personalizacao;
                                                                if (!resp || (typeof resp === 'object' && Object.keys(resp).length === 0)) return null;

                                                                const nomeItem = item.dsNomeProduto || item.nome || item.title || `Item ${idx + 1}`;

                                                                return (
                                                                    <div key={idx} style={{ fontSize: '11px', color: theme.textMain, lineHeight: '1.4', marginBottom: '8px', borderBottom: idx < pedido.itens.length - 1 ? `1px dashed ${theme.border}` : 'none', paddingBottom: '4px' }}>
                                                                        <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '2px' }}>• {nomeItem}:</div>
                                                                        {typeof resp === 'object' ? (
                                                                            Object.entries(resp).map(([k, v]) => (
                                                                                <div key={k} style={{ paddingLeft: '8px' }}>{k}: <strong>{String(v)}</strong></div>
                                                                            ))
                                                                        ) : (
                                                                            <div style={{ paddingLeft: '8px' }}>{String(resp)}</div>
                                                                        )}
                                                                    </div>
                                                                );
                                                             })
                                                        ) : (
                                                            <div style={{ fontSize: '11px', color: theme.textSec, fontStyle: 'italic' }}>Sem personalização.</div>
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
                                                            <div><strong>Forma de Entrega:</strong> {formaEntrega || '-'}</div>
                                                            <div><strong>Método de Pagamento:</strong> {fin.dsFormaPagamentoCarrinho || fin.dsMetodoPagamento || fin.metodo || 'PIX'}</div>
                                                            <div><strong>Transportadora ID:</strong> {fin.dsTransportadoraId || pedidoLogistica.dsTransportadoraId || cotacao.dsTransportadoraIdCotado || '-'}</div>
                                                            <div><strong>Serviço:</strong> {pedidoLogistica.dsServico || cotacao.dsServicoCotado || etiquetaData.servicoVinculado || pedido.servicoVinculado || 'Retirar na Loja'}</div>
                                                        </div>
                                                    </div>

                                                    <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                        <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>🏷️ Etiqueta</div>
                                                        {isDigital || isEntregaLocal || isRetirada ? (
                                                            <div style={{ fontSize: '11px', color: theme.textSec, fontStyle: 'italic', padding: '4px 0' }}>
                                                                {isDigital ? "Pedido digital, não possui etiqueta de envio." : isEntregaLocal ? "Entrega local, não possui etiqueta de envio." : "Retirada na loja, não possui etiqueta de envio."}
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                                                                <div style={{ fontSize: '10px', color: theme.textSec, lineHeight: '1.3' }}>
                                                                    <div><b>Id:</b> {etiquetaData.IdEtiqueta || etiquetaData.idEtiqueta || pedido.idEtiqueta || '-'}</div>
                                                                    <div><b>Cód Envio:</b> {etiquetaData.nrCodigoEnvio || etiquetaData.codigoEnvio || '-'}</div>
                                                                    <div><b>Status Pagto:</b> <span style={{ color: isPendenteSaldo ? '#b91c1c' : '#047857', fontWeight: 'bold' }}>{etiquetaData.dsStatusEtiqueta || etiquetaData.statusEtiqueta || pedido.statusEtiqueta || 'pendente'}</span></div>
                                                                    <div><b>Rastreio:</b> {etiquetaData.dsNumRastreio || pedido.dsNumRastreio || '-'}</div>
                                                                    <div><b>Serviço:</b> {etiquetaData.dsServicoVinculado || etiquetaData.servicoVinculado || pedido.servicoVinculado || '1'}</div>
                                                                    <div><b>Valor Cobrado:</b> R$ {Number(etiquetaData.vlValorCobrado ?? etiquetaData.valorCobrado ?? 0).toFixed(2).replace('.', ',')}</div>
                                                                    {etiquetaData.urlEtiqueta || pedido.urlEtiqueta ? (
                                                                        <a href={etiquetaData.urlEtiqueta || pedido.urlEtiqueta} target="_blank" rel="noreferrer" style={{ color: theme.primary, display: 'block', marginTop: '2px' }}>
                                                                            Ver Etiqueta PDF
                                                                        </a>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        )}
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
                                                                    <div><strong>Status Parcial:</strong> <span style={{ color: fin.dsStatusPagamento === 'pago' ? '#16a34a' : '#d97706', fontWeight: 'bold' }}>{fin.dsStatusPagamento?.toUpperCase() || 'PARCIAL'}</span></div>
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
                        })}
            </div>

            {/* CONTROLES DE PAGINAÇÃO (SEMPRE VISÍVEIS) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: `1px solid ${theme.border}`, fontSize: "12px" }}>
                <span style={{ color: theme.textSec }}>
                    Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> (Total: {pedidos.length} pedidos)
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))}
                        disabled={paginaAtual === 1 || loading}
                        style={{
                            background: paginaAtual === 1 ? theme.bgApp : theme.primary,
                            color: paginaAtual === 1 ? theme.textSec : "#fff",
                            border: `1px solid ${theme.border}`,
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: paginaAtual === 1 ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: "bold",
                            opacity: paginaAtual === 1 ? 0.6 : 1
                        }}
                    >
                        <FiChevronLeft size={14} /> Anterior
                    </button>
                    <button
                        onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))}
                        disabled={paginaAtual === totalPaginas || loading}
                        style={{
                            background: paginaAtual === totalPaginas ? theme.bgApp : theme.primary,
                            color: paginaAtual === totalPaginas ? theme.textSec : "#fff",
                            border: `1px solid ${theme.border}`,
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: paginaAtual === totalPaginas ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: "bold",
                            opacity: paginaAtual === totalPaginas ? 0.6 : 1
                        }}
                    >
                        Próxima <FiChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

const localStyles: { [key: string]: React.CSSProperties } = {
    cardContainer: { borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    cardHeaderLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid', cursor: 'pointer', minHeight: '45px', boxSizing: 'border-box' },
    itemLinhaResumida: { display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 8px', borderRadius: '6px', border: '1px solid' },
    conteudoExpandido: { padding: '16px', borderTop: '1px solid' },
    gridExpandido: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px' },
    caixaPersonalizacao: { border: '1px solid', borderRadius: '8px', padding: '10px' },
    caixaBlocoPadrao: { border: '1px solid', borderRadius: '8px', padding: '10px' },
};