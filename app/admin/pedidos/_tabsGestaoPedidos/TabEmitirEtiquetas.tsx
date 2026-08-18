// components/_tabsGestaoPedidos/TabEmitirEtiquetas.tsx
'use client';
import React, { useState, useMemo } from 'react';
import { Pedido } from '@/types/pedido';
import TabCardEtiqueta from './CardPedidoTabEtiqueta';

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

interface TabEmitirEtiquetasProps {
    pedidos?: Pedido[]; // 👈 Deixado opcional para segurança
    lojistaIdApp: string;
    db: any;
    dadosLoja: any;
    setModalProgresso: React.Dispatch<React.SetStateAction<any>>;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    selecionados: string[];
    setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
    isAutomacaoCompletaMelhorEnvio?: boolean;
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

const obterSeloItem = (item: any, pedidoLogistica: any) => {
    const formaItem = String(item.dsFormaEntrega || pedidoLogistica?.dsFormaEntrega || '').trim().toLowerCase();
    const isRetirada = pedidoLogistica?.isRetirada === true || formaItem === 'retirada';
    const isDigital = item.precisaFrete === false || formaItem === 'digital';

    if (isRetirada) return { texto: "Retirada", cor: "#f59e0b" };
    if (isDigital) return { texto: "Digital", cor: "#3b82f6" };
    return { texto: "Envio", cor: "#10b981" };
};

const gerarLinkWhatsApp = (pedido: Pedido) => {
    const clienteObj = typeof pedido.cliente === 'object' && pedido.cliente !== null ? pedido.cliente : ({} as any);
    const telefoneBruto = clienteObj.dsTelefoneCliente || clienteObj.telefone || clienteObj.whatsapp || clienteObj.celular || (pedido as any).telefone || "";

    if (!telefoneBruto) return "";

    const apenasNumeros = String(telefoneBruto).replace(/\D/g, '');
    if (!apenasNumeros) return "";

    const telefoneFinal = apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
    const nomeCliente = clienteObj.nmNomeCliente || clienteObj.nome || "Cliente";
    const numPed = pedido.numeroPedido !== undefined && pedido.numeroPedido !== null ? pedido.numeroPedido : (pedido.numero || pedido.id?.slice(-4));

    const mensagem = encodeURIComponent(`Olá ${nomeCliente}, tudo bem? Estou entrando em contato referente ao seu pedido #${numPed}.`);
    return `https://wa.me/${telefoneFinal}?text=${mensagem}`;
};

export default function TabEmitirEtiquetas({
    pedidos = [], lojistaIdApp, db, setModalProgresso, setLocalPedidos, selecionados = [], setSelecionados, isAutomacaoCompletaMelhorEnvio = false
}: TabEmitirEtiquetasProps) {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO INÍCIO DO COMPONENTE
    const { theme } = useTheme();

    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    // Paginação com seletor dinâmico (20, 40, 60)
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(20);

    const pedidosProntosParaEtiqueta = useMemo(() => {
        // 🛡️ Blindagem contra undefined/null para o filter nunca quebrar
        const listaSegura = Array.isArray(pedidos) ? pedidos : [];

        return listaSegura.filter(p => {
            if (!p) return false;
            if (p.status === 'Concluído' || p.status === 'enviado' || (p as any).enviado === true) return false;

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

    const totalPaginas = Math.ceil(pedidosProntosParaEtiqueta.length / itensPorPagina) || 1;

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
                    .mobile-linha-erro {
                        display: block !important;
                        width: 100% !important;
                        padding-left: 0 !important;
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

            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', minHeight: '52px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', position: 'relative', gap: '15px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, color: theme.textMain, fontSize: '18px' }}>🏷️ Central de Emissão de Etiquetas</h3>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: isAutomacaoCompletaMelhorEnvio ? '#dcfce7' : '#e0f2fe',
                            color: isAutomacaoCompletaMelhorEnvio ? '#166534' : '#0369a1',
                            border: `1px solid ${isAutomacaoCompletaMelhorEnvio ? '#bbf7d0' : '#bae6fd'}`
                        }}>
                            {isAutomacaoCompletaMelhorEnvio ? '⚡ Automação Ativa' : '🛠️ Modo Manual / Híbrido'}
                        </span>
                    </div>
                    <p style={{ margin: '0 0 0 0', fontSize: '13px', color: theme.textSec }}>
                        {isAutomacaoCompletaMelhorEnvio
                            ? 'Selecione os pedidos para gerenciar status, emitir etiquetas ou enviar.'
                            : '💡 Modo Manual: Pague e imprima no Melhor Envio. Depois clique em Confirmar Envio acima.'}
                    </p>
                </div>

                {/* Seletor de itens por página */}
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
                {pedidosProntosParaEtiqueta.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>
                        Nenhum pedido encontrado nesta aba no momento. 🎉
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

                        const isPendenteSaldo = isAutomacaoCompletaMelhorEnvio && (statusEtq === 'pendente_saldo' || statusEtq === 'erro' || statusEtq === 'rejected');

                        const temPersonalizacao = pedido.itens?.some(i => {
                            const resp = i.respostasFormatadas || i.personalizacao;
                            if (!resp) return false;
                            if (typeof resp === 'object' && Object.keys(resp).length > 0) return true;
                            if (typeof resp === 'string' && resp.trim() !== '') return true;
                            return false;
                        });

                        const isPagoReal = pedido.pago === true || (pedido as any).StatusProducao?.isPago === true || (pedido as any).statusPagamento === 'pago';
                        const corBordaCard = isPagoReal ? '#2ecc71' : '#e74c3c';

                        const fin = pedido.financeiro || {};
                        const subtotalVal = Number(fin.vlSubtotal ?? fin.subtotal ?? 0);

                        // 🚚 FRETE ATUALIZADO: Olha primeiro na logistica, depois no financeiro e por fim na cotacao
                        const freteVal = Number(pedidoLogistica.vlFrete ?? fin.vlFrete ?? fin.valorFrete ?? cotacao.vlFreteCotado ?? 0);

                        const descontoVal = Number(fin.vlDesconto ?? fin.desconto ?? 0);
                        const totalVal = Number(fin.vlTotal ?? fin.total ?? (subtotalVal + freteVal - descontoVal));
                        const cupomStr = fin.dsCupom ?? fin.cupom ?? null;

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
                                                onChange={() => {
                                                    setSelecionados(prev => (prev || []).includes(pedido.id) ? (prev || []).filter(i => i !== pedido.id) : [...(prev || []), pedido.id]);
                                                }}
                                                style={{ transform: 'scale(1.2)', cursor: 'pointer', flexShrink: 0 }}
                                            />
                                            <span style={{ fontWeight: '800', color: theme.primary, fontSize: '15px', width: '70px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
                                            <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '14px', width: '220px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                            <span style={{ fontSize: '12px', color: theme.textMain, fontFamily: 'monospace', backgroundColor: theme.border, padding: '2px 6px', borderRadius: '4px', width: '220px', flexShrink: 0, wordBreak: 'break-all' }} title={idPedidoExibicao}>ID Pedido: {idPedidoExibicao}</span>

                                            {/* ⚠️ Aviso de Erro / Falha de Pagamento Logo Apos o ID do Pedido */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                {isAutomacaoCompletaMelhorEnvio && (
                                                    isPendenteSaldo ? (
                                                        <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fdf2f2', color: '#b91c1c', padding: '3px 5px', borderRadius: '4px', border: '1px solid #fecaca', whiteSpace: 'nowrap' }} title={etiquetaData.mensagemErro || "Erro de pagamento ou saldo insuficiente"}>
                                                            ⚠️ falha Pgto - Acesse Painel Melhor Envios
                                                        </span>
                                                    ) : msgErroEtq && msgErroEtq !== 'gerada' && msgErroEtq !== 'pendente_saldo' ? (
                                                        <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fffbeb', color: '#b45309', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fde68a', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={etiquetaData.mensagemErro}>
                                                            ⚠️ Erro: {etiquetaData.mensagemErro}
                                                        </span>
                                                    ) : null
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0, marginLeft: '10px' }}>
                                            <span style={{ fontSize: '12px', color: theme.textSec, fontWeight: '500' }}>
                                                {formatarData(pedido.data || (pedido.cliente as any)?.data)}
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
                                                    onChange={() => {
                                                        setSelecionados(prev => (prev || []).includes(pedido.id) ? (prev || []).filter(i => i !== pedido.id) : [...(prev || []), pedido.id]);
                                                    }}
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
                                                    {formatarData(pedido.data || (pedido.cliente as any)?.data)}
                                                </span>
                                                <span style={{ fontSize: '12px', color: theme.textSec }}>{expandido ? '▲' : '▼'}</span>
                                            </div>
                                        </div>

                                        {isAutomacaoCompletaMelhorEnvio && (isPendenteSaldo || (msgErroEtq && msgErroEtq !== 'gerada' && msgErroEtq !== 'pendente_saldo')) && (
                                            <div className="mobile-linha-erro">
                                                {isPendenteSaldo ? (
                                                    <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fdf2f2', color: '#b91c1c', padding: '3px 5px', borderRadius: '4px', border: '1px solid #fecaca', display: 'inline-block' }} title={etiquetaData.mensagemErro || "Erro de pagamento ou saldo insuficiente"}>
                                                        ⚠️ falha Pgto - Acesse Painel Melhor Envios
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
                                        <ItemResumido
                                            key={idx}
                                            item={item}
                                            lojistaId={lojistaIdApp}
                                            pedidoLogistica={pedidoLogistica}
                                            db={db}
                                            pedido={pedido}
                                            isFirstItem={idx === 0}
                                        />
                                    ))}
                                </div>

                                {expandido && (
                                    <div style={{ ...localStyles.conteudoDinamicoExpandido, backgroundColor: theme.inputBg, borderColor: theme.border }}>
                                        <div className="grid-expandido" style={localStyles.gridExpandido}>
                                            <div style={{ ...localStyles.caixaPersonalizacao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '4px', fontSize: '12px' }}>
                                                    ✨ Personalização:
                                                </div>
                                                {temPersonalizacao ? (
                                                    pedido.itens.map((item: any, idx: number) => {
                                                        const resp = item.respostasFormatadas || item.personalizacao;
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

                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>🚚 Logística</div>
                                                <div style={{ fontSize: '11px', color: theme.textSec, lineHeight: '1.4' }}>
                                                    {!precisaFrete ? (
                                                        <div style={{ color: theme.textSec, fontStyle: 'italic' }}>Pedido sem Frete</div>
                                                    ) : isRetirada ? (
                                                        <div>
                                                            <div><strong>Forma:</strong> Retirada</div>
                                                            <div><strong>Status:</strong> Grátis</div>
                                                        </div>
                                                    ) : isDigital ? (
                                                        <div>
                                                            <div><strong>Forma:</strong> Digital</div>
                                                        </div>
                                                    ) : (Number(pedido.logistica?.vlFrete ?? 0) > 0 || pedido.financeiro?.dsTransportadoraId || cotacao.dsTransportadoraIdCotado || pedido.etiquetaGerada) ? (
                                                        <div>
                                                            <div><strong>Método:</strong> {pedido.logistica?.dsServico || cotacao.dsMetodoPagamentoCotado || pedido.financeiro?.metodo?.replace('Logística: ', '') || pedidoLogistica.dsMetodoPagamento || "Definida"}</div>
                                                            <div><strong>Valor:</strong> R$ {Number(pedido.logistica?.vlFrete ?? cotacao.vlFreteCotado ?? pedido.financeiro?.vlFrete ?? 0).toFixed(2).replace('.', ',')}</div>
                                                            <div><strong>Prazo:</strong> {pedido.logistica?.vlPrazo ?? cotacao.prazoEntregaCotado ?? pedido.financeiro?.prazoEntrega ?? 0} dias</div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ color: '#d97706', marginBottom: '4px' }}>Precisa Cotar Frete</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>🏷️ Etiqueta</div>
                                                <TabCardEtiqueta
                                                    pedido={pedido}
                                                    isAutomacaoCompletaMelhorEnvio={Boolean(isAutomacaoCompletaMelhorEnvio)}
                                                    precisaFrete={precisaFrete}
                                                />
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

const ItemResumido = React.memo(({ item, lojistaId, pedidoLogistica, db, pedido, isFirstItem }: any) => {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO ITEM RESUMIDO
    const { theme } = useTheme();

    const selo = obterSeloItem(item, pedidoLogistica);
    const qtd = item.quantidade || item.qty || 1;

    // 🚀 Lógica otimizada: Consome a foto diretamente do item salvo no pedido (desnormalização do checkout) eliminando consultas redundantes ao Firebase
    const fotoUrl = useMemo(() => {
        return extrairFotoDoItem(item);
    }, [item]);

    const linkWhats = gerarLinkWhatsApp(pedido);

    return (
        <div style={{ ...localStyles.itemLinhaResumida, backgroundColor: theme.inputBg, borderColor: theme.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={fotoUrl || "https://placehold.co/40x40?text=Prod"} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', backgroundColor: selo.cor, color: '#fff' }}>
                            {selo.texto}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>
                            {qtd}x {item.nome || item.title}
                        </span>
                    </div>
                    {item.variacao && (
                        <span style={{ fontSize: '12px', color: theme.textSec, marginLeft: '2px' }}>
                            Variação: {item.variacao}
                        </span>
                    )}
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

const styles: { [key: string]: React.CSSProperties } = {
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', marginTop: '10px' },
    pageBtn: { padding: '8px 16px', cursor: 'pointer', border: '1px solid', borderRadius: '4px', fontWeight: 'bold' }
};

const localStyles: { [key: string]: React.CSSProperties } = {
    cardContainer: { borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    cardHeaderLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid', cursor: 'pointer', minHeight: '45px', boxSizing: 'border-box' },
    itemLinhaResumida: { display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 8px', borderRadius: '6px', border: '1px solid' },
    conteudoDinamicoExpandido: { padding: '16px', borderTop: '1px solid' },
    gridExpandido: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px' },
    caixaPersonalizacao: { border: '1px solid', borderRadius: '8px', padding: '10px' },
    caixaBlocoPadrao: { border: '1px solid', borderRadius: '8px', padding: '10px' }
};