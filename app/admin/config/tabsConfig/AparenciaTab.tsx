"use client";

import { useTheme } from "@/context/ThemeContext";

export default function AparenciaTab({
  config,
  setConfig,
  masterLiberou
}: any) {
  const { theme, isModoNoturno } = useTheme();

  // Verificações independentes de planos
  const podePersonalizarCores = masterLiberou("temPersonalizacao");
  const podeUsarWhatsapp = masterLiberou("whatsappNotificacoes");

  return (
    <section>
      <h3 style={{ ...styles.h3, color: theme.textMain }}>Personalização Visual do Catálogo</h3>

      {/* 🌟 MODO NOTURNO: Sempre visível e livre para qualquer lojista */}
      <div style={{ ...styles.modoNoturnoContainer, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
        <div style={styles.modoNoturnoInfo}>
          <span style={{ ...styles.label, color: theme.textMain, marginBottom: '2px' }}>Modo Noturno (Dark Mode)</span>
          <span style={{ ...styles.subLabel, color: theme.textSec }}>Ativar tema escuro padrão para os clientes</span>
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
            backgroundColor: config.aparencia?.isModoNoturno ? theme.primary : '#cbd5e1'
          }}>
            <span style={{
              ...styles.sliderThumb,
              transform: config.aparencia?.isModoNoturno ? 'translateX(20px)' : 'translateX(2px)'
            }} />
          </span>
        </label>
      </div>

      {/* 🎨 PERSONALIZAÇÃO DE CORES: Oculta se o plano não permitir (sem aviso de bloqueio) */}
      {podePersonalizarCores && (
        <>
          <p style={{ ...styles.helpText, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec, borderLeft: `4px solid ${theme.primary}` }}>
            Ajuste as cores principais do seu site para combinar com sua marca.
          </p>

          <div style={{ ...styles.colorGrid, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
            <div style={styles.colorItem}>
              <label style={{ ...styles.label, color: theme.textSec }}>Cor Principal</label>
              <input
                type="color"
                style={{ ...styles.inputColor, background: theme.bgApp, border: `2px solid ${theme.border}` }}
                value={config.aparencia?.dscorPrincipal || "#FF8C00"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorPrincipal: e.target.value } })}
              />
            </div>
            <div style={styles.colorItem}>
              <label style={{ ...styles.label, color: theme.textSec }}>Cor Secundária</label>
              <input
                type="color"
                style={{ ...styles.inputColor, background: theme.bgApp, border: `2px solid ${theme.border}` }}
                value={config.aparencia?.dscorSecundaria || "#F5F5DC"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorSecundaria: e.target.value } })}
              />
            </div>
            <div style={styles.colorItem}>
              <label style={{ ...styles.label, color: theme.textSec }}>Cor de Fundo</label>
              <input
                type="color"
                style={{ ...styles.inputColor, background: theme.bgApp, border: `2px solid ${theme.border}` }}
                value={config.aparencia?.dscorFundo || "#f8fafc"}
                onChange={e => setConfig({ ...config, aparencia: { ...config.aparencia, dscorFundo: e.target.value } })}
              />
            </div>
            <div style={styles.colorItem}>
              <label style={{ ...styles.label, color: theme.textSec }}>Cor dos Textos</label>
              <input
                type="color"
                style={{ ...styles.inputColor, background: theme.bgApp, border: `2px solid ${theme.border}` }}
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
              background: isModoNoturno ? theme.bgApp : '#f1f5f9',
              color: theme.textMain,
              border: `1px dashed ${theme.border}`
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

      {/* 💬 AUTOMAÇÃO DE WHATSAPP: Oculta se o plano não possui whatsappNotificacoes */}
      {podeUsarWhatsapp && (
        <div style={{ ...styles.whatsappSection, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
          <h4 style={{ ...styles.h4, color: theme.textMain }}>💬 Automação de WhatsApp (Mensagens ao Cliente)</h4>
          <p style={{ ...styles.subLabel, color: theme.textSec, marginBottom: '15px' }}>
            Personalize o texto enviado em cada etapa. Variáveis disponíveis: <code style={styles.codeTag}>{"{nome}"}</code>, <code style={styles.codeTag}>{"{pedido}"}</code>, <code style={styles.codeTag}>{"{rastreio}"}</code> e <code style={styles.codeTag}>{"{endereco_loja}"}</code>.
          </p>

          <div style={styles.whatsappItem}>
            <label style={{ ...styles.label, color: theme.textSec }}>1. Mensagem de Entrada em Produção</label>
            <textarea
              style={{ ...styles.textarea, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
              rows={2}
              value={config.aparencia?.configuracoesWhatsapp?.msgProducao || ""}
              placeholder="Ex: Olá {nome}! Seu pedido #{pedido} entrou em produção."
              onChange={e => setConfig({
                ...config,
                aparencia: {
                  ...config.aparencia,
                  configuracoesWhatsapp: { ...config.aparencia?.configuracoesWhatsapp, msgProducao: e.target.value }
                }
              })}
            />
          </div>

          <div style={styles.whatsappItem}>
            <label style={{ ...styles.label, color: theme.textSec }}>2. Mensagem de Pedido Enviado (Transportadora / Correios)</label>
            <textarea
              style={{ ...styles.textarea, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
              rows={2}
              value={config.aparencia?.configuracoesWhatsapp?.msgEnviado || ""}
              placeholder="Ex: Olá {nome}! Seu pedido #{pedido} foi enviado. Rastreio: {rastreio}"
              onChange={e => setConfig({
                ...config,
                aparencia: {
                  ...config.aparencia,
                  configuracoesWhatsapp: { ...config.aparencia?.configuracoesWhatsapp, msgEnviado: e.target.value }
                }
              })}
            />
          </div>

          <div style={styles.whatsappItem}>
            <label style={{ ...styles.label, color: theme.textSec }}>3. Mensagem de Saiu para Entrega Local (Motoboy)</label>
            <textarea
              style={{ ...styles.textarea, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
              rows={2}
              value={config.aparencia?.configuracoesWhatsapp?.msgEntregaLocal || ""}
              placeholder="Ex: Olá {nome}! O motoboy acabou de sair para entregar seu pedido #{pedido}!"
              onChange={e => setConfig({
                ...config,
                aparencia: {
                  ...config.aparencia,
                  configuracoesWhatsapp: { ...config.aparencia?.configuracoesWhatsapp, msgEntregaLocal: e.target.value }
                }
              })}
            />
          </div>

          <div style={styles.whatsappItem}>
            <label style={{ ...styles.label, color: theme.textSec }}>4. Mensagem de Pronto para Retirada na Loja</label>
            <textarea
              style={{ ...styles.textarea, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
              rows={2}
              value={config.aparencia?.configuracoesWhatsapp?.msgRetirada || ""}
              placeholder="Ex: Olá {nome}! Seu pedido #{pedido} está pronto para retirada em {endereco_loja}."
              onChange={e => setConfig({
                ...config,
                aparencia: {
                  ...config.aparencia,
                  configuracoesWhatsapp: { ...config.aparencia?.configuracoesWhatsapp, msgRetirada: e.target.value }
                }
              })}
            />
          </div>

          <div style={styles.whatsappItem}>
            <label style={{ ...styles.label, color: theme.textSec }}>5. Mensagem de Pedido Concluído</label>
            <textarea
              style={{ ...styles.textarea, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}
              rows={2}
              value={config.aparencia?.configuracoesWhatsapp?.msgConcluido || ""}
              placeholder="Ex: Olá {nome}! Seu pedido #{pedido} foi finalizado. Obrigado!"
              onChange={e => setConfig({
                ...config,
                aparencia: {
                  ...config.aparencia,
                  configuracoesWhatsapp: { ...config.aparencia?.configuracoesWhatsapp, msgConcluido: e.target.value }
                }
              })}
            />
          </div>
        </div>
      )}
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  h4: { fontSize: "12px", fontWeight: "700", marginBottom: "6px" },
  label: { fontSize: "11px", fontWeight: "600", marginBottom: "2px", display: 'block' },
  subLabel: { fontSize: "10px", display: 'block' },
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

  whatsappSection: { padding: '20px', borderRadius: '15px', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' },
  whatsappItem: { display: 'flex', flexDirection: 'column', gap: '5px' },
  textarea: { width: '100%', padding: '10px', borderRadius: '8px', fontSize: '12px', resize: 'vertical', fontFamily: 'inherit' },
  codeTag: { background: 'rgba(0,0,0,0.06)', padding: '2px 4px', borderRadius: '4px', fontSize: '10px' },

  btnRestaurar: { width: '100%', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }
};