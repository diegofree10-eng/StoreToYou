"use client";

import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

interface ModalNovaDespesaProps {
  isOpen: boolean;
  onClose: () => void;
  lojistaId: string;
  onSucesso: () => void; // Para avisar o dashboard pai para recarregar as despesas
}

export function ModalNovaDespesa({ isOpen, onClose, lojistaId, onSucesso }: ModalNovaDespesaProps) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]); // Inicia com a data de hoje
  const [tipo, setTipo] = useState<"fixa" | "variavel">("fixa");
  const [categoria, setCategoria] = useState("Infraestrutura");
  const [salvando, setSalvando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !valor || !data) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSalvando(true);

    try {
      // Gravação limpa na subcoleção de despesas do lojista
      await addDoc(collection(db, "lojistas", lojistaId, "despesas"), {
        descricao,
        valor: Number(valor),
        data,
        tipo,
        categoria,
        criadoEm: new Date().toISOString()
      });

      // Limpa o formulário
      setDescricao("");
      setValor("");
      setTipo("fixa");
      
      onSucesso();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
      alert("Erro ao salvar a despesa. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.content}>
        <div style={modalStyles.header}>
          <h3 style={{ margin: 0, color: "#1e293b" }}>💸 Lançar Nova Despesa</h3>
          <button onClick={onClose} style={modalStyles.btnCloseX}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>Descrição do Gasto *</label>
            <input type="text" placeholder="Ex: Conta de internet, Aluguel, Tráfego Pago..." value={descricao} onChange={e => setDescricao(e.target.value)} style={modalStyles.input} required />
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ ...modalStyles.field, flex: 1 }}>
              <label style={modalStyles.label}>Valor (R$) *</label>
              <input type="number" step="0.01" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} style={modalStyles.input} required />
            </div>

            <div style={{ ...modalStyles.field, flex: 1 }}>
              <label style={modalStyles.label}>Data de Vencimento/Pago *</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} style={modalStyles.input} required />
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ ...modalStyles.field, flex: 1 }}>
              <label style={modalStyles.label}>Tipo de Despesa</label>
              <select value={tipo} onChange={e => setTipo(e.target.value as "fixa" | "variavel")} style={modalStyles.select}>
                <option value="fixa">🏢 Fixa (Todo mês tem)</option>
                <option value="variavel">🃏 Variável (Eventual / Oscila)</option>
              </select>
            </div>

            <div style={{ ...modalStyles.field, flex: 1 }}>
              <label style={modalStyles.label}>Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} style={modalStyles.select}>
                <option value="Infraestrutura">🏠 Infraestrutura / Espaço</option>
                <option value="Marketing">📢 Marketing / Anúncios</option>
                <option value="Ferramentas">🛠️ Sistemas / Ferramentas</option>
                <option value="Pessoal">👥 Pessoal / Pró-labore</option>
                <option value="Outros">📦 Outros</option>
              </select>
            </div>
          </div>

          <div style={modalStyles.footer}>
            <button type="button" onClick={onClose} disabled={salvando} style={modalStyles.btnCancelar}>Cancelar</button>
            <button type="submit" disabled={salvando} style={modalStyles.btnSalvar}>
              {salvando ? "🔄 Salvando..." : "💾 Salvar Despesa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" },
  content: { background: "#fff", padding: "25px", borderRadius: "12px", width: "100%", maxWidth: "550px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "15px" },
  btnCloseX: { background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: "#94a3b8" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  field: { display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "12px", fontWeight: "bold", color: "#475569" },
  input: { padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px" },
  select: { padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#fff" },
  footer: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px", borderTop: "1px solid #f1f5f9", paddingTop: "15px" },
  btnCancelar: { padding: "10px 16px", background: "#f1f5f9", border: "none", borderRadius: "6px", cursor: "pointer", color: "#475569", fontWeight: "600", fontSize: "13px" },
  btnSalvar: { padding: "10px 16px", background: "#4f46e5", border: "none", borderRadius: "6px", cursor: "pointer", color: "#fff", fontWeight: "600", fontSize: "13px" }
};