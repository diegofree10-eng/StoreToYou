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

  // ✨ Agora exibe estritamente o que a API calculou, sem injeções duplicadas ou valores fixos locais
  let listaParaExibir = opcoesFrete ? [...opcoesFrete] : [];

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