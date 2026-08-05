"use client";

interface BlocoOpcoesFreteProps {
  opcoesFrete: any[];
  freteSel: any;
  setFreteSel: (f: any) => void;
  setFreteBackup: (f: any) => void;
  loadingFrete: boolean;
  clienteCep: string;
  config: { corPrimaria: string; corSecundaria: string; corTexto: string };
  isMesmaCidade?: boolean;
  temFreteGratisCampanha?: boolean;
}

export default function BlocoOpcoesFrete({
  opcoesFrete,
  freteSel,
  setFreteSel,
  setFreteBackup,
  loadingFrete,
  clienteCep,
  config,
  isMesmaCidade = false,
  temFreteGratisCampanha = false
}: BlocoOpcoesFreteProps) {
  
  let listaParaExibir = opcoesFrete ? [...opcoesFrete] : [];

  // Se atingiu a campanha de Frete Grátis e a lista não tem a opção, adicionamos ela
  const temFreteGratisNaLista = listaParaExibir.some(f => String(f.id || "").toLowerCase() === "frete_gratis_ativado");
  if (temFreteGratisCampanha && !temFreteGratisNaLista) {
    listaParaExibir.unshift({
      id: "frete_gratis_ativado",
      name: "Frete Grátis Promocional",
      price: 0,
      delivery_time: 5
    });
  }

  const temRetiradaOuLocal = listaParaExibir.some(f => {
    const id = String(f.id || "").toLowerCase();
    const name = String(f.name || "").toLowerCase();
    return id.includes("retirada") || id.includes("entrega_local") || name.includes("retirada") || name.includes("entrega local");
  });

  // Se for da mesma cidade e a API não retornou, injetamos as opções locais padrão
  if (!temRetiradaOuLocal && clienteCep?.replace(/\D/g, "").length === 8 && !loadingFrete) {
    if (isMesmaCidade) {
      listaParaExibir.push(
        {
          id: "retirada",
          name: "Retirada na Loja",
          price: 0,
          delivery_time: 0
        },
        {
          id: "entrega_local",
          name: "Entrega Local",
          price: 15.00,
          delivery_time: 1
        }
      );
    }
  }

  // 🛑 REGRA DE FILTRAGEM RIGOROSA DE CIDADE
  listaParaExibir = listaParaExibir.filter(f => {
    const id = String(f.id || "").toLowerCase();
    const name = String(f.name || "").toLowerCase();
    const ehRetirada = id.includes("retirada") || name.includes("retirada");

    // Se NÃO for da mesma cidade, esconde totalmente a Retirada na Loja
    if (!isMesmaCidade && ehRetirada) {
      return false;
    }

    return true;
  });

  return (
    <>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', width: '100%', boxSizing: 'border-box' }}>
        <h4 style={{ color: config.corTexto, margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>OPÇÕES DE FRETE</h4>
        {loadingFrete && <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>Calculando frete...</p>}
        
        <div style={{ 
          display: 'grid', 
          // 📏 Alterado para cards mais compactos (largura mínima menor, permitindo que fiquem lado a lado sem esticar demais)
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '12px' 
        }}>
          {listaParaExibir.length > 0 ? (
            listaParaExibir.map((f, index) => {
              const idStr = String(f.id || "").toLowerCase();
              const prazoDias = f.delivery_time || f.custom_delivery_time;
              const textoPrazo = idStr === "frete_gratis_ativado" 
                ? "Entrega Promocional Grátis" 
                : (prazoDias && Number(prazoDias) > 0 ? `Entre em até ${prazoDias} dia(s) úteis` : (f.id === "retirada" ? "Disponível na loja" : null));
              const estaSelecionado = freteSel?.id === f.id;

              const isEntregaOuLocal = idStr.includes("entrega_local") || String(f.name || "").toLowerCase().includes("entrega local");
              const precoFinal = (temFreteGratisCampanha && (idStr === "frete_gratis_ativado" || isEntregaOuLocal)) ? 0 : f.price;

              return (
                <button
                  key={`${f.id}-${index}`}
                  type="button"
                  onClick={() => {
                    const fModificado = { ...f, price: precoFinal };
                    setFreteSel(fModificado);
                    setFreteBackup(fModificado);
                  }}
                  style={{
                    padding: '12px 14px',
                    height: 'auto',
                    minHeight: '64px',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '2px solid',
                    borderColor: estaSelecionado ? config.corPrimaria : '#e2e8f0',
                    borderRadius: '12px',
                    background: estaSelecionado ? config.corPrimaria : '#fff',
                    color: estaSelecionado ? '#ffffff' : config.corTexto,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    maxWidth: '100%',     // Impede que ultrapasse o bloco
                    textAlign: 'left',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', paddingRight: '8px', flex: 1 }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: estaSelecionado ? '#ffffff' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.name}
                    </span>
                    {textoPrazo && (
                      <span style={{ fontSize: '11px', color: estaSelecionado ? 'rgba(255,255,255,0.85)' : '#64748b', marginTop: '3px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        ⏱️ {textoPrazo}
                      </span>
                    )}
                  </div>
                  <b style={{ fontSize: '13px', fontWeight: '800', color: estaSelecionado ? '#ffffff' : '#0f172a', flexShrink: 0, marginLeft: '8px' }}>
                    {precoFinal === 0 ? "Grátis" : "R$ " + Number(precoFinal).toFixed(2).replace('.', ',')}
                  </b>
                </button>
              );
            })
          ) : (
            !loadingFrete && clienteCep?.replace(/\D/g, "").length === 8 ? (
              <p style={{ fontSize: '13px', color: '#ef4444', gridColumn: '1 / -1', textAlign: 'center' }}>Nenhuma opção disponível para este CEP.</p>
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