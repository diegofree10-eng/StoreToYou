"use client";

import { useState } from "react";
import { FiImage, FiUploadCloud, FiTrash2 } from "react-icons/fi";
import { excluirBannerCompleto } from "@/utils/exclusao";
import ImageCropperModalBanner from "@/utils/ImageCropperModalBanner";
import { useTheme } from "@/context/ThemeContext";

export default function BannerTab({
  uid,
  config,
  setConfig,
  listaCategorias,
  arquivoBanner1,
  arquivoBanner2,
  arquivoBanner3,
  setArquivoBanner1,
  setArquivoBanner2,
  setArquivoBanner3
}: any) {
  const { theme, isModoNoturno } = useTheme();

  const [bannerParaCortar, setBannerParaCortar] = useState<number | null>(null);
  const [tempFileTemp, setTempFileTemp] = useState<File | null>(null);

  const handleCropComplete = (croppedBlob: Blob) => {
    if (!bannerParaCortar) return;
    const croppedFile = new File([croppedBlob], `banner_${bannerParaCortar}.jpg`, { type: "image/jpeg" });

    if (bannerParaCortar === 1) setArquivoBanner1(croppedFile);
    if (bannerParaCortar === 2) setArquivoBanner2(croppedFile);
    if (bannerParaCortar === 3) setArquivoBanner3(croppedFile);

    setBannerParaCortar(null);
    setTempFileTemp(null);
  };

  return (
    <section>
      {bannerParaCortar && tempFileTemp && (
        <ImageCropperModalBanner
          file={tempFileTemp}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setBannerParaCortar(null);
            setTempFileTemp(null);
          }}
        />
      )}

      <h3 style={{ ...styles.h3, color: theme.textMain }}>Banners do Carrossel (Início)</h3>
      <p style={{ ...styles.helpText, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec, borderLeft: `4px solid ${theme.primary}` }}>
        Utilize imagens na proporção exata de <b>1100 x 380 pixels</b> (o cropper abrirá automaticamente para ajuste). Vincule o banner a uma categoria para redirecionamento automático.
      </p>
      
      <div style={styles.bannerGrid}>
        {[1, 2, 3].map((num) => {
          const campoBanner = `dsBanner${num}` as keyof typeof config.banners;
          const linkCampo = `dsLinkBanner${num}` as keyof typeof config.banners;

          const arquivo = num === 1 ? arquivoBanner1 : num === 2 ? arquivoBanner2 : arquivoBanner3;
          const setArquivo = num === 1 ? setArquivoBanner1 : num === 2 ? setArquivoBanner2 : setArquivoBanner3;
          const urlSalva = config.banners[campoBanner];

          const handleExcluirOuLimpar = async () => {
            if (arquivo) {
              setArquivo(null);
            } else if (urlSalva) {
              if (confirm(`Deseja realmente excluir o Banner ${num}?`)) {
                try {
                  await excluirBannerCompleto(uid, num, urlSalva);
                  setConfig((prev: any) => ({
                    ...prev,
                    banners: {
                      ...prev.banners,
                      [campoBanner]: "",
                      [linkCampo]: ""
                    }
                  }));
                  alert(`Banner ${num} excluído com sucesso! ✅`);
                } catch (error) {
                  console.error(error);
                  alert("Erro ao excluir o banner.");
                }
              }
            }
          };

          return (
            <div key={num} style={{ ...styles.bannerField, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ ...styles.label, color: theme.textSec }}>Banner {num}</label>
                {(arquivo || urlSalva) && (
                  <button type="button" onClick={handleExcluirOuLimpar} style={styles.btnRemoverLixeira}>
                    <FiTrash2 size={13} /> Excluir Banner
                  </button>
                )}
              </div>

              <div style={{ ...styles.bannerPreview, background: isModoNoturno ? theme.bgCard : '#fff', border: `1px dashed ${theme.border}` }}>
                {arquivo ? (
                  <img src={URL.createObjectURL(arquivo)} style={styles.imgFull} alt={`Preview ${num}`} />
                ) : urlSalva ? (
                  <img src={urlSalva} style={styles.imgFull} alt={`Salvo ${num}`} />
                ) : (
                  <FiImage size={30} color={theme.textSec} />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <label style={{ ...styles.uploadTrigger, background: theme.bgApp, color: theme.textMain, border: `1px solid ${theme.border}` }}>
                  <FiUploadCloud /> {arquivo || urlSalva ? "Trocar Imagem" : "Escolher Imagem"}
                  <input 
                    type="file" 
                    accept="image/*" 
                    hidden 
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setTempFileTemp(file);
                        setBannerParaCortar(num);
                      }
                    }} 
                  />
                </label>

                <div style={{ position: 'relative' }}>
                  <select
                    style={{ 
                      ...styles.input, 
                      fontSize: '12px', 
                      padding: '10px', 
                      background: theme.bgApp, 
                      color: theme.textMain, 
                      border: `1px solid ${theme.border}` 
                    }}
                    value={config.banners[linkCampo] || ""}
                    onChange={e => setConfig({
                      ...config,
                      banners: { ...config.banners, [linkCampo]: e.target.value }
                    })}
                  >
                    <option value="" style={{ background: theme.bgApp, color: theme.textMain }}>Sem link (Categoria Alvo)</option>
                    {listaCategorias.map((cat: any) => (
                      <option key={cat.id} value={cat.nome} style={{ background: theme.bgApp, color: theme.textMain }}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", marginBottom: "4px", display: 'block' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: 'none', boxSizing: 'border-box' },
  helpText: { fontSize: '12px', marginBottom: '20px', padding: '10px', borderRadius: '8px' },
  bannerGrid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  bannerField: { padding: '15px', borderRadius: '12px', boxSizing: 'border-box' },
  bannerPreview: { width: '100%', aspectRatio: '1100 / 380', borderRadius: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxSizing: 'border-box' },
  imgFull: { width: '100%', height: '100%', objectFit: 'cover' },
  uploadTrigger: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', boxSizing: 'border-box' },
  btnRemoverLixeira: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }
};