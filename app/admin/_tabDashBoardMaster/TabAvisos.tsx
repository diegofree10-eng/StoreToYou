"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { FiMessageSquare, FiSearch, FiSend, FiCheck, FiEye, FiClock, FiArrowLeft } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

interface TabAvisosProps {
  lojistas: any[];
  mostrarAviso: (msg: string, tipo?: string) => void;
}

export default function TabAvisos({ lojistas, mostrarAviso }: TabAvisosProps) {
  const { theme, isModoNoturno } = useTheme();

  const [msgTexto, setMsgTexto] = useState("");
  const [targetLojista, setTargetLojista] = useState("todos");
  const [buscaLojistaMsg, setBuscaLojistaMsg] = useState("");
  const [filtroPlanoMsg, setFiltroPlanoMsg] = useState("Todos");

  const [msgVisualizar, setMsgVisualizar] = useState<any>(null);
  const [msgDetalhe, setMsgDetalhe] = useState<any>(null);
  const [unsub, setUnsub] = useState<any>(null);

  // Limpeza de listener ao desmontar
  useEffect(() => () => { if (unsub) unsub(); }, [unsub]);

  const lojistasFiltrados = lojistas.filter(l => {
    const nomeLoja = l.dadosLoja?.dsNomeLoja?.toLowerCase() || "";
    const planoLoja = l.dadosLoja?.dsPlanoLoja || "Sem Plano";

    const bateBusca = nomeLoja.includes(buscaLojistaMsg.toLowerCase());
    const batePlano = filtroPlanoMsg === "Todos" || planoLoja === filtroPlanoMsg;

    return bateBusca && batePlano;
  });

  async function enviarMensagem() {
    if (!msgTexto) return;

    const paraTodos = targetLojista === "todos";
    const lojaSelecionada = !paraTodos ? lojistas.find(l => l.id === targetLojista) : null;

    const comunicado = {
      titulo: "Comunicado do Master",
      texto: msgTexto,
      dataEnvio: serverTimestamp(),
      lida: false,
      prioridade: "alta",
      categoria: "sistema",
      data: Date.now(),
      paraTodos: paraTodos,
      lojaId: paraTodos ? "TODOS" : targetLojista,
      nomeLoja: paraTodos ? "Todos os Lojistas" : (lojaSelecionada?.dadosLoja?.dsNomeLoja || "Loja")
    };

    try {
      // 🌟 1. Salva APENAS 1 documento na subcoleção centralizada
      await addDoc(collection(db, "configuracoes", "sistema", "historicoMensagens"), comunicado);

      if (paraTodos) {
        // Atualiza a raiz de todos os lojistas apenas para disparar o modal instantaneamente
        const promessas = lojistas.map(l => 
          updateDoc(doc(db, "lojistas", l.id), { mensagemMaster: comunicado })
        );
        await Promise.all(promessas);
        mostrarAviso("Comunicado enviado para todos!");
      } else {
        // Atualiza a raiz apenas do lojista específico selecionado
        await updateDoc(doc(db, "lojistas", targetLojista), {
          mensagemMaster: comunicado
        });
        mostrarAviso("Comunicado enviado!");
      }

      setMsgTexto("");
      setTargetLojista("todos");
    } catch (e) {
      console.error(e);
      mostrarAviso("Erro ao enviar.", "erro");
    }
  }
  
  const abrirHistorico = (l: any) => {
    if (unsub) unsub();
    // 🌟 Lê do local centralizado e filtra no frontend as mensagens que são para "TODOS" ou específicas daquela loja
    const q = query(
      collection(db, "configuracoes", "sistema", "historicoMensagens"), 
      orderBy("dataEnvio", "desc")
    );
    const listener = onSnapshot(q, (snap) => {
      const todasMensagens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mensagensDaLoja = todasMensagens.filter((m: any) => m.paraTodos === true || m.lojaId === l.id);
      setMsgVisualizar({ loja: l.dadosLoja?.dsNomeLoja || "Loja", historico: mensagensDaLoja });
    });
    setUnsub(() => listener);
  };

  return (
    <div style={{ ...styles.tabWrapper, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
      {/* MODAL 1: HISTÓRICO */}
      {msgVisualizar && (
        <div style={styles.overlayMaster} onClick={() => { if (unsub) unsub(); setMsgVisualizar(null); }}>
          <div style={{ ...styles.modalVisualizar, background: theme.bgCard, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ ...styles.modalVisHeader, color: theme.primary }}>
              <FiMessageSquare /> HISTÓRICO: {msgVisualizar.loja}
            </div>
            <div style={styles.historicoScroll}>
              {msgVisualizar.historico?.length === 0 ? <p style={{ ...styles.noMsg, color: theme.textSec }}>Nenhuma mensagem.</p> :
                msgVisualizar.historico.map((m: any) => (
                  <div key={m.id} style={{ ...styles.cardHistorico, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }} onClick={() => setMsgDetalhe(m)}>
                    <div style={{ ...styles.modalVisSub, color: theme.textSec }}>
                      <span style={{ color: m.paraTodos ? '#3b82f6' : '#8b5cf6', fontWeight: 'bold' }}>
                        {m.paraTodos ? '🌍 PARA TODOS' : '🎯 DIRECIONADO'}
                      </span>
                      <span style={{ color: theme.textSec }}>{m.dataEnvio?.toDate ? m.dataEnvio.toDate().toLocaleString() : 'Enviando...'}</span>
                    </div>
                    <p style={{ ...styles.msgPreviewMaster, color: theme.textMain }}>{m.texto?.substring(0, 70)}...</p>
                  </div>
                ))
              }
            </div>
            <button style={{ ...styles.modalVisBtn, background: isModoNoturno ? theme.bgApp : '#0f172a', color: theme.textMain, border: `1px solid ${theme.border}` }} onClick={() => { if (unsub) unsub(); setMsgVisualizar(null); }}>FECHAR</button>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA */}
      <div style={{ ...styles.mainCard, background: 'transparent' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '20px', color: theme.textMain }}>📢 Central de Comunicados</h3>
        <div style={styles.flexLayout}>
          <div style={{ flex: '1 1 300px' }}>
            <label style={{ ...styles.label, color: theme.textSec }}>1. SELECIONE O DESTINATÁRIO</label>
            <div style={{ ...styles.searchBox, background: theme.inputBg || theme.bgApp, border: `1px solid ${theme.border}` }}>
              <FiSearch color={theme.textSec} /> 
              <input placeholder="Buscar..." style={{ ...styles.inputSearch, color: theme.textMain }} value={buscaLojistaMsg} onChange={(e) => setBuscaLojistaMsg(e.target.value)} />
            </div>
            <div style={styles.userListScroll}>
              <button 
                onClick={() => setTargetLojista("todos")} 
                style={targetLojista === "todos" 
                  ? { ...styles.userItemActive, background: theme.primary, color: '#fff' } 
                  : { ...styles.userItem, background: isModoNoturno ? theme.bgApp : '#f8fafc', color: theme.textSec, border: `1px solid ${theme.border}` }}
              >
                🌍 Todos os Lojistas
              </button>
              {lojistasFiltrados.map(l => (
                <button 
                  key={l.id} 
                  onClick={() => setTargetLojista(l.id)} 
                  style={targetLojista === l.id 
                    ? { ...styles.userItemActive, background: theme.primary, color: '#fff' } 
                    : { ...styles.userItem, background: isModoNoturno ? theme.bgApp : '#f8fafc', color: theme.textSec, border: `1px solid ${theme.border}` }}
                >
                  <div style={styles.userItemContent}>
                    <span style={{ color: targetLojista === l.id ? '#fff' : theme.textMain }}>🏪 {l.dadosLoja?.dsNomeLoja || "Loja Sem Nome"}</span>
                    <span onClick={(e) => {
                      e.stopPropagation();
                      abrirHistorico(l);
                    }}
                      style={{ ...styles.eyeIcon, color: targetLojista === l.id ? '#fff' : theme.textSec }}
                    >
                      <FiEye />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: '2 1 400px' }}>
            <label style={{ ...styles.label, color: theme.textSec }}>2. MENSAGEM</label>
            <textarea 
              style={{ ...styles.textarea, background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `2px solid ${theme.border}` }} 
              value={msgTexto} 
              onChange={(e) => setMsgTexto(e.target.value)} 
              placeholder="Escreva o aviso para o lojista..." 
            />
            <button onClick={enviarMensagem} style={{ ...styles.btnSend, background: theme.primary }}><FiSend /> Enviar Comunicado</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  tabWrapper: { padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  mainCard: {},
  flexLayout: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  label: { fontSize: "10px", fontWeight: "800", display: 'block', marginBottom: '5px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', marginBottom: '10px' },
  inputSearch: { background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: '14px' },
  userListScroll: { height: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' },
  userItem: { padding: '10px', textAlign: 'left', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  userItemActive: { padding: '10px', textAlign: 'left', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
  userItemContent: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  eyeIcon: { cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', gap: '5px' },
  textarea: { width: '100%', height: '200px', borderRadius: '15px', padding: '15px', outline: 'none', resize: 'none', fontSize: '14px' },
  btnSend: { width: '100%', padding: '15px', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '800', marginTop: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  overlayMaster: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalVisualizar: { padding: '30px', borderRadius: '24px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' },
  modalVisHeader: { fontSize: '14px', fontWeight: '900', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' },
  historicoScroll: { maxHeight: '400px', overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  cardHistorico: { padding: '15px', borderRadius: '12px', cursor: 'pointer' },
  modalVisSub: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '800', marginBottom: '8px' },
  msgPreviewMaster: { fontSize: '13px', lineHeight: '1.4', margin: '5px 0' },
  modalVisBtn: { width: '100%', padding: '15px', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  noMsg: { textAlign: 'center', padding: '20px' }
};