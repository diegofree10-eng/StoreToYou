"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { FiMenu, FiPlus } from "react-icons/fi";

import { getPlanoEfetivo } from "@/utils/planoAtivo";

import Sidebar from "./Sidebar";
import { DashboardGestao } from "./DashboardCompleto";
import { DashboardBronze } from "./DashboardBasico";
import CadastroProdutos from "./produtos/page";
import Pedidos from "./pedidos/page";
import AdminConfig from "./config/page";
import DashboardMaster from "./_tabDashBoardMaster/DashboardMaster";

function AdminLayoutGridDefinitivo() {
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
                  try { await signOut(auth); } catch (e) {}
                  window.location.replace("/atendimentoSuporte");
                  return;
                }
              }
            });

            const qPedidos = query(collection(db, "lojistas", userData.lojaId, "pedidos"), orderBy("numeroPedido", "desc"));
            unsubPedidosRef.current = onSnapshot(qPedidos, (snapPedidos) => {
              setPedidos(snapPedidos.docs.map(d => ({ id: d.id, ...d.data() })));
              setLoading(false);
            }, () => setLoading(false));
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Erro na carga de dados:", e);
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
    <div className="admin-layout-wrapper">
      
      {/* Sidebar na Esquerda */}
      <div className="sidebar-area">
        <Sidebar 
          telaAtiva={telaAtiva} 
          setTelaAtiva={setTelaAtiva} 
          onLogout={handleLogout}
          isOpenMobile={menuMobileAberto}
          onCloseMobile={() => setMenuMobileAberto(false)}
        />
      </div>

      {/* Conteúdo Principal na Direita */}
      <main className="main-content-area">
        
        {/* Barra superior mobile ajustada com menu sanduíche e botão novo */}
        <div className="mobile-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setMenuMobileAberto(true)} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '5px' }}
              aria-label="Abrir menu"
            >
              <FiMenu size={24} color="#1e293b" />
            </button>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>Painel Administrativo</span>
          </div>

          
        </div>

        {/* Telas e Dashboards */}
        <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
          {telaAtiva === 'dash' && planoEfetivo && (
             planoEfetivo.configs.tipoDashboard === 'gestao' ? (
              <DashboardGestao pedidos={pedidos} lojistaId={lojistaIdReal || undefined} />
            ) : (
              <DashboardBronze pedidos={pedidos} dadosLojista={dadosLojista || undefined} />
            )
          )}

          {telaAtiva === 'produtos' && <CadastroProdutos />}
          {telaAtiva === 'pedidos' && lojistaIdReal && <Pedidos pedidos={pedidos} db={db} lojistaIdApp={lojistaIdReal} />}
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
          background-color: #f8fafc !important;
          overflow-x: hidden !important;
          width: 100%;
          min-height: 100vh;
        }

        .admin-layout-wrapper {
          display: grid;
          grid-template-columns: 260px 1fr;
          min-height: 100vh;
          width: 100vw;
          background-color: #f8fafc;
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
          background-color: #f8fafc;
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

        /* Responsividade para Dispositivos Móveis com espaçamento superior aumentado */
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
            padding-top: 80px; /* Aumentado o espaçamento do topo para afastar a listagem da barra */
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
            background: #ffffff;
            border-bottom: 1px solid #e2e8f0;
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