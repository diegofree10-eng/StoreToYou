// app/admin/configuracoes/_tabs/AssinaturaTab.tsx
"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, addDoc, updateDoc, deleteDoc, Timestamp, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import {
  FiSearch, FiUser, FiPauseCircle, FiPlayCircle,
  FiRefreshCw, FiTrash2, FiClock, FiX, FiStar, FiCalendar, FiAlertCircle
} from "react-icons/fi";
import { buscarLojistas } from "@/hooks/useLojistas";
import ModalPerfilLojista from "@/app/admin/_components/ModalPerfilLojista";
import { useTheme } from "@/context/ThemeContext";

interface TabAssinaturasProps {
  lojistas: any[];
  planos: any;
  mostrarAviso: (texto: string, tipo?: 'sucesso' | 'erro') => void;
}

export default function TabAssinaturas({ planos, mostrarAviso }: TabAssinaturasProps) {
  const { theme, isModoNoturno } = useTheme();

  const [lojistas, setLojistas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [lojaSelecionada, setLojaSelecionada] = useState<any>(null);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");
  const [acaoTipo, setAcaoTipo] = useState<"limpar" | "excluir" | null>(null);
  
  // 🚀 Novo filtro "comprovantes" adicionado
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "vencidos" | "vencer" | "comprovantes">("todos");
  const [lojaParaPerfil, setLojaParaPerfil] = useState<string | null>(null);

  // LOGICA DE REVERSÃO AUTOMÁTICA
  const verificarEReverterPlano = async (loja: any) => {
    const sistema = loja.sistema || {};
    if (sistema.dsPlanoTeste === "Ouro" && sistema.tsVencimentoTeste) {
      const fimOuro = sistema.tsVencimentoTeste.seconds * 1000;
      if (Date.now() > fimOuro) {
        try {
          await updateDoc(doc(db, "lojistas", loja.id), {
            "sistema.dsPlanoTeste": "",
            "sistema.tsVencimentoTeste": null,
            "sistema.isTesteOuroAtivo": false,
            "dadosLoja.tsVencimentoOuro": null
          });
          return true;
        } catch (error) {
          console.error("Erro ao reverter plano:", error);
          return false;
        }
      }
    }
    return false;
  };

  // CARREGAR DADOS COM VERIFICAÇÃO DE VENCIMENTO E COMPROVANTES PENDENTES
  const carregarDados = async (termo = "", reset = false) => {
    setLoading(true);

    const { docs, lastVisible } = await buscarLojistas(reset ? null : lastDoc, termo);

    const docsProcessados = await Promise.all(docs.map(async (loja: any) => {
      const houveMudanca = await verificarEReverterPlano(loja);

      // 🔍 Verifica se a loja possui comprovantes em análise na subcoleção financeira
     // 🔍 Verifica se a loja possui comprovantes em análise na subcoleção financeira
      let temComprovantePendente = false;
      try {
        const compRef = collection(db, "lojistas", loja.id, "assinaturas", "financeiro", "historicoComprovantes");
        const compSnap = await getDocs(compRef);
        temComprovantePendente = compSnap.docs.some(d => {
          const dataDoc = d.data();
          const st = (dataDoc.dsStatusPagamentoLojista || "").toLowerCase();
          const isAnalise = st.includes("análise") || st.includes("analise");
          
          // 🚀 REGRA NOVA: Só conta se estiver em análise E POSSUIR URL DE COMPROVANTE OU NÃO FOR UM UPGRADE PURO
          const temUrlComprovante = Boolean(dataDoc.dsUrlComprovante && dataDoc.dsUrlComprovante.trim() !== "");
          const naoEhUpgradePuro = dataDoc.tipoRegistro !== "upgrade" && !d.id.startsWith("UPG-");

          return isAnalise && (temUrlComprovante || naoEhUpgradePuro);
        });
      } catch (err) {
        console.warn("Erro ao checar comprovantes da loja:", loja.id);
      }

      const lojaAtualizada = {
        ...loja,
        temComprovantePendente,
        sistema: houveMudanca
          ? { ...loja.sistema, isTesteOuroAtivo: false, dsPlanoTeste: "" }
          : loja.sistema
      };

      return lojaAtualizada;
    }));

    setLojistas(reset ? docsProcessados : [...lojistas, ...docsProcessados]);
    setLastDoc(lastVisible);
    setLoading(false);
  };

  useEffect(() => {
    carregarDados("", true);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      carregarDados(busca, true);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [busca]);

  const obterStatusVencimento = (dataVencimento: string) => {
    if (!dataVencimento) return { texto: "Sem data", cor: "#94a3b8", alerta: false };
    const hoje = new Date();
    const venc = new Date(dataVencimento);
    const diffDays = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { texto: "VENCIDO", cor: "#ef4444", alerta: true };
    if (diffDays <= 5) return { texto: `Vence em ${diffDays}d`, cor: "#f59e0b", alerta: true };
    return { texto: `${diffDays} dias restantes`, cor: "#10b981", alerta: false };
  };

  async function alterarCicloECalcularVencimento(id: string, novoCiclo: "mensal" | "anual", planoNome: string) {
    const diasDeBanhos = planos[planoNome]?.diasTeste || 0;
    const data = new Date();
    if (novoCiclo === "mensal") data.setMonth(data.getMonth() + 1);
    else data.setFullYear(data.getFullYear() + 1);
    data.setDate(data.getDate() + diasDeBanhos);

    try {
      await updateDoc(doc(db, "lojistas", id), {
        "dadosLoja.ciclo": novoCiclo,
        "dadosLoja.tsVencimentoLoja": Timestamp.fromDate(data),
        "dadosLoja.isTeste": false
      });
      carregarDados(busca, true);
      mostrarAviso(`Ciclo alterado para ${novoCiclo}!`, "sucesso");
    } catch (e) { mostrarAviso("Erro ao atualizar ciclo.", "erro"); }
  }

  async function toggleTesteOuro(loja: any) {
    const estaAtivo = loja.sistema?.isTesteOuroAtivo;
    const lojaRef = doc(db, "lojistas", loja.id);
    const historicoRef = collection(db, "lojistas", loja.id, "assinaturas", "registro_inicial", "historico_testesOuro");

    try {
      if (estaAtivo) {
        await updateDoc(lojaRef, {
          "sistema.dsPlanoTeste": "",
          "sistema.tsVencimentoTeste": null,
          "sistema.isTesteOuroAtivo": false
        });
        mostrarAviso("Período de teste Ouro desativado.", "sucesso");
      } else {
        const configSnap = await getDoc(doc(db, "configuracoes", "sistema"));
        const dias = configSnap.exists() ? (configSnap.data()?.nrDiasTesteOuro || 15) : 15;

        const dataInicio = new Date();
        const dataFim = new Date();
        dataFim.setDate(dataFim.getDate() + dias);

        await updateDoc(lojaRef, {
          "sistema.dsPlanoTeste": "Ouro",
          "sistema.tsVencimentoTeste": Timestamp.fromDate(dataFim),
          "sistema.isTesteOuroAtivo": true
        });

        await addDoc(historicoRef, {
          dataAtivacao: Timestamp.fromDate(dataInicio),
          dataExpiracao: Timestamp.fromDate(dataFim),
          diasConcedidos: dias,
          status: "ativado"
        });

        mostrarAviso(`Teste Ouro ativado por ${dias} dias!`, "sucesso");
      }
      carregarDados("", true);
    } catch (error) {
      console.error("Erro:", error);
      mostrarAviso("Erro ao alterar status do teste.", "erro");
    }
  }

  async function renovarAssinatura(loja: any) {
    const dataAtual = new Date();
    const vencimentoAtualSecs = loja.dadosLoja?.tsVencimentoLoja?.seconds;
    const vencimentoAtual = vencimentoAtualSecs ? new Date(vencimentoAtualSecs * 1000) : null;

    if (vencimentoAtual && vencimentoAtual > dataAtual) {
      const diffDays = Math.ceil((vencimentoAtual.getTime() - dataAtual.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 25) {
        const confirmarDuplicidade = window.confirm(
          `⚠️ Atenção! A loja "${loja.dadosLoja?.dsNomeLoja}" já está com o acesso em dia (vence em ${vencimentoAtual.toLocaleDateString('pt-BR')}, daqui a ${diffDays} dias).\n\nDeseja realmente adicionar MAIS um mês por cima?`
        );
        if (!confirmarDuplicidade) return;
      }
    }

    let vencimentoBase = vencimentoAtual && vencimentoAtual > dataAtual ? vencimentoAtual : dataAtual;
    const ciclo = loja.dadosLoja?.ciclo || "mensal";

    if (ciclo === "anual") {
      vencimentoBase.setFullYear(vencimentoBase.getFullYear() + 1);
    } else {
      vencimentoBase.setMonth(vencimentoBase.getMonth() + 1);
    }

    try {
      const lojaRef = doc(db, "lojistas", loja.id);

      const idTransacaoUnico = `FAT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const nomePlano = loja.dadosLoja?.dsPlanoLoja || "Bronze";

      const planoKeyEncontrada = Object.keys(planos || {}).find(
        k => k.toLowerCase() === nomePlano.toLowerCase()
      );
      const planoInfoMaster = planoKeyEncontrada ? planos[planoKeyEncontrada] : {};
      
      const valorPlano = Number(
        planoInfoMaster?.preco ?? 
        planoInfoMaster?.vlPreco ?? 
        planoInfoMaster?.valor ?? 
        99.90
      );

      const mesCompetenciaStr = `Ciclo ${dataAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`.toLowerCase();
      const competenciaFormatada = mesCompetenciaStr.charAt(0).toUpperCase() + mesCompetenciaStr.slice(1);

      const novoLancamentoRef = doc(
        db,
        "lojistas",
        loja.id,
        "assinaturas",
        "financeiro",
        "historicoPagamentos",
        idTransacaoUnico
      );

      const dadosLancamento = {
        id: idTransacaoUnico,
        dsPlanoLojista: nomePlano,
        dsMesReferencia: competenciaFormatada,
        vlAssinaturaLojista: valorPlano,
        dsStatusPagamentoLojista: "Pago",
        tsAssinaturaLojista: Timestamp.now(),
        tsProximoVencimento: Timestamp.fromDate(vencimentoBase),
        createdAt: Timestamp.now()
      };

      await setDoc(novoLancamentoRef, dadosLancamento);

      await updateDoc(lojaRef, {
        "dadosLoja.tsVencimentoLoja": Timestamp.fromDate(vencimentoBase),
        "dadosLoja.dsStatusLoja": "ativo"
      });

      mostrarAviso(`Assinatura renovada e registrada com sucesso!`, "sucesso");
      carregarDados(busca, true);
    } catch (e) {
      console.error("Erro ao renovar:", e);
      mostrarAviso("Erro ao renovar assinatura.", "erro");
    }
  }

  async function executarAcaoSegura() {
    if (confirmacaoTexto !== lojaSelecionada?.dadosLoja?.dsNomeLoja) {
      mostrarAviso("Nome da loja incorreto!", "erro");
      return;
    }

    try {
      if (acaoTipo === "excluir") {
        await deleteDoc(doc(db, "lojistas", lojaSelecionada.id));
        mostrarAviso("Lojista excluído com sucesso!", "sucesso");
      } else if (acaoTipo === "limpar") {
        await updateDoc(doc(db, "lojistas", lojaSelecionada.id), {
          "dadosLoja.dsStatusLoja": "limpo",
          "sistema.dsPlanoTeste": ""
        });
        mostrarAviso("Dados do lojista limpos!", "sucesso");
      }
      setModalAberto(false);
      setConfirmacaoTexto("");
      carregarDados("", true);
    } catch (e) {
      mostrarAviso("Erro ao executar ação.", "erro");
    }
  }

  function abrirConfirmacao(loja: any, tipo: "limpar" | "excluir") {
    setLojaSelecionada(loja);
    setAcaoTipo(tipo);
    setConfirmacaoTexto("");
    setModalAberto(true);
  }

  const totalComprovantes = lojistas.filter(l => l.temComprovantePendente).length;

  const totalVencer = lojistas.filter(l => {
    const status = obterStatusVencimento(l.dadosLoja?.tsVencimentoLoja?.seconds ? new Date(l.dadosLoja.tsVencimentoLoja.seconds * 1000).toISOString() : "");
    return status.texto.includes("Vence em");
  }).length;

  const totalVencidos = lojistas.filter(l =>
    obterStatusVencimento(l.dadosLoja?.tsVencimentoLoja?.seconds ? new Date(l.dadosLoja.tsVencimentoLoja.seconds * 1000).toISOString() : "").texto === "VENCIDO"
  ).length;

  const lojistasExibidos = lojistas.filter(loja => {
    const status = obterStatusVencimento(loja.dadosLoja?.tsVencimentoLoja?.seconds ? new Date(loja.dadosLoja.tsVencimentoLoja.seconds * 1000).toISOString() : "");
    if (filtroStatus === "comprovantes") return loja.temComprovantePendente;
    if (filtroStatus === "vencidos") return status.texto === "VENCIDO";
    if (filtroStatus === "vencer") return status.texto.includes("Vence em");
    return true;
  });

  return (
    <div style={styles.container}>
      {modalAberto && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
            <div style={styles.modalHeader}>
              <h4 style={{ color: acaoTipo === 'excluir' ? '#ef4444' : '#3b82f6', margin: 0 }}>
                {acaoTipo === 'excluir' ? 'Confirmar Exclusão' : 'Confirmar Limpeza'}
              </h4>
              <button onClick={() => setModalAberto(false)} style={{ ...styles.btnClose, color: theme.textSec }}><FiX /></button>
            </div>
            <p style={{ ...styles.modalText, color: theme.textSec }}>
              Digite o nome da loja: <strong style={{ color: theme.textMain }}>"{lojaSelecionada?.dadosLoja?.dsNomeLoja}"</strong>
            </p>
            <input
              type="text"
              value={confirmacaoTexto}
              onChange={(e) => setConfirmacaoTexto(e.target.value)}
              style={{ ...styles.modalInput, background: theme.inputBg || theme.bgApp, color: theme.textMain, border: `2px solid ${theme.border}` }}
            />
            <button onClick={executarAcaoSegura} style={{ ...styles.btnConfirmar, backgroundColor: acaoTipo === 'excluir' ? '#ef4444' : '#3b82f6' }}>
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* 🔔 ALERTA GLOBAL NO TOPO DO MASTER */}
      {totalComprovantes > 0 && (
        <div 
          onClick={() => setFiltroStatus("comprovantes")}
          style={{ 
            background: isModoNoturno ? '#78350f' : '#fef3c7', 
            border: '1px solid #f59e0b', 
            color: isModoNoturno ? '#fcd34d' : '#92400e', 
            padding: '14px 20px', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiAlertCircle size={22} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', fontWeight: '700' }}>
              <span>Atenção: Existem </span>
              <strong style={{ fontSize: '14px', textDecoration: 'underline' }}>{totalComprovantes} lojista(s)</strong>
              <span> com comprovantes de Pix aguardando validação financeira hoje.</span>
            </div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: '900', background: '#f59e0b', color: '#fff', padding: '4px 10px', borderRadius: '6px' }}>
            Filtrar Agora →
          </span>
        </div>
      )}

      <div style={styles.headerFlex}>
        <div style={styles.headerText}>
          <h3 style={{ ...styles.title, color: theme.textMain }}>Gestão de Assinaturas</h3>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFiltroStatus("todos")}
              style={{
                ...styles.btnFilter,
                backgroundColor: filtroStatus === "todos" ? (isModoNoturno ? '#334155' : '#e2e8f0') : (isModoNoturno ? '#1e293b' : '#f1f5f9'),
                color: theme.textMain
              }}
            >
              Todos ({lojistas.length})
            </button>
            <button
              onClick={() => setFiltroStatus("comprovantes")}
              style={{
                ...styles.btnFilter,
                backgroundColor: filtroStatus === "comprovantes" ? '#fef3c7' : (isModoNoturno ? '#1e293b' : '#f1f5f9'),
                color: '#b45309',
                border: filtroStatus === "comprovantes" ? '1px solid #fcd34d' : 'none'
              }}
            >
              📁 Comprovantes ({totalComprovantes})
            </button>
            <button
              onClick={() => setFiltroStatus("vencer")}
              style={{
                ...styles.btnFilter,
                backgroundColor: filtroStatus === "vencer" ? '#fef3c7' : (isModoNoturno ? '#1e293b' : '#f1f5f9'),
                color: '#b45309',
                border: filtroStatus === "vencer" ? '1px solid #fcd34d' : 'none'
              }}
            >
              A vencer ({totalVencer})
            </button>
            <button
              onClick={() => setFiltroStatus("vencidos")}
              style={{
                ...styles.btnFilter,
                backgroundColor: filtroStatus === "vencidos" ? '#fee2e2' : (isModoNoturno ? '#1e293b' : '#f1f5f9'),
                color: '#ef4444',
                border: filtroStatus === "vencidos" ? '1px solid #fecdd3' : 'none'
              }}
            >
              Vencidos ({totalVencidos})
            </button>
          </div>
        </div>

        <div style={{ ...styles.searchWrapper, background: theme.inputBg || theme.bgApp, border: `2px solid ${theme.border}`, borderRadius: '12px' }}>
          <FiSearch style={{ ...styles.searchIcon, color: theme.textSec }} />
          <input
            type="text"
            placeholder="Nome da loja..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ ...styles.searchInput, background: 'transparent', color: theme.textMain }}
          />
        </div>
      </div>

      <div style={{ ...styles.tableContainer, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <table style={styles.table}>
          <thead>
            <tr style={{ background: isModoNoturno ? '#0f172a' : '#f8fafc', borderBottom: `1px solid ${theme.border}` }}>
              <th style={{ ...styles.th, color: theme.textSec }}>LOJA / CADASTRO</th>
              <th style={{ ...styles.th, color: theme.textSec }}>PLANO</th>
              <th style={{ ...styles.th, color: theme.textSec }}>CICLO</th>
              <th style={{ ...styles.th, color: theme.textSec }}>VENCIMENTO</th>
              <th style={{ ...styles.th, color: theme.textSec }}>ÚLTIMO LOGIN</th>
              <th style={{ ...styles.th, color: theme.textSec }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {lojistasExibidos.map((loja) => {
              const statusVenc = obterStatusVencimento(loja.dadosLoja?.tsVencimentoLoja?.seconds ? new Date(loja.dadosLoja.tsVencimentoLoja.seconds * 1000).toISOString() : "");
              return (
                <tr key={loja.id} style={{ ...styles.tr, borderBottom: `1px solid ${theme.border}`, borderLeft: statusVenc.alerta ? '4px solid #ef4444' : '4px solid transparent' }}>
                  <td style={styles.td}>
                    <div style={styles.lojaInfo}>
                      <div style={{ ...styles.avatarLoja, background: isModoNoturno ? '#334155' : '#f1f5f9', color: '#3b82f6' }}><FiUser /></div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong
                            style={{ ...styles.nomeLoja, cursor: 'pointer', color: '#3b82f6' }}
                            onClick={() => {
                              setLojaParaPerfil(loja.id);
                            }}
                          >
                            {loja.dadosLoja?.dsNomeLoja || "Sem nome"}

                            {loja.sistema?.dsStatusUpgrade === "pendente" && (
                              <span style={{
                                marginLeft: '8px',
                                background: '#ecfdf5', color: '#065f46', padding: '2px 6px',
                                borderRadius: '4px', fontSize: '8px', fontWeight: '900',
                                textTransform: 'uppercase', border: '1px solid #d1fae5'
                              }}>
                                UPGRADE PENDENTE
                              </span>
                            )}

                            {/* 📁 SELO DE COMPROVANTE ENVIADO */}
                            {loja.temComprovantePendente && (
                              <span style={{
                                marginLeft: '8px',
                                background: isModoNoturno ? '#78350f' : '#fef3c7', 
                                color: '#b45309', 
                                padding: '2px 6px',
                                borderRadius: '4px', 
                                fontSize: '8px', 
                                fontWeight: '900',
                                textTransform: 'uppercase', 
                                border: '1px solid #fcd34d'
                              }}>
                                📁 COMPROVANTE ENVIADO
                              </span>
                            )}
                          </strong>

                          {loja.sistema?.dsPlanoTeste === "Ouro" && (
                            <span style={{
                              background: '#fef3c7', color: '#b45309', padding: '2px 6px',
                              borderRadius: '4px', fontSize: '8px', fontWeight: '900',
                              textTransform: 'uppercase', border: '1px solid #fcd34d'
                            }}>
                              Ouro Teste
                            </span>
                          )}
                        </div>
                        <small style={{ ...styles.cpfLoja, color: theme.textSec }}>
                          Cadastrado: {loja.dadosLoja?.tsCriacaoLoja?.seconds ? new Date(loja.dadosLoja.tsCriacaoLoja.seconds * 1000).toLocaleDateString('pt-BR') : '---'}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <select
                      value={loja.dadosLoja?.dsPlanoLoja || "Bronze"}
                      onChange={async (e) => {
                        const novoPlano = e.target.value;

                        await updateDoc(doc(db, "lojistas", loja.id), {
                          "dadosLoja.dsPlanoLoja": novoPlano
                        });

                        setLojistas(prev => prev.map(l =>
                          l.id === loja.id
                            ? { ...l, dadosLoja: { ...l.dadosLoja, dsPlanoLoja: novoPlano } }
                            : l
                        ));

                        mostrarAviso(`Plano alterado para ${novoPlano}!`);
                      }}
                      style={{ ...styles.select, background: isModoNoturno ? theme.bgApp : '#ffffff', color: theme.textMain, border: `1px solid ${theme.border}` }}
                    >
                      {Object.keys(planos).map((planoKey) => (
                        <option key={planoKey} value={planoKey.charAt(0).toUpperCase() + planoKey.slice(1)}>
                          {planoKey.charAt(0).toUpperCase() + planoKey.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.td}>
                    <div style={{ ...styles.cicloToggle, background: isModoNoturno ? '#334155' : '#f1f5f9' }}>
                      <button onClick={() => alterarCicloECalcularVencimento(loja.id, "mensal", loja.dadosLoja?.dsPlanoLoja)} style={{ ...styles.btnToggle, ...(loja.dadosLoja?.ciclo === "mensal" ? styles.activeM : { color: theme.textSec }) }}>M</button>
                      <button onClick={() => alterarCicloECalcularVencimento(loja.id, "anual", loja.dadosLoja?.dsPlanoLoja)} style={{ ...styles.btnToggle, ...(loja.dadosLoja?.ciclo === "anual" ? styles.activeA : { color: theme.textSec }) }}>A</button>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ color: statusVenc.cor, fontWeight: '800', fontSize: '12px' }}>
                      {loja.dadosLoja?.tsVencimentoLoja?.seconds
                        ? new Date(loja.dadosLoja.tsVencimentoLoja.seconds * 1000).toLocaleDateString('pt-BR')
                        : '---'}
                    </div>

                    {loja.sistema?.dsPlanoTeste === "Ouro" && loja.sistema?.tsVencimentoTeste?.seconds && (
                      <div style={{
                        fontSize: '10px', color: '#d97706', marginTop: '4px',
                        fontWeight: 'bold', background: isModoNoturno ? '#334155' : '#fffbeb', padding: '2px 4px', borderRadius: '4px', width: 'fit-content'
                      }}>
                        Teste expira em: {Math.max(0, Math.ceil((loja.sistema.tsVencimentoTeste.seconds * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))} dias
                      </div>
                    )}
                  </td>

                  <td style={styles.td}>
                    <div style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold' }}>
                      <FiClock size={12} color={theme.textSec} /> {loja.ultimoLogin?.seconds ? new Date(loja.ultimoLogin.seconds * 1000).toLocaleDateString('pt-BR') : 'Sem acesso'}
                      {loja.ultimoLogin?.seconds && <div style={{ marginLeft: '16px', fontSize: '10px' }}>{new Date(loja.ultimoLogin.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>}
                    </div>
                  </td>

                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => renovarAssinatura(loja)}
                        style={{ ...styles.btnAction, color: '#059669' }}
                        title="Confirmar Pagamento / Renovar"
                      >
                        <FiCalendar size={18} />
                      </button>

                      <button
                        onClick={() => toggleTesteOuro(loja)}
                        style={styles.btnAction}
                        title={loja.sistema?.isTesteOuroAtivo ? "Desativar Ouro Teste" : "Ativar Ouro Teste"}
                      >
                        <FiStar
                          color={loja.sistema?.isTesteOuroAtivo ? "#f59e0b" : theme.textSec}
                          size={18}
                          fill={loja.sistema?.isTesteOuroAtivo ? "#f59e0b" : "none"}
                        />
                      </button>

                      <button
                        style={styles.btnAction}
                        title="Suspender/Ativar"
                        onClick={async () => {
                          const statusAtual = loja.dadosLoja?.dsStatusLoja || 'ativo';
                          const novoStatus = statusAtual === 'suspenso' ? 'ativo' : 'suspenso';

                          try {
                            await updateDoc(doc(db, "lojistas", loja.id), {
                              "dadosLoja.dsStatusLoja": novoStatus,
                            });

                            setLojistas((prev) =>
                              prev.map((l) =>
                                l.id === loja.id
                                  ? { ...l, dadosLoja: { ...l.dadosLoja, dsStatusLoja: novoStatus } }
                                  : l
                              )
                            );

                            mostrarAviso(`Loja ${novoStatus === 'suspenso' ? 'suspensa' : 'ativada'}!`);
                          } catch (error) {
                            console.error("Erro ao alterar status:", error);
                            mostrarAviso("Erro ao alterar status.", "erro");
                          }
                        }}
                      >
                        {(loja.dadosLoja?.dsStatusLoja || 'ativo') === 'suspenso' ? (
                          <FiPlayCircle color="#10b981" size={18} />
                        ) : (
                          <FiPauseCircle color="#f59e0b" size={18} />
                        )}
                      </button>

                      <button onClick={() => abrirConfirmacao(loja, "limpar")} style={styles.btnAction} title="Limpar">
                        <FiRefreshCw color="#3b82f6" size={16} />
                      </button>

                      <button onClick={() => abrirConfirmacao(loja, "excluir")} style={styles.btnAction} title="Excluir">
                        <FiTrash2 color="#ef4444" size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lastDoc && <button onClick={() => carregarDados(busca)} style={{ ...styles.btnCarregarMais, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textMain }}>Carregar mais</button>}
      </div>

      {lojaParaPerfil && (
        <ModalPerfilLojista
          lojaId={lojaParaPerfil}
          onClose={() => setLojaParaPerfil(null)}
        />
      )}
    </div>
  );
}

const styles: any = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  headerFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  title: { fontSize: '20px', fontWeight: '900', margin: 0 },
  btnFilter: { border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' },
  searchWrapper: { position: 'relative', width: '250px', display: 'flex', alignItems: 'center', padding: '0 10px' },
  searchIcon: { marginRight: '8px' },
  searchInput: { width: '100%', padding: '10px 0', border: 'none', fontSize: '13px', outline: 'none' },
  tableContainer: { borderRadius: "20px", overflow: 'hidden', boxShadow: "0 4px 10px rgba(0,0,0,0.02)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "15px 20px", textAlign: 'left', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  td: { padding: "15px 20px" },
  tr: { transition: '0.2s' },
  lojaInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatarLoja: { width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  nomeLoja: { display: 'block', fontSize: '14px' },
  cpfLoja: { fontSize: '10px', display: 'block', marginTop: '2px' },
  select: { padding: '5px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', outline: 'none' },
  cicloToggle: { display: 'flex', borderRadius: '8px', padding: '2px', width: 'fit-content' },
  btnToggle: { border: 'none', background: 'transparent', padding: '4px 10px', fontSize: '10px', fontWeight: '900', borderRadius: '6px', cursor: 'pointer' },
  activeM: { background: '#10b981', color: '#fff' },
  activeA: { background: '#3b82f6', color: '#fff' },
  btnAction: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modalContent: { padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  btnClose: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
  modalText: { fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' },
  modalInput: { width: '100%', padding: '12px', borderRadius: '12px', outline: 'none', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box' },
  btnConfirmar: { width: '100%', padding: '14px', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
  btnCarregarMais: { width: '100%', padding: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }
};