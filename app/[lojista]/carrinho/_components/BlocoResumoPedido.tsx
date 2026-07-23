"use client";

interface BlocoResumoPedidoProps {
  valorSubtotalProdutos: number;
  temFrete: boolean;
  freteSel: any;
  descontoAtivo: { valor: number; tipo: string };
  valorDesconto: number;
  totalGeral: number;
  cupomDigitado: string;
  setCupomDigitado: (val: string) => void;
  aplicarCupom: () => void;
  limparCupom: () => void;
  config: { corPrimaria: string; corTexto: string };
  stylesInput: any;
}

export default function BlocoResumoPedido({
  valorSubtotalProdutos,
  temFrete,
  freteSel,
  descontoAtivo,
  valorDesconto,
  totalGeral,
  cupomDigitado,
  setCupomDigitado,
  aplicarCupom,
  limparCupom,
  config,
  stylesInput
}: BlocoResumoPedidoProps) {
  return (
    <>
      {/* Estilo responsivo exclusivo para telas mobile (abaixo de 768px) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .bloco-resumo-container {
            height: auto !important;
            max-height: none !important;
          }
        }
      `}} />

      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', height: '100%', boxSizing: 'border-box', maxHeight: '235px' }} className="bloco-resumo-container">
        <h4 style={{ color: config.corTexto, margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>RESUMO DO PEDIDO</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: config.corTexto }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <b>R$ {Number(valorSubtotalProdutos || 0).toFixed(2).replace('.', ',')}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Frete:</span>
            <b>{temFrete ? (freteSel ? (freteSel.price === 0 ? "Grátis" : `R$ ${Number(freteSel.price).toFixed(2).replace('.', ',')}`) : "0,00") : "Grátis"}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: descontoAtivo.valor > 0 ? '#16a34a' : config.corTexto }}>
            <span>Cupom:</span>
            <b>{descontoAtivo.valor > 0 ? `- R$ ${Number(valorDesconto || 0).toFixed(2).replace('.', ',')}` : "0,00"}</b>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
            <b>Total:</b>
            <b style={{ color: config.corPrimaria }}>R$ {Number(totalGeral || 0).toFixed(2).replace('.', ',')}</b>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
          <input
            placeholder="Cupom de desconto"
            style={{ ...stylesInput.inputStyle, flex: 1, marginBottom: 0, padding: '8px 10px' }}
            value={cupomDigitado}
            onChange={e => setCupomDigitado(e.target.value)}
          />
          {descontoAtivo.valor > 0 ? (
            <button onClick={limparCupom} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remover</button>
          ) : (
            <button onClick={aplicarCupom} style={{ background: config.corPrimaria, color: '#fff', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Aplicar</button>
          )}
        </div>
      </div>
    </>
  );
}
//Um painel financeiro compacto que detalha subtotal, valor do frete, descontos de cupons aplicados,
// o valor total geral e um input integrado para ativação de vales-desconto.