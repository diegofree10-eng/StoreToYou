'use client';
import React, { useState, useMemo } from 'react';
import { Pedido } from '@/types/pedido';
import useSWR from 'swr';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface TabProntoProps {
    pedidos: Pedido[];
    loading: boolean;
    lojistaIdApp: string;
    db: any;
    cotarFrete: (p: Pedido) => Promise<any[]>;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    mudarStatusDireto: (p: Pedido, status: string) => void;
    setModalProgresso: React.Dispatch<React.SetStateAction<any>>;
}

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
    const isRetirada = pedidoLogistica?.isRetirada === true || pedidoLogistica?.dsFormaEntrega === 'retirada' || formaItem === 'retirada';
    const isDigital = item.precisaFrete === false || formaItem === 'digital';

    if (isRetirada) {
        return { texto: "Retirada na Loja", cor: "#f59e0b" };
    }
    if (isDigital) {
        return { texto: "Digital (E-mail)", cor: "#3b82f6" };
    }
    return { texto: "Transportadora", cor: "#10b981" };
};

const LinhaItemPronto = React.memo(({ item, lojistaId, pedidoLogistica, db }: any) => {
    const idProd = item.idProduto || item.id;
    const { data: produtoData } = useSWR(
        idProd && lojistaId ? `lojistas/${lojistaId}/produtos/${idProd}` : null,
        (key) => fetchProduto(key, db),
        { revalidateOnFocus: false }
    );

    const respostas = item.respostasFormatadas || item.personalizacao || {};
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
                    <span>{qtd}x {item.nome || item.title}</span>
                </div>
                <div style={localStyles.personalizacaoText}>
                    {Object.entries(respostas).map(([key, val]) => <div key={key}>{key}: <strong>{String(val)}</strong></div>)}
                    {Object.keys(respostas).length === 0 && item.variacao && <div>Variação: <strong>{item.variacao}</strong></div>}
                </div>
            </div>
        </div>
    );
});

