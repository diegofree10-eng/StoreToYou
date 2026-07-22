"use client";

import React from "react";
import { Gift, Check, Truck } from "lucide-react";

interface ModalDecisaoFreteProps {
  isOpen: boolean;
  config: {
    corTexto: string;
    corSecundaria: string;
  };
  onEscolhaGratis: () => void;
  onEscolhaPago: () => void;
}

export default function ModalDecisaoFrete({
  isOpen,
  config,
  onEscolhaGratis,
  onEscolhaPago,
}: ModalDecisaoFreteProps) {
  if (!isOpen) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.container}>
        <div style={{ ...modalStyles.iconWrapper, backgroundColor: config.corSecundaria }}>
          <Gift size={32} color={config.corTexto} />
        </div>

        <h3 style={{ color: config.corTexto, ...modalStyles.title }}>
          Você ganhou FRETE GRÁTIS! 🎉
        </h3>
        
        <p style={modalStyles.description}>
          Identificamos que o valor dos seus produtos atingiu o mínimo para a promoção. Como você prefere receber a sua encomenda?
        </p>

        <div style={modalStyles.btnGroup}>
          <button onClick={onEscolhaGratis} style={modalStyles.btnGratis}>
            <Check size={18} strokeWidth={3} /> QUERO FRETE GRÁTIS
          </button>

          <button onClick={onEscolhaPago} style={modalStyles.btnPago}>
            <Truck size={18} /> ESCOLHER OUTRO (MAIS RÁPIDO)
          </button>
        </div>
      </div>
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 10000, padding: '20px', boxSizing: 'border-box',
    backdropFilter: 'blur(3px)'
  },
  container: {
    background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '20px',
    padding: '25px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    textAlign: 'center', boxSizing: 'border-box'
  },
  iconWrapper: {
    width: '60px', height: '60px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px'
  },
  title: { margin: '0 0 10px 0', fontSize: '1.3rem', fontWeight: 'bold' },
  description: { color: '#64748b', fontSize: '14px', lineHeight: '1.5', margin: '0 0 25px 0' },
  btnGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
  btnGratis: {
    width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
    backgroundColor: '#25D366', color: '#fff', fontWeight: 'bold', fontSize: '14px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  },
  btnPago: {
    width: '100%', padding: '14px', border: `1px solid #cbd5e1`, borderRadius: '12px',
    backgroundColor: '#fff', color: '#64748b', fontWeight: 'bold', fontSize: '14px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  }
};