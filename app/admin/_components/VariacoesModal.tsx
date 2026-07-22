"use client";

import React, { useState, useEffect } from "react";
import { shopeeStyles, styles } from "../produtos/styles";

import { storage } from "@/lib/firebase";
import { ref, deleteObject } from "firebase/storage";

const formatarMoeda = (valor: string) => {
  const limpo = valor.replace(/\D/g, "");
  if (!limpo) return "";
  return (parseInt(limpo) / 100).toFixed(2);
};

const comprimirImagem = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Erro no canvas");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 1000, 1000);
        const ratio = Math.min(1000 / img.width, 1000 / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, (1000 - w) / 2, (1000 - h) / 2, w, h);
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
    };
    reader.onerror = reject;
  });
};

interface VariacoesModalProps {
  showVarModal: boolean;
  setShowVarModal: (show: boolean) => void;
  nomeVar1: string;
  setNomeVar1: (val: string) => void;
  opcoesVar1: string[];
  setOpcoesVar1: (val: string[]) => void;
  nomeVar2: string;
  setNomeVar2: (val: string) => void;
  opcoesVar2: string[];
  setOpcoesVar2: (val: string[]) => void;
  tabelaPrecos: any;
  onSave: (novaTabela: any) => void;
  onCancel: () => void; // <--- Adicione esta linha
  gerarCombinacoes: () => any[];
  sugerirSkus: (tabela: any, setTabela: any) => void;
}

const TableInput = ({ value, onBlur, placeholder }: any) => {
  const [tempValue, setTempValue] = useState(value || "");

  useEffect(() => { setTempValue(value || ""); }, [value]);

  return (
    <input
      style={shopeeStyles.tableInput}
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      onBlur={() => onBlur(tempValue)}
      placeholder={placeholder}
    />
  );
};

export default function VariacoesModal({
  showVarModal, setShowVarModal, nomeVar1, setNomeVar1, opcoesVar1, setOpcoesVar1,
  nomeVar2, setNomeVar2, opcoesVar2, setOpcoesVar2, tabelaPrecos, onSave, gerarCombinacoes, sugerirSkus,
}: VariacoesModalProps) {

  const [precoGlobal, setPrecoGlobal] = useState("");
  const [custoGlobal, setCustoGlobal] = useState("");
  const [draftTabela, setDraftTabela] = useState(tabelaPrecos);
  const [showVar2, setShowVar2] = useState(nomeVar2 !== "" || opcoesVar2.length > 0);

  useEffect(() => {
    if (showVarModal) {
      setDraftTabela(tabelaPrecos);
    }
  }, [showVarModal]);

  if (!showVarModal) return null;

  const combinacoesValidas = gerarCombinacoes();
  const temVariaçõesVisiveis = opcoesVar1.some(op => op.trim() !== "");

  // Altere para async
  const handleDraftInput = async (key: string, campo: string, valor: string) => {
    // SEÇÃO DE LIMPEZA DO STORAGE
    if (campo === "foto" && valor === "") {
      const fotoAntiga = draftTabela[key]?.foto;
      // Verifica se a URL é do Firebase antes de tentar deletar
      if (fotoAntiga && fotoAntiga.includes("firebasestorage.googleapis.com")) {
        try {
          await deleteObject(ref(storage, fotoAntiga));
        } catch (e) {
          console.warn("Erro ao deletar foto do storage:", e);
        }
      }
    }

    // APLICAÇÃO DA MÁSCARA
    // Se for foto, mantém o valor original. Se for preco ou custo, usa a função formatarMoeda.

    setDraftTabela((prev: any) => ({
      ...prev,
      [key]: { ...prev[key], [campo]: valor }
    }));
  };

  return (
    <div style={shopeeStyles.overlay}>
      <div style={shopeeStyles.modal}>
        {/* Cabeçalho */}
        <div style={{ ...shopeeStyles.header, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={shopeeStyles.title}>Grade de Variações</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {temVariaçõesVisiveis && (
              <button
                type="button"
                onClick={() => sugerirSkus(draftTabela, setDraftTabela)}
                style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
              >
                ⚡ Gerar SKUs
              </button>
            )}
            <button onClick={() => setShowVarModal(false)} style={shopeeStyles.closeBtn}>✕</button>
          </div>
        </div>

        <div style={shopeeStyles.content}>
          {/* VARIAÇÃO 1 */}
          <div style={shopeeStyles.section}>
            <label style={shopeeStyles.label}>Variação 1 (ex: Cor)</label>
            <div style={shopeeStyles.varBox}>
              <input style={styles.input} value={nomeVar1} onChange={e => setNomeVar1(e.target.value)} placeholder="Ex: Cor" />
              <div style={shopeeStyles.tagsContainer}>
                {opcoesVar1.map((op, idx) => (
                  <div key={idx} style={shopeeStyles.tagInputWrapper}>
                    <input style={shopeeStyles.tagInput} value={op} onChange={e => { const n = [...opcoesVar1]; n[idx] = e.target.value; setOpcoesVar1(n); }} />
                    <button style={shopeeStyles.delTag} onClick={() => setOpcoesVar1(opcoesVar1.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                ))}
                <button style={shopeeStyles.addBtn} onClick={() => setOpcoesVar1([...opcoesVar1, ""])}>+ Opção</button>
              </div>
            </div>
          </div>

          {/* VARIAÇÃO 2 */}
          <div style={shopeeStyles.section}>
            {!showVar2 ? (
              <button onClick={() => setShowVar2(true)} style={{ ...shopeeStyles.addBtn, padding: '10px 20px', border: '1px dashed #ee4d2d', color: '#ee4d2d' }}>
                + Adicionar Variação 2
              </button>
            ) : (
              <div style={{ ...shopeeStyles.varBox, border: '1px solid #e2e8f0', padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={shopeeStyles.label}>Variação 2</label>
                  <button onClick={() => { setShowVar2(false); setNomeVar2(""); setOpcoesVar2([]); }} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}>Remover</button>
                </div>
                <input style={styles.input} value={nomeVar2} onChange={e => setNomeVar2(e.target.value)} placeholder="Ex: Tamanho" />
                <div style={shopeeStyles.tagsContainer}>
                  {opcoesVar2.map((op, idx) => (
                    <div key={idx} style={shopeeStyles.tagInputWrapper}>
                      <input style={shopeeStyles.tagInput} value={op} onChange={e => { const n = [...opcoesVar2]; n[idx] = e.target.value; setOpcoesVar2(n); }} />
                      <button style={shopeeStyles.delTag} onClick={() => setOpcoesVar2(opcoesVar2.filter((_, i) => i !== idx))}>✕</button>
                    </div>
                  ))}
                  <button style={shopeeStyles.addBtn} onClick={() => setOpcoesVar2([...opcoesVar2, ""])}>+ Opção</button>
                </div>
              </div>
            )}
          </div>

          {/* PAINEL DE AÇÃO EM MASSA */}
          <div style={{
            background: '#fff',
            border: '1px solid #ee4d2d',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <input
              placeholder="0,00"
              value={precoGlobal}
              onChange={(e) => setPrecoGlobal(formatarMoeda(e.target.value))}
              style={{ padding: '8px', border: '1px solid #dcdcdc', flex: 1 }}
            />
            <input
              placeholder="0,00"
              value={custoGlobal}
              onChange={(e) => setCustoGlobal(formatarMoeda(e.target.value))} // Corrigido aqui
              style={{ padding: '8px', border: '1px solid #dcdcdc', flex: 1 }}
            />
            <button
              onClick={() => {
                setDraftTabela((prev: any) => {
                  const novaTabela = { ...prev };

                  // Em vez de iterar sobre o draftTabela (que está vazio),
                  // iteramos sobre as combinações que você já sabe que existem:
                  combinacoesValidas.forEach(comb => {
                    const key = comb.key; // A chave da combinação

                    // Atualiza ou cria a entrada na tabela, independente de ter SKU ou não
                    novaTabela[key] = {
                      ...(novaTabela[key] || {}), // Mantém o que já existia, se existir
                      preco: precoGlobal,
                      custo: custoGlobal
                    };
                  });

                  console.log("Valores aplicados via combinações:", novaTabela);
                  return novaTabela;
                });
              }}
              style={{ background: '#ee4d2d', color: '#fff', border: 'none', padding: '8px 20px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Aplicar a todos
            </button>
          </div>

          {/* TABELA DINÂMICA */}
          {temVariaçõesVisiveis && combinacoesValidas.length > 0 && (
            <table
              key={JSON.stringify(draftTabela)} // <--- ISSO VAI FORÇAR O REDESENHO
              style={{ ...shopeeStyles.table, width: '100%', marginTop: '20px' }}>
              <thead>
                <tr style={{ background: '#f6f6f6' }}>
                  <th style={{ ...shopeeStyles.th, width: '150px', textAlign: 'center' }}>Var 1</th>
                  {showVar2 && (
                    <th style={{ ...shopeeStyles.th, width: '100px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      Var 2
                    </th>
                  )}
                  <th style={{ ...shopeeStyles.th, textAlign: 'center' }}>SKU</th>
                  <th style={{ ...shopeeStyles.th, textAlign: 'center' }}>Preço</th>
                  <th style={{ ...shopeeStyles.th, textAlign: 'center' }}>Custo</th>
                </tr>
              </thead>
              <tbody>
                {opcoesVar1.filter(v1 => v1.trim() !== "").map((v1) => {
                  const combsDesteGrupo = combinacoesValidas.filter(c => c.v1 === v1);
                  return combsDesteGrupo.map((c, idx) => {

                    const valorPreco = draftTabela[c.key]?.preco || "";
                    const valorCusto = draftTabela[c.key]?.custo || "";
                    const valorSku = draftTabela[c.key]?.sku || "";
                    const temFoto = !!draftTabela[c.key]?.foto;
                    return (
                      <tr key={`${c.key}-${idx}`}>
                        {idx === 0 && (
                          <td rowSpan={combsDesteGrupo.length} style={{ ...shopeeStyles.td, textAlign: 'center', backgroundColor: '#f8fafc', width: '150px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>{v1}</div>
                            <div style={{ width: '60px', height: '60px', margin: '0 auto', border: temFoto ? '1px solid #3b82f6' : '1px dashed #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                              {temFoto ? (
                                <>
                                  <img src={draftTabela[c.key].foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <button
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      // Usamos await aqui para garantir que a foto seja deletada do Storage
                                      // antes de limparmos o campo na interface
                                      for (const comb of combsDesteGrupo) {
                                        await handleDraftInput(comb.key, "foto", "");
                                      }
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      right: 0,
                                      background: 'red',
                                      color: '#fff',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '10px'
                                    }}
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '18px', color: '#cbd5e1' }}>+</span>
                                  <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      const img = new Image();
                                      img.src = ev.target?.result as string;
                                      img.onload = () => {
                                        const canvas = document.createElement('canvas');
                                        canvas.width = 300; canvas.height = 300;
                                        canvas.getContext('2d')?.drawImage(img, 0, 0, 300, 300);
                                        const compressed = canvas.toDataURL('image/jpeg', 0.7);
                                        combsDesteGrupo.forEach(comb => handleDraftInput(comb.key, "foto", compressed));
                                      };
                                    };
                                    reader.readAsDataURL(file);
                                  }} />
                                </>
                              )}
                            </div>
                          </td>
                        )}

                        {showVar2 && (<td style={{ ...shopeeStyles.td, textAlign: 'center', verticalAlign: 'middle', width: '100px' }}> {c.v2 || "-"}</td>)}
                        <td style={shopeeStyles.td}><input style={shopeeStyles.tableInput} value={valorSku} onChange={e => handleDraftInput(c.key, "sku", e.target.value)} placeholder="SKU" /></td>
                        {/* Input Preço */}
                        <td style={shopeeStyles.td}>
                          <TableInput
                            value={valorPreco}
                            onBlur={(val: string) => handleDraftInput(c.key, "preco", formatarMoeda(val))}
                            placeholder="0,00"
                          />
                        </td>

                        {/* Input Custo */}
                        <td style={shopeeStyles.td}>
                          <TableInput
                            value={valorCusto}
                            onBlur={(val: string) => handleDraftInput(c.key, "custo", formatarMoeda(val))}
                            placeholder="0,00"
                          />
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '15px', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
          <button
            onClick={() => {
              setPrecoGlobal(""); // Limpa o input de preço do painel
              setCustoGlobal(""); // Limpa o input de custo do painel
              setDraftTabela(tabelaPrecos); // Volta a tabela ao estado original
              setShowVarModal(false);
            }}
            style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => { onSave(draftTabela); setShowVarModal(false); }}
            style={{ padding: '10px 40px', borderRadius: '4px', backgroundColor: '#ee4d2d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Salvar Grade
          </button>
        </div>
      </div>
    </div>
  );
}