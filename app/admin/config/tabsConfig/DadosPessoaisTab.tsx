"use client";

import { aplicarMascara } from "@/utils/formatters";
import { useTheme } from "@/context/ThemeContext";

export default function DadosPessoaisTab({ config, setConfig, buscarCep }: any) {
  const { theme, isModoNoturno } = useTheme();

  return (
    <section className="dados-pessoais-container">
      <h3 style={{ ...styles.h3, color: theme.textMain }}>Identificação do Responsável</h3>
      <div style={styles.inputRow} className="row-responsavel-1">
        <div style={{ flex: 2 }} className="input-group-mobile">
          <label style={{ ...styles.label, color: theme.textSec }}>Nome Completo</label>
          <input
            required
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosPessoais.dsNomeResponsavel || ""}
            onChange={e => setConfig({
              ...config,
              dadosPessoais: { ...config.dadosPessoais, dsNomeResponsavel: e.target.value }
            })}
          />
        </div>
        <div style={{ flex: 1 }} className="input-group-mobile">
          <label style={{ ...styles.label, color: theme.textSec }}>CPF</label>
          <input
            required
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosPessoais.dsCpfResponsavel || ""}
            onChange={e => setConfig({
              ...config,
              dadosPessoais: { ...config.dadosPessoais, dsCpfResponsavel: aplicarMascara(e.target.value, 'cpf') }
            })}
          />
        </div>
      </div>

      <div style={{ ...styles.inputRow, marginTop: '15px' }} className="row-responsavel-2">
        <div style={{ flex: 1 }} className="input-group-mobile">
          <label style={{ ...styles.label, color: theme.textSec }}>E-mail Pessoal</label>
          <input
            required
            type="email"
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosPessoais.dsEmailResponsavel || ""}
            onChange={e => setConfig({
              ...config,
              dadosPessoais: { ...config.dadosPessoais, dsEmailResponsavel: e.target.value }
            })}
          />
        </div>
        <div style={{ flex: 1 }} className="input-group-mobile">
          <label style={{ ...styles.label, color: theme.textSec }}>Telefone</label>
          <input
            required
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosPessoais.dsTelResponsavel || ""}
            onChange={e => setConfig({
              ...config,
              dadosPessoais: { ...config.dadosPessoais, dsTelResponsavel: aplicarMascara(e.target.value, 'tel') }
            })}
          />
        </div>
      </div>

      <h3 style={{ ...styles.h3, marginTop: '25px', color: theme.textMain }}>Endereço do Responsável</h3>

      <div style={{ ...styles.inputRow, marginTop: '10px' }} className="endereco-resp-row-1">
        <div style={{ flex: 3 }} className="input-group-mobile">
          <label style={{ ...styles.label, color: theme.textSec }}>Rua *</label>
          <input
            required
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosPessoais.dsRuaResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsRuaResponsavel: e.target.value } })}
          />
        </div>
        <div style={{ flex: 1 }} className="input-group-mobile">
          <label style={{ ...styles.label, color: theme.textSec }}>Nº *</label>
          <input
            required
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosPessoais.nrNumeroResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, nrNumeroResponsavel: e.target.value } })}
          />
        </div>
        <div style={{ flex: 1.5 }} className="input-group-mobile">
          <label style={{ ...styles.label, color: theme.textSec }}>CEP *</label>
          <input
            required
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosPessoais.dsCepResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsCepResponsavel: aplicarMascara(e.target.value, 'cep') } })}
            onBlur={e => buscarCep(e.target.value, 'pessoal')}
          />
        </div>
      </div>

      <div style={{ ...styles.inputRow, marginTop: '10px' }} className="endereco-resp-row-2">
        <div style={{ flex: 2 }} className="input-group-mobile">
          <label style={{ ...styles.label, color: theme.textSec }}>Bairro *</label>
          <input
            required
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosPessoais.dsBairroResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsBairroResponsavel: e.target.value } })}
          />
        </div>
        <div style={{ flex: 2 }} className="input-group-mobile">
          <label style={{ ...styles.label, color: theme.textSec }}>Cidade *</label>
          <input
            required
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosPessoais.dsCidadeResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsCidadeResponsavel: e.target.value } })}
          />
        </div>
        <div style={{ flex: 0.5 }} className="input-group-mobile">
          <label style={{ ...styles.label, color: theme.textSec }}>UF *</label>
          <input
            required
            maxLength={2}
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosPessoais.dsUfResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsUfResponsavel: e.target.value.toUpperCase() } })}
          />
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .row-responsavel-1,
          .row-responsavel-2,
          .endereco-resp-row-1,
          .endereco-resp-row-2 {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 15px !important;
          }
          .input-group-mobile {
            flex: unset !important;
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", marginBottom: "4px", display: 'block' },
  inputRow: { display: 'flex', gap: '15px' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: 'none', boxSizing: 'border-box', transition: 'background 0.3s, color 0.3s, border 0.3s' }
};