"use client";

interface ModalFreteMobileProps {
  aberto: boolean;
  fechar: () => void;
  opcoesFrete: any[];
  freteSel: any;
  setFreteSel: (f: any) => void;
  setFreteBackup: (f: any) => void;
  config: { corPrimaria: string; corSecundaria: string; corTexto: string; corTextoCard?: string };
  clienteCep?: string;
  isMesmaCidade?: boolean;
  temFreteGratisCampanha?: boolean;
}

export default function ModalFreteMobile({
  aberto,
  fechar,
  opcoesFrete,
  freteSel,
  setFreteSel,
  setFreteBackup,
  config,
  clienteCep = "",
  isMesmaCidade = false,
  temFreteGratisCampanha = false
}: ModalFreteMobileProps) {
  if (!aberto) return null;

  let listaParaExibir: any[] = [];

  if (temFreteGratisCampanha) {
    listaParaExibir = [
      {
        id: "frete_gratis_ativado",
        name: "Frete Grátis Promocional",
        price: 0,
        delivery_time: 5
      }
    ];
    
    // Se for da mesma cidade, adicionamos também as opções locais com preço zero
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
          price: 0,
          delivery_time: 1
        }
      );
    }
  } else {
    listaParaExibir = opcoesFrete ? [...opcoesFrete] : [];

    const temRetiradaOuLocal = listaParaExibir.some(f => {
      const id = String(f.id || "").toLowerCase();
      const name = String(f.name || "").toLowerCase();
      return id.includes("retirada") || id.includes("entrega_local") || name.includes("retirada") || name.includes("entrega local");
    });

    // Se for da mesma cidade e a API não retornou, injetamos as opções locais padrão
    if (!temRetiradaOuLocal && clienteCep?.replace(/\D/g, "").length === 8) {
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
  }

  // 🛑 REGRA DE FILTRAGEM RIGOROSA: Se NÃO for da mesma cidade, remove totalmente a Retirada
  listaParaExibir = listaParaExibir.filter(f => {
    const id = String(f.id || "").toLowerCase();
    const name = String(f.name || "").toLowerCase();
    const ehRetirada = id.includes("retirada") || name.includes("retirada");

    if (!isMesmaCidade && ehRetirada) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: config.corTextoCard || config.corTexto || '#1e293b' }}>Escolha a Opção de Frete</h3>
          <button onClick={fechar} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {listaParaExibir.length > 0 ? (
            listaParaExibir.map((opcao: any, index: number) => {
              const selecionado = freteSel?.id === opcao.id;
              
              const idStr = String(opcao.id || "").toLowerCase();
              const isEntregaOuLocal = idStr.includes("entrega_local") || String(opcao.name || "").toLowerCase().includes("entrega local");
              const precoFinal = (temFreteGratisCampanha && (idStr === "frete_gratis_ativado" || isEntregaOuLocal)) ? 0 : opcao.price;

              return (
                <div 
                  key={`${opcao.id}-${index}`} 
                  onClick={() => { 
                    const opcaoModificada = { ...opcao, price: precoFinal };
                    setFreteSel(opcaoModificada); 
                    if (opcao.id !== "frete_gratis_ativado") setFreteBackup(opcaoModificada); 
                    fechar(); 
                  }} 
                  style={{ 
                    padding: '12px', 
                    borderRadius: '10px', 
                    border: `2px solid ${selecionado ? config.corPrimaria : '#e2e8f0'}`, 
                    backgroundColor: selecionado ? config.corPrimaria : '#f8fafc', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: selecionado ? '#ffffff' : (config.corTextoCard || config.corTexto || '#1e293b') }}>
                    {opcao.name}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: selecionado ? '#ffffff' : config.corPrimaria }}>
                    {Number(precoFinal) === 0 ? "Grátis" : `R$ ${Number(precoFinal).toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
              );
            })
          ) : (
            <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Preencha o CEP nos dados do cliente para carregar as opções.</p>
          )}
        </div>
      </div>
    </div>
  );
}
// Modal Mobile de Frete = janela de cards dos fretes, apenas na versao mobile.