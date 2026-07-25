
"use client";

import React from "react";
import { FiSettings } from "react-icons/fi";
import { styles } from "../styles"; // Ajuste o caminho do import de estilos se necessário

interface FormularioProdutoProps {
  nome: string;
  setNome: (v: string) => void;
  sku: string;
  setSku: (v: string) => void;
  setIsModalSKUOpen: (v: boolean) => void;
  categoria: string;
  setCategoria: (v: string) => void;
  subcategoria: string;
  setSubcategoria: (v: string) => void;
  listaCategorias: any[];
  setShowCatManager: (v: boolean) => void;
  descricao: string;
  setShowDescModal: (v: boolean) => void;
  precoBasico: string;
  setPrecoBasico: (v: string) => void;
  custoUnitario: string;
  setCustoUnitario: (v: string) => void;
  temVariaveisComPreco: boolean;
  setShowVarModal: (v: boolean) => void;
  setShowReqModal: (v: boolean) => void;
  requisitos: any;
  formatInput: (value: string, setter: (v: string) => void) => void;
  imagens: string[];
  setImagens: React.Dispatch<React.SetStateAction<string[]>>;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  uploading: boolean;
  setTipoCropAtual: (v: "principal" | "variacao") => void;
  setArquivoParaCortar: (file: File | null) => void;
}

export default function FormularioProduto({
  nome, setNome,
  sku, setSku,
  setIsModalSKUOpen,
  categoria, setCategoria,
  subcategoria, setSubcategoria,
  listaCategorias,
  setShowCatManager,
  descricao, setShowDescModal,
  precoBasico, setPrecoBasico,
  custoUnitario, setCustoUnitario,
  temVariaveisComPreco,
  setShowVarModal,
  setShowReqModal,
  requisitos,
  formatInput,
  imagens, setImagens,
  files, setFiles,
  uploading,
  setTipoCropAtual,
  setArquivoParaCortar
}: FormularioProdutoProps) {
  return (
    <div>
      <h3 style={styles.sideTitle}>📦 Informações Básicas do Produto</h3>
      
      {/* Nome do Produto */}
      <input 
        style={styles.input} 
        value={nome} 
        onChange={e => setNome(e.target.value)} 
        placeholder="Nome do Produto *" 
      />

      {/* SKU e Gerador */}
      <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block', marginTop: '10px' }}>
        SKU (Código)
      </label>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <input 
          style={{ ...styles.input, marginBottom: 0 }} 
          value={sku} 
          onChange={e => setSku(e.target.value.toUpperCase())} 
          placeholder="Ex: CAM-AZU-G" 
        />
        <button 
          type="button" 
          onClick={() => setIsModalSKUOpen(true)} 
          style={{ padding: '0 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Gen
        </button>
      </div>

      {/* Categoria e Subcategoria */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <select 
          style={{ ...styles.input, marginBottom: 0, flex: 1 }} 
          value={categoria} 
          onChange={e => { setCategoria(e.target.value); setSubcategoria(""); }}
        >
          <option value="">Categoria... *</option>
          {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
        </select>
        <button type="button" onClick={() => setShowCatManager(true)} style={styles.btnActionSmall}>
          <FiSettings />
        </button>
      </div>

      {categoria && listaCategorias.find(c => c.nome === categoria)?.subcategorias?.length > 0 && (
        <select style={styles.input} value={subcategoria} onChange={e => setSubcategoria(e.target.value)}>
          <option value="">Subcategoria (Opcional)</option>
          {listaCategorias.find(c => c.nome === categoria).subcategorias.map((sub: string, i: number) => (
            <option key={i} value={sub}>{sub}</option>
          ))}
        </select>
      )}

      {/* Botões de Modais de Apoio */}
      <button 
        type="button"
        onClick={() => setShowVarModal(true)} 
        style={{ ...styles.btnUpload, border: '1px solid #ee4d2d', color: '#ee4d2d', fontWeight: 'bold', marginBottom: '10px' }}
      >
        {temVariaveisComPreco ? "⚙️ Editar Grade" : "➕ Adicionar Grade"}
      </button>

      <button 
        type="button"
        onClick={() => setShowReqModal(true)} 
        style={{ ...styles.btnUpload, border: '1px solid #d946ef', color: '#d946ef', fontWeight: 'bold', marginBottom: '10px' }}
      >
        🎯 Personalização ({Object.values(requisitos || {}).filter(Boolean).length})
      </button>

      {/* Descrição */}
      <textarea 
        style={styles.textarea} 
        value={descricao} 
        onClick={() => setShowDescModal(true)} 
        readOnly 
        placeholder="Descrição... *" 
      />

      {/* Valores de Preço e Custo */}
      <div style={{ ...styles.boxGray, opacity: temVariaveisComPreco ? 0.6 : 1, marginBottom: '10px' }}>
        <label style={styles.miniLabel}>Valores R$</label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input 
            disabled={temVariaveisComPreco} 
            style={{ ...styles.input, marginBottom: 0 }} 
            value={temVariaveisComPreco ? "Grade" : precoBasico} 
            onChange={e => formatInput(e.target.value, setPrecoBasico)} 
            placeholder="Venda" 
          />
          <input 
            disabled={temVariaveisComPreco} 
            style={{ ...styles.input, marginBottom: 0 }} 
            value={temVariaveisComPreco ? "Grade" : custoUnitario} 
            onChange={e => formatInput(e.target.value, setCustoUnitario)} 
            placeholder="Custo" 
          />
        </div>
      </div>

      {/* Pré-visualização de Imagens */}
      <div style={styles.previewGrid}>
        {imagens.map((img, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img src={img} style={styles.imgThumb} alt="Thumbnail" />
            <button 
              type="button"
              onClick={() => setImagens(imagens.filter((_, idx) => idx !== i))} 
              style={styles.btnDelImg}
            >
              ×
            </button>
          </div>
        ))}
        {files.map((f, i) => (
          <img key={i} src={URL.createObjectURL(f)} style={{ ...styles.imgThumb, border: '2px solid #3b82f6' }} alt="New Upload" />
        ))}
      </div>

      {/* Botão de Upload de Fotos */}
      <button type="button" style={styles.btnUpload}>
        <input
          type="file"
          accept="image/*"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              setTipoCropAtual("principal");
              setArquivoParaCortar(e.target.files[0]);
            }
          }}
          style={styles.fileInvis}
        />
        {uploading ? "Enviando..." : "📷 Fotos *"}
      </button>
    </div>
  );
}

//Campos básicos, nome, SKU e descrição)
//contendo os campos básicos, nome, SKU, categoria, descrição,
// valores, upload de fotos e botões de modais: