'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFrete } from "@/hooks/useFrete";
import ModalProcessamento from './ModalProcessamento';

// Importação da tipagem centralizada unificada
import { Pedido, ItemPedido, Financeiro, Logistica, Endereco, Cliente } from '@/types/pedido';

// Importação de todas as abas correspondentes
import TabTodosPedidos from './_tabsGestaoPedidos/TabTodosPedidos';
import TabCotarFrete from './_tabsGestaoPedidos/TabCotarFrete';
import TabEmitirEtiquetas from './_tabsGestaoPedidos/TabEmitirEtiquetas';
import TabSeparacaoImpressao from './_tabsGestaoPedidos/TabSeparacaoImpressao';
import TabProntoPedidos from './_tabsGestaoPedidos/TabProntoPedidos';
import TabPedidosEnviados from './_tabsGestaoPedidos/TabPedidosEnviados';
import TabPedidosConcluidos from './_tabsGestaoPedidos/TabPedidosConcluidos';
import TabRetiradaLoja from './_tabsGestaoPedidos/TabRetiradaLoja';
import TabDigital from './_tabsGestaoPedidos/TabDigital';

export interface DadosLoja {
    CEP?: string;
    cep?: string;
    cidade?: string;
}

export interface GestaoPedidosProps {
    pedidos: Pedido[];
    loading?: boolean;
    lojistaIdApp: string;
    db: any;
    dadosLoja?: DadosLoja;
}

