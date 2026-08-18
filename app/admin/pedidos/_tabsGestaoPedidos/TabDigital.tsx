// components/_tabsGestaoPedidos/TabDigital.tsx
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Pedido } from '@/types/pedido';
import { doc, updateDoc } from 'firebase/firestore';

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

interface TabDigitalProps {
    pedidos: Pedido[];
    lojistaIdApp: string;
    db: any;
    dadosLoja: any;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    selecionados: string[];
    setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
    mudarStatusDireto: (pedido: Pedido, novoStatus: string) => Promise<void>;
    registrarFuncaoConcluirDigital?: (fn: () => void) => void;
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
    const tipoProduto = String(item.dsTipoProduto || item.tipoProduto || '').trim().toLowerCase();

    if (tipoProduto === 'digital_download' || tipoProduto === 'digital_personalizado' || tipoProduto === 'digital' || item.precisaFrete === false) {
        return { texto: "Digital", cor: "#3b82f6" };
    }

    const formaItem = String(item.dsFormaEntrega || pedidoLogistica?.dsFormaEntrega || '').trim().toLowerCase();

    if (formaItem === 'retirada') return { texto: "Retirada", cor: "#f59e0b" };
    if (formaItem === 'entrega_local') return { texto: "Entrega Local", cor: "#8b5cf6" };

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

    const mensagem = encodeURIComponent(`Olá ${nomeCliente}, tudo bem? Estou entrando em contato referente ao seu pedido digital #${numPed}.`);
    return `https://wa.me/${telefoneFinal}?text=${mensagem}`;
};

