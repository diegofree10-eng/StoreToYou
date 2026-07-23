"use client";

interface BlocoOpcoesFreteProps {
  opcoesFrete: any[];
  freteSel: any;
  setFreteSel: (f: any) => void;
  setFreteBackup: (f: any) => void;
  loadingFrete: boolean;
  clienteCep: string;
  config: { corPrimaria: string; corSecundaria: string; corTexto: string };
}

export default function BlocoOpcoesFrete({
  opcoesFrete,
  freteSel,
  setFreteSel,
  setFreteBackup,
  loadingFrete,
  clienteCep,
  config
}: BlocoOpcoesFreteProps) {
  return (
    <>
      {/* Estilo responsivo exclusivo para telas mobile (abaixo de 768px) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .bloco-frete-grid {
            grid-template-columns: 1fr !important;
          }
          .btn-opcao-frete {
            height: 48px !important;
          }
        }
      `}} />

      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', width: '100%', boxSizing: 'border-box' }}>
        <h4 style={{ color: config.corTexto, margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>OPÇÕES DE FRETE</h4>
        {loadingFrete && <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>Calculando frete...</p>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px' }} className="bloco-frete-grid">
          {opcoesFrete && opcoesFrete.length > 0 ? (
            opcoesFrete.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFreteSel(f);
                  if (f.id !== "frete_gratis_ativado") setFreteBackup(f);
                }}
                className="btn-opcao-frete"
                style={{
                  padding: '8px 12px',
                  height: '40px',
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '2px solid',
                  borderColor: freteSel?.id === f.id ? '#f0e2e3' : '#e2e8f0',
                  borderRadius: '10px',
                  background: freteSel?.id === f.id ? config.corPrimaria : '#fff',
                  color: config.corTexto,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  width: '100%'
                }}
              >
                <small style={{ display: 'block', fontSize: '12px', fontWeight: '600', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</small>
                <b style={{ display: 'block', fontSize: '12px', flexShrink: 0 }}>{f.price === 0 ? "Grátis" : "R$ " + Number(f.price).toFixed(2).replace('.', ',')}</b>
              </button>
            ))
          ) : (
            !loadingFrete && clienteCep?.replace(/\D/g, "").length === 8 ? (
              <p style={{ fontSize: '13px', color: '#ef4444', gridColumn: '1 / -1', textAlign: 'center' }}>Nenhuma transportadora disponível para este CEP.</p>
            ) : (
              <p style={{ fontSize: '13px', color: '#64748b', gridColumn: '1 / -1', textAlign: 'center' }}>Digite o CEP acima para carregar as opções de frete.</p>
            )
          )}
        </div>
      </div>
    </>
  );
}
//Uma seção horizontal em grid (configurada para exibir até 8 colunas de opções)
// onde os cards de frete ou de retirada na loja são renderizados de forma dinâmica
// conforme o CEP informado.