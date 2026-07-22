"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Trash } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

const modalStyles: { [key: string]: React.CSSProperties } = {
  overlay: { 
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
    background: 'rgba(0,0,0,0.6)', display: 'flex', 
    justifyContent: 'center', alignItems: 'center', zIndex: 2000 
  },
  content: { 
    background: '#fff', padding: '25px', borderRadius: '12px', 
    width: '95%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    maxHeight: '90vh', overflowY: 'auto'
  },
  title: { fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#1e293b', textAlign: 'center' },
  headerSection: { 
    padding: '12px', background: '#f1f5f9', borderRadius: '8px', 
    marginBottom: '20px', border: '1px solid #e2e8f0' 
  },
  modelSelectContainer: {
    display: 'flex', gap: '8px', marginTop: '8px'
  },
  modelSelect: {
    flex: 1, padding: '10px', borderRadius: '6px', 
    border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none'
  },
  btnActionIcon: {
    padding: '10px', background: '#fee2e2', color: '#ef4444', 
    border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer'
  },
  fieldCard: {
    background: '#f8fafc', padding: '12px', borderRadius: '8px', 
    marginBottom: '10px', border: '1px solid #e2e8f0', position: 'relative'
  },
  input: {
    width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1',
    marginBottom: '8px', fontSize: '14px', outline: 'none'
  },
  btnAdd: {
    width: '100%', padding: '10px', background: '#f0f9ff', color: '#0369a1',
    border: '1px dashed #0369a1', borderRadius: '8px', fontWeight: '600',
    cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  },
  btnSave: { 
    width: '100%', padding: '12px', background: '#d946ef', color: '#fff', 
    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' 
  },
  btnDeleteField: {
    position: 'absolute', top: '10px', right: '10px', color: '#ef4444', cursor: 'pointer',
    background: 'none', border: 'none'
  }
};

interface CampoPersonalizado {
  id: string;
  label: string;
  tipo: "text" | "number" | "date" | "time";
  obrigatorio: boolean;
  defaultValue?: string; // Para armazenar o valor padrão se necessário
}

interface Props {
  lojistaId: string;
  config: any;
  onSave: (novosCampos: any) => void;
  onClose: () => void;
}

export default function RequisitosModal({ lojistaId, config, onSave, onClose }: Props) {
  const [campos, setCampos] = useState<CampoPersonalizado[]>([]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [nomeModelo, setNomeModelo] = useState("");
  const [idModeloSelecionado, setIdModeloSelecionado] = useState("");

  useEffect(() => {
    if (config) {
      if (Array.isArray(config)) {
        setCampos(config);
      } else if (typeof config === "object") {
        const mapeados: CampoPersonalizado[] = [];
        if (config.pedeNome) mapeados.push({ id: "pedeNome", label: "Solicitar Nome", tipo: "text", obrigatorio: true });
        if (config.pedeIdade) mapeados.push({ id: "pedeIdade", label: "Solicitar Idade", tipo: "number", obrigatorio: true });
        if (config.pedeData) mapeados.push({ id: "pedeData", label: "Solicitar Data do Evento", tipo: "date", obrigatorio: true });
        if (config.pedeObs) mapeados.push({ id: "pedeObs", label: "Campo de Observações", tipo: "text", obrigatorio: false });
        setCampos(mapeados);
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
  };

  const removerCampo = (id: string) => {
    setCampos(prev => prev.filter(c => c.id !== id));
  };

  // 🔥 NOVA FUNÇÃO: Máscara estrita de Horário executada em tempo real 🔥
  const aplicarMascaraHora = (valorBruto: string): string => {
    let limpo = valorBruto.replace(/\D/g, ""); // Remove letras imediatamente
    
    if (limpo.length > 4) limpo = limpo.substring(0, 4);

    if (limpo.length >= 2) {
      let horas = parseInt(limpo.substring(0, 2), 10);
      if (horas > 23) horas = 23; // Teto de horas de um dia
      limpo = String(horas).padStart(2, "0") + limpo.substring(2);
    }

    if (limpo.length === 4) {
      let minutos = parseInt(limpo.substring(2, 4), 10);
      if (minutos > 59) minutos = 59; // Teto de minutos de uma hora
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
        // Se o lojista estiver digitando um valor padrão para o campo e for do tipo "time", mascara ele
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
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.content} onClick={e => e.stopPropagation()}>
        <h3 style={modalStyles.title}>🎯 Personalização Inteligente</h3>

        <div style={modalStyles.headerSection}>
          <label style={{fontSize: '11px', fontWeight: 'bold', color: '#64748b'}}>USAR MODELO SALVO:</label>
          <div style={modalStyles.modelSelectContainer}>
            <select 
              style={modalStyles.modelSelect}
              value={idModeloSelecionado}
              onChange={(e) => {
                const id = e.target.value;
                setIdModeloSelecionado(id);
                const mod = modelos.find(m => m.id === id);
                if (mod) setCampos(mod.campos || []);
              }}
            >
              <option value="">Selecione um modelo pronto...</option>
              {modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            
            {idModeloSelecionado && (
              <button type="button" title="Excluir Modelo" style={modalStyles.btnActionIcon} onClick={excluirModelo}>
                <Trash size={16} />
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          {campos.length === 0 && (
            <p style={{textAlign: 'center', fontSize: '13px', color: '#94a3b8', margin: '20px 0'}}>
              Nenhum campo adicionado ainda.
            </p>
          )}
          {campos.map((campo, index) => (
            <div key={campo.id} style={modalStyles.fieldCard}>
              <button type="button" style={modalStyles.btnDeleteField} onClick={() => removerCampo(campo.id)}>
                <Trash2 size={18} />
              </button>
              
              <label style={{fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px'}}>
                PERGUNTA #{index + 1}
              </label>
              
              <input 
                style={modalStyles.input}
                placeholder="Ex: Horário da Cerimônia"
                value={campo.label}
                onChange={(e) => atualizarSubCampo(campo.id, 'label', e.target.value)}
              />

              {/* Se for do tipo hora, renderiza opcionalmente um teste da máscara */}
              {campo.tipo === "time" && (
                <input
                  style={{ ...modalStyles.input, background: '#fff', borderColor: '#d946ef' }}
                  placeholder="Teste a máscara de hora aqui (Ex: 14:30)"
                  maxLength={5}
                  value={campo.defaultValue || ""}
                  onChange={(e) => atualizarSubCampo(campo.id, 'defaultValue', e.target.value)}
                />
              )}

              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <select 
                  style={{...modalStyles.input, marginBottom: 0, flex: 1}}
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
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', userSelect: 'none' }}
                >
                   <div style={{
                     width: '16px', height: '16px', border: '2px solid #d946ef', 
                     borderRadius: '4px', background: campo.obrigatorio ? '#d946ef' : 'transparent',
                     transition: '0.2s'
                   }} />
                   Obrigatório
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" style={modalStyles.btnAdd} onClick={adicionarCampo}>
          <Plus size={18} /> Adicionar Campo Manual
        </button>

        {campos.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
             <label style={{fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px'}}>
               SALVAR ESTA CONFIGURAÇÃO COMO MODELO:
             </label>
             <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                style={{...modalStyles.input, marginBottom: 0, flex: 1}} 
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

        <button type="button" style={modalStyles.btnSave} onClick={handleAplicarAoProduto}>
          Aplicar ao Produto
        </button>
        
        <button 
          type="button"
          style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', marginTop: '5px'}} 
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}