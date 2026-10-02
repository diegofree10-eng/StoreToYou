// app/admin/devolucao/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, onSnapshot, query, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "@/context/ThemeContext";
import { TabVendas } from "./_tabsGestaoDevolucao/tabVendas";
import { TabDevolucao } from "./_tabsGestaoDevolucao/tabDevolucao";
import { ModalDevolucao } from "./_tabsGestaoDevolucao/ModalDevolucao";
import { FiRefreshCw, FiShoppingBag, FiRotateCcw } from "react-icons/fi";

export default function DevolucaoPage() {
    const { theme, isModoNoturno } = useTheme();
    const [uid, setUid] = useState<string | null>(null);
    const [carregandoAuth, setCarregandoAuth] = useState(true);
    const [abaAtiva, setAbaAtiva] = useState<"vendas" | "devolucoes">("vendas");

    const [pedidos, setPedidos] = useState<any[]>([]);

    // Estados para os Filtros Globais (Busca, Período de Datas e Paginação)
    const [termoBuscaGlobal, setTermoBuscaGlobal] = useState("");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [itensPorPagina, setItensPorPagina] = useState(20);
    const [pedidoParaDevolverModal, setPedidoParaDevolverModal] = useState<any | null>(null);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setUid(null);
                setCarregandoAuth(false);
                return;
            }
            try {
                const userDoc = await getDoc(doc(db, "usuarios", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUid(userData.lojaId || user.uid);
                } else {
                    setUid(user.uid);
                }
            } catch (error) {
                console.error("Erro ao autenticar usuário:", error);
                setUid(user.uid);
            } finally {
                setCarregandoAuth(false);
            }
        });
        return () => unsubAuth();
    }, []);

    // Monitora os pedidos em tempo real
    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, "lojistas", uid, "pedidos"));
        const unsub = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            setPedidos(lista);
        }, (error) => {
            console.error("Erro ao buscar pedidos:", error);
        });
        return () => unsub();
    }, [uid]);

    // Função unificada para alternar/iniciar devolução ou restauração
    const alternarDevolucao = async (pedido: any) => {
        if (!pedido.devolvido) {
            setPedidoParaDevolverModal(pedido); // Abre o modal global de devolução
        } else {
            if (confirm("Confirmar RESTAURAÇÃO deste pedido?")) {
                try {
                    const docRef = doc(db, "lojistas", uid!, "pedidos", pedido.id);
                    await updateDoc(docRef, { 
                        devolvido: false,
                        "dadosDevolucao.isDevolucaoSolicitado": false,
                        "dadosDevolucao.dsStatusDevolucao": "pendente"
                    });
                } catch (err) {
                    console.error("Erro ao restaurar pedido:", err);
                }
            }
        }
    };

    // Função chamada exclusivamente ao submeter o ModalDevolucao
    const confirmarDevolucaoComDados = async (dadosModal: any) => {
        if (!uid || !pedidoParaDevolverModal) return;
        try {
            const docRef = doc(db, "lojistas", uid, "pedidos", pedidoParaDevolverModal.id);
            await updateDoc(docRef, {
                devolvido: true,
                dadosDevolucao: {
                    isDevolucaoSolicitado: true,
                    dsStatusDevolucao: "solicitada",
                    vlCustoFreteReverso: Number(dadosModal.custoFreteReverso || 0),
                    dataSolicitacaoDevolucao: new Date().toISOString(),
                    isVoltaparaVenda: Boolean(dadosModal.isVoltaparaVenda),
                    dsMotivo: dadosModal.motivo,
                    dsCodigoRastreioReverso: String(dadosModal.dsCodigoRastreioReverso || "").trim(),
                    dsTipoReembolso: dadosModal.reembolsarFreteCliente ? "produto_e_frete" : "apenas_produto",
                    vlReembolsoEfetivado: Number(dadosModal.vlReembolsoEfetivado || 0),
                    isReembolsarFreteCliente: Boolean(dadosModal.reembolsarFreteCliente),
                }
            });
            setPedidoParaDevolverModal(null); // Fecha o modal com segurança
        } catch (e: any) {
            alert("Erro ao registrar devolução: " + e.message);
        }
    };

    const formatarDataExibicao = (data: any) => {
        if (!data) return "-";
        try {
            const d = data.toDate ? data.toDate() : new Date(data);
            return d.toLocaleDateString('pt-BR');
        } catch {
            return "-";
        }
    };

    const formatarMoeda = (valor: any) => {
        return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const pedidosFiltradosGeral = useMemo(() => {
        return pedidos.filter(p => {
            const clienteObj = p.dsCliente || (typeof p.cliente === 'object' && p.cliente !== null ? p.cliente : {});
            const nomeCliente = String(clienteObj.nmNomeCliente || clienteObj.nome || (typeof p.cliente === 'string' ? p.cliente : "")).toLowerCase();
            const numPedido = String(p.nrNumeroPedido || p.numeroPedido || p.id || "").toLowerCase();
            const termo = termoBuscaGlobal.toLowerCase().trim();

            if (termo && !nomeCliente.includes(termo) && !numPedido.includes(termo)) return false;

            if (dataInicio || dataFim) {
                const dataPedido = p.timestamp?.toDate ? p.timestamp.toDate() : (p.data ? new Date(p.data) : null);
                if (dataPedido) {
                    if (dataInicio && dataPedido < new Date(dataInicio + "T00:00:00")) return false;
                    if (dataFim && dataPedido > new Date(dataFim + "T23:59:59")) return false;
                }
            }
            return true;
        });
    }, [pedidos, termoBuscaGlobal, dataInicio, dataFim]);

    if (carregandoAuth) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: theme.textSec, backgroundColor: theme.bgApp, minHeight: '100vh' }}>
                Carregando dados de devoluções...
            </div>
        );
    }

    if (!uid) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', backgroundColor: theme.bgApp, minHeight: '100vh' }}>
                Acesso negado ou usuário não autenticado.
            </div>
        );
    }

    return (
        <div style={{ ...styles.page, backgroundColor: theme.bgMain, color: theme.textMain }} className="dashboard-page-container">
            
            {/* CABEÇALHO DO MÓDULO */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiRefreshCw color={theme.primary} size={20} /> Controle de Devoluções e Trocas
                    </h2>
                    <p style={{ fontSize: '13px', color: theme.textSec, margin: '4px 0 0 0' }}>Gerencie vendas concluídas, reembolsos e devoluções de clientes.</p>
                </div>
            </div>

            {/* BARRA DE PESQUISA, INTERVALO DE DATAS E PAGINAÇÃO PADRÃO DASHBOARD */}
            <header style={styles.header}>
                <div style={{ ...styles.filtrosCard, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }} className="filtro-container">
                    <input 
                        type="text"
                        placeholder="🔍 Buscar por nome do cliente ou número do pedido..."
                        value={termoBuscaGlobal}
                        onChange={e => setTermoBuscaGlobal(e.target.value)}
                        style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} 
                    />
                    <input 
                        type="date"
                        value={dataInicio}
                        onChange={e => setDataInicio(e.target.value)}
                        style={{ ...styles.inputDate, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} 
                    />
                    <input 
                        type="date"
                        value={dataFim}
                        onChange={e => setDataFim(e.target.value)}
                        style={{ ...styles.inputDate, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} 
                    />
                    <select 
                        value={itensPorPagina} 
                        onChange={(e) => setItensPorPagina(Number(e.target.value))} 
                        style={{ ...styles.selectPaginacaoTopo, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                    >
                        <option value={20}>20 por pág</option>
                        <option value={40}>40 por pág</option>
                        <option value={100}>100 por pág</option>
                    </select>
                    <button 
                        onClick={() => { setTermoBuscaGlobal(""); setDataInicio(""); setDataFim(""); }} 
                        style={styles.btnLimpar}
                    >
                        Limpar
                    </button>
                </div>

                {/* ABAS DE NAVEGAÇÃO INTERNA */}
                <div style={{ ...styles.tabBar, borderColor: theme.border }}>
                    <button 
                        type="button"
                        onClick={() => setAbaAtiva("vendas")}
                        style={abaAtiva === "vendas" ? styles.tabActive : { ...styles.tab, backgroundColor: theme.inputBg, color: theme.textSec }}
                    >
                        <FiShoppingBag size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Vendas e Pedidos
                    </button>

                    <button 
                        type="button"
                        onClick={() => setAbaAtiva("devolucoes")}
                        style={abaAtiva === "devolucoes" ? styles.tabActive : { ...styles.tab, backgroundColor: theme.inputBg, color: theme.textSec }}
                    >
                        <FiRotateCcw size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Devoluções e Trocas Registradas
                    </button>
                </div>
            </header>

            {/* CONTEÚDO DAS ABAS */}
            <section style={{ ...styles.section, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, minHeight: '650px', position: 'relative' }}>
                <div className="tab-pane-content">
                    {abaAtiva === "vendas" && (
                        <TabVendas 
                            uid={uid}
                            pedidos={pedidosFiltradosGeral}
                            formatarDataExibicao={formatarDataExibicao}
                            formatarMoeda={formatarMoeda}
                            alternarDevolucao={alternarDevolucao}
                            styles={styles}
                            itensPorPagina={itensPorPagina}
                            theme={theme}
                            isModoNoturno={isModoNoturno}
                        />
                    )}

                    {abaAtiva === "devolucoes" && (
                        <TabDevolucao 
                            uid={uid} 
                            dadosFiltradosBusca={pedidosFiltradosGeral}
                            formatarDataExibicao={formatarDataExibicao}
                            formatarMoeda={formatarMoeda}
                            alternarDevolucao={alternarDevolucao}
                            styles={styles}
                        />
                    )}
                </div>
            </section>

            {/* MODAL GLOBAL ÚNICO GERENCIADO PELA PÁGINA */}
            {pedidoParaDevolverModal && (
                <ModalDevolucao
                    pedido={pedidoParaDevolverModal}
                    isOpen={!!pedidoParaDevolverModal}
                    onClose={() => setPedidoParaDevolverModal(null)}
                    onConfirmar={confirmarDevolucaoComDados}
                    formatarMoeda={formatarMoeda}
                />
            )}

            <style jsx>{`
                :global(body), :global(html) {
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow-x: hidden !important;
                    overflow-y: scroll !important;
                }
                .dashboard-page-container {
                    box-sizing: border-box;
                    margin-top: 0 !important;
                    width: 100%;
                    max-width: 100vw;
                    overflow-x: hidden;
                }
                @keyframes fadeInTab {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .tab-pane-content {
                    animation: fadeInTab 0.25s ease-in-out forwards;
                }
                @media (max-width: 768px) {
                    .filtro-container {
                        flex-direction: column !important;
                        align-items: stretch !important;
                    }
                    .filtro-container input,
                    .filtro-container select,
                    .filtro-container button {
                        width: 100% !important;
                        flex: none !important;
                        min-width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    page: { padding: '0px 16px 24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', boxSizing: 'border-box' },
    header: { marginBottom: '24px' },
    filtrosCard: { display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px', alignItems: 'center' },
    input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', flex: 1, minWidth: '240px', outline: 'none', boxSizing: 'border-box' },
    inputDate: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    selectPaginacaoTopo: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box', flexShrink: 0 },
    btnLimpar: { padding: '10px 16px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#ef4444', flexShrink: 0, boxSizing: 'border-box' },
    tabBar: { display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid', paddingBottom: '12px' },
    tab: { padding: '8px 14px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '12px', borderRadius: '8px' },
    tabActive: { padding: '8px 14px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: '600', fontSize: '12px', borderRadius: '8px' },
    section: { padding: '16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflowX: 'auto' },
};