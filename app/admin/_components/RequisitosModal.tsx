// app/admin/_components/RequisitosModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Trash, Edit2, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

interface CampoPersonalizado {
  id: string;
  label: string;
  tipo: "text" | "number" | "date" | "time";
  obrigatorio: boolean;
  defaultValue?: string;
}

interface Props {
  lojistaId: string;
  config: any;
  onSave: (novosCampos: any) => void;
  onClose: () => void;
}

export default function RequisitosModal({ lojistaId, config, onSave, onClose }: Props) {
  const { theme, isModoNoturno } = useTheme();

  const [campos, setCampos] = useState<CampoPersonalizado[]>([]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [nomeModelo, setNomeModelo] = useState("");
  const [idModeloSelecionado, setIdModeloSelecionado] = useState("");
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    if (config) {
      if (Array.isArray(config)) {
        setCampos(config);
        if (config.length > 0) {
          setExpandido(false);
        }
      } else if (typeof config === "object") {
        const mapeados: CampoPersonalizado[] = [];
        if (config.pedeNome) mapeados.push({ id: "pedeNome", label: "Solicitar Nome", tipo: "text", obrigatorio: true });
        if (config.pedeIdade) mapeados.push({ id: "pedeIdade", label: "Solicitar Idade", tipo: "number", obrigatorio: true });
        if (config.pedeData) mapeados.push({ id: "pedeData", label: "Solicitar Data do Evento", tipo: "date", obrigatorio: true });
        if (config.pedeObs) mapeados.push({ id: "pedeObs", label: "Campo de Observações", tipo: "text", obrigatorio: false });
        setCampos(mapeados);
        if (mapeados.length > 0) setExpandido(false);
      }
    }
  }, [config]);

  useEffect(() => {
    carregarModelos();
  }, [lojistaId]);

  async function carregarModelos() {
    if (!lojistaId) return;
    try {
      const snap = await getDocs(collection(db, "lojistas", lojistaId, "modelos_requisitos"));
      setModelos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Erro ao carregar modelos do Firestore:", e);
    }
  }

  const adicionarCampo = () => {
    const novo: CampoPersonalizado = {
      id: "campo_" + Date.now().toString(),
      label: "",
      tipo: "text",
      obrigatorio: true
    };
    setCampos(prev => [...prev, novo]);
    setExpandido(true);
  };

  const removerCampo = (id: string) => {
    setCampos(prev => prev.filter(c => c.id !== id));
  };

  const removerPersonalizacaoTotal = () => {
    setCampos([]);
    setIdModeloSelecionado("");
    setExpandido(true);
    onSave([]);
  };

  const aplicarMascaraHora = (valorBruto: string): string => {
    let limpo = valorBruto.replace(/\D/g, "");
    if (limpo.length > 4) limpo = limpo.substring(0, 4);
    if (limpo.length >= 2) {
      let horas = parseInt(limpo.substring(0, 2), 10);
      if (horas > 23) horas = 23;
      limpo = String(horas).padStart(2, "0") + limpo.substring(2);
    }
    if (limpo.length === 4) {
      let minutos = parseInt(limpo.substring(2, 4), 10);
      if (minutos > 59) minutos = 59;
      limpo = limpo.substring(0, 2) + String(minutos).padStart(2, "0");
    }
    if (limpo.length > 2) {
      return limpo.substring(0, 2) + ":" + limpo.substring(2);
    }
    return limpo;
  };

  const atualizarSubCampo = (id: string, chave: keyof CampoPersonalizado, valor: any) => {
    setCampos(prev => prev.map(c => {
      if (c.id === id) {
        if (chave === "defaultValue" && c.tipo === "time") {
          return { ...c, [chave]: aplicarMascaraHora(valor) };
        }
        return { ...c, [chave]: valor };
      }
      return c;
    }));
  };

  const salvarComoModelo = async () => {
    if (!lojistaId) return alert("Erro: ID da loja não identificado.");
    if (!nomeModelo.trim() || campos.length === 0) return alert("Dê um nome e adicione pelo menos um campo.");

    try {
      const camposTratados = campos.map(c => ({
        id: c.id,
        label: c.label.trim() || "Campo sem nome",
        tipo: c.tipo,
        obrigatorio: !!c.obrigatorio,
        ...(c.defaultValue ? { defaultValue: c.defaultValue } : {})
      }));

      await addDoc(collection(db, "lojistas", lojistaId, "modelos_requisitos"), {
        nome: nomeModelo.trim(),
        campos: camposTratados,
        dataCriacao: new Date().toISOString()
      });

      alert("Modelo salvo para uso futuro!");
      setNomeModelo("");
      setIdModeloSelecionado("");
      carregarModelos();
    } catch (e) {
      alert("Erro ao salvar modelo.");
    }
  };

  const excluirModelo = async () => {
    if (!idModeloSelecionado || !lojistaId) return;
    if (!confirm("Tem certeza que deseja excluir este modelo?")) return;
    try {
      await deleteDoc(doc(db, "lojistas", lojistaId, "modelos_requisitos", idModeloSelecionado));
      setIdModeloSelecionado("");
      carregarModelos();
    } catch (e) {
      alert("Erro ao excluir modelo.");
    }
  };

  const handleAplicarAoProduto = () => {
    const camposValidados = campos.filter(c => c.label.trim() !== "");
    if (camposValidados.length === 0 && campos.length > 0) {
      alert("Alguns campos estão sem nome. Por favor, preencha ou exclua.");
      return;
    }
    onSave(camposValidados);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.6)', display: 'flex', 
      justifyContent: 'center', alignItems: 'center', zIndex: 2000
    }}>
      <div style={{
        background: theme.bgCard, color: theme.textMain, padding: '25px', borderRadius: '12px', 
        width: '95%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${theme.border}`
      }} onClick={e => e.stopPropagation()}>
        
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: theme.textMain, textAlign: 'center' }}>
          🎯 Personalização Inteligente
        </h3>

        {/* SELEÇÃO DE MODELO PRONTO */}
        <div style={{ 
          padding: '14px', background: theme.bgApp, borderRadius: '8px', 
          marginBottom: '20px', border: `1px solid ${theme.border}` 
        }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec }}>USAR MODELO SALVO:</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <select 
              style={{
                flex: 1, padding: '10px', borderRadius: '6px', 
                border: `1px solid ${theme.border}`, fontSize: '13px', outline: 'none',
                backgroundColor: theme.inputBg, color: theme.textMain
              }}
              value={idModeloSelecionado}
              onChange={(e) => {
                const id = e.target.value;
                setIdModeloSelecionado(id);
                if (id) {
                  const mod = modelos.find(m => m.id === id);
                  if (mod) {
                    setCampos(mod.campos || []);
                    setExpandido(false);
                  }
                } else {
                  setExpandido(true);
                }
              }}
            >
              <option value="">Selecione um modelo pronto...</option>
              {modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            
            {idModeloSelecionado && (
              <button 
                type="button" 
                title="Excluir Modelo" 
                style={{
                  padding: '10px', background: theme.inputBg, color: '#ef4444', 
                  border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer'
                }} 
                onClick={excluirModelo}
              >
                <Trash size={16} />
              </button>
            )}
          </div>
        </div>

        {/* SE HOUVER CAMPOS CONFIGURADOS E ESTIVER RECOLHIDO */}
        {campos.length > 0 && !expandido ? (
          <div style={{ 
            background: theme.bgApp, border: `1px solid ${theme.border}`, 
            borderRadius: '8px', padding: '15px', marginBottom: '20px', textAlign: 'center' 
          }}>
            <p style={{ fontSize: '13px', color: theme.textMain, fontWeight: '600', marginBottom: '8px' }}>
              Personalização ativa ({campos.length} campos configurados).
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
              <button 
                type="button" 
                onClick={() => setExpandido(true)} 
                style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Edit2 size={14} /> Ver / Editar campos
              </button>
              <button 
                type="button" 
                onClick={removerPersonalizacaoTotal} 
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <XCircle size={14} /> Remover Personalização
              </button>
            </div>
          </div>
        ) : (
          /* MODO DE CRIAÇÃO / EDIÇÃO LIVRE */
          <div style={{ marginBottom: '20px' }}>
            {campos.length > 0 && (
              <button 
                type="button" 
                style={{
                  width: '100%', padding: '10px', background: theme.bgApp, color: '#ef4444',
                  border: `1px dashed ${theme.border}`, borderRadius: '8px', fontWeight: '600',
                  cursor: 'pointer', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }} 
                onClick={removerPersonalizacaoTotal}
              >
                <XCircle size={16} /> Remover / Cancelar Personalização deste Produto
              </button>
            )}

            {campos.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: '13px', color: theme.textSec, margin: '20px 0' }}>
                Nenhum campo adicionado. O produto não terá campos de personalização.
              </p>
            )}

            {campos.map((campo, index) => (
              <div key={campo.id} style={{
                background: theme.bgApp, padding: '14px', borderRadius: '8px', 
                marginBottom: '10px', border: `1px solid ${theme.border}`, position: 'relative'
              }}>
                <button 
                  type="button" 
                  style={{ position: 'absolute', top: '10px', right: '10px', color: '#ef4444', cursor: 'pointer', background: 'none', border: 'none' }} 
                  onClick={() => removerCampo(campo.id)}
                >
                  <Trash2 size={18} />
                </button>
                
                <label style={{ fontSize: '11px', fontWeight: '700', color: theme.textSec, display: 'block', marginBottom: '4px' }}>
                  PERGUNTA #{index + 1}
                </label>
                
                <input 
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`,
                    marginBottom: '8px', fontSize: '14px', outline: 'none', background: theme.inputBg, color: theme.textMain
                  }}
                  placeholder="Ex: Horário da Cerimônia"
                  value={campo.label}
                  onChange={(e) => atualizarSubCampo(campo.id, 'label', e.target.value)}
                />

                {campo.tipo === "time" && (
                  <input
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '6px', border: `1px solid ${theme.primary}`,
                      marginBottom: '8px', fontSize: '14px', outline: 'none', background: theme.inputBg, color: theme.textMain
                    }}
                    placeholder="Ex: 14:30"
                    maxLength={5}
                    value={campo.defaultValue || ""}
                    onChange={(e) => atualizarSubCampo(campo.id, 'defaultValue', e.target.value)}
                  />
                )}

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select 
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`,
                      fontSize: '14px', outline: 'none', background: theme.inputBg, color: theme.textMain, flex: 1, marginBottom: 0
                    }}
                    value={campo.tipo}
                    onChange={(e) => {
                      const novoTipo = e.target.value;
                      atualizarSubCampo(campo.id, 'tipo', novoTipo);
                      if (novoTipo !== "time") atualizarSubCampo(campo.id, 'defaultValue', "");
                    }}
                  >
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="date">Data</option>
                    <option value="time">Hora</option>
                  </select>

                  <div 
                    onClick={() => atualizarSubCampo(campo.id, 'obrigatorio', !campo.obrigatorio)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: theme.textMain, userSelect: 'none' }}
                  >
                     <div style={{
                       width: '16px', height: '16px', border: `2px solid ${theme.primary}`, 
                       borderRadius: '4px', background: campo.obrigatorio ? theme.primary : 'transparent',
                       transition: '0.2s'
                     }} />
                     Obrigatório
                  </div>
                </div>
              </div>
            ))}

            <button 
              type="button" 
              style={{
                width: '100%', padding: '10px', background: theme.bgApp, color: theme.primary,
                border: `1px dashed ${theme.primary}`, borderRadius: '8px', fontWeight: '600',
                cursor: 'pointer', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }} 
              onClick={adicionarCampo}
            >
              <Plus size={18} /> Adicionar Campo Manual
            </button>
          </div>
        )}

        {/* OPÇÃO DE SALVAR COMO NOVO MODELO */}
        {campos.length > 0 && expandido && (
          <div style={{ marginBottom: '20px', padding: '12px', border: `1px solid ${theme.border}`, borderRadius: '8px', background: theme.bgApp }}>
             <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '5px' }}>
               SALVAR ESTA CONFIGURAÇÃO COMO MODELO:
             </label>
             <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`,
                  fontSize: '14px', outline: 'none', background: theme.inputBg, color: theme.textMain, flex: 1, marginBottom: 0
                }} 
                placeholder="Nome do modelo (ex: Convites)" 
                value={nomeModelo}
                onChange={e => setNomeModelo(e.target.value)}
              />
              <button 
                type="button"
                onClick={salvarComoModelo}
                style={{ padding: '0 15px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                <Save size={20} />
              </button>
            </div>
          </div>
        )}

        <button 
          type="button" 
          style={{ 
            width: '100%', padding: '12px', background: theme.primary, color: '#fff', 
            border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' 
          }} 
          onClick={handleAplicarAoProduto}
        >
          Aplicar ao Produto
        </button>
        
        <button 
          type="button"
          style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: theme.textSec, cursor: 'pointer', fontSize: '13px', marginTop: '5px'}} 
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
//Modal de personalizaçao de castro de produto