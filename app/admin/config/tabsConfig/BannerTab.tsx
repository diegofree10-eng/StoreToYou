"use client";

import { useState } from "react";
import { FiImage, FiUploadCloud, FiTrash2 } from "react-icons/fi";
import { excluirBannerCompleto } from "@/utils/exclusao";
import ImageCropperModalBanner from "@/utils/ImageCropperModalBanner";

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

      <h3 style={styles.h3}>Banners do Carrossel (Início)</h3>
      <p style={styles.helpText}>
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
            <div key={num} style={styles.bannerField}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={styles.label}>Banner {num}</label>
                {(arquivo || urlSalva) && (
                  <button type="button" onClick={handleExcluirOuLimpar} style={styles.btnRemoverLixeira}>
                    <FiTrash2 size={13} /> Excluir Banner
                  </button>
                )}
              </div>

              <div style={styles.bannerPreview}>
                {arquivo ? (
                  <img src={URL.createObjectURL(arquivo)} style={styles.imgFull} alt={`Preview ${num}`} />
                ) : urlSalva ? (
                  <img src={urlSalva} style={styles.imgFull} alt={`Salvo ${num}`} />
                ) : (
                  <FiImage size={30} color="#cbd5e1" />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <label style={styles.uploadTrigger}>
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
                    style={{ ...styles.input, fontSize: '12px', padding: '10px' }}
                    value={config.banners[linkCampo] || ""}
                    onChange={e => setConfig({
                      ...config,
                      banners: { ...config.banners, [linkCampo]: e.target.value }
                    })}
                  >
                    <option value="">Sem link (Categoria Alvo)</option>
                    {listaCategorias.map((cat: any) => (
                      <option key={cat.id} value={cat.nome}>{cat.nome}</option>
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
  h3: { fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: 'block' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: 'none' },
  helpText: { fontSize: '12px', color: '#64748b', marginBottom: '20px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #2563eb' },
  bannerGrid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  bannerField: { border: '1px solid #e2e8f0', padding: '15px', borderRadius: '12px', background: '#f8fafc' },
  bannerPreview: { width: '100%', aspectRatio: '1100 / 380', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imgFull: { width: '100%', height: '100%', objectFit: 'cover' },
  uploadTrigger: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#475569' },
  btnRemoverLixeira: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }
};