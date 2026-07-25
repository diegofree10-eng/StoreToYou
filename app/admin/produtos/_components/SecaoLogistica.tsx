"use client";

import React from "react";
import { styles } from "../styles"; // Ajuste o caminho do import de estilos se necessário

interface SecaoLogisticaProps {
  envioTransportadora: boolean;
  setEnvioTransportadora: (v: boolean) => void;
  permiteRetirada: boolean;
  setPermiteRetirada: (v: boolean) => void;
  peso: string;
  setPeso: (v: string) => void;
  comprimento: string;
  setComprimento: (v: string) => void;
  largura: string;
  setLargura: (v: string) => void;
  altura: string;
  setAltura: (v: string) => void;
  formatInput: (value: string, setter: (v: string) => void) => void;
}

export default function SecaoLogistica({
  envioTransportadora, setEnvioTransportadora,
  permiteRetirada, setPermiteRetirada,
  peso, setPeso,
  comprimento, setComprimento,
  largura, setLargura,
  altura, setAltura,
  formatInput
}: SecaoLogisticaProps) {
  return (
    <div style={{ marginTop: '20px' }}>
      <h3 style={styles.sideTitle}>🚚 Configurações de Logística e Frete</h3>

      {/* Opções de Envio / Retirada */}
      <div style={{ ...styles.boxGray, marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block' }}>
          Modalidades Disponíveis
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ ...styles.checkLabel, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={envioTransportadora} 
              onChange={e => setEnvioTransportadora(e.target.checked)} 
            />
            <span>Envio por Transportadora</span>
          </label>
          <label style={{ ...styles.checkLabel, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={permiteRetirada} 
              onChange={e => setPermiteRetirada(e.target.checked)} 
            />
            <span>Permitir Retirada na Loja</span>
          </label>
        </div>
      </div>

      {/* Dimensões e Pesos (Exibido apenas se envio por transportadora estiver ativo) */}
      {envioTransportadora ? (
        <div style={styles.boxGray}>
          <label style={styles.miniLabel}>Medidas para Cálculo (Melhor Envio) *</label>
          <div style={styles.grid2}>
            <input 
              style={styles.inputSmall} 
              value={peso} 
              onChange={e => formatInput(e.target.value, setPeso)} 
              placeholder="Peso kg" 
            />
            <input 
              style={styles.inputSmall} 
              value={comprimento} 
              onChange={e => formatInput(e.target.value, setComprimento)} 
              placeholder="Comp cm" 
            />
            <input 
              style={styles.inputSmall} 
              value={largura} 
              onChange={e => formatInput(e.target.value, setLargura)} 
              placeholder="Larg cm" 
            />
            <input 
              style={styles.inputSmall} 
              value={altura} 
              onChange={e => formatInput(e.target.value, setAltura)} 
              placeholder="Alt cm" 
            />
          </div>
        </div>
      ) : (
        <div style={{ ...styles.boxGray, background: '#fef2f2', border: '1px solid #fee2e2' }}>
          <p style={{ fontSize: '11px', color: '#b91c1c', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
            {permiteRetirada ? '🏪 Produto exclusivo para Retirada' : '📧 Produto Digital (Sem frete)'}
          </p>
        </div>
      )}
    </div>
  );
}

//Pesos e dimensões de frete
//contendo as opções de envio por transportadora,
// retirada na loja e os campos de peso e dimensões: