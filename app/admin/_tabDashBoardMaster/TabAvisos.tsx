"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { FiMessageSquare, FiSearch, FiSend, FiCheck, FiEye, FiClock, FiArrowLeft } from "react-icons/fi";

interface TabAvisosProps {
  lojistas: any[];
  mostrarAviso: (msg: string, tipo?: string) => void;
}

export default function TabAvisos({ lojistas, mostrarAviso }: TabAvisosProps) {
  const [msgTexto, setMsgTexto] = useState("");
  const [targetLojista, setTargetLojista] = useState("todos");
  const [buscaLojistaMsg, setBuscaLojistaMsg] = useState("");
  const [filtroPlanoMsg, setFiltroPlanoMsg] = useState("Todos");

  const [msgVisualizar, setMsgVisualizar] = useState<any>(null);
  const [msgDetalhe, setMsgDetalhe] = useState<any>(null);
  const [unsub, setUnsub] = useState<any>(null);

  // Limpeza de listener ao desmontar
  useEffect(() => () => { if (unsub) unsub(); }, [unsub]);

  // Substitua o seu filter atual por este:
  const lojistasFiltrados = lojistas.filter(l => {
    const nomeLoja = l.dadosLoja?.dsNomeLoja?.toLowerCase() || "";
    const planoLoja = l.dadosLoja?.dsPlanoLoja || "Sem Plano"; // Ajustado para o campo da imagem

    const bateBusca = nomeLoja.includes(buscaLojistaMsg.toLowerCase());
    const batePlano = filtroPlanoMsg === "Todos" || planoLoja === filtroPlanoMsg;

    return bateBusca && batePlano;
  });

  async function enviarMensagem() {
    if (!msgTexto) return;

    const comunicado = {
      titulo: "Comunicado do Master",
      texto: msgTexto,
      dataEnvio: serverTimestamp(),
      lida: false,
      prioridade: "alta",
      categoria: "sistema",
      data: Date.now() // Adicionado para o campo que o useEffect do Lojista espera
    };

    try {
      if (targetLojista === "todos") {
        // Cria uma promessa para cada envio
        const promessas = lojistas.map(l => {
          // 1. Salva no histórico (subcoleção)
          const msgRef = addDoc(collection(db, "lojistas", l.id, "mensagens"), comunicado);
          // 2. Atualiza a raiz para disparar o Modal do lojista
          const raizRef = updateDoc(doc(db, "lojistas", l.id), {
            mensagemMaster: comunicado
          });
          return Promise.all([msgRef, raizRef]);
        });
        await Promise.all(promessas);
        mostrarAviso("Comunicado enviado para todos!");
      } else {
        // ... (seu código atual para lojista individual já está correto)
        await addDoc(collection(db, "lojistas", targetLojista, "mensagens"), comunicado);
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
    const q = query(collection(db, "lojistas", l.id, "mensagens"), orderBy("dataEnvio", "desc"));
    const listener = onSnapshot(q, (snap) => {
      setMsgVisualizar({ loja: l.nomeLoja, historico: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });
    setUnsub(() => listener);
  };

  return (
    <div style={styles.tabWrapper}>
      {/* MODAL 1: HISTÓRICO */}
      {msgVisualizar && (
        <div style={styles.overlayMaster} onClick={() => { if (unsub) unsub(); setMsgVisualizar(null); }}>
          <div style={styles.modalVisualizar} onClick={e => e.stopPropagation()}>
            <div style={styles.modalVisHeader}><FiMessageSquare /> HISTÓRICO: {msgVisualizar.loja}</div>
            <div style={styles.historicoScroll}>
              {msgVisualizar.historico?.length === 0 ? <p style={styles.noMsg}>Nenhuma mensagem.</p> :
                msgVisualizar.historico.map((m: any) => (
                  <div key={m.id} style={styles.cardHistorico} onClick={() => setMsgDetalhe(m)}>
                    <div style={styles.modalVisSub}>
                      <span style={{ color: m.lida ? '#10b981' : '#f59e0b' }}>{m.lida ? 'LIDA' : 'PENDENTE'}</span>
                      <span>{m.dataEnvio?.toDate().toLocaleString()}</span>
                    </div>
                    <p style={styles.msgPreviewMaster}>{m.texto.substring(0, 70)}...</p>
                  </div>
                ))
              }
            </div>
            <button style={styles.modalVisBtn} onClick={() => { if (unsub) unsub(); setMsgVisualizar(null); }}>FECHAR</button>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA */}
      <div style={styles.mainCard}>
        <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>📢 Central de Comunicados</h3>
        <div style={styles.flexLayout}>
          <div style={{ flex: '1 1 300px' }}>
            <label style={styles.label}>1. SELECIONE O DESTINATÁRIO</label>
            <div style={styles.searchBox}><FiSearch /> <input placeholder="Buscar..." style={styles.inputSearch} value={buscaLojistaMsg} onChange={(e) => setBuscaLojistaMsg(e.target.value)} /></div>
            <div style={styles.userListScroll}>
              <button onClick={() => setTargetLojista("todos")} style={targetLojista === "todos" ? styles.userItemActive : styles.userItem}>🌍 Todos os Lojistas</button>
              {lojistasFiltrados.map(l => (
                <button key={l.id} onClick={() => setTargetLojista(l.id)} style={targetLojista === l.id ? styles.userItemActive : styles.userItem}>
                  <div style={styles.userItemContent}>

                    {/* ALTERAÇÃO AQUI: Acessando dadosLoja.dsNomeLoja conforme sua imagem */}
                    <span>🏪 {l.dadosLoja?.dsNomeLoja || "Loja Sem Nome"}</span>

                    <span onClick={(e) => {
                      e.stopPropagation();
                      abrirHistorico(l);
                    }}
                      style={styles.eyeIcon}
                    >
                      <FiEye />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: '2 1 400px' }}>
            <label style={styles.label}>2. MENSAGEM</label>
            <textarea style={styles.textarea} value={msgTexto} onChange={(e) => setMsgTexto(e.target.value)} placeholder="Escreva o aviso para o lojista..." />
            <button onClick={enviarMensagem} style={styles.btnSend}><FiSend /> Enviar Comunicado</button>
          </div>
        </div>
      </div>
    </div>
  );
}


const styles: any = {
  tabWrapper: { background: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  mainCard: { background: '#fff' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  flexLayout: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  label: { fontSize: "10px", color: "#94a3b8", fontWeight: "800", display: 'block', marginBottom: '5px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', padding: '12px', borderRadius: '12px', marginBottom: '10px' },
  inputSearch: { background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: '14px' },
  userListScroll: { height: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' },
  userItem: { padding: '10px', textAlign: 'left', border: 'none', background: '#f8fafc', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#475569' },
  userItemActive: { padding: '10px', textAlign: 'left', border: 'none', background: '#3b82f6', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
  userItemContent: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  eyeIcon: { cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', gap: '5px' },
  textarea: { width: '100%', height: '200px', borderRadius: '15px', border: '2px solid #f1f5f9', padding: '15px', outline: 'none', resize: 'none', fontSize: '14px' },
  btnSend: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '800', marginTop: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  miniTab: { padding: '5px 12px', border: 'none', background: '#f1f5f9', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#64748b', fontWeight: '700' },
  miniTabActive: { padding: '5px 12px', border: 'none', background: '#0f172a', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#fff', fontWeight: '700' },
  overlayMaster: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalVisualizar: { background: '#fff', padding: '30px', borderRadius: '24px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' },
  modalVisHeader: { fontSize: '14px', fontWeight: '900', color: '#3b82f6', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' },
  historicoScroll: { maxHeight: '400px', overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  cardHistorico: { background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' },
  modalVisSub: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', fontWeight: '800', marginBottom: '8px' },
  modalVisText: { fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
  modalVisBtn: { width: '100%', padding: '15px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  msgPreviewMaster: { fontSize: '13px', color: '#475569', lineHeight: '1.4', margin: '5px 0' },
  clickToOpen: { fontSize: '9px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase' },
  noMsg: { textAlign: 'center', color: '#94a3b8', padding: '20px' }
};