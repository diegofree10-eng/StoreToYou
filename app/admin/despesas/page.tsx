// app/admin/_tabsDashBoardLogista/TabGestaoDespesas.tsx
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { useTheme } from "@/context/ThemeContext";
import { aplicarMascara } from "@/utils/formatters";
import { FiPlus, FiTrash2, FiEdit2, FiDollarSign, FiBox } from "react-icons/fi";
import { TabInsumosEmbalagem } from "./_tabsGestaoDespesas/TabInsumosEmbalagem";

interface Despesa {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
}

// Função auxiliar para evitar problemas de fuso horário em datas locais
const obterDataLocalHoje = () => {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

export function TabGestaoDespesas({ uid }: { uid: string }) {
  const { theme, isModoNoturno } = useTheme();

  const [subAba, setSubAba] = useState<"lancamentos" | "embalagens">("lancamentos");

  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("Operacional");
  const [valorFormatado, setValorFormatado] = useState("0,00");
  const [dataDespesa, setDataDespesa] = useState(obterDataLocalHoje());
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "lojistas", uid, "despesas_diversas"), orderBy("data", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Despesa[];
      setDespesas(lista);
    });
    return () => unsubscribe();
  }, [uid]);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValorFormatado(aplicarMascara(e.target.value, "dinheiro"));
  };

  const converterParaNumeroPuro = (valFmt: string): number => {
    if (!valFmt) return 0;
    const apenasDigitos = valFmt.replace(/\D/g, "");
    if (!apenasDigitos) return 0;
    return Number((parseInt(apenasDigitos, 10) / 100).toFixed(2));
  };

  const limparFormulario = () => {
    setEditId(null);
    setDescricao("");
    setCategoria("Operacional");
    setValorFormatado("0,00");
    setDataDespesa(obterDataLocalHoje());
  };

  const handleSalvarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !descricao.trim()) {
      alert("Informe a descrição da despesa.");
      return;
    }

    const valorNumerico = converterParaNumeroPuro(valorFormatado);
    if (valorNumerico <= 0) {
      alert("Informe um valor válido para a despesa.");
      return;
    }

    setLoading(true);
    try {
      if (editId) {
        await updateDoc(doc(db, "lojistas", uid, "despesas_diversas", editId), {
          descricao: descricao.trim(),
          categoria,
          valor: valorNumerico,
          data: dataDespesa,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, "lojistas", uid, "despesas_diversas"), {
          descricao: descricao.trim(),
          categoria,
          valor: valorNumerico,
          data: dataDespesa,
          createdAt: new Date().toISOString(),
        });
      }
      limparFormulario();
    } catch (error: any) {
      alert("Erro ao salvar despesa: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (d: Despesa) => {
    setEditId(d.id);
    setDescricao(d.descricao);
    setCategoria(d.categoria || "Operacional");
    setDataDespesa(d.data || obterDataLocalHoje());
    const centavos = Math.round(d.valor * 100).toString();
    setValorFormatado(aplicarMascara(centavos, "dinheiro"));
  };

  const handleExcluir = async (id: string) => {
    if (!uid) return;
    if (confirm("Tem certeza que deseja excluir este registro de despesa?")) {
      try {
        await deleteDoc(doc(db, "lojistas", uid, "despesas_diversas", id));
      } catch (error: any) {
        alert("Erro ao excluir: " + error.message);
      }
    }
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

  const totalDespesas = despesas.reduce((acc, item) => acc + (item.valor || 0), 0);

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", paddingBottom: "40px" }}>
      
      {/* HEADER DA PÁGINA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
        <div>
          <h2 style={{ margin: "0 0 5px 0", fontSize: "20px", fontWeight: "bold", color: theme.textMain, display: "flex", alignItems: "center", gap: "10px" }}>
            <FiDollarSign color={theme.primary} /> Gestão de Despesas & Custos
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: theme.textSec }}>
            Controle os gastos do seu negócio e gerencie insumos de embalagens em um só lugar.
          </p>
        </div>

        {/* CARD DE TOTAL GASTO */}
        <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, padding: "10px 20px", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: "11px", color: theme.textSec, fontWeight: "700", textTransform: "uppercase" }}>Total de Despesas Lançadas</span>
          <span style={{ fontSize: "18px", fontWeight: "800", color: "#ef4444" }}>{formatarMoeda(totalDespesas)}</span>
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE SUB-ABAS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: `1px solid ${theme.border}`, paddingBottom: "10px" }}>
        <button
          onClick={() => setSubAba("lancamentos")}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: subAba === "lancamentos" ? "none" : `1px solid ${theme.border}`,
            backgroundColor: subAba === "lancamentos" ? theme.primary : theme.bgCard,
            color: subAba === "lancamentos" ? "#ffffff" : theme.textMain,
            fontWeight: "700",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FiDollarSign size={16} /> Lançamentos de Despesas
        </button>

        <button
          onClick={() => setSubAba("embalagens")}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: subAba === "embalagens" ? "none" : `1px solid ${theme.border}`,
            backgroundColor: subAba === "embalagens" ? theme.primary : theme.bgCard,
            color: subAba === "embalagens" ? "#ffffff" : theme.textMain,
            fontWeight: "700",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FiBox size={16} /> Insumos & Embalagens
        </button>
      </div>

      {/* CONTEÚDO DA SUB-ABA: LANÇAMENTOS DE DESPESAS */}
      {subAba === "lancamentos" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px", alignItems: "start" }}>
          
          {/* FORMULÁRIO DE LANÇAMENTO */}
          <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, padding: "20px", borderRadius: "12px" }}>
            <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", color: theme.textMain, fontWeight: "700" }}>
              {editId ? "✏️ Editar Despesa" : "➕ Nova Despesa"}
            </h4>

            <form onSubmit={handleSalvarDespesa} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: theme.textSec }}>
                  Descrição / Nome do Gasto:
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Conta de Luz, Aluguel, Internet"
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: "8px",
                    border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg,
                    color: theme.textMain, fontSize: "14px", outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: theme.textSec }}>
                    Categoria:
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: "8px",
                      border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg,
                      color: theme.textMain, fontSize: "13px", outline: "none", boxSizing: "border-box"
                    }}
                  >
                    <option value="Operacional">Operacional (Aluguel, Luz...)</option>
                    <option value="Marketing">Marketing / Tráfego</option>
                    <option value="Fornecedores">Fornecedores / Mercadoria</option>
                    <option value="Logistica">Logística / Fretes</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: theme.textSec }}>
                    Data:
                  </label>
                  <input
                    type="date"
                    value={dataDespesa}
                    onChange={(e) => setDataDespesa(e.target.value)}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: "8px",
                      border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg,
                      color: theme.textMain, fontSize: "13px", outline: "none", boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: theme.textSec }}>
                  Valor (R$):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={valorFormatado}
                  onChange={handleValorChange}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: "8px",
                    border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg,
                    color: theme.textMain, fontSize: "14px", outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                {editId && (
                  <button
                    type="button"
                    onClick={limparFormulario}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${theme.border}`,
                      background: theme.inputBg, color: theme.textMain, cursor: "pointer", fontWeight: "600", fontSize: "13px"
                    }}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2, padding: "10px", borderRadius: "8px", border: "none",
                    background: theme.primary, color: "#ffffff", cursor: "pointer", fontWeight: "700", fontSize: "13px"
                  }}
                >
                  {loading ? "Salvando..." : editId ? "Atualizar Despesa" : "Lançar Despesa"}
                </button>
              </div>
            </form>
          </div>

          {/* LISTAGEM DE DESPESAS */}
          <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, padding: "20px", borderRadius: "12px" }}>
            <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", color: theme.textMain, fontWeight: "700" }}>
              📋 Histórico de Despesas ({despesas.length})
            </h4>

            {despesas.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "450px", overflowY: "auto" }}>
                {despesas.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 14px", borderRadius: "8px",
                      backgroundColor: isModoNoturno ? "#0f172a" : "#f8fafc",
                      border: `1px solid ${theme.border}`
                    }}
                  >
                    <div>
                      <span style={{ display: "block", fontWeight: "700", fontSize: "14px", color: theme.textMain }}>
                        {item.descricao}
                      </span>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "3px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: theme.border, color: theme.textMain }}>
                          {item.categoria}
                        </span>
                        <span style={{ fontSize: "11px", color: theme.textSec }}>
                          {item.data ? item.data.split("-").reverse().join("/") : ""}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "800", color: "#ef4444" }}>
                        {formatarMoeda(item.valor)}
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => handleEditar(item)}
                          title="Editar"
                          style={{ padding: "6px 8px", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, cursor: "pointer" }}
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleExcluir(item.id)}
                          title="Excluir"
                          style={{ padding: "6px 8px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#ef4444", cursor: "pointer" }}
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: theme.textSec, fontSize: "13px" }}>
                Nenhuma despesa lançada ainda. Utilize o formulário ao lado para registrar os gastos.
              </div>
            )}
          </div>

        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA: INSUMOS E EMBALAGENS */}
      {subAba === "embalagens" && (
        <TabInsumosEmbalagem uid={uid} />
      )}

    </div>
  );
}

export default TabGestaoDespesas;