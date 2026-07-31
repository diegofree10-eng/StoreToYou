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

    if (isRetirada) {
        return { texto: "Retirada na Loja", cor: "#f59e0b" };
    }
    if (isDigital) {
        return { texto: "Digital (E-mail)", cor: "#3b82f6" };
    }
    return { texto: "Transportadora", cor: "#10b981" };
};

const LinhaItemProduto = React.memo(({ item, lojistaId, pedidoLogistica, db }: any) => {
    const idProd = item.idProduto || item.id;
    const { data: produtoData } = useSWR(
        idProd && lojistaId ? `lojistas/${lojistaId}/produtos/${idProd}` : null,
        (key) => fetchProduto(key, db),
        { revalidateOnFocus: false }
    );

    const respostas = item.respostasFormatadas || item.personalizacao || {};
    const selo = obterSeloItem(item, pedidoLogistica);

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
        <div style={localStyles.itemCardWhiteBox}>
            <div style={localStyles.imageContainer}>
                {fotoUrl ? (
                    <img src={fotoUrl} alt={item.nome} style={localStyles.productImage as any} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                    <div style={localStyles.productImagePlaceholder}>📦</div>
                )}
            </div>
            <div style={localStyles.itemDetailsCol}>
                <div style={localStyles.itemTitleRow}>
                    <span style={{ ...localStyles.badgeEnvioStyle, backgroundColor: selo.cor, color: '#fff' }}>{selo.texto}</span>
                    <span>{item.nome || item.title}</span>
                </div>
                <div style={localStyles.personalizacaoText}>
                    {Object.entries(respostas).map(([key, val]) => <div key={key}>{key}: <strong>{String(val)}</strong></div>)}
                    {Object.keys(respostas).length === 0 && item.variacao && <div>Variação: <strong>{item.variacao}</strong></div>}
                </div>
            </div>
        </div>
    );
});

