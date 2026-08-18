// app/admin/_components/VariacoesModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { shopeeStyles, styles } from "../produtos/styles";

import { storage } from "@/lib/firebase";
import { ref, deleteObject } from "firebase/storage";
import ImageCropperModal from "@/utils/ImageCropperModalProduto";
import ModalGeradorSkuVariacoes from "@/app/admin/_components/ModalGeradorSkuVariaçoes";
import { formatarPeso, formatarMedida } from "@/utils/formatters";

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

// Formatação fluida tipo caixa eletrônico (0,01 -> 0,12 -> 1,23)
const formatarCaixaEletronico = (texto: string) => {
  const apenasDigitos = texto.replace(/\D/g, "");
  if (!apenasDigitos) return "";
  const numero = (parseInt(apenasDigitos, 10) / 100).toFixed(2);
  return numero.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
};

// 🌟 Converte "1.234,56" para formato numérico padrão ("1234.56") para salvar no banco/carrinho sem quebrar
const converterParaPadraoMonetario = (textoFormatado: string) => {
  if (!textoFormatado) return "";
  const limpo = textoFormatado.toString().replace(/\./g, "").replace(",", ".");
  const num = parseFloat(limpo);
  return isNaN(num) ? "" : num.toFixed(2);
};

// Converte do padrão do banco ("1234.56") para a visualização do caixa eletrônico ("1.234,56") ao abrir o modal
const converterDoPadraoParaCaixa = (valorBanco: any) => {
  if (!valorBanco && valorBanco !== 0) return "";
  const str = valorBanco.toString().replace(",", ".");
  const num = parseFloat(str);
  if (isNaN(num)) return "";
  const centavos = Math.round(num * 100).toString();
  return formatarCaixaEletronico(centavos);
};

/**
 * Função inteligente para gerar sufixos para nomes compostos
 */
const gerarSufixoInteligente = (texto: string) => {
  if (!texto) return "";
  
  const palavras = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .split(/\s+/);

  if (palavras.length === 1) {
    return palavras[0].substring(0, 4);
  } else {
    const p1 = palavras[0].substring(0, 3);
    const p2 = palavras[1].substring(0, 4);
    return `${p1}-${p2}`;
  }
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
  onCancel: () => void;
  gerarCombinacoes: () => any[];
  sugerirSkus: (tabela: any, setTabela: any) => void;
  pesosDiferentesPorVariacao?: boolean;
  setPesosDiferentesPorVariacao?: (val: boolean) => void;
  lojistaId?: string;
}

