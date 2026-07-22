"use client";

import { aplicarMascara } from "@/utils/formatters";

export default function DadosPessoaisTab({ config, setConfig, buscarCep }: any) {
  return (
    <section>
      <h3 style={styles.h3}>Identificação do Responsável</h3>
      <div style={styles.inputRow}>
        <div style={{ flex: 2 }}>
          <label style={styles.label}>Nome Completo</label>
          <input
            required
            style={styles.input}
            value={config.dadosPessoais.dsNomeResponsavel || ""}
            onChange={e => setConfig({
              ...config,
              dadosPessoais: { ...config.dadosPessoais, dsNomeResponsavel: e.target.value }
            })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>CPF</label>
          <input
            required
            style={styles.input}
            value={config.dadosPessoais.dsCpfResponsavel || ""}
            onChange={e => setConfig({
              ...config,
              dadosPessoais: { ...config.dadosPessoais, dsCpfResponsavel: aplicarMascara(e.target.value, 'cpf') }
            })}
          />
        </div>
      </div>

      <div style={{ ...styles.inputRow, marginTop: '15px' }}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>E-mail Pessoal</label>
          <input
            required
            type="email"
            style={styles.input}
            value={config.dadosPessoais.dsEmailResponsavel || ""}
            onChange={e => setConfig({
              ...config,
              dadosPessoais: { ...config.dadosPessoais, dsEmailResponsavel: e.target.value }
            })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Telefone</label>
          <input
            required
            style={styles.input}
            value={config.dadosPessoais.dsTelResponsavel || ""}
            onChange={e => setConfig({
              ...config,
              dadosPessoais: { ...config.dadosPessoais, dsTelResponsavel: aplicarMascara(e.target.value, 'tel') }
            })}
          />
        </div>
      </div>

      <h3 style={{ ...styles.h3, marginTop: '25px' }}>Endereço do Responsável</h3>

      <div style={{ ...styles.inputRow, marginTop: '10px' }}>
        <div style={{ flex: 3 }}>
          <label style={styles.label}>Rua *</label>
          <input
            required
            style={styles.input}
            value={config.dadosPessoais.dsRuaResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsRuaResponsavel: e.target.value } })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Nº *</label>
          <input
            required
            style={styles.input}
            value={config.dadosPessoais.nrNumeroResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, nrNumeroResponsavel: e.target.value } })}
          />
        </div>
        <div style={{ flex: 1.5 }}>
          <label style={styles.label}>CEP *</label>
          <input
            required
            style={styles.input}
            value={config.dadosPessoais.dsCepResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsCepResponsavel: aplicarMascara(e.target.value, 'cep') } })}
            onBlur={e => buscarCep(e.target.value, 'pessoal')}
          />
        </div>
      </div>

      <div style={{ ...styles.inputRow, marginTop: '10px' }}>
        <div style={{ flex: 2 }}>
          <label style={styles.label}>Bairro *</label>
          <input
            required
            style={styles.input}
            value={config.dadosPessoais.dsBairroResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsBairroResponsavel: e.target.value } })}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label style={styles.label}>Cidade *</label>
          <input
            required
            style={styles.input}
            value={config.dadosPessoais.dsCidadeResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsCidadeResponsavel: e.target.value } })}
          />
        </div>
        <div style={{ flex: 0.5 }}>
          <label style={styles.label}>UF *</label>
          <input
            required
            maxLength={2}
            style={styles.input}
            value={config.dadosPessoais.dsUfResponsavel || ""}
            onChange={e => setConfig({ ...config, dadosPessoais: { ...config.dadosPessoais, dsUfResponsavel: e.target.value.toUpperCase() } })}
          />
        </div>
      </div>
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: 'block' },
  inputRow: { display: 'flex', gap: '15px' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: 'none' }
};