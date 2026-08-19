// app/admin/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { FiMenu, FiBell, FiZap, FiCheckCircle } from "react-icons/fi";

import { getPlanoEfetivo } from "@/utils/planoAtivo";
import { marcarMensagemComoLida } from "@/utils/NotificacoesSistema";

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
  const { theme, isModoNoturno } = useTheme(); 

  const [telaAtiva, setTelaAtiva] = useState('dash');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dadosLojista, setDadosLojista] = useState<any>(null);
  const [planosConfig, setPlanosConfig] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [lojistaIdReal, setLojistaIdReal] = useState<string | null>(null);

  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  // 🌟 ESTADOS PARA MODAIS (Mantendo a estrutura do seu componente)
  const [historicoMensagens, setHistoricoMensagens] = useState<any[]>([]);
  const [atualizacoesGlobais, setAtualizacoesGlobais] = useState<any[]>([]);
  const [modalFechadoIds, setModalFechadoIds] = useState<Set<string>>(new Set());

  const pathname = usePathname();
  const unsubLojaRef = useRef<(() => void) | null>(null);
  const unsubPedidosRef = useRef<(() => void) | null>(null);
  const unsubPlanosRef = useRef<(() => void) | null>(null);
  const unsubMensagensRef = useRef<(() => void) | null>(null);
  const unsubAtualizacoesRef = useRef<(() => void) | null>(null);

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
    
    // 🌟 Monitoramento ajustado para a nova subcoleção unificada de versões
    const qVersoes = query(collection(db, "configuracoes", "sistema", "historicoVersoes"), orderBy("nrVersaoSistemaSistema", "desc"));
    unsubAtualizacoesRef.current = onSnapshot(qVersoes, (snap) => {
      setAtualizacoesGlobais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

            // 🌟 Monitoramento Mensagens
            unsubMensagensRef.current = onSnapshot(query(collection(db, "lojistas", userData.lojaId, "mensagens"), orderBy("dataEnvio", "desc")), (snap) => {
                setHistoricoMensagens(snap.docs.map(d => ({ id: d.id, origem: "direcionada", ...d.data() })));
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
      if (unsubAtualizacoesRef.current) unsubAtualizacoesRef.current();
      if (unsubMensagensRef.current) unsubMensagensRef.current();
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

  // 🌟 Lógica de Modais unificada com a nova estrutura de versões
  const versaoAtualLojista = dadosLojista?.atualizacao?.nrVersaoSistemaLogista || "0.0.0";
  
  const updatePending = atualizacoesGlobais.find((upd: any) => {
    const isVisivel = upd.isExibirLogista === true;
    const numeroVersao = upd.nrVersaoSistemaSistema || "";
    const éMaisRecente = numeroVersao.localeCompare(versaoAtualLojista, undefined, { numeric: true }) > 0;
    return isVisivel && éMaisRecente;
  });

  const mensagemPopupAtual = (historicoMensagens || []).find((m: any) => !m.lida && !modalFechadoIds.has(m.id));

  const confirmarLeituraAtualizacao = async (versao: string) => {
    if (!lojistaIdReal) return;
    await updateDoc(doc(db, "lojistas", lojistaIdReal), { "atualizacao.nrVersaoSistemaLogista": versao });
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

      {/* 🚀 MODAIS (Logica injetada sem alterar classes/estilos de layout) */}
      {updatePending && (
        <div style={styles.overlay}>
          <div style={{ ...styles.popupCard, background: theme.bgCard, color: theme.textMain, textAlign: 'left' }}>
             <h3 style={{ marginBottom: '10px', textAlign: 'center', color: theme.primary }}>
               🚀 Nova Versão Disponível v{updatePending.nrVersaoSistemaSistema}
             </h3>
             <p style={{ fontSize: '13px', color: theme.textSec, marginBottom: '15px', textAlign: 'center' }}>
               O sistema foi atualizado com melhorias para você:
             </p>
             <ul style={{ paddingLeft: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none' }}>
               {updatePending.dsDescricao?.map((desc: string, idx: number) => (
                 <li key={idx} style={{ fontSize: '13px', color: theme.textMain, lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                   <FiCheckCircle size={14} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                   <span>{desc}</span>
                 </li>
               ))}
             </ul>
             <div style={{ textAlign: 'center' }}>
               <button 
                 onClick={() => confirmarLeituraAtualizacao(updatePending.nrVersaoSistemaSistema)} 
                 style={{ ...styles.btnAction, width: '100%' }}
               >
                 Entendido e Atualizar
               </button>
             </div>
          </div>
        </div>
      )}

      {mensagemPopupAtual && !updatePending && (
        <div style={styles.overlay}>
          <div style={{ ...styles.popupCard, background: theme.bgCard, color: theme.textMain }}>
             <h3>{mensagemPopupAtual.titulo}</h3>
             <p>{mensagemPopupAtual.texto}</p>
             <button onClick={async () => {
                setModalFechadoIds(prev => new Set(prev).add(mensagemPopupAtual.id));
                await marcarMensagemComoLida(lojistaIdReal!, mensagemPopupAtual.id, "direcionada", historicoMensagens);
             }} style={styles.btnAction}>OK</button>
          </div>
        </div>
      )}

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
        // ... (Mantive EXATAMENTE o seu bloco de estilos abaixo)
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #__next { margin: 0 !important; padding: 0 !important; background-color: ${theme.bgApp} !important; color: ${theme.textMain} !important; overflow-x: hidden !important; width: 100%; min-height: 100vh; }
        .admin-layout-wrapper { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; width: 100vw; background-color: ${theme.bgApp}; margin: 0; padding: 0; overflow-x: hidden; }
        .sidebar-area { width: 260px; height: 100vh; position: sticky; top: 0; left: 0; z-index: 1000; }
        .main-content-area { background-color: ${theme.bgApp}; min-height: 100vh; width: 100%; max-width: 100%; padding: 24px; overflow-y: auto; overflow-x: hidden; box-sizing: border-box; }
        .mobile-header-bar { display: none; }
        @media (max-width: 768px) { .admin-layout-wrapper { grid-template-columns: 1fr; } .sidebar-area { position: fixed; height: 100vh; width: 0; z-index: 1000; } .main-content-area { width: 100vw; max-width: 100vw; padding: 12px; padding-top: 80px; padding-bottom: 10px; overflow-y: auto; } .mobile-header-bar { display: flex !important; justify-content: space-between; position: fixed; top: 0; left: 0; right: 0; height: 60px; background: ${theme.bgCard}; border-bottom: 1px solid ${theme.border}; align-items: center; padding: 0 15px; z-index: 900; box-shadow: 0 1px 3px rgba(0,0,0,0.05); } }
      `}</style>
    </div>
  );
}

// Estilos isolados para não impactar o design original
const styles: any = {
  overlay: { position: 'fixed', inset:0, background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  popupCard: { padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' },
  btnAction: { padding: '12px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }
};

export default dynamic(() => Promise.resolve(AdminLayoutGridDefinitivo), { ssr: false });