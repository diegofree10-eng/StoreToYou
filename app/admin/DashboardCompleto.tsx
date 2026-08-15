"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, collection, onSnapshot, addDoc } from "firebase/firestore";
// Como a pasta hooks está dentro de app:
import { useDashboardInteligencia } from "@/hooks/useDashboardInteligencia";

// --- IMPORTAÇÃO DAS TABS ---
import { TabCatalogo } from "./_tabsDashBoardLogista/TabCatalogo";
import { TabSazonalidade } from "./_tabsDashBoardLogista/TabSazonalidade";
import { TabClientes } from "./_tabsDashBoardLogista/TabClientes";
import { TabLucroReal } from "./_tabsDashBoardLogista/TabLucroReal";
import { TabDevolucoes } from "./_tabsDashBoardLogista/TabDevolucoes";
import { TabFaturamentoCanais } from "./_tabsDashBoardLogista/TabFaturamentoCanais";
import { TabDespesas } from "./_tabsDashBoardLogista/TabDespesas";
import { TabRelatorioHistorico } from "./_tabsDashBoardLogista/TabRelatorioHistorico";
import { TabVendas } from "./_tabsDashBoardLogista/TabVendas";


// ============================================================================
// CONSTANTE DE VERSÃO DO SCHEMA (Incrementar apenas ao adicionar novos campos)
// ============================================================================
const VERSAO_SCHEMA_CODE = 2;


// ============================================================================
// INTERFACES / TYPING
// ============================================================================
interface ItemPedido {
  id?: string;
  nome?: string;
  qty: number;
  preco?: number;
  variacao?: string;
  requisitos?: any[];
}

interface Pedido {
  id: string;
  data: string;
  cliente: string | { nmNomeCliente?: string; nome?: string };
  numeroPedido: string | number;
  devolvido: boolean;
  custoFreteLojista?: number;
  freteCusto?: number;
  financeiro: {
    total?: number;
    vlTotal?: number;
    valorTotal?: number;
    frete?: number;
    vlFrete?: number;
    subtotal?: number;
    vlSubtotal?: number;
    valorSubtotal?: number;
    discount?: number;
    vlDesconto?: number;
    descontos?: number;
    freteGratis?: boolean;
    dsTransportadoraId?: string;
  };
  logistica?: {
    vlFrete?: number;
  };
  StatusProducao?: {
    dsStatusProducao?: string;
  };
  status?: string;
  itens: ItemPedido[];
}

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
// CONSTANTES E AUXILIARES
// ============================================================================
const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

const LinhaPedido = React.memo(({ pedido, expandido, onExpandir, onDevolver, dataFormatada }: any) => {
  const clienteObj = typeof pedido.cliente === 'object' && pedido.cliente !== null ? pedido.cliente : {};
  const nomeExibicao = clienteObj.nmNomeCliente || clienteObj.nome || (typeof pedido.cliente === 'string' ? pedido.cliente : "Cliente Sem Nome");

  const fin = pedido.financeiro || {};
  const log = pedido.logistica || {};

  // 🛡️ Extração robusta unificada com os campos reais do Firebase (vlSubtotal, vlFrete, etc.)
  const subtotalVal = Number(fin.vlSubtotal ?? fin.subtotal ?? fin.valorSubtotal ?? 0);
  const descontoVal = Number(fin.vlDesconto ?? fin.discount ?? fin.descontos ?? 0);
  const freteVal = Number(log.vlFrete ?? fin.frete ?? fin.vlFrete ?? 0);
  const freteGratisFlag = fin.freteGratis || fin.dsTransportadoraId === "frete_gratis_ativado";

  const totalCalculadoManual = subtotalVal + (freteGratisFlag ? 0 : freteVal) - descontoVal;
  const totalFinal = Number(fin.vlTotal ?? fin.total ?? fin.valorTotal ?? (totalCalculadoManual > 0 ? totalCalculadoManual : 0));

  return (
    <React.Fragment>
      <tr style={{ ...styles.tr, background: expandido ? '#f0f7ff' : 'transparent', transition: '0.3s' }}>
        <td style={styles.td}>{dataFormatada}</td>
        <td style={styles.td}><span style={styles.pedidoBadge}>#{pedido.numeroPedido}</span></td>
        <td style={{ ...styles.td, cursor: 'pointer', color: '#3498db', fontWeight: 'bold' }} onClick={() => onExpandir(pedido.id)}>
          👤 {nomeExibicao} {expandido ? '🔼' : '🔽'}
        </td>
        <td style={styles.td}>{formatarMoeda(totalFinal)}</td>
        <td style={styles.td}>
          <button onClick={(e) => { e.stopPropagation(); onDevolver(pedido.id, pedido.devolvido); }} style={{ ...styles.btnDevolver, backgroundColor: pedido.devolvido ? '#e0f2fe' : '#fee2e2', color: pedido.devolvido ? '#0ea5e9' : '#ef4444' }}>
            {pedido.devolvido ? 'Restaurar' : 'Devolver'}
          </button>
        </td>
      </tr>

      {expandido && (
        <tr>
          <td colSpan={5} style={styles.detalheBox}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

              <div style={{ flex: 2, backgroundColor: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Itens do Pedido:</strong>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#333', marginBottom: '12px' }}>
                  {(pedido.itens || []).map((it: ItemPedido, idx: number) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      {Number(it.qty || 1)}x {it.nome || "Produto"}
                      {it.variacao && <span style={{ color: '#0284c7' }}> ({it.variacao})</span>}
                    </li>
                  ))}
                </ul>

                {/* 🛠️ ID do Pedido adicionado abaixo dos itens */}
                <div style={{ fontSize: '13px', color: '#333', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                  <strong>ID do Pedido:</strong> <span style={{ fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{pedido.id}</span>
                </div>
              </div>

              <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', marginBottom: '10px', fontSize: '13px', color: '#1e293b' }}>Resumo Financeiro:</strong>

                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={styles.finRow}>
                    <span>Total dos Produtos:</span>
                    <span>{formatarMoeda(subtotalVal)}</span>
                  </div>

                  {descontoVal > 0 ? (
                    <div style={{ ...styles.finRow, color: '#16a34a' }}>
                      <span>Cupom de Desconto:</span>
                      <span>- {formatarMoeda(descontoVal)}</span>
                    </div>
                  ) : (
                    <div style={{ ...styles.finRow, color: '#94a3b8', fontStyle: 'italic' }}>
                      <span>Cupom de Desconto:</span>
                      <span>Não aplicado</span>
                    </div>
                  )}

                  <div style={styles.finRow}>
                    <span>Sub total:</span>
                    <span>{formatarMoeda(subtotalVal - descontoVal)}</span>
                  </div>

                  <div style={styles.finRow}>
                    <span>Total de Frete:</span>
                    <strong>{freteGratisFlag ? "Grátis" : formatarMoeda(freteVal)}</strong>
                  </div>

                  <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '5px 0' }} />

                  <div style={{ ...styles.finRow, fontSize: '14px', fontWeight: 'bold', color: '#78350f' }}>
                    <span>Pagamento total:</span> <span>{formatarMoeda(totalFinal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

LinhaPedido.displayName = "LinhaPedido";


// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export function DashboardGestao({ pedidos, lojistaId }: { pedidos: Pedido[], lojistaId?: string }) {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState("vendas");
  const [buscaNome, setBuscaNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);

  const [itensPorPagina, setItensPorPagina] = useState(20);

  const [canaisExternos, setCanaisExternos] = useState<CanalRenda[]>([]);
  const [despesasLojista, setDespesasLojista] = useState<DespesaLojista[]>([]);

  const [recursosLiberados, setRecursosLiberados] = useState({ temCanaisRenda: false, temDespesas: false });
  const [metaFaturamento, setMetaFaturamento] = useState(15000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [inputMeta, setInputMeta] = useState("15000");

  const [calcCustoInsumo, setCalcCustoInsumo] = useState("10.00");
  const [calcMargemDesejada, setCalcMargemDesejada] = useState("40");
  const [calcImpostos, setCalcImpostos] = useState("6");
  const [calcTaxaMarketplace, setCalcTaxaMarketplace] = useState("0");


  const carregarDadosTeste = async () => {
    if (!lojistaId) return;
    if (!confirm("Isso adicionará dados de 2025 e 2026 para testar o gráfico. Continuar?")) return;

    const colRef = collection(db, "lojistas", lojistaId, "pedidos");
    const pedidosTeste = [
      { data: "2025-06-15T12:00:00", status: "concluído", devolvido: false, numeroPedido: 501, cliente: "Teste 2025", financeiro: { total: 1000 }, itens: [{ nome: "Topo de Bolo Luxo", qty: 1, preco: 14000 }] },
      { data: "2026-01-15T12:00:00", status: "concluído", devolvido: false, numeroPedido: 1001, cliente: "Teste Jan", financeiro: { total: 500 }, itens: [{ nome: "Convite Marsala", qty: 2, preco: 250 }] },
      { data: "2026-02-20T12:00:00", status: "concluído", devolvido: false, numeroPedido: 1002, cliente: "Teste Fev", financeiro: { total: 800 }, itens: [{ nome: "Topo de Bolo Luxo", qty: 2, preco: 400 }] },
      { data: "2026-03-10T12:00:00", status: "concluído", devolvido: false, numeroPedido: 1003, cliente: "Teste Mar", financeiro: { total: 300 }, itens: [{ nome: "Convite One Peace", qty: 3, preco: 100 }] }
    ];

    try {
      for (const p of pedidosTeste) { await addDoc(colRef, p); }
      alert("Dados de 2025 e 2026 inseridos! O gráfico agora terá dois anos para você alternar.");
    } catch (e) {
      alert("Erro ao inserir dados.");
    }
  };

  // ============================================================================
  // CARREGAMENTO OTIMIZADO COM PROMISE.ALL E MIGRAÇÃO AUTOMÁTICA DE SCHEMA
  // ============================================================================
  useEffect(() => {
    if (!lojistaId) return;

    const carregarEVerificarLojista = async () => {
      try {
        // Busca paralela: Perfil do lojista + Configurações globais do sistema
        const [lojistaSnap, planosSnap] = await Promise.all([
          getDoc(doc(db, "lojistas", lojistaId)),
          getDoc(doc(db, "configuracoes", "planos"))
        ]);

        if (lojistaSnap.exists()) {
          const dadosLojista = lojistaSnap.data();
          const nomePlanoLojista = dadosLojista.plano || "Bronze";

          // Verificação da versão de schema para contas antigas
          const versaoSchemaBanco = dadosLojista.sistema?.versaoSchema || 0;

          if (versaoSchemaBanco < VERSAO_SCHEMA_CODE) {
            console.log("🔄 Sincronizando campos novos na conta do lojista...");
            let houveAlteracao = false;
            const dadosAtualizados = { ...dadosLojista };

            if (!dadosAtualizados.sistema) {
              dadosAtualizados.sistema = {};
            }

            // Exemplo de campo estrutural novo adicionado em versões futuras
            if (!dadosAtualizados.aparencia) {
              dadosAtualizados.aparencia = {};
              houveAlteracao = true;
            }
            if (dadosAtualizados.aparencia.isModoNoturno === undefined) {
              dadosAtualizados.aparencia.isModoNoturno = false;
              houveAlteracao = true;
            }

            // Atualiza a versão do schema no objeto
            dadosAtualizados.sistema.versaoSchema = VERSAO_SCHEMA_CODE;
            houveAlteracao = true;

            if (houveAlteracao) {
              await updateDoc(doc(db, "lojistas", lojistaId), {
                ...dadosAtualizados,
                updatedAt: new Date().toISOString()
              });
            }
          }

          if (dadosLojista.metaFaturamentoMensal) {
            setMetaFaturamento(Number(dadosLojista.metaFaturamentoMensal));
            setInputMeta(String(dadosLojista.metaFaturamentoMensal));
          }

          // Atribuição de recursos baseados no plano
          if (planosSnap.exists()) {
            const masterPlanos = planosSnap.data();
            const configDoPlanoAtual = masterPlanos[nomePlanoLojista] || {};

            setRecursosLiberados({
              temCanaisRenda: !!configDoPlanoAtual.temCanaisRenda,
              temDespesas: !!configDoPlanoAtual.temDespesas
            });
          }
        }
      } catch (error) {
        console.error("Erro ao carregar ou sincronizar dados do lojista:", error);
      }
    };

    carregarEVerificarLojista();
  }, [lojistaId]);

  useEffect(() => {
    if (!lojistaId) return;
    const unsubCanais = onSnapshot(collection(db, "lojistas", lojistaId, "faturamento_canais"), (snap) => {
      const dados = snap.docs.map(doc => doc.data() as CanalRenda);
      setCanaisExternos(dados);
    });
    return () => unsubCanais();
  }, [lojistaId]);

  useEffect(() => {
    if (!lojistaId) return;
    const unsubDespesas = onSnapshot(collection(db, "lojistas", lojistaId, "despesas"), (snap) => {
      const dados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
      setDespesasLojista(dados);
    });
    return () => unsubDespesas();
  }, [lojistaId]);

  const handleSalvarMeta = async () => {
    if (!lojistaId) return;
    const novaMeta = Number(inputMeta) || 0;
    try {
      await updateDoc(doc(db, "lojistas", lojistaId), { metaFaturamentoMensal: novaMeta });
      setMetaFaturamento(novaMeta);
      setEditandoMeta(false);
    } catch (e) {
      alert("Erro ao salvar meta.");
    }
  };

  const parseDataPedido = useCallback((dataStr: string) => {
    if (!dataStr) return null;
    if (dataStr.includes("T") || dataStr.includes("-")) return new Date(dataStr);
    const [dia, mes, ano] = dataStr.split(",")[0].trim().split("/");
    return new Date(Number(ano), Number(mes) - 1, Number(dia), 12, 0, 0);
  }, []);

  const formatarDataExibicao = useCallback((dataStr: string) => {
    const dataObj = parseDataPedido(dataStr);
    if (!dataObj || isNaN(dataObj.getTime())) return dataStr?.split("T")[0] || "Data Inválida";
    return dataObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }, [parseDataPedido]);

  const alternarDevolucao = useCallback(async (id: string, statusAtual: boolean) => {
    if (!lojistaId) return;
    if (confirm(statusAtual ? "Reativar este pedido?" : "Confirmar DEVOLUÇÃO?")) {
      await updateDoc(doc(db, "lojistas", lojistaId, "pedidos", id), { devolvido: !statusAtual });
    }
  }, [lojistaId]);

  const inteligencia = useDashboardInteligencia(
    pedidos,
    canaisExternos,
    despesasLojista,
    dataInicio,
    dataFim,
    recursosLiberados,
    parseDataPedido
  );

  useEffect(() => {
    if (!lojistaId || !inteligencia) return;

    const syncFinanceiro = async () => {
      try {
        const docRef = doc(db, "lojistas", lojistaId);

        const ticketMedioCalculado = inteligencia.totalPedidosValidos > 0
          ? (inteligencia.faturamentoInternoPuro / inteligencia.totalPedidosValidos)
          : 0;

        await updateDoc(docRef, {
          lucroReal: inteligencia.lucroReal,
          ticketMedio: ticketMedioCalculado,
          ultimaAtualizacao: new Date().toISOString()
        });
      } catch (error) {
        console.error("Erro ao salvar financeiro no Firebase:", error);
      }
    };

    const timer = setTimeout(syncFinanceiro, 2000);
    return () => clearTimeout(timer);

  }, [inteligencia.lucroReal, inteligencia.totalPedidosValidos, lojistaId]);

  const simuladorPrecoSugerido = useMemo(() => {
    const custo = Number(calcCustoInsumo) || 0;
    const margem = Number(calcMargemDesejada) || 0;
    const imposto = Number(calcImpostos) || 0;
    const taxaMkt = Number(calcTaxaMarketplace) || 0;

    const percentualDeducoes = (margem + imposto + taxaMkt) / 100;
    if (percentualDeducoes >= 1) return 0;

    return custo / (1 - percentualDeducoes);
  }, [calcCustoInsumo, calcMargemDesejada, calcImpostos, calcTaxaMarketplace]);

  const progressoMeta = useMemo(() => {
    if (metaFaturamento <= 0) return 0;
    const percentual = (inteligencia.faturamento / metaFaturamento) * 100;
    return Math.min(100, Math.round(percentual));
  }, [inteligencia.faturamento, metaFaturamento]);

  const dadosFiltradosBusca = useMemo(() => {
    return pedidos.filter(p => {
      let clienteNomeStr = "";
      if (p.cliente && typeof p.cliente === 'object') {
        clienteNomeStr = String((p.cliente as any).nmNomeCliente || (p.cliente as any).nome || "");
      } else {
        clienteNomeStr = String(p.cliente || "");
      }

      const termoBusca = String(buscaNome || "").toLowerCase().trim();
      const correspondenciaNome = clienteNomeStr.toLowerCase().includes(termoBusca);
      const correspondenciaNumero = String(p.numeroPedido || "").toLowerCase().includes(termoBusca);

      if (buscaNome && !correspondenciaNome && !correspondenciaNumero) return false;

      const dataP = parseDataPedido(p.data);
      if (dataInicio && dataP && dataP < new Date(dataInicio + "T00:00:00")) return false;
      if (dataFim && dataP && dataP > new Date(dataFim + "T23:59:59")) return false;

      return true;
    });
  }, [pedidos, buscaNome, dataInicio, dataFim, parseDataPedido]);

  const abasDisponiveis = [
    { id: "vendas", label: "VENDAS" }, { id: "devolucoes", label: "🔄 DEVOLVIDOS" },
    { id: "lucro", label: "💰 LUCRO REAL" }, { id: "precificacao", label: "🧮 PRECIFICAÇÃO" },
    { id: "sazonalidade", label: "SAZONALIDADE" }, { id: "catalogo", label: "CATÁLOGO" },
    { id: "clientes", label: "CLIENTES" }, { id: "historico", label: "📈 RELATÓRIO HISTÓRICO" },
    { id: "canais", label: "📦 CANAIS DE RENDA" }, { id: "despesas", label: "💸 DESPESAS" }
  ];

  return (
    <div style={styles.page} className="dashboard-page-container">
      {/* 1. BARRA DE METAS */}
      <div style={styles.metaContainer}>
        <div style={styles.metaInfoRow}>
          <div>
            <span style={styles.metaMiniTitle}>🎯 META DE FATURAMENTO MENSAL</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "3px" }}>
              {editandoMeta ? (
                <div style={{ display: "flex", gap: "5px" }}>
                  <input type="number" value={inputMeta} onChange={e => setInputMeta(e.target.value)} style={styles.inputMetaEdit} />
                  <button onClick={handleSalvarMeta} style={styles.btnMetaSalvar}>Salvar</button>
                  <button onClick={() => setEditandoMeta(false)} style={styles.btnMetaCancelar}>✕</button>
                </div>
              ) : (
                <>
                  <h3 style={styles.metaValores}>{formatarMoeda(inteligencia.faturamento)} / <span style={{ color: "#64748b" }}>{formatarMoeda(metaFaturamento)}</span></h3>
                  <button onClick={() => setEditandoMeta(true)} style={styles.btnMetaEdit}>✏️ Alterar Meta</button>
                </>
              )}
            </div>
          </div>
          <span style={styles.metaPercentBadge}>{progressoMeta}% Atingido</span>
        </div>
        <div style={styles.progressBarBg}><div style={{ ...styles.progressBarFill, width: `${progressoMeta}%` }} /></div>
      </div>

      {/* 2. CARDS DE RESUMO */}
      <div style={styles.grid}>
        <div style={{ ...styles.card, borderLeft: '5px solid #2ecc71' }}><span style={styles.cardLabel}>Faturamento Omnichannel</span><h2 style={styles.cardVal}>{formatarMoeda(inteligencia.faturamento)}</h2></div>
        <div style={{ ...styles.card, borderLeft: '5px solid #27ae60' }}><span style={styles.cardLabel}>Lucro Real Consolidado</span><h2 style={styles.cardVal}>{formatarMoeda(inteligencia.lucroReal)}</h2></div>
        <div style={{ ...styles.card, borderLeft: '5px solid #3498db' }}><span style={styles.cardLabel}>Ticket Médio</span><h2 style={styles.cardVal}>{formatarMoeda(inteligencia.faturamentoInternoPuro / (inteligencia.totalPedidosValidos || 1))}</h2></div>
        <div style={{ ...styles.card, borderLeft: '5px solid #e74c3c' }}><span style={styles.cardLabel}>Perda (Cancelados)</span><h2 style={styles.cardVal}>{formatarMoeda(inteligencia.perdaDevolucao)}</h2></div>
      </div>

      {/* 3. FILTROS E ABAS */}
      <header style={styles.header}>
        <div style={styles.filtrosCard} className="filtro-container">
          <input
            type="text"
            placeholder="🔍 Buscar por nome do cliente ou número do pedido..."
            value={buscaNome}
            onChange={e => setBuscaNome(e.target.value)}
            style={styles.input}
          />
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            style={styles.inputDate}
          />
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            style={styles.inputDate}
          />

          <select
            value={itensPorPagina}
            onChange={(e) => setItensPorPagina(Number(e.target.value))}
            style={styles.selectPaginacaoTopo}
          >
            <option value={20}>20 por pág</option>
            <option value={40}>40 por pág</option>
            <option value={100}>100 por pág</option>
          </select>

          <button
            onClick={() => { setBuscaNome(""); setDataInicio(""); setDataFim(""); }}
            style={styles.btnLimpar}
          >
            Limpar
          </button>
        </div>

        <div style={styles.tabBar}>
          {abasDisponiveis.map(t => (
            <button key={t.id} style={abaAtiva === t.id ? styles.tabActive : styles.tab} onClick={() => { setAbaAtiva(t.id); setPedidoExpandido(null); }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* 4. CONTEÚDO DAS ABAS */}
      <section style={styles.section}>
        <div style={styles.abaHeader}>
          <h3 style={{ margin: 0, color: '#2c3e50' }}>
            {abaAtiva === 'lucro' ? '💰 DETALHAMENTO DE RESULTADO' : abaAtiva === 'canais' ? '📦 CENTRAL DE CANAIS OMNICHANNEL' : abaAtiva === 'precificacao' ? '🧮 SIMULADOR DE PRECIFICAÇÃO E MARGEM' : abaAtiva.toUpperCase()}
          </h3>
        </div>

        {abaAtiva === 'vendas' && (
          <TabVendas
            pedidos={pedidos.filter(p => {
              // 1. Busca por nome (nmNomeCliente ou nome) ou número do pedido
              let clienteNomeStr = "";
              if (p.cliente && typeof p.cliente === 'object') {
                clienteNomeStr = String((p.cliente as any).nmNomeCliente || (p.cliente as any).nome || "");
              } else {
                clienteNomeStr = String(p.cliente || "");
              }

              const termoBusca = String(buscaNome || "").toLowerCase().trim();
              const correspondenciaNome = clienteNomeStr.toLowerCase().includes(termoBusca);
              const correspondenciaNumero = String(p.numeroPedido || "").toLowerCase().includes(termoBusca);

              if (buscaNome && !correspondenciaNome && !correspondenciaNumero) return false;

              // 2. Filtro de Datas
              const dataP = parseDataPedido(p.data);
              if (dataInicio && dataP && dataP < new Date(dataInicio + "T00:00:00")) return false;
              if (dataFim && dataP && dataP > new Date(dataFim + "T23:59:59")) return false;

              // 3. APONTAMENTO SEGURO PARA O STATUS CONCLUÍDO
              const statusProd = String(p.StatusProducao?.dsStatusProducao || "").toLowerCase().trim();
              const ehConcluido = statusProd === "concluído" || statusProd === "concluido";

              const statusRaiz = String(p.status || "").toLowerCase().trim();
              const ehConcluidoRaiz = statusRaiz === "concluído" || statusRaiz === "concluido";

              return (ehConcluido || ehConcluidoRaiz) && !p.devolvido;
            })}
            formatarDataExibicao={formatarDataExibicao}
            formatarMoeda={formatarMoeda}
            alternarDevolucao={alternarDevolucao}
            pedidoExpandido={pedidoExpandido}
            setPedidoExpandido={setPedidoExpandido}
            LinhaPedido={LinhaPedido}
            styles={styles}
            itensPorPagina={itensPorPagina}
          />
        )}

        {abaAtiva === 'catalogo' && <TabCatalogo rankingProdutos={inteligencia.rankingProdutos} formatarMoeda={formatarMoeda} styles={styles} />}
        {abaAtiva === 'sazonalidade' && <TabSazonalidade sazonalidade={inteligencia.sazonalidade} nomesMeses={inteligencia.nomesMeses} formatarMoeda={formatarMoeda} />}
        {abaAtiva === 'clientes' && <TabClientes clientesEstrela={inteligencia.clientesEstrela} formatarMoeda={formatarMoeda} styles={styles} />}

        {abaAtiva === 'lucro' && (
          <TabLucroReal
            faturamento={inteligencia.faturamento}
            custoTotal={inteligencia.custoTotal}
            lucroReal={inteligencia.lucroReal}
            despesaFreteLojista={inteligencia.despesaFreteLojista}
            despesasFixas={inteligencia.despesasFixas}
            despesasVariaveis={inteligencia.despesasVariaveis}
            formatarMoeda={formatarMoeda}
            evolucaoMensal={inteligencia.evolucaoPorAno}
          />
        )}

        {abaAtiva === 'precificacao' && (
          <div style={styles.precificacaoBox}>
            <div style={styles.precificacaoInputsForm}>
              <h4 style={{ margin: "0 0 15px 0", color: "#1e293b" }}>🔧 Componentes do Custo</h4>
              <div style={styles.formRowSimulador}>
                <label style={styles.labelSimulador}>Custo de Produção / Insumos (R$):</label>
                <input type="number" value={calcCustoInsumo} onChange={e => setCalcCustoInsumo(e.target.value)} style={styles.inputSimulador} />
              </div>
              <div style={styles.formRowSimulador}>
                <label style={styles.labelSimulador}>Margem de Lucro Desejada (%):</label>
                <input type="number" value={calcMargemDesejada} onChange={e => setCalcMargemDesejada(e.target.value)} style={styles.inputSimulador} />
              </div>
              <div style={styles.formRowSimulador}>
                <label style={styles.labelSimulador}>Impostos Federais/Estaduais (%):</label>
                <input type="number" value={calcImpostos} onChange={e => setCalcImpostos(e.target.value)} style={styles.inputSimulador} />
              </div>
              <div style={styles.formRowSimulador}>
                <label style={styles.labelSimulador}>Comissão do Marketplace (%):</label>
                <input type="number" value={calcTaxaMarketplace} onChange={e => setCalcTaxaMarketplace(e.target.value)} style={styles.inputSimulador} />
              </div>
            </div>

            <div style={styles.precificacaoResultCard}>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4f46e5", textTransform: "uppercase" }}>💰 PREÇO DE VENDA RECOMENDADO</span>
              <h2 style={styles.precoSugeridoGrande}>{simuladorPrecoSugerido > 0 ? formatarMoeda(simuladorPrecoSugerido) : "Ajuste as margens"}</h2>
              <div style={{ borderTop: "1px dashed #cbd5e1", marginTop: "15px", paddingTop: "15px", fontSize: "13px", color: "#475569" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Sobra Líquida ({calcMargemDesejada}%):</span>
                  <strong style={{ color: "#16a34a" }}>{formatarMoeda(simuladorPrecoSugerido * (Number(calcMargemDesejada) / 100))}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Reserva para Impostos ({calcImpostos}%):</span>
                  <span style={{ color: "#dc2626" }}>{formatarMoeda(simuladorPrecoSugerido * (Number(calcImpostos) / 100))}</span>
                </div>
                {Number(calcTaxaMarketplace) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Taxa da Plataforma ({calcTaxaMarketplace}%):</span>
                    <span style={{ color: "#e67e22" }}>{formatarMoeda(simuladorPrecoSugerido * (Number(calcTaxaMarketplace) / 100))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'canais' && recursosLiberados.temCanaisRenda && (
          <TabFaturamentoCanais
            canaisExternos={canaisExternos}
            faturamentoCatalogoProprio={inteligencia.faturamentoInternoPuro}
            formatarMoeda={formatarMoeda}
          />
        )}

        {abaAtiva === 'historico' && (
          <TabRelatorioHistorico pedidos={pedidos} formatarMoeda={formatarMoeda} />
        )}

        {abaAtiva === 'despesas' && recursosLiberados.temDespesas && (
          <TabDespesas lojistaId={lojistaId || ""} formatarMoeda={formatarMoeda} />
        )}

        {abaAtiva === 'devolucoes' && (
          <TabDevolucoes
            dadosFiltradosBusca={dadosFiltradosBusca}
            formatarDataExibicao={formatarDataExibicao}
            formatarMoeda={formatarMoeda}
            alternarDevolucao={alternarDevolucao}
            styles={styles}
          />
        )}
      </section>

      <button onClick={carregarDadosTeste} style={{ margin: '20px 0', padding: '10px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        🧪 Inserir Dados de Teste
      </button>

      <style jsx>{`
      :global(body), :global(html) {
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
      }
      .dashboard-page-container {
        box-sizing: border-box;
        margin-top: 0 !important;
        width: 100%;
        max-width: 100vw;
        overflow-x: hidden;
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
  page: { padding: '0px 16px 24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' },
  header: { marginBottom: '24px' },
  btnVoltar: { padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#334155' },

  filtrosCard: { display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px', alignItems: 'center' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', flex: 1, minWidth: '240px', outline: 'none', boxSizing: 'border-box' },
  inputDate: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', color: '#334155', boxSizing: 'border-box' },
  selectPaginacaoTopo: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff', color: '#334155', cursor: 'pointer', boxSizing: 'border-box', flexShrink: 0 },
  btnAtalho: { padding: '10px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#475569' },
  btnLimpar: { padding: '10px 16px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#ef4444', flexShrink: 0, boxSizing: 'border-box' },

  tabBar: { display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' },

  tab: { padding: '8px 14px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', fontWeight: '600', fontSize: '12px', borderRadius: '8px' },
  tabActive: { padding: '8px 14px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: '600', fontSize: '12px', borderRadius: '8px' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
  card: { backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  cardLabel: { fontSize: '12px', color: '#64748b', fontWeight: '500', display: 'block', marginBottom: '4px' },
  cardVal: { margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b' },
  section: { backgroundColor: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflowX: 'auto' },
  abaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #f8fafc' },
  infoTooltip: { width: '28px', height: '28px', borderRadius: '50%', border: 'none', backgroundColor: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  th: { padding: '14px', fontSize: '13px', color: '#475569', fontWeight: '700' },
  tr: { borderBottom: '1px solid #f8fafc' },
  td: { padding: '14px', fontSize: '14px', color: '#334155' },
  pedidoBadge: { backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', color: '#475569', fontSize: '13px' },
  btnDevolver: { padding: '6px 12px', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' },
  detalheBox: { padding: '16px', backgroundColor: '#f8fafc' },
  expandInfo: { backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  expandHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0', fontSize: '14px' },

  metaContainer: { backgroundColor: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #e2e8f0' },
  metaInfoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  metaMiniTitle: { fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.5px' },
  metaValores: { margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' },
  metaPercentBadge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700' },
  progressBarBg: { width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: '9999px', transition: 'width 0.4s ease-in-out' },
  metaMotivationText: { margin: '12px 0 0 0', fontSize: '13px', fontWeight: '500', color: '#475569' },
  btnMetaEdit: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0, marginLeft: '10px' },
  inputMetaEdit: { padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100px', fontSize: '13px', fontWeight: '600', outline: 'none' },
  btnMetaSalvar: { backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  btnMetaCancelar: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', padding: '0 4px' },

  precificacaoBox: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', padding: '4px 0' },
  precificacaoInputsForm: { backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  formRowSimulador: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' },
  labelSimulador: { fontSize: '12px', fontWeight: '600', color: '#475569' },
  inputSimulador: { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '600', color: '#1e293b', outline: 'none', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' },
  precificacaoResultCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '14px', border: '2px solid #1e293b', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  precoSugeridoGrande: { fontSize: '32px', margin: '8px 0', fontWeight: '900', color: '#1e293b', letterSpacing: '-1px' },
  finRow: { display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '13px' },
};