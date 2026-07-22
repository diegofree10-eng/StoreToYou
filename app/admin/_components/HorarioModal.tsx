"use client";

import React from "react";

interface HorarioModalProps {
  show: boolean;
  onClose: () => void;
  horarios: any;
  setHorarios: (novos: any) => void;
}

const modalStyles: { [key: string]: React.CSSProperties } = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', width: '95%', maxWidth: '500px', borderRadius: '16px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  day: { fontSize: '14px', fontWeight: 'bold', width: '80px', textTransform: 'capitalize' },
  input: { padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' },
  btnConfirm: { width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }
};

const DIAS: { [key: string]: string } = {
  seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", sab: "Sábado", dom: "Domingo"
};

export default function HorarioModal({ show, onClose, horarios, setHorarios }: HorarioModalProps) {
  if (!show) return null;

  const handleUpdate = (dia: string, campo: string, valor: any) => {
    setHorarios({ ...horarios, [dia]: { ...horarios[dia], [campo]: valor } });
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: '20px', fontWeight: '800' }}>🕗 Horário de Atendimento</h3>
        
        {Object.keys(DIAS).map(dia => (
          <div key={dia} style={modalStyles.row}>
            <span style={modalStyles.day}>{DIAS[dia]}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="time" 
                disabled={!horarios[dia]?.ativo}
                value={horarios[dia]?.inicio} 
                onChange={e => handleUpdate(dia, 'inicio', e.target.value)}
                style={modalStyles.input}
              />
              <span>às</span>
              <input 
                type="time" 
                disabled={!horarios[dia]?.ativo}
                value={horarios[dia]?.fim} 
                onChange={e => handleUpdate(dia, 'fim', e.target.value)}
                style={modalStyles.input}
              />
            </div>
            <input 
              type="checkbox" 
              checked={horarios[dia]?.ativo} 
              onChange={e => handleUpdate(dia, 'ativo', e.target.checked)}
            />
          </div>
        ))}

        <button style={modalStyles.btnConfirm} onClick={onClose}>Salvar Horários</button>
      </div>
    </div>
  );
}