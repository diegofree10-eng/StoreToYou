import React from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

export default function UpgradeModal({ show, onClose, planos, planoAtual, onSolicitar }: any) {
  if (!show) return null;

  // 💰 Função auxiliar para extrair o preço do plano com segurança
  const obterPrecoDoPlano = (dadosDoPlano: any) => {
    return Number(
      dadosDoPlano?.preco ?? 
      dadosDoPlano?.vlPreco ?? 
      dadosDoPlano?.valor ?? 
      0
    );
  };

  const lidarComSolicitacao = (nomePlano: string, dadosDoPlano: any) => {
    const precoNovoPlano = obterPrecoDoPlano(dadosDoPlano);

    // Passa o plano atual, o novo plano e o preço correto para a função de solicitação
    onSolicitar({
      planoAtual: planoAtual || 'Bronze',
      planoDesejado: nomePlano,
      valorNovoPlano: precoNovoPlano
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>🚀 Escolha seu próximo nível</h3>
        <div style={styles.grid}>
          {Object.keys(planos)
          .filter((nomePlano) => nomePlano.toLowerCase() !== 'diamante')
          .map((nomePlano) => {
            const dadosDoPlano = planos[nomePlano];
            const precoFormatado = obterPrecoDoPlano(dadosDoPlano);

            return (
              <div key={nomePlano} style={styles.card}>
                <h4 style={{ color: dadosDoPlano.cor || '#000' }}>{nomePlano}</h4>
                <p style={styles.preco}>R$ {precoFormatado.toFixed(2)}/mês</p>
                <ul style={styles.lista}>
                  <li><FiCheck color="green" /> {dadosDoPlano.produtos} produtos</li>
                  <li><FiCheck color="green" /> {dadosDoPlano.categorias} categorias</li>
                  <li>{dadosDoPlano.temCupons ? <FiCheck color="green" /> : <FiX color="red" />} Cupons</li>
                  <li>{dadosDoPlano.temLogistica ? <FiCheck color="green" /> : <FiX color="red" />} Logística</li>
                </ul>
                {planoAtual !== nomePlano && (
                  <button 
                    type="button" 
                    onClick={() => lidarComSolicitacao(nomePlano, dadosDoPlano)} 
                    style={styles.btn}
                  >
                    SOLICITAR UPGRADE
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={onClose} style={styles.btnClose}>Fechar</button>
      </div>
    </div>
  );
}

// DEFINIÇÃO DOS ESTILOS:
const styles: any = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000 },
  modal: { background: '#fff', padding: '30px', borderRadius: '20px', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' },
  card: { border: '1px solid #e2e8f0', padding: '20px', borderRadius: '15px', textAlign: 'center' },
  preco: { fontSize: '20px', fontWeight: 'bold', margin: '10px 0' },
  lista: { listStyle: 'none', padding: 0, textAlign: 'left', fontSize: '14px', marginBottom: '20px' },
  btn: { width: '100%', padding: '10px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  btnClose: { marginTop: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }
};
// modal para o logista solicitar upgrade de planos