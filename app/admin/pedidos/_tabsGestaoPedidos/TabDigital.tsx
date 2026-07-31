'use client';
import React, { useState, useMemo } from 'react';
import { Pedido } from '@/types/pedido';
import useSWR from 'swr';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface TabDigitalProps {
    pedidos: Pedido[];
    lojistaIdApp: string;
    db: any;
    dadosLoja: any;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    selecionados: string[];
    setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
    mudarStatusDireto: (pedido: Pedido, novoStatus: string) => Promise<void>;
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

export default function TabDigital({
    pedidos, lojistaIdApp, db, setLocalPedidos, selecionados = [], setSelecionados, mudarStatusDireto
}: TabDigitalProps) {
    const [processandoMassa, setProcessandoMassa] = useState(false);
    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    // Paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 30;

    const pedidosDigitais = useMemo(() => {
        return pedidos.filter(p => {
            if (!p) return false;
            const statusGeral = String(p.status || '').trim().toLowerCase();
            if (statusGeral === 'concluído' || statusGeral === 'concluido' || statusGeral === 'enviado' || (p as any).enviado === true) return false;

            const pedidoLogistica = (p as any).logistica || {};
            const formaEntrega = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();
            const temItemDigital = Array.isArray(p.itens) && p.itens.some((i: any) => i.precisaFrete === false);
            
            const isDigital = formaEntrega === 'digital' || temItemDigital;

            if (!isDigital) return false;

            return true;
        });
    }, [pedidos]);

    const pedidosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        return pedidosDigitais.slice(inicio, inicio + itensPorPagina);
    }, [pedidosDigitais, paginaAtual]);

    const totalPaginas = Math.ceil(pedidosDigitais.length / itensPorPagina);

    // Contagem restrita estritamente aos pedidos visíveis nesta aba
    const idsVisiveisNestaAba = useMemo(() => pedidosDigitais.map(p => p.id), [pedidosDigitais]);
    const selecionadosNestaAbaCount = useMemo(() => {
        return (selecionados || []).filter(id => idsVisiveisNestaAba.includes(id)).length;
    }, [selecionados, idsVisiveisNestaAba]);

    const toggleExpandir = (id: string) => {
        setPedidosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
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
                    enviado: true
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

    return (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', minHeight: '52px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>💻 Pedidos Digitais</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Gerencie os produtos digitais ou de entrega por e-mail vendidos na loja.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                    {selecionadosNestaAbaCount > 0 ? (
                        <div style={{ display: 'flex', gap: '10px', backgroundColor: '#eff6ff', padding: '8px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af' }}>{selecionadosNestaAbaCount} selecionados</span>
                            <button onClick={concluirDigitalEmLote} disabled={processandoMassa} style={{ padding: '8px 14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                                {processandoMassa ? "⏳ Processando..." : "✅ Concluir Envio"}
                            </button>
                        </div>
                    ) : (
                        <div style={{ visibility: 'hidden', height: '40px' }} />
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pedidosDigitais.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Nenhum pedido digital pendente no momento. 🎉
                    </div>
                ) : (
                    pedidosPaginados.map(pedido => {
                        const nomeCliente = typeof pedido.cliente === 'object' ? (pedido.cliente?.nmNomeCliente || pedido.cliente?.nome || "Cliente") : (pedido.cliente || "Cliente");
                        const numPedidoFormatado = String(pedido.numeroPedido || pedido.numero || pedido.id?.slice(-4) || "").padStart(5, '0');
                        const expandido = !!pedidosExpandidos[pedido.id];
                        const idPedidoExibicao = String(pedido.id || "");

                        const pedidoLogistica = (pedido as any).logistica || {};
                        const formaEntrega = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();
                        const temItemDigital = Array.isArray(pedido.itens) && pedido.itens.some((i: any) => i.precisaFrete === false);
                        const isDigital = formaEntrega === 'digital' || temItemDigital;

                        const temPersonalizacao = pedido.itens?.some(i => {
                            const resp = i.respostasFormatadas || i.personalizacao;
                            if (!resp) return false;
                            if (typeof resp === 'object' && Object.keys(resp).length > 0) return true;
                            if (typeof resp === 'string' && resp.trim() !== '') return true;
                            return false;
                        });

                        return (
                            <div key={pedido.id} style={{ ...localStyles.cardContainer, border: `1.5px solid ${pedido.pago ? '#2ecc71' : '#e74c3c'}` }}>
                                {/* LINHA PRINCIPAL DO CARD */}
                                <div
                                    onClick={() => toggleExpandir(pedido.id)}
                                    style={localStyles.cardHeaderLinha}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={(selecionados || []).includes(pedido.id)}
                                            onChange={() => setSelecionados(prev => (prev || []).includes(pedido.id) ? (prev || []).filter(i => i !== pedido.id) : [...(prev || []), pedido.id])}
                                            style={{ transform: 'scale(1.2)', cursor: 'pointer', flexShrink: 0 }}
                                        />
                                        <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '15px', width: '70px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
                                        <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px', width: '220px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                        <span style={{ fontSize: '12px', color: '#16181b', fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', width: '235px', flexShrink: 0, wordBreak: 'break-all' }} title={idPedidoExibicao}>ID Pedido: {idPedidoExibicao}</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0, marginLeft: '10px' }}>
                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                                            {formatarData(pedido.data || (pedido.cliente as any)?.data)}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>{expandido ? '▲' : '▼'}</span>
                                    </div>
                                </div>

                                {/* LISTA DE ITENS COMPACTA */}
                                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pedido.itens?.map((item: any, idx: number) => (
                                        <ItemResumido key={idx} item={item} lojistaId={lojistaIdApp} pedidoLogistica={pedidoLogistica} db={db} />
                                    ))}
                                </div>

                                {/* CONTEÚDO EXPANDIDO (4 BLOCOS) */}
                                {expandido && (
                                    <div style={localStyles.conteudoExpandido}>
                                        <div style={localStyles.gridExpandido}>
                                            {/* Bloco 1: Personalização */}
                                            <div style={localStyles.caixaPersonalizacao}>
                                                <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '6px', fontSize: '13px' }}>
                                                    ✨ Personalização / Dados:
                                                </div>
                                                {temPersonalizacao ? (
                                                    pedido.itens.map((item: any, idx: number) => {
                                                        const resp = item.respostasFormatadas || item.personalizacao;
                                                        if (!resp || (typeof resp === 'object' && Object.keys(resp).length === 0)) return null;
                                                        return (
                                                            <div key={idx} style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.4', marginBottom: '4px' }}>
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
                                                    <div style={{ fontSize: '12px', color: '#92400e', fontStyle: 'italic' }}>Nenhuma personalização informada.</div>
                                                )}
                                            </div>

                                            {/* Bloco 2: Contato / E-mail */}
                                            <div style={localStyles.caixaBlocoPadrao}>
                                                <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '6px', fontSize: '13px' }}>📧 Contato do Cliente</div>
                                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                                                    <div><strong>E-mail:</strong> {typeof pedido.cliente === 'object' ? (pedido.cliente?.dsEmailCliente || pedido.cliente?.email || '-') : '-'}</div>
                                                    <div><strong>Telefone:</strong> {typeof pedido.cliente === 'object' ? (pedido.cliente?.dsTelefoneCliente || pedido.cliente?.telefone || '-') : '-'}</div>
                                                </div>
                                            </div>

                                            {/* Bloco 3: Logística Digital */}
                                            <div style={localStyles.caixaBlocoPadrao}>
                                                <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '6px', fontSize: '13px' }}>💻 Logística de Entrega</div>
                                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                                                    <div><strong>Forma:</strong> Digital</div>
                                                    <div><strong>Status: "Envio por E-mail</strong> </div>
                                                
                                                </div>
                                            </div>

                                            {/* Bloco 4: Ações e Status */}
                                            <div style={localStyles.caixaBlocoPadrao}>
                                                <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '6px', fontSize: '13px' }}>💳 Ações e Status</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#334155' }}>
                                                    <div><b>Status Pagamento:</b> {pedido.pago ? '✅ Pago' : '❌ Pendente'}</div>
                                                    
                                                    
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
    pageBtn: { padding: '8px 16px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' },
    btnConcluir: { padding: '8px 12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', width: '100%', marginTop: '4px' }
};

const localStyles: { [key: string]: React.CSSProperties } = {
    cardContainer: { borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    cardHeaderLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', minHeight: '45px', boxSizing: 'border-box' },
    itemLinhaResumida: { display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 8px', backgroundColor: '#fdfdfd', borderRadius: '6px', border: '1px solid #f1f5f9' },
    conteudoExpandido: { padding: '16px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' },
    gridExpandido: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' },
    caixaPersonalizacao: { backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px' },
    caixaBlocoPadrao: { backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }
};