export default function VariacoesModal({
  showVarModal, setShowVarModal, nomeVar1, setNomeVar1, opcoesVar1, setOpcoesVar1,
  nomeVar2, setNomeVar2, opcoesVar2, setOpcoesVar2, tabelaPrecos, onSave, gerarCombinacoes,
  pesosDiferentesPorVariacao = false, setPesosDiferentesPorVariacao = () => {},
  lojistaId
}: VariacoesModalProps) {

  const { theme, isModoNoturno } = useTheme();

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [precoGlobal, setPrecoGlobal] = useState("");
  const [custoGlobal, setCustoGlobal] = useState("");
  const [estoqueGlobal, setEstoqueGlobal] = useState("");
  const [draftTabela, setDraftTabela] = useState(tabelaPrecos);
  const [showVar2, setShowVar2] = useState(nomeVar2 !== "" || opcoesVar2.length > 0);

  const [showModalGeradorSkuVar, setShowModalGeradorSkuVar] = useState(false);

  const [arquivoParaCortar, setArquivoParaCortar] = useState<File | null>(null);
  const [combsParaAtualizar, setCombsParaAtualizar] = useState<any[]>([]);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  useEffect(() => {
    if (showVarModal) {
      const tabelaFormatada: any = {};
      if (tabelaPrecos) {
        Object.keys(tabelaPrecos).forEach((k) => {
          const item = tabelaPrecos[k];
          tabelaFormatada[k] = {
            ...item,
            preco: converterDoPadraoParaCaixa(item.preco),
            custo: converterDoPadraoParaCaixa(item.custo),
          };
        });
      }
      setDraftTabela(tabelaFormatada);
    }
  }, [showVarModal, tabelaPrecos]);

  if (!showVarModal) return null;

  const combinacoesValidas = gerarCombinacoes();
  const temVariaçõesVisiveis = opcoesVar1.some(op => op.trim() !== "");

  const handleDraftInput = async (key: string, campo: string, valor: string) => {
    if (campo === "foto" && valor === "") {
      const fotoAntiga = draftTabela[key]?.foto;
      if (fotoAntiga && fotoAntiga.includes("firebasestorage.googleapis.com")) {
        try {
          await deleteObject(ref(storage, fotoAntiga));
        } catch (e) {
          console.warn("Erro ao deletar foto do storage:", e);
        }
      }
    }

    setDraftTabela((prev: any) => ({
      ...prev,
      [key]: { ...prev[key], [campo]: valor }
    }));
  };

  const handleSalvarGrade = () => {
    const tabelaParaSalvar: any = {};
    
    Object.keys(draftTabela).forEach((k) => {
      const item = draftTabela[k];
      tabelaParaSalvar[k] = {
        ...item,
        preco: converterParaPadraoMonetario(item.preco),
        custo: converterParaPadraoMonetario(item.custo),
      };
    });

    onSave(tabelaParaSalvar);
    setShowVarModal(false);
  };

  return (
    <div style={shopeeStyles.overlay}>
      <div style={{
        ...shopeeStyles.modal,
        backgroundColor: theme.bgCard,
        color: theme.textMain,
        border: `1px solid ${theme.border}`,
        width: isMobile ? '95%' : shopeeStyles.modal.width,
        maxWidth: isMobile ? '100%' : (pesosDiferentesPorVariacao ? '1200px' : '950px'),
        maxHeight: isMobile ? '90vh' : '95vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        transition: 'max-width 0.3s ease',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Cabeçalho */}
        <div style={{ ...shopeeStyles.header, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ ...shopeeStyles.title, color: theme.textMain }}>Grade de Variações</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {temVariaçõesVisiveis && (
              <button
                type="button"
                onClick={() => setShowModalGeradorSkuVar(true)}
                style={{ backgroundColor: theme.primary, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
              >
                ⚡ Gerar SKUs
              </button>
            )}
            <button onClick={() => setShowVarModal(false)} style={{ ...shopeeStyles.closeBtn, color: theme.textMain }}>✕</button>
          </div>
        </div>

        <div style={{ ...shopeeStyles.content, overflowY: 'auto', flex: 1, padding: isMobile ? '10px' : '20px' }}>
          
          {/* VARIAÇÃO 1 */}
          <div style={shopeeStyles.section}>
            <label style={{ ...shopeeStyles.label, color: theme.textSec }}>Variação 1 (ex: Cor)</label>
            <div style={{ backgroundColor: theme.bgApp, border: `1px solid ${theme.border}`, padding: '14px', borderRadius: '8px' }}>
              <input 
                style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, marginBottom: '12px' }} 
                value={nomeVar1} 
                onChange={e => setNomeVar1(e.target.value)} 
                placeholder="Ex: Cor" 
              />
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {opcoesVar1.map((op, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    backgroundColor: theme.inputBg, 
                    border: `1px solid ${theme.border}`, 
                    borderRadius: '4px', 
                    padding: '6px 10px',
                    width: 'auto',
                    minWidth: '140px'
                  }}>
                    <input style={{ border: 'none', backgroundColor: 'transparent', color: theme.textMain, outline: 'none', width: '100%', fontSize: '13px' }} value={op} onChange={e => { const n = [...opcoesVar1]; n[idx] = e.target.value; setOpcoesVar1(n); }} placeholder="Opção" />
                    <button style={{ border: 'none', background: 'transparent', color: theme.textSec, cursor: 'pointer', fontSize: '12px', marginLeft: '6px' }} onClick={() => setOpcoesVar1(opcoesVar1.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                ))}
                <button style={{ padding: '6px 14px', backgroundColor: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }} onClick={() => setOpcoesVar1([...opcoesVar1, ""])}>+ Adicionar</button>
              </div>
            </div>
          </div>

          {/* VARIAÇÃO 2 */}
          <div style={shopeeStyles.section}>
            {!showVar2 ? (
              <button onClick={() => setShowVar2(true)} style={{ padding: '10px 16px', border: `1px dashed ${theme.border}`, color: theme.textMain, backgroundColor: theme.bgApp, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', width: isMobile ? '100% ' : 'auto', fontWeight: '500' }}>
                + Adicionar Variação 2
              </button>
            ) : (
              <div style={{ backgroundColor: theme.bgApp, border: `1px solid ${theme.border}`, padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ ...shopeeStyles.label, color: theme.textSec }}>Variação 2</label>
                  <button onClick={() => { setShowVar2(false); setNomeVar2(""); setOpcoesVar2([]); }} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Remover</button>
                </div>
                <input style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, marginBottom: '12px' }} value={nomeVar2} onChange={e => setNomeVar2(e.target.value)} placeholder="Ex: Tamanho" />
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {opcoesVar2.map((op, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      backgroundColor: theme.inputBg, 
                      border: `1px solid ${theme.border}`, 
                      borderRadius: '4px', 
                      padding: '6px 10px',
                      width: 'auto',
                      minWidth: '140px'
                    }}>
                      <input style={{ border: 'none', backgroundColor: 'transparent', color: theme.textMain, outline: 'none', width: '100%', fontSize: '13px' }} value={op} onChange={e => { const n = [...opcoesVar2]; n[idx] = e.target.value; setOpcoesVar2(n); }} placeholder="Opção" />
                      <button style={{ border: 'none', background: 'transparent', color: theme.textSec, cursor: 'pointer', fontSize: '12px', marginLeft: '6px' }} onClick={() => setOpcoesVar2(opcoesVar2.filter((_, i) => i !== idx))}>✕</button>
                    </div>
                  ))}
                  <button style={{ padding: '6px 14px', backgroundColor: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }} onClick={() => setOpcoesVar2([...opcoesVar2, ""])}>+ Adicionar</button>
                </div>
              </div>
            )}
          </div>

          {/* SELETOR DE PESOS E MEDIDAS (Checkbox isolado e sem quadro em volta) */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '500', color: theme.textMain, cursor: 'default' }}>
              <input
                type="checkbox"
                checked={pesosDiferentesPorVariacao}
                onChange={e => setPesosDiferentesPorVariacao(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: theme.primary }}
              />
              Pesos/dimensões diferentes por variação (Para cálculo de frete específico)
            </label>
          </div>

          {/* PAINEL DE AÇÃO EM MASSA */}
          <div style={{
            backgroundColor: theme.bgApp,
            border: `1px solid ${theme.border}`,
            padding: '14px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'stretch',
            gap: '10px'
          }}>
            <input
              placeholder="Preço global (0,00)"
              value={precoGlobal}
              onChange={(e) => setPrecoGlobal(formatarCaixaEletronico(e.target.value))}
              style={{ padding: '9px 12px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, flex: 1, borderRadius: '4px', outline: 'none' }}
            />
            <input
              placeholder="Custo global (0,00)"
              value={custoGlobal}
              onChange={(e) => setCustoGlobal(formatarCaixaEletronico(e.target.value))}
              style={{ padding: '9px 12px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, flex: 1, borderRadius: '4px', outline: 'none' }}
            />
            <input
              placeholder="Estoque"
              value={estoqueGlobal}
              onChange={(e) => setEstoqueGlobal(e.target.value.replace(/\D/g, ""))}
              style={{ padding: '9px 12px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, width: isMobile ? '100%' : '100px', borderRadius: '4px', outline: 'none' }}
            />
            <button
              onClick={() => {
                setDraftTabela((prev: any) => {
                  const novaTabela = { ...prev };
                  combinacoesValidas.forEach(comb => {
                    const key = comb.key;
                    novaTabela[key] = {
                      ...(novaTabela[key] || {}),
                      preco: precoGlobal || novaTabela[key]?.preco,
                      custo: custoGlobal || novaTabela[key]?.custo,
                      estoque: estoqueGlobal || novaTabela[key]?.estoque
                    };
                  });
                  return novaTabela;
                });
              }}
              style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}
            >
              Aplicar a todos
            </button>
          </div>

          {/* TABELA DINÂMICA OU CARDS MOBILE */}
          {temVariaçõesVisiveis && combinacoesValidas.length > 0 && (
            isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                {opcoesVar1.filter(v1 => v1.trim() !== "").map((v1) => {
                  const combsDesteGrupo = combinacoesValidas.filter(c => c.v1 === v1);
                  return combsDesteGrupo.map((c, idx) => {
                    const valorPreco = draftTabela[c.key]?.preco || "";
                    const valorCusto = draftTabela[c.key]?.custo || "";
                    const valorEstoque = draftTabela[c.key]?.estoque || "";
                    const valorSku = draftTabela[c.key]?.sku || "";
                    const temFoto = !!draftTabela[c.key]?.foto;
                    const valorPeso = draftTabela[c.key]?.peso || "";
                    const valorComprimento = draftTabela[c.key]?.comprimento || "";
                    const valorLargura = draftTabela[c.key]?.largura || "";
                    const valorAltura = draftTabela[c.key]?.altura || "";

                    return (
                      <div key={`${c.key}-${idx}`} style={{ background: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: theme.textMain, fontSize: '13px' }}>
                            {v1} {c.v2 ? `/ ${c.v2}` : ""}
                          </span>
                          {idx === 0 && (
                            <div style={{ width: '45px', height: '45px', border: temFoto ? `1px solid ${theme.primary}` : `1px dashed ${theme.border}`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: theme.inputBg }}>
                              {temFoto ? (
                                <>
                                  <img src={draftTabela[c.key].foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Var" />
                                  <button
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      for (const comb of combsDesteGrupo) {
                                        await handleDraftInput(comb.key, "foto", "");
                                      }
                                    }}
                                    style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '9px', padding: '1px 3px' }}
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '14px', color: theme.textSec }}>+</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setArquivoParaCortar(file);
                                      setCombsParaAtualizar(combsDesteGrupo);
                                      e.target.value = "";
                                    }} 
                                  />
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: theme.textSec, display: 'block', marginBottom: '2px' }}>SKU</label>
                            <input style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, width: '100%', boxSizing: 'border-box' }} value={valorSku} onChange={e => handleDraftInput(c.key, "sku", e.target.value)} placeholder="SKU" />
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', color: theme.textSec, display: 'block', marginBottom: '2px' }}>Preço (R$)</label>
                              <input
                                style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, width: '100%', boxSizing: 'border-box' }}
                                value={valorPreco}
                                onChange={(e) => handleDraftInput(c.key, "preco", formatarCaixaEletronico(e.target.value))}
                                placeholder="0,00"
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', color: theme.textSec, display: 'block', marginBottom: '2px' }}>Custo (R$)</label>
                              <input
                                style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, width: '100%', boxSizing: 'border-box' }}
                                value={valorCusto}
                                onChange={(e) => handleDraftInput(c.key, "custo", formatarCaixaEletronico(e.target.value))}
                                placeholder="0,00"
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', color: theme.textSec, display: 'block', marginBottom: '2px' }}>Estoque</label>
                              <input
                                style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, width: '100%', boxSizing: 'border-box' }}
                                value={valorEstoque}
                                onChange={e => handleDraftInput(c.key, "estoque", e.target.value.replace(/\D/g, ""))}
                                placeholder="0"
                              />
                            </div>
                          </div>

                          {pesosDiferentesPorVariacao && (
                            <div style={{ background: theme.inputBg, padding: '8px', borderRadius: '6px', border: `1px dashed ${theme.border}`, marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: theme.textSec, fontWeight: 'bold', display: 'block' }}>Peso (kg)</label>
                                <input 
                                  style={{ ...shopeeStyles.tableInput, backgroundColor: theme.bgApp, color: theme.textMain, borderColor: theme.border, width: '100%', boxSizing: 'border-box' }} 
                                  value={valorPeso} 
                                  onChange={e => handleDraftInput(c.key, "peso", formatarPeso(e.target.value))} 
                                  placeholder="0.00" 
                                />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                                <div>
                                  <label style={{ fontSize: '10px', color: theme.textSec, fontWeight: 'bold', display: 'block' }}>Comp (cm)</label>
                                  <input 
                                    style={{ ...shopeeStyles.tableInput, backgroundColor: theme.bgApp, color: theme.textMain, borderColor: theme.border, width: '100%', boxSizing: 'border-box' }} 
                                    value={valorComprimento} 
                                    onChange={e => handleDraftInput(c.key, "comprimento", formatarMedida(e.target.value))} 
                                    placeholder="0" 
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '10px', color: theme.textSec, fontWeight: 'bold', display: 'block' }}>Larg (cm)</label>
                                  <input 
                                    style={{ ...shopeeStyles.tableInput, backgroundColor: theme.bgApp, color: theme.textMain, borderColor: theme.border, width: '100%', boxSizing: 'border-box' }} 
                                    value={valorLargura} 
                                    onChange={e => handleDraftInput(c.key, "largura", formatarMedida(e.target.value))} 
                                    placeholder="0" 
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '10px', color: theme.textSec, fontWeight: 'bold', display: 'block' }}>Alt (cm)</label>
                                  <input 
                                    style={{ ...shopeeStyles.tableInput, backgroundColor: theme.bgApp, color: theme.textMain, borderColor: theme.border, width: '100%', boxSizing: 'border-box' }} 
                                    value={valorAltura} 
                                    onChange={e => handleDraftInput(c.key, "altura", formatarMedida(e.target.value))} 
                                    placeholder="0" 
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            ) : (
              <table style={{ ...shopeeStyles.table, width: '100%', marginTop: '20px', color: theme.textMain }}>
                <thead>
                  <tr style={{ background: theme.bgApp }}>
                    <th style={{ ...shopeeStyles.th, color: theme.textSec, width: '150px', textAlign: 'center' }}>Var 1</th>
                    {showVar2 && (
                      <th style={{ ...shopeeStyles.th, color: theme.textSec, width: '100px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        Var 2
                      </th>
                    )}
                    <th style={{ ...shopeeStyles.th, color: theme.textSec, textAlign: 'center' }}>SKU</th>
                    <th style={{ ...shopeeStyles.th, color: theme.textSec, textAlign: 'center' }}>Preço</th>
                    <th style={{ ...shopeeStyles.th, color: theme.textSec, textAlign: 'center' }}>Custo</th>
                    <th style={{ ...shopeeStyles.th, color: theme.textSec, textAlign: 'center', width: '90px' }}>Estoque</th>
                    {pesosDiferentesPorVariacao && (
                      <>
                        <th style={{ ...shopeeStyles.th, color: theme.textSec, textAlign: 'center', width: '90px' }}>Peso (kg)</th>
                        <th style={{ ...shopeeStyles.th, color: theme.textSec, textAlign: 'center', width: '220px' }}>Dimensões (CxLxA cm)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {opcoesVar1.filter(v1 => v1.trim() !== "").map((v1) => {
                    const combsDesteGrupo = combinacoesValidas.filter(c => c.v1 === v1);
                    return combsDesteGrupo.map((c, idx) => {

                      const valorPreco = draftTabela[c.key]?.preco || "";
                      const valorCusto = draftTabela[c.key]?.custo || "";
                      const valorEstoque = draftTabela[c.key]?.estoque || "";
                      const valorSku = draftTabela[c.key]?.sku || "";
                      const temFoto = !!draftTabela[c.key]?.foto;
                      const valorPeso = draftTabela[c.key]?.peso || "";
                      const valorComprimento = draftTabela[c.key]?.comprimento || "";
                      const valorLargura = draftTabela[c.key]?.largura || "";
                      const valorAltura = draftTabela[c.key]?.altura || "";

                      return (
                        <tr key={`${c.key}-${idx}`} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          {idx === 0 && (
                            <td rowSpan={combsDesteGrupo.length} style={{ ...shopeeStyles.td, textAlign: 'center', backgroundColor: theme.bgApp, width: '150px', verticalAlign: 'middle', borderRight: `1px solid ${theme.border}` }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', color: theme.textMain }}>{v1}</div>
                              <div style={{ width: '60px', height: '60px', margin: '0 auto', border: temFoto ? `1px solid ${theme.primary}` : `1px dashed ${theme.border}`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', backgroundColor: theme.inputBg }}>
                                {temFoto ? (
                                  <>
                                    <img src={draftTabela[c.key].foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Var" />
                                    <button
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        for (const comb of combsDesteGrupo) {
                                          await handleDraftInput(comb.key, "foto", "");
                                        }
                                      }}
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        background: '#ef4444',
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
                                    <span style={{ fontSize: '18px', color: theme.textSec }}>+</span>
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setArquivoParaCortar(file);
                                        setCombsParaAtualizar(combsDesteGrupo);
                                        e.target.value = "";
                                      }} 
                                    />
                                  </>
                                )}
                              </div>
                            </td>
                          )}

                          {showVar2 && (<td style={{ ...shopeeStyles.td, textAlign: 'center', verticalAlign: 'middle', width: '100px', color: theme.textMain }}> {c.v2 || "-"}</td>)}
                          <td style={shopeeStyles.td}><input style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }} value={valorSku} onChange={e => handleDraftInput(c.key, "sku", e.target.value)} placeholder="SKU" /></td>
                          <td style={shopeeStyles.td}>
                            <input
                              style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                              value={valorPreco}
                              onChange={(e) => handleDraftInput(c.key, "preco", formatarCaixaEletronico(e.target.value))}
                              placeholder="0,00"
                            />
                          </td>
                          <td style={shopeeStyles.td}>
                            <input
                              style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border }}
                              value={valorCusto}
                              onChange={(e) => handleDraftInput(c.key, "custo", formatarCaixaEletronico(e.target.value))}
                              placeholder="0,00"
                            />
                          </td>
                          <td style={{ ...shopeeStyles.td, textAlign: 'center' }}>
                            <input
                              style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, width: '70px', textAlign: 'center' }}
                              value={valorEstoque}
                              onChange={e => handleDraftInput(c.key, "estoque", e.target.value.replace(/\D/g, ""))}
                              placeholder="0"
                            />
                          </td>

                          {pesosDiferentesPorVariacao && (
                            <>
                              <td style={{ ...shopeeStyles.td, textAlign: 'center' }}>
                                <input
                                  style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, width: '70px', textAlign: 'center' }}
                                  value={valorPeso}
                                  onChange={e => handleDraftInput(c.key, "peso", formatarPeso(e.target.value))}
                                  placeholder="0.00"
                                />
                              </td>
                              <td style={{ ...shopeeStyles.td, textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                  <input
                                    style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, width: '55px', textAlign: 'center' }}
                                    value={valorComprimento}
                                    onChange={e => handleDraftInput(c.key, "comprimento", formatarMedida(e.target.value))}
                                    placeholder="Comp"
                                  />
                                  <span style={{ color: theme.textSec }}>x</span>
                                  <input
                                    style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, width: '55px', textAlign: 'center' }}
                                    value={valorLargura}
                                    onChange={e => handleDraftInput(c.key, "largura", formatarMedida(e.target.value))}
                                    placeholder="Larg"
                                  />
                                  <span style={{ color: theme.textSec }}>x</span>
                                  <input
                                    style={{ ...shopeeStyles.tableInput, backgroundColor: theme.inputBg, color: theme.textMain, borderColor: theme.border, width: '55px', textAlign: 'center' }}
                                    value={valorAltura}
                                    onChange={e => handleDraftInput(c.key, "altura", formatarMedida(e.target.value))}
                                    placeholder="Alt"
                                  />
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end', gap: '10px', padding: '15px 20px', borderTop: `1px solid ${theme.border}`, flexShrink: 0, backgroundColor: theme.bgCard }}>
          <button
            onClick={() => {
              setPrecoGlobal("");
              setCustoGlobal("");
              setEstoqueGlobal("");
              setDraftTabela(tabelaPrecos);
              setShowVarModal(false);
            }}
            style={{ padding: '10px 20px', borderRadius: '4px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, cursor: 'pointer', flex: isMobile ? 1 : 'unset', fontWeight: '500' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvarGrade}
            style={{ padding: '10px 40px', borderRadius: '4px', backgroundColor: theme.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? 1 : 'unset' }}
          >
            Salvar Grade
          </button>
        </div>
      </div>

      {/* MODAL DE CORTE PARA AS FOTOS DAS VARIAÇÕES */}
      {arquivoParaCortar && (
        <ImageCropperModal
          file={arquivoParaCortar}
          onCropComplete={(croppedBlob) => {
            setArquivoParaCortar(null);
            const reader = new FileReader();
            reader.readAsDataURL(croppedBlob);
            reader.onloadend = () => {
              const base64data = reader.result as string;
              combsParaAtualizar.forEach(comb => {
                handleDraftInput(comb.key, "foto", base64data);
              });
            };
          }}
          onCancel={() => setArquivoParaCortar(null)}
        />
      )}

      {/* CHAMADA DO MODAL DEDICADO DE SKU PARA VARIAÇÕES */}
      {showModalGeradorSkuVar && (
        <ModalGeradorSkuVariacoes
          lojistaId={lojistaId}
          onClose={() => setShowModalGeradorSkuVar(false)}
          onSave={(skuBaseGerado: string) => {
            const novaTabela = { ...draftTabela };
            combinacoesValidas.forEach((c) => {
              const sufixo1 = gerarSufixoInteligente(c.v1);
              const sufixo2 = c.v2 ? `-${gerarSufixoInteligente(c.v2)}` : "";
              const skuFinal = `${skuBaseGerado}-${sufixo1}${sufixo2}`.toUpperCase();

              novaTabela[c.key] = {
                ...novaTabela[c.key],
                sku: skuFinal
              };
            });
            setDraftTabela(novaTabela);
            setShowModalGeradorSkuVar(false);
          }}
        />
      )}
    </div>
  );
}