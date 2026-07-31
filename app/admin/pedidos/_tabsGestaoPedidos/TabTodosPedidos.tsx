'use client';
import React, { useState, useMemo } from 'react';
import { Pedido } from '@/types/pedido';
import useSWR from 'swr';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface TabProps {
    pedidos: Pedido[];
    loading: boolean;
    lojistaIdApp: string;
    db: any;
    mudarStatusDireto: (p: Pedido, status: string) => void;
    alternarPago: (p: Pedido) => void;
    dispararSegurancaDeletar: (p: Pedido) => void;
    cotarFrete: (p: Pedido) => Promise<any[]>;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    dadosLoja: any;
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

export default function TabTodosPedidos({
    pedidos, loading, lojistaIdApp, db, alternarPago, dispararSegurancaDeletar, cotarFrete, setLocalPedidos, selecionados, setSelecionados
}: TabProps) {
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 30;

    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    const [pedidoSelecionadoParaFrete, setPedidoSelecionadoParaFrete] = useState<Pedido | null>(null);
    const [opcoesFreteCotadas, setOpcoesFreteCotadas] = useState<any[]>([]);
    const [loadingFreteModal, setLoadingFreteModal] = useState(false);

    const pedidosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        return pedidos.slice(inicio, inicio + itensPorPagina);
    }, [pedidos, paginaAtual]);

    const totalPaginas = Math.ceil(pedidos.length / itensPorPagina);

    const toggleExpandir = (id: string) => {
        setPedidosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const abrirJanelaCotacao = async (pedido: Pedido) => {
        setPedidoSelecionadoParaFrete(pedido);
        setLoadingFreteModal(true);
        const opcoes = await cotarFrete(pedido);
        setOpcoesFreteCotadas(opcoes || []);
        setLoadingFreteModal(false);
    };

    const selecionarTransportadora = async (opcaoFrete: any) => {
        if (!db || !pedidoSelecionadoParaFrete || !lojistaIdApp) return;
        try {
            const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoSelecionadoParaFrete.id);
            const novoMetodo = `Logística: ${opcaoFrete.name}`;

            await updateDoc(pedidoRef, {
                "financeiro.metodo": novoMetodo,
                "financeiro.dsTransportadoraId": String(opcaoFrete.id),
                "financeiro.vlFrete": Number(opcaoFrete.price || 0),
                "financeiro.prazoEntrega": Number(opcaoFrete.delivery_time || 0),
                "Cotacao.dsMetodoPagamentoCotado": opcaoFrete.name,
                "Cotacao.dsTransportadoraIdCotado": opcaoFrete.id,
                "Cotacao.vlFreteCotado": Number(opcaoFrete.price || 0),
                "Cotacao.prazoEntregaCotado": Number(opcaoFrete.delivery_time || 0)
            });

            setLocalPedidos(prev => prev.map(p => p.id === pedidoSelecionadoParaFrete.id ? {
                ...p,
                financeiro: {
                    ...p.financeiro,
                    metodo: novoMetodo,
                    dsTransportadoraId: String(opcaoFrete.id),
                    vlFrete: Number(opcaoFrete.price || 0),
                    prazoEntrega: Number(opcaoFrete.delivery_time || 0)
                },
                Cotacao: {
                    ...(p as any).Cotacao,
                    dsMetodoPagamentoCotado: opcaoFrete.name,
                    dsTransportadoraIdCotado: opcaoFrete.id,
                    vlFreteCotado: Number(opcaoFrete.price || 0),
                    prazoEntregaCotado: Number(opcaoFrete.delivery_time || 0)
                }
            } : p));

            setPedidoSelecionadoParaFrete(null);
        } catch (e: any) {
            alert("Erro ao selecionar: " + e.message);
        }
    };

    const resetarEtiqueta = async (pedido: Pedido) => {
        if (!confirm("⚠️ Resetar etiqueta? Isso permitirá cotar novamente.")) return;
        try {
            const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedido.id);
            await updateDoc(pedidoRef, {
                etiquetaGerada: false,
                statusEtiqueta: null,
                urlEtiqueta: null,
                "Etiqueta": null,
                "financeiro.metodo": null,
                "financeiro.vlFrete": null,
                "financeiro.prazoEntrega": null,
                Cotacao: null
            });
            setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
                ...p,
                etiquetaGerada: false,
                statusEtiqueta: undefined,
                Etiqueta: undefined,
                financeiro: { ...p.financeiro, metodo: undefined, vlFrete: undefined, prazoEntrega: undefined },
                Cotacao: undefined
            } : p));
            alert("✅ Etiqueta resetada!");
        } catch (e: any) {
            alert("Erro ao resetar: " + e.message);
        }
    };

    return (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', minHeight: '52px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📦 Todos os Pedidos Recebidos
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        Acompanhe todos os novos pedidos que chegam na loja em tempo real. Clique em um pedido para expandir os detalhes.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando pedidos...</div>
                ) : pedidosPaginados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhum pedido encontrado.</div>
                ) : (
                    pedidosPaginados.map(pedido => {
                        const nomeCliente = typeof pedido.cliente === 'object' ? (pedido.cliente?.nmNomeCliente || pedido.cliente?.nome || "Cliente") : (pedido.cliente || "Cliente");
                        const numPedidoFormatado = String(pedido.numeroPedido || pedido.numero || pedido.id?.slice(-4) || "").padStart(5, '0');
                        const idPedidoExibicao = String(pedido.id || "");
                        const expandido = !!pedidosExpandidos[pedido.id];

                        const pedidoLogistica = (pedido as any).logistica || {};
                        const cotacao = (pedido as any).Cotacao || {};
                        const etiquetaData = (pedido as any).Etiqueta || {};
                        const endereco = pedido.endereco || (pedido as any).cliente?.endereco || {};
                        const formaEntrega = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();
                        const isRetirada = pedidoLogistica.isRetirada === true || formaEntrega === 'retirada';
                        const isDigital = formaEntrega === 'digital';
                        const precisaFrete = pedido.itens?.some((i: any) => i.precisaFrete !== false) && !isRetirada && !isDigital;

                        const temPersonalizacao = pedido.itens?.some(i => i.respostasFormatadas || i.personalizacao);

                        return (
                            <div
                                key={pedido.id}
                                style={{
                                    ...localStyles.cardContainer,
                                    border: `1.5px solid ${pedido.pago ? '#2ecc71' : '#e74c3c'}`
                                }}
                            >
                                {/* LINHA PRINCIPAL DO CARD */}
                                <div
                                    onClick={() => toggleExpandir(pedido.id)}
                                    style={localStyles.cardHeaderLinha}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selecionados.includes(pedido.id)}
                                            onChange={() => setSelecionados(prev => prev.includes(pedido.id) ? prev.filter(i => i !== pedido.id) : [...prev, pedido.id])}
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
                                                    ✨ Personalização:
                                                </div>
                                                {temPersonalizacao ? (
                                                    pedido.itens.map((item: any, idx: number) => {
                                                        const resp = item.respostasFormatadas || item.personalizacao || {};
                                                        return (
                                                            <div key={idx} style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.4', marginBottom: '4px' }}>
                                                                {Object.entries(resp).map(([k, v]) => (
                                                                    <div key={k}>{k}: <strong>{String(v)}</strong></div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div style={{ fontSize: '12px', color: '#92400e', fontStyle: 'italic' }}>Este item não tem personalização.</div>
                                                )}
                                            </div>

                                            {/* Bloco 2: Endereço */}
                                            <div style={localStyles.caixaBlocoPadrao}>
                                                <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '6px', fontSize: '13px' }}>📍 Endereço de Entrega</div>
                                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
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

                                            {/* Bloco 3: Dados da Transportadora */}
                                            <div style={localStyles.caixaBlocoPadrao}>
                                                <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '6px', fontSize: '13px' }}>🚚 Transportadora / Logística</div>
                                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                                                    {!precisaFrete ? (
                                                        <div style={{ color: '#64748b', fontStyle: 'italic' }}>Pedido sem Frete</div>
                                                    ) : isRetirada ? (
                                                        <div>
                                                            <div><strong>Forma:</strong> Retirada na Loja</div>
                                                            <div><strong>Status:</strong> {pedidoLogistica.dsMetodoPagamento || "Retirar na Loja (Grátis)"}</div>
                                                        </div>
                                                    ) : isDigital ? (
                                                        <div>
                                                            <div><strong>Forma:</strong> Digital</div>
                                                            <div><strong>Status:</strong> Envio por E-mail</div>
                                                        </div>
                                                    ) : (pedido.financeiro?.dsTransportadoraId || cotacao.dsTransportadoraIdCotado || pedido.etiquetaGerada) ? (
                                                        <div>
                                                            <div><strong>Método:</strong> {cotacao.dsMetodoPagamentoCotado || pedido.financeiro?.metodo?.replace('Logística: ', '') || pedidoLogistica.dsMetodoPagamento || "Definida"}</div>
                                                            <div><strong>Valor:</strong> R$ {Number(cotacao.vlFreteCotado ?? pedido.financeiro?.vlFrete ?? 0).toFixed(2).replace('.', ',')}</div>
                                                            <div><strong>Prazo:</strong> {cotacao.prazoEntregaCotado ?? pedido.financeiro?.prazoEntrega ?? 0} dias</div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ color: '#d97706', marginBottom: '6px' }}>Precisa Cotar Frete</div>
                                                            <button onClick={() => abrirJanelaCotacao(pedido)} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', cursor: 'pointer', width: '100%' }}>
                                                                🚚 Cotar Transportadora
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Bloco 4: Dados da Etiqueta */}
                                            <div style={localStyles.caixaBlocoPadrao}>
                                                <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '6px', fontSize: '13px' }}>🏷️ Dados da Etiqueta</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {!precisaFrete ? (
                                                        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                                                            Pedido sem etiquetas de envio
                                                        </div>
                                                    ) : pedido.etiquetaGerada || etiquetaData.statusEtiqueta ? (
                                                        <div style={{ fontSize: '11px', color: '#047857', lineHeight: '1.4' }}>
                                                            <div><b>IdEtiqueta:</b> {etiquetaData.IdEtiqueta || pedido.idEtiqueta || '-'}</div>
                                                            <div><b>Código Envio:</b> {etiquetaData.codigoEnvio || '-'}</div>
                                                            <div><b>Status:</b> {etiquetaData.statusEtiqueta || pedido.statusEtiqueta || 'Pendente'}</div>
                                                            <div><b>Rastreio:</b> {etiquetaData.dsNumRastreio || pedido.dsNumRastreio || '-'}</div>
                                                            <div><b>Serviço:</b> {etiquetaData.servicoVinculado || '-'}</div>
                                                            <div><b>Valor Cobrado:</b> R$ {Number(etiquetaData.valorCobrado ?? 0).toFixed(2).replace('.', ',')}</div>
                                                            {etiquetaData.urlEtiqueta || pedido.urlEtiqueta ? (
                                                                <a href={etiquetaData.urlEtiqueta || pedido.urlEtiqueta} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'block', marginTop: '2px' }}>
                                                                    Ver Etiqueta PDF
                                                                </a>
                                                            ) : null}
                                                            <button onClick={() => resetarEtiqueta(pedido)} style={{ display: 'block', background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', marginTop: '4px', padding: 0 }}>
                                                                Resetar Etiqueta
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                            Aguardando emissão de etiqueta
                                                        </div>
                                                    )}
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

            {pedidoSelecionadoParaFrete && (
                <div style={localStyles.modalOverlayCentroFix}>
                    <div style={localStyles.modalContentCentroCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>📦 Escolher Transportadora</h3>
                            <button onClick={() => setPedidoSelecionadoParaFrete(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
                        </div>
                        {loadingFreteModal ? <p style={{ textAlign: 'center', padding: '20px' }}>Consultando frete...</p> : opcoesFreteCotadas.map((opt) => (
                            <div key={opt.id} onClick={() => selecionarTransportadora(opt)} style={styles.opcaoFreteCard}>
                                <div>{opt.name}</div><b>R$ {Number(opt.price).toFixed(2)}</b>
                            </div>
                        ))}
                    </div>
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
    opcaoFreteCard: { padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', cursor: 'pointer', backgroundColor: '#f8fafc' }
};

const localStyles: { [key: string]: React.CSSProperties } = {
    cardContainer: { borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    cardHeaderLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', minHeight: '45px', boxSizing: 'border-box' },
    itemLinhaResumida: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', backgroundColor: '#fdfdfd', borderRadius: '6px', border: '1px solid #f1f5f9' },
    conteudoExpandido: { padding: '16px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' },
    gridExpandido: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' },
    caixaPersonalizacao: { backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px' },
    caixaBlocoPadrao: { backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' },
    modalOverlayCentroFix: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContentCentroCard: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }
};