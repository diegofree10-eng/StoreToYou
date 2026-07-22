"use client";

export default function MensagensTab({ config, confirmarLeituraMensagem }: any) {
  return (
    <section style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ ...styles.h3, margin: 0 }}>Histórico de Mensagens</h3>
        <div style={{ fontSize: '11px', color: '#64748b' }}>
          {config.historicoMensagens?.filter((m: any) => !m.lida).length || 0} não lidas
        </div>
      </div>

      <div style={styles.msgContainer}>
        {config.historicoMensagens?.length > 0 ? (
          config.historicoMensagens.map((msg: any) => (
            <div key={msg.id} style={{
              ...styles.msgItem,
              borderLeft: msg.prioridade === 'alta' ? '4px solid #ef4444' : '4px solid #3b82f6',
              opacity: msg.lida ? 0.6 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b' }}>{msg.titulo || 'Comunicado'}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {msg.dataEnvio?.seconds ? new Date(msg.dataEnvio.seconds * 1000).toLocaleDateString('pt-BR') : ''}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0, whiteSpace: 'pre-wrap' }}>{msg.texto}</p>

              {!msg.lida && (
                <button
                  type="button"
                  onClick={() => confirmarLeituraMensagem(msg.id)}
                  style={{ marginTop: '10px', fontSize: '10px', background: '#f1f5f9', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  MARCAR COMO LIDA
                </button>
              )}
            </div>
          ))
        ) : (
          <div style={styles.noMsg}>Nenhuma mensagem registrada.</div>
        )}
      </div>
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  msgContainer: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' },
  noMsg: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' },
  msgItem: { background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }
};