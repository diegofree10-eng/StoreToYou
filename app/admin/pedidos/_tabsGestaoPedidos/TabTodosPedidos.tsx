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

// 🚚 Função padronizada para olhar diretamente para dsFormaEntrega
const obterSeloItem = (item: any, pedidoLogistica: any) => {
    const formaItem = String(item.dsFormaEntrega || pedidoLogistica?.dsFormaEntrega || '').trim().toLowerCase();

    if (formaItem === 'retirada') return { texto: "Retirada", cor: "#f59e0b" };
    if (formaItem === 'digital') return { texto: "Digital", cor: "#3b82f6" };
    if (formaItem === 'entrega_local') return { texto: "Entrega Local", cor: "#8b5cf6" };

    return { texto: "Envio", cor: "#10b981" };
};

// 💬 Função para gerar o link do WhatsApp usando especificamente dsTelefoneCliente
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

const ItemResumido = React.memo(({ item, lojistaId, pedidoLogistica, db, pedido }: any) => {
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

    const linkWhats = gerarLinkWhatsApp(pedido);

    return (
        <div style={{ ...localStyles.itemLinhaResumida, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

            {linkWhats && (
                <a
                    href={linkWhats}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Chamar cliente no WhatsApp"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', textDecoration: 'none', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', marginLeft: '12px' }}
                >
                    💬
                </a>
            )}
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
    const [pedidosExpandidos, setPedidosExpandidos] = useState<Record<string, boolean>>({});

    const pedidosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina;
        return pedidos.slice(inicio, inicio + itensPorPagina);
    }, [pedidos, paginaAtual]);

    const totalPaginas = Math.ceil(pedidos.length / itensPorPagina);

    const toggleExpandir = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setPedidosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copiarIdCompleto = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        alert(`📋 ID do pedido copiado com sucesso!\n\n${id}`);
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
                        background-color: #e2e8f0 !important;
                        color: #1e293b !important;
                        padding: 4px 8px !important;
                        border-radius: 4px !important;
                        font-weight: 600 !important;
                        cursor: pointer !important;
                        border: 1px solid #cbd5e1 !important;
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
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>📦 Todos os Pedidos</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Visualização completa de todos os pedidos cadastrados na loja.</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loading ? <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando...</div>
                    : pedidosPaginados.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhum pedido encontrado.</div>
                        : pedidosPaginados.map((pedido) => {
                            const pedidoLogistica = (pedido as any).logistica || {};
                            const cotacao = (pedido as any).Cotacao || {};
                            const etiquetaData = (pedido as any).Etiqueta || {};
                            const endereco = pedido.endereco || (pedido as any).cliente?.endereco || {};
                            const expandido = !!pedidosExpandidos[pedido.id];
                            const numPedidoFormatado = String(pedido.numeroPedido || pedido.numero || pedido.id?.slice(-4) || "").padStart(5, '0');
                            const nomeCliente = typeof pedido.cliente === 'object' ? (pedido.cliente?.nmNomeCliente || pedido.cliente?.nome || "Cliente") : (pedido.cliente || "Cliente");
                            const idPedidoExibicao = String(pedido.id || "");
                            const idEncurtadoMobile = idPedidoExibicao.length > 10 ? `${idPedidoExibicao.slice(0, 6)}...${idPedidoExibicao.slice(-4)}` : idPedidoExibicao;

                            const formaEntrega = String(pedidoLogistica.dsFormaEntrega || (pedido as any).dsFormaEntrega || '').toLowerCase();
                            const isRetirada = formaEntrega === 'retirada' || pedidoLogistica.isRetirada === true || pedido.retirada || pedido.retirarNaLoja;
                            const isEtqGerada = Boolean(etiquetaData.isEtiquetaGerada || pedido.etiquetaGerada);

                            const statusEtiquetaStr = String(etiquetaData.statusEtiqueta || pedido.statusEtiqueta || '').toLowerCase();
                            const isPendenteSaldo = statusEtiquetaStr.includes('saldo') || statusEtiquetaStr.includes('pendente') || statusEtiquetaStr.includes('erro');

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

                            const subtotalVal = Number(fin.vlSubtotal ?? fin.subtotal ?? fin.valorSubtotal ?? (pedido as any).subtotal ?? 0);
                            const freteVal = Number(fin.vlFrete ?? fin.valorFrete ?? cotacao.vlFreteCotado ?? (pedido as any).valorFrete ?? 0);
                            const descontoVal = Number(fin.vlDesconto ?? fin.desconto ?? fin.vlDescontos ?? 0);

                            const totalCalculadoManual = subtotalVal + freteVal - descontoVal;
                            const totalVal = Number(fin.vlTotal ?? fin.total ?? fin.valorTotal ?? (pedido as any).total ?? (totalCalculadoManual > 0 ? totalCalculadoManual : 0));
                            const cupomStr = fin.dsCupom ?? fin.cupom ?? fin.codigoCupom ?? "-";

                            return (
                                <div key={pedido.id} style={{ ...localStyles.cardContainer, border: `1.5px solid ${corBordaCard}` }}>
                                    <div
                                        onClick={(e) => toggleExpandir(e, pedido.id)}
                                        className="card-header-linha"
                                        style={localStyles.cardHeaderLinha}
                                    >
                                        <div className="pc-bloco-linha-unica">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selecionados.includes(pedido.id)}
                                                    onChange={() => setSelecionados(prev => prev.includes(pedido.id) ? prev.filter(item => item !== pedido.id) : [...prev, pedido.id])}
                                                    style={{ transform: 'scale(1.2)', cursor: 'pointer', flexShrink: 0 }}
                                                />
                                                <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '15px', width: '70px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
                                                <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px', width: '220px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
                                                <span style={{ fontSize: '12px', color: '#16181b', fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', width: '220px', flexShrink: 0, wordBreak: 'break-all' }} title={idPedidoExibicao}>ID Pedido: {idPedidoExibicao}</span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0, marginLeft: '10px' }}>
                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                                                    {formatarData(pedido.data || (pedido.cliente as any)?.data)}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>{expandido ? '▲' : '▼'}</span>
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
                                                    <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '15px', flexShrink: 0 }}>#{numPedidoFormatado}</span>
                                                    <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>{nomeCliente}</span>
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
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                                                        {formatarData(pedido.data || (pedido.cliente as any)?.data)}
                                                    </span>
                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>{expandido ? '▲' : '▼'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {pedido.itens?.map((item, idx) => (
                                            <ItemResumido key={idx} item={item} lojistaId={lojistaIdApp} pedidoLogistica={pedidoLogistica} db={db} pedido={pedido} />
                                        ))}
                                    </div>

                                    {expandido && (
                                        <div style={localStyles.conteudoExpandido}>
                                            <div className="grid-expandido" style={localStyles.gridExpandido}>
                                                
                                                {/* BLOCO 1: PERSONALIZAÇÃO */}
                                                <div style={localStyles.caixaPersonalizacao}>
                                                    <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '4px', fontSize: '12px' }}>
                                                        ✨ Personalização:
                                                    </div>
                                                    {temPersonalizacao ? (
                                                        pedido.itens.map((item: any, idx: number) => {
                                                            const resp = item.respostasFormatadas || item.personalizacao;
                                                            if (!resp || (typeof resp === 'object' && Object.keys(resp).length === 0)) return null;
                                                            return (
                                                                <div key={idx} style={{ fontSize: '11px', color: '#78350f', lineHeight: '1.3', marginBottom: '4px' }}>
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
                                                        <div style={{ fontSize: '11px', color: '#92400e', fontStyle: 'italic' }}>Sem personalização.</div>
                                                    )}
                                                </div>

                                                {/* BLOCO 2: ENDEREÇO (PADRÃO PARA QUALQUER LOGÍSTICA) */}
                                                <div style={localStyles.caixaBlocoPadrao}>
                                                    <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '4px', fontSize: '12px' }}>📍 Endereço</div>
                                                    <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
                                                        <strong>Rua:</strong> {endereco.dsRuaCliente || endereco.rua || '-'}<br />
                                                        <strong>Número:</strong> {endereco.dsNumeroCliente || endereco.numero || '-'}<br />
                                                        <strong>Bairro:</strong> {endereco.dsBairroCliente || endereco.bairro || '-'}<br />
                                                        <strong>Cidade:</strong> {endereco.dsCidadeCliente || endereco.cidade || '-'}&nbsp;&nbsp;<strong>UF:</strong> {endereco.dsUfCliente || endereco.uf || '-'}<br />
                                                        <strong>CEP:</strong> {endereco.dsCepCliente || endereco.cep || '-'}
                                                    </div>
                                                </div>

                                                {/* BLOCO 3: LOGÍSTICA */}
                                                <div style={localStyles.caixaBlocoPadrao}>
                                                    <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '4px', fontSize: '12px' }}>🚚 Logística</div>
                                                    <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
                                                        <div><strong>Forma de Entrega:</strong> {formaEntrega || '-'}</div>
                                                        <div><strong>Método de Pagamento:</strong> {fin.dsMetodoPagamento || fin.metodo || 'PIX'}</div>
                                                        <div><strong>Transportadora ID:</strong> {fin.dsTransportadoraId || cotacao.dsTransportadoraIdCotado || '-'}</div>
                                                        <div><strong>Serviço:</strong> {etiquetaData.servicoVinculado || pedido.servicoVinculado || 'Retirar na Loja'}</div>
                                                    </div>
                                                    <div style={{ marginTop: '6px' }}>
                                                        {pedido.etiquetaGerada || (pedido.financeiro?.dsTransportadoraId && pedido.financeiro?.dsTransportadoraId !== "frete_gratis_ativado") ? (
                                                            <button onClick={() => resetarEtiqueta(pedido)} style={{ ...localStyles.btnReset, color: '#ef4444', fontSize: '10px', display: 'block', width: '100%', marginTop: '2px' }}>
                                                                🗑️ Resetar Etiqueta
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {/* BLOCO 4: ETIQUETA */}
                                                <div style={localStyles.caixaBlocoPadrao}>
                                                    <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '4px', fontSize: '12px' }}>🏷️ Etiqueta</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                                                        <div style={{ fontSize: '10px', color: '#047857', lineHeight: '1.3' }}>
                                                            <div><b>Id:</b> {etiquetaData.IdEtiqueta || pedido.idEtiqueta || '-'}</div>
                                                            <div><b>Cód Envio:</b> {etiquetaData.codigoEnvio || '-'}</div>
                                                            <div><b>Status Pagto:</b> <span style={{ color: isPendenteSaldo ? '#b91c1c' : '#047857', fontWeight: 'bold' }}>{etiquetaData.statusEtiqueta || pedido.statusEtiqueta || 'pendente'}</span></div>
                                                            <div><b>Rastreio:</b> {etiquetaData.dsNumRastreio || pedido.dsNumRastreio || '-'}</div>
                                                            <div><b>Serviço:</b> {etiquetaData.servicoVinculado || pedido.servicoVinculado || '1'}</div>
                                                            <div><b>Valor Cobrado:</b> R$ {Number(etiquetaData.valorCobrado ?? 0).toFixed(2).replace('.', ',')}</div>
                                                            {etiquetaData.urlEtiqueta || pedido.urlEtiqueta ? (
                                                                <a href={etiquetaData.urlEtiqueta || pedido.urlEtiqueta} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'block', marginTop: '2px' }}>
                                                                    Ver Etiqueta PDF
                                                                </a>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* BLOCO 5: PAGAMENTO */}
                                                <div style={localStyles.caixaBlocoPadrao}>
                                                    <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '6px', fontSize: '13px' }}>💳 Pagamento</div>
                                                    <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
                                                        <div><strong>Subtotal:</strong> R$ {subtotalVal.toFixed(2).replace('.', ',')}</div>
                                                        <div><strong>Frete:</strong> R$ {freteVal.toFixed(2).replace('.', ',')}</div>
                                                        <div style={{ color: descontoVal > 0 ? '#16a34a' : 'inherit' }}>
                                                            <strong>Desconto:</strong> {descontoVal > 0 ? `-R$ ${descontoVal.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                                                        </div>
                                                        <div><strong>Cupom:</strong> {cupomStr}</div>

                                                        <div style={{ marginTop: '3px', borderTop: '1px solid #e2e8f0', paddingTop: '3px' }}>
                                                            <strong>Total:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>R$ {totalVal.toFixed(2).replace('.', ',')}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    )}
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
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', marginTop: '10px' },
    pageBtn: { padding: '8px 16px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }
};

const localStyles: { [key: string]: React.CSSProperties } = {
    cardContainer: { borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    cardHeaderLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', minHeight: '45px', boxSizing: 'border-box' },
    itemLinhaResumida: { display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 8px', backgroundColor: '#fdfdfd', borderRadius: '6px', border: '1px solid #f1f5f9' },
    conteudoExpandido: { padding: '16px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' },
    gridExpandido: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px' },
    caixaPersonalizacao: { backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px' },
    caixaBlocoPadrao: { backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' },
    btnRemoverTransparente: { padding: '8px', backgroundColor: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', width: '100%' },
    btnReset: { background: 'none', border: 'none', color: '#059669', textDecoration: 'underline', marginTop: '2px', cursor: 'pointer' }
};