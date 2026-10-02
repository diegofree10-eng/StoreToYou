"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Carrega sua chave pública da Stripe com tratamento para o TypeScript não retornar undefined
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

interface CheckoutFormProps {
  onSucesso?: () => void;
  onFechar: () => void;
}

function CheckoutForm({ onSucesso, onFechar }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessando(true);
    setMensagemErro(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/sucesso-pagamento`, // Página para onde o usuário vai após pagar
      },
    });

    if (error) {
      setMensagemErro(error.message || "Ocorreu um erro ao processar o pagamento.");
      setProcessando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Forma de pagamento</h3>
      
      {/* Campos de Cartão / Google Pay gerados pelo Stripe */}
      <PaymentElement />

      {mensagemErro && (
        <div style={{ color: '#ef4444', fontSize: '12px', background: '#fef2f2', padding: '8px', borderRadius: '6px' }}>
          {mensagemErro}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <button
          type="button"
          onClick={onFechar}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!stripe || processando}
          style={{ 
            flex: 2, 
            padding: '10px', 
            borderRadius: '8px', 
            background: '#0284c7', 
            color: '#fff', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            opacity: (!stripe || processando) ? 0.7 : 1 
          }}
        >
          {processando ? "Processando..." : "Pagar"}
        </button>
      </div>
    </form>
  );
}

interface ModalStripeProps {
  isOpen: boolean;
  onClose: () => void;
  totalCarrinho: number;
  lojistaId: string; // 🌟 Obrigatório para o backend identificar a conta Stripe Connect do lojista
}

export default function ModalStripe({ isOpen, onClose, totalCarrinho, lojistaId }: ModalStripeProps) {
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    if (isOpen && lojistaId && totalCarrinho > 0) {
      // Pede ao backend o clientSecret enviando o lojistaId para gerar o PaymentIntent na conta conectada correta
      fetch('/api/checkout/stripe/criar-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojistaId, total: totalCarrinho }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            console.error("Erro ao obter clientSecret:", data.error);
          }
        })
        .catch((err) => console.error("Erro na requisição do pagamento:", err));
    }
  }, [isOpen, totalCarrinho, lojistaId]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm onFechar={onClose} />
          </Elements>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Carregando opções de pagamento...</div>
        )}
      </div>
    </div>
  );
}