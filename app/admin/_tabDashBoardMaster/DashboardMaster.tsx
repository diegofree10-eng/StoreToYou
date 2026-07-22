
"use client";
import React, { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, doc, onSnapshot, getDoc, query, orderBy 
} from "firebase/firestore";

// --- IMPORTAÇÃO DAS TABS ---

import TabPanorama from "./TabPanorama";
import TabPlanos from "./TabPlanos";
import TabAssinaturas from "./TabAssinaturas";
import TabAvisos from "./TabAvisos";
import TabDenuncias from "./TabDenuncias";
import TabFinanceiro from "./TabFinanceiro";


import { 
  FiAward, FiUsers, FiTrendingUp, FiSettings,
  FiMessageSquare, FiAlertTriangle, FiDollarSign
} from "react-icons/fi";

export default function PainelMasterFesta() {
  const [activeTab, setActiveTab] = useState("PANORAMA");
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [lojistas, setLojistas] = useState([]);
  const [denuncias, setDenuncias] = useState([]);
  const [notificacao, setNotificacao] = useState({ exibir: false, texto: "", tipo: "sucesso" });

  // 📦 OBJETO DE INICIALIZAÇÃO LIMPO: Não trava nenhuma flag nova no código rígido.
  // O onSnapshot se encarrega de preencher as propriedades customizadas vindo direto do Firestore.
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
    if (!isAuthorized || !auth.currentUser) return;

    // Alimenta dinamicamente as flags e abas configuradas na nuvem
    const unsubPlanos = onSnapshot(doc(db, "configuracoes", "planos"), (snap) => {
      if (snap.exists()) setPlanos(snap.data() as any);
    });

    const unsubLojistas = onSnapshot(collection(db, "lojistas"), (snap) => {
      setLojistas(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
      setLoading(false);
    }, (error) => {
      console.warn("Aguardando estabilização dos privilégios Master para carregar lojistas...", error.message);
    });

    const unsubDenuncias = onSnapshot(query(collection(db, "denuncias"), orderBy("data", "desc")), (snap) => {
      setDenuncias(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    }, (error) => {
      console.warn("Aguardando validação de regras de segurança para aba denúncias...", error.message);
    });

    return () => { 
      unsubPlanos(); 
      unsubLojistas(); 
      unsubDenuncias(); 
    };
  }, [isAuthorized]);

  const mostrarAviso = (texto: string, tipo = "sucesso") => {
    setNotificacao({ exibir: true, texto, tipo });
    setTimeout(() => setNotificacao({ exibir: false, texto: "", tipo: "sucesso" }), 3000);
  };

  if (loading || !isAuthorized) return <div style={styles.loader}><p>Autenticando Master...</p></div>;

  return (
    <div style={styles.container}>
      {/* TOAST DE NOTIFICAÇÃO */}
      {notificacao.exibir && (
        <div style={{...styles.toast, backgroundColor: notificacao.tipo === "sucesso" ? "#10b981" : "#ef4444"}}>
          {notificacao.texto}
        </div>
      )}

      <header style={styles.header}>
        <div>
          <h1 style={styles.mainTitle}>Festa em Topo</h1>
          <p style={styles.subTitle}>Painel de Controle Administrativo</p>
        </div>
        <div style={styles.statsHeader}>
          <div style={styles.statItem}><FiUsers /> {lojistas.length} Lojistas</div>
        </div>
      </header>

      {/* NAVEGAÇÃO ENTRE TABS */}
      <nav style={styles.tabContainer}>
        {[
          {id: "PANORAMA", icon: <FiTrendingUp />, label: "PANORAMA"},
          {id: "FINANCEIRO", icon: <FiDollarSign />, label: "FINANCEIRO"},
          {id: "PLANOS", icon: <FiSettings />, label: "CONFIG PLANOS"},
          {id: "ASSINATURAS", icon: <FiAward />, label: "ASSINATURAS"},
          {id: "AVISOS", icon: <FiMessageSquare />, label: "AVISOS"},
          {id: "DENUNCIAS", icon: <FiAlertTriangle />, label: "DENÚNCIAS"}
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id)} 
            style={activeTab === t.id ? styles.tabActive : styles.tab}
          >
            {t.icon} {t.label}
          </button>
        ))}
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
  container: { padding: "20px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 10px' },
  mainTitle: { fontSize: "28px", color: "#0f172a", fontWeight: "900", letterSpacing: '-1px' },
  subTitle: { color: '#64748b', fontSize: '14px' },
  statsHeader: { background: '#fff', padding: '10px 20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  statItem: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#3b82f6' },
  loader: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#64748b' },
  toast: { position: 'fixed', top: '20px', right: '20px', padding: '15px 25px', borderRadius: '10px', color: '#fff', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 10px 15px rgba(0,0,0,0.1)' },
  tabContainer: { display: "flex", gap: "10px", overflowX: 'auto', borderBottom: "2px solid #e2e8f0", marginBottom: "25px", paddingBottom: '5px' },
  tab: { padding: "12px 20px", border: "none", borderBottom: "3px solid transparent", background: "none", cursor: "pointer", color: "#94a3b8", fontWeight: "600", display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: '0.2s' },
  tabActive: { padding: "12px 20px", border: "none", borderBottom: "3px solid #3b82f6", background: "none", cursor: "pointer", color: "#3b82f6", fontWeight: "700", display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' },
  mainContent: { maxWidth: '1200px', margin: '0 auto' },
};