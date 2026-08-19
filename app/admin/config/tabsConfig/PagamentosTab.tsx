"use client";

import { useTheme } from "@/context/ThemeContext";

export default function PagamentosTab({
  config,
  setConfig,
  masterLiberouMeioPagamento
}: any) {
  const { theme, isModoNoturno } = useTheme();

  // Função auxiliar para atualizar o tipo de chave ou o valor da chave mantendo a estrutura
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

      <h3 style={{ ...styles.h3, color: theme.textMain }}>Gateways de Checkout Ativos</h3>
      <p style={{ ...styles.helpText, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec, borderLeft: `4px solid ${theme.primary}` }}>
        Habilite as chaves do intermediador que você possui conta ativa. O recebimento online depende do seu plano contratado.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {masterLiberouMeioPagamento("mercado_pago") && (
          <div style={{
            background: config.pagamentos.dsMercadoPago?.ativo ? (isModoNoturno ? '#0c4a6e' : '#f0f9ff') : (isModoNoturno ? theme.bgApp : '#f8fafc'),
            padding: '20px',
            borderRadius: '15px',
            border: config.pagamentos.dsMercadoPago?.ativo ? '1px solid #009ee3' : `1px solid ${theme.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ color: '#009ee3', fontSize: '13px' }}>MERCADO PAGO Checkout</b>
              <input
                type="checkbox"
                checked={!!config.pagamentos.dsMercadoPago?.ativo}
                onChange={e => setConfig({
                  ...config,
                  pagamentos: {
                    ...config.pagamentos,
                    dsMercadoPago: { ...config.pagamentos.dsMercadoPago, ativo: e.target.checked }
                  }
                })}
              />
            </div>

            {config.pagamentos.dsMercadoPago?.ativo && (
              <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ ...styles.label, color: theme.textSec }}>Public Key</label>
                <input
                  style={{ ...styles.input, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                  value={config.pagamentos.dsMercadoPago.publicKey || ""}
                  onChange={e => setConfig({
                    ...config,
                    pagamentos: {
                      ...config.pagamentos,
                      dsMercadoPago: { ...config.pagamentos.dsMercadoPago, publicKey: e.target.value }
                    }
                  })}
                />
                <label style={{ ...styles.label, color: theme.textSec }}>Access Token</label>
                <input
                  style={{ ...styles.input, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                  type="password"
                  value={config.pagamentos.dsMercadoPago.accessToken || ""}
                  onChange={e => setConfig({
                    ...config,
                    pagamentos: {
                      ...config.pagamentos,
                      dsMercadoPago: { ...config.pagamentos.dsMercadoPago, accessToken: e.target.value }
                    }
                  })}
                />
              </div>
            )}
          </div>
        )}

        {masterLiberouMeioPagamento("pagseguro") && (
          <div style={{
            background: config.pagamentos.dsPagSeguro?.ativo ? (isModoNoturno ? '#431407' : '#fdf8f5') : (isModoNoturno ? theme.bgApp : '#f8fafc'),
            padding: '20px',
            borderRadius: '15px',
            border: config.pagamentos.dsPagSeguro?.ativo ? '1px solid #ff6c00' : `1px solid ${theme.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ color: '#ff6c00', fontSize: '13px' }}>PAGSEGURO Checkout Transparente</b>
              <input
                type="checkbox"
                checked={!!config.pagamentos.dsPagSeguro?.ativo}
                onChange={e => setConfig({
                  ...config,
                  pagamentos: {
                    ...config.pagamentos,
                    dsPagSeguro: { ...config.pagamentos.dsPagSeguro, ativo: e.target.checked }
                  }
                })}
              />
            </div>

            {config.pagamentos.dsPagSeguro?.ativo && (
              <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ ...styles.label, color: theme.textSec }}>E-mail da Conta PagSeguro</label>
                <input
                  style={{ ...styles.input, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                  placeholder="exemplo@loja.com.br"
                  value={config.pagamentos.dsPagSeguro.email || ""}
                  onChange={e => setConfig({
                    ...config,
                    pagamentos: {
                      ...config.pagamentos,
                      dsPagSeguro: { ...config.pagamentos.dsPagSeguro, email: e.target.value }
                    }
                  })}
                />
                <label style={{ ...styles.label, color: theme.textSec }}>Token de Production PagSeguro</label>
                <input
                  style={{ ...styles.input, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
                  type="password"
                  placeholder="Cole o token de contingência"
                  value={config.pagamentos.dsPagSeguro.token || ""}
                  onChange={e => setConfig({
                    ...config,
                    pagamentos: {
                      ...config.pagamentos,
                      dsPagSeguro: { ...config.pagamentos.dsPagSeguro, token: e.target.value }
                    }
                  })}
                />
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