// app/admin/financeiro/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "@/context/ThemeContext";
import { TabCompras } from "./_tabsGestaoFinanceiro/tabCompras";
import { TabPagamentos } from "./_tabsGestaoFinanceiro/tabPagamentos";
import { FiShoppingCart, FiCreditCard } from "react-icons/fi";

export default function GestaoFinanceiroPage() {
    const { theme } = useTheme();
    const [uid, setUid] = useState<string | null>(null);
    const [carregandoAuth, setCarregandoAuth] = useState(true);
    const [abaAtiva, setAbaAtiva] = useState<"compras" | "pagamentos">("compras");

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
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', margin: 0, fontWeight: 800 }}>💰 Gestão Financeira & Custos</h2>
                <p style={{ fontSize: '13px', color: theme.textSec, margin: '4px 0 0 0' }}>Gerencie lançamentos de compras de fornecedores e pagamentos.</p>
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

            {/* CONTEÚDO DA ABA ATIVA */}
            <div>
                {abaAtiva === "compras" && <TabCompras uid={uid} />}
                {abaAtiva === "pagamentos" && <TabPagamentos uid={uid} />}
            </div>

        </div>
    );
}