export default function TabProntoPedidos({
    pedidos, loading, lojistaIdApp, db, cotarFrete, setLocalPedidos, mudarStatusDireto, setModalProgresso
}: TabProntoProps) {
    const [subFiltro, setSubFiltro] = useState<'todos' | 'retirada' | 'digital' | 'transportadora'>('todos');
    
    // 🌐 Estados idênticos ao TabCotarFrete para o Modal funcionar perfeitamente
    const [pedidoSelecionadoParaFrete, setPedidoSelecionadoParaFrete] = useState<Pedido | null>(null);
    const [opcoesFreteCotadas, setOpcoesFreteCotadas] = useState<any[]>([]);
    const [loadingFreteAdmin, setLoadingFreteAdmin] = useState(false);
    const [erroFrete, setErroFrete] = useState<string | null>(null);
    
    const [processandoEtiquetaId, setProcessandoEtiquetaId] = useState<string | null>(null);

    const pedidosProntos = useMemo(() => {
        return pedidos.filter(p => {
            const statusProd = (p.statusProducao || '').toLowerCase();
            return statusProd === 'pronto' && p.status !== 'Concluído';
        });
    }, [pedidos]);

    const pedidosFiltradosSub = useMemo(() => {
        return pedidosProntos.filter(p => {
            const logistica = (p as any).logistica || {};
            const forma = String(logistica.dsFormaEntrega || p.formaEntrega || '').trim().toLowerCase();
            
            const isRetirada = logistica.isRetirada === true || p.retirada === true || forma === 'retirada';
            const isDigital = forma === 'digital';
            const isTransportadora = forma === 'transportadora' || (!isRetirada && !isDigital);

            if (subFiltro === 'retirada') return isRetirada;
            if (subFiltro === 'digital') return isDigital;
            if (subFiltro === 'transportadora') return isTransportadora;
            return true;
        });
    }, [pedidosProntos, subFiltro]);

    const abrirJanelaCotacao = async (pedido: Pedido) => {
        const cepDestino = String(pedido.endereco?.dsCepCliente || (pedido.endereco as any)?.cep || "").trim();
        if (!cepDestino || cepDestino.replace(/\D/g, "").length !== 8) {
            alert(`⚠️ O CEP do cliente neste pedido ("${cepDestino || 'Vazio'}") é inválido ou não foi informado.`);
            return;
        }

        setPedidoSelecionadoParaFrete(pedido);
        setErroFrete(null);
        setLoadingFreteAdmin(true);
        try {
            const opcoes = await cotarFrete(pedido);
            if (!opcoes || opcoes.length === 0) setErroFrete("Nenhuma transportadora encontrada para este endereço.");
            setOpcoesFreteCotadas(opcoes || []);
        } catch (e: any) {
            setErroFrete("Erro ao consultar frete: " + (e?.message || "Erro desconhecido"));
        } finally {
            setLoadingFreteAdmin(false);
        }
    };

    const selecionarEtiquetaManual = async (opcaoFrete: any) => {
        if (!db || !pedidoSelecionadoParaFrete || !lojistaIdApp) return;

        try {
            const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoSelecionadoParaFrete.id);
            const nomeTransportadoraFormatado = `Logística: ${opcaoFrete.name}`;
            const valorFreteNum = Number(opcaoFrete.price || 0);
            const prazoEntregaNum = Number(opcaoFrete.delivery_time || opcaoFrete.prazo || 0);
            const transportadoraIdStr = String(opcaoFrete.id || "");

            await updateDoc(pedidoRef, {
                "financeiro.metodo": nomeTransportadoraFormatado,
                "financeiro.dsTransportadoraId": transportadoraIdStr,
                "logistica.dsTransportadoraId": transportadoraIdStr,
                "logistica.dsMetodoPagamento": opcaoFrete.name,
                "Cotacao.vlFreteCotado": valorFreteNum,
                "Cotacao.dsMetodoPagamentoCotado": opcaoFrete.name,
                "Cotacao.dsTransportadoraIdCotado": transportadoraIdStr,
                "Cotacao.prazoEntregaCotado": prazoEntregaNum
            });

            setLocalPedidos(prev => prev.map(p => p.id === pedidoSelecionadoParaFrete.id ? {
                ...p,
                financeiro: {
                    ...p.financeiro,
                    metodo: nomeTransportadoraFormatado,
                    dsTransportadoraId: transportadoraIdStr
                },
                logistica: {
                    ...(p as any).logistica,
                    dsTransportadoraId: transportadoraIdStr,
                    dsMetodoPagamento: opcaoFrete.name
                },
                Cotacao: {
                    ...(p as any).Cotacao,
                    vlFreteCotado: valorFreteNum,
                    dsMetodoPagamentoCotado: opcaoFrete.name,
                    dsTransportadoraIdCotado: transportadoraIdStr,
                    prazoEntregaCotado: prazoEntregaNum
                }
            } : p));

            setPedidoSelecionadoParaFrete(null);
            alert("✅ Transportadora cotada e definida com sucesso!");
        } catch (e: any) {
            alert("Erro ao selecionar transportadora: " + e.message);
        }
    };

    const emitirEtiquetaUnica = async (pedido: Pedido) => {
        setProcessandoEtiquetaId(pedido.id);
        setModalProgresso({
            aberto: true,
            titulo: `Gerando etiqueta para o pedido #${pedido.numeroPedido || pedido.id.slice(-4)}...`,
            itens: [{ id: pedido.id, numero: String(pedido.numeroPedido || pedido.id.slice(-4)), status: 'processando' }]
        });

        try {
            const res = await fetch("/api/frete/gerar-massa", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lojistaId: lojistaIdApp, orders: [pedido] })
            });
            const data = await res.json();
            const temErro = !data.success || (data.errors && data.errors.length > 0);

            setModalProgresso((prev: any) => ({
                ...prev,
                itens: prev.itens.map((i: any) => i.id === pedido.id ? {
                    ...i,
                    status: !temErro ? 'sucesso' : 'erro',
                    mensagem: !temErro ? "" : (data.errors?.[0]?.message || "Erro ao emitir")
                } : i)
            }));

            if (!temErro) {
                setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
                    ...p,
                    etiquetaGerada: true,
                    statusEtiqueta: 'paga'
                } : p));
            }
        } catch (err) {
            setModalProgresso((prev: any) => ({
                ...prev,
                itens: prev.itens.map((i: any) => i.id === pedido.id ? { ...i, status: 'erro', mensagem: "Erro de rede" } : i)
            }));
        } finally {
            setProcessandoEtiquetaId(null);
        }
    };

    return (
        <div>
            {/* SUB-BARRA DE NAVEGAÇÃO DOS 3 CENÁRIOS */}
            <div style={styles.subBar}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => setSubFiltro('todos')} style={{ ...styles.subBtn, backgroundColor: subFiltro === 'todos' ? '#1e293b' : '#fff', color: subFiltro === 'todos' ? '#fff' : '#475569' }}>
                        📦 Todos Prontos ({pedidosProntos.length})
                    </button>
                    <button onClick={() => setSubFiltro('retirada')} style={{ ...styles.subBtn, backgroundColor: subFiltro === 'retirada' ? '#f59e0b' : '#fff', color: subFiltro === 'retirada' ? '#fff' : '#475569' }}>
                        🏪 Retirada na Loja
                    </button>
                    <button onClick={() => setSubFiltro('digital')} style={{ ...styles.subBtn, backgroundColor: subFiltro === 'digital' ? '#3b82f6' : '#fff', color: subFiltro === 'digital' ? '#fff' : '#475569' }}>
                        📧 Digital (E-mail)
                    </button>
                    <button onClick={() => setSubFiltro('transportadora')} style={{ ...styles.subBtn, backgroundColor: subFiltro === 'transportadora' ? '#10b981' : '#fff', color: subFiltro === 'transportadora' ? '#fff' : '#475569' }}>
                        🚚 Transportadora
                    </button>
                </div>
            </div>

            {/* LISTAGEM DOS PEDIDOS COM LAYOUT MASTER PADRONIZADO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando pedidos prontos...</div>
                ) : pedidosFiltradosSub.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        Nenhum pedido encontrado nesta categoria.
                    </div>
                ) : (
                    pedidosFiltradosSub.map(pedido => {
                        const logistica = (pedido as any).logistica || {};
                        const forma = String(logistica.dsFormaEntrega || pedido.formaEntrega || '').trim().toLowerCase();
                        
                        const isRetirada = logistica.isRetirada === true || pedido.retirada === true || forma === 'retirada';
                        const isDigital = forma === 'digital';

                        const transpFinanceiro = String(pedido.financeiro?.dsTransportadoraId || "").trim();
                        const transpLogistica = String(logistica.dsTransportadoraId || "").trim();
                        const transpCotacao = String((pedido as any).Cotacao?.dsTransportadoraIdCotado || "").trim();

                        const temTransportadoraDefinida = 
                            (transpFinanceiro !== "" && transpFinanceiro !== "null" && transpFinanceiro !== "undefined" && transpFinanceiro !== "0" && transpFinanceiro !== "frete_gratis_ativado") ||
                            (transpLogistica !== "" && transpLogistica !== "null" && transpLogistica !== "undefined" && transpLogistica !== "0" && transpLogistica !== "frete_gratis_ativado") ||
                            (transpCotacao !== "" && transpCotacao !== "null" && transpCotacao !== "undefined" && transpCotacao !== "0" && transpCotacao !== "frete_gratis_ativado");

                        return (
                            <div key={pedido.id} style={localStyles.cardMasterLayout}>
                                {/* FAIXA SUPERIOR DO CARD */}
                                <div style={{ ...localStyles.faixaSuperiorCard, backgroundColor: pedido.pago ? '#2ecc71' : '#e74c3c' }}>
                                    <div style={localStyles.faixaEsquerdaInfoRow}>
                                        <span style={localStyles.numeroPedidoTexto}>
                                            #{String(pedido.numeroPedido || pedido.numero || pedido.id?.slice(-4) || "").padStart(5, '0')}
                                        </span>
                                        <span style={localStyles.clienteNomeTexto}>
                                            {typeof pedido.cliente === 'object' ? (pedido.cliente?.nmNomeCliente || pedido.cliente?.nome || "Cliente") : (pedido.cliente || "Cliente")}
                                        </span>
                                        <span style={localStyles.enderecoTexto}>
                                            {[pedido.endereco?.dsRuaCliente || pedido.endereco?.rua, pedido.endereco?.dsNumeroCliente || pedido.endereco?.numero, pedido.endereco?.dsCidadeCliente || pedido.endereco?.cidade].filter(Boolean).join(", ")}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#059669', color: '#fff', textTransform: 'uppercase' }}>
                                            PROD: PRONTO
                                        </span>
                                    </div>
                                </div>

                                {/* CORPO DO CARD COM LISTA DE ITENS E AÇÕES */}
                                <div style={localStyles.corpoCardInterno}>
                                    <div style={localStyles.colunaEspecificacoesCentro}>
                                        {pedido.itens?.map((item, idx) => (
                                            <LinhaItemPronto key={idx} item={item} lojistaId={lojistaIdApp} pedidoLogistica={logistica} db={db} />
                                        ))}
                                    </div>

                                    {/* COLUNA DE AÇÕES À DIREITA */}
                                    <div style={localStyles.colunaControlesDireita}>
                                        <div style={localStyles.cardLogistica}>
                                            {/* 1️⃣ CENÁRIO: RETIRADA NA LOJA */}
                                            {isRetirada && (
                                                <button onClick={() => mudarStatusDireto(pedido, 'Concluído')} style={styles.btnConcluir}>
                                                    ✅ Concluir (Entregue)
                                                </button>
                                            )}

                                            {/* 2️⃣ CENÁRIO: DIGITAL (E-MAIL) */}
                                            {isDigital && (
                                                <button onClick={() => mudarStatusDireto(pedido, 'Concluído')} style={styles.btnDigital}>
                                                    📧 Concluir (E-mail)
                                                </button>
                                            )}

                                            {/* 3️⃣ CENÁRIO: TRANSPORTADORA */}
                                            {!isRetirada && !isDigital && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {!temTransportadoraDefinida ? (
                                                        <button onClick={() => abrirJanelaCotacao(pedido)} style={styles.btnCotar}>
                                                            ⚡ Cotar Frete
                                                        </button>
                                                    ) : (
                                                        !pedido.etiquetaGerada ? (
                                                            <button 
                                                                onClick={() => emitirEtiquetaUnica(pedido)} 
                                                                disabled={processandoEtiquetaId === pedido.id}
                                                                style={styles.btnEtiqueta}
                                                            >
                                                                {processandoEtiquetaId === pedido.id ? "⏳..." : "🏷️ Emitir Etiqueta"}
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => mudarStatusDireto(pedido, 'Concluído')} style={styles.btnConcluir}>
                                                                ✅ Concluir Pedido
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL DE COTAÇÃO DE FRETE (Padronizado igual ao TabCotarFrete) */}
            {pedidoSelecionadoParaFrete && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>📦 Opções de Frete Disponíveis</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Selecione a transportadora ideal para o pedido #{String(pedidoSelecionadoParaFrete.numeroPedido || pedidoSelecionadoParaFrete.numero || pedidoSelecionadoParaFrete.id.slice(-4))}</p>
                            </div>
                            <button onClick={() => setPedidoSelecionadoParaFrete(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {loadingFreteAdmin ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                                <p style={{ fontSize: '14px', fontWeight: 'bold' }}>⏳ Cotando melhores tarifas...</p>
                                <span style={{ fontSize: '12px' }}>Consultando Melhor Envio</span>
                            </div>
                        ) : erroFrete ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444', fontSize: '13px' }}>
                                {erroFrete}
                            </div>
                        ) : opcoesFreteCotadas.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                                Nenhuma transportadora retornou cotação para este endereço.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                                {opcoesFreteCotadas.map((opt) => (
                                    <div
                                        key={opt.id}
                                        onClick={() => selecionarEtiquetaManual(opt)}
                                        style={{
                                            padding: '12px 16px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            backgroundColor: '#fff',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {opt.company?.picture && (
                                                <img src={opt.company.picture} alt={opt.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{opt.name}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>Prazo estimado: <b>{opt.delivery_time} dias úteis</b></div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#059669' }}>R$ {Number(opt.price).toFixed(2).replace('.', ',')}</div>
                                            <span style={{ fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Selecionar</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    subBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', background: '#f1f5f9', padding: '8px', borderRadius: '8px' },
    subBtn: { padding: '6px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' },
    btnConcluir: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', width: '100%' },
    btnDigital: { backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', width: '100%' },
    btnCotar: { backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', width: '100%' },
    btnEtiqueta: { backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', width: '100%' }
};

const localStyles: { [key: string]: React.CSSProperties } = {
    cardMasterLayout: { backgroundColor: '#f8fafc', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' },
    faixaSuperiorCard: { padding: '12px 16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
    faixaEsquerdaInfoRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
    numeroPedidoTexto: { fontSize: '15px', fontWeight: 'bold' },
    clienteNomeTexto: { fontSize: '14px', fontWeight: 'bold' },
    enderecoTexto: { fontSize: '13px', opacity: 0.9 },
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
    colunaControlesDireita: { width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' },
    cardLogistica: { padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center', backgroundColor: '#f9fafb' }
};