// CardLogistica.tsx
import React from 'react';

export const CardLogistica = ({ pedido, onTentarPagamento, onResetar, onCotar, ehFinalizado, isDigital, isRetirada, ehFretePagoNoCarrinho, erroFrete }: any) => {
  if (isDigital) return <div style={{ padding: '8px', color: '#3b82f6', fontWeight: 'bold', fontSize: '12px' }}>Envio Digital</div>;
  if (isRetirada) return <div style={{ padding: '8px', color: '#f59e0b', fontWeight: 'bold', fontSize: '12px' }}>🏪 Retirada na Loja</div>;
  if (ehFinalizado) return <div style={{ padding: '8px', color: '#2ecc71', fontWeight: 'bold', fontSize: '12px' }}>FINALIZADO</div>;

  const temEtiqueta = pedido.etiquetaGerada || pedido.statusEtiqueta === 'pendente' || pedido.statusEtiqueta === 'erro';

  if (temEtiqueta) {
    const isPaga = pedido.statusEtiqueta === 'paga';
    const isErro = pedido.statusEtiqueta === 'erro';
    return (
      <div style={{ padding: '10px', backgroundColor: isPaga ? '#ecfdf5' : (isErro ? '#fee2e2' : '#fef3c7'), border: `1px solid ${isPaga ? '#a7f3d0' : (isErro ? '#fecaca' : '#fbbf24')}`, borderRadius: '6px', textAlign: 'center', fontSize: '12px' }}>
        <div style={{ fontWeight: 'bold', color: isPaga ? '#065f46' : (isErro ? '#991b1b' : '#92400e') }}>
          {isPaga ? '✅ Etiqueta Paga' : (isErro ? '❌ Erro Pagamento' : '⏳ Pendente')}
        </div>
        {(pedido.statusEtiqueta === 'pendente' || isErro) && (
          <button onClick={() => onTentarPagamento(pedido)} style={{ color: isErro ? '#991b1b' : '#92400e', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer', marginTop: '8px' }}>
            🔄 Tentar Novamente
          </button>
        )}
        <button onClick={() => onResetar(pedido)} style={{ display: 'block', width: '100%', border: 'none', background: 'none', color: '#64748b', fontSize: '10px', marginTop: '8px' }}>Resetar</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <button onClick={() => onCotar(pedido)} style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
        🚚 Cotar Frete
      </button>
      {erroFrete && <div style={{ color: '#ef4444', fontSize: '10px' }}>{erroFrete}</div>}
    </div>
  );
}; 