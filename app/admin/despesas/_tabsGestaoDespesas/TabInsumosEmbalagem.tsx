// app/admin/_tabsDashBoardLogista/_tabsGestaoDespesas/TabInsumosEmbalagem.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { useTheme } from "@/context/ThemeContext";
import { aplicarMascara } from "@/utils/formatters";
import { FiTrash2, FiEdit2, FiBox, FiHelpCircle } from "react-icons/fi";

interface Insumo {
  id: string;
  dsNomeInsumo: string;
  dsTipoInsumo: string;
  vlCustoInsumo: number;
  nrLarguraMaxInsumo: number;
  nrComprimentoMaxInsumo: number;
  nrAlturaMaxInsumo: number;
  nrVolumeMaxInsumo: number;
  dsObservacaoInsumo?: string;
}

export function TabInsumosEmbalagem({ uid }: { uid: string }) {
  const { theme, isModoNoturno } = useTheme();

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [dsNomeInsumo, setDsNomeInsumo] = useState("");
  const [dsTipoInsumo, setDsTipoInsumo] = useState("envelope_seguranca");
  const [vlCustoFormatado, setVlCustoFormatado] = useState("0,00");
  const [nrLarguraMaxInsumo, setNrLarguraMaxInsumo] = useState("");
  const [nrComprimentoMaxInsumo, setNrComprimentoMaxInsumo] = useState("");
  const [nrAlturaMaxInsumo, setNrAlturaMaxInsumo] = useState("");
  const [dsObservacaoInsumo, setDsObservacaoInsumo] = useState("");
  
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarAjudaDimensoes, setMostrarAjudaDimensoes] = useState(false);

  // Calcula o volume em tempo real para exibir no formulário
  const volumeCalculadoPreview = useMemo(() => {
    const l = Number(nrLarguraMaxInsumo) || 0;
    const c = Number(nrComprimentoMaxInsumo) || 0;
    const a = Number(nrAlturaMaxInsumo) || 0;
    return l * c * a;
  }, [nrLarguraMaxInsumo, nrComprimentoMaxInsumo, nrAlturaMaxInsumo]);

  // Carrega os insumos do lojista em tempo real
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "lojistas", uid, "insumos_embalagem"), orderBy("dsNomeInsumo", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          dsNomeInsumo: data.dsNomeInsumo || data.nome || "",
          dsTipoInsumo: data.dsTipoInsumo || data.tipo || "envelope_seguranca",
          vlCustoInsumo: Number(data.vlCustoInsumo ?? data.custo ?? 0),
          nrLarguraMaxInsumo: Number(data.nrLarguraMaxInsumo ?? data.larguraMax ?? 0),
          nrComprimentoMaxInsumo: Number(data.nrComprimentoMaxInsumo ?? data.comprimentoMax ?? 0),
          nrAlturaMaxInsumo: Number(data.nrAlturaMaxInsumo ?? data.alturaMax ?? 0),
          nrVolumeMaxInsumo: Number(data.nrVolumeMaxInsumo ?? data.volume ?? 0),
          dsObservacaoInsumo: data.dsObservacaoInsumo || data.observacao || "",
        };
      }) as Insumo[];
      setInsumos(lista);
    });
    return () => unsubscribe();
  }, [uid]);

  const handleCustoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVlCustoFormatado(aplicarMascara(e.target.value, "dinheiro"));
  };

  const converterParaNumeroPuro = (valorFormatado: string): number => {
    if (!valorFormatado) return 0;
    const apenasDigitos = valorFormatado.replace(/\D/g, "");
    if (!apenasDigitos) return 0;
    return Number((parseInt(apenasDigitos, 10) / 100).toFixed(2));
  };

  const limparFormulario = () => {
    setEditId(null);
    setDsNomeInsumo("");
    setDsTipoInsumo("envelope_seguranca");
    setVlCustoFormatado("0,00");
    setNrLarguraMaxInsumo("");
    setNrComprimentoMaxInsumo("");
    setNrAlturaMaxInsumo("");
    setDsObservacaoInsumo("");
  };

  const handleSalvarInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !dsNomeInsumo.trim()) {
      alert("Informe o nome do insumo/embalagem.");
      return;
    }

    const vlCustoNumerico = converterParaNumeroPuro(vlCustoFormatado);
    const larguraNum = Number(nrLarguraMaxInsumo) || 0;
    const comprimentoNum = Number(nrComprimentoMaxInsumo) || 0;
    const alturaNum = Number(nrAlturaMaxInsumo) || 0;
    const volumeCalculadoFinal = larguraNum * comprimentoNum * alturaNum;

    setLoading(true);

    const dadosInsumo = {
      dsNomeInsumo: dsNomeInsumo.trim(),
      dsTipoInsumo,
      vlCustoInsumo: vlCustoNumerico,
      nrLarguraMaxInsumo: larguraNum,
      nrComprimentoMaxInsumo: comprimentoNum,
      nrAlturaMaxInsumo: alturaNum,
      nrVolumeMaxInsumo: volumeCalculadoFinal,
      dsObservacaoInsumo: dsObservacaoInsumo.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "lojistas", uid, "insumos_embalagem", editId), dadosInsumo);
      } else {
        await addDoc(collection(db, "lojistas", uid, "insumos_embalagem"), {
          ...dadosInsumo,
          createdAt: new Date().toISOString(),
        });
      }

      limparFormulario();
    } catch (error: any) {
      alert("Erro ao salvar insumo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (insumo: Insumo) => {
    setEditId(insumo.id);
    setDsNomeInsumo(insumo.dsNomeInsumo);
    setDsTipoInsumo(insumo.dsTipoInsumo || "envelope_seguranca");
    setNrLarguraMaxInsumo(insumo.nrLarguraMaxInsumo ? insumo.nrLarguraMaxInsumo.toString() : "");
    setNrComprimentoMaxInsumo(insumo.nrComprimentoMaxInsumo ? insumo.nrComprimentoMaxInsumo.toString() : "");
    setNrAlturaMaxInsumo(insumo.nrAlturaMaxInsumo ? insumo.nrAlturaMaxInsumo.toString() : "");
    setDsObservacaoInsumo(insumo.dsObservacaoInsumo || "");
    
    const centavos = Math.round(insumo.vlCustoInsumo * 100).toString();
    setVlCustoFormatado(aplicarMascara(centavos, "dinheiro"));
  };

  const handleExcluir = async (id: string) => {
    if (!uid) return;
    if (confirm("Tem certeza que deseja excluir este insumo/embalagem?")) {
      try {
        await deleteDoc(doc(db, "lojistas", uid, "insumos_embalagem", id));
      } catch (error: any) {
        alert("Erro ao excluir: " + error.message);
      }
    }
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 5px 0", color: theme.textMain, display: "flex", alignItems: "center", gap: "8px" }}>
          <FiBox size={20} color={theme.primary} /> Cadastro de Insumos e Embalagens
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: theme.textSec }}>
          Cadastre os materiais utilizados para envio (sacos de segurança, envelopes e caixas). O sistema usará estas medidas para agrupar múltiplos itens no mesmo pacote e calcular o custo real de embalagem.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", alignItems: "start" }}>
        
        {/* FORMULÁRIO DE CADASTRO/EDIÇÃO */}
        <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, padding: "20px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", color: theme.textMain, fontWeight: "700" }}>
            {editId ? "✏️ Editar Insumo" : "➕ Novo Insumo / Embalagem"}
          </h4>

          <form onSubmit={handleSalvarInsumo} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: theme.textSec }}>
                Nome do Insumo (Ex: Saco Preto 22x35):
              </label>
              <input
                type="text"
                value={dsNomeInsumo}
                onChange={(e) => setDsNomeInsumo(e.target.value)}
                placeholder="Ex: Saco de Segurança 22x35"
                style={inputStyle(theme)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: theme.textSec }}>
                Tipo da Embalagem:
              </label>
              <select
                value={dsTipoInsumo}
                onChange={(e) => setDsTipoInsumo(e.target.value)}
                style={inputStyle(theme)}
              >
                <option value="envelope_seguranca">✉️ Envelope / Saco de Segurança (Maleável)</option>
                <option value="caixa_papelao">📦 Caixa de Papelão (Rígida)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: theme.textSec }}>
                Custo Unitário (R$):
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={vlCustoFormatado}
                onChange={handleCustoChange}
                style={inputStyle(theme)}
              />
            </div>

            {/* SEÇÃO DE DIMENSÕES */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: theme.textSec }}>
                  Dimensões Máximas Úteis (cm):
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarAjudaDimensoes(!mostrarAjudaDimensoes)}
                  style={{
                    background: "none", border: "none", color: theme.primary,
                    cursor: "pointer", display: "flex", alignItems: "center",
                    gap: "4px", fontSize: "12px", fontWeight: "600", padding: 0
                  }}
                >
                  <FiHelpCircle size={14} /> {mostrarAjudaDimensoes ? "Ocultar Ajuda" : "Como preencher?"}
                </button>
              </div>

              {mostrarAjudaDimensoes && (
                <div style={{
                  backgroundColor: isModoNoturno ? "#1e293b" : "#eff6ff",
                  border: `1px solid ${isModoNoturno ? "#334155" : "#bfdbfe"}`,
                  borderRadius: "8px", padding: "12px", fontSize: "12px",
                  color: isModoNoturno ? "#94a3b8" : "#1e40af", marginBottom: "10px", lineHeight: "1.5"
                }}>
                  <strong>📦 Como preencher para Sacos e Caixas:</strong>
                  <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                    <li><strong>Largura e Comprimento:</strong> Informe as medidas nominais úteis internas da embalagem.</li>
                    <li><strong>Altura Máxima:</strong> Espessura limite de acomodação dos produtos.</li>
                  </ul>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "4px", color: theme.textSec }}>
                    Largura
                  </label>
                  <input
                    type="number"
                    value={nrLarguraMaxInsumo}
                    onChange={(e) => setNrLarguraMaxInsumo(e.target.value)}
                    placeholder="22"
                    style={inputStyle(theme)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "4px", color: theme.textSec }}>
                    Comp.
                  </label>
                  <input
                    type="number"
                    value={nrComprimentoMaxInsumo}
                    onChange={(e) => setNrComprimentoMaxInsumo(e.target.value)}
                    placeholder="35"
                    style={inputStyle(theme)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "4px", color: theme.textSec }}>
                    Altura Máx
                  </label>
                  <input
                    type="number"
                    value={nrAlturaMaxInsumo}
                    onChange={(e) => setNrAlturaMaxInsumo(e.target.value)}
                    placeholder="8"
                    style={inputStyle(theme)}
                  />
                </div>
              </div>

              <div style={{
                marginTop: "10px", padding: "8px 12px", borderRadius: "6px",
                backgroundColor: isModoNoturno ? "#1e293b" : "#f1f5f9",
                border: `1px dashed ${theme.border}`, display: "flex",
                justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: theme.textSec
              }}>
                <span>📐 Cubagem (Volume Máximo):</span>
                <strong style={{ color: theme.textMain }}>
                  {volumeCalculadoPreview.toLocaleString('pt-BR')} cm³ ({(volumeCalculadoPreview / 1000).toFixed(2)} L)
                </strong>
              </div>
            </div>

            {/* CAMPO DE OBSERVAÇÃO */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: theme.textSec }}>
                Observações / Comentários (Opcional):
              </label>
              <textarea
                value={dsObservacaoInsumo}
                onChange={(e) => setDsObservacaoInsumo(e.target.value)}
                placeholder="Ex: Usado preferencialmente para até 3 topos de bolo..."
                rows={2}
                style={{ ...inputStyle(theme), resize: "vertical", fontFamily: "inherit" }}
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
                {loading ? "Salvando..." : editId ? "Atualizar Insumo" : "Cadastrar Insumo"}
              </button>
            </div>
          </form>
        </div>

        {/* LISTAGEM DOS INSUMOS CADASTRADOS */}
        <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, padding: "20px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", color: theme.textMain, fontWeight: "700" }}>
            📦 Insumos Cadastrados ({insumos.length})
          </h4>

          {insumos.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "450px", overflowY: "auto" }}>
              {insumos.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    padding: "12px 14px", borderRadius: "8px",
                    backgroundColor: isModoNoturno ? "#0f172a" : "#f8fafc",
                    border: `1px solid ${theme.border}`
                  }}
                >
                  <div style={{ paddingRight: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <span style={{ fontWeight: "700", fontSize: "14px", color: theme.textMain }}>
                        {item.dsNomeInsumo}
                      </span>
                      <span style={{
                        fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "4px",
                        backgroundColor: item.dsTipoInsumo === "caixa_papelao" ? "#fef3c7" : "#e0e7ff",
                        color: item.dsTipoInsumo === "caixa_papelao" ? "#92400e" : "#3730a3"
                      }}>
                        {item.dsTipoInsumo === "caixa_papelao" ? "📦 Caixa Rígida" : "✉️ Envelope Maleável"}
                      </span>
                    </div>

                    <span style={{ fontSize: "12px", color: theme.textSec, display: "block", marginTop: "2px" }}>
                      Capacidade Máx: {item.nrLarguraMaxInsumo || 0} x {item.nrComprimentoMaxInsumo || 0} x {item.nrAlturaMaxInsumo || 0} cm
                    </span>
                    <span style={{ fontSize: "12px", color: theme.textSec, display: "block", marginTop: "2px" }}>
                      📐 Volume: <strong>{(item.nrVolumeMaxInsumo || ((item.nrLarguraMaxInsumo || 0) * (item.nrComprimentoMaxInsumo || 0) * (item.nrAlturaMaxInsumo || 0))).toLocaleString('pt-BR')} cm³</strong>
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#16a34a", display: "block", marginTop: "2px" }}>
                      Custo: {formatarMoeda(item.vlCustoInsumo)}
                    </span>
                    {item.dsObservacaoInsumo && (
                      <span style={{ fontSize: "12px", fontStyle: "italic", color: theme.textSec, display: "block", marginTop: "4px" }}>
                        💬 &quot;{item.dsObservacaoInsumo}&quot;
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleEditar(item)}
                      title="Editar"
                      style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, cursor: "pointer" }}
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluir(item.id)}
                      title="Excluir"
                      style={{ padding: "6px 10px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#ef4444", cursor: "pointer" }}
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: theme.textSec, fontSize: "13px" }}>
              Nenhum insumo ou embalagem cadastrado ainda. Utilize o formulário ao lado para adicionar o primeiro.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const inputStyle = (theme: any) => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: `1px solid ${theme.border}`,
  backgroundColor: theme.inputBg,
  color: theme.textMain,
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box" as const
});