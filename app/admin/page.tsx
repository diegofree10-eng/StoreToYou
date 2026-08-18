// app/admin/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { FiMenu } from "react-icons/fi";

import { getPlanoEfetivo } from "@/utils/planoAtivo";

import Sidebar from "./Sidebar";
import { DashboardGestao } from "./DashboardCompleto";
import { DashboardBronze } from "./DashboardBasico";
import CadastroProdutos from "./produtos/page";
import Pedidos from "./pedidos/page";
import PaginaEstoque from "./estoque/page";
import AdminConfig from "./config/page";
import DashboardMaster from "./_tabDashBoardMaster/DashboardMaster";

// 🌟 Importando o hook de tema para usar as cores dinâmicas reais
import { useTheme } from "@/context/ThemeContext";

const PaginaPDV = dynamic(() => import("./pdv/page"), { ssr: false });

function AdminLayoutGridDefinitivo() {
  const { theme, isModoNoturno } = useTheme(); // 🌟 Consumindo o tema global aqui também!

  const [telaAtiva, setTelaAtiva] = useState('dash');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dadosLojista, setDadosLojista] = useState<any>(null);
  const [planosConfig, setPlanosConfig] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [lojistaIdReal, setLojistaIdReal] = useState<string | null>(null);

  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const pathname = usePathname();
  const unsubLojaRef = useRef<(() => void) | null>(null);
  const unsubPedidosRef = useRef<(() => void) | null>(null);
  const unsubPlanosRef = useRef<(() => void) | null>(null);

  const planoEfetivo = (dadosLojista && planosConfig) ? getPlanoEfetivo(dadosLojista, planosConfig) : null;

  const masterLiberou = (feature: string) => {
    if (!planoEfetivo) return false;

    const liberado = Boolean(
      (planoEfetivo as Record<string, any>)?.[feature] ??
      (planoEfetivo as Record<string, any>)?.configs?.[feature] ??
      (planoEfetivo as Record<string, any>)?.dadosPlano?.[feature] ??
      false
    );

    return liberado;
  };

  useEffect(() => {
    if (isLoggingOut) return;

    unsubPlanosRef.current = onSnapshot(doc(db, "configuracoes", "planos"), (snap) => {
      if (snap.exists()) setPlanosConfig(snap.data());
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (pathname !== "/login") window.location.replace("/login");
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserRole(userData.role);
          setLojistaIdReal(userData.lojaId);

          if (userData.lojaId) {
            if (unsubLojaRef.current) unsubLojaRef.current();
            if (unsubPedidosRef.current) unsubPedidosRef.current();

            unsubLojaRef.current = onSnapshot(doc(db, "lojistas", userData.lojaId), async (snapLoja) => {
              if (snapLoja.exists()) {
                const lojaData = snapLoja.data();
                setDadosLojista(lojaData);

                const statusLoja = lojaData?.dadosLoja?.dsStatusLoja || lojaData?.status;
                if (statusLoja === "suspenso") {
                  try { await signOut(auth); } catch (e) { }
                  window.location.replace("/atendimentoSuporte");
                  return;
                }
              }
            });

            if (userData.lojaId) {
              const qPedidos = query(collection(db, "lojistas", userData.lojaId, "pedidos"), orderBy("numeroPedido", "desc"));
              unsubPedidosRef.current = onSnapshot(qPedidos, (snapPedidos) => {
                setPedidos(snapPedidos.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
              }, (error) => {
                setLoading(false);
              });
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubPlanosRef.current) unsubPlanosRef.current();
    };
  }, [pathname, isLoggingOut]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    if (unsubLojaRef.current) unsubLojaRef.current();
    if (unsubPedidosRef.current) unsubPedidosRef.current();
    if (unsubPlanosRef.current) unsubPlanosRef.current();
    try { await signOut(auth); } catch (error) { }
    window.location.replace("/login");
  };

  if (isLoggingOut || loading) {
    return (
      <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '16px' }}>
        Carregando sistema...
      </div>
    );
  }

  return (
    <div className="admin-layout-wrapper" style={{ backgroundColor: theme.bgApp }}>

      <div className="sidebar-area">
        <Sidebar
          telaAtiva={telaAtiva}
          setTelaAtiva={setTelaAtiva}
          onLogout={handleLogout}
          isOpenMobile={menuMobileAberto}
          onCloseMobile={() => setMenuMobileAberto(false)}
          planoEfetivo={planoEfetivo}
          masterLiberou={masterLiberou}
        />
      </div>

      <main className="main-content-area" style={{ backgroundColor: theme.bgApp, color: theme.textMain }}>

        <div className="mobile-header-bar" style={{ background: theme.bgCard, borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setMenuMobileAberto(true)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '5px' }}
              aria-label="Abrir menu"
            >
              <FiMenu size={24} color={theme.textMain} />
            </button>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: theme.textMain }}>Painel Administrativo</span>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
          {telaAtiva === 'dash' && planoEfetivo && (
            planoEfetivo.configs?.tipoDashboard === 'gestao' ? (
              <DashboardGestao pedidos={pedidos} lojistaId={lojistaIdReal || undefined} />
            ) : (
              <DashboardBronze pedidos={pedidos} dadosLojista={dadosLojista || undefined} />
            )
          )}

          {telaAtiva === 'produtos' && <CadastroProdutos />}
          {telaAtiva === 'pedidos' && lojistaIdReal && <Pedidos pedidos={pedidos} db={db} lojistaIdApp={lojistaIdReal} />}
          {telaAtiva === 'pdv' && <PaginaPDV />}
          {telaAtiva === 'estoque' && <PaginaEstoque />}
          {telaAtiva === 'config' && <AdminConfig />}
          {telaAtiva === 'gestao-geral' && userRole === 'master' && <DashboardMaster />}
        </div>

      </main>

      <style jsx global>{`
        *, *::before, *::after {
          box-sizing: border-box;
        }
        html, body, #__next {
          margin: 0 !important;
          padding: 0 !important;
          background-color: ${theme.bgApp} !important;
          color: ${theme.textMain} !important;
          overflow-x: hidden !important;
          width: 100%;
          min-height: 100vh;
        }

        .admin-layout-wrapper {
          display: grid;
          grid-template-columns: 260px 1fr;
          min-height: 100vh;
          width: 100vw;
          background-color: ${theme.bgApp};
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        .sidebar-area {
          width: 260px;
          height: 100vh;
          position: sticky;
          top: 0;
          left: 0;
          z-index: 1000;
        }

        .main-content-area {
          background-color: ${theme.bgApp};
          min-height: 100vh;
          width: 100%;
          max-width: 100%;
          padding: 24px;
          overflow-y: auto;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        .mobile-header-bar {
          display: none;
        }

        @media (max-width: 768px) {
          .admin-layout-wrapper {
            grid-template-columns: 1fr;
          }
          .sidebar-area {
            position: fixed;
            height: 100vh;
            width: 0;
            z-index: 1000;
          }
          .main-content-area {
            width: 100vw;
            max-width: 100vw;
            padding: 12px;
            padding-top: 80px;
            padding-bottom: 10px;
            overflow-y: auto;
          }
          .mobile-header-bar {
            display: flex !important;
            justify-content: space-between;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: ${theme.bgCard};
            border-bottom: 1px solid ${theme.border};
            align-items: center;
            padding: 0 15px;
            z-index: 900;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
        }
      `}</style>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AdminLayoutGridDefinitivo), { ssr: false });