"use client";

import { FiTrash2 } from "react-icons/fi";
import { aplicarMascara } from "@/utils/formatters";

export default function DadosLojaTab({
  config,
  setConfig,
  buscarCep,
  novaLogo,
  setNovaLogo,
  setShowHorarioModal,
  adicionarRedeSocial,
  atualizarRedeSocial,
  removerRedeSocial
}: any) {
  const slugAtual = config.dadosLoja?.dsSlug || "sua-loja";

  return (
    <section>
      <h3 style={styles.h3}>Marca e Redes Sociais</h3>
      
      {/* Linha com Logo e Link da Loja */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={styles.previewLogo}>
          {novaLogo ? (
            <img src={URL.createObjectURL(novaLogo)} style={styles.imgFull} alt="Logo Preview" />
          ) : config.dadosLoja.dsLogoLoja ? (
            <img src={config.dadosLoja.dsLogoLoja} style={styles.imgFull} alt="Logo da Loja" />
          ) : (
            "LOGO"
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input type="file" onChange={e => setNovaLogo(e.target.files?.[0] || null)} style={{ fontSize: '11px' }} />
        </div>
      </div>

      {/* Campo do Link da Loja */}
      <div style={{ marginBottom: '15px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <label style={styles.label}>Link da sua Loja (Endereço Web)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            readOnly
            style={{ ...styles.input, backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed', fontWeight: 'bold' }}
            value={`www.storetoyou.com.br/${slugAtual}`}
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`https://www.storetoyou.com.br/${slugAtual}`);
              alert("Link copiado para a área de transferência!");
            }}
            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Copiar Link
          </button>
        </div>
      </div>

      {/* Restante do formulário */}
      <div style={{ marginBottom: '15px' }}>
        <label style={styles.label}>Segmento da Loja (Ramo) *</label>
        <select
          required
          style={styles.input}
          value={
            ["festas", "confeitaria", "papelaria", "decoracao", "roupas"].includes(config.dadosLoja.dsSeguimentoLoja)
              ? config.dadosLoja.dsSeguimentoLoja
              : (config.dadosLoja.dsSeguimentoLoja !== "" ? "Outros" : "")
          }
          onChange={e => {
            const val = e.target.value;
            if (val !== "Outros") {
              setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsSeguimentoLoja: val } });
            } else {
              setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsSeguimentoLoja: "OUTROS_MODE" } });
            }
          }}
        >
          <option value="">Selecione o ramo...</option>
          <option value="festas">Artigos para Festas</option>
          <option value="confeitaria">Confeitaria e Doces</option>
          <option value="papelaria">Papelaria Criativa</option>
          <option value="decoracao">Decoração de Eventos</option>
          <option value="roupas">Vestuário e Acessórios</option>
          <option value="Outros">Outros (digitar abaixo)</option>
        </select>
      </div>

      {!["festas", "confeitaria", "papelaria", "decoracao", "roupas", ""].includes(config.dadosLoja.dsSeguimentoLoja) && (
        <div style={{ marginBottom: '15px' }}>
          <label style={styles.label}>Qual o seu segmento? *</label>
          <input
            required
            style={styles.input}
            placeholder="Ex: Pet Shop, Artesanato, etc."
            value={config.dadosLoja.dsSeguimentoLoja === "OUTROS_MODE" ? "" : config.dadosLoja.dsSeguimentoLoja}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsSeguimentoLoja: e.target.value } })}
          />
        </div>
      )}

      <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={styles.label}>Minhas Redes Sociais</label>
          <button type="button" onClick={adicionarRedeSocial} style={styles.btnAdicionarSocial}>+ Adicionar</button>
        </div>
        {config.dadosLoja.redesSociais?.map((rede: any, index: number) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
            <select
              style={{ ...styles.input, flex: 1 }}
              value={rede.plataforma}
              onChange={e => atualizarRedeSocial(index, 'plataforma', e.target.value)}
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="site">Site Próprio</option>
            </select>
            <input
              style={{ ...styles.input, flex: 2 }}
              value={rede.url || ""}
              onChange={e => atualizarRedeSocial(index, 'url', e.target.value)}
              placeholder="URL da rede social"
            />
            <button type="button" onClick={() => removerRedeSocial(index)} style={styles.btnRemoveSocial}>
              <FiTrash2 />
            </button>
          </div>
        ))}
      </div>

      <div style={styles.inputRow}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>WhatsApp Loja *</label>
          <input
            required
            style={styles.input}
            value={config.dadosLoja.nrWhatssapLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, nrWhatssapLoja: aplicarMascara(e.target.value, 'tel') } })}
          />
        </div>
      </div>

      <h3 style={{ ...styles.h3, marginTop: '25px' }}>Endereço da Loja</h3>

      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer', fontSize: '13px' }}>
        <input
          type="checkbox"
          style={{ marginRight: '10px' }}
          onChange={(e) => {
            if (e.target.checked) {
              setConfig({
                ...config,
                dadosLoja: {
                  ...config.dadosLoja,
                  dsRuaLoja: config.dadosPessoais.dsRuaResponsavel,
                  nrNumeroLoja: config.dadosPessoais.nrNumeroResponsavel,
                  dsCepLoja: config.dadosPessoais.dsCepResponsavel,
                  dsCidadeLoja: config.dadosPessoais.dsCidadeResponsavel,
                  dsUfLoja: config.dadosPessoais.dsUfResponsavel,
                  dsBairroLoja: config.dadosPessoais.dsBairroResponsavel
                }
              });
            }
          }}
        />
        <span>A loja fica no mesmo endereço da minha residência</span>
      </label>

      <div style={{ ...styles.inputRow, marginTop: '10px' }}>
        <div style={{ flex: 3 }}>
          <label style={styles.label}>Rua *</label>
          <input
            required
            style={styles.input}
            value={config.dadosLoja.dsRuaLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsRuaLoja: e.target.value } })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Nº *</label>
          <input
            required
            style={styles.input}
            value={config.dadosLoja.nrNumeroLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, nrNumeroLoja: e.target.value } })}
          />
        </div>
        <div style={{ flex: 1.5 }}>
          <label style={styles.label}>CEP *</label>
          <input
            required
            style={styles.input}
            value={config.dadosLoja.dsCepLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsCepLoja: aplicarMascara(e.target.value, 'cep') } })}
            onBlur={e => buscarCep(e.target.value, 'loja')}
          />
        </div>
      </div>

      <div style={{ ...styles.inputRow, marginTop: '10px' }}>
        <div style={{ flex: 2 }}>
          <label style={styles.label}>Bairro *</label>
          <input
            required
            style={styles.input}
            value={config.dadosLoja.dsBairroLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsBairroLoja: e.target.value } })}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label style={styles.label}>Cidade *</label>
          <input
            required
            style={styles.input}
            value={config.dadosLoja.dsCidadeLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsCidadeLoja: e.target.value } })}
          />
        </div>
        <div style={{ flex: 0.5 }}>
          <label style={styles.label}>UF *</label>
          <input
            required
            maxLength={2}
            style={styles.input}
            value={config.dadosLoja.dsUfLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsUfLoja: e.target.value.toUpperCase() } })}
          />
        </div>
      </div>

      <button type="button" onClick={() => setShowHorarioModal(true)} style={{ ...styles.btnHorario, marginTop: '20px' }}>
        🕗 Configurar Horários
      </button>
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: 'block' },
  inputRow: { display: 'flex', gap: '15px' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: 'none' },
  previewLogo: { width: '60px', height: '60px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imgFull: { width: '100%', height: '100%', objectFit: 'cover' },
  btnHorario: { width: '100%', padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  btnAdicionarSocial: { background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  btnRemoveSocial: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};