"use client";

import { FiImage, FiUploadCloud, FiTrash2 } from "react-icons/fi";
import { excluirBannerCompleto } from "@/utils/exclusao"; // ajuste o caminho relativo se necessário

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
  return (
    <section>
      <h3 style={styles.h3}>Banners do Carrossel (Início)</h3>
      <p style={styles.helpText}>
        Utilize imagens de <b>1200 x 400 pixels</b>. Vincule o banner a uma categoria para redirecionamento automático.
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
              // Apenas remove o arquivo selecionado localmente que ainda não foi salvo
              setArquivo(null);
            } else if (urlSalva) {
              // Confirmação opcional ou execução direta da limpeza completa (Storage + Firestore)
              if (confirm(`Deseja realmente excluir o Banner ${num}?`)) {
                try {
                  await excluirBannerCompleto(uid, num, urlSalva);

                  // Atualiza o estado local imediatamente
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
                  <button
                    type="button"
                    onClick={handleExcluirOuLimpar}
                    style={styles.btnRemoverLixeira}
                  >
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
                  <input type="file" accept="image/*" hidden onChange={e => setArquivo(e.target.files?.[0] || null)} />
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
  bannerPreview: { width: '100%', height: '120px', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imgFull: { width: '100%', height: '100%', objectFit: 'cover' },
  uploadTrigger: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#475569' },
  btnRemoverLixeira: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }
};