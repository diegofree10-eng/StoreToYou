'use client';
import React, { useState, useMemo } from 'react';
import { Pedido } from '@/types/pedido';
import useSWR from 'swr';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface TabEmitirEtiquetasProps {
    pedidos: Pedido[];
    lojistaIdApp: string;
    db: any;
    dadosLoja: any;
    setModalProgresso: React.Dispatch<React.SetStateAction<any>>;
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

export default function TabEmitirEtiquetas({
    pedidos, lojistaIdApp, db, setModalProgresso, setLocalPedidos, selecionados = [], setSelecionados
}: TabEmitirEtiquetasProps) {
    const [processandoMassa, setProcessandoMassa] = useState(false);
    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    // Paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 30;

    const pedidosProntosParaEtiqueta = useMemo(() => {
        return pedidos.filter(p => {
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
    }, [pedidosProntosParaEtiqueta, paginaAtual]);

    const totalPaginas = Math.ceil(pedidosProntosParaEtiqueta.length / itensPorPagina);

    // Contagem restrita estritamente aos pedidos visíveis nesta aba
    const idsVisiveisNestaAba = useMemo(() => pedidosProntosParaEtiqueta.map(p => p.id), [pedidosProntosParaEtiqueta]);
    const selecionadosNestaAbaCount = useMemo(() => {
        return (selecionados || []).filter(id => idsVisiveisNestaAba.includes(id)).length;
    }, [selecionados, idsVisiveisNestaAba]);

    const toggleExpandir = (id: string) => {
        setPedidosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const gerarEtiquetasEmLote = async () => {
        const aptos = pedidosProntosParaEtiqueta.filter(p => (selecionados || []).includes(p.id));

        if (aptos.length === 0) return alert("Nenhum pedido selecionado apto para emissão.");

        setModalProgresso({
            aberto: true,
            titulo: "Gerando etiquetas em lote...",
            itens: aptos.map(p => ({ id: p.id, numero: String(p.numeroPedido || p.id.slice(-4)), status: 'processando' }))
        });

        setProcessandoMassa(true);

        for (const pedido of aptos) {
            try {
                const res = await fetch("/api/frete/gerar-massa", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lojistaId: lojistaIdApp, orders: [pedido] })
                });
                const data = await res.json();

                const temErro = !data.success || (data.errors && data.errors.length > 0);
                const mensagemErro = temErro ? (data.message || data.errors?.[0]?.message || JSON.stringify(data.errors?.[0]) || "Erro desconhecido na API do Melhor Envio") : "";

                const isPendenteSaldo = mensagemErro.toLowerCase().includes('saldo') || mensagemErro.toLowerCase().includes('balance');
                const statusEtiquetaFinal = isPendenteSaldo ? 'pendente_saldo' : (!temErro ? 'paga' : 'erro');

                setModalProgresso((prev: any) => ({
                    ...prev,
                    itens: prev.itens.map((i: any) => i.id === pedido.id ? {
                        ...i,
                        status: !temErro ? 'sucesso' : 'erro',
                        mensagem: mensagemErro
                    } : i)
                }));

                setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
                    ...p,
                    etiquetaGerada: !temErro,
                    statusEtiqueta: statusEtiquetaFinal,
                    Etiqueta: {
                        ...(p as any).Etiqueta,
                        statusEtiqueta: statusEtiquetaFinal,
                        mensagemErro: mensagemErro
                    }
                } : p));

            } catch (err: any) {
                setModalProgresso((prev: any) => ({
                    ...prev,
                    itens: prev.itens.map((i: any) => i.id === pedido.id ? { ...i, status: 'erro', mensagem: err?.message || "Erro de rede" } : i)
                }));
            }
        }
        setProcessandoMassa(false);
        setSelecionados([]);
    };

    const enviarPedidosEmLote = async () => {
        const selecionadosAtuais = (selecionados || []).filter(id => idsVisiveisNestaAba.includes(id));
        if (selecionadosAtuais.length === 0) return alert("Nenhum pedido selecionado para envio.");
        if (!db || !lojistaIdApp) return;

        if (!confirm(`Deseja realmente enviar os ${selecionadosAtuais.length} pedidos selecionados? Eles serão movidos para a aba de Enviados.`)) {
            return;
        }

        try {
            for (const idPedido of selecionadosAtuais) {
                const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", idPedido);
                await updateDoc(pedidoRef, {
                    status: 'enviado',
                    enviado: true
                });
            }

            setLocalPedidos(prev => prev.map(p => selecionadosAtuais.includes(p.id) ? {
                ...p,
                status: 'enviado',
                enviado: true
            } : p));

            setSelecionados(prev => prev.filter(id => !selecionadosAtuais.includes(id)));
            alert("✅ Pedidos enviados com sucesso e movidos para a aba de Enviados!");
        } catch (e: any) {
            alert("Erro ao enviar pedidos em lote: " + e.message);
        }
    };

    return (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', minHeight: '52px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>🏷️ Central de Emissão de Etiquetas</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Selecione os pedidos para emitir etiquetas ou finalizar o envio.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                    {selecionadosNestaAbaCount > 0 ? (
                        <div style={{ display: 'flex', gap: '10px', backgroundColor: '#eff6ff', padding: '8px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af' }}>{selecionadosNestaAbaCount} selecionados</span>
                            <button onClick={gerarEtiquetasEmLote} disabled={processandoMassa} style={{ padding: '8px 14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                                {processandoMassa ? "⏳ Emitindo..." : "🏷️ Emitir Etiquetas em Lote"}
                            </button>
                            <button onClick={enviarPedidosEmLote} disabled={processandoMassa} style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                                📦 Enviar Pedidos em Lote
                            </button>
                        </div>
                    ) : (
                        <div style={{ visibility: 'hidden', height: '40px' }} />
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pedidosProntosParaEtiqueta.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Nenhum pedido aguardando emissão ou envio no momento. 🎉
                    </div>
                ) : (
                    pedidosPaginados.map(pedido => {
                        const nomeCliente = typeof pedido.cliente === 'object' ? (pedido.cliente?.nmNomeCliente || pedido.cliente?.nome || "Cliente") : (pedido.cliente || "Cliente");
                        const numPedidoFormatado = String(pedido.numeroPedido || pedido.numero || pedido.id?.slice(-4) || "").padStart(5, '0');
                        const expandido = !!pedidosExpandidos[pedido.id];
                        const idPedidoExibicao = String(pedido.id || "");

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
                        const isPendenteSaldo = statusEtq.includes('saldo') || statusEtq.includes('pendente_saldo') || msgErroEtq.includes('saldo') || msgErroEtq.includes('balance');

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
                                        <span style={{ fontSize: '12px', color: '#16181b', fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', width: '220px', flexShrink: 0, wordBreak: 'break-all' }} title={idPedidoExibicao}>ID Pedido: {idPedidoExibicao}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '235px', flexShrink: 0 }}>
                                            
                                            {isPendenteSaldo && (
                                                <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#f8f6f6', color: '#d60404', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a00303', whiteSpace: 'nowrap' }}>
                                                    Falha Pgto - Acesse Painel Melhor Envios
                                                </span>
                                            )}
                                        </div>
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
                                                    <div style={{ fontSize: '12px', color: '#92400e', fontStyle: 'italic' }}>Este pedido não tem personalização.</div>
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
    pageBtn: { padding: '8px 16px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }
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