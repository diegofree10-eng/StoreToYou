"use client";

import React from "react";

interface CupomModalProps {
  show: boolean;
  onClose: () => void;
  cupons: any;
  setCupons: (novosCupons: any) => void;
  limiteCupons: number;
  planoAtivo: string;
}

const modalStyles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', width: '95%', maxWidth: '500px', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 },
  sectionTitle: { fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', marginTop: '20px' },
  itemList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '4px' },
  cupomRow: { display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  input: { padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' },
  select: { padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', cursor: 'pointer' },
  btnAdd: { width: '100%', padding: '12px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' },
  btnConfirm: { width: '100%', padding: '14px', background: '#059669', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' },
};

export default function CupomModal({ 
  show, 
  onClose, 
  cupons = {}, 
  setCupons, 
  limiteCupons, 
  planoAtivo,
}: CupomModalProps) {
  
  if (!show) return null;

  const handleCriarCupom = () => {
    const nome = prompt("Código do cupom:")?.toUpperCase().trim();
    if (!nome) return;

    if (cupons[nome]) {
      alert("Este cupom já existe!");
      return;
    }

    // Pergunta o tipo de desconto ao lojista de forma interativa
    const ehPorcentagem = confirm("O desconto deste cupom será por PORCENTAGEM (%)?\n\n[OK] para Porcentagem (%)\n[Cancelar] para Valor Fixo (R$)");
    const tipoDefinido = ehPorcentagem ? "porcentagem" : "fixo";

    setCupons({ 
      ...cupons, 
      [nome]: { valor: 0, tipo: tipoDefinido, ativo: true } 
    });
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>🎟️ Cupons de Desconto</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <button style={modalStyles.btnAdd} onClick={handleCriarCupom}>+ Novo Cupom</button>
        
        <div style={modalStyles.itemList}>
          {Object.keys(cupons).map(nome => (
            <div key={nome} style={modalStyles.cupomRow}>
              <div style={{ flex: 1, fontWeight: 'bold', fontSize: '13px', wordBreak: 'break-all' }}>{nome}</div>
              
              {/* Input Numérico de valor */}
              <input 
                type="number" 
                style={{ ...modalStyles.input, width: '70px' }} 
                placeholder="0"
                value={cupons[nome].valor || ""} 
                onChange={e => setCupons({
                  ...cupons, 
                  [nome]: { ...cupons[nome], valor: Number(e.target.value) }
                })}
              />

              {/* Seletor dinâmico do tipo de cupom ao lado do input */}
              <select
                style={modalStyles.select}
                value={cupons[nome].tipo || "fixo"}
                onChange={e => setCupons({
                  ...cupons,
                  [nome]: { ...cupons[nome], tipo: e.target.value }
                })}
              >
                <option value="fixo">R$</option>
                <option value="porcentagem">%</option>
              </select>

              {/* Botão de Excluir */}
              <button onClick={() => {
                const n = { ...cupons }; 
                delete n[nome]; 
                setCupons(n);
              }} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px' }}>✕</button>
            </div>
          ))}

          {Object.keys(cupons).length === 0 && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Nenhum cupom cadastrado.</p>
          )}
        </div>

        <button style={modalStyles.btnConfirm} onClick={onClose}>Salvar e Fechar</button>
      </div>
    </div>
  );
}