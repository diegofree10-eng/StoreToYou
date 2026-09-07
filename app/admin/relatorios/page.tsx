// app/admin/relatorios/page.tsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "@/context/ThemeContext";
import { 
  FiBarChart2, FiDollarSign, FiShoppingCart, FiTrendingUp, 
  FiCalendar, FiPieChart, FiPackage, FiPrinter, FiSearch, FiArrowUp, FiArrowDown 
} from "react-icons/fi";

export default function RelatoriosPage() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [lojistaId, setLojistaId] = useState<string | null>(null);
  
  // Mês atual padrão no formato YYYY_M dinâmico (ex: 2026_9)
  const dataAtual = new Date();
  const [mesAno, setMesAno] = useState(`${dataAtual.getFullYear()}_${dataAtual.getMonth() + 1}`);

  // Lista dinâmica de meses para o select (últimos 12 meses)
  const listaMesesOpcoes = useMemo(() => {
    const meses = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const ano = d.getFullYear();
      const mes = d.getMonth() + 1;
      const nomeMes = d.toLocaleString('pt-BR', { month: 'long' });
      const nomeFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
      meses.push({
        valor: `${ano}_${mes}`,
        label: `${nomeFormatado} / ${ano}`
      });
      d.setMonth(d.getMonth() - 1);
    }
    return meses;
  }, []);

  const [stats, setStats] = useState<any>({
    faturamentoLiquido: 0,
    totalPedidos: 0,
    ticketMedio: 0,
    detalhamento: {},
    porFormaPagamento: {},
    porOrigem: {},
  });

  const [produtosRanking, setProdutosRanking] = useState<any[]>([]);
  const [todosPedidosMes, setTodosPedidosMes] = useState<any[]>([]);

  // Filtros avançados para a lista de pedidos do relatório
  const [filtroOrigem, setFiltroOrigem] = useState("todos");
  const [filtroEntrega, setFiltroEntrega] = useState("todos");
  const [buscaPedido, setBuscaPedido] = useState("");
  const [ordemLista, setOrdemLista] = useState<"recente" | "antigo">("recente"); // ✨ Novo estado de ordenação

  // 1. Identifica o lojista logado
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const lojaIdReal = data.lojaId;
          if (lojaIdReal) setLojistaId(lojaIdReal);
        }
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
      }
    });
    return () => unsub();
  }, []);

  // 2. Carrega estatísticas, ranking e pedidos do mês selecionado
  useEffect(() => {
    if (!lojistaId) return;

    async function carregarDadosRelatorio() {
      setLoading(true);
      try {
        // Busca estatísticas gerais do mês
        const statsRef = doc(db, `lojistas/${lojistaId}/dashboard_stats/${mesAno}`);
        const statsSnap = await getDoc(statsRef);

        if (statsSnap.exists()) {
          setStats(statsSnap.data());
        } else {
          setStats({
            faturamentoLiquido: 0,
            totalPedidos: 0,
            ticketMedio: 0,
            detalhamento: {},
            porFormaPagamento: {},
            porOrigem: {},
          });
        }

        // Busca o ranking de produtos do mês
        const produtosRef = collection(db, `lojistas/${lojistaId}/dashboard_stats/${mesAno}/produtos_ranking`);
        const produtosSnap = await getDocs(produtosRef);
        const listaProdutos = produtosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        listaProdutos.sort((a: any, b: any) => b.quantidadeVendida - a.quantidadeVendida);
        setProdutosRanking(listaProdutos);

        // Busca todos os pedidos reais do mês na coleção principal de pedidos para a nova listagem detalhada
        const pedidosRef = collection(db, `lojistas/${lojistaId}/pedidos`);
        const pedidosSnap = await getDocs(pedidosRef);
        
        // Filtra os pedidos do mês selecionado com suporte a múltiplos formatos de data (timestamp ou string)
        const [anoStr, mesStr] = mesAno.split("_");
        const listaPedidosFiltrados = pedidosSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((p: any) => {
          if (!p.data && !p.timestamp) return false;
          let rawData = p.timestamp || p.data;
          if (rawData && typeof rawData.toDate === "function") {
            rawData = rawData.toDate();
          }
          const dataPed = new Date(rawData);
          return !isNaN(dataPed.getTime()) && dataPed.getFullYear() === Number(anoStr) && (dataPed.getMonth() + 1) === Number(mesStr);
        });

        setTodosPedidosMes(listaPedidosFiltrados);

      } catch (error) {
        console.error("Erro ao carregar relatório:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarDadosRelatorio();
  }, [lojistaId, mesAno]);

  // Função auxiliar unificada para mapear corretamente a origem do pedido (PDV vs Site)
  const obterOrigemPedido = (p: any) => {
    const orig = String(
      p.dsOrigemPedido || 
      p.origemPedido || 
      p.dsOrigem || 
      p.origem || 
      "site"
    ).trim().toLowerCase();
    
    if (orig.includes("pdv") || orig.includes("caixa") || orig.includes("balcao")) {
      return "pdv";
    }
    return "site";
  };

  // Pedidos filtrados e ordenados dinamicamente na tabela
  const pedidosFiltradosTabela = useMemo(() => {
    const filtrados = todosPedidosMes.filter((p: any) => {
      const origem = obterOrigemPedido(p);
      const formaEntrega = String(p.logistica?.dsFormaEntrega || p.formaEntrega || "").trim().toLowerCase();
      
      const clienteObj = p.dsCliente || p.cliente || {};
      const clienteNome = typeof clienteObj === 'object' 
        ? String(clienteObj.nmNomeCliente || clienteObj.nome || clienteObj.dsNomeCliente || "").toLowerCase() 
        : String(clienteObj || "").toLowerCase();
      
      const numPed = String(p.numeroPedido || p.numero || p.nrPedido || p.id || "").toLowerCase();
      const termoBusca = buscaPedido.toLowerCase().trim();

      // Filtro por Origem
      if (filtroOrigem !== "todos" && origem !== filtroOrigem.toLowerCase()) {
        return false;
      }

      // Filtro por Forma de Entrega
      if (filtroEntrega !== "todos" && !formaEntrega.includes(filtroEntrega.toLowerCase())) {
        return false;
      }

      // Filtro por Termo de Busca (Nome ou Nº do Pedido)
      if (termoBusca && !clienteNome.includes(termoBusca) && !numPed.includes(termoBusca)) {
        return false;
      }

      return true;
    });

    // ✨ Ordenação por data (Mais Recentes / Mais Antigos)
    filtrados.sort((a: any, b: any) => {
      let rawA = a.timestamp || a.data;
      if (rawA && typeof rawA.toDate === "function") rawA = rawA.toDate();
      const tempoA = new Date(rawA).getTime() || 0;

      let rawB = b.timestamp || b.data;
      if (rawB && typeof rawB.toDate === "function") rawB = rawB.toDate();
      const tempoB = new Date(rawB).getTime() || 0;

      if (ordemLista === "recente") {
        return tempoB - tempoA; // Descrescente (Mais recente primeiro)
      } else {
        return tempoA - tempoB; // Crescente (Mais antigo primeiro)
      }
    });

    return filtrados;
  }, [todosPedidosMes, filtroOrigem, filtroEntrega, buscaPedido, ordemLista]);

  // Função para imprimir a listagem de pedidos
  const imprimirRelatorio = () => {
    window.print();
  };

  if (loading && !lojistaId) {
    return <div style={{ padding: "40px", color: theme.textMain }}>Carregando relatórios...</div>;
  }

  return (
    <div style={{ ...styles.container, background: theme.bgApp, color: theme.textMain }}>
      {/* Cabeçalho */}
      <div style={styles.header} className="no-print">
        <div>
          <h1 style={styles.title}>Relatórios e Desempenho</h1>
          <p style={{ color: theme.textSec, fontSize: "14px" }}>Acompanhe o faturamento, vendas e audite os pedidos da sua loja.</p>
        </div>

        {/* Seletor de Mês */}
        <div style={{ ...styles.filtroContainer, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <FiCalendar color="#fdb813" />
          <select 
            value={mesAno} 
            onChange={(e) => setMesAno(e.target.value)}
            style={{ ...styles.selectMes, background: theme.bgCard, color: theme.textMain }}
          >
            {listaMesesOpcoes.map((m) => (
              <option key={m.valor} value={m.valor}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div style={styles.gridCards} className="no-print">
        <div style={{ ...styles.card, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconBox, background: "#dcfce7", color: "#16a34a" }}><FiDollarSign size={22} /></div>
          <div>
            <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "700" }}>FATURAMENTO LÍQUIDO</span>
            <h2 style={styles.cardValue}>
              {Number(stats.faturamentoLiquido || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </h2>
          </div>
        </div>

        <div style={{ ...styles.card, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconBox, background: "#e0f2fe", color: "#0284c7" }}><FiShoppingCart size={22} /></div>
          <div>
            <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "700" }}>TOTAL DE PEDIDOS</span>
            <h2 style={styles.cardValue}>{stats.totalPedidos || 0}</h2>
          </div>
        </div>

        <div style={{ ...styles.card, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconBox, background: "#fef3c7", color: "#d97706" }}><FiTrendingUp size={22} /></div>
          <div>
            <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "700" }}>TICKET MÉDIO</span>
            <h2 style={styles.cardValue}>
              {Number(stats.ticketMedio || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </h2>
          </div>
        </div>
      </div>

      {/* Seção Detalhada (Pagamentos e Origem) */}
      <div style={styles.gridSecundario} className="no-print">
        <div style={{ ...styles.secaoBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <h3 style={styles.secaoTitulo}><FiPieChart /> Vendas por Forma de Pagamento</h3>
          {Object.keys(stats.porFormaPagamento || {}).length === 0 ? (
            <p style={{ color: theme.textSec, fontSize: "13px" }}>Nenhum registro para este período.</p>
          ) : (
            <ul style={styles.listaMetricas}>
              {Object.entries(stats.porFormaPagamento).map(([pag, qtd]: [string, any]) => (
                <li key={pag} style={{ ...styles.itemMetrica, borderBottom: `1px solid ${theme.border}` }}>
                  <span style={{ textTransform: "uppercase", fontWeight: "600" }}>{pag}</span>
                  <span style={styles.badgeQtd}>{qtd} pedidos</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ ...styles.secaoBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <h3 style={styles.secaoTitulo}><FiBarChart2 /> Pedidos por Origem</h3>
          {Object.keys(stats.porOrigem || {}).length === 0 ? (
            <p style={{ color: theme.textSec, fontSize: "13px" }}>Nenhum registro para este período.</p>
          ) : (
            <ul style={styles.listaMetricas}>
              {Object.entries(stats.porOrigem).map(([origem, qtd]: [string, any]) => (
                <li key={origem} style={{ ...styles.itemMetrica, borderBottom: `1px solid ${theme.border}` }}>
                  <span style={{ textTransform: "uppercase", fontWeight: "600" }}>{origem}</span>
                  <span style={styles.badgeQtd}>{qtd} pedidos</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Ranking de Produtos */}
      <div style={{ ...styles.secaoBoxGrande, background: theme.bgCard, border: `1px solid ${theme.border}` }} className="no-print">
        <h3 style={styles.secaoTitulo}><FiPackage /> Produtos Mais Vendidos no Mês</h3>
        {produtosRanking.length === 0 ? (
          <p style={{ color: theme.textSec, fontSize: "13px" }}>Nenhum produto vendido registrado neste mês.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.border}`, textAlign: "left", color: theme.textSec }}>
                  <th style={styles.th}>Produto</th>
                  <th style={styles.th}>Qtd Vendida</th>
                  <th style={styles.th}>Valor Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {produtosRanking.map((prod: any) => (
                  <tr key={prod.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td style={styles.td}>{prod.nome} {prod.variacao && prod.variacao !== "Padrão" ? `(${prod.variacao})` : ""}</td>
                    <td style={styles.td}><b>{prod.quantidadeVendida}</b> un</td>
                    <td style={styles.td}>
                      {Number(prod.valorTotalAcumulado || prod.valorLiquidoVendas || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Relatório Detalhado de Pedidos / Auditoria */}
      <div style={{ ...styles.secaoBoxGrande, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={styles.headerRelatorioPedidos}>
          <div>
            <h3 style={{ ...styles.secaoTitulo, margin: 0 }}><FiShoppingCart /> Relatório Analítico de Pedidos ({mesAno.replace("_", "/")})</h3>
            <p style={{ color: theme.textSec, fontSize: "13px", marginTop: "4px" }}>Filtre e analise todas as vendas realizadas (PDV, Site, Retirada, etc.).</p>
          </div>
          <button onClick={imprimirRelatorio} style={styles.btnImprimir} className="no-print">
            <FiPrinter size={16} /> Imprimir Relatório
          </button>
        </div>

        {/* Barra de Filtros da Tabela */}
        <div style={styles.barraFiltrosTabela} className="no-print">
          <div style={{ ...styles.inputGroup, background: theme.inputBg, border: `1px solid ${theme.border}` }}>
            <FiSearch color={theme.textSec} />
            <input 
              type="text"
              placeholder="Buscar por cliente ou nº do pedido..."
              value={buscaPedido}
              onChange={(e) => setBuscaPedido(e.target.value)}
              style={{ ...styles.inputBusca, color: theme.textMain }}
            />
          </div>

          <div style={styles.selectsFiltroGroup}>
            {/* ✨ Seletor de Ordenação */}
            <select 
              value={ordemLista} 
              onChange={(e) => setOrdemLista(e.target.value as any)}
              style={{ ...styles.selectFiltro, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
            >
              <option value="recente">🕒 Mais Recentes Primeiro</option>
              <option value="antigo">⏳ Mais Antigos Primeiro</option>
            </select>

            <select 
              value={filtroOrigem} 
              onChange={(e) => setFiltroOrigem(e.target.value)}
              style={{ ...styles.selectFiltro, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
            >
              <option value="todos">🌐 Todas as Origens</option>
              <option value="pdv">Caixa / PDV</option>
              <option value="site">Site / E-commerce</option>
            </select>

            <select 
              value={filtroEntrega} 
              onChange={(e) => setFiltroEntrega(e.target.value)}
              style={{ ...styles.selectFiltro, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
            >
              <option value="todos">📦 Todas as Entregas</option>
              <option value="retirada">Retirada na Loja</option>
              <option value="entrega_local">Entrega Local / Motoboy</option>
              <option value="correios">Correios / Transportadora</option>
            </select>
          </div>
        </div>

        {/* Tabela de Pedidos */}
        {pedidosFiltradosTabela.length === 0 ? (
          <p style={{ color: theme.textSec, fontSize: "13px", marginTop: "15px" }}>Nenhum pedido encontrado com os filtros selecionados.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "15px" }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.border}`, textAlign: "left", color: theme.textSec }}>
                  <th style={styles.th}>Nº Pedido</th>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Origem</th>
                  <th style={styles.th}>Forma Entrega</th>
                  <th style={styles.th}>Pagamento</th>
                  <th style={styles.th}>Total</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltradosTabela.map((p: any) => {
                  const num = p.numeroPedido || p.numero || p.nrPedido || p.nrNumeroPedido || p.id.slice(-6);
                  
                  const clienteObj = p.dsCliente || p.cliente || {};
                  const clienteNome = typeof clienteObj === 'object' 
                    ? (clienteObj.nmNomeCliente || clienteObj.nome || clienteObj.dsNomeCliente || "Cliente Sem Nome") 
                    : (clienteObj || "Cliente Sem Nome");

                  const origemIdentificada = obterOrigemPedido(p);
                  const origemLabel = origemIdentificada === "pdv" ? "PDV / CAIXA" : "SITE";
                  
                  const formaEntrega = String(p.logistica?.dsFormaEntrega || p.formaEntrega || "Padrão").toUpperCase();
                  const formaPgto = String(p.financeiro?.dsFormaPagamentoCarrinho || p.formaPagamento || "PIX").toUpperCase();
                  const total = Number(p.financeiro?.vlTotal || p.total || p.valorTotal || 0);
                  
                  let rawData = p.timestamp || p.data;
                  if (rawData && typeof rawData.toDate === "function") {
                    rawData = rawData.toDate();
                  }
                  const dataPedObj = rawData ? new Date(rawData) : null;
                  const dataFormatada = dataPedObj && !isNaN(dataPedObj.getTime()) 
                    ? dataPedObj.toLocaleDateString("pt-BR") + " " + dataPedObj.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }) 
                    : "-";

                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={styles.td}><b>#{num}</b></td>
                      <td style={styles.td}>{dataFormatada}</td>
                      <td style={styles.td}>{clienteNome}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badgeOrigem, background: origemIdentificada === "pdv" ? "#8b5cf6" : "#f59e0b" }}>
                          {origemLabel}
                        </span>
                      </td>
                      <td style={styles.td}>{formaEntrega}</td>
                      <td style={styles.td}>{formaPgto}</td>
                      <td style={styles.td}><b>{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          div {
            box-shadow: none !important;
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: "30px", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexWrap: "wrap", gap: "15px" },
  title: { fontSize: "24px", fontWeight: "800" },
  filtroContainer: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 15px", borderRadius: "10px" },
  selectMes: { border: "none", outline: "none", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  gridCards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "25px" },
  card: { padding: "20px", borderRadius: "15px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" },
  iconBox: { width: "45px", height: "45px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  cardValue: { fontSize: "20px", fontWeight: "800", marginTop: "4px" },
  gridSecundario: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "25px" },
  secaoBox: { padding: "20px", borderRadius: "15px" },
  secaoBoxGrande: { padding: "20px", borderRadius: "15px", marginBottom: "30px" },
  secaoTitulo: { fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" },
  listaMetricas: { listStyle: "none", padding: 0, margin: 0 },
  itemMetrica: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" },
  badgeQtd: { background: "#334155", color: "#fff", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "10px" },
  th: { padding: "12px", fontSize: "13px", fontWeight: "700" },
  td: { padding: "12px", fontSize: "14px" },
  headerRelatorioPedidos: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" },
  btnImprimir: { display: "flex", alignItems: "center", gap: "8px", background: "#0284c7", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13px" },
  barraFiltrosTabela: { display: "flex", gap: "15px", marginTop: "15px", flexWrap: "wrap", alignItems: "center" },
  inputGroup: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", flex: 1, minWidth: "260px" },
  inputBusca: { border: "none", outline: "none", background: "transparent", fontSize: "13px", width: "100%" },
  selectsFiltroGroup: { display: "flex", gap: "10px", flexWrap: "wrap" },
  selectFiltro: { padding: "9px 12px", borderRadius: "8px", fontSize: "13px", outline: "none", cursor: "pointer" },
  badgeOrigem: { color: "#fff", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }
};