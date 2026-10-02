// app/admin/financeiro/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "@/context/ThemeContext";
import { TabCompras } from "./_tabsGestaoFinanceiro/tabCompras";
import { TabPagamentos } from "./_tabsGestaoFinanceiro/tabPagamentos";
import { FiShoppingCart, FiCreditCard, FiSearch, FiAlertCircle, FiClock, FiCheckCircle, FiFilter } from "react-icons/fi";

export default function GestaoFinanceiroPage() {
    const { theme } = useTheme();
    const [uid, setUid] = useState<string | null>(null);
    const [carregandoAuth, setCarregandoAuth] = useState(true);
    const [abaAtiva, setAbaAtiva] = useState<"compras" | "pagamentos">("compras");

    // Estados para os Filtros Globais e Alertas Financeiros
    const [termoBuscaGlobal, setTermoBuscaGlobal] = useState("");
    const [filtroStatusTabPagamentos, setFiltroStatusTabPagamentos] = useState<string>("todos"); // todos, vencidos, hoje, pendente, pago

    // Indicadores (KPIs) calculados em tempo real da aba de pagamentos
    const [totalVencido, setTotalVencido] = useState(0);
    const [totalVenceHoje, setTotalVenceHoje] = useState(0);
    const [totalPendenteGeral, setTotalPendenteGeral] = useState(0);

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

    // Monitora pagamentos para alimentar os alertas e KPIs em tempo real
    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, "lojistas", uid, "pagamentos_financeiro"), orderBy("vencimento", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            const hojeStr = new Date().toISOString().split('T')[0];
            let vVencido = 0;
            let vHoje = 0;
            let vPendente = 0;

            snap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const valor = Number(data.valor || 0);
                const status = data.status || "pendente";

                if (status === "pendente") {
                    vPendente += valor;
                    if (data.vencimento < hojeStr) {
                        vVencido += valor;
                    } else if (data.vencimento === hojeStr) {
                        vHoje += valor;
                    }
                }
            });

            setTotalVencido(vVencido);
            setTotalVenceHoje(vHoje);
            setTotalPendenteGeral(vPendente);
        });
        return () => unsub();
    }, [uid]);

    if (carregandoAuth) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: theme.textSec, background: theme.bgApp, minHeight: '100vh' }}>
                Carregando dados financeiros...
            </div>
        );
    }

    if (!uid) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', background: theme.bgApp, minHeight: '100vh' }}>
                Acesso negado ou usuário não autenticado.
            </div>
        );
    }

    return (
        <div style={{ padding: '0px', fontFamily: 'system-ui, sans-serif', backgroundColor: theme.bgApp, color: theme.textMain, minHeight: '100vh', boxSizing: 'border-box' }}>
            
            {/* CABEÇALHO DO MÓDULO */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 800 }}>💰 Gestão Financeira & Custos</h2>
                    <p style={{ fontSize: '13px', color: theme.textSec, margin: '4px 0 0 0' }}>Gerencie lançamentos de compras de fornecedores e pagamentos.</p>
                </div>

                {/* CARDS DE ALERTAS / KPIS FINANCEIROS */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div 
                        onClick={() => { setAbaAtiva("pagamentos"); setFiltroStatusTabPagamentos("vencidos"); }}
                        style={{ background: totalVencido > 0 ? '#fee2e2' : theme.bgCard, border: `1px solid ${totalVencido > 0 ? '#ef4444' : theme.border}`, padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        title="Clique para filtrar contas vencidas"
                    >
                        <FiAlertCircle size={16} color={totalVencido > 0 ? '#991b1b' : theme.textSec} />
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: totalVencido > 0 ? '#991b1b' : theme.textSec, display: 'block', textTransform: 'uppercase' }}>Vencidos</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: totalVencido > 0 ? '#991b1b' : theme.textMain }}>R$ {totalVencido.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>

                    <div 
                        onClick={() => { setAbaAtiva("pagamentos"); setFiltroStatusTabPagamentos("hoje"); }}
                        style={{ background: totalVenceHoje > 0 ? '#fef08a' : theme.bgCard, border: `1px solid ${totalVenceHoje > 0 ? '#eab308' : theme.border}`, padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        title="Clique para filtrar contas que vencem hoje"
                    >
                        <FiClock size={16} color={totalVenceHoje > 0 ? '#854d0e' : theme.textSec} />
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: totalVenceHoje > 0 ? '#854d0e' : theme.textSec, display: 'block', textTransform: 'uppercase' }}>Vence Hoje</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: totalVenceHoje > 0 ? '#854d0e' : theme.textMain }}>R$ {totalVenceHoje.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>

                    <div 
                        onClick={() => { setAbaAtiva("pagamentos"); setFiltroStatusTabPagamentos("pendente"); }}
                        style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        title="Total de Contas em Aberto"
                    >
                        <FiCreditCard size={16} color={theme.primary} />
                        <div>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: theme.textSec, display: 'block', textTransform: 'uppercase' }}>Total Aberto</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: theme.textMain }}>R$ {totalPendenteGeral.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BARRA DE PESQUISA GLOBAL E FILTROS */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '260px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <FiSearch size={16} style={{ position: 'absolute', left: '12px', color: theme.textSec }} />
                    <input 
                        type="text"
                        placeholder="Pesquisar por descrição, fornecedor, número do pedido ou ID..."
                        value={termoBuscaGlobal}
                        onChange={e => setTermoBuscaGlobal(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>

                {abaAtiva === 'pagamentos' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.bgCard, border: `1px solid ${theme.border}`, padding: '6px 12px', borderRadius: '8px' }}>
                        <FiFilter size={14} color={theme.textSec} />
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Filtro:</span>
                        <select 
                            value={filtroStatusTabPagamentos}
                            onChange={e => setFiltroStatusTabPagamentos(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: theme.textMain, fontSize: '12px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="todos" style={{ background: theme.bgCard }}>Todas as Faturas</option>
                            <option value="vencidos" style={{ background: theme.bgCard }}>🚨 Apenas Vencidas</option>
                            <option value="hoje" style={{ background: theme.bgCard }}>⚡ Vencem Hoje</option>
                            <option value="pendente" style={{ background: theme.bgCard }}>⏳ Abertas / Pendentes</option>
                            <option value="pago" style={{ background: theme.bgCard }}>✅ Pagas</option>
                        </select>
                    </div>
                )}
            </div>

            {/* ABAS DE NAVEGAÇÃO INTERNA */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px', overflowX: 'auto' }}>
                <button 
                    onClick={() => setAbaAtiva("compras")}
                    style={{ 
                        background: abaAtiva === "compras" ? theme.primary : theme.bgCard, 
                        color: abaAtiva === "compras" ? '#fff' : theme.textMain, 
                        border: `1px solid ${theme.border}`, 
                        padding: '8px 16px', 
                        borderRadius: '6px', 
                        fontSize: '13px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <FiShoppingCart size={14} /> Compras / Fornecedores
                </button>

                <button 
                    onClick={() => setAbaAtiva("pagamentos")}
                    style={{ 
                        background: abaAtiva === "pagamentos" ? theme.primary : theme.bgCard, 
                        color: abaAtiva === "pagamentos" ? '#fff' : theme.textMain, 
                        border: `1px solid ${theme.border}`, 
                        padding: '8px 16px', 
                        borderRadius: '6px', 
                        fontSize: '13px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <FiCreditCard size={14} /> Pagamentos & Despesas
                </button>
            </div>

            {/* CONTEÚDO DA ABA ATIVA (Passando as props compatíveis) */}
            <div>
                {abaAtiva === "compras" && (
                    <TabCompras uid={uid} termoBusca={termoBuscaGlobal} />
                )}
                {abaAtiva === "pagamentos" && (
                    <TabPagamentos uid={uid} termoBusca={termoBuscaGlobal} filtroStatus={filtroStatusTabPagamentos} />
                )}
            </div>

        </div>
    );
}