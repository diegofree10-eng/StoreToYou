"use client";

export default function AparenciaTab({
  config,
  setConfig,
  masterLiberou
}: any) {
  return (
    <section>
      <h3 style={styles.h3}>Personalização Visual do Catálogo</h3>
      {!masterLiberou("temPersonalizacao") ? (
        <div style={styles.lockNotice}>🔒 Bloqueado no plano {config.dadosLoja.dsPlanoLoja}.</div>
      ) : (
        <>
          <p style={styles.helpText}>Ajuste as cores principais do seu site para combinar com sua marca.</p>
          
          {/* Campo de Ativação do Modo Noturno */}
          <div style={styles.modoNoturnoContainer}>
            <div style={styles.modoNoturnoInfo}>
              <span style={styles.label}>Modo Noturno (Dark Mode)</span>
              <span style={styles.subLabel}>Ativar tema escuro padrão para os clientes</span>
            </div>
            <label style={styles.switch}>
              <input
                type="checkbox"
                checked={config.aparencia?.isModoNoturno || false}
                onChange={e => setConfig({ 
                  ...config, 
                  aparencia: { ...config.aparencia, isModoNoturno: e.target.checked } 
                })}
                style={styles.checkboxHidden}
              />
              <span style={{
                ...styles.slider,
                backgroundColor: config.aparencia?.isModoNoturno ? '#2563eb' : '#cbd5e1'
              }}>
                <span style={{
                  ...styles.sliderThumb,
                  transform: config.aparencia?.isModoNoturno ? 'translateX(20px)' : 'translateX(2px)'
                }} />
              </span>
            </label>
          </div>

          <div style={styles.colorGrid}>
            <div style={styles.colorItem}>
              <label style={styles.label}>Cor Principal</label>
              <input
                type="color"
                style={styles.inputColor}
                value={config.aparencia?.dscorPrincipal || "#FF8C00"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorPrincipal: e.target.value } })}
              />
            </div>
            <div style={styles.colorItem}>
              <label style={styles.label}>Cor Secundária</label>
              <input
                type="color"
                style={styles.inputColor}
                value={config.aparencia?.dscorSecundaria || "#F5F5DC"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorSecundaria: e.target.value } })}
              />
            </div>
            <div style={styles.colorItem}>
              <label style={styles.label}>Cor de Fundo</label>
              <input
                type="color"
                style={styles.inputColor}
                value={config.aparencia?.dscorFundo || "#f8fafc"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorFundo: e.target.value } })}
              />
            </div>
            <div style={styles.colorItem}>
              <label style={styles.label}>Cor dos Textos</label>
              <input
                type="color"
                style={styles.inputColor}
                value={config.aparencia?.dscorTextoCard || "#1e293b"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorTextoCard: e.target.value } })}
              />
            </div>
          </div>
          <button
            type="button"
            style={{ ...styles.btnRestaurar, marginTop: '20px' }}
            onClick={() => setConfig({
              ...config,
              aparencia: { 
                ...config.aparencia,
                dscorPrincipal: "#FFCC80", 
                dscorSecundaria: "#f1e5d7", 
                dscorFundo: "#FFF9F2", 
                dscorTextoCard: "#8B5E3C",
                isModoNoturno: false 
              }
            })}
          >
            🔄 Restaurar Cores Padrão
          </button>
        </>
      )}
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "2px", display: 'block' },
  subLabel: { fontSize: "10px", color: "#94a3b8" },
  helpText: { fontSize: '12px', color: '#64748b', marginBottom: '20px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #2563eb' },
  lockNotice: { padding: '12px', background: '#fff1f2', color: '#be123c', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fecdd3', marginTop: '10px' },
  
  modoNoturnoContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px' },
  switch: { position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' },
  checkboxHidden: { opacity: 0, width: 0, height: 0 },
  slider: { position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, transition: '.3s', borderRadius: '24px' },
  sliderThumb: { position: 'absolute', content: '""', height: '20px', width: '20px', left: '2px', bottom: '2px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%' },

  colorGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', marginTop: '10px' },
  colorItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  inputColor: { width: '100%', height: '40px', border: '2px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', padding: '2px', background: '#fff' },
  btnRestaurar: { width: '100%', padding: '12px', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#475569' }
};