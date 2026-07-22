import React from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

export default function UpgradeModal({ show, onClose, planos, planoAtual, onSolicitar }: any) {
  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>🚀 Escolha seu próximo nível</h3>
        <div style={styles.grid}>
          {Object.keys(planos)
          .filter((nomePlano) => nomePlano.toLowerCase() !== 'diamante')
          .map((nomePlano) => (
            <div key={nomePlano} style={styles.card}>
              <h4 style={{ color: planos[nomePlano].cor }}>{nomePlano}</h4>
              <p style={styles.preco}>R$ {planos[nomePlano].preco}/mês</p>
              <ul style={styles.lista}>
                <li><FiCheck color="green" /> {planos[nomePlano].produtos} produtos</li>
                <li><FiCheck color="green" /> {planos[nomePlano].categorias} categorias</li>
                <li>{planos[nomePlano].temCupons ? <FiCheck color="green" /> : <FiX color="red" />} Cupons</li>
                <li>{planos[nomePlano].temLogistica ? <FiCheck color="green" /> : <FiX color="red" />} Logística</li>
              </ul>
              {planoAtual !== nomePlano && (
                <button onClick={() => onSolicitar(nomePlano)} style={styles.btn}>SOLICITAR UPGRADE</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={onClose} style={styles.btnClose}>Fechar</button>
      </div>
    </div>
  );
}

// DEFINIÇÃO DOS ESTILOS ABAIXO:
const styles: any = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000 },
  modal: { background: '#fff', padding: '30px', borderRadius: '20px', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' },
  card: { border: '1px solid #e2e8f0', padding: '20px', borderRadius: '15px', textAlign: 'center' },
  preco: { fontSize: '20px', fontWeight: 'bold', margin: '10px 0' },
  lista: { listStyle: 'none', padding: 0, textAlign: 'left', fontSize: '14px', marginBottom: '20px' },
  btn: { width: '100%', padding: '10px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  btnClose: { marginTop: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }
};