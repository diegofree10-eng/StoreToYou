"use client";

import { useState } from "react";
import { Check, Copy, Truck, CreditCard } from "lucide-react";

interface BlocoPagamentoPixProps {
  temCheckoutOnlineAtivo: () => boolean;
  qrCodeUrl: string;
  payloadPixBruto: string;
  copiadoPix: boolean;
  setCopiadoPix: (val: boolean) => void;
  podeFinalizar: boolean;
  isLojaAberta: boolean;
  finalizarNoWhatsApp: () => Promise<void> | void;
  limparTudo: () => void;
  config: { corPrimaria: string; corTexto: string };
  temFrete: boolean;
  freteSel: any;
  // 🌟 Novas propriedades para suportar a Stripe
  isStripeAtivo?: boolean;
  onPagarComStripe?: () => Promise<void> | void;
  metodoPagamentoSelecionado?: 'pix' | 'stripe';
  setMetodoPagamentoSelecionado?: (metodo: 'pix' | 'stripe') => void;
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
  config,
  temFrete,
  freteSel,
  isStripeAtivo = false,
  onPagarComStripe,
  metodoPagamentoSelecionado = 'pix',
  setMetodoPagamentoSelecionado
}: BlocoPagamentoPixProps) {
  
  // 🔒 Estado local para evitar cliques duplos no botão de finalização
  const [enviando, setEnviando] = useState(false);

  const freteEscolhidoOuInexistente = !temFrete || (temFrete && freteSel !== null);

  const handleFinalizarClick = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      if (metodoPagamentoSelecionado === 'stripe' && onPagarComStripe) {
        await onPagarComStripe();
      } else {
        await finalizarNoWhatsApp();
      }
    } finally {
      // Garante que o botão destrava caso ocorra algum erro ou cancelamento
      setEnviando(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .bloco-pix-container {
            height: auto !important;
            max-height: none !important;
          }
        }
      `}} />

      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', height: '100%', boxSizing: 'border-box', maxHeight: '440px', overflowY: 'auto' }} className="bloco-pix-container">
        <h4 style={{ color: config.corTexto, margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>FORMA DE PAGAMENTO</h4>

        {/* 🌟 Se a Stripe estiver ativa, exibe abas/botões para o cliente escolher entre PIX ou Cartão */}
        {isStripeAtivo && setMetodoPagamentoSelecionado && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={() => setMetodoPagamentoSelecionado('pix')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: metodoPagamentoSelecionado === 'pix' ? `2px solid ${config.corPrimaria}` : '1px solid #e2e8f0',
                background: metodoPagamentoSelecionado === 'pix' ? '#f8fafc' : '#fff',
                color: config.corTexto,
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              PIX (WhatsApp)
            </button>
            <button
              type="button"
              onClick={() => setMetodoPagamentoSelecionado('stripe')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: metodoPagamentoSelecionado === 'stripe' ? `2px solid ${config.corPrimaria}` : '1px solid #e2e8f0',
                background: metodoPagamentoSelecionado === 'stripe' ? '#f8fafc' : '#fff',
                color: config.corTexto,
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <CreditCard size={13} /> Cartão (Stripe)
            </button>
          </div>
        )}

        {!freteEscolhidoOuInexistente ? (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', padding: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Truck size={22} color="#d97706" />
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309', margin: 0, lineHeight: '1.4' }}>
              Por favor, escolha uma opção de frete / retirada primeiro para liberar o pagamento com o valor correto.
            </p>
          </div>
        ) : metodoPagamentoSelecionado === 'stripe' ? (
          <div style={{ textAlign: 'center', padding: '15px 0', color: '#475569', fontSize: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '12px' }}>
            <CreditCard size={28} color={config.corPrimaria} style={{ marginBottom: '6px' }} />
            <p style={{ margin: 0, fontWeight: '500' }}>Pagamento seguro via Cartão de Crédito processado pela Stripe.</p>
          </div>
        ) : temCheckoutOnlineAtivo() ? (
          <div style={{ textAlign: 'center', padding: '10px 0', color: '#64748b', fontSize: '12px' }}>Checkout Online ativado.</div>
        ) : qrCodeUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
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
          <div style={{ textAlign: 'center', padding: '10px 0', color: '#64748b', fontSize: '11px', marginBottom: '12px' }}>Preencha os dados e o endereço para gerar o QR Code.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
          <button
            disabled={!podeFinalizar || !isLojaAberta || enviando}
            onClick={handleFinalizarClick}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: podeFinalizar && isLojaAberta && !enviando ? '#22c55e' : '#cbd5e1',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: podeFinalizar && isLojaAberta && !enviando ? 'pointer' : 'not-allowed'
            }}
          >
            {enviando ? "PROCESSANDO..." : (metodoPagamentoSelecionado === 'stripe' ? "PAGAR COM CARTÃO (STRIPE)" : "FINALIZAR PEDIDO NO WHATSAPP")}
          </button>
          <button
            onClick={limparTudo}
            disabled={enviando}
            style={{ width: '100%', padding: '6px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', fontWeight: 'bold', fontSize: '11px', cursor: enviando ? 'not-allowed' : 'pointer' }}
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