"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";

interface DespesaLojista {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: "fixa" | "variavel";
  categoria: string;
}

interface TabDespesasProps {
  lojistaId: string;
  formatarMoeda: (v: number) => string;
}

export function TabDespesas({ lojistaId, formatarMoeda }: TabDespesasProps) {
  const [despesas, setDespesas] = useState<DespesaLojista[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  
  // Estados do Formulário
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [tipo, setTipo] = useState<"fixa" | "variavel">("fixa");
  const [categoria, setCategoria] = useState("Infraestrutura");
  const [salvando, setSalvando] = useState(false);

  // 🔌 Escuta as despesas específicas deste lojista em tempo real
  useEffect(() => {
    if (!lojistaId) return;

    const q = query(collection(db, "lojistas", lojistaId, "despesas"), orderBy("data", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const dados = snap.docs.map(d => ({ id: d.id, ...d.data() })) as DespesaLojista[];
      setDespesas(dados);
      setLoading(false);
    });

    return () => unsub();
  }, [lojistaId]);

  // 🧮 Cálculos de Inteligência Financeira
  const totalGasto = despesas.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const totalFixas = despesas.filter(d => d.tipo === "fixa").reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const totalVariaveis = despesas.filter(d => d.tipo === "variavel").reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

  const handleSalvarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !valor || !data) return alert("Por favor, preencha todos os campos obrigatórios!");

    setSalvando(true);
    try {
      await addDoc(collection(db, "lojistas", lojistaId, "despesas"), {
        descricao,
        valor: Number(valor),
        data,
        tipo,
        categoria,
        criadoEm: new Date().toISOString()
      });

      // Reset do formulário
      setDescricao("");
      setValor("");
      setTipo("fixa");
      setCategoria("Infraestrutura");
      setModalAberto(false);
    } catch (error) {
      console.error("Erro ao salvar despesa do lojista:", error);
      alert("Erro ao salvar o lançamento.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id: string) => {
    if (confirm("Deseja realmente remover este lançamento de despesa?")) {
      try {
        await deleteDoc(doc(db, "lojistas", lojistaId, "despesas", id));
      } catch (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao excluir despesa.");
      }
    }
  };

  if (loading) return <div style={{ padding: "20px", color: "#64748b" }}>Carregando fluxo de despesas...</div>;

  return (
    <div style={{ padding: "10px 0" }}>
      
      {/* --- CARDS RESUMO FINANCEIRO --- */}
      <div style={localStyles.gridCards}>
        <div style={{ ...localStyles.card, borderLeft: "5px solid #ef4444" }}>
          <span style={localStyles.cardLabel}>Total em Saídas</span>
          <h2 style={{ ...localStyles.cardVal, color: "#ef4444" }}>{formatarMoeda(totalGasto)}</h2>
        </div>
        <div style={{ ...localStyles.card, borderLeft: "5px solid #4b5563" }}>
          <span style={localStyles.cardLabel}>Custos Fixos Totais</span>
          <h2 style={localStyles.cardVal}>{formatarMoeda(totalFixas)}</h2>
        </div>
        <div style={{ ...localStyles.card, borderLeft: "5px solid #f59e0b" }}>
          <span style={localStyles.cardLabel}>Custos Variáveis</span>
          <h2 style={localStyles.cardVal}>{formatarMoeda(totalVariaveis)}</h2>
        </div>
      </div>

      {/* --- BOTÃO DE AÇÃO --- */}
      <div style={localStyles.topoAcoes}>
        <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
          Lance custos fixos (aluguel, luz) ou variáveis (tráfego pago, manutenção) para deduzir na sua folha de <strong>Lucro Real</strong>.
        </p>
        <button onClick={() => setModalAberto(true)} style={localStyles.btnAdicionar}>
          ➕ Lançar Despesa
        </button>
      </div>

      {/* --- TABELA DE AUDITORIA --- */}
      <div style={localStyles.tableWrapper}>
        <table style={localStyles.table}>
          <thead>
            <tr style={localStyles.thRow}>
              <th style={localStyles.th}>Data</th>
              <th style={localStyles.th}>Descrição</th>
              <th style={localStyles.th}>Categoria</th>
              <th style={localStyles.th}>Tipo</th>
              <th style={localStyles.th}>Valor</th>
              <th style={{ ...localStyles.th, textAlign: "center" }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {despesas.map((d) => (
              <tr key={d.id} style={localStyles.tr}>
                <td style={localStyles.td}>{d.data.split("-").reverse().join("/")}</td>
                <td style={{ ...localStyles.td, fontWeight: "bold", color: "#1e293b" }}>{d.descricao}</td>
                <td style={localStyles.td}>
                  <span style={localStyles.tagCategoria}>{d.categoria}</span>
                </td>
                <td style={localStyles.td}>
                  <span style={{
                    ...localStyles.tagTipo,
                    background: d.tipo === "fixa" ? "#f3f4f6" : "#fffbeb",
                    color: d.tipo === "fixa" ? "#374151" : "#b45309"
                  }}>
                    {d.tipo.toUpperCase()}
                  </span>
                </td>
                <td style={{ ...localStyles.td, color: "#ef4444", fontWeight: "bold" }}>-{formatarMoeda(d.valor)}</td>
                <td style={{ ...localStyles.td, textAlign: "center" }}>
                  <button onClick={() => handleDeletar(d.id)} style={localStyles.btnDeletar}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {despesas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "14px" }}>
                  Nenhuma despesa operacional cadastrada neste período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL FLUTUANTE DE LANÇAMENTO --- */}
      {modalAberto && (
        <div style={localStyles.overlay}>
          <div style={localStyles.modalContent}>
            <div style={localStyles.modalHeader}>
              <h3 style={{ margin: 0, color: "#0f172a" }}>💸 Novo Lançamento Financeiro</h3>
              <button onClick={() => setModalAberto(false)} style={localStyles.btnFecharX}>✕</button>
            </div>
            
            <form onSubmit={handleSalvarDespesa} style={localStyles.form}>
              <div style={localStyles.field}>
                <label style={localStyles.label}>Descrição do Gasto *</label>
                <input type="text" placeholder="Ex: Conta de Luz, Compra de Papel Fotográfico..." value={descricao} onChange={e => setDescricao(e.target.value)} style={localStyles.input} required />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ ...localStyles.field, flex: 1 }}>
                  <label style={localStyles.label}>Valor (R$) *</label>
                  <input type="number" step="0.01" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} style={localStyles.input} required />
                </div>
                <div style={{ ...localStyles.field, flex: 1 }}>
                  <label style={localStyles.label}>Data do Pagamento *</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} style={localStyles.input} required />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ ...localStyles.field, flex: 1 }}>
                  <label style={localStyles.label}>Tipo de Custo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value as "fixa" | "variavel")} style={localStyles.select}>
                    <option value="fixa">🏢 Despesa Fixa</option>
                    <option value="variavel">🃏 Despesa Variável</option>
                  </select>
                </div>
                <div style={{ ...localStyles.field, flex: 1 }}>
                  <label style={localStyles.label}>Categoria</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} style={localStyles.select}>
                    <option value="Infraestrutura">🏠 Infraestrutura / Espaço</option>
                    <option value="Marketing">📢 Marketing / Anúncios</option>
                    <option value="Ferramentas">🛠️ Sistemas / Assinaturas</option>
                    <option value="Pessoal">👥 Pessoal / Retirada</option>
                    <option value="Outros">📦 Outros</option>
                  </select>
                </div>
              </div>

              <div style={localStyles.modalFooter}>
                <button type="button" onClick={() => setModalAberto(false)} style={localStyles.btnCancel}>Cancelar</button>
                <button type="submit" disabled={salvando} style={localStyles.btnSave}>
                  {salvando ? "Salvando..." : "Gravar Gasto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const localStyles: Record<string, React.CSSProperties> = {
  gridCards: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", marginBottom: "25px" },
  card: { background: "#fff", padding: "15px 20px", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" },
  cardLabel: { fontSize: "11px", color: "#888", fontWeight: "bold", textTransform: "uppercase" },
  cardVal: { fontSize: "22px", margin: "5px 0 0 0", fontWeight: "bold", color: "#1e293b" },
  topoAcoes: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "20px" },
  btnAdicionar: { background: "#4f46e5", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px", whiteSpace: "nowrap" },
  tableWrapper: { background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thRow: { background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" },
  th: { padding: "12px 20px", fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px 20px", fontSize: "14px", color: "#475569" },
  tagCategoria: { background: "#f1f5f9", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", color: "#475569", fontWeight: "500" },
  tagTipo: { padding: "3px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" },
  btnDeletar: { background: "none", border: "none", cursor: "pointer", fontSize: "14px", padding: "4px" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(3px)" },
  modalContent: { background: "#fff", padding: "25px", borderRadius: "12px", width: "100%", maxWidth: "520px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px", marginBottom: "15px" },
  btnFecharX: { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  field: { display: "flex", flexDirection: "column", gap: "4px" },
  label: { fontSize: "12px", fontWeight: "bold", color: "#475569" },
  input: { padding: "9px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" },
  select: { padding: "9px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff", outline: "none" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" },
  btnCancel: { background: "#f1f5f9", border: "none", padding: "9px 15px", borderRadius: "6px", color: "#475569", fontWeight: "bold", cursor: "pointer", fontSize: "13px" },
  btnSave: { background: "#4f46e5", border: "none", padding: "9px 15px", borderRadius: "6px", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }
};