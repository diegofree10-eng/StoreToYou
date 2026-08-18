"use client";

export default function AparenciaTab({
  config,
  setConfig,
  masterLiberou,
  theme
}: any) {
  const currentTheme = theme || {
    bgCard: "#ffffff",
    textMain: "#1e293b",
    textSec: "#64748b",
    border: "#e2e8f0",
    inputBg: "#ffffff",
    primary: "#2563eb"
  };

  const isDark = currentTheme.inputBg !== "#ffffff";

  return (
    <section>
      <h3 style={{ ...styles.h3, color: currentTheme.textMain }}>Personalização Visual do Catálogo</h3>
      {!masterLiberou("temPersonalizacao") ? (
        <div style={styles.lockNotice}>🔒 Bloqueado no plano {config.dadosLoja.dsPlanoLoja}.</div>
      ) : (
        <>
          <p style={{ ...styles.helpText, background: isDark ? '#0f172a' : '#f1f5f9', color: currentTheme.textSec, borderLeft: `4px solid ${currentTheme.primary}` }}>
            Ajuste as cores principais do seu site para combinar com sua marca.
          </p>
          
          {/* Campo de Ativação do Modo Noturno */}
          <div style={{ ...styles.modoNoturnoContainer, background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${currentTheme.border}` }}>
            <div style={styles.modoNoturnoInfo}>
              <span style={{ ...styles.label, color: currentTheme.textMain, marginBottom: '2px' }}>Modo Noturno (Dark Mode)</span>
              <span style={{ ...styles.subLabel, color: currentTheme.textSec }}>Ativar tema escuro padrão para os clientes</span>
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
                backgroundColor: config.aparencia?.isModoNoturno ? currentTheme.primary : '#cbd5e1'
              }}>
                <span style={{
                  ...styles.sliderThumb,
                  transform: config.aparencia?.isModoNoturno ? 'translateX(20px)' : 'translateX(2px)'
                }} />
              </span>
            </label>
          </div>

          <div style={{ ...styles.colorGrid, background: isDark ? '#0f172a' : '#f8fafc', border: `1px solid ${currentTheme.border}` }}>
            <div style={styles.colorItem}>
              <label style={{ ...styles.label, color: currentTheme.textSec }}>Cor Principal</label>
              <input
                type="color"
                style={{ ...styles.inputColor, background: currentTheme.inputBg, border: `2px solid ${currentTheme.border}` }}
                value={config.aparencia?.dscorPrincipal || "#FF8C00"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorPrincipal: e.target.value } })}
              />
            </div>
            <div style={styles.colorItem}>
              <label style={{ ...styles.label, color: currentTheme.textSec }}>Cor Secundária</label>
              <input
                type="color"
                style={{ ...styles.inputColor, background: currentTheme.inputBg, border: `2px solid ${currentTheme.border}` }}
                value={config.aparencia?.dscorSecundaria || "#F5F5DC"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorSecundaria: e.target.value } })}
              />
            </div>
            <div style={styles.colorItem}>
              <label style={{ ...styles.label, color: currentTheme.textSec }}>Cor de Fundo</label>
              <input
                type="color"
                style={{ ...styles.inputColor, background: currentTheme.inputBg, border: `2px solid ${currentTheme.border}` }}
                value={config.aparencia?.dscorFundo || "#f8fafc"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorFundo: e.target.value } })}
              />
            </div>
            <div style={styles.colorItem}>
              <label style={{ ...styles.label, color: currentTheme.textSec }}>Cor dos Textos</label>
              <input
                type="color"
                style={{ ...styles.inputColor, background: currentTheme.inputBg, border: `2px solid ${currentTheme.border}` }}
                value={config.aparencia?.dscorTextoCard || "#1e293b"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorTextoCard: e.target.value } })}
              />
            </div>
          </div>
          <button
            type="button"
            style={{ 
              ...styles.btnRestaurar, 
              marginTop: '20px', 
              background: isDark ? '#0f172a' : '#f1f5f9', 
              color: currentTheme.textMain, 
              border: `1px dashed ${currentTheme.border}` 
            }}
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
  h3: { fontSize: "11px", fontWeight: "800", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", marginBottom: "2px", display: 'block' },
  subLabel: { fontSize: "10px" },
  helpText: { fontSize: '12px', marginBottom: '20px', padding: '10px', borderRadius: '8px' },
  lockNotice: { padding: '12px', background: '#fff1f2', color: '#be123c', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fecdd3', marginTop: '10px' },
  
  modoNoturnoContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderRadius: '12px', marginBottom: '15px' },
  switch: { position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' },
  checkboxHidden: { opacity: 0, width: 0, height: 0 },
  slider: { position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, transition: '.3s', borderRadius: '24px' },
  sliderThumb: { position: 'absolute', content: '""', height: '20px', width: '20px', left: '2px', bottom: '2px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%' },

  colorGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '20px', borderRadius: '15px', marginTop: '10px' },
  colorItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  inputColor: { width: '100%', height: '40px', borderRadius: '10px', cursor: 'pointer', padding: '2px' },
  btnRestaurar: { width: '100%', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }
};