"use client";

import { useTheme } from "@/context/ThemeContext";

export default function PagamentosTab({
  config,
  setConfig,
  masterLiberouMeioPagamento,
  uid // 🚀 Adicionado para capturar o ID real do lojista vindo do componente pai
}: any) {
  const { theme, isModoNoturno } = useTheme();

  // Função auxiliar para atualizar o tipo de chave ou o valor da chave mantendo a estrutura Pix
  const handleChavePixChange = (campo: "tipo" | "valor", valor: string) => {
    const pagamentosAtual = config.pagamentos || {};
    
    let pixAtual = typeof pagamentosAtual.dsChavePix === 'object' 
      ? { ...pagamentosAtual.dsChavePix } 
      : { tipo: "telefone", valor: typeof pagamentosAtual.dsChavePix === 'string' ? pagamentosAtual.dsChavePix : "" };

    pixAtual[campo] = valor;

    setConfig({
      ...config,
      pagamentos: {
        ...pagamentosAtual,
        dsChavePix: pixAtual
      }
    });
  };

  const pixObj = typeof config.pagamentos?.dsChavePix === 'object' 
    ? config.pagamentos.dsChavePix 
    : { tipo: "telefone", valor: config.pagamentos?.dsChavePix || "" };

  // Função que inicia o fluxo do Stripe Connect usando o uid correto
  const iniciarConexaoStripe = async () => {
    try {
      // Prioriza o uid recebido por props; caso contrário, tenta extrair da URL
      const lojistaId = uid || config?.id || config?.slug || window.location.pathname.split('/')[2]; 

      if (!lojistaId) {
        alert("Erro: ID da loja não encontrado para iniciar a conexão.");
        return;
      }

      const response = await fetch('/api/checkout/stripe', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojistaId })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        alert("Erro no servidor ao gerar link da Stripe.");
        return;
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url; 
      } else {
        alert(data.error || "Erro ao iniciar conexão com a Stripe.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão com o servidor.");
    }
  };

  const desconectarStripe = () => {
    setConfig({
      ...config,
      pagamentos: {
        ...config.pagamentos,
        stripeConnectedAccountId: null,
        dsStripe: { ...config.pagamentos?.dsStripe, ativo: false }
      }
    });
  };

  const isStripeConectado = !!config.pagamentos?.stripeConnectedAccountId;

  return (
    <section>
      <h3 style={{ ...styles.h3, color: theme.textMain }}>Recebimento Manual</h3>
      
      <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ ...styles.label, color: theme.textSec }}>Tipo de Chave PIX</label>
        <select
          style={{ ...styles.select, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
          value={pixObj.tipo || "telefone"}
          onChange={e => handleChavePixChange("tipo", e.target.value)}
        >
          <option value="telefone" style={{ background: theme.bgApp, color: theme.textMain }}>Celular / Telefone</option>
          <option value="cpf" style={{ background: theme.bgApp, color: theme.textMain }}>CPF</option>
          <option value="cnpj" style={{ background: theme.bgApp, color: theme.textMain }}>CNPJ</option>
          <option value="email" style={{ background: theme.bgApp, color: theme.textMain }}>E-mail</option>
          <option value="aleatoria" style={{ background: theme.bgApp, color: theme.textMain }}>Chave Aleatória (EVP)</option>
        </select>

        <label style={{ ...styles.label, color: theme.textSec }}>Chave PIX ({pixObj.tipo?.toUpperCase() || "TELEFONE"})</label>
        <input
          style={{ ...styles.input, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
          value={pixObj.valor || ""}
          onChange={e => handleChavePixChange("valor", e.target.value)}
          placeholder={
            pixObj.tipo === 'telefone' ? 'Ex: 11999999999 (Apenas DDD + Número)' :
            pixObj.tipo === 'cpf' ? 'Ex: 000.000.000-00' :
            pixObj.tipo === 'email' ? 'Ex: seuemail@loja.com' :
            'Digite sua chave Pix'
          }
        />
        <span style={{ fontSize: '11px', color: theme.textSec }}>
          {pixObj.tipo === 'telefone' && '💡 Digite apenas o DDD e o número. O sistema ajustará o formato automaticamente para o padrão do Banco Central.'}
        </span>
      </div>

      <h3 style={{ ...styles.h3, color: theme.textMain }}>Gateway de Checkout Online</h3>
      <p style={{ ...styles.helpText, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec, borderLeft: `4px solid ${theme.primary}` }}>
        Conecte sua conta Stripe em poucos cliques para aceitar Cartão de Crédito e Google Pay de forma segura e automatizada.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {masterLiberouMeioPagamento("stripe") && (
          <div style={{
            background: isStripeConectado ? (isModoNoturno ? '#31103f' : '#f5f3ff') : (isModoNoturno ? theme.bgApp : '#f8fafc'),
            padding: '24px',
            borderRadius: '15px',
            border: isStripeConectado ? '1px solid #635bff' : `1px solid ${theme.border}`,
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px' }}>
              <b style={{ color: '#635bff', fontSize: '15px' }}>STRIPE CONNECT</b>
            </div>

            {isStripeConectado ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <div style={{ background: '#ecfdf5', color: '#065f46', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                  ✅ Conta Conectada com Sucesso!
                </div>
                <span style={{ fontSize: '12px', color: theme.textSec }}>
                  ID da Conta: <b>{config.pagamentos?.stripeConnectedAccountId}</b>
                </span>
                <button
                  onClick={desconectarStripe}
                  style={{
                    background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2',
                    padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer'
                  }}
                >
                  Desconectar Conta
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <p style={{ fontSize: '13px', color: theme.textSec, margin: 0 }}>
                  Nenhuma conta vinculada no momento. Clique no botão abaixo para autorizar de forma segura.
                </p>
                <button
                  onClick={iniciarConexaoStripe}
                  style={{
                    background: '#635bff', color: '#fff', border: 'none',
                    padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(99, 91, 255, 0.3)'
                  }}
                >
                  Conectar com a Stripe 🚀
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", marginBottom: "4px", display: 'block' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: 'none', boxSizing: 'border-box', transition: 'background 0.3s' },
  select: { width: "100%", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: 'none', cursor: 'pointer', transition: 'background 0.3s' },
  helpText: { fontSize: '12px', marginBottom: '20px', padding: '10px', borderRadius: '8px' }
};