export default function GestaoPedidos({
    pedidos = [], loading = false, lojistaIdApp, db, dadosLoja
}: GestaoPedidosProps) {

    const [abaAtiva, setAbaAtiva] = useState<string>('pedidos');

    const [selecionados, setSelecionados] = useState<string[]>([]);
    const [busca, setBusca] = useState("");
    const [filtroLogistica, setFiltroLogistica] = useState("todos");
    const [ordenacao, setOrdenacao] = useState("recentes");
    const [processandoMassaStatus, setProcessandoMassaStatus] = useState(false);

    const [modalProgresso, setModalProgresso] = useState<{
        aberto: boolean;
        titulo: string;
        itens: { id: string; numero: string; status: 'processando' | 'sucesso' | 'erro'; mensagem?: string }[];
    }>({ aberto: false, titulo: "", itens: [] });

    const [localPedidos, setLocalPedidos] = useState<Pedido[]>(pedidos);
    useEffect(() => { setLocalPedidos(pedidos); }, [pedidos]);

    const [pedidoParaDeletar, setPedidoParaDeletar] = useState<Pedido | null>(null);
    const [confirmacaoTexto, setConfirmacaoTexto] = useState("");

    const [textoDigitadoMassa, setTextoDigitadoMassa] = useState("");
    const [modalExclusaoMassaAberto, setModalExclusaoMassaAberto] = useState(false);

    const { cotarFrete } = useFrete(lojistaIdApp, dadosLoja);

    // FILTRAGEM UNIFICADA ESTABELECIDA ESTRITAMENTE PARA A ABA ATIVA
    const pedidosFiltradosGlobais = useMemo(() => {
        return localPedidos.filter(p => {
            if (!p) return false;

            const statusGeral = String(p.status || '').trim().toLowerCase();
            const statusProdAtual = (p.statusProducao || '').toLowerCase();

            // Regras exclusivas por aba
            if (abaAtiva === 'concluidos') {
                if (statusGeral !== 'concluído' && statusGeral !== 'concluido') return false;
            } else {
                if (statusGeral === 'concluído' || statusGeral === 'concluido') return false;
            }

            if (abaAtiva === 'pedidos') {
                if (p.pago || statusProdAtual === 'pronto') return false;
            } else if (abaAtiva === 'pendente') {
                if (!(statusProdAtual === 'pendente' && p.pago)) return false;
            } else if (abaAtiva === 'producao') {
                if (!(statusProdAtual === 'produção' && p.pago)) return false;
            } else if (abaAtiva === 'pronto') {
                if (!(statusProdAtual === 'pronto' && p.pago)) return false;
            } else if (abaAtiva === 'cotar') {
                if (p.etiquetaGerada || statusGeral === 'concluído' || statusGeral === 'concluido') return false;
                if (statusProdAtual !== 'pronto') return false;
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
            } else if (abaAtiva === 'etiquetas') {
                // FILTRO DA ABA ETIQUETAS
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

                if (!temTransportadoraId) return false;
            } else if (abaAtiva === 'enviados') {
                if (p.status !== 'enviado' && !(p as any).enviado) return false;
            }

            // Filtros globais de busca e logística
            const termo = busca.toLowerCase().trim();
            const numPedidoStr = p.numeroPedido !== undefined && p.numeroPedido !== null ? String(p.numeroPedido) : (p.numero !== undefined && p.numero !== null ? String(p.numero) : "");
            const itemsStr = (p.itens || []).map(i => i.nome || i.title || "").join(" ").toLowerCase();
            let clienteNome = typeof p.cliente === 'object' ? String(p.cliente.nome || "").toLowerCase() : String(p.cliente || "").toLowerCase();

            const matchBusca = termo === "" || numPedidoStr.includes(termo) || clienteNome.includes(termo) || itemsStr.includes(termo);

            const formaEntregaStr = String(p.logistica?.dsFormaEntrega || p.formaEntrega || '').trim().toLowerCase();
            const ehRetirada = p.logistica?.isRetirada === true || p.retirada === true || p.retirarNaLoja === true || formaEntregaStr === 'retirada';
            const ehSemFrete = Array.isArray(p.itens) && p.itens.length > 0 ? p.itens.every(item => item.precisaFrete === true) : false;

            if (filtroLogistica === "pendentes") return matchBusca && p.etiquetaGerada && p.statusEtiqueta === 'pendente';
            if (filtroLogistica === "freteGratis") return matchBusca && (p.logistica?.isFreteGratis || p.financeiro?.freteGratis) === true;
            if (filtroLogistica === "semFrete") return matchBusca && ehSemFrete;
            if (filtroLogistica === "retirada") return matchBusca && ehRetirada;

            return matchBusca;
        }).sort((a, b) => {
            const d1 = new Date(a.data || (a.cliente as any)?.data || 0).getTime();
            const d2 = new Date(b.data || (b.cliente as any)?.data || 0).getTime();
            return ordenacao === "recentes" ? d2 - d1 : d1 - d2;
        });
    }, [localPedidos, busca, filtroLogistica, ordenacao, abaAtiva]);

    // IDs visíveis estritamente na aba ativa aberta
    const idsVisiveisDaAba = useMemo(() => pedidosFiltradosGlobais.map(p => p.id), [pedidosFiltradosGlobais]);

    // Contagem restrita aos itens selecionados que pertencem à aba aberta atual
    const selecionadosNestaAbaCount = useMemo(() => {
        return (selecionados || []).filter(id => idsVisiveisDaAba.includes(id)).length;
    }, [selecionados, idsVisiveisDaAba]);

    const alterarStatusMassa = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const valorAcao = e.target.value;
        if (!valorAcao) return;

        const selecionadosAtuais = selecionados || [];
        if (selecionadosAtuais.length === 0) {
            alert("Selecione ao menos um pedido.");
            e.target.value = "";
            return;
        }

        setProcessandoMassaStatus(true);
        try {
            if (valorAcao === 'pago' || valorAcao === 'nao_pago') {
                const novoPago = valorAcao === 'pago';
                const novoStatusProd = novoPago ? 'pendente' : (localPedidos.find(p => selecionadosAtuais.includes(p.id))?.statusProducao || 'pendente');

                for (const pedidoId of selecionadosAtuais) {
                    const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoId);
                    await updateDoc(pedidoRef, {
                        pago: novoPago,
                        statusProducao: novoPago ? 'pendente' : novoStatusProd
                    });
                }
                setLocalPedidos(prev => prev.map(p => selecionadosAtuais.includes(p.id) ? { ...p, pago: novoPago, statusProducao: novoPago ? 'pendente' : p.statusProducao } : p));
                setSelecionados([]);
                alert(`✅ ${selecionadosAtuais.length} pedido(s) atualizado(s) para ${novoPago ? 'PAGO (Movido para Pendente)' : 'NÃO PAGO'}!`);
                if (novoPago) setAbaAtiva('pendente');
            } else {
                const pedidosInvalidos = localPedidos.filter(p => selecionadosAtuais.includes(p.id) && !p.pago);
                if (pedidosInvalidos.length > 0) {
                    alert("❌ Ação bloqueada: Esta ação não pode ser feita porque o pedido não foi pago.");
                    e.target.value = "";
                    return;
                }

                if (!confirm(`Deseja alterar o status de produção de ${selecionadosAtuais.length} pedido(s) para "${valorAcao.toUpperCase()}"?`)) {
                    e.target.value = "";
                    return;
                }

                for (const pedidoId of selecionadosAtuais) {
                    const pedidoRef = doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoId);
                    await updateDoc(pedidoRef, { statusProducao: valorAcao });
                }

                setLocalPedidos(prev => prev.map(p => selecionadosAtuais.includes(p.id) ? { ...p, statusProducao: valorAcao as any } : p));

                if (valorAcao === 'pronto') {
                    const primeiroSelecionado = localPedidos.find(p => p.id === selecionadosAtuais[0]);
                    if (primeiroSelecionado) {
                        const pedidoLogistica = (primeiroSelecionado as any).logistica || {};
                        const forma = String(pedidoLogistica.dsFormaEntrega || '').toLowerCase();
                        const isRetirada = pedidoLogistica.isRetirada === true || forma === 'retirada' || primeiroSelecionado.retirada || primeiroSelecionado.retirarNaLoja;
                        const isDigital = forma === 'digital' || primeiroSelecionado.itens?.some((i: any) => i.precisaFrete === false);
                        const temTransportadoraID = pedidoLogistica.dsTransportadoraId || primeiroSelecionado.financeiro?.dsTransportadoraId;

                        if (isRetirada) {
                            setAbaAtiva('retirada');
                        } else if (isDigital) {
                            setAbaAtiva('digital');
                        } else if (temTransportadoraID) {
                            setAbaAtiva('etiquetas');
                        } else {
                            setAbaAtiva('cotar');
                        }
                    }
                }

                setSelecionados([]);
                alert("✅ Status de produção atualizados com sucesso!");
            }
        } catch (e: any) {
            alert("Erro ao atualizar em massa: " + e.message);
        } finally {
            setProcessandoMassaStatus(false);
            e.target.value = "";
        }
    };

    const executarExclusaoPermanente = async () => {
        if (!db || !lojistaIdApp || !pedidoParaDeletar) return;
        const identificador = pedidoParaDeletar.numeroPedido ? String(pedidoParaDeletar.numeroPedido) : pedidoParaDeletar.id.slice(-4);
        if (confirmacaoTexto !== identificador) return alert("Incorreto.");
        if (!confirm("⚠️ ATENÇÃO: Ação IRREVERSÍVEL.")) return;
        try {
            await deleteDoc(doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoParaDeletar.id));
            setLocalPedidos(prev => prev.filter(p => p.id !== pedidoParaDeletar.id));
            setPedidoParaDeletar(null);
            alert("💥 Pedido excluído!");
        } catch (error) { }
    };

    return (
        <div style={styles.contentArea}>
            <div style={styles.headerFixoContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ fontSize: '20px', color: '#1e293b', margin: 0, fontWeight: 800 }}>📋 Gestão de Pedidos</h2>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                        <button onClick={async () => {
                            const res = await fetch("/api/frete/sincronizar", { method: "POST", body: JSON.stringify({ lojistaId: lojistaIdApp }) });
                            const data = await res.json();
                            alert(`Sincronização concluída: ${data.atualizados} pedidos atualizados.`);
                            window.location.reload();
                        }} style={{ padding: '8px 14px', backgroundColor: "#8b5cf6", color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                            🔄 Sincronizar Pagamentos
                        </button>
                    </div>
                </div>

                <div style={styles.filterBar}>
                    <select value={filtroLogistica} onChange={(e) => setFiltroLogistica(e.target.value)} style={styles.selectLogistica}>
                        <option value="todos">🗂️ Todas Logísticas</option>
                        <option value="pendentes">🏷️ Etiqueta Pendente</option>
                        <option value="freteGratis">🚚 Frete Grátis</option>
                        <option value="semFrete">📦 Sem Frete</option>
                        <option value="retirada">🏪 Retirada Loja</option>
                    </select>
                    <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} style={styles.selectOrdenacaoStyle}>
                        <option value="recentes">📅 Mais Recentes</option>
                        <option value="antigos">⏳ Mais Antigos</option>
                    </select>
                    <input type="text" placeholder="🔍 Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.searchInput} />
                </div>

                <div style={styles.selectionBar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            onChange={() => {
                                const todosEstaoSelecionados = idsVisiveisDaAba.length > 0 && idsVisiveisDaAba.every(id => (selecionados || []).includes(id));

                                if (todosEstaoSelecionados) {
                                    // Remove apenas os desta aba aberta
                                    setSelecionados(prev => (prev || []).filter(id => !idsVisiveisDaAba.includes(id)));
                                } else {
                                    // Adiciona todos os desta aba aberta mantendo seleções de outras se houver
                                    setSelecionados(prev => [...new Set([...(prev || []), ...idsVisiveisDaAba])]);
                                }
                            }}
                            checked={
                                idsVisiveisDaAba.length > 0 &&
                                idsVisiveisDaAba.every(id => (selecionados || []).includes(id))
                            }
                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                            {selecionadosNestaAbaCount > 0
                                ? `${selecionadosNestaAbaCount} selecionado${selecionadosNestaAbaCount > 1 ? 's' : ''}`
                                : `Nenhum selecionado`}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {selecionadosNestaAbaCount > 0 && (
                            <>
                                <select
                                    disabled={processandoMassaStatus}
                                    onChange={async (e) => {
                                        const acao = e.target.value;
                                        if (!acao) return;

                                        if (acao === 'deletar') {
                                            const selecionadosAtuais = selecionados || [];
                                            if (selecionadosAtuais.length === 0) {
                                                alert("Selecione ao menos um pedido.");
                                                e.target.value = "";
                                                return;
                                            }
                                            setTextoDigitadoMassa("");
                                            setModalExclusaoMassaAberto(true);
                                            e.target.value = "";
                                            return;
                                        }

                                        alterarStatusMassa(e);
                                    }}
                                    defaultValue=""
                                    style={styles.selectAcaoMassa}
                                >
                                    <option value="" disabled>⚙️ Mudar Status / Ações...</option>
                                    <option value="pago">✅ Marcar como Pago</option>
                                    <option value="nao_pago">❌ Marcar como Não Pago</option>
                                    <option value="pendente">⏳ Status: Pendente</option>
                                    <option value="produção">⚙️ Status: Produção</option>
                                    <option value="pronto">✅ Status: Pronto</option>
                                    <option value="deletar" style={{ color: '#ef4444', fontWeight: 'bold' }}>🗑️ Excluir Pedidos</option>
                                </select>
                                <button onClick={() => setSelecionados([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Limpar</button>
                            </>
                        )}
                    </div>
                </div>

                <div style={styles.tabContainer}>
                    <button onClick={() => setAbaAtiva('pedidos')} style={{ ...styles.tabStyle, ...(abaAtiva === 'pedidos' ? styles.tabAtiva : {}) }}>PEDIDOS</button>
                    <button onClick={() => setAbaAtiva('pendente')} style={{ ...styles.tabStyle, ...(abaAtiva === 'pendente' ? styles.tabAtiva : {}) }}>PENDENTE</button>
                    <button onClick={() => setAbaAtiva('producao')} style={{ ...styles.tabStyle, ...(abaAtiva === 'producao' ? styles.tabAtiva : {}) }}>PRODUÇÃO</button>
                    <button onClick={() => setAbaAtiva('pronto')} style={{ ...styles.tabStyle, ...(abaAtiva === 'pronto' ? styles.tabAtiva : {}) }}>PRONTO</button>
                    <button onClick={() => setAbaAtiva('cotar')} style={{ ...styles.tabStyle, ...(abaAtiva === 'cotar' ? styles.tabAtiva : {}) }}>COTAR FRETE</button>
                    <button onClick={() => setAbaAtiva('etiquetas')} style={{ ...styles.tabStyle, ...(abaAtiva === 'etiquetas' ? styles.tabAtiva : {}) }}>ETIQUETAS</button>
                    <button onClick={() => setAbaAtiva('retirada')} style={{ ...styles.tabStyle, ...(abaAtiva === 'retirada' ? styles.tabAtiva : {}) }}>RETIRADA</button>
                    <button onClick={() => setAbaAtiva('digital')} style={{ ...styles.tabStyle, ...(abaAtiva === 'digital' ? styles.tabAtiva : {}) }}>DIGITAL</button>
                    <button onClick={() => setAbaAtiva('enviados')} style={{ ...styles.tabStyle, ...(abaAtiva === 'enviados' ? styles.tabAtivaEnviados : {}) }}>ENVIADOS</button>
                    <button onClick={() => setAbaAtiva('concluidos')} style={{ ...styles.tabStyle, ...(abaAtiva === 'concluidos' ? styles.tabAtivaConcluidos : {}) }}>CONCLUÍDOS</button>
                </div>
            </div>

            <div style={styles.conteudoDinamicoArea}>
                {abaAtiva === 'cotar' ? (
                    <TabCotarFrete
                        pedidos={localPedidos}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        cotarFrete={cotarFrete}
                        setLocalPedidos={setLocalPedidos}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'retirada' ? (
                    <TabRetiradaLoja
                        pedidos={localPedidos}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        setLocalPedidos={setLocalPedidos}
                        mudarStatusDireto={async (p, s) => { }}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'digital' ? (
                    <TabDigital
                        pedidos={localPedidos}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        setLocalPedidos={setLocalPedidos}
                        mudarStatusDireto={async (p, s) => { }}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'etiquetas' ? (
                    <TabEmitirEtiquetas
                        pedidos={localPedidos}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        setModalProgresso={setModalProgresso}
                        setLocalPedidos={setLocalPedidos}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'enviados' ? (
                    <TabPedidosEnviados
                        pedidos={localPedidos}
                        loading={loading}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        mudarStatusDireto={async (p, s) => { /* sua lógica existente */ }}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'concluidos' ? (
                    <TabPedidosConcluidos
                        pedidos={localPedidos}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        dadosLoja={dadosLoja}
                        setLocalPedidos={setLocalPedidos}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                ) : abaAtiva === 'pronto' ? (
                    <TabProntoPedidos
                        pedidos={localPedidos}
                        loading={loading}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        cotarFrete={cotarFrete}
                        setLocalPedidos={setLocalPedidos}
                        mudarStatusDireto={async (p, s) => { }}
                        setModalProgresso={setModalProgresso}
                    />
                ) : (
                    <TabTodosPedidos
                        pedidos={pedidosFiltradosGlobais}
                        loading={loading}
                        lojistaIdApp={lojistaIdApp}
                        db={db}
                        mudarStatusDireto={async (p, s) => { }}
                        alternarPago={async (p) => { }}
                        dispararSegurancaDeletar={(p) => setPedidoParaDeletar(p)}
                        cotarFrete={cotarFrete}
                        setLocalPedidos={setLocalPedidos}
                        dadosLoja={dadosLoja}
                        selecionados={selecionados || []}
                        setSelecionados={setSelecionados}
                    />
                )}
            </div>

            {/* MODAL DE EXCLUSÃO INDIVIDUAL */}
            {pedidoParaDeletar && (
                <div style={localStyles.modalOverlayCentroFix}>
                    <div style={{ ...localStyles.modalContentCentroCard, borderTop: '5px solid #ef4444' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#ef4444' }}>⚠️ EXCLUSÃO DEFINITIVA</h3>
                        <input
                            type="text"
                            placeholder={`Digite ${pedidoParaDeletar.numeroPedido || pedidoParaDeletar.id.slice(-4)}...`}
                            value={confirmacaoTexto}
                            onChange={(e) => setConfirmacaoTexto(e.target.value)}
                            style={{ width: '100%', marginBottom: '20px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setPedidoParaDeletar(null)} style={{ padding: '8px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={executarExclusaoPermanente} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Confirmar e Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EXCLUSÃO EM MASSA */}
            {modalExclusaoMassaAberto && (
                <div style={localStyles.modalOverlayCentroFix}>
                    <div style={{ ...localStyles.modalContentCentroCard, borderTop: '5px solid #ef4444' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#ef4444' }}>⚠️ EXCLUSÃO EM MASSA</h3>
                        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '15px', lineHeight: '1.4' }}>
                            {selecionados.length === 1 ? (
                                <>Para excluir o pedido, digite o número <strong>{String(localPedidos.find(p => p.id === selecionados[0])?.numeroPedido || selecionados[0].slice(-4))}</strong> abaixo:</>
                            ) : (
                                <>Para confirmar a exclusão de <strong>{selecionados.length} pedidos</strong>, digite a palavra <strong>selecionados</strong> abaixo:</>
                            )}
                        </p>
                        <input
                            type="text"
                            placeholder={selecionados.length === 1 ? "Digite o número do pedido..." : "Digite selecionados..."}
                            value={textoDigitadoMassa}
                            onChange={(e) => setTextoDigitadoMassa(e.target.value)}
                            style={{ width: '100%', marginBottom: '20px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalExclusaoMassaAberto(false)} style={{ padding: '8px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                            <button
                                onClick={async () => {
                                    const selecionadosAtuais = selecionados || [];
                                    const textoEsperado = selecionadosAtuais.length === 1
                                        ? String(localPedidos.find(p => p.id === selecionadosAtuais[0])?.numeroPedido || selecionadosAtuais[0].slice(-4))
                                        : "selecionados";

                                    if (textoDigitadoMassa !== textoEsperado) {
                                        alert("Confirmação incorreta.");
                                        return;
                                    }

                                    try {
                                        setProcessandoMassaStatus(true);
                                        for (const pedidoId of selecionadosAtuais) {
                                            await deleteDoc(doc(db, "lojistas", lojistaIdApp, "pedidos", pedidoId));
                                        }
                                        setLocalPedidos(prev => prev.filter(p => !selecionadosAtuais.includes(p.id)));
                                        setSelecionados([]);
                                        setModalExclusaoMassaAberto(false);
                                        alert("💥 Pedido(s) excluído(s) com sucesso!");
                                    } catch (err: any) {
                                        alert("Erro ao excluir: " + err.message);
                                    } finally {
                                        setProcessandoMassaStatus(false);
                                    }
                                }}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Confirmar e Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ModalProcessamento
                aberto={modalProgresso.aberto}
                titulo={modalProgresso.titulo}
                itens={modalProgresso.itens}
                onFechar={() => {
                    setModalProgresso(prev => ({ ...prev, aberto: false }));
                    window.location.reload();
                }}
            />
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    contentArea: { padding: '0px 20px 20px 20px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' },
    headerFixoContainer: {
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: '#f8fafc',
        paddingTop: '15px',
        paddingBottom: '10px',
        borderBottom: '1px solid #e2e8f0'
    },
    filterBar: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px', backgroundColor: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
    selectionBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '10px',
        backgroundColor: '#fff',
        padding: '0 16px',
        height: '52px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        boxSizing: 'border-box'
    },
    selectLogistica: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' },
    selectOrdenacaoStyle: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' },
    selectAcaoMassa: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#f8fafc', fontWeight: '600', color: '#1e293b' },
    searchInput: { padding: '7px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', flex: 1, backgroundColor: '#fff' },

    tabContainer: {
        display: 'flex',
        gap: '16px',
        borderBottom: 'none',
        marginTop: '14px',
        width: '100%',
        boxSizing: 'border-box',
        alignItems: 'center',
        paddingLeft: '4px'
    },
    tabStyle: {
        background: 'none',
        borderWidth: '0px 0px 3px 0px',
        borderStyle: 'solid',
        borderColor: 'transparent',
        padding: '8px 4px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap'
    },
    tabAtiva: {
        color: '#2563eb',
        borderColor: '#2563eb',
        fontWeight: 'bold'
    },
    tabAtivaEnviados: {
        color: '#2563eb',
        borderColor: '#2563eb',
        fontWeight: 'bold'
    },
    tabAtivaConcluidos: {
        color: '#059669',
        borderColor: '#059669',
        fontWeight: 'bold'
    },
    conteudoDinamicoArea: {
        marginTop: '20px'
    }
};

const localStyles: { [key: string]: React.CSSProperties } = {
    modalOverlayCentroFix: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContentCentroCard: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }
};