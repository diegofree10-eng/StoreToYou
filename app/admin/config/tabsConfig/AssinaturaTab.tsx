"use client";

import { useTheme } from "@/context/ThemeContext";

export default function AssinaturaTab({
  config,
  planosConfig,
  setShowUpgradeModal
}: any) {
  const { theme, isModoNoturno } = useTheme();

  const planoAtualNome = config.dadosLoja?.dsPlanoLoja || 'Bronze';
  const planoInfo = planosConfig?.[planoAtualNome] || {};

  const tsVencimento = config.dadosLoja?.tsVencimentoLoja;
  const dataVencimentoStr = tsVencimento?.seconds
    ? new Date(tsVencimento.seconds * 1000).toLocaleDateString('pt-BR')
    : '---';

  const historico = config.historicoPagamentos || [];

  return (
    <section style={{ padding: '20px', background: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, transition: 'background 0.3s' }}>
      <h3 style={{ ...styles.h3, margin: '0 0 15px 0', color: theme.textMain }}>Gerenciamento de Assinatura</h3>

      {/* Cabeçalho do Plano */}
      <div style={{ ...styles.planoCard, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '12px', color: theme.textSec, textTransform: 'uppercase', fontWeight: '700' }}>Plano Atual</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: theme.textMain, marginTop: '2px' }}>
              {planoAtualNome}
            </div>

            <div style={{ fontSize: '14px', color: '#059669', fontWeight: '800', marginTop: '6px' }}>
              R$ {planoInfo.preco || '0'},00 / mês
            </div>

            <div style={{ fontSize: '12px', color: theme.textSec, marginTop: '12px', lineHeight: '1.6' }}>
              ✅ {planoInfo.produtos || 0} produtos permitidos
              <br />
              ✅ {planoInfo.categorias || 0} categorias permitidas
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: theme.textSec, textTransform: 'uppercase', fontWeight: '700' }}>Vencimento</div>
            <div style={{ fontWeight: '800', color: '#ef4444', fontSize: '15px', marginTop: '2px' }}>
              {dataVencimentoStr}
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ ...styles.h3, marginTop: '25px', color: theme.textMain }}>Histórico de Pagamentos</h3>

      <div style={styles.msgContainer}>
        {historico.length > 0 ? (
          historico.map((pag: any) => {
            const dataPagamento = pag.tsAssinaturaLojista?.seconds
              ? new Date(pag.tsAssinaturaLojista.seconds * 1000).toLocaleDateString('pt-BR')
              : '---';

            const status = pag.dsStatusPagamentoLojista || 'Pendente';
            const isAtivacao = status === 'Ativação' || status === 'Pago';

            return (
              <div key={pag.id} style={{ 
                ...styles.historicoItem, 
                background: isModoNoturno ? theme.bgApp : '#f8fafc', 
                border: `1px solid ${theme.border}` 
              }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: theme.textMain }}>
                    {pag.dsMesReferencia || 'Referência não informada'}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.textSec, marginTop: '2px' }}>
                    {dataPagamento}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: theme.textMain }}>
                    R$ {Number(pag.vlAssinaturaLojista || 0).toFixed(2)}
                  </div>
                  <span style={{
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    display: 'inline-block',
                    marginTop: '4px',
                    background: isAtivacao ? (isModoNoturno ? '#064e3b' : '#dcfce7') : (isModoNoturno ? '#7f1d1d' : '#fee2e2'),
                    color: isAtivacao ? (isModoNoturno ? '#6ee7b7' : '#166534') : (isModoNoturno ? '#f87171' : '#991b1b')
                  }}>
                    {status}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ ...styles.noMsg, color: theme.textSec }}>Nenhum histórico encontrado.</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowUpgradeModal(true)}
        style={{ ...styles.btnUpgrade, background: theme.primary }}
      >
        VER COMPARATIVO DE PLANOS E UPGRADE
      </button>
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  planoCard: { padding: '20px', borderRadius: '14px' },
  msgContainer: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', maxHeight: '250px', overflowY: 'auto' },
  historicoItem: { display: 'flex', justifyContent: 'space-between', padding: '12px 15px', borderRadius: '10px', alignItems: 'center' },
  noMsg: { textAlign: 'center', padding: '20px', fontSize: '12px' },
  btnUpgrade: {
    marginTop: '25px',
    width: '100%',
    color: '#fff',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer'
  }
};