export default function TabDigital({
    pedidos, lojistaIdApp, db, setLocalPedidos, selecionados = [], setSelecionados, mudarStatusDireto, registrarFuncaoConcluirDigital
}: TabDigitalProps) {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO INÍCIO DO COMPONENTE
    const { theme } = useTheme();

    const [processandoMassa, setProcessandoMassa] = useState(false);
    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(20);

    const pedidosDigitais = useMemo(() => {
        return pedidos.filter(p => {
            if (!p) return false;
            const statusGeral = String(p.status || '').trim().toLowerCase();
            if (statusGeral === 'concluído' || statusGeral === 'concluido' || statusGeral === 'enviado' || (p as any).enviado === true) return false;

            const statusProdObj = (p as any).StatusProducao || {};
            const isPago = Boolean(statusProdObj.isPago !== undefined ? statusProdObj.isPago : p.pago);
            if (!isPago) return false;

            const pedidoLogistica = (p as any).logistica || {};
            const formaEntrega = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();

            const temItemFisico = Array.isArray(p.itens) && p.itens.some((i: any) => {
                const tipo = String(i.dsTipoProduto || i.tipoProduto || '').toLowerCase();
                const tipoEhDigital = tipo.includes('digital');
                return !tipoEhDigital && i.precisaFrete !== false;
            });

            const formaEntregaEhFisica = formaEntrega === 'retirada' || formaEntrega === 'entrega_local' || formaEntrega === 'envio' || formaEntrega === 'transportadora';

            if (temItemFisico || formaEntregaEhFisica) return false;

            const temItemDigital = Array.isArray(p.itens) && p.itens.some((i: any) => i.precisaFrete === false || String(i.dsTipoProduto || '').toLowerCase().includes('digital'));
            const isDigital = formaEntrega === 'digital' || temItemDigital;

            return isDigital;
        });
    }, [pedidos]);

    const totalPaginas = Math.ceil(pedidosDigitais.length / itensPorPagina) || 1;

    useEffect(() => {
        if (paginaAtual > totalPaginas) {
            setPaginaAtual(totalPaginas);
        }
    }, [totalPaginas, paginaAtual]);

    const pedidosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        return pedidosDigitais.slice(inicio, inicio + itensPorPagina);
    }, [pedidosDigitais, paginaAtual, itensPorPagina]);

    const idsVisiveisNestaAba = useMemo(() => pedidosDigitais.map(p => p.id), [pedidosDigitais]);

    const toggleExpandir = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPedidosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copiarIdCompleto = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        alert(`📋 ID do pedido copiado com sucesso!\n\n${id}`);
    };

    const concluirDigitalEmLote = async () => {
        const selecionadosAtuais = (selecionados || []).filter(id => idsVisiveisNestaAba.includes(id));
        if (selecionadosAtuais.length === 0) return alert("Nenhum pedido digital selecionado para concluir.");
        if (!db || !lojistaIdApp) return;

        if (!confirm(`Deseja realmente marcar os ${selecionadosAtuais.length} pedidos digitais selecionados como concluídos?`)) {
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
            alert("✅ Pedidos digitais concluídos com sucesso!");
        } catch (e: any) {
            alert("Erro ao concluir pedidos em lote: " + e.message);
        } finally {
            setProcessandoMassa(false);
        }
    };

    useEffect(() => {
        if (registrarFuncaoConcluirDigital) {
            registrarFuncaoConcluirDigital(concluirDigitalEmLote);
        }
    }, [selecionados, pedidosDigitais, processandoMassa]);

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
                    <h3 style={{ margin: 0, color: theme.textMain, fontSize: '18px' }}>💻 Pedidos Digitais</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textSec }}>Gerencie os produtos digitais ou de entrega por e-mail vendidos na loja.</p>
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
                {pedidosDigitais.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>
                        Nenhum pedido digital pendente no momento. 🎉
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
                        const endereco = pedido.endereco || (pedido as any).cliente?.endereco || {};

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
                        const freteVal = Number(fin.vlFrete ?? fin.valorFrete ?? 0);
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
                                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: (pedido.origemPedido || "").toLowerCase() === 'pdv' ? '#8b5cf6' : '#3b82f6', color: '#fff', textTransform: 'uppercase', flexShrink: 0 }}>
                                                {pedido.origemPedido || 'Site'}
                                            </span>

                                            <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '14px', width: '220px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                            <span style={{ fontSize: '12px', color: theme.textSec, fontFamily: 'monospace', backgroundColor: theme.border, padding: '2px 6px', borderRadius: '4px', width: '220px', flexShrink: 0, wordBreak: 'break-all' }} title={idPedidoExibicao}>ID Pedido: {idPedidoExibicao}</span>
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
                                                    checked={selecionados.includes(pedido.id)}
                                                    onChange={() => setSelecionados(prev => prev.includes(pedido.id) ? prev.filter(item => item !== pedido.id) : [...prev, pedido.id])}
                                                    style={{ transform: 'scale(1.2)', cursor: 'pointer', flexShrink: 0 }}
                                                />
                                                <span style={{ fontWeight: '800', color: theme.primary, fontSize: '15px', flexShrink: 0 }}>#{numPedidoFormatado}</span>

                                                {/* 🌟 Badge de Origem Mobile */}
                                                <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '4px', backgroundColor: (pedido.origemPedido || "").toLowerCase() === 'pdv' ? '#8b5cf6' : '#3b82f6', color: '#fff', textTransform: 'uppercase', flexShrink: 0 }}>
                                                    {pedido.origemPedido || 'Site'}
                                                </span>

                                                <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '14px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
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

                                            {/* BLOCO 1: PERSONALIZAÇÃO */}
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

                                            {/* BLOCO 2: ENDEREÇO */}
                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>📍 Endereço</div>
                                                <div style={{ fontSize: '11px', color: theme.textSec, lineHeight: '1.4' }}>
                                                    <strong>Rua:</strong> {endereco.dsRuaCliente || endereco.rua || '-'}<br />
                                                    <strong>Número:</strong> {endereco.dsNumeroCliente || endereco.numero || '-'}<br />
                                                    <strong>Bairro:</strong> {endereco.dsBairroCliente || endereco.bairro || '-'}<br />
                                                    <strong>Cidade:</strong> {endereco.dsCidadeCliente || endereco.cidade || '-'}&nbsp;&nbsp;<strong>UF:</strong> {endereco.dsUfCliente || endereco.uf || '-'}<br />
                                                    <strong>CEP:</strong> {endereco.dsCepCliente || endereco.cep || '-'}
                                                </div>
                                            </div>

                                            {/* BLOCO 3: LOGÍSTICA */}
                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>🚚 Logística</div>
                                                <div style={{ fontSize: '11px', color: theme.textSec, lineHeight: '1.4' }}>
                                                    <div><strong>Forma de Entrega:</strong> {pedidoLogistica.dsFormaEntrega || 'Digital'}</div>
                                                    <div><strong>Método de Pagamento:</strong> {fin.dsMetodoPagamento || fin.metodo || 'PIX'}</div>
                                                    <div><strong>Transportadora ID:</strong> {fin.dsTransportadoraId || cotacao.dsTransportadoraIdCotado || '-'}</div>
                                                    <div><strong>Serviço:</strong> {pedido?.logistica?.dsServico || 'Digital'}</div>
                                                </div>
                                            </div>

                                            {/* BLOCO 4: ETIQUETA */}
                                            <div style={{ ...localStyles.caixaBlocoPadrao, backgroundColor: theme.bgCard, borderColor: theme.border }}>
                                                <div style={{ fontWeight: 'bold', color: theme.textMain, marginBottom: '4px', fontSize: '12px' }}>🏷️ Etiqueta</div>
                                                <div style={{ fontSize: '11px', color: theme.textSec, fontStyle: 'italic', padding: '4px 0' }}>
                                                    Pedido digital, não possui etiqueta de envio.
                                                </div>
                                            </div>

                                            {/* BLOCO 5: PAGAMENTO */}
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

const ItemResumido = React.memo(({ item, pedidoLogistica, pedido, isFirstItem }: any) => {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO ITEM RESUMIDO
    const { theme } = useTheme();

    const selo = obterSeloItem(item, pedidoLogistica);
    const qtd = item.quantidade || item.qty || 1;

    // 🚀 Lógica otimizada: Consome a foto diretamente do item salvo no pedido, sem consultas ao Firebase
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
    conteudoExpandido: { padding: '16px', borderTop: '1px solid' },
    gridExpandido: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px' },
    caixaPersonalizacao: { border: '1px solid', borderRadius: '8px', padding: '10px' },
    caixaBlocoPadrao: { border: '1px solid', borderRadius: '8px', padding: '10px' }
};