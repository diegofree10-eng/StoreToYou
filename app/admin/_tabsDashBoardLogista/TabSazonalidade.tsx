"use client";

import React from "react";

interface TabSazonalidadeProps {
  sazonalidade: number[];
  nomesMeses: string[];
  formatarMoeda: (v: number) => string;
}

export const TabSazonalidade = ({ sazonalidade, nomesMeses, formatarMoeda }: TabSazonalidadeProps) => {
  const maxValor = Math.max(...sazonalidade) || 1;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '220px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        {sazonalidade.map((valor, idx) => {
          const altura = (valor / maxValor) * 100;
          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>
                {valor > 0 ? formatarMoeda(valor).split(",")[0] : ""}
              </div>
              <div 
                style={{ 
                  width: '100%', 
                  height: `${Math.max(3, altura)}%`, 
                  borderRadius: '4px 4px 0 0', 
                  transition: '0.5s', 
                  backgroundColor: valor > 0 ? '#3498db' : '#cbd5e1' 
                }} 
                title={formatarMoeda(valor)}
              ></div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '8px', color: '#64748b' }}>{nomesMeses[idx]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};