export default function TabTodosPedidos({
    pedidos, loading, lojistaIdApp, db, alternarPago, dispararSegurancaDeletar, cotarFrete, setLocalPedidos, selecionados, setSelecionados
}: TabProps) {
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 30;

    const [pedidoSelecionadoParaFrete, setPedidoSelecionadoParaFrete] = useState<Pedido | null>(null);
    const [opcoesFreteCotadas, setOpcoesFreteCotadas] = useState<any[]>([]);
    const [loadingFreteModal, setLoadingFreteModal] = useState(false);

    const pedidosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        return pedidos.slice(inicio, inicio + itensPorPagina);
    }, [pedidos, paginaAtual]);

    const totalPaginas = Math.ceil(pedidos.length / itensPorPagina);

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
                "financeiro.prazoEntrega": Number(opcaoFrete.delivery_time || 0)
            });

            setLocalPedidos(prev => prev.map(p => p.id === pedidoSelecionadoParaFrete.id ? {
                ...p,
                financeiro: { 
                    ...p.financeiro, 
                    metodo: novoMetodo, 
                    dsTransportadoraId: String(opcaoFrete.id),
                    vlFrete: Number(opcaoFrete.price || 0),
                    prazoEntrega: Number(opcaoFrete.delivery_time || 0)
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
            const isOriginalmenteFreteGratis = pedido.financeiro?.dsTransportadoraId === "frete_gratis_ativado" || pedido.financeiro?.freteGratis;
            await updateDoc(pedidoRef, {
                etiquetaGerada: false,
                statusEtiqueta: null,
                urlEtiqueta: null,
                "financeiro.dsTransportadoraId": isOriginalmenteFreteGratis ? "frete_gratis_ativado" : null,
                "financeiro.metodo": null,
                "financeiro.vlFrete": null,
                "financeiro.prazoEntrega": null
            });
            setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
                ...p,
                etiquetaGerada: false,
                statusEtiqueta: undefined,
                financeiro: { ...p.financeiro, metodo: undefined, vlFrete: undefined, prazoEntrega: undefined }
            } : p));
            alert("✅ Etiqueta resetada!");
        } catch (e: any) {
            alert("Erro ao resetar: " + e.message);
        }
    };

    return (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            {/* CABEÇALHO PADRÃO DA ABA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', minHeight: '52px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>📦 Todos os Pedidos</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Visualização completa de todos os pedidos cadastrados na loja.</p>
                </div>
            </div>

            {/* LISTA DE PEDIDOS */}
            <div style={localStyles.containerGridCards}>
                {loading ? <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando...</div>
                    : pedidosPaginados.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhum pedido encontrado.</div>
                        : pedidosPaginados.map((pedido) => {
                            const statusProdAtual = (pedido.statusProducao || 'pendente').toLowerCase();
                            const pedidoLogistica = (pedido as any).logistica || {};

                            return (
                                <div key={pedido.id} style={localStyles.cardMasterLayout}>
                                    <div style={{ ...localStyles.faixaSuperiorCard, backgroundColor: pedido.pago ? '#2ecc71' : '#e74c3c' }}>
                                        <div style={localStyles.faixaEsquerdaInfoRow}>
                                            <input
                                                type="checkbox"
                                                checked={selecionados.includes(pedido.id)}
                                                onChange={() => setSelecionados(prev => prev.includes(pedido.id) ? prev.filter(item => item !== pedido.id) : [...prev, pedido.id])}
                                                style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span style={localStyles.numeroPedidoTexto}>
                                                #{String(pedido.numeroPedido || pedido.numero || pedido.id?.slice(-4) || "").padStart(5, '0')}
                                            </span>

                                            <span style={localStyles.clienteNomeTexto}>
                                                {typeof pedido.cliente === 'object'
                                                    ? (pedido.cliente?.nmNomeCliente || pedido.cliente?.nome || "Cliente")
                                                    : (pedido.cliente || "Cliente")}
                                            </span>

                                            <span style={localStyles.enderecoTexto}>
                                                {[pedido.endereco?.dsRuaCliente, pedido.endereco?.dsNumeroCliente, pedido.endereco?.dsCidadeCliente].filter(Boolean).join(", ")}
                                            </span>

                                            <span style={localStyles.dataTexto}>
                                                🕒 {formatarData(pedido.data || (pedido.cliente as any)?.data)}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                                                backgroundColor: statusProdAtual === 'pronto' ? '#059669' : (statusProdAtual === 'produção' ? '#2563eb' : '#d97706'), color: '#fff'
                                            }}>
                                                PROD: {statusProdAtual}
                                            </span>

                                            <button onClick={() => alternarPago(pedido)} style={localStyles.badgeNaoPago}>
                                                {pedido.pago ? "✅ PAGO" : "❌ NÃO PAGO"}
                                            </button>
                                        </div>
                                    </div>

                                    <div style={localStyles.corpoCardInterno} className="card-corpo-responsive">
                                        <div style={localStyles.colunaEspecificacoesCentro}>
                                            {pedido.itens?.map((item, idx) => <LinhaItemProduto key={idx} item={item} lojistaId={lojistaIdApp} pedidoLogistica={pedidoLogistica} db={db} />)}
                                        </div>
                                        <div style={localStyles.colunaControlesDireita} className="coluna-controles-responsive">
                                            <div style={localStyles.cardLogistica}>
                                                {pedido.etiquetaGerada || (pedido.financeiro?.dsTransportadoraId && pedido.financeiro?.dsTransportadoraId !== "frete_gratis_ativado") ? (
                                                    <div style={{ backgroundColor: pedido.etiquetaGerada ? '#ecfdf5' : '#f8fafc', padding: '8px', borderRadius: '6px', border: `1px solid ${pedido.etiquetaGerada ? '#a7f3d0' : '#cbd5e1'}` }}>
                                                        <div style={{ fontWeight: 'bold', color: pedido.etiquetaGerada ? '#065f46' : '#1e293b', fontSize: '11px', marginBottom: '4px' }}>
                                                            {pedido.etiquetaGerada ? '✅ Etiqueta Emitida' : '🚚 Frete Definido'}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>
                                                            <b>Transportadora:</b> {pedido.financeiro?.metodo?.replace('Logística: ', '') || (pedido as any).logistica?.dsMetodoPagamento || "Definida"}
                                                        </div>
                                                        {pedido.financeiro?.vlFrete !== undefined && (
                                                            <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                                                                <b>Valor:</b> R$ {Number(pedido.financeiro.vlFrete).toFixed(2).replace('.', ',')}
                                                            </div>
                                                        )}
                                                        {pedido.etiquetaGerada && (
                                                            <button onClick={() => resetarEtiqueta(pedido)} style={{ ...localStyles.btnReset, display: 'block', width: '100%', fontSize: '11px', color: '#ef4444', marginTop: '8px' }}>
                                                                🗑️ Resetar Etiqueta
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '8px', textAlign: 'center' }}>
                                                        <button onClick={() => abrirJanelaCotacao(pedido)} style={{ ...localStyles.btnReset, color: '#065f46', fontSize: '11px', display: 'block', width: '100%', fontWeight: 'bold', background: '#e0f2fe', padding: '6px', borderRadius: '4px' }}>
                                                            🚚 Cotar Transportadora
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <button onClick={() => dispararSegurancaDeletar(pedido)} style={localStyles.btnRemoverTransparente}>
                                                🗑️ Remover Pedido
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                        {loadingFreteModal ? <p>Consultando frete...</p> : opcoesFreteCotadas.map((opt) => (
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

const styles: { [key: string]: React.CSSProperties } = {
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', marginTop: '10px' },
    pageBtn: { padding: '8px 16px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' },
    opcaoFreteCard: { padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', cursor: 'pointer', backgroundColor: '#f8fafc' }
};

const localStyles: { [key: string]: React.CSSProperties } = {
    containerGridCards: { display: 'flex', flexDirection: 'column', gap: '12px' },
    cardMasterLayout: { backgroundColor: '#f8fafc', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' },
    faixaSuperiorCard: { padding: '12px 16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', height: '52px', boxSizing: 'border-box' },
    faixaEsquerdaInfoRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
    numeroPedidoTexto: { fontSize: '15px', fontWeight: 'bold' },
    clienteNomeTexto: { fontSize: '14px', fontWeight: 'bold' },
    enderecoTexto: { fontSize: '13px', opacity: 0.9 },
    dataTexto: { fontSize: '12px', opacity: 0.8 },
    badgeNaoPago: { padding: '6px 12px', backgroundColor: 'transparent', border: '2px solid rgba(255,255,255,0.6)', borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
    corpoCardInterno: { padding: '12px', display: 'flex', gap: '16px', alignItems: 'stretch' },
    colunaEspecificacoesCentro: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
    itemCardWhiteBox: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', gap: '16px' },
    imageContainer: { position: 'relative', width: '80px', height: '80px', flexShrink: 0 },
    productImage: { width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover' },
    productImagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
    itemDetailsCol: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    itemTitleRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' },
    badgeEnvioStyle: { padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' },
    personalizacaoText: { fontSize: '13px', color: '#b45309', lineHeight: '1.5' },
    colunaControlesDireita: { width: '220px', flexShrink: '0', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'flex-start', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' },
    btnRemoverTransparente: { padding: '10px', backgroundColor: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' },
    cardLogistica: { padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center', backgroundColor: '#f9fafb', marginBottom: '10px' },
    btnReset: { background: 'none', border: 'none', color: '#059669', textDecoration: 'underline', marginTop: '4px', cursor: 'pointer' },
    modalOverlayCentroFix: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContentCentroCard: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }
};