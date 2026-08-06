// app/admin/_components/ModalGeradorSkuVariacoes.tsx
"use client";

import React, { useState } from "react";
import { styles } from "../produtos/styles";

interface ModalGeradorSkuVariacoesProps {
  onClose: () => void;
  onSave: (skuBaseGerado: string) => void;
  lojistaId?: string;
}

/**
 * Função inteligente para tratar nomes compostos (ex: "Bandeirinha PARABENS" -> "BAN-PARA")
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

export default function ModalGeradorSkuVariacoes({ onClose, onSave }: ModalGeradorSkuVariacoesProps) {
  const [skuBase, setSkuBase] = useState("");

  const handleGerar = () => {
    if (!skuBase.trim()) {
      alert("Por favor, digite o SKU Base.");
      return;
    }
    onSave(skuBase.trim().toUpperCase());
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 3000
    }}>
      <div style={{
        background: '#fff',
        padding: '25px',
        borderRadius: '12px',
        width: '95%',
        maxWidth: '420px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#1e293b', textAlign: 'center' }}>
          ⚡ Gerar SKUs em Massa
        </h3>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px', textAlign: 'center' }}>
          Digite o SKU Base. O sistema preencherá automaticamente todas as variações combinando-o de forma inteligente (suporta nomes compostos).
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '6px' }}>
            SKU Base do Produto
          </label>
          <input
            style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
            placeholder="Ex: KIT-FESTA"
            value={skuBase}
            onChange={e => setSkuBase(e.target.value.toUpperCase())}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f1f5f9',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#334155'
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGerar}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Gerar SKUs
          </button>
        </div>
      </div>
    </div>
  );
}

// Exportando a função utilitária caso o componente pai precise aplicar a regra nas combinações
export { gerarSufixoInteligente };