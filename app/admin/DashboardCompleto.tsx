// app/admin/DashboardGestao.tsx
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, collection, onSnapshot, arrayUnion, serverTimestamp, getDocs } from "firebase/firestore";
import { useDashboardInteligencia } from "@/hooks/useDashboardInteligencia";
import { useTheme } from "@/context/ThemeContext";

// --- IMPORTAÇÃO DAS TABS RESTANTES ---
import { TabCatalogo } from "./_tabsDashBoardLogista/TabCatalogo";
import { TabSazonalidade } from "./_tabsDashBoardLogista/TabSazonalidade";
import { TabClientes } from "./_tabsDashBoardLogista/TabClientes";
import { TabLucroReal } from "./_tabsDashBoardLogista/TabLucroReal";
import { TabFaturamentoCanais } from "./_tabsDashBoardLogista/TabFaturamentoCanais";
import { TabDespesas } from "./_tabsDashBoardLogista/TabDespesas";
import { TabRelatorioHistorico } from "./_tabsDashBoardLogista/TabRelatorioHistorico";
import { TabPrecificacao } from "./_tabsDashBoardLogista/TabPrecificacao";

import { Pedido } from "@/types/pedido";

// ============================================================================
// CONSTANTE DE VERSÃO DO SCHEMA
// ============================================================================
const VERSAO_SCHEMA_CODE = 2;

// ============================================================================
// INTERFACES / TYPING
// ============================================================================
interface CanalRenda {
  canal: string;
  valorLiquidoRecebido: number;
  mesAno: string;
}

interface DespesaLojista {
  id: string;
  valor: number;
  data: string;
}

