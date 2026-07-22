"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TabCatalogo } from "./_tabsDashBoardLogista/TabCatalogo";

interface ItemPedido {
  id?: string;
  nome?: string;
  qty: number;
  preco?: number;
}

interface Pedido {
  id: string;
  data: string;
  cliente: any; // Mantido como any para aceitar string ou objeto
  numeroPedido: string | number;
  devolvido: boolean;
  financeiro: {
    total: number;
  };
  itens: ItemPedido[];
}

const formatarMoeda = (valor: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

// Helper para extrair o nome do cliente de forma segura
const getNomeCliente = (cliente: any) => {
  if (!cliente) return "Cliente";
  return typeof cliente === 'object' ? (cliente.nome || "Cliente") : String(cliente);
};

const LinhaPedidoBronze = React.memo(({ pedido, expandido, onExpandir, dataFormatada }: any) => {
  return (
    <React.Fragment>
      <tr style={{...styles.tr, background: expandido ? '#f0f7ff' : 'transparent', transition: '0.3s'}}>
        <td style={styles.td}>{dataFormatada}</td>
        <td style={{...styles.td, cursor: 'pointer', color: '#3498db', fontWeight: 'bold'}} onClick={() => onExpandir(pedido.id)}>
          👤 {getNomeCliente(pedido.cliente)} {expandido ? '🔼' : '🔽'}
        </td>
        <td style={styles.td}>{formatarMoeda(Number(pedido.financeiro?.total || 0))}</td>
      </tr>
      {expandido && (
        <tr>
          <td colSpan={3} style={styles.detalheBox}>
            <div style={styles.expandInfo}>
              <strong>Pedido: #{pedido.numeroPedido}</strong>
              <ul style={{margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#333'}}>
                {(pedido.itens || []).map((it: ItemPedido, idx: number) => (
                  <li key={idx}>
                    {Number(it.qty || 1)}x {it.nome || "Produto"}
                  </li>
                ))}
              </ul>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});
LinhaPedidoBronze.displayName = "LinhaPedidoBronze";

export function DashboardBronze({ pedidos }: { pedidos: Pedido[], dadosLojista?: any }) {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState("vendas"); 
  const [buscaNome, setBuscaNome] = useState("");
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);

  const parseDataPedido = useCallback((dataStr: string) => {
    if (!dataStr) return null;
    if (dataStr.includes("T") || dataStr.includes("-")) return new Date(dataStr);
    const [dia, mes, ano] = dataStr.split(",")[0].trim().split("/");
    return new Date(Number(ano), Number(mes) - 1, Number(dia), 12, 0, 0);
  }, []);

  const formatarDataExibicao = useCallback((dataStr: string) => {
    const dataObj = parseDataPedido(dataStr);
    if (!dataObj || isNaN(dataObj.getTime())) return dataStr?.split("T")[0] || "Data Inválida";
    return dataObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }, [parseDataPedido]);

  const inteligencia = useMemo(() => {
    const i = { faturamento: 0, totalPedidos: 0, rankingProdutos: {} as Record<string, any> };
    pedidos.forEach(p => {
      if (p.devolvido) return;
      i.faturamento += Number(p.financeiro?.total || 0);
      i.totalPedidos += 1;
      (p.itens || []).forEach((item: ItemPedido) => {
        const n = item.nome || "Produto Não Identificado";
        const q = Number(item.qty || 0);
        if (q > 0) {
          if (!i.rankingProdutos[n]) i.rankingProdutos[n] = { qtd: 0 };
          i.rankingProdutos[n].qtd += q;
        }
      });
    });
    return i;
  }, [pedidos]);

  const dadosFiltradosBusca = useMemo(() => {
    return pedidos.filter(p => !p.devolvido && (buscaNome === "" || getNomeCliente(p.cliente).toLowerCase().includes(buscaNome.toLowerCase())));
  }, [pedidos, buscaNome]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h1 style={{margin: 0, color: '#2c3e50'}}>📉 Painel de Controle (Bronze)</h1>
          <button onClick={() => router.back()} style={styles.btnVoltar}>⬅️ Voltar</button>
        </div>
        <div style={styles.filtrosCard}>
          <input type="text" placeholder="🔍 Filtrar por nome do cliente..." value={buscaNome} onChange={e => setBuscaNome(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.tabBar}>
          <button style={abaAtiva === 'vendas' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('vendas')}>PEDIDOS</button>
          <button style={abaAtiva === 'catalogo' ? styles.tabActive : styles.tab} onClick={() => setAbaAtiva('catalogo')}>PRODUTOS</button>
        </div>
      </header>

      <div style={styles.grid}>
        <div style={{...styles.card, borderLeft: '5px solid #2ecc71'}}><span style={styles.cardLabel}>Faturamento</span><h2 style={styles.cardVal}>{formatarMoeda(inteligencia.faturamento)}</h2></div>
        <div style={{...styles.card, borderLeft: '5px solid #3498db'}}><span style={styles.cardLabel}>Pedidos</span><h2 style={{...styles.cardVal, color: '#3498db'}}>{inteligencia.totalPedidos} un.</h2></div>
      </div>

      <section style={styles.section}>
        {abaAtiva === 'vendas' && (
           <table style={styles.table}>
             <thead><tr style={styles.thRow}><th style={styles.th}>Data</th><th style={styles.th}>Cliente</th><th style={styles.th}>Total</th></tr></thead>
             <tbody>
               {dadosFiltradosBusca.map(p => (
                 <LinhaPedidoBronze key={p.id} pedido={p} dataFormatada={formatarDataExibicao(p.data)} expandido={pedidoExpandido === p.id} onExpandir={(id: string) => setPedidoExpandido(pedidoExpandido === id ? null : id)} />
               ))}
               {dadosFiltradosBusca.length === 0 && (
                 <tr><td colSpan={3} style={{textAlign: 'center', padding: '30px', color: '#999'}}>Nenhum pedido encontrado.</td></tr>
               )}
             </tbody>
           </table>
        )}
        {abaAtiva === 'catalogo' && (
          <TabCatalogo rankingProdutos={inteligencia.rankingProdutos} formatarMoeda={formatarMoeda} styles={styles} />
        )}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "20px 40px", background: "#f4f7f6", minHeight: "100vh", fontFamily: "sans-serif" },
  btnVoltar: { padding: "8px 15px", borderRadius: '6px', border: 'none', background: '#2c3e50', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  filtrosCard: { background: '#fff', padding: '15px', borderRadius: '10px', display: 'flex', gap: '10px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  input: { padding: '8px', borderRadius: '5px', border: '1px solid #ddd', flex: 1, outline: 'none' },
  tabBar: { display: 'flex', gap: '5px', borderBottom: '2px solid #ddd', marginBottom: '20px' },
  tab: { padding: '10px 15px', cursor: 'pointer', color: '#666', background: 'none', border: 'none', borderBottom: '3px solid transparent', outline: 'none', transition: '0.2s', fontWeight: '500' },
  tabActive: { padding: '10px 15px', cursor: 'pointer', color: '#3498db', fontWeight: 'bold', background: 'none', border: 'none', borderBottom: '3px solid #3498db' },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 15, marginBottom: 20 },
  card: { background: "#fff", padding: "15px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" },
  cardLabel: { fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' },
  cardVal: { fontSize: '22px', margin: '5px 0 0 0', fontWeight: 'bold' },
  section: { background: "#fff", padding: "20px", borderRadius: "10px", minHeight: '400px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  table: { width: "100%", borderCollapse: "collapse" },
  thRow: { textAlign: 'left', borderBottom: '2px solid #f1f5f9' },
  th: { padding: "12px", fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' },
  tr: { borderBottom: '1px solid #eee' },
  td: { padding: "12px", fontSize: '14px', color: '#334155' },
  detalheBox: { padding: '10px 20px 20px 20px' },
  expandInfo: { padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }
};