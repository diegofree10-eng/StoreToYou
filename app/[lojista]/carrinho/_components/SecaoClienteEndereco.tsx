"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

interface SecaoClienteEnderecoProps {
  cliente: { nome: string; cpf: string; cep: string; dsTelefone: string };
  endereco: { rua: string; numero: string; bairro: string; cidade: string; uf: string; complemento: string };
  setCliente: (cliente: any) => void;
  setEndereco: (endereco: any) => void;
  aplicarMascaraCPF: (val: string) => string;
  aplicarMascaraCEP: (val: string) => string;
  cpfValido: boolean;
  temFrete: boolean;
  safeCartLength: number;
  loadingFrete: boolean;
  opcoesFrete: any[];
  freteSel: any;
  setFreteSel: (frete: any) => void;
  setFreteBackup: (frete: any) => void;
  corPrimaria: string;
  corSecundaria: string;
  corTexto: string;
  lojistaSlug: string;
}

export default function SecaoClienteEndereco({
  cliente,
  endereco,
  setCliente,
  setEndereco,
  aplicarMascaraCPF,
  aplicarMascaraCEP,
  cpfValido,
  temFrete,
  safeCartLength,
  loadingFrete,
  opcoesFrete,
  freteSel,
  setFreteSel,
  setFreteBackup,
  corPrimaria,
  corSecundaria,
  corTexto,
  lojistaSlug
}: SecaoClienteEnderecoProps) {

  const [buscandoCep, setBuscandoCep] = useState(false);

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorComMascara = aplicarMascaraCEP(e.target.value);
    const novoCliente = { ...cliente, cep: valorComMascara };
    setCliente(novoCliente);
    
    if (typeof window !== "undefined") {
      localStorage.setItem(`cliente_${lojistaSlug}`, JSON.stringify(novoCliente));
    }

    const cepLimpo = valorComMascara.replace(/\D/g, "");
    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();

        if (!data.erro) {
          const novoEndereco = {
            ...endereco,
            rua: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            uf: data.uf || ""
          };
          setEndereco(novoEndereco);
          
          if (typeof window !== "undefined") {
            localStorage.setItem(`end_${lojistaSlug}`, JSON.stringify(novoEndereco));
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  return (
    <div style={styles.card}>
      <h4 style={{ color: corTexto, margin: '0 0 15px 0', fontSize: '15px', fontWeight: 'bold' }}>DADOS DO CLIENTE</h4>
      
      <input 
        placeholder="Nome Completo *" 
        style={styles.input} 
        value={cliente.nome || ""} 
        onChange={e => {
          const c = { ...cliente, nome: e.target.value };
          setCliente(c);
          if (typeof window !== "undefined") localStorage.setItem(`cliente_${lojistaSlug}`, JSON.stringify(c));
        }} 
      />

      <input 
        placeholder="WhatsApp (com DDD) *" 
        style={styles.input} 
        value={cliente.dsTelefone || ""} 
        onChange={e => {
          const valor = e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
          const novoCliente = { ...cliente, dsTelefone: valor };
          setCliente(novoCliente);
          if (typeof window !== "undefined") localStorage.setItem(`cliente_${lojistaSlug}`, JSON.stringify(novoCliente));
        }} 
      />

      <input 
        placeholder="CPF *" 
        style={styles.input} 
        value={cliente.cpf || ""} 
        onChange={e => {
          const c = { ...cliente, cpf: aplicarMascaraCPF(e.target.value) };
          setCliente(c);
          if (typeof window !== "undefined") localStorage.setItem(`cliente_${lojistaSlug}`, JSON.stringify(c));
        }} 
      />
      {!cpfValido && <p style={{ color: '#ff4d4d', fontSize: '12px', marginTop: '-5px', marginBottom: '10px', fontWeight: 'bold' }}>⚠️ Número de CPF inválido</p>}
      
      {temFrete ? (
        <>
          <h4 style={{ color: corTexto, margin: '20px 0 12px 0', fontSize: '15px', fontWeight: 'bold' }}>ENDEREÇO DE ENTREGA</h4>
          
          <div style={{ display: 'flex', gap: 10 }}>
            <input 
              placeholder="CEP *" 
              style={{ ...styles.input, flex: 1 }} 
              value={cliente.cep} 
              onChange={handleCepChange} 
            />
            <input 
              placeholder="Nº *" 
              style={{ ...styles.input, width: '90px' }} 
              value={endereco.numero} 
              onChange={e => {
                const num = e.target.value.replace(/\D/g, "");
                const end = { ...endereco, numero: num };
                setEndereco(end);
                if (typeof window !== "undefined") localStorage.setItem(`end_${lojistaSlug}`, JSON.stringify(end));
              }} 
            />
          </div>

          <input 
            placeholder="Complemento / Ponto de referência" 
            style={styles.input} 
            value={endereco.complemento || ""} 
            onChange={e => {
              const comp = { ...endereco, complemento: e.target.value };
              setEndereco(comp);
              if (typeof window !== "undefined") localStorage.setItem(`end_${lojistaSlug}`, JSON.stringify(comp));
            }} 
          />

          <input placeholder="Rua / Avenida" value={endereco.rua} style={{ ...styles.input, backgroundColor: '#f1f5f9' }} readOnly />
          <input placeholder="Bairro" value={endereco.bairro} style={{ ...styles.input, backgroundColor: '#f1f5f9' }} readOnly />
          
          <div style={{ display: 'flex', gap: 10 }}>
            <input placeholder="Cidade" value={endereco.cidade} style={{ ...styles.input, flex: 2, backgroundColor: '#f1f5f9' }} readOnly />
            <input placeholder="UF" value={endereco.uf} style={{ ...styles.input, flex: 1, backgroundColor: '#f1f5f9' }} readOnly />
          </div>

          {(buscandoCep || loadingFrete) && <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', margin: '10px 0' }}>Buscando endereço e calculando frete...</p>}

          <div style={styles.freteGrid}>
            {opcoesFrete && opcoesFrete.length > 0 ? (
              opcoesFrete.map(f => (
                <button 
                  key={f.id} 
                  type="button" 
                  onClick={() => { 
                    setFreteSel(f); 
                    // Salva no backup apenas se não for a opção promocional de frete grátis
                    if (f.id !== "frete_gratis_ativado") {
                      setFreteBackup(f); 
                    }
                  }} 
                  style={{ ...styles.freteCard, borderColor: freteSel?.id === f.id ? corPrimaria : '#e2e8f0', background: freteSel?.id === f.id ? corSecundaria : '#fff', color: corTexto }}
                >
                  <small style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>{f.name}</small>
                  <b style={{ display: 'block', fontSize: '13px' }}>{f.price === 0 ? "Grátis" : "R$ " + Number(f.price).toFixed(2).replace('.', ',')}</b>
                </button>
              ))
            ) : (
              !buscandoCep && !loadingFrete && cliente.cep?.replace(/\D/g, "").length === 8 && (
                <p style={{ fontSize: '13px', color: '#ef4444', textAlign: 'center', gridColumn: '1 / -1' }}>
                  Nenhuma transportadora disponível para este CEP.
                </p>
              )
            )}
          </div>
        </>
      ) : safeCartLength > 0 && (
        <div style={{ padding: '15px', marginTop: '10px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', color: '#166534', textAlign: 'center' }}>
          <Mail size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Este é um pedido 100% digital!</p>
          <p style={{ margin: '5px 0 0', fontSize: '12px' }}>O envio será feito via e-mail após a confirmação do pagamento.</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', boxSizing: 'border-box', width: '100%', border: '1px solid #f1f5f9' },
  input: { width: '100%', padding: '14px 16px', marginBottom: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', transition: 'all 0.2s' },
  freteGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '12px', width: '100%' },
  freteCard: { padding: '12px', border: '2px solid', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box', transition: 'all 0.2s', backgroundColor: '#fff' }
};