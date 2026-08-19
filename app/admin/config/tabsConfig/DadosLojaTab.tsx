"use client";

import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { aplicarMascara } from "@/utils/formatters";
import ImageCropperModalLogo from "@/utils/ImageCropperModalLogo";
import { useTheme } from "@/context/ThemeContext";

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
  const { theme, isModoNoturno } = useTheme();
  const slugAtual = config.dadosLoja?.dsSlug || "sua-loja";

  // Estado local para gerenciar o arquivo temporário que irá para o Cropper
  const [tempFileLogo, setTempFileLogo] = useState<File | null>(null);

  // Recebe o Blob cortado pelo ImageCropperModalLogo e converte para File
  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], "logo_loja.png", { type: "image/png" });
    setNovaLogo(croppedFile);
    setTempFileLogo(null);
  };

  return (
    <section className="dados-loja-container">
      {/* MODAL CROPPER DE LOGO */}
      {tempFileLogo && (
        <ImageCropperModalLogo
          file={tempFileLogo}
          onCropComplete={handleCropComplete}
          onCancel={() => setTempFileLogo(null)}
        />
      )}

      <h3 style={{ ...styles.h3, color: theme.textMain }}>Marca e Redes Sociais</h3>
      
      {/* Linha com Logo e Link da Loja */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ ...styles.previewLogo, background: isModoNoturno ? theme.bgApp : '#f1f5f9', border: `1px solid ${theme.border}`, color: theme.textSec }}>
          {novaLogo ? (
            <img src={URL.createObjectURL(novaLogo)} style={styles.imgFull} alt="Logo Preview" />
          ) : config.dadosLoja.dsLogoLoja ? (
            <img src={config.dadosLoja.dsLogoLoja} style={styles.imgFull} alt="Logo da Loja" />
          ) : (
            "LOGO"
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input 
            type="file" 
            accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                setTempFileLogo(file);
              }
            }} 
            style={{ fontSize: '11px', color: theme.textMain }} 
          />
        </div>
      </div>

      {/* Campo do Link da Loja */}
      <div style={{ marginBottom: '15px', background: isModoNoturno ? theme.bgApp : '#f8fafc', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
        <label style={{ ...styles.label, color: theme.textSec }}>Link da sua Loja (Endereço Web)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="link-loja-row">
          <input
            type="text"
            readOnly
            style={{ 
              ...styles.input, 
              backgroundColor: isModoNoturno ? theme.bgCard : '#f1f5f9', 
              color: theme.textSec, 
              border: `1px solid ${theme.border}`,
              cursor: 'not-allowed', 
              fontWeight: 'bold' 
            }}
            value={`www.storetoyou.com.br/${slugAtual}`}
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`https://www.storetoyou.com.br/${slugAtual}`);
              alert("Link copiado para a área de transferência!");
            }}
            style={{ background: theme.primary, color: '#fff', border: 'none', padding: '12px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Copiar Link
          </button>
        </div>
      </div>

      {/* Restante do formulário */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ ...styles.label, color: theme.textSec }}>Segmento da Loja (Ramo) *</label>
        <select
          required
          style={{ 
            ...styles.input, 
            background: theme.bgApp, 
            color: theme.textMain, 
            border: `1px solid ${theme.border}` 
          }}
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
          <option value="" style={{ background: theme.bgApp, color: theme.textMain }}>Selecione o ramo...</option>
          <option value="festas" style={{ background: theme.bgApp, color: theme.textMain }}>Artigos para Festas</option>
          <option value="confeitaria" style={{ background: theme.bgApp, color: theme.textMain }}>Confeitaria e Doces</option>
          <option value="papelaria" style={{ background: theme.bgApp, color: theme.textMain }}>Papelaria Criativa</option>
          <option value="decoracao" style={{ background: theme.bgApp, color: theme.textMain }}>Decoração de Eventos</option>
          <option value="roupas" style={{ background: theme.bgApp, color: theme.textMain }}>Vestuário e Acessórios</option>
          <option value="Outros" style={{ background: theme.bgApp, color: theme.textMain }}>Outros (digitar abaixo)</option>
        </select>
      </div>

      {!["festas", "confeitaria", "papelaria", "decoracao", "roupas", ""].includes(config.dadosLoja.dsSeguimentoLoja) && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ ...styles.label, color: theme.textSec }}>Qual o seu segmento? *</label>
          <input
            required
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            placeholder="Ex: Pet Shop, Artesanato, etc."
            value={config.dadosLoja.dsSeguimentoLoja === "OUTROS_MODE" ? "" : config.dadosLoja.dsSeguimentoLoja}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsSeguimentoLoja: e.target.value } })}
          />
        </div>
      )}

      <div style={{ background: isModoNoturno ? theme.bgApp : '#f8fafc', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ ...styles.label, color: theme.textSec }}>Minhas Redes Sociais</label>
          <button type="button" onClick={adicionarRedeSocial} style={{ ...styles.btnAdicionarSocial, background: theme.primary }}>+ Adicionar</button>
        </div>
        {config.dadosLoja.redesSociais?.map((rede: any, index: number) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }} className="rede-social-row">
            <select
              style={{ 
                ...styles.input, 
                flex: 1, 
                background: theme.bgApp, 
                color: theme.textMain, 
                border: `1px solid ${theme.border}` 
              }}
              value={rede.plataforma}
              onChange={e => atualizarRedeSocial(index, 'plataforma', e.target.value)}
            >
              <option value="instagram" style={{ background: theme.bgApp, color: theme.textMain }}>Instagram</option>
              <option value="facebook" style={{ background: theme.bgApp, color: theme.textMain }}>Facebook</option>
              <option value="tiktok" style={{ background: theme.bgApp, color: theme.textMain }}>TikTok</option>
              <option value="youtube" style={{ background: theme.bgApp, color: theme.textMain }}>YouTube</option>
              <option value="site" style={{ background: theme.bgApp, color: theme.textMain }}>Site Próprio</option>
            </select>
            <input
              style={{ 
                ...styles.input, 
                flex: 2, 
                background: theme.bgApp, 
                color: theme.textMain, 
                border: `1px solid ${theme.border}` 
              }}
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
          <label style={{ ...styles.label, color: theme.textSec }}>WhatsApp Loja *</label>
          <input
            required
            style={{ 
              ...styles.input, 
              background: theme.bgApp, 
              color: theme.textMain, 
              border: `1px solid ${theme.border}` 
            }}
            value={config.dadosLoja.nrWhatssapLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, nrWhatssapLoja: aplicarMascara(e.target.value, 'tel') } })}
          />
        </div>
      </div>

      <h3 style={{ ...styles.h3, marginTop: '25px', color: theme.textMain }}>Endereço da Loja</h3>

      <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer', fontSize: '13px', color: theme.textMain }}>
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

      <div style={{ ...styles.inputRow, marginTop: '10px' }} className="endereco-row-1">
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
            value={config.dadosLoja.dsRuaLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsRuaLoja: e.target.value } })}
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
            value={config.dadosLoja.nrNumeroLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, nrNumeroLoja: e.target.value } })}
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
            value={config.dadosLoja.dsCepLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsCepLoja: aplicarMascara(e.target.value, 'cep') } })}
            onBlur={e => buscarCep(e.target.value, 'loja')}
          />
        </div>
      </div>

      <div style={{ ...styles.inputRow, marginTop: '10px' }} className="endereco-row-2">
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
            value={config.dadosLoja.dsBairroLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsBairroLoja: e.target.value } })}
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
            value={config.dadosLoja.dsCidadeLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsCidadeLoja: e.target.value } })}
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
            value={config.dadosLoja.dsUfLoja || ""}
            onChange={e => setConfig({ ...config, dadosLoja: { ...config.dadosLoja, dsUfLoja: e.target.value.toUpperCase() } })}
          />
        </div>
      </div>

      <button type="button" onClick={() => setShowHorarioModal(true)} style={{ ...styles.btnHorario, marginTop: '20px', background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}>
        🕗 Configurar Horários
      </button>

      {/* Regras CSS exclusivas para celulares (Mobile) sem alterar o PC */}
      <style jsx>{`
        @media (max-width: 768px) {
          .link-loja-row,
          .rede-social-row,
          .endereco-row-1,
          .endereco-row-2 {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .input-group-mobile {
            flex: unset !important;
            width: 100% !important;
          }
          .link-loja-row button {
            width: 100% !important;
          }
          .rede-social-row select,
          .rede-social-row input {
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
  input: { width: "100%", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: 'none', boxSizing: 'border-box', transition: 'background 0.3s, color 0.3s, border 0.3s' },
  previewLogo: { width: '60px', height: '60px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imgFull: { width: '100%', height: '100%', objectFit: 'cover' },
  btnHorario: { width: '100%', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: 'background 0.3s, color 0.3s' },
  btnAdicionarSocial: { color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  btnRemoveSocial: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};