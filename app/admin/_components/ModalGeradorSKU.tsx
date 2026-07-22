"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Trash, HelpCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, query } from "firebase/firestore";

// Reutilizando seu padrão de estilo
const modalStyles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  content: { background: '#fff', padding: '25px', borderRadius: '12px', width: '95%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#1e293b', textAlign: 'center' },
  headerSection: { padding: '12px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' },
  modelSelect: { flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' },
  fieldCard: { background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e2e8f0', position: 'relative' },
  input: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px', fontSize: '14px', outline: 'none' },
  btnSave: { width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  btnDeleteField: { position: 'absolute', top: '10px', right: '10px', color: '#ef4444', cursor: 'pointer', background: 'none', border: 'none' },
  btnAdd: { width: '100%', padding: '10px', background: '#f0f9ff', color: '#0369a1', border: '1px dashed #0369a1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  tooltip: { position: 'absolute', background: '#334155', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', zIndex: 9999, pointerEvents: 'none', whiteSpace: 'nowrap', marginTop: '5px' }
};

interface AtributoSKU { id: string; label: string; value: string; }

export default function ModalGeradorSKU({ lojistaId, onSave, onClose }: any) {
  const [atributos, setAtributos] = useState<AtributoSKU[]>([{ id: "1", label: "CATEGORIA", value: "" }]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [nomeModelo, setNomeModelo] = useState("");
  const [idModelo, setIdModelo] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => { carregarModelos(); }, [lojistaId]);

  async function carregarModelos() {
    if (!lojistaId) return;
    const snap = await getDocs(collection(db, "lojistas", lojistaId, "modelos_sku"));
    setModelos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  const gerarSku = () => atributos.map(a => a.value.trim().toUpperCase()).filter(Boolean).join("-");

  const salvarModelo = async () => {
    // Verificação de segurança: se o ID não existir, avisa e para a função
    if (!lojistaId) {
        alert("Erro: Não foi possível identificar a loja. Tente recarregar a página.");
        console.error("Erro: lojistaId está undefined no modal.");
        return;
    }

    if (!nomeModelo) return alert("Dê um nome ao modelo (ex: Adesivos).");

    try {
        await addDoc(collection(db, "lojistas", lojistaId, "modelos_sku"), { 
            nome: nomeModelo, 
            atributos 
        });
        alert("Modelo salvo com sucesso!");
        setNomeModelo("");
        carregarModelos();
    } catch (error) {
        console.error("Erro ao salvar no Firebase:", error);
        alert("Erro ao salvar. Verifique sua conexão.");
    }
};

  const Tooltip = ({ id, text }: { id: string, text: string }) => (
    hovered === id ? <div style={modalStyles.tooltip}>{text}</div> : null
  );

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.content} onClick={e => e.stopPropagation()}>
        <h3 style={modalStyles.title}>⚙️ Gerador de SKU Inteligente</h3>

        {/* Header: Modelos */}
        <div style={modalStyles.headerSection}>
          <label style={{fontSize: '11px', fontWeight: 'bold', color: '#64748b'}}>MODELOS SALVOS:</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <select style={modalStyles.modelSelect} value={idModelo} onChange={(e) => {
              const id = e.target.value;
              setIdModelo(id);
              const mod = modelos.find(m => m.id === id);
              if (mod) setAtributos(mod.atributos);
            }}>
              <option value="">Selecione um modelo...</option>
              {modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            {idModelo && (
                <button style={{background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0 10px', cursor: 'pointer'}} 
                  onClick={async () => { await deleteDoc(doc(db, "lojistas", lojistaId, "modelos_sku", idModelo)); setIdModelo(""); carregarModelos(); }}>
                  <Trash size={16} color="#ef4444"/>
                </button>
            )}
          </div>
        </div>

        {/* Campos Dinâmicos */}
        {atributos.map((attr, index) => (
          <div key={attr.id} style={modalStyles.fieldCard}>
            <button style={modalStyles.btnDeleteField} onClick={() => setAtributos(prev => prev.filter(a => a.id !== attr.id))}><Trash2 size={16}/></button>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>ATRIBUTO {index + 1}</span>
                <div onMouseEnter={() => setHovered(attr.id)} onMouseLeave={() => setHovered(null)}>
                    <HelpCircle size={14} color="#94a3b8" />
                    <Tooltip id={attr.id} text="Ex: Categoria, Cor, Tamanho, Material" />
                </div>
            </div>

            <div style={{display: 'flex', gap: '5px'}}>
              <input style={modalStyles.input} placeholder="Nome (Ex: COR)" value={attr.label} onChange={e => setAtributos(prev => prev.map(a => a.id === attr.id ? {...a, label: e.target.value} : a))} />
              <input style={modalStyles.input} placeholder="Valor (Ex: AZU)" value={attr.value} onChange={e => setAtributos(prev => prev.map(a => a.id === attr.id ? {...a, value: e.target.value} : a))} />
            </div>
          </div>
        ))}

        <button style={{...modalStyles.btnAdd, marginBottom: '20px'}} onClick={() => setAtributos(prev => [...prev, { id: Date.now().toString(), label: "", value: "" }])}>
            <Plus size={16}/> Adicionar Atributo
        </button>

        {/* Preview */}
        <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}>
          <label style={{ fontSize: '10px', display: 'block', marginBottom: '5px', color: '#0369a1' }}>SKU FINAL:</label>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0369a1' }}>{gerarSku() || "Aguardando..."}</span>
        </div>

        {/* Salvar Modelo */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
            <input placeholder="Salvar modelo como..." style={modalStyles.input} value={nomeModelo} onChange={e => setNomeModelo(e.target.value)} />
            <button style={{ padding: '0 15px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={salvarModelo}><Save size={20}/></button>
        </div>

        <button style={modalStyles.btnSave} onClick={() => onSave(gerarSku())}>Aplicar SKU</button>
        <button style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginTop: '10px', fontSize: '13px' }} onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}