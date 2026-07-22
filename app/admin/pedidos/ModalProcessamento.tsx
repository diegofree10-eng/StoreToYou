'use client';
import React from 'react';

interface ItemProcesso {
  id: string;
  numero: string;
  status: 'processando' | 'sucesso' | 'erro';
  mensagem?: string;
}

interface ModalProcessamentoProps {
  aberto: boolean;
  titulo: string;
  itens: ItemProcesso[];
  onFechar: () => void;
}

export default function ModalProcessamento({ aberto, titulo, itens, onFechar }: ModalProcessamentoProps) {
  if (!aberto) return null;

  // Detecta se existe algum erro de saldo insuficiente
  const temErroSaldo = itens.some(item => 
    item.status === 'erro' && item.mensagem?.toLowerCase().includes('saldo')
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.modalContent}>
        <h3 style={styles.titulo}>{titulo}</h3>
        
        <div style={styles.listaContainer}>
          {itens.map((item) => (
            <div key={item.id} style={styles.itemLinha}>
              <div style={styles.infoPedido}>
                <span style={styles.numeroPedido}>Pedido #{item.numero}</span>
                
                {/* Exibição do status com ícone de erro caso não seja saldo */}
                {item.status === 'erro' && !item.mensagem?.toLowerCase().includes('saldo') && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', fontWeight: 'bold' }}>
                    ⚠️ {item.mensagem}
                  </div>
                )}
                
                {/* Exibição específica para Saldo Insuficiente conforme imagem */}
                {item.status === 'erro' && item.mensagem?.toLowerCase().includes('saldo') && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>
                    🔴 Saldo Insuficiente
                  </div>
                )}
              </div>
              
              <div style={styles.statusBadge(item.status)}>
                {item.status === 'processando' ? '⏳ Processando...' : 
                 item.status === 'sucesso' ? '✅ Concluído' : '❌ Falha'}
              </div>
            </div>
          ))}
        </div>

        {/* Botão de recarga - Aparece apenas se houver erro de saldo */}
        {temErroSaldo && (
          <a 
            href="https://www.melhorenvio.com.br/painel/financeiro/adicionar-saldo" 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.btnMelhorEnvio}
          >
            Ir para Melhor Envio e Recarregar
          </a>
        )}

        {/* Botão de fechar */}
        <button onClick={onFechar} style={styles.btnFechar}>
          Fechar e Atualizar Página
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: any } = {
  overlay: { 
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', 
    justifyContent: 'center', zIndex: 9999 
  },
  modalContent: { 
    backgroundColor: '#fff', padding: '24px', borderRadius: '12px', 
    width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    display: 'flex', flexDirection: 'column' 
  },
  titulo: { margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' },
  listaContainer: { 
    maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', 
    borderRadius: '6px', padding: '8px', marginBottom: '16px' 
  },
  itemLinha: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    padding: '10px', borderBottom: '1px solid #f1f5f9' 
  },
  numeroPedido: { fontWeight: 'bold', fontSize: '14px', color: '#334155' },
  statusBadge: (status: string) => ({
    fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px',
    backgroundColor: status === 'processando' ? '#fef3c7' : status === 'sucesso' ? '#dcfce7' : '#fee2e2',
    color: status === 'processando' ? '#92400e' : status === 'sucesso' ? '#166534' : '#991b1b'
  }),
  btnMelhorEnvio: { 
    display: 'block', width: '100%', padding: '14px', marginTop: '4px', 
    backgroundColor: '#334155', color: '#fff', textAlign: 'center', 
    borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px',
    cursor: 'pointer'
  },
  btnFechar: { 
    width: '100%', padding: '14px', marginTop: '12px', backgroundColor: '#3b82f6', 
    color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' 
  }
};