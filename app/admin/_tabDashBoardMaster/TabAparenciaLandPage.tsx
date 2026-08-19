"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { FiUploadCloud, FiTrash2, FiImage } from "react-icons/fi";
import ImageCropperModal from "@/utils/ImageCropperModal"; // Para o Logotipo
import ImageCropperModalBanner from "@/utils/ImageCropperModalBanner"; // Para os Banners (proporção 1100x380)
import { useTheme } from "@/context/ThemeContext";

export default function TabAparenciaLandPage() {
    const { theme, isModoNoturno } = useTheme();

    const [loading, setLoading] = useState(true);
    const [logoTipo, setLogoTipo] = useState("");
    const [tempLogoFile, setTempLogoFile] = useState<File | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const [banners, setBanners] = useState<string[]>(["", "", ""]);
    const [arquivosBanners, setArquivosBanners] = useState<(File | null)[]>([null, null, null]);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    // Estados de controle do Cropper para o Banner
    const [bannerParaCortar, setBannerParaCortar] = useState<number | null>(null);
    const [tempBannerFile, setTempBannerFile] = useState<File | null>(null);

    const docRef = doc(db, "configuracoes", "sistema", "landPage", "banners");

    useEffect(() => {
        carregarConfiguracoes();
    }, []);

    const carregarConfiguracoes = async () => {
        try {
            setLoading(true);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.logoTipo) setLogoTipo(data.logoTipo);
                if (data.listaBanners && Array.isArray(data.listaBanners)) {
                    setBanners([
                        data.listaBanners[0] || "",
                        data.listaBanners[1] || "",
                        data.listaBanners[2] || ""
                    ]);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCropCompleteLogo = async (croppedBlob: Blob) => {
        setTempLogoFile(null);
        try {
            setUploadingLogo(true);
            if (logoTipo && logoTipo.startsWith('http')) {
                try { await deleteObject(ref(storage, logoTipo)); } catch(err){}
            }
            const storageRef = ref(storage, `sistema/landpage/logo_${Date.now()}.png`);
            const snap = await uploadBytes(storageRef, croppedBlob);
            const url = await getDownloadURL(snap.ref);
            setLogoTipo(url);
            await setDoc(docRef, { logoTipo: url }, { merge: true });
            alert("Logotipo atualizado com sucesso! ✅");
        } catch(err) {
            alert("Erro ao enviar logotipo.");
        } finally {
            setUploadingLogo(false);
        }
    };

    // Função executada após o corte do banner ser concluído no modal
    const handleCropCompleteBanner = (croppedBlob: Blob) => {
        if (bannerParaCortar === null) return;
        const index = bannerParaCortar;
        const croppedFile = new File([croppedBlob], `banner_${index + 1}.jpg`, { type: "image/jpeg" });

        const novosArquivos = [...arquivosBanners];
        novosArquivos[index] = croppedFile;
        setArquivosBanners(novosArquivos);

        setBannerParaCortar(null);
        setTempBannerFile(null);
    };

    const handleExcluirBanner = async (index: number) => {
        const arquivoLocal = arquivosBanners[index];
        const urlSalva = banners[index];

        if (arquivoLocal) {
            const novos = [...arquivosBanners];
            novos[index] = null;
            setArquivosBanners(novos);
            return;
        }

        if (urlSalva && confirm(`Deseja realmente excluir o Banner ${index + 1}?`)) {
            try {
                if (urlSalva.startsWith('http')) {
                    await deleteObject(ref(storage, urlSalva));
                }
                const novosBanners = [...banners];
                novosBanners[index] = "";
                setBanners(novosBanners);
                await setDoc(docRef, { listaBanners: novosBanners }, { merge: true });
                alert(`Banner ${index + 1} excluído com sucesso! ✅`);
            } catch (error) {
                alert("Erro ao excluir o banner.");
            }
        }
    };

    const handleSalvarBanner = async (index: number) => {
        const arquivo = arquivosBanners[index];
        if (!arquivo) return;

        try {
            setUploadingIndex(index);
            const urlAntiga = banners[index];
            if (urlAntiga && urlAntiga.startsWith('http')) {
                try { await deleteObject(ref(storage, urlAntiga)); } catch (e) {}
            }

            const storageRef = ref(storage, `sistema/landpage/banner_${index + 1}_${Date.now()}_${arquivo.name}`);
            const snapshot = await uploadBytes(storageRef, arquivo);
            const downloadUrl = await getDownloadURL(snapshot.ref);

            const novosBanners = [...banners];
            novosBanners[index] = downloadUrl;
            setBanners(novosBanners);

            const novosArquivos = [...arquivosBanners];
            novosArquivos[index] = null;
            setArquivosBanners(novosArquivos);

            await setDoc(docRef, { listaBanners: novosBanners }, { merge: true });
            alert(`Banner ${index + 1} atualizado com sucesso! 🚀`);
        } catch (error) {
            alert("Erro ao fazer upload da imagem.");
        } finally {
            setUploadingIndex(null);
        }
    };

    if (loading) return <div style={{ padding: "40px", textAlign: "center", color: theme.textSec }}>Carregando painel...</div>;

    return (
        <div style={styles.container}>
            {/* Modal de Corte do Logotipo */}
            {tempLogoFile && (
                <ImageCropperModal 
                    file={tempLogoFile} 
                    onCropComplete={handleCropCompleteLogo} 
                    onCancel={() => setTempLogoFile(null)} 
                />
            )}

            {/* Modal de Corte do Banner (Proporção 1100x380) */}
            {bannerParaCortar !== null && tempBannerFile && (
                <ImageCropperModalBanner
                    file={tempBannerFile}
                    onCropComplete={handleCropCompleteBanner}
                    onCancel={() => {
                        setBannerParaCortar(null);
                        setTempBannerFile(null);
                    }}
                />
            )}

            <div style={styles.headerBox}>
                <h2 style={{ ...styles.title, color: theme.textMain }}>Aparência da Landing Page</h2>
                <p style={{ ...styles.subtitle, color: theme.textSec }}>Gerencie a identidade visual e os banners do carrossel principal.</p>
            </div>

            {/* LOGOTIPO COM O CROPPER */}
            <div style={{ ...styles.sectionCard, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
                <h3 style={{ ...styles.h3, color: theme.textSec }}>Logotipo do Sistema</h3>
                <p style={{ ...styles.helpText, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec }}>Utilize uma imagem limpa. O sistema ajustará automaticamente para o formato padrão otimizado.</p>

                <div style={{ ...styles.bannerField, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
                    <div style={{ ...styles.bannerPreview, height: '100px', width: '200px', margin: '0 auto', background: theme.bgCard, border: `1px dashed ${theme.border}` }}>
                        {logoTipo ? (
                            <img src={logoTipo} alt="Logotipo" style={{ maxHeight: "80px", width: "auto", objectFit: "contain" }} />
                        ) : (
                            <FiImage size={24} color={theme.textSec} />
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                        <label style={{ ...styles.uploadTrigger, background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textMain }}>
                            <FiUploadCloud /> {uploadingLogo ? "Processando..." : logoTipo ? "Trocar Logotipo" : "Escolher Logotipo"}
                            <input 
                                type="file" 
                                accept="image/*" 
                                hidden 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setTempLogoFile(file);
                                }} 
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* BANNERS DO CARROSSEL COM O CROPPER */}
            <div style={{ ...styles.sectionCard, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
                <h3 style={{ ...styles.h3, color: theme.textSec }}>Banners do Carrossel (Início)</h3>
                <p style={{ ...styles.helpText, background: isModoNoturno ? theme.bgApp : '#f1f5f9', color: theme.textSec }}>Tamanho recomendado: <b>1100 x 380 pixels</b> (o cropper abrirá automaticamente para ajuste perfeito).</p>

                <div style={styles.bannerGrid}>
                    {[0, 1, 2].map((index) => {
                        const num = index + 1;
                        const arquivo = arquivosBanners[index];
                        const urlSalva = banners[index];

                        return (
                            <div key={index} style={{ ...styles.bannerField, background: isModoNoturno ? theme.bgApp : '#f8fafc', border: `1px solid ${theme.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <label style={{ ...styles.label, color: theme.textSec }}>Banner {num}</label>
                                    {(arquivo || urlSalva) && (
                                        <button type="button" onClick={() => handleExcluirBanner(index)} style={styles.btnRemoverLixeira}>
                                            <FiTrash2 size={13} /> Excluir Banner
                                        </button>
                                    )}
                                </div>

                                <div style={{ ...styles.bannerPreview, background: theme.bgCard, border: `1px dashed ${theme.border}` }}>
                                    {arquivo ? (
                                        <img src={URL.createObjectURL(arquivo)} style={styles.imgFull} alt={`Preview ${num}`} />
                                    ) : urlSalva ? (
                                        <img src={urlSalva} style={styles.imgFull} alt={`Salvo ${num}`} />
                                    ) : (
                                        <FiImage size={30} color={theme.textSec} />
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <label style={{ ...styles.uploadTrigger, background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textMain }}>
                                        <FiUploadCloud /> {arquivo || urlSalva ? "Trocar Imagem" : "Escolher Imagem"}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            hidden 
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setTempBannerFile(file);
                                                    setBannerParaCortar(index);
                                                }
                                            }} 
                                        />
                                    </label>

                                    {arquivo && (
                                        <button type="button" disabled={uploadingIndex === index} onClick={() => handleSalvarBanner(index)} style={styles.btnSalvarAlteracao}>
                                            {uploadingIndex === index ? "Salvando..." : "Salvar Alteração"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const styles: any = {
    container: { maxWidth: "1000px", margin: "0 auto", padding: "20px", fontFamily: "'Inter', sans-serif" },
    headerBox: { marginBottom: "30px" },
    title: { fontSize: "24px", fontWeight: "800", marginBottom: "8px" },
    subtitle: { fontSize: "14px" },
    sectionCard: { borderRadius: "16px", padding: "25px", marginBottom: "25px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" },
    h3: { fontSize: "14px", fontWeight: "800", marginBottom: "8px", textTransform: 'uppercase' },
    label: { fontSize: "12px", fontWeight: "600", display: 'block' },
    helpText: { fontSize: '13px', marginBottom: '20px', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #055bb1' },
    bannerGrid: { display: 'flex', flexDirection: 'column', gap: '20px' },
    bannerField: { padding: '15px', borderRadius: '12px' },
    bannerPreview: { width: '100%', aspectRatio: '1100 / 380', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    imgFull: { width: '100%', height: '100%', objectFit: 'cover' },
    uploadTrigger: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
    btnSalvarAlteracao: { flex: 1, padding: '12px', background: '#055bb1', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
    btnRemoverLixeira: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }
};