// ============================================================================
// AUXILIARES
// ============================================================================
const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export function DashboardGestao({ pedidos, lojistaId }: { pedidos: Pedido[], lojistaId?: string }) {
  const router = useRouter();
  const { theme, isModoNoturno } = useTheme();

  useEffect(() => {
    const operadorSalvo = localStorage.getItem("operadorAtivoPdv");
    if (operadorSalvo) {
      try {
        const colab = JSON.parse(operadorSalvo);
        if (colab && colab.permissoes && colab.permissoes.dash !== true) {
          alert("⚠️ Você não tem permissão para acessar o Dashboard!");
          window.location.href = "/admin/pdv";
        }
      } catch (e) {
        console.error("Erro ao validar operador:", e);
      }
    }
  }, []);

  const [abaAtiva, setAbaAtiva] = useState("lucro");
  const [buscaNome, setBuscaNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [itensPorPagina, setItensPorPagina] = useState(20);

  const [canaisExternos, setCanaisExternos] = useState<CanalRenda[]>([]);
  const [despesasLojista, setDespesasLojista] = useState<DespesaLojista[]>([]);

  const [recursosLiberados, setRecursosLiberados] = useState({ temCanaisRenda: false, temDespesas: false });
  const [metaFaturamento, setMetaFaturamento] = useState(15000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [inputMeta, setInputMeta] = useState("15000");

  const [versoesPendentes, setVersoesPendentes] = useState<any[]>([]);
  const [mostrarModalNovidades, setMostrarModalNovidades] = useState(false);
  const [salvandoLeitura, setSalvandoLeitura] = useState(false);

  const [localPedidos, setLocalPedidos] = useState<Pedido[]>(pedidos);
  useEffect(() => { setLocalPedidos(pedidos); }, [pedidos]);

  useEffect(() => {
    if (!lojistaId) return;

    const carregarEVerificarLojista = async () => {
      try {
        const [lojistaSnap, planosSnap, sistemaSnap] = await Promise.all([
          getDoc(doc(db, "lojistas", lojistaId)),
          getDoc(doc(db, "configuracoes", "planos")),
          getDoc(doc(db, "configuracoes", "sistema"))
        ]);

        if (lojistaSnap.exists()) {
          const dadosLojista = lojistaSnap.data();
          const nomePlanoLojista = dadosLojista.plano || "Bronze";
          const versaoSchemaBanco = dadosLojista.sistema?.versaoSchema || 0;

          if (versaoSchemaBanco < VERSAO_SCHEMA_CODE) {
            let houveAlteracao = false;
            const dadosAtualizados = { ...dadosLojista };
            if (!dadosAtualizados.sistema) dadosAtualizados.sistema = {};
            if (!dadosAtualizados.aparencia) dadosAtualizados.aparencia = {};
            if (dadosAtualizados.aparencia.isModoNoturno === undefined) dadosAtualizados.aparencia.isModoNoturno = false;
            dadosAtualizados.sistema.versaoSchema = VERSAO_SCHEMA_CODE;
            houveAlteracao = true;
            if (houveAlteracao) {
              await updateDoc(doc(db, "lojistas", lojistaId), { ...dadosAtualizados, updatedAt: new Date().toISOString() });
            }
          }

          if (dadosLojista.metaFaturamentoMensal) {
            setMetaFaturamento(Number(dadosLojista.metaFaturamentoMensal));
            setInputMeta(String(dadosLojista.metaFaturamentoMensal));
          }

          if (planosSnap.exists()) {
            const masterPlanos = planosSnap.data();
            const configDoPlanoAtual = masterPlanos[nomePlanoLojista] || {};
            setRecursosLiberados({ temCanaisRenda: !!configDoPlanoAtual.temCanaisRenda, temDespesas: !!configDoPlanoAtual.temDespesas });
          }

          if (sistemaSnap.exists()) {
            const dadosSistema = sistemaSnap.data();
            const versaoGlobalSistema = dadosSistema.dsVersaoSistema || "";
            const versoesLidasPeloLojista = dadosLojista.atualizacao?.versoesLidas || [];
            if (versaoGlobalSistema && !versoesLidasPeloLojista.includes(versaoGlobalSistema)) {
              const historicoSnap = await getDocs(collection(db, "configuracoes", "sistema", "historicoVersoes"));
              const todasPublicadas = historicoSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
              const naoLidas = todasPublicadas.filter(v => v.isExibirLogista === true && !versoesLidasPeloLojista.includes(v.nrVersaoSistemaSistema));
              if (naoLidas.length > 0) {
                setVersoesPendentes(naoLidas);
                setMostrarModalNovidades(true);
              }
            }
          }
        }
      } catch (error) { console.error("Erro ao carregar ou sincronizar dados:", error); }
    };
    carregarEVerificarLojista();
  }, [lojistaId]);

  const marcarNovidadesComoLidas = async () => {
    if (!lojistaId || versoesPendentes.length === 0) return;
    setSalvandoLeitura(true);
    try {
      const idsPendentes = versoesPendentes.map(v => v.nrVersaoSistemaSistema);
      await updateDoc(doc(db, "lojistas", lojistaId), { "atualizacao.versoesLidas": arrayUnion(...idsPendentes), "atualizacao.ultimaLeitura": serverTimestamp() });
      setMostrarModalNovidades(false);
      setVersoesPendentes([]);
    } catch (e) { console.error("Erro:", e); alert("Erro ao confirmar leitura."); } finally { setSalvandoLeitura(false); }
  };

  useEffect(() => {
    if (!lojistaId) return;
    const unsubCanais = onSnapshot(collection(db, "lojistas", lojistaId, "faturamento_canais"), (snap) => setCanaisExternos(snap.docs.map(doc => doc.data() as CanalRenda)));
    const unsubDespesas = onSnapshot(collection(db, "lojistas", lojistaId, "despesas"), (snap) => setDespesasLojista(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)));
    return () => { unsubCanais(); unsubDespesas(); };
  }, [lojistaId]);

  const handleSalvarMeta = async () => {
    if (!lojistaId) return;
    const novaMeta = Number(inputMeta) || 0;
    try { await updateDoc(doc(db, "lojistas", lojistaId), { metaFaturamentoMensal: novaMeta }); setMetaFaturamento(novaMeta); setEditandoMeta(false); } catch (e) { alert("Erro ao salvar meta."); }
  };

  const parseDataPedido = useCallback((dataStr: any) => {
    if (!dataStr) return null;
    if (typeof dataStr === 'object' && typeof dataStr.toDate === 'function') return dataStr.toDate();
    if (typeof dataStr === 'string' && (dataStr.includes("T") || dataStr.includes("-"))) return new Date(dataStr);
    return new Date(dataStr);
  }, []);

  const formatarDataExibicao = useCallback((dataStr: any) => {
    const dataObj = parseDataPedido(dataStr);
    if (!dataObj || isNaN(dataObj.getTime())) return "Data Inválida";
    return dataObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }, [parseDataPedido]);

  const pedidosFiltradosGeral = useMemo(() => {
    return pedidos.filter(p => {
      const clienteObj = p.dsCliente || p.cliente || {};
      const clienteNomeStr = String(clienteObj.nmNomeCliente || clienteObj.nome || "");
      const numPedidoStr = String(p.nrNumeroPedido || p.numeroPedido || "");
      const termoBusca = String(buscaNome || "").toLowerCase().trim();

      if (buscaNome && !clienteNomeStr.toLowerCase().includes(termoBusca) && !numPedidoStr.toLowerCase().includes(termoBusca)) return false;

      const dataP = parseDataPedido(p.timestamp || p.data);
      if (dataInicio && dataP && dataP < new Date(dataInicio + "T00:00:00")) return false;
      if (dataFim && dataP && dataP > new Date(dataFim + "T23:59:59")) return false;
      return true;
    });
  }, [pedidos, buscaNome, dataInicio, dataFim, parseDataPedido]);

  // 🌟 Corrigido para passar exatamente os 4 argumentos exigidos pelo hook
  const inteligencia = useDashboardInteligencia(pedidosFiltradosGeral, canaisExternos, despesasLojista, parseDataPedido);

  useEffect(() => {
    if (!lojistaId || !inteligencia) return;
    const syncFinanceiro = async () => {
      try {
        const ticketMedioCalculado = inteligencia.totalPedidosValidos > 0 ? (inteligencia.faturamentoInternoPuro / inteligencia.totalPedidosValidos) : 0;
        await updateDoc(doc(db, "lojistas", lojistaId), { lucroReal: inteligencia.lucroReal, ticketMedio: ticketMedioCalculado, ultimaAtualizacao: new Date().toISOString() });
      } catch (error) { console.error("Erro ao salvar financeiro:", error); }
    };
    const timer = setTimeout(syncFinanceiro, 2000);
    return () => clearTimeout(timer);
  }, [inteligencia.lucroReal, inteligencia.totalPedidosValidos, lojistaId]);

  const progressoMeta = useMemo(() => {
    if (metaFaturamento <= 0) return 0;
    return Math.min(100, Math.round((inteligencia.faturamento / metaFaturamento) * 100));
  }, [inteligencia.faturamento, metaFaturamento]);

  const abasDisponiveis = [
    { id: "lucro", label: "💰 LUCRO REAL" },
    { id: "precificacao", label: "🧮 PRECIFICAÇÃO" },
    { id: "sazonalidade", label: "📊 SAZONALIDADE" },
    { id: "catalogo", label: "📚 CATÁLOGO" },
    { id: "clientes", label: "👥 CLIENTES" },
    { id: "historico", label: "📈 RELATÓRIO HISTÓRICO" },
    { id: "canais", label: "📦 CANAIS DE RENDA" },
    { id: "despesas", label: "💸 DESPESAS" }
  ];

  return (
    <div style={{ ...styles.page, backgroundColor: theme.bgMain, color: theme.textMain }} className="dashboard-page-container">

      {mostrarModalNovidades && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.primary }}>
                <span style={{ fontSize: '18px' }}>✨</span>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>NOVIDADES NO SISTEMA</h3>
              </div>
              <span style={styles.badgeCountNotif}>{versoesPendentes.length} atualizações</span>
            </div>
            <p style={{ fontSize: '13px', color: theme.textSec, lineHeight: '1.4', marginBottom: '20px' }}>Preparamos melhorias e novas funcionalidades no painel.</p>
            <div style={styles.modalScrollArea}>
              {versoesPendentes.map((versao, idx) => (
                <div key={idx} style={{ ...styles.versaoCardItem, background: theme.inputBg, border: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: theme.primary }}>📌 v{versao.nrVersaoSistemaSistema}</span>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textSec }}>{versao.tsDataAtualizacao}</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {versao.dsDescricao?.map((desc: string, i: number) => <li key={i} style={{ fontSize: '13px', color: theme.textMain }}>{desc}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <button onClick={marcarNovidadesComoLidas} disabled={salvandoLeitura} style={{ ...styles.btnEntendidoModal, background: theme.primary }}>
              ✅ {salvandoLeitura ? "Salvando..." : "Entendido, continuar para o painel"}
            </button>
          </div>
        </div>
      )}

      {/* 1. BARRA DE METAS */}
      <div style={{ ...styles.metaContainer, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={styles.metaInfoRow}>
          <div>
            <span style={{ ...styles.metaMiniTitle, color: theme.textSec }}>🎯 META DE FATURAMENTO MENSAL</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "3px" }}>
              {editandoMeta ? (
                <div style={{ display: "flex", gap: "5px" }}>
                  <input type="number" value={inputMeta} onChange={e => setInputMeta(e.target.value)} style={{ ...styles.inputMetaEdit, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
                  <button onClick={handleSalvarMeta} style={styles.btnMetaSalvar}>Salvar</button>
                  <button onClick={() => setEditandoMeta(false)} style={{ ...styles.btnMetaCancelar, color: theme.textSec }}>✕</button>
                </div>
              ) : (
                <>
                  <h3 style={{ ...styles.metaValores, color: theme.textMain }}>{formatarMoeda(inteligencia.faturamento)} / <span style={{ color: theme.textSec }}>{formatarMoeda(metaFaturamento)}</span></h3>
                  <button onClick={() => setEditandoMeta(true)} style={styles.btnMetaEdit}>✏️️ Alterar Meta</button>
                </>
              )}
            </div>
          </div>
          <span style={styles.metaPercentBadge}>{progressoMeta}% Atingido</span>
        </div>
        <div style={{ ...styles.progressBarBg, backgroundColor: theme.inputBg }}><div style={{ ...styles.progressBarFill, width: `${progressoMeta}%` }} /></div>
      </div>

      {/* 2. CARDS DE RESUMO */}
      <div style={styles.grid}>
        <div style={{ ...styles.card, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderLeft: '5px solid #2ecc71' }}>
          <span style={{ ...styles.cardLabel, color: theme.textSec }}>Faturamento Omnichannel</span>
          <h2 style={{ ...styles.cardVal, color: theme.textMain }}>{formatarMoeda(inteligencia.faturamento)}</h2>
        </div>

        <div style={{ ...styles.card, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderLeft: '5px solid #27ae60' }}>
          <span style={{ ...styles.cardLabel, color: theme.textSec }}>Lucro Real Consolidado</span>
          <h2 style={{ ...styles.cardVal, color: theme.textMain }}>{formatarMoeda(inteligencia.lucroReal)}</h2>
        </div>

        <div style={{ ...styles.card, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderLeft: '5px solid #3498db' }}>
          <span style={{ ...styles.cardLabel, color: theme.textSec }}>Ticket Médio</span>
          <h2 style={{ ...styles.cardVal, color: theme.textMain }}>
            {formatarMoeda(inteligencia.totalPedidosValidos > 0 ? (inteligencia.faturamentoInternoPuro / inteligencia.totalPedidosValidos) : 0)}
          </h2>
        </div>

        <div style={{ ...styles.card, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderLeft: '5px solid #e74c3c' }}>
          <span style={{ ...styles.cardLabel, color: theme.textSec }}>Perda / Devoluções</span>
          <h2 style={{ ...styles.cardVal, color: theme.textMain }}>{formatarMoeda(inteligencia.perdaDevolucao)}</h2>
        </div>
      </div>

      {/* 3. FILTROS E ABAS */}
      <header style={styles.header}>
        <div style={{ ...styles.filtrosCard, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}` }} className="filtro-container">
          <input type="text" placeholder="🔍 Buscar por nome do cliente ou número do pedido..." value={buscaNome} onChange={e => setBuscaNome(e.target.value)} style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ ...styles.inputDate, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ ...styles.inputDate, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} />
          <select value={itensPorPagina} onChange={(e) => setItensPorPagina(Number(e.target.value))} style={{ ...styles.selectPaginacaoTopo, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}>
            <option value={20}>20 por pág</option>
            <option value={40}>40 por pág</option>
            <option value={100}>100 por pág</option>
          </select>
          <button onClick={() => { setBuscaNome(""); setDataInicio(""); setDataFim(""); }} style={styles.btnLimpar}>Limpar</button>
        </div>

        <div style={{ ...styles.tabBar, borderColor: theme.border }}>
          {abasDisponiveis.map(t => (
            <button key={t.id} style={abaAtiva === t.id ? styles.tabActive : { ...styles.tab, backgroundColor: theme.inputBg, color: theme.textSec }} onClick={() => setAbaAtiva(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* 4. CONTEÚDO DAS ABAS */}
      <section style={{ ...styles.section, backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, minHeight: abaAtiva === 'precificacao' ? 'auto' : '650px', position: 'relative' }}>
        <div style={{ ...styles.abaHeader, borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={{ margin: 0, color: theme.textMain }}>
            {abaAtiva === 'lucro' ? '💰 DETALHAMENTO DE RESULTADO' : abaAtiva === 'canais' ? '📦 CENTRAL DE CANAIS OMNICHANNEL' : abaAtiva === 'precificacao' ? '🧮 SIMULADOR DE PRECIFICAÇÃO E MARGEM' : abaAtiva.toUpperCase()}
          </h3>
        </div>

        <div className="tab-pane-content">
          {abaAtiva === 'catalogo' && (
            <TabCatalogo uid={lojistaId || ""} formatarMoeda={formatarMoeda} styles={styles} />
          )}

          {abaAtiva === 'sazonalidade' && (
            <TabSazonalidade uid={lojistaId || ""} formatarMoeda={formatarMoeda} />
          )}

          {abaAtiva === 'clientes' && (
            <TabClientes
              uid={lojistaId || ""}
              clientesRanking={inteligencia?.clientesRankingTop || []}
              buscaNome={buscaNome}
              formatarMoeda={formatarMoeda}
              styles={styles}
            />
          )}

          {abaAtiva === 'lucro' && (
            <TabLucroReal
              uid={lojistaId || ""}
              formatarMoeda={formatarMoeda}
              evolucaoMensal={inteligencia.evolucaoPorAno}
              totalPedidos={pedidosFiltradosGeral.length}
            />
          )}

          {abaAtiva === 'precificacao' && (
            <TabPrecificacao formatarMoeda={formatarMoeda} />
          )}

          {abaAtiva === 'canais' && recursosLiberados.temCanaisRenda && (
            <TabFaturamentoCanais
              canaisExternos={canaisExternos}
              faturamentoCatalogoProprio={inteligencia.faturamentoInternoPuro}
              formatarMoeda={formatarMoeda}
            />
          )}

          {abaAtiva === 'historico' && (
            <TabRelatorioHistorico uid={lojistaId || ""} formatarMoeda={formatarMoeda} />
          )}

          {abaAtiva === 'despesas' && recursosLiberados.temDespesas && (
            <TabDespesas lojistaId={lojistaId || ""} formatarMoeda={formatarMoeda} />
          )}
        </div>
      </section>

      <style jsx>{`
        :global(body), :global(html) {
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
          overflow-y: scroll !important;
        }

        .dashboard-page-container {
          box-sizing: border-box;
          margin-top: 0 !important;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        @keyframes fadeInTab {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tab-pane-content {
          animation: fadeInTab 0.25s ease-in-out forwards;
        }

        .dashboard-page-container ::-webkit-scrollbar {
          height: 4px;
        }
        .dashboard-page-container ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        @media (max-width: 768px) {
          .filtro-container {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .filtro-container input,
          .filtro-container select,
          .filtro-container button {
            width: 100% !important;
            flex: none !important;
            min-width: 100% !important;
          }
        }

        @media (min-width: 769px) {
          .dashboard-page-container {
            margin-left: 0px !important;
            width: 100% !important;
            max-width: 100% !important;
            padding-top: 0px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: { padding: '0px 16px 24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', boxSizing: 'border-box' },
  header: { marginBottom: '24px' },
  filtrosCard: { display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px', alignItems: 'center' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', flex: 1, minWidth: '240px', outline: 'none', boxSizing: 'border-box' },
  inputDate: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  selectPaginacaoTopo: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box', flexShrink: 0 },
  btnLimpar: { padding: '10px 16px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#ef4444', flexShrink: 0, boxSizing: 'border-box' },
  tabBar: { display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid', paddingBottom: '12px' },
  tab: { padding: '8px 14px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '12px', borderRadius: '8px' },
  tabActive: { padding: '8px 14px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: '600', fontSize: '12px', borderRadius: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
  card: { padding: '16px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  cardLabel: { fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' },
  cardVal: { margin: 0, fontSize: '20px', fontWeight: '800' },
  section: { padding: '16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflowX: 'auto' },
  abaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '10px' },
  metaContainer: { padding: '16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '20px' },
  metaInfoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  metaMiniTitle: { fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' },
  metaValores: { margin: 0, fontSize: '18px', fontWeight: '800' },
  metaPercentBadge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700' },
  progressBarBg: { width: '100%', height: '8px', borderRadius: '9999px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: '9999px', transition: 'width 0.4s ease-in-out' },
  btnMetaEdit: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0, marginLeft: '10px' },
  inputMetaEdit: { padding: '4px 8px', borderRadius: '6px', border: '1px solid', width: '100px', fontSize: '13px', fontWeight: '600', outline: 'none' },
  btnMetaSalvar: { backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnMetaCancelar: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 4px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalContent: { width: '100%', maxWidth: '540px', padding: '28px', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  badgeCountNotif: { fontSize: '11px', fontWeight: '700', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px' },
  modalScrollArea: { maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', paddingRight: '4px' },
  versaoCardItem: { padding: '14px', borderRadius: '12px' },
  btnEntendidoModal: { width: '100%', padding: '14px', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
};

export default DashboardGestao;