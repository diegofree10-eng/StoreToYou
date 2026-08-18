"use client";

export default function MensagensTab({ config, confirmarLeituraMensagem, theme }: any) {
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
    <section style={{ padding: '20px', background: currentTheme.bgCard, borderRadius: '12px', borderTop: `1px solid ${currentTheme.border}`, borderRight: `1px solid ${currentTheme.border}`, borderBottom: `1px solid ${currentTheme.border}`, borderLeft: `1px solid ${currentTheme.border}`, transition: 'background 0.3s, border 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ ...styles.h3, margin: 0, color: currentTheme.textMain }}>Histórico de Mensagens</h3>
        <div style={{ fontSize: '11px', color: currentTheme.textSec }}>
          {config.historicoMensagens?.filter((m: any) => !m.lida).length || 0} não lidas
        </div>
      </div>

      <div style={styles.msgContainer}>
        {config.historicoMensagens?.length > 0 ? (
          config.historicoMensagens.map((msg: any) => {
            const corBordaEsquerda = msg.prioridade === 'alta' ? '#ef4444' : '#3b82f6';
            
            return (
              <div key={msg.id} style={{
                ...styles.msgItem,
                background: isDark ? '#0f172a' : '#f8fafc',
                borderTop: `1px solid ${currentTheme.border}`,
                borderRight: `1px solid ${currentTheme.border}`,
                borderBottom: `1px solid ${currentTheme.border}`,
                borderLeft: `4px solid ${corBordaEsquerda}`,
                opacity: msg.lida ? 0.6 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: currentTheme.textMain }}>{msg.titulo || 'Comunicado'}</span>
                  <span style={{ fontSize: '10px', color: currentTheme.textSec }}>
                    {msg.dataEnvio?.seconds ? new Date(msg.dataEnvio.seconds * 1000).toLocaleDateString('pt-BR') : ''}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: currentTheme.textSec, margin: 0, whiteSpace: 'pre-wrap' }}>{msg.texto}</p>

                {!msg.lida && (
                  <button
                    type="button"
                    onClick={() => confirmarLeituraMensagem(msg.id)}
                    style={{ 
                      marginTop: '10px', 
                      fontSize: '10px', 
                      background: isDark ? '#1e293b' : '#f1f5f9', 
                      color: currentTheme.textMain,
                      borderTop: `1px solid ${currentTheme.border}`,
                      borderRight: `1px solid ${currentTheme.border}`,
                      borderBottom: `1px solid ${currentTheme.border}`,
                      borderLeft: `1px solid ${currentTheme.border}`, 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold' 
                    }}
                  >
                    MARCAR COMO LIDA
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ ...styles.noMsg, color: currentTheme.textSec }}>Nenhuma mensagem registrada.</div>
        )}
      </div>
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  msgContainer: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' },
  noMsg: { textAlign: 'center', padding: '40px', fontSize: '13px' },
  msgItem: { padding: '20px', borderRadius: '16px', boxSizing: 'border-box' }
};