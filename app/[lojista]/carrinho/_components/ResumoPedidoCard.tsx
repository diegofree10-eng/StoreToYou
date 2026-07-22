"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check } from "lucide-react";

interface ResumoPedidoCardProps {
  valorSubtotalProdutos: number;
  valorDesconto: number;
  valorSubTotalComDesconto: number;
  temFrete: boolean;
  freteGratisConfig: { ativo: boolean; atingido: boolean; minimo: number; falta: number };
  freteSel: any;
  totalGeral: number;
  cupomDigitado: string;
  setCupomDigitado: (cupom: string) => void;
  descontoAtivo: { valor: number; tipo: string };
  aplicarCupom: () => void;
  limparCupom: () => void;
  temCheckoutOnlineAtivo: () => boolean;
  qrCodeUrl?: string; // Mantido para compatibilidade, mas gerado internamente se necessário
  dadosLoja: any;
  dadosLojaContext: any;
  isLojaAberta: boolean;
  podeFinalizar: boolean;
  finalizarNoWhatsApp: () => void;
  limparTudo: () => void;
  corPrimaria: string;
  corTexto: string;
}

export default function ResumoPedidoCard({
  valorSubtotalProdutos,
  valorDesconto,
  valorSubTotalComDesconto,
  temFrete,
  freteGratisConfig,
  freteSel,
  totalGeral,
  cupomDigitado,
  setCupomDigitado,
  descontoAtivo,
  aplicarCupom,
  limparCupom,
  temCheckoutOnlineAtivo,
  dadosLoja,
  dadosLojaContext,
  isLojaAberta,
  podeFinalizar,
  finalizarNoWhatsApp,
  limparTudo,
  corPrimaria,
  corTexto
}: ResumoPedidoCardProps) {
  const [urlQrCodeLocal, setUrlQrCodeLocal] = useState("");
  const [copiado, setCopiado] = useState(false);

  // 🎯 Captura a chave Pix diretamente do objeto da loja (pagamentos.dsChavePix)
  const lojaAtual = dadosLoja || dadosLojaContext;
  const chavePixLoja = 
    lojaAtual?.pagamentos?.dsChavePix || 
    lojaAtual?.dadosLoja?.pagamentos?.dsChavePix || 
    lojaAtual?.chavePix || 
    lojaAtual?.pix || "";

  // 🔄 Gera o QR Code Pix dinamicamente sempre que o total geral ou a chave mudarem
  useEffect(() => {
    if (temCheckoutOnlineAtivo() || !chavePixLoja || totalGeral <= 0) {
      setUrlQrCodeLocal("");
      return;
    }

    const v = totalGeral.toFixed(2);
    const f = (id: string, val: string) => id + String(val.length).padStart(2, "0") + val;
    
    let payload = f("00", "01") + 
                  f("26", f("00", "br.gov.bcb.pix") + f("01", String(chavePixLoja).trim())) + 
                  f("52", "0000") + 
                  f("53", "986") + 
                  f("54", v) + 
                  f("58", "BR") + 
                  f("59", "LOJA") + 
                  f("60", "CIDADE") + 
                  f("62", f("05", "***")) + "6304";

    const crc16 = (s: string) => {
      let c = 0xFFFF;
      for (let i = 0; i < s.length; i++) {
        c ^= s.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) { 
          if ((c & 0x8000) !== 0) c = (c << 1) ^ 0x1021; 
          else c <<= 1; 
        }
      }
      return (c & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
    };

    setUrlQrCodeLocal("https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(payload + crc16(payload)));
  }, [totalGeral, chavePixLoja, temCheckoutOnlineAtivo]);

  const copiarChavePix = () => {
    if (!chavePixLoja) {
      alert("Chave Pix não configurada.");
      return;
    }
    navigator.clipboard.writeText(chavePixLoja);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div style={styles.card}>
      <h3 style={{ color: corTexto, textAlign: 'center', margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold' }}>RESUMO DO PEDIDO</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '15px', fontSize: '14px' }}>
        <div style={styles.rowBetween}>
          <span style={{ color: '#64748b' }}>Total dos Produtos:</span>
          <span style={{ fontWeight: '500', color: '#1e293b' }}>R$ {valorSubtotalProdutos.toFixed(2).replace('.', ',')}</span>
        </div>
        {valorDesconto > 0 && (
          <div style={styles.rowBetween}>
            <span style={{ color: '#2ecc71' }}>Cupom de Desconto:</span>
            <span style={{ color: '#2ecc71', fontWeight: '500' }}>- R$ {valorDesconto.toFixed(2).replace('.', ',')}</span>
          </div>
        )}
        <div style={styles.rowBetween}>
          <span style={{ color: '#64748b' }}>Sub total:</span>
          <span style={{ fontWeight: '500', color: '#1e293b' }}>R$ {valorSubTotalComDesconto.toFixed(2).replace('.', ',')}</span>
        </div>
        {temFrete && (
          <div style={styles.rowBetween}>
            <span style={{ color: '#64748b' }}>Total de Frete:</span>
            <span style={{ fontWeight: '500', color: '#1e293b' }}>
              {freteGratisConfig.ativo && freteGratisConfig.atingido ? "Grátis" : freteSel ? (freteSel.price === 0 ? "Grátis" : "R$ " + Number(freteSel.price).toFixed(2).replace('.', ',')) : "R$ 0,00"}
            </span>
          </div>
        )}
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '5px 0 15px' }} />
      <div style={{ ...styles.rowBetween, marginBottom: '20px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '15px', color: corTexto }}>Pagamento total:</span>
        <span style={{ fontWeight: '900', fontSize: '18px', color: corTexto }}>R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
      </div>
      
      <div style={{ padding: '15px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>Possui cupom?</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input 
            placeholder="Digite aqui" 
            value={cupomDigitado} 
            onChange={e => setCupomDigitado(e.target.value)} 
            style={{ ...styles.input, marginBottom: 0, fontSize: 13, flex: 1 }} 
          />
          {descontoAtivo.valor > 0 && (
            <button onClick={limparCupom} style={{ background: '#ff4d4d', color: '#fff', border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          )}
        </div>
        <button 
          disabled={!isLojaAberta} 
          onClick={aplicarCupom} 
          style={{ width: '100%', background: isLojaAberta ? corTexto : '#94a3b8', color: 'white', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 'bold', cursor: isLojaAberta ? 'pointer' : 'not-allowed', fontSize: 12 }}
        >
          APLICAR CUPOM
        </button>
      </div>

      {/* ÁREA DO QR CODE PIX GERADO AUTOMATICAMENTE */}
      <div style={{ margin: '15px 0' }}>
        {temCheckoutOnlineAtivo() ? (
          <div style={{ ...styles.pixBox, borderColor: '#2ecc71', backgroundColor: '#f4fbf7' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#27ae60', textAlign: 'center' }}>Checkout Online Ativo</p>
          </div>
        ) : (
          urlQrCodeLocal && isLojaAberta ? (
            <div style={styles.pixBox}>
              <p style={{ margin: '0 0 5px 0', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }}>📱 Pague com Pix</p>
              <img src={urlQrCodeLocal} alt="QR Code PIX" style={{ width: 150, height: 150, background: '#fff', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <button 
                onClick={copiarChavePix}
                style={{ ...styles.btnAction, backgroundColor: '#3498db', fontSize: 12, padding: '10px', color: '#fff', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {copiado ? <Check size={16} /> : <Copy size={16} />}
                {copiado ? 'CHAVE COPIADA!' : 'COPIAR CHAVE PIX'}
              </button>
            </div>
          ) : (
            <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
              {isLojaAberta ? (chavePixLoja ? "Preencha o CEP para gerar o QR Code Pix" : "Chave Pix não configurada na loja") : "PIX indisponível em férias"}
            </div>
          )
        )}
      </div>

      <button
        onClick={finalizarNoWhatsApp}
        disabled={!podeFinalizar || !isLojaAberta}
        style={{
          ...styles.btnAction,
          backgroundColor: !isLojaAberta ? '#94a3b8' : (podeFinalizar ? '#25D366' : '#cbd5e1'),
          color: !isLojaAberta ? '#fff' : (podeFinalizar ? '#fff' : '#64748b'),
          cursor: (!isLojaAberta || !podeFinalizar) ? 'not-allowed' : 'pointer',
          boxShadow: podeFinalizar && isLojaAberta ? '0 4px 12px rgba(37, 211, 102, 0.3)' : 'none'
        }}
      >
        {!isLojaAberta ? '🔒 PEDIDOS BLOQUEADOS (FÉRIAS)' : (podeFinalizar ? (temCheckoutOnlineAtivo() ? 'FINALIZAR PAGAMENTO' : 'FINALIZAR NO WHATSAPP') : 'PREENCHA OS DADOS')}
      </button>

      <button
        onClick={limparTudo}
        style={{
          ...styles.btnClean,
          padding: '12px',
          border: '1px solid #fee2e2',
          backgroundColor: '#fff5f5',
          color: '#dc2626',
          borderRadius: '10px',
          marginTop: '15px',
          fontWeight: 'bold',
          fontSize: '12px'
        }}
      >
        &times; LIMPAR CARRINHO E DADOS
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', boxSizing: 'border-box', width: '100%', border: '1px solid #f1f5f9' },
  input: { width: '100%', padding: '14px 16px', marginBottom: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', transition: 'all 0.2s' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  pixBox: { marginTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '14px', width: '100%', boxSizing: 'border-box', backgroundColor: '#f8fafc' },
  btnAction: { width: '100%', padding: '16px', border: 'none', borderRadius: '12px', fontWeight: 'bold', marginTop: '12px', cursor: 'pointer', boxSizing: 'border-box', fontSize: '14px', letterSpacing: '0.5px', transition: 'all 0.2s' },
  btnClean: { background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer', width: '100%', textAlign: 'center', transition: 'background 0.2s' }
};