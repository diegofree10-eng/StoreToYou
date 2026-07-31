'use client';
import React, { useState, useMemo } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import useSWR from 'swr';
import { Pedido } from '@/types/pedido';

interface TabCotarFreteProps {
    pedidos: Pedido[];
    lojistaIdApp: string;
    db: any;
    dadosLoja: any;
    cotarFrete: (p: Pedido) => Promise<any[]>;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    selecionados: string[];
    setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
}
interface TabCotarFreteProps {
    pedidos: Pedido[];
    lojistaIdApp: string;
    db: any;
    dadosLoja: any;
    cotarFrete: (p: Pedido) => Promise<any[]>;
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

export default function TabCotarFrete({
    pedidos, lojistaIdApp, db, dadosLoja, cotarFrete, setLocalPedidos, selecionados = [], setSelecionados
}: TabCotarFreteProps) {
    const [cotandoMassa, setCotandoMassa] = useState(false);
    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    const [pedidoSelecionadoParaFrete, setPedidoSelecionadoParaFrete] = useState<Pedido | null>(null);
    const [opcoesFreteCotadas, setOpcoesFreteCotadas] = useState<any[]>([]);
    const [loadingFreteAdmin, setLoadingFreteAdmin] = useState(false);
    const [erroFrete, setErroFrete] = useState<string | null>(null);

    const pedidosParaCotar = useMemo(() => {
        return pedidos.filter(p => {
            if (!p) return false;
            if (p.etiquetaGerada || p.status === 'Concluído') return false;

            const statusProd = String(p.statusProducao || '').trim().toLowerCase();
            if (statusProd !== 'pronto') return false;

            const itens = Array.isArray(p.itens) ? p.itens : [];
            const temItemFisico = itens.some((item: any) => item.precisaFrete !== false);
            if (!temItemFisico) return false;

            const transpFinanceiro = String(p.financeiro?.dsTransportadoraId || "").trim();
            const transpLogistica = String((p as any).logistica?.dsTransportadoraId || "").trim();
            const transpCotacao = String((p as any).Cotacao?.dsTransportadoraIdCotado || "").trim();

            const temTransportadoraReal =
                (transpFinanceiro !== "" && transpFinanceiro !== "null" && transpFinanceiro !== "undefined" && transpFinanceiro !== "0" && transpFinanceiro !== "frete_gratis_ativado") ||
                (transpLogistica !== "" && transpLogistica !== "null" && transpLogistica !== "undefined" && transpLogistica !== "0" && transpLogistica !== "frete_gratis_ativado") ||
                (transpCotacao !== "" && transpCotacao !== "null" && transpCotacao !== "undefined" && transpCotacao !== "0" && transpCotacao !== "frete_gratis_ativado");

            if (temTransportadoraReal) return false;

            return true;
        });
    }, [pedidos]);

    const idsVisiveisNestaAba = useMemo(() => pedidosParaCotar.map(p => p.id), [pedidosParaCotar]);
    const selecionadosNestaAbaCount = useMemo(() => {
        return (selecionados || []).filter(id => idsVisiveisNestaAba.includes(id)).length;
    }, [selecionados, idsVisiveisNestaAba]);

    const toggleExpandir = (id: string) => {
        setPedidosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const dispararCotacaoGeralOuSelecionados = async () => {
        const alvos = selecionadosNestaAbaCount > 0
            ? pedidosParaCotar.filter(p => (selecionados || []).includes(p.id))
            : pedidosParaCotar;

        if (alvos.length === 0) {
            return alert("Nenhum pedido pronto disponível ou selecionado para cotar.");
        }

        if (alvos.length === 1) {
            await abrirJanelaCotacao(alvos[0]);
            return;
        }

        setCotandoMassa(true);
        let sucessos = 0;

        for (const pedido of alvos) {
            try {
                const cepDestino = String(pedido.endereco?.dsCepCliente || (pedido.endereco as any)?.cep || "").trim();
                if (!cepDestino || cepDestino.replace(/\D/g, "").length !== 8) continue;

                const opcoes = await cotarFrete(pedido);
                if (opcoes && opcoes.length > 0) {
                    const maisBarata = opcoes.reduce((prev, curr) => (curr.price < prev.price) ? curr : prev);
                    const nomeTransportadoraFormatado = `Logística: ${maisBarata.name}`;
                    const valorFreteNum = Number(maisBarata.price || 0);
                    const prazoEntregaNum = Number(maisBarata.delivery_time || maisBarata.prazo || 0);
                    const transportadoraIdStr = String(maisBarata.id || "");

                    await fetch(`/api/frete/selecionar`, {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lojistaId: lojistaIdApp, pedidoId: pedido.id, transportadoraId: maisBarata.id, nome: maisBarata.name })
                    });

                    if (db) {
                        const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedido.id);
                        await updateDoc(pedidoRef, {
                            "financeiro.metodo": nomeTransportadoraFormatado,
                            "financeiro.dsTransportadoraId": transportadoraIdStr,
                            "logistica.dsTransportadoraId": transportadoraIdStr,
                            "logistica.dsMetodoPagamento": maisBarata.name,
                            "Cotacao.vlFreteCotado": valorFreteNum,
                            "Cotacao.dsMetodoPagamentoCotado": maisBarata.name,
                            "Cotacao.dsTransportadoraIdCotado": transportadoraIdStr,
                            "Cotacao.prazoEntregaCotado": prazoEntregaNum
                        });
                    }

                    sucessos++;
                    setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
                        ...p,
                        financeiro: { ...p.financeiro, metodo: nomeTransportadoraFormatado, dsTransportadoraId: transportadoraIdStr },
                        logistica: { ...(p as any).logistica, dsTransportadoraId: transportadoraIdStr, dsMetodoPagamento: maisBarata.name },
                        Cotacao: {
                            ...(p as any).Cotacao,
                            vlFreteCotado: valorFreteNum,
                            dsMetodoPagamentoCotado: maisBarata.name,
                            dsTransportadoraIdCotado: transportadoraIdStr,
                            prazoEntregaCotado: prazoEntregaNum
                        }
                    } : p));
                }
            } catch (e: any) {
                console.error(`Erro ao cotar pedido ${pedido.id}:`, e?.message || e);
            }
        }

        setCotandoMassa(false);
        setSelecionados(prev => prev.filter(id => !idsVisiveisNestaAba.includes(id)));
        alert(`✅ Cotação em lote concluída! ${sucessos} pedidos prontos foram precificados.`);
    };

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
                financeiro: { ...p.financeiro, metodo: nomeTransportadoraFormatado, dsTransportadoraId: transportadoraIdStr },
                logistica: { ...(p as any).logistica, dsTransportadoraId: transportadoraIdStr, dsMetodoPagamento: opcaoFrete.name },
                Cotacao: {
                    ...(p as any).Cotacao,
                    vlFreteCotado: valorFreteNum,
                    dsMetodoPagamentoCotado: opcaoFrete.name,
                    dsTransportadoraIdCotado: transportadoraIdStr,
                    prazoEntregaCotado: prazoEntregaNum
                }
            } : p));

            setPedidoSelecionadoParaFrete(null);
        } catch (e: any) {
            alert("Erro ao selecionar transportadora: " + e.message);
        }
    };

    return (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', minHeight: '52px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚡ Cotar Frete (Pedidos Prontos)
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        Estes pedidos já finalizaram a linha de produção (Status: Pronto) e aguardam cotação de frete para envio.
                    </p>
                </div>

                <button
                    onClick={dispararCotacaoGeralOuSelecionados}
                    disabled={cotandoMassa || pedidosParaCotar.length === 0}
                    style={{
                        width: '190px',           // 🎯 Largura fixa para nunca mudar o comprimento
                        height: '34px',          // 🎯 Altura fixa para nunca mudar a altura
                        padding: '0 10px',       // Padding horizontal zerado nas pontas (controlado pela largura fixa)
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: pedidosParaCotar.length === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        opacity: pedidosParaCotar.length === 0 ? 0.6 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center', // Centraliza o texto perfeitamente no meio do botão fixo
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {cotandoMassa ? "⏳ Cotando..." : selecionadosNestaAbaCount > 0 ? `⚡ Cotar Selecionados (${selecionadosNestaAbaCount})` : "⚡ Cotar Frete em Lote"}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pedidosParaCotar.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Nenhum pedido com status "Pronto" aguardando cotação no momento. 🎉
                    </div>
                ) : (
                    pedidosParaCotar.map(pedido => {
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
                        const temPersonalizacao = pedido.itens?.some(i => i.respostasFormatadas || i.personalizacao);

                        return (
                            <div key={pedido.id} style={{ ...localStyles.cardContainer, border: `1.5px solid ${pedido.pago ? '#2ecc71' : '#e74c3c'}` }}>
                                <div
                                    onClick={() => toggleExpandir(pedido.id)}
                                    style={localStyles.cardHeaderLinha}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }}>
                                        <input
                                            type="checkbox"
                                            checked={(selecionados || []).includes(pedido.id)}
                                            onChange={() => {
                                                setSelecionados(prev => {
                                                    const atuais = prev || [];
                                                    return atuais.includes(pedido.id)
                                                        ? atuais.filter(id => id !== pedido.id)
                                                        : [...atuais, pedido.id];
                                                });
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ transform: 'scale(1.2)', cursor: 'pointer', flexShrink: 0 }}
                                        />

                                        <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '15px', width: '70px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
                                        <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px', width: '220px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                        <span style={{ fontSize: '12px', color: '#16181b', fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', width: '235px', flexShrink: 0, wordBreak: 'break-all' }} title={idPedidoExibicao}>ID Pedido: {idPedidoExibicao}</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0, marginLeft: '10px' }}>
                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                            {formatarData(pedido.data || (pedido.cliente as any)?.data)}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#64748b', width: '15px', textAlign: 'center' }}>{expandido ? '▲' : '▼'}</span>
                                    </div>
                                </div>

                                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pedido.itens?.map((item: any, idx: number) => (
                                        <ItemResumido key={idx} item={item} lojistaId={lojistaIdApp} pedidoLogistica={pedidoLogistica} db={db} />
                                    ))}
                                </div>

                                {expandido && (
                                    <div style={localStyles.conteudoExpandido}>
                                        <div style={localStyles.gridExpandido}>
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
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                                Aguardando cotação / emissão
                                                            </div>
                                                            <button onClick={() => abrirJanelaCotacao(pedido)} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
                                                                ⚡ Cotar Transportadoras
                                                            </button>
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

            {pedidoSelecionadoParaFrete && (
                <div style={localStyles.modalOverlayCentroFix}>
                    <div style={localStyles.modalContentCentroCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>📦 Opções de Frete Disponíveis</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Selecione a transportadora ideal para o pedido</p>
                            </div>
                            <button onClick={() => setPedidoSelecionadoParaFrete(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {loadingFreteAdmin ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                                <p style={{ fontSize: '14px', fontWeight: 'bold' }}>⏳ Cotando melhores tarifas...</p>
                            </div>
                        ) : erroFrete ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444', fontSize: '13px' }}>{erroFrete}</div>
                        ) : opcoesFreteCotadas.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>Nenhuma transportadora encontrada.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                                {opcoesFreteCotadas.map((opt) => (
                                    <div
                                        key={opt.id}
                                        onClick={() => selecionarEtiquetaManual(opt)}
                                        style={{ padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: '#fff' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {opt.company?.picture && <img src={opt.company.picture} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />}
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{opt.name}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>Prazo: <b>{opt.delivery_time} dias úteis</b></div>
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

const localStyles: { [key: string]: React.CSSProperties } = {
    cardContainer: { borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    cardHeaderLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', minHeight: '45px', boxSizing: 'border-box' },
    itemLinhaResumida: { display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 8px', backgroundColor: '#fdfdfd', borderRadius: '6px', border: '1px solid #f1f5f9' },
    conteudoExpandido: { padding: '16px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' },
    gridExpandido: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' },
    caixaPersonalizacao: { backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px' },
    caixaBlocoPadrao: { backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' },
    modalOverlayCentroFix: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContentCentroCard: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }
};