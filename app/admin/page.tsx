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
import PaginaColaboradores from "./colaboradores/page";

// 🌟 Importando as páginas de Relatórios, Suporte, Financeiro e Devoluções
import RelatoriosPage from "./relatorios/page";
import SuportePage from "./suporte/page";
import DevolucaoPage from "./devolucao/page";
import GestaoFinanceiroPage from "./financeiro/page";

// 🌟 Importando o hook de tema para usar as cores dinâmicas reais
import { useTheme } from "@/context/ThemeContext";

const PaginaPDV = dynamic(() => import("./pdv/page"), { ssr: false });

function AdminLayoutGridDefinitivo() {
  const { theme, isModoNoturno } = useTheme(); 

  const [telaAtiva, setTelaAtiva] = useState('dash');
  const [userRole, setUserRole] = useState<string | null>(null);

  // 🌟 Estados para as novas flags booleanas de perfil
  const [isMasterFlag, setIsMasterFlag] = useState(false);
  const [isLojistaFlag, setIsLojistaFlag] = useState(false);
  const [isColaboradorFlag, setIsColaboradorFlag] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dadosLojista, setDadosLojista] = useState<any>(null);
  const [planosConfig, setPlanosConfig] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [lojistaIdReal, setLojistaIdReal] = useState<string | null>(null);

  // 🌟 Estado para guardar os dados e permissões do colaborador logado
  const [colaboradorSessao, setColaboradorSessao] = useState<any>(null);

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

          // 🌟 Identificação precisa baseada nas flags booleanas com fallback seguro
          const masterFlag = userData.isTipoContaMaster === true || userData.role === 'master';
          const lojistaFlag = userData.isTipoContaLogista === true || ['admin', 'lojista'].includes(userData.role);
          const colaboradorFlag = userData.isTipoContaColaborador === true || userData.role === 'colaborador';

          setIsMasterFlag(masterFlag);
          setIsLojistaFlag(lojistaFlag);
          setIsColaboradorFlag(colaboradorFlag);

          if (userData.lojaId) {
            // 🌟 Se for colaborador, busca direto pelo UID do Auth na subcoleção da loja
            if (colaboradorFlag) {
              try {
                const colabDocRef = doc(db, "lojistas", userData.lojaId, "colaboradores", user.uid);
                const colabSnap = await getDoc(colabDocRef);

                if (colabSnap.exists()) {
                  const colabEncontrado = { id: colabSnap.id, ...colabSnap.data() };
                  setColaboradorSessao(colabEncontrado);

                  const primeiraTela = Object.entries((colabEncontrado as any).permissoes || {}).find(([k, v]) => v === true)?.[0];
                  if (primeiraTela) {
                    setTelaAtiva(primeiraTela);
                  }
                }
              } catch (err) {
                console.error("Erro ao carregar permissões do colaborador:", err);
              }
            }

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
              const qPedidos = query(collection(db, "lojistas", userData.lojaId, "pedidos"));
              unsubPedidosRef.current = onSnapshot(qPedidos, (snapPedidos) => {
                setPedidos(snapPedidos.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
              }, (error) => {
                console.error("Erro ao escutar pedidos:", error);
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
        console.error("Erro na autenticação do layout:", e);
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
          colaboradorSessao={colaboradorSessao}
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
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: theme.textMain }}>
              {colaboradorSessao ? `Painel - ${colaboradorSessao.dsNomeColaborador || colaboradorSessao.nome}` : 'Painel Administrativo'}
            </span>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
          {telaAtiva === 'dash' && planoEfetivo && (
            (!colaboradorSessao || colaboradorSessao.permissoes?.dash !== false) ? (
              planoEfetivo.configs?.tipoDashboard === 'gestao' ? (
                <DashboardGestao pedidos={pedidos} lojistaId={lojistaIdReal || undefined} />
              ) : (
                <DashboardBronze pedidos={pedidos} dadosLojista={dadosLojista || undefined} />
              )
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito ao Dashboard.</div>
            )
          )}

          {telaAtiva === 'produtos' && (!colaboradorSessao || colaboradorSessao.permissoes?.produtos !== false ? <CadastroProdutos /> : <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito a Produtos.</div>)}
          {telaAtiva === 'pedidos' && lojistaIdReal && (!colaboradorSessao || colaboradorSessao.permissoes?.pedidos !== false ? <Pedidos pedidos={pedidos} db={db} lojistaIdApp={lojistaIdReal} /> : <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito a Pedidos.</div>)}
          
          {/* 🌟 Aba de Devoluções correta e limpa */}
          {telaAtiva === 'devolucoes' && lojistaIdReal && (!colaboradorSessao || colaboradorSessao.permissoes?.devolucoes !== false ? <DevolucaoPage /> : <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito a Devoluções.</div>)}

          {telaAtiva === 'financeiro' && (!colaboradorSessao || colaboradorSessao.permissoes?.financeiro !== false ? <GestaoFinanceiroPage /> : <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito ao Financeiro.</div>)}
          {telaAtiva === 'pdv' && (!colaboradorSessao || colaboradorSessao.permissoes?.pdv !== false ? <PaginaPDV /> : <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito ao PDV.</div>)}
          
          {/* 🌟 Validação blindada usando as flags booleanas para a página de colaboradores */}
          {telaAtiva === 'colaboradores' && (isMasterFlag || isLojistaFlag || !colaboradorSessao ? <PaginaColaboradores /> : <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito.</div>)}
          
          {telaAtiva === 'estoque' && (!colaboradorSessao || colaboradorSessao.permissoes?.estoque !== false ? <PaginaEstoque /> : <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito ao Estoque.</div>)}
          {telaAtiva === 'relatorios' && (!colaboradorSessao || colaboradorSessao.permissoes?.relatorios !== false ? <RelatoriosPage /> : <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito a Relatórios.</div>)}
          {telaAtiva === 'suporte' && (!colaboradorSessao || colaboradorSessao.permissoes?.suporte !== false ? <SuportePage /> : <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito ao Suporte.</div>)}
          {telaAtiva === 'config' && (!colaboradorSessao || colaboradorSessao.permissoes?.config !== false ? <AdminConfig /> : <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Acesso restrito a Configurações.</div>)}
          
          {/* 🌟 Validação de Gestão Geral por flag master */}
          {telaAtiva === 'gestao-geral' && (isMasterFlag || userRole === 'master') && <DashboardMaster />}
        </div>

      </main>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #__next { margin: 0 !important; padding: 0 !important; background-color: ${theme.bgApp} !important; color: ${theme.textMain} !important; overflow-x: hidden !important; width: 100%; min-height: 100vh; }
        .admin-layout-wrapper { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; width: 100vw; background-color: ${theme.bgApp}; margin: 0; padding: 0; overflow-x: hidden; }
        .sidebar-area { width: 260px; height: 100vh; position: sticky; top: 0; left: 0; z-index: 1000; }
        .main-content-area { background-color: ${theme.bgApp}; min-height: 100vh; width: 100%; max-width: 100%; padding: 24px; overflow-y: auto; overflow-x: hidden; box-sizing: border-box; }
        .mobile-header-bar { display: none; }

        * {
          scrollbar-width: thin;
          scrollbar-color: ${isModoNoturno ? '#334155 #1e293b' : '#cbd5e1 #f1f5f9'};
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: ${isModoNoturno ? '#0f172a' : '#f8fafc'};
        }

        ::-webkit-scrollbar-thumb {
          background: ${isModoNoturno ? '#334155' : '#cbd5e1'};
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${isModoNoturno ? '#475569' : '#94a3b8'};
        }

        @media (max-width: 768px) { 
          .admin-layout-wrapper { grid-template-columns: 1fr; } 
          .sidebar-area { position: fixed; height: 100vh; width: 0; z-index: 1000; } 
          .main-content-area { width: 100vw; max-width: 100vw; padding: 12px; padding-top: 80px; padding-bottom: 10px; overflow-y: auto; } 
          .mobile-header-bar { display: flex !important; justify-content: space-between; position: fixed; top: 0; left: 0; right: 0; height: 60px; background: ${theme.bgCard}; border-bottom: 1px solid ${theme.border}; align-items: center; padding: 0 15px; z-index: 900; box-shadow: 0 1px 3px rgba(0,0,0,0.05); } 
        }
      `}</style>
    </div>
  );
}

const styles: any = {
  overlay: { position: 'fixed', inset:0, background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  popupCard: { padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' },
  btnAction: { padding: '12px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }
};

export default dynamic(() => Promise.resolve(AdminLayoutGridDefinitivo), { ssr: false });