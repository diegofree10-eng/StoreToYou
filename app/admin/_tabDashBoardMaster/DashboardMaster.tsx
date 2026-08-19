"use client";
import React, { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection, doc, onSnapshot, getDoc, query, orderBy
} from "firebase/firestore";

// --- IMPORTAÇÃO DO TEMA GLOBAL ---
import { useTheme } from "@/context/ThemeContext";

// --- IMPORTAÇÃO DAS TABS ---
import TabPanorama from "./TabPanorama";
import TabPlanos from "./TabPlanos";
import TabAssinaturas from "./TabAssinaturas";
import TabAvisos from "./TabAvisos";
import TabDenuncias from "./TabDenuncias";
import TabFinanceiro from "./TabFinanceiro";
import TabAparenciaLandPage from "./TabAparenciaLandPage";
import TabHistoricoVersao from "./TabHistoricoVersao";

import {
  FiAward, FiUsers, FiTrendingUp, FiSettings,
  FiMessageSquare, FiAlertTriangle, FiDollarSign, FiLayout, FiGitCommit
} from "react-icons/fi";

export default function PainelMasterFesta() {
  const { theme, isModoNoturno } = useTheme(); // 🌟 Consumindo o tema global

  const [activeTab, setActiveTab] = useState("PANORAMA");
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [lojistas, setLojistas] = useState([]);
  const [denuncias, setDenuncias] = useState([]);
  const [versaoAtualMaster, setVersaoAtualMaster] = useState("");
  const [notificacao, setNotificacao] = useState({ exibir: false, texto: "", tipo: "sucesso" });

  const [planos, setPlanos] = useState({
    Bronze: { nome: "Bronze", produtos: 20, categorias: 3, cor: "#c2410c", medalhaUrl: "", modeloDash: "basico" },
    Prata: { nome: "Prata", produtos: 100, categorias: 10, cor: "#475569", medalhaUrl: "", modeloDash: "completo" },
    Ouro: { nome: "Ouro", produtos: 9999, categorias: 9999, cor: "#a16207", medalhaUrl: "", modeloDash: "completo" }
  });

  // 1. VERIFICAÇÃO DE AUTORIZAÇÃO (Filtra quem tem o role "master")
  useEffect(() => {
    const checkAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", user.uid));
          if (userDoc.exists() && userDoc.data().role === "master") {
            setIsAuthorized(true);
          } else {
            window.location.href = "/login";
          }
        } catch (error) {
          console.error("Erro na verificação de privilégios:", error);
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    });
    return () => checkAuth();
  }, []);

  // 2. LEITURA EM TEMPO REAL (FIREBASE)
  useEffect(() => {
    if (!isAuthorized) return;

    const unsubPlanos = onSnapshot(doc(db, "configuracoes", "planos"), (snap) => {
      if (snap.exists()) setPlanos(snap.data() as any);
    });

    const unsubLojistas = onSnapshot(collection(db, "lojistas"), (snap) => {
      setLojistas(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
      setLoading(false);
    });

    const unsubDenuncias = onSnapshot(query(collection(db, "denuncias"), orderBy("data", "desc")), (snap) => {
      setDenuncias(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    }, (error) => {
      console.error("Erro na busca de denúncias:", error.message);
    });

    const unsubVersao = onSnapshot(doc(db, "configuracoes", "sistema"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.dsVersaoSistema) {
          setVersaoAtualMaster(data.dsVersaoSistema);
        } else if (data.historicoVersoes?.dsVersaoSistema) {
          setVersaoAtualMaster(data.historicoVersoes.dsVersaoSistema);
        }
      }
    });

    return () => {
      unsubPlanos();
      unsubLojistas();
      unsubDenuncias();
      unsubVersao();
    };
  }, [isAuthorized]);

  const mostrarAviso = (texto: string, tipo = "sucesso") => {
    setNotificacao({ exibir: true, texto, tipo });
    setTimeout(() => setNotificacao({ exibir: false, texto: "", tipo: "sucesso" }), 3000);
  };

  if (loading || !isAuthorized) {
    return (
      <div style={{ ...styles.loader, backgroundColor: theme.bgApp, color: theme.textSec }}>
        <p>Autenticando Master...</p>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, backgroundColor: theme.bgApp, color: theme.textMain }}>
      {/* TOAST DE NOTIFICAÇÃO */}
      {notificacao.exibir && (
        <div style={{ ...styles.toast, backgroundColor: notificacao.tipo === "sucesso" ? "#10b981" : "#ef4444" }}>
          {notificacao.texto}
        </div>
      )}

      <header style={{ ...styles.header, borderBottom: `1px solid ${theme.border}` }}>
        <div>
          <h2 style={{ ...styles.welcomeText, color: theme.textSec }}>Seja bem-vindo,</h2>
          <h1 style={{ ...styles.masterTitle, color: theme.textMain }}>MASTER</h1>
          <p style={{ ...styles.subTitle, color: theme.textSec }}>Painel de Controle Administrativo</p>
        </div>

        {/* BLOCO DIREITO: VERSÃO RECENTE */}
        <div style={styles.headerRightContainer}>
          {versaoAtualMaster && (
            <div style={{ 
              ...styles.versionBadge, 
              background: isModoNoturno ? '#1e293b' : '#eff6ff', 
              border: `1px solid ${isModoNoturno ? '#334155' : '#bfdbfe'}`,
              color: isModoNoturno ? '#60a5fa' : '#1e40af'
            }}>
              <FiGitCommit size={15} color={theme.primary} />
              <span>v{versaoAtualMaster}</span>
            </div>
          )}
        </div>
      </header>

      {/* NAVEGAÇÃO ENTRE TABS */}
      <nav style={{ ...styles.tabContainer, borderBottom: `2px solid ${theme.border}` }}>
        {[
          { id: "PANORAMA", icon: <FiTrendingUp />, label: "PANORAMA" },
          { id: "FINANCEIRO", icon: <FiDollarSign />, label: "FINANCEIRO" },
          { id: "PLANOS", icon: <FiSettings />, label: "CONFIG PLANOS" },
          { id: "ASSINATURAS", icon: <FiAward />, label: "ASSINATURAS" },
          { id: "APARENCIA", icon: <FiLayout />, label: "APARÊNCIA LANDPAGE" },
          { id: "VERSOES", icon: <FiGitCommit />, label: "VERSÕES" },
          { id: "AVISOS", icon: <FiMessageSquare />, label: "AVISOS" },
          { id: "DENUNCIAS", icon: <FiAlertTriangle />, label: "DENÚNCIAS" }
        ].map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                ...styles.tab,
                color: isActive ? theme.primary : theme.textSec,
                borderBottomColor: isActive ? theme.primary : "transparent",
                fontWeight: isActive ? "700" : "600"
              }}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </nav>

      {/* CONTEÚDO DINÂMICO DAS TABS */}
      <main style={styles.mainContent}>
        {activeTab === "PANORAMA" && (
          <TabPanorama lojistas={lojistas} denuncias={denuncias} planos={planos} />
        )}

        {activeTab === "FINANCEIRO" && (
          <TabFinanceiro lojistas={lojistas} />
        )}

        {activeTab === "PLANOS" && (
          <TabPlanos planos={planos} setPlanos={setPlanos} mostrarAviso={mostrarAviso} />
        )}

        {activeTab === "ASSINATURAS" && (
          <TabAssinaturas lojistas={lojistas} planos={planos} mostrarAviso={mostrarAviso} />
        )}

        {activeTab === "APARENCIA" && (
          <TabAparenciaLandPage />
        )}

        {activeTab === "VERSOES" && (
          <TabHistoricoVersao />
        )}

        {activeTab === "AVISOS" && (
          <TabAvisos lojistas={lojistas} mostrarAviso={mostrarAviso} />
        )}

        {activeTab === "DENUNCIAS" && (
          <TabDenuncias denuncias={denuncias} mostrarAviso={mostrarAviso} />
        )}
      </main>
    </div>
  );
}

const styles: any = {
  container: { padding: "20px", minHeight: "100vh", fontFamily: "'Inter', sans-serif", transition: "background 0.3s, color 0.3s" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 10px 15px 10px', flexWrap: 'wrap', gap: '15px' },

  welcomeText: {
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "-4px"
  },
  masterTitle: {
    fontSize: "32px",
    fontWeight: "900",
    letterSpacing: '-1.5px',
    margin: 0
  },
  subTitle: { fontSize: '14px', marginTop: '4px' },

  headerRightContainer: { display: 'flex', alignItems: 'center', gap: '12px' },
  versionBadge: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '10px', fontWeight: '800', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  loader: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  toast: { position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '10px', color: '#fff', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 10px 15px rgba(0,0,0,0.1)' },
  
  tabContainer: { display: "flex", gap: "10px", flexWrap: 'wrap', marginBottom: "25px", paddingBottom: '0px' },
  
  tab: { padding: "12px 20px", border: "none", borderBottom: "3px solid transparent", background: "none", cursor: "pointer", display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: '0.2s' },
  mainContent: { maxWidth: '1200px', margin: '0 auto' },
};