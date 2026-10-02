// app/admin/relatorios/page.tsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTheme } from "@/context/ThemeContext";
import { 
  FiBarChart2, FiDollarSign, FiShoppingCart, FiTrendingUp, 
  FiCalendar, FiPieChart, FiPackage, FiPrinter, FiSearch, FiDownload, FiChevronLeft, FiChevronRight 
} from "react-icons/fi";

export default function RelatoriosPage() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [lojistaId, setLojistaId] = useState<string | null>(null);
  
  // Mês atual padrão dinâmico baseado no nome do mês (ex: setembro_2026)
  const dataAtual = new Date();
  const nomeMesAtual = dataAtual.toLocaleString('pt-BR', { month: 'long' }).toLowerCase();
  const [mesAno, setMesAno] = useState(`${nomeMesAtual}_${dataAtual.getFullYear()}`);

  // Lista dinâmica de meses para o select correspondente ao formato do banco (ex: setembro_2026)
  const listaMesesOpcoes = useMemo(() => {
    const meses = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const ano = d.getFullYear();
      const nomeMes = d.toLocaleString('pt-BR', { month: 'long' }).toLowerCase();
      const nomeFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
      meses.push({
        valor: `${nomeMes}_${ano}`,
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

  const [filtroOrigem, setFiltroOrigem] = useState("todos");
  const [filtroEntrega, setFiltroEntrega] = useState("todos");
  const [buscaPedido, setBuscaPedido] = useState("");
  const [ordemLista, setOrdemLista] = useState<"recente" | "antigo">("recente");

  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

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
        console.error("Erro ao buscar utilizador:", error);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!lojistaId) return;

    async function carregarDadosRelatorio() {
      setLoading(true);
      setPaginaAtual(1);
      try {
        // Busca o documento estatístico correto (ex: setembro_2026)
        const statsRef = doc(db, `lojistas/${lojistaId}/dashboard_stats/${mesAno}`);
        const statsSnap = await getDoc(statsRef);

        let dadosStatsCache: any = null;
        if (statsSnap.exists()) {
          dadosStatsCache = statsSnap.data();
          setStats({
            faturamentoLiquido: dadosStatsCache.receitaLiquida || dadosStatsCache.faturamentoLiquido || 0,
            totalPedidos: dadosStatsCache.totalPedidos || 0,
            ticketMedio: dadosStatsCache.ticketMedio || 0,
            detalhamento: dadosStatsCache.detalhamento || {},
            porFormaPagamento: dadosStatsCache.porFormaPagamento || {},
            porOrigem: dadosStatsCache.porOrigem || {},
          });

          // Pega o ranking de produtos diretamente do array do documento ou da subcoleção
          if (dadosStatsCache.produtosRanking && Array.isArray(dadosStatsCache.produtosRanking)) {
            setProdutosRanking(dadosStatsCache.produtosRanking);
          } else {
            const produtosRef = collection(db, `lojistas/${lojistaId}/dashboard_stats/${mesAno}/produtos_ranking`);
            const produtosSnap = await getDocs(produtosRef);
            const listaProdutos = produtosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            listaProdutos.sort((a: any, b: any) => b.quantidadeVendida - a.quantidadeVendida);
            setProdutosRanking(listaProdutos);
          }
        } else {
          setStats({
            faturamentoLiquido: 0,
            totalPedidos: 0,
            ticketMedio: 0,
            detalhamento: {},
            porFormaPagamento: {},
            porOrigem: {},
          });
          setProdutosRanking([]);
        }

        // Carrega também os pedidos reais do mês para a tabela analítica inferior
        const [nomeMesStr, anoStr] = mesAno.split("_");
        // Mapeia o nome do mês para número para comparar com a data do pedido
        const mesesMap: any = { janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11 };
        const numMes = mesesMap[nomeMesStr.toLowerCase()] ?? 8;

        const pedidosRef = collection(db, `lojistas/${lojistaId}/pedidos`);
        const allSnap = await getDocs(pedidosRef);
        
        const listaPedidosFiltrados = allSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((p: any) => {
          let rawData = p.timestamp || p.data;
          if (!rawData) return false;
          if (typeof rawData.toDate === "function") rawData = rawData.toDate();
          const dataPed = new Date(rawData);
          return !isNaN(dataPed.getTime()) && dataPed.getFullYear() === Number(anoStr) && dataPed.getMonth() === numMes;
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

  const obterOrigemPedido = (p: any) => {
    const orig = String(p.dsOrigemPedido || p.origemPedido || p.dsOrigem || p.origem || "site").trim().toLowerCase();
    if (orig.includes("pdv") || orig.includes("caixa") || orig.includes("balcao")) return "pdv";
    return "site";
  };

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

      if (filtroOrigem !== "todos" && origem !== filtroOrigem.toLowerCase()) return false;
      if (filtroEntrega !== "todos" && !formaEntrega.includes(filtroEntrega.toLowerCase())) return false;
      if (termoBusca && !clienteNome.includes(termoBusca) && !numPed.includes(termoBusca)) return false;

      return true;
    });

    filtrados.sort((a: any, b: any) => {
      let rawA = a.timestamp || a.data;
      if (rawA && typeof rawA.toDate === "function") rawA = rawA.toDate();
      const tempoA = new Date(rawA).getTime() || 0;

      let rawB = b.timestamp || b.data;
      if (rawB && typeof rawB.toDate === "function") rawB = rawB.toDate();
      const tempoB = new Date(rawB).getTime() || 0;

      return ordemLista === "recente" ? tempoB - tempoA : tempoA - tempoB;
    });

    return filtrados;
  }, [todosPedidosMes, filtroOrigem, filtroEntrega, buscaPedido, ordemLista]);

  const totalPaginas = Math.ceil(pedidosFiltradosTabela.length / itensPorPagina) || 1;
  const pedidosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return pedidosFiltradosTabela.slice(inicio, inicio + itensPorPagina);
  }, [pedidosFiltradosTabela, paginaAtual]);

  const imprimirRelatorio = () => { window.print(); };

  const exportarParaCSV = () => {
    if (pedidosFiltradosTabela.length === 0) {
      alert("Nenhum pedido para exportar com os filtros atuais.");
      return;
    }

    const cabecalho = ["NumeroPedido", "Data", "Cliente", "Origem", "FormaEntrega", "Pagamento", "Total"];
    const linhas = pedidosFiltradosTabela.map((p: any) => {
      const num = p.numeroPedido || p.numero || p.nrPedido || p.id.slice(-6);
      const clienteObj = p.dsCliente || p.cliente || {};
      const clienteNome = typeof clienteObj === 'object' ? (clienteObj.nmNomeCliente || clienteObj.nome || "Cliente") : clienteObj;
      const origem = obterOrigemPedido(p);
      const entrega = p.logistica?.dsFormaEntrega || p.formaEntrega || "Padrão";
      const pgto = p.financeiro?.dsFormaPagamentoCarrinho || p.formaPagamento || "PIX";
      const total = Number(p.financeiro?.vlTotal || p.total || 0).toFixed(2);

      return [num, `"${clienteNome}"`, `"${origem}"`, `"${entrega}"`, `"${pgto}"`, total];
    });

    const conteudoCSV = [cabecalho.join(";"), ...linhas.map(l => l.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_pedidos_${mesAno}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !lojistaId) {
    return <div style={{ padding: "40px", color: theme.textMain }}>A carregar relatórios...</div>;
  }

  return (
    <div style={{ ...styles.container, background: theme.bgApp, color: theme.textMain }}>
      <div style={styles.header} className="no-print">
        <div>
          <h1 style={styles.title}>Relatórios e Desempenho</h1>
          <p style={{ color: theme.textSec, fontSize: "14px" }}>Acompanhe o faturamento, vendas e audite os pedidos da sua loja.</p>
        </div>

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

      <div style={styles.gridSecundario} className="no-print">
        <div style={{ ...styles.secaoBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <h3 style={styles.secaoTitulo}><FiPieChart /> Vendas por Forma de Pagamento</h3>
          {Object.keys(stats.porFormaPagamento || {}).length === 0 ? (
            <p style={{ color: theme.textSec, fontSize: "13px" }}>Nenhum registo para este período.</p>
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
            <p style={{ color: theme.textSec, fontSize: "13px" }}>Nenhum registo para este período.</p>
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

      <div style={{ ...styles.secaoBoxGrande, background: theme.bgCard, border: `1px solid ${theme.border}` }} className="no-print">
        <h3 style={styles.secaoTitulo}><FiPackage /> Produtos Mais Vendidos no Mês</h3>
        {produtosRanking.length === 0 ? (
          <p style={{ color: theme.textSec, fontSize: "13px" }}>Nenhum produto vendido registado neste mês.</p>
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
                  <tr key={prod.id || prod.nome} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td style={styles.td}>{prod.nome} {prod.variacao && prod.variacao !== "Padrão" ? `(${prod.variacao})` : ""}</td>
                    <td style={styles.td}><b>{prod.quantidadeVendida}</b> un</td>
                    <td style={styles.td}>
                      {Number(prod.valorTotalAcumulado || prod.valorLiquidoVendas || prod.valorBrutoVendas || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...styles.secaoBoxGrande, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={styles.headerRelatorioPedidos}>
          <div>
            <h3 style={{ ...styles.secaoTitulo, margin: 0 }}><FiShoppingCart /> Relatório Analítico de Pedidos ({mesAno.replace("_", " ")})</h3>
            <p style={{ color: theme.textSec, fontSize: "13px", marginTop: "4px" }}>Filtre e analise todas as vendas realizadas (PDV, Site, Retirada, etc.).</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }} className="no-print">
            <button onClick={exportarParaCSV} style={styles.btnExportar}>
              <FiDownload size={16} /> Exportar CSV
            </button>
            <button onClick={imprimirRelatorio} style={styles.btnImprimir}>
              <FiPrinter size={16} /> Imprimir
            </button>
          </div>
        </div>

        <div style={styles.barraFiltrosTabela} className="no-print">
          <div style={{ ...styles.inputGroup, background: theme.inputBg, border: `1px solid ${theme.border}` }}>
            <FiSearch color={theme.textSec} />
            <input 
              type="text"
              placeholder="Pesquisar por cliente ou nº do pedido..."
              value={buscaPedido}
              onChange={(e) => { setBuscaPedido(e.target.value); setPaginaAtual(1); }}
              style={{ ...styles.inputBusca, color: theme.textMain }}
            />
          </div>

          <div style={styles.selectsFiltroGroup}>
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
              onChange={(e) => { setFiltroOrigem(e.target.value); setPaginaAtual(1); }}
              style={{ ...styles.selectFiltro, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
            >
              <option value="todos">🌐 Todas as Origens</option>
              <option value="pdv">Caixa / PDV</option>
              <option value="site">Site / E-commerce</option>
            </select>

            <select 
              value={filtroEntrega} 
              onChange={(e) => { setFiltroEntrega(e.target.value); setPaginaAtual(1); }}
              style={{ ...styles.selectFiltro, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
            >
              <option value="todos">📦 Todas as Entregas</option>
              <option value="retirada">Retirada na Loja</option>
              <option value="entrega_local">Entrega Local / Motoboy</option>
              <option value="correios">Correios / Transportadora</option>
            </select>
          </div>
        </div>

        {pedidosFiltradosTabela.length === 0 ? (
          <p style={{ color: theme.textSec, fontSize: "13px", marginTop: "15px" }}>Nenhum pedido encontrado com os filtros selecionados.</p>
        ) : (
          <>
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
                  {pedidosPaginados.map((p: any) => {
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
                    if (rawData && typeof rawData.toDate === "function") rawData = rawData.toDate();
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

            <div style={styles.paginacaoContainer} className="no-print">
              <span style={{ fontSize: "13px", color: theme.textSec }}>
                A mostrar {(paginaAtual - 1) * itensPorPagina + 1} a {Math.min(paginaAtual * itensPorPagina, pedidosFiltradosTabela.length)} de {pedidosFiltradosTabela.length} pedidos
              </span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button 
                  onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                  disabled={paginaAtual === 1}
                  style={{ ...styles.btnPaginacao, opacity: paginaAtual === 1 ? 0.5 : 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
                >
                  <FiChevronLeft /> Anterior
                </button>
                <span style={{ fontSize: "13px", fontWeight: "600" }}>{paginaAtual} / {totalPaginas}</span>
                <button 
                  onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
                  disabled={paginaAtual === totalPaginas}
                  style={{ ...styles.btnPaginacao, opacity: paginaAtual === totalPaginas ? 0.5 : 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
                >
                  Próxima <FiChevronRight />
                </button>
              </div>
            </div>
          </>
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
  btnExportar: { display: "flex", alignItems: "center", gap: "8px", background: "#10b981", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13px" },
  barraFiltrosTabela: { display: "flex", gap: "15px", marginTop: "15px", flexWrap: "wrap", alignItems: "center" },
  inputGroup: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", flex: 1, minWidth: "260px" },
  inputBusca: { border: "none", outline: "none", background: "transparent", fontSize: "13px", width: "100%" },
  selectsFiltroGroup: { display: "flex", gap: "10px", flexWrap: "wrap" },
  selectFiltro: { padding: "9px 12px", borderRadius: "8px", fontSize: "13px", outline: "none", cursor: "pointer" },
  badgeOrigem: { color: "#fff", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" },
  paginacaoContainer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", flexWrap: "wrap", gap: "10px", paddingTop: "15px", borderTop: "1px solid rgba(0,0,0,0.05)" },
  btnPaginacao: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }
};