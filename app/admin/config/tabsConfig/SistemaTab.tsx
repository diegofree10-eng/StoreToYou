"use client";

import { aplicarMascara } from "@/utils/formatters";

export default function SistemaTab({
  config,
  setConfig,
  masterLiberou,
  setShowCupomModal,
  showToken,
  setShowToken
}: any) {
  return (
    <section>
      <h3 style={styles.h3}>Marketing</h3>
      <button
        type="button"
        disabled={!masterLiberou("temCupons")}
        onClick={() => setShowCupomModal(true)}
        style={masterLiberou("temCupons") ? styles.btnCupom : styles.btnDisabledTab}
      >
        {masterLiberou("temCupons") ? "🎟️ Gerenciar Cupons de Desconto" : "🔒 Cupons Bloqueados"}
      </button>

      <h3 style={{ ...styles.h3, marginTop: '25px' }}>Configuração de Frete Grátis</h3>
      <div style={{
        background: !masterLiberou("temFreteGratis") ? '#fafafa' : config.sistema.isFreteGratisAtivo ? '#f0f9ff' : '#f8fafc',
        padding: '15px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Ativar Frete Grátis</span>
          <input
            type="checkbox"
            disabled={!masterLiberou("temFreteGratis")}
            checked={!!config.sistema.isFreteGratisAtivo}
            onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isFreteGratisAtivo: e.target.checked } })}
          />
        </div>
        {config.sistema.isFreteGratisAtivo && (
          <div style={{ marginTop: '10px' }}>
            <label style={styles.label}>Valor Mínimo (R$)</label>
            <input
              style={styles.input}
              value={config.sistema.vlFreteGratisMinimo || ""}
              onChange={e => setConfig({ ...config, sistema: { ...config.sistema, vlFreteGratisMinimo: aplicarMascara(e.target.value, 'dinheiro') } })}
            />
          </div>
        )}
      </div>

      <h3 style={{ ...styles.h3, marginTop: '25px' }}>Logística e Entrega</h3>
      <div style={{ opacity: masterLiberou("temLogistica") ? 1 : 0.6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={styles.label}>Token Melhor Envio</label>
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            style={styles.btnToggleToken}
          >
            {showToken ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <input
          style={styles.input}
          type={showToken ? "text" : "password"}
          disabled={!masterLiberou("temLogistica")}
          value={config.sistema.dsTokenMelhorEnvio || ""}
          onChange={e => setConfig({ ...config, sistema: { ...config.sistema, dsTokenMelhorEnvio: e.target.value } })}
          placeholder={masterLiberou("temLogistica") ? "Cole seu token aqui..." : "Bloqueado"}
        />

        <label style={{ ...styles.label, marginTop: '15px' }}>Transportadoras Ativas</label>
        <div style={styles.gridTransp}>
          {["azul", "correios", "jadlog", "latam"].map(t => (
            <label
              key={t}
              style={{ ...styles.transpItem, cursor: masterLiberou("temLogistica") ? 'pointer' : 'not-allowed' }}
            >
              <input
                type="checkbox"
                disabled={!masterLiberou("temLogistica")}
                checked={masterLiberou("temLogistica") ? !!(config.sistema.dstransportadoras?.[t]) : false}
                onChange={() => {
                  const transportadorasAtuais = config.sistema.dstransportadoras || {};
                  const novas = {
                    ...transportadorasAtuais,
                    [t]: !transportadorasAtuais[t]
                  };

                  setConfig({
                    ...config,
                    sistema: {
                      ...config.sistema,
                      dstransportadoras: novas
                    }
                  });
                }}
              />
              <span style={{ textTransform: 'capitalize' }}>{t}</span>
            </label>
          ))}
        </div>

        {!masterLiberou("temLogistica") && (
          <div style={styles.lockNotice}>
            🔒 Logística e Integrações indisponíveis no seu plano atual.
          </div>
        )}
      </div>

      <h3 style={{ ...styles.h3, marginTop: '25px' }}>Status da Loja</h3>
      <select
        style={styles.input}
        value={String(config.sistema?.isLojaAberta ?? true)}
        onChange={e => {
          const valor = e.target.value === "true";
          setConfig((prev: any) => ({
            ...prev,
            sistema: {
              ...(prev.sistema || {}),
              isLojaAberta: valor
            }
          }));
        }}
      >
        <option value="true">🟢 ABERTA PARA PEDIDOS</option>
        <option value="false">🔴 VITRINE (CATÁLOGO)</option>
      </select>
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: 'block' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: 'none' },
  btnCupom: { width: '100%', padding: '15px', background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnDisabledTab: { width: '100%', padding: '15px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 'bold', cursor: 'not-allowed' },
  gridTransp: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px' },
  transpItem: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' },
  lockNotice: { padding: '12px', background: '#fff1f2', color: '#be123c', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fecdd3', marginTop: '10px' },
  btnToggleToken: { background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }
};