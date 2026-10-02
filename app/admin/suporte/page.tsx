// app/admin/suporte/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FiPlusCircle, FiList, FiClock, FiCheckCircle, FiLayers } from "react-icons/fi";

import { TabNovoTicket } from "./_tabsGestaoSuporte/TabNovoTicket";
import { TabMeusTicket } from "./_tabsGestaoSuporte/TabMeusTicket";

export default function SuportePage() {
  const { theme } = useTheme();
  const [subAba, setSubAba] = useState<"abrir" | "meus_tickets">("abrir");
  const [uid, setUid] = useState<string | null>(null);
  const [nomeLoja, setNomeLoja] = useState<string>("Carregando...");
  const [meusTickets, setMeusTickets] = useState<any[]>([]);

  // Métricas calculadas dos tickets do mês
  const totalCriados = meusTickets.length;
  const totalAbertos = meusTickets.filter(t => t.dsStatus === "aberto" || t.dsStatus === "em_andamento").length;
  const totalFinalizados = meusTickets.filter(t => t.dsStatus === "resolvido" || t.dsStatus === "fechado").length;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        let lojaIdFinal = user.uid;
        
        if (userDoc.exists()) {
          lojaIdFinal = userDoc.data().lojaId || user.uid;
          setUid(lojaIdFinal);
        } else {
          setUid(user.uid);
        }

        const lojistaSnap = await getDoc(doc(db, "lojistas", lojaIdFinal));
        if (lojistaSnap.exists()) {
          const dadosLoja = lojistaSnap.data();
          const nomeReal = dadosLoja.dadosLoja?.dsNomeLoja || 
                           dadosLoja.dsNomeLoja || 
                           dadosLoja.nomeLoja || 
                           dadosLoja.nmLoja || 
                           "Loja Sem Nome";
          setNomeLoja(nomeReal);
        } else {
          setNomeLoja("Loja Sem Nome");
        }
      } catch (error) {
        console.error("Erro ao carregar dados da loja:", error);
        setNomeLoja("Loja Indefinida");
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!uid) return;

    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mesesNomes = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    const chaveMes = `${mesesNomes[dataAtual.getMonth()]}_${ano}`;

    const docRef = doc(db, "master_dashboard", "tickets_suporte", "meses", chaveMes);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const dados = docSnap.data();
        const todosDoMes = dados.tickets || [];
        const filtradosDoLojista = todosDoMes.filter((t: any) => t.lojistaId === uid);
        filtradosDoLojista.reverse();
        setMeusTickets(filtradosDoLojista);
      } else {
        setMeusTickets([]);
      }
    });

    return () => unsub();
  }, [uid]);

  return (
    <div style={{ ...styles.container, background: theme.bgApp, color: theme.textMain }}>
      <div style={styles.header}>
        <h1 style={styles.title}>Central de Suporte Operacional</h1>
        <p style={{ color: theme.textSec, fontSize: "14px" }}>
          Gerencie suas ocorrências e acompanhe o andamento dos chamados com a equipe Master.
        </p>
      </div>

      {/* 🚀 CARDS DE INDICADORES NO TOPO */}
      <div style={styles.gridCardsResumo}>
        <div style={{ ...styles.cardResumo, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconResumoBox, background: "#e0f2fe", color: "#0284c7" }}>
            <FiLayers size={22} />
          </div>
          <div>
            <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "600" }}>Total Criados (Mês)</span>
            <h2 style={{ fontSize: "20px", fontWeight: "800", marginTop: "2px" }}>{totalCriados}</h2>
          </div>
        </div>

        <div style={{ ...styles.cardResumo, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconResumoBox, background: "#fef3c7", color: "#d97706" }}>
            <FiClock size={22} />
          </div>
          <div>
            <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "600" }}>Em Atendimento / Abertos</span>
            <h2 style={{ fontSize: "20px", fontWeight: "800", marginTop: "2px", color: "#d97706" }}>{totalAbertos}</h2>
          </div>
        </div>

        <div style={{ ...styles.cardResumo, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconResumoBox, background: "#dcfce7", color: "#16a34a" }}>
            <FiCheckCircle size={22} />
          </div>
          <div>
            <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "600" }}>Resolvidos / Fechados</span>
            <h2 style={{ fontSize: "20px", fontWeight: "800", marginTop: "2px", color: "#16a34a" }}>{totalFinalizados}</h2>
          </div>
        </div>
      </div>

      {/* Sub-abas de Navegação Interna */}
      <div style={{ ...styles.subTabBar, borderColor: theme.border }}>
        <button 
          onClick={() => setSubAba("abrir")}
          style={subAba === "abrir" ? styles.tabActive : { ...styles.tab, background: theme.bgCard, color: theme.textSec, border: `1px solid ${theme.border}` }}
        >
          <FiPlusCircle size={15} /> Abrir Novo Chamado
        </button>
        <button 
          onClick={() => setSubAba("meus_tickets")}
          style={subAba === "meus_tickets" ? styles.tabActive : { ...styles.tab, background: theme.bgCard, color: theme.textSec, border: `1px solid ${theme.border}` }}
        >
          <FiList size={15} /> Meus Tickets Abertos ({meusTickets.length})
        </button>
      </div>

      {subAba === "abrir" ? (
        <TabNovoTicket uid={uid} nomeLoja={nomeLoja} onSucesso={() => setSubAba("meus_tickets")} theme={theme} />
      ) : (
        <TabMeusTicket meusTickets={meusTickets} theme={theme} />
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: "30px", minHeight: "100vh" },
  header: { marginBottom: "20px" },
  title: { fontSize: "24px", fontWeight: "800", marginBottom: "5px" },
  gridCardsResumo: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", marginBottom: "25px" },
  cardResumo: { padding: "18px", borderRadius: "14px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" },
  iconResumoBox: { width: "45px", height: "45px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  subTabBar: { display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid", paddingBottom: "12px" },
  tab: { padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" },
  tabActive: { padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", background: "#1e293b", color: "#fff", border: "none" }
};