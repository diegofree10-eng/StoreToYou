"use client";

export default function PagamentosTab({
  config,
  setConfig,
  masterLiberouMeioPagamento
}: any) {

  // Função auxiliar para atualizar o tipo de chave ou o valor da chave mantendo a estrutura
  const handleChavePixChange = (campo: "tipo" | "valor", valor: string) => {
    const pagamentosAtual = config.pagamentos || {};
    
    // Se a chave pix salva for uma string simples, convertemos para objeto interno, ou mantemos organizado
    let pixAtual = typeof pagamentosAtual.dsChavePix === 'object' 
      ? { ...pagamentosAtual.dsChavePix } 
      : { tipo: "telefone", valor: typeof pagamentosAtual.dsChavePix === 'string' ? pagamentosAtual.dsChavePix : "" };

    pixAtual[campo] = valor;

    // Se mudou o tipo, podemos limpar ou manter o valor atual
    setConfig({
      ...config,
      pagamentos: {
        ...pagamentosAtual,
        dsChavePix: pixAtual
      }
    });
  };

  // Extrai o tipo e o valor com segurança para os inputs
  const pixObj = typeof config.pagamentos?.dsChavePix === 'object' 
    ? config.pagamentos.dsChavePix 
    : { tipo: "telefone", valor: config.pagamentos?.dsChavePix || "" };

  return (
    <section>
      <h3 style={styles.h3}>Recebimento Manual</h3>
      
      <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={styles.label}>Tipo de Chave PIX</label>
        <select
          style={styles.select}
          value={pixObj.tipo || "telefone"}
          onChange={e => handleChavePixChange("tipo", e.target.value)}
        >
          <option value="telefone">Celular / Telefone</option>
          <option value="cpf">CPF</option>
          <option value="cnpj">CNPJ</option>
          <option value="email">E-mail</option>
          <option value="aleatoria">Chave Aleatória (EVP)</option>
        </select>

        <label style={styles.label}>Chave PIX ({pixObj.tipo?.toUpperCase() || "TELEFONE"})</label>
        <input
          style={styles.input}
          value={pixObj.valor || ""}
          onChange={e => handleChavePixChange("valor", e.target.value)}
          placeholder={
            pixObj.tipo === 'telefone' ? 'Ex: 11999999999 (Apenas DDD + Número)' :
            pixObj.tipo === 'cpf' ? 'Ex: 000.000.000-00' :
            pixObj.tipo === 'email' ? 'Ex: seuemail@loja.com' :
            'Digite sua chave Pix'
          }
        />
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          {pixObj.tipo === 'telefone' && '💡 Digite apenas o DDD e o número. O sistema ajustará o formato automaticamente para o padrão do Banco Central.'}
        </span>
      </div>

      <h3 style={styles.h3}>Gateways de Checkout Ativos</h3>
      <p style={styles.helpText}>
        Habilite as chaves do intermediador que você possui conta ativa. O recebimento online depende do seu plano contratado.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* MERCADO PAGO - Só aparece se estiver liberado no plano */}
        {masterLiberouMeioPagamento("mercado_pago") && (
          <div style={{
            background: config.pagamentos.dsMercadoPago?.ativo ? '#f0f9ff' : '#f8fafc',
            padding: '20px',
            borderRadius: '15px',
            border: config.pagamentos.dsMercadoPago?.ativo ? '1px solid #009ee3' : '1px solid #e2e8f0'
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
                <label style={styles.label}>Public Key</label>
                <input
                  style={styles.input}
                  value={config.pagamentos.dsMercadoPago.publicKey || ""}
                  onChange={e => setConfig({
                    ...config,
                    pagamentos: {
                      ...config.pagamentos,
                      dsMercadoPago: { ...config.pagamentos.dsMercadoPago, publicKey: e.target.value }
                    }
                  })}
                />
                <label style={styles.label}>Access Token</label>
                <input
                  style={styles.input}
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

        {/* PAGSEGURO - Só aparece se estiver liberado no plano */}
        {masterLiberouMeioPagamento("pagseguro") && (
          <div style={{
            background: config.pagamentos.dsPagSeguro?.ativo ? '#fdf8f5' : '#f8fafc',
            padding: '20px',
            borderRadius: '15px',
            border: config.pagamentos.dsPagSeguro?.ativo ? '1px solid #ff6c00' : '1px solid #e2e8f0'
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
                <label style={styles.label}>E-mail da Conta PagSeguro</label>
                <input
                  style={styles.input}
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
                <label style={styles.label}>Token de Production PagSeguro</label>
                <input
                  style={styles.input}
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
  h3: { fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: 'block' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: 'none', backgroundColor: '#fff' },
  select: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: 'none', backgroundColor: '#fff', cursor: 'pointer' },
  helpText: { fontSize: '12px', color: '#64748b', marginBottom: '20px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #2563eb' }
};