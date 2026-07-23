"use client";

import { Check, Copy } from "lucide-react";

interface BlocoPagamentoPixProps {
  temCheckoutOnlineAtivo: () => boolean;
  qrCodeUrl: string;
  payloadPixBruto: string;
  copiadoPix: boolean;
  setCopiadoPix: (val: boolean) => void;
  podeFinalizar: boolean;
  isLojaAberta: boolean;
  finalizarNoWhatsApp: () => void;
  limparTudo: () => void;
  config: { corPrimaria: string; corTexto: string };
}

export default function BlocoPagamentoPix({
  temCheckoutOnlineAtivo,
  qrCodeUrl,
  payloadPixBruto,
  copiadoPix,
  setCopiadoPix,
  podeFinalizar,
  isLojaAberta,
  finalizarNoWhatsApp,
  limparTudo,
  config
}: BlocoPagamentoPixProps) {
  return (
    <>
      {/* Estilo responsivo exclusivo para telas mobile (abaixo de 768px) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .bloco-pix-container {
            height: auto !important;
            max-height: none !important;
          }
        }
      `}} />

      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', height: '100%', boxSizing: 'border-box', maxHeight: '325px', overflowY: 'auto' }} className="bloco-pix-container">
        <h4 style={{ color: config.corTexto, margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>PAGAMENTO VIA PIX</h4>

        {temCheckoutOnlineAtivo() ? (
          <div style={{ textAlign: 'center', padding: '10px 0', color: '#64748b', fontSize: '12px' }}>Checkout Online ativado.</div>
        ) : qrCodeUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ padding: '4px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <img src={qrCodeUrl} alt="QR Code Pix" style={{ width: '110px', height: '110px', display: 'block' }} />
            </div>
            <button
              onClick={() => {
                if (payloadPixBruto) {
                  navigator.clipboard.writeText(payloadPixBruto);
                  setCopiadoPix(true);
                  setTimeout(() => setCopiadoPix(false), 3000);
                }
              }}
              style={{ background: config.corPrimaria, color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {copiadoPix ? <Check size={12} /> : <Copy size={12} />}
              {copiadoPix ? "Copiado!" : "Copiar Código PIX"}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0', color: '#64748b', fontSize: '11px' }}>Preencha os dados e o endereço para gerar o QR Code.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
          <button
            disabled={!podeFinalizar || !isLojaAberta}
            onClick={finalizarNoWhatsApp}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: podeFinalizar && isLojaAberta ? '#22c55e' : '#cbd5e1',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: podeFinalizar && isLojaAberta ? 'pointer' : 'not-allowed'
            }}
          >
            FINALIZAR PEDIDO NO WHATSAPP
          </button>
          <button
            onClick={limparTudo}
            style={{ width: '100%', padding: '6px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
          >
            Limpar Carrinho e Dados
          </button>
        </div>
      </div>
    </>
  );
}
//O bloco de conversão final. Ele exibe de forma centralizada o QR Code estático do Pix
// (com botão de cópia rápida "Copiar Código PIX") e abriga os botões de ação principal:
// o botão verde de "Finalizar Pedido no WhatsApp"(condicionado à validação de todos os campos)
// e o botão de limpar carrinho.