"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, getDocs, limit, startAfter, startAt, endAt, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { FiMessageSquare, FiSearch, FiSend, FiEye, FiClock, FiGlobe, FiUser, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

interface TabAvisosProps {
  mostrarAviso: (msg: string, tipo?: string) => void;
}

export default function TabAvisos({ mostrarAviso }: TabAvisosProps) {
  const { theme, isModoNoturno } = useTheme();

  const [abaAtiva, setAbaAtiva] = useState<"enviar" | "historico-geral">("enviar");
  const [msgTexto, setMsgTexto] = useState("");
  const [targetLojista, setTargetLojista] = useState("todos");
  const [buscaLojistaMsg, setBuscaLojistaMsg] = useState("");
  
  // Estados para paginação real de lojistas no Firestore
  const [lojistasPaginados, setLojistasPaginados] = useState<any[]>([]);
  const [totalLojistasCount, setTotalLojistasCount] = useState(0);
  const [ultimoDocLojista, setUltimoDocLojista] = useState<any>(null);
  const [paginaAtualLojista, setPaginaAtualLojista] = useState(1);
  const [carregandoLojistas, setCarregandoLojistas] = useState(false);
  const ITENS_POR_PAGINA_LOJISTAS = 10;

  // Estados para paginação real do Histórico Geral no Firestore
  const [historicoGeral, setHistoricoGeral] = useState<any[]>([]);
  const [ultimoDocHistorico, setUltimoDocHistorico] = useState<any>(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [hasMoreHistorico, setHasMoreHistorico] = useState(true);
  const ITENS_POR_PAGINA_HISTORICO = 10;

  const [msgVisualizar, setMsgVisualizar] = useState<any>(null);
  const [unsub, setUnsub] = useState<any>(null);

  // 1. Carregamentos iniciais ao montar o componente
  useEffect(() => {
    carregarLojistasIniciais();
    carregarHistoricoInicial();
  }, []);

  useEffect(() => () => { if (unsub) unsub(); }, [unsub]);

  // Função para buscar a primeira página de lojistas direto do banco
  const carregarLojistasIniciais = async () => {
    setCarregandoLojistas(true);
    try {
      const ref = collection(db, "lojistas");
      const snapTotal = await getDocs(ref);
      setTotalLojistasCount(snapTotal.size);

      const q = query(ref, orderBy("dadosLoja.dsNomeLoja"), limit(ITENS_POR_PAGINA_LOJISTAS));
      const snap = await getDocs(q);
      
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLojistasPaginados(lista);
      setUltimoDocLojista(snap.docs[snap.docs.length - 1]);
      setPaginaAtualLojista(1);
    } catch (e) {
      console.error("Erro ao carregar lojistas:", e);
    } finally {
      setCarregandoLojistas(false);
    }
  };

  // Avançar página de lojistas
  const proximaPaginaLojista = async () => {
    if (!ultimoDocLojista || carregandoLojistas) return;
    setCarregandoLojistas(true);
    try {
      const ref = collection(db, "lojistas");
      const q = query(ref, orderBy("dadosLoja.dsNomeLoja"), startAfter(ultimoDocLojista), limit(ITENS_POR_PAGINA_LOJISTAS));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLojistasPaginados(lista);
        setUltimoDocLojista(snap.docs[snap.docs.length - 1]);
        setPaginaAtualLojista(p => p + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregandoLojistas(false);
    }
  };

  // Voltar página de lojistas
  const paginaAnteriorLojista = async () => {
    if (paginaAtualLojista <= 1 || carregandoLojistas) return;
    setCarregandoLojistas(true);
    try {
      await carregarLojistasIniciais();
    } catch (e) {
      console.error(e);
    } finally {
      setCarregandoLojistas(false);
    }
  };

  // Buscar lojista por nome digitado
  const buscarLojistaPorNome = async (termo: string) => {
    setBuscaLojistaMsg(termo);
    if (!termo.trim()) {
      carregarLojistasIniciais();
      return;
    }

    setCarregandoLojistas(true);
    try {
      const ref = collection(db, "lojistas");
      const q = query(
        ref, 
        orderBy("dadosLoja.dsNomeLoja"), 
        startAt(termo), 
        endAt(termo + '\uf8ff'),
        limit(ITENS_POR_PAGINA_LOJISTAS)
      );
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLojistasPaginados(lista);
    } catch (e) {
      console.error("Erro na busca:", e);
    } finally {
      setCarregandoLojistas(false);
    }
  };

  // 2. Carregar Histórico Geral Inicial paginado
  const carregarHistoricoInicial = async () => {
    setCarregandoHistorico(true);
    try {
      const q = query(
        collection(db, "configuracoes", "sistema", "historicoMensagens"), 
        orderBy("dataEnvio", "desc"), 
        limit(ITENS_POR_PAGINA_HISTORICO)
      );
      const snap = await getDocs(q);
      setHistoricoGeral(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUltimoDocHistorico(snap.docs[snap.docs.length - 1]);
      setHasMoreHistorico(snap.docs.length === ITENS_POR_PAGINA_HISTORICO);
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  // Carregar mais itens do Histórico Geral (Paginação por cursor)
  const carregarMaisHistorico = async () => {
    if (!ultimoDocHistorico || carregandoHistorico) return;
    setCarregandoHistorico(true);
    try {
      const q = query(
        collection(db, "configuracoes", "sistema", "historicoMensagens"), 
        orderBy("dataEnvio", "desc"),
        startAfter(ultimoDocHistorico),
        limit(ITENS_POR_PAGINA_HISTORICO)
      );
      const snap = await getDocs(q);
      const novasMensagens = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setHistoricoGeral(prev => [...prev, ...novasMensagens]);
      setUltimoDocHistorico(snap.docs[snap.docs.length - 1]);
      setHasMoreHistorico(snap.docs.length === ITENS_POR_PAGINA_HISTORICO);
    } catch (e) {
      console.error("Erro ao carregar mais histórico:", e);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  async function enviarMensagem() {
    if (!msgTexto.trim()) {
      mostrarAviso("Digite uma mensagem antes de enviar.", "erro");
      return;
    }

    const paraTodos = targetLojista === "todos";
    const lojaSelecionada = !paraTodos ? lojistasPaginados.find(l => l.id === targetLojista) : null;

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
      nomeLoja: paraTodos ? "Todos os Lojistas" : (lojaSelecionada?.dadosLoja?.dsNomeLoja || "Loja Selecionada")
    };

    try {
      await addDoc(collection(db, "configuracoes", "sistema", "historicoMensagens"), comunicado);

      if (paraTodos) {
        const refLojistas = await getDocs(collection(db, "lojistas"));
        const promessas = refLojistas.docs.map(l => 
          updateDoc(doc(db, "lojistas", l.id), { mensagemMaster: comunicado })
        );
        await Promise.all(promessas);
        mostrarAviso("Comunicado enviado para todos com sucesso!");
      } else {
        await updateDoc(doc(db, "lojistas", targetLojista), {
          mensagemMaster: comunicado
        });
        mostrarAviso("Comunicado direcionado enviado!");
      }

      setMsgTexto("");
      setTargetLojista("todos");
      carregarHistoricoInicial(); // Atualiza a lista após o envio
    } catch (e) {
      console.error(e);
      mostrarAviso("Erro ao enviar.", "erro");
    }
  }
  
  const abrirHistoricoLoja = async (l: any) => {
    if (unsub) unsub();
    const q = query(collection(db, "configuracoes", "sistema", "historicoMensagens"), orderBy("dataEnvio", "desc"));
    const snap = await getDocs(q);
    const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const mensagensDaLoja = todas.filter((m: any) => m.paraTodos === true || m.lojaId === l.id);
    setMsgVisualizar({ loja: l.dadosLoja?.dsNomeLoja || "Loja", historico: mensagensDaLoja });
  };

  return (
    <div style={{ ...styles.tabWrapper, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
      
      {/* ABAS INTERNAS */}
      <div style={styles.subTabsHeader}>
        <button 
          onClick={() => setAbaAtiva("enviar")}
          style={abaAtiva === "enviar" ? { ...styles.subTabBtnActive, background: theme.primary, color: '#fff' } : { ...styles.subTabBtn, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec }}
        >
          <FiSend size={14} /> Enviar Comunicado
        </button>
        <button 
          onClick={() => setAbaAtiva("historico-geral")}
          style={abaAtiva === "historico-geral" ? { ...styles.subTabBtnActive, background: theme.primary, color: '#fff' } : { ...styles.subTabBtn, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec }}
        >
          <FiClock size={14} /> Histórico Geral
        </button>
      </div>

      {/* MODAL HISTÓRICO DA LOJA */}
      {msgVisualizar && (
        <div style={styles.overlayMaster} onClick={() => setMsgVisualizar(null)}>
          <div style={{ ...styles.modalVisualizar, background: theme.bgCard, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ ...styles.modalVisHeader, color: theme.primary }}>
              <FiMessageSquare /> HISTÓRICO DA LOJA: {msgVisualizar.loja}
            </div>
            <div style={styles.historicoScroll}>
              {msgVisualizar.historico?.length === 0 ? <p style={{ ...styles.noMsg, color: theme.textSec }}>Nenhuma mensagem.</p> :
                msgVisualizar.historico.map((m: any) => (
                  <div key={m.id} style={{ ...styles.cardHistorico, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
                    <div style={{ ...styles.modalVisSub, color: theme.textSec }}>
                      <span style={{ color: m.paraTodos ? '#3b82f6' : '#8b5cf6', fontWeight: 'bold' }}>
                        {m.paraTodos ? '🌍 PARA TODOS' : '🎯 DIRECIONADO'}
                      </span>
                      <span>{m.dataEnvio?.toDate ? m.dataEnvio.toDate().toLocaleString() : 'Enviando...'}</span>
                    </div>
                    <p style={{ ...styles.msgPreviewMaster, color: theme.textMain }}>{m.texto}</p>
                  </div>
                ))
              }
            </div>
            <button style={{ ...styles.modalVisBtn, background: isModoNoturno ? theme.bgApp : '#0f172a', color: theme.textMain, border: `1px solid ${theme.border}` }} onClick={() => setMsgVisualizar(null)}>FECHAR</button>
          </div>
        </div>
      )}

      {/* ABA ENVIAR */}
      {abaAtiva === "enviar" && (
        <div style={styles.mainCard}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', color: theme.textMain }}>📢 Central de Comunicados</h3>
          <div style={styles.flexLayout}>
            
            <div style={{ flex: '1 1 340px' }}>
              <label style={{ ...styles.label, color: theme.textSec }}>
                1. SELECIONE O DESTINATÁRIO (Total Cadastrado: {totalLojistasCount} Lojas)
              </label>
              
              <div style={{ ...styles.searchBox, background: theme.inputBg || theme.bgApp, border: `1px solid ${theme.border}` }}>
                <FiSearch color={theme.textSec} /> 
                <input 
                  placeholder="Pesquisar loja por nome..." 
                  style={{ ...styles.inputSearch, color: theme.textMain }} 
                  value={buscaLojistaMsg} 
                  onChange={(e) => buscarLojistaPorNome(e.target.value)} 
                />
              </div>

              <div style={styles.userListScroll}>
                <button 
                  onClick={() => setTargetLojista("todos")} 
                  style={targetLojista === "todos" 
                    ? { ...styles.userItemActive, background: theme.primary, color: '#fff' } 
                    : { ...styles.userItem, background: isModoNoturno ? theme.bgApp : '#f8fafc', color: theme.textSec, border: `1px solid ${theme.border}` }}
                >
                  🌍 Todos os Lojistas ({totalLojistasCount})
                </button>

                {carregandoLojistas ? (
                  <p style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: theme.textSec }}>Carregando lojistas...</p>
                ) : lojistasPaginados.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: theme.textSec }}>Nenhuma loja encontrada.</p>
                ) : (
                  lojistasPaginados.map(l => (
                    <button 
                      key={l.id} 
                      onClick={() => setTargetLojista(l.id)} 
                      style={targetLojista === l.id 
                        ? { ...styles.userItemActive, background: theme.primary, color: '#fff' } 
                        : { ...styles.userItem, background: isModoNoturno ? theme.bgApp : '#f8fafc', color: theme.textSec, border: `1px solid ${theme.border}` }}
                    >
                      <div style={styles.userItemContent}>
                        <span style={{ color: targetLojista === l.id ? '#fff' : theme.textMain }}>🏪 {l.dadosLoja?.dsNomeLoja || "Loja Sem Nome"}</span>
                        <span onClick={(e) => { e.stopPropagation(); abrirHistoricoLoja(l); }} style={{ ...styles.eyeIcon, color: targetLojista === l.id ? '#fff' : theme.textSec }} title="Ver histórico desta loja">
                          <FiEye />
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* PAGINAÇÃO DIRETA NO FIREBASE PARA LOJISTAS */}
              <div style={styles.paginacaoContainer}>
                <button 
                  disabled={paginaAtualLojista === 1 || carregandoLojistas} 
                  onClick={paginaAnteriorLojista}
                  style={{ ...styles.paginacaoBtn, opacity: paginaAtualLojista === 1 ? 0.4 : 1, background: isModoNoturno ? theme.bgApp : '#e2e8f0', color: theme.textMain }}
                >
                  <FiChevronLeft size={14} /> Anterior
                </button>
                <span style={{ fontSize: '12px', color: theme.textSec, fontWeight: 'bold' }}>
                  Página {paginaAtualLojista}
                </span>
                <button 
                  disabled={lojistasPaginados.length < ITENS_POR_PAGINA_LOJISTAS || carregandoLojistas} 
                  onClick={proximaPaginaLojista}
                  style={{ ...styles.paginacaoBtn, opacity: lojistasPaginados.length < ITENS_POR_PAGINA_LOJISTAS ? 0.4 : 1, background: isModoNoturno ? theme.bgApp : '#e2e8f0', color: theme.textMain }}
                >
                  Próxima <FiChevronRight size={14} />
                </button>
              </div>
            </div>

            <div style={{ flex: '2 1 400px' }}>
              <label style={{ ...styles.label, color: theme.textSec }}>
                2. MENSAGEM (Destino: <strong style={{ color: theme.primary }}>{targetLojista === "todos" ? "Todos os Lojistas" : lojistasPaginados.find(l => l.id === targetLojista)?.dadosLoja?.dsNomeLoja || "Loja Selecionada"}</strong>)
              </label>
              <textarea 
                style={{ ...styles.textarea, background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `2px solid ${theme.border}` }} 
                value={msgTexto} 
                onChange={(e) => setMsgTexto(e.target.value)} 
                placeholder="Escreva o comunicado oficial para o painel do lojista..." 
              />
              <button onClick={enviarMensagem} style={{ ...styles.btnSend, background: theme.primary }}><FiSend /> Enviar Comunicado</button>
            </div>
          </div>
        </div>
      )}

      {/* ABA HISTÓRICO GERAL (COM PAGINAÇÃO ESCALÁVEL) */}
      {abaAtiva === "historico-geral" && (
        <div style={styles.mainCard}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: theme.textMain }}>📜 Histórico Geral de Comunicados Master</h3>
          <p style={{ fontSize: '13px', color: theme.textSec, marginBottom: '20px' }}>
            Lista otimizada com os comunicados mais recentes enviados pelo painel Master.
          </p>

          <div style={styles.historicoGeralScroll}>
            {historicoGeral.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '30px', color: theme.textSec }}>Nenhum comunicado enviado até o momento.</p>
            ) : (
              <>
                {historicoGeral.map((msg) => (
                  <div key={msg.id} style={{ ...styles.cardHistoricoGeral, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
                    <div style={styles.cardHeaderGeral}>
                      <span style={{ 
                        ...styles.badgeDestino, 
                        background: msg.paraTodos ? '#dbeafe' : '#f3e8ff', 
                        color: msg.paraTodos ? '#1d4ed8' : '#7e22ce' 
                      }}>
                        {msg.paraTodos ? <><FiGlobe size={12}/> Enviado para: Todos os Lojistas</> : <><FiUser size={12}/> Destinado a: {msg.nomeLoja}</>}
                      </span>
                      <span style={{ fontSize: '11px', color: theme.textSec, fontWeight: '600' }}>
                        {msg.dataEnvio?.toDate ? msg.dataEnvio.toDate().toLocaleString() : 'Processando...'}
                      </span>
                    </div>
                    <p style={{ ...styles.textoMensagemGeral, color: theme.textMain }}>{msg.texto}</p>
                  </div>
                ))}

                {hasMoreHistorico && (
                  <button 
                    onClick={carregarMaisHistorico} 
                    disabled={carregandoHistorico}
                    style={{ ...styles.btnCarregarMais, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textMain, border: `1px solid ${theme.border}` }}
                  >
                    {carregandoHistorico ? "Carregando mensagens antigas..." : "Carregar mensagens mais antigas"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

const styles: any = {
  tabWrapper: { padding: '25px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  subTabsHeader: { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '15px' },
  subTabBtn: { padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' },
  subTabBtnActive: { padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' },
  mainCard: {},
  flexLayout: { display: 'flex', gap: '25px', flexWrap: 'wrap' },
  label: { fontSize: "11px", fontWeight: "800", display: 'block', marginBottom: '8px', textTransform: 'uppercase' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', marginBottom: '10px' },
  inputSearch: { background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: '13px' },
  userListScroll: { minHeight: '220px', maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '4px' },
  userItem: { padding: '10px 12px', textAlign: 'left', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  userItemActive: { padding: '10px 12px', textAlign: 'left', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
  userItemContent: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  eyeIcon: { cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', gap: '5px' },
  paginacaoContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '0 4px' },
  paginacaoBtn: { padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  textarea: { width: '100%', height: '180px', borderRadius: '15px', padding: '15px', outline: 'none', resize: 'none', fontSize: '14px' },
  btnSend: { width: '100%', padding: '14px', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: '800', marginTop: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  overlayMaster: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalVisualizar: { padding: '30px', borderRadius: '24px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' },
  modalVisHeader: { fontSize: '14px', fontWeight: '900', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' },
  historicoScroll: { maxHeight: '400px', overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  cardHistorico: { padding: '15px', borderRadius: '12px' },
  modalVisSub: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '800', marginBottom: '8px' },
  msgPreviewMaster: { fontSize: '13px', lineHeight: '1.4', margin: '5px 0' },
  modalVisBtn: { width: '100%', padding: '15px', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  noMsg: { textAlign: 'center', padding: '20px' },
  historicoGeralScroll: { maxHeight: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '6px' },
  cardHistoricoGeral: { padding: '16px', borderRadius: '14px' },
  cardHeaderGeral: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' },
  badgeDestino: { fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' },
  textoMensagemGeral: { fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' },
  btnCarregarMais: { width: '100%', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', marginTop: '10px' }
};