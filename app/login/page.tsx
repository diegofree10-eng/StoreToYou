// app/auth/page.tsx
"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { sincronizarNovosCamposLojista, obterModeloPadrao } from "@/utils/atualizarNovosCampos";

const PALAVRAS_PROIBIDAS = ["admin", "master", "suporte", "root", "config", "sistema", "teste"];

function AuthFormContent() {
    const searchParams = useSearchParams();
    const refCode = searchParams.get("ref");
    const nomeIndicadorUrl = searchParams.get("nome");

    const [isLogin, setIsLogin] = useState(!refCode); // Se tiver ref, já abre direto na tela de cadastro/teste grátis!
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [nomeLoja, setNomeLoja] = useState("");
    const [loading, setLoading] = useState(false);
    const [logoSistema, setLogoSistema] = useState("/logo.png");

    const [nomeLojaIndicadora] = useState<string | null>(
        nomeIndicadorUrl ? decodeURIComponent(nomeIndicadorUrl) : null
    );

    const router = useRouter();

    // Salva o código de indicação no localStorage assim que a página carrega com o ?ref=
    useEffect(() => {
        if (refCode) {
            localStorage.setItem("indicadoPor", refCode);
        }
    }, [refCode]);

    useEffect(() => {
        async function buscarLogoSistema() {
            try {
                const docRef = doc(db, "configuracoes/sistema/landPage/banners");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().logoTipo) {
                    setLogoSistema(docSnap.data().logoTipo);
                }
            } catch (error) {
                console.error("Erro ao buscar logo do sistema:", error);
            }
        }
        buscarLogoSistema();
    }, []);

    const handleAuth = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                const userCredential = await signInWithEmailAndPassword(auth, email, senha);
                const uid = userCredential.user.uid;

                const userDocRef = doc(db, "usuarios", uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    await signOut(auth);
                    router.push("/atendimentoSuporte");
                    throw new Error("Perfil de usuário não encontrado no banco de dados.");
                }

                const userData = userDocSnap.data();

                // 🌟 Verificação baseada na nova flag booleana de colaborador
                if (userData.isTipoContaColaborador === true) {
                    const lojaId = userData.dsLojaId || userData.lojaId;
                    if (!lojaId) {
                        await signOut(auth);
                        throw new Error("Loja do colaborador não vinculada.");
                    }

                    const lojaRef = doc(db, "lojistas", lojaId);
                    const lojaDoc = await getDoc(lojaRef);
                    if (lojaDoc.exists()) {
                        const dadosLoja = lojaDoc.data().dadosLoja;
                        if (dadosLoja?.dsStatusLoja === "suspenso") {
                            await signOut(auth);
                            router.push("/atendimentoSuporte");
                            return;
                        }
                    }

                    if (typeof window !== "undefined") {
                        localStorage.setItem("colaborador_loja_id", lojaId);
                    }

                    router.push("/admin");
                    return;
                }

                if (typeof window !== "undefined") {
                    localStorage.removeItem("colaborador_loja_id");
                }

                const lojaRef = doc(db, "lojistas", uid);
                const lojaDoc = await getDoc(lojaRef);

                if (!lojaDoc.exists()) {
                    await signOut(auth);
                    router.push("/atendimentoSuporte");
                    throw new Error("Conta de lojista não encontrada.");
                }

                const dadosLoja = lojaDoc.data().dadosLoja;
                if (dadosLoja?.dsStatusLoja === "suspenso") {
                    await signOut(auth);
                    router.push("/atendimentoSuporte");
                    return;
                }

                let schemaGlobal = 0;
                let versaoSistemaGlobal = "0.0.0";
                try {
                    const configSistemaRef = doc(db, "configuracoes", "sistema");
                    const configSnap = await getDoc(configSistemaRef);
                    if (configSnap.exists()) {
                        const dataConfig = configSnap.data();
                        schemaGlobal = Number(dataConfig.versaoSchemaAtual) || Number(dataConfig.historicoVersoes?.nrVersaoSchemaSistema) || 0;
                        versaoSistemaGlobal = dataConfig.dsVersaoSistema || dataConfig.historicoVersoes?.nrVersaoSistemaSistema || "0.0.0";
                    }
                } catch (err) {
                    console.error("Erro ao buscar versão global do sistema:", err);
                }

                await sincronizarNovosCamposLojista(uid, lojaDoc.data(), schemaGlobal, versaoSistemaGlobal);

                await setDoc(lojaRef, { ultimoLogin: serverTimestamp() }, { merge: true });
                router.push("/admin");

            } else {
                const nomeLimpo = nomeLoja.trim();
                if (PALAVRAS_PROIBIDAS.some(p => nomeLimpo.toLowerCase().includes(p))) {
                    throw new Error("Nome da loja não permitido.");
                }

                const lojasRef = collection(db, "lojistas");
                const q = query(lojasRef, where("dadosLoja.dsNomeLoja", "==", nomeLimpo));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    throw new Error("Já existe uma loja com este nome.");
                }

                // Recupera quem indicou priorizando a URL atual ou o localStorage
                const codigoIndicador = refCode || localStorage.getItem("indicadoPor") || null;

                const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
                const user = userCredential.user;
                const slugGerado = nomeLimpo.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]/g, "-")
                    .replace(/-+/g, "-");

                const isMasterUser = email === "diegofree10@gmail.com";

                // 🌟 Criação do usuário estritamente com as flags booleanas (sem strings de cargo)
                await setDoc(doc(db, "usuarios", user.uid), {
                    lojaId: user.uid,
                    email: email,
                    isTipoContaLogista: !isMasterUser,
                    isTipoContaMaster: isMasterUser,
                    isTipoContaColaborador: false,
                    indicadoPor: codigoIndicador,
                    criadoEm: Date.now()
                }, { merge: true });

                // 🌟 Salva o cadastro novo do lojista utilizando exclusivamente o novo padrão booleano
                await setDoc(doc(db, "lojistas", user.uid), {
                    uid: user.uid,
                    email: email,
                    isTipoContaLogista: !isMasterUser,
                    isTipoContaMaster: isMasterUser,
                    indicadoPor: codigoIndicador,
                    dataCadastro: Date.now(),
                    ultimoLogin: serverTimestamp(),
                    sistema: obterModeloPadrao(),
                    dadosPessoais: {
                        dsNomeResponsavel: "",
                        dsRuaResponsavel: "",
                        nrNumeroResponsavel: "",
                        dsCepResponsavel: "",
                        dsBairroResponsavel: "",
                        dsCidadeResponsavel: "",
                        dsUfResponsavel: "",
                        dsTelResponsavel: "",
                        dsEmailResponsavel: email,
                        isTipoContaLogista: !isMasterUser,
                        isTipoContaMaster: isMasterUser
                    },
                    dadosLoja: {
                        dsNomeLoja: nomeLimpo,
                        dsSlug: slugGerado,
                        dsPlanoLoja: "Bronze",
                        dsStatusLoja: "ativo",
                        tsCriacaoLoja: serverTimestamp(),
                        isAtivoLoja: true,
                        ciclo: "mensal"
                    }
                }, { merge: true });

                // Se houver indicação, registra na subcoleção do padrinho com o nome real digitado
                if (codigoIndicador && codigoIndicador !== user.uid) {
                    try {
                        await setDoc(doc(db, "lojistas", codigoIndicador, "indicacoes", user.uid), {
                            uidIndicado: user.uid,
                            emailIndicado: email,
                            nomeIndicado: nomeLimpo || "Loja sem Nome",
                            dataCadastro: new Date().toISOString(),
                            status: "pendente"
                        });
                    } catch (errInd) {
                        console.error("Erro ao registrar indicação para o padrinho:", errInd);
                    }
                }

                localStorage.removeItem("indicadoPor");
                router.push("/admin");
            }
        } catch (error: any) {
            console.error("Erro:", error);

            let mensagemErro = error.message || "Erro ao processar.";

            if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
                mensagemErro = "E-mail ou senha incorretos. Verifique seus dados e tente novamente.";
            } else if (error.code === "auth/invalid-email") {
                mensagemErro = "O formato do e-mail é inválido.";
            } else if (error.code === "auth/email-already-in-use") {
                mensagemErro = "Este e-mail já está cadastrado em outra conta.";
            } else if (error.code === "auth/weak-password") {
                mensagemErro = "A senha deve ter pelo menos 6 caracteres.";
            }

            alert(mensagemErro);
            setLoading(false);
        }
    };

    const handleRecuperarSenha = async () => {
        if (!email) return alert("Digite seu e-mail.");
        try {
            await sendPasswordResetEmail(auth, email);
            alert("E-mail enviado!");
        } catch (error: any) { alert(error.message); }
    };

    return (
        <div style={styles.container} className="auth-wrapper">
            <div style={styles.banner} className="auth-banner">
                <div style={styles.logoBox}>
                    <img
                        src={logoSistema}
                        alt="Logo do Sistema"
                        fetchPriority="high"
                        style={{ maxHeight: '60px', maxWidth: '150px', width: 'auto', objectFit: 'contain', borderRadius: '8px' }}
                    />
                </div>
                <h1 style={styles.bannerTitle}>Store ToYou</h1>
                <p style={styles.bannerSubtitle}>Crie sua loja online e gerencie tudo em um só lugar.</p>
                <div style={styles.bannerDecoration}></div>
            </div>

            <div style={styles.loginArea} className="auth-area">
                <form onSubmit={handleAuth} style={styles.card} className="auth-card">
                    <div style={styles.header}>
                        <h2 style={styles.titleText}>{isLogin ? "Bem-vindo!" : "Teste grátis"}</h2>
                        <p style={styles.subtitleText}>{isLogin ? "Acesse seu painel" : "Crie sua conta agora"}</p>
                    </div>

                    {!isLogin && nomeLojaIndicadora && (
                        <div style={styles.badgeIndicacao}>
                            🎁 Indicado por: <b>{nomeLojaIndicadora}</b>
                        </div>
                    )}

                    {!isLogin && (
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Nome da Loja</label>
                            <input placeholder="Ex: Minha Loja" value={nomeLoja} onChange={(e) => setNomeLoja(e.target.value)} style={styles.input} required />
                        </div>
                    )}

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>E-mail</label>
                        <input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Senha</label>
                        <div style={styles.passwordContainer}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Sua senha"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                style={styles.passwordInput}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={styles.eyeBtn}
                            >
                                {showPassword ? "Ocultar" : "Ver"}
                            </button>
                        </div>
                    </div>

                    {isLogin && (
                        <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                            <button type="button" onClick={handleRecuperarSenha} style={styles.btnLink}>Esqueceu a senha?</button>
                        </div>
                    )}

                    <button type="submit" disabled={loading} style={{ ...styles.btn, background: loading ? '#cbd5e1' : '#055bb1' }}>
                        {loading ? "Processando..." : (isLogin ? "Entrar" : "Criar Loja")}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '15px' }}>
                        <button type="button" onClick={() => setIsLogin(!isLogin)} style={styles.btnLinkBold}>
                            {isLogin ? "Cadastre-se grátis" : "Já tenho conta"}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                @media (max-width: 850px) {
                    .auth-wrapper { 
                        flex-direction: column !important; 
                        height: 100dvh !important;
                        overflow: hidden !important; 
                    }
                    .auth-banner { 
                        flex: 0 0 auto !important; 
                        width: 100% !important; 
                        padding: 15px 15px !important; 
                    }
                    .auth-banner h1 {
                        font-size: 20px !important;
                        margin-top: 5px !important;
                    }
                    .auth-area { 
                        flex: 1 !important;
                        padding: 10px !important; 
                        align-items: center !important;
                        background-color: #f0f2f5 !important;
                        overflow: hidden !important;
                    }
                    .auth-card { 
                        padding: 20px !important; 
                        box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important; 
                        width: 100% !important; 
                        max-width: 380px !important; 
                        border-radius: 14px !important;
                    }
                    .banner-subtitle { 
                        display: none !important; 
                    }
                }
            `}</style>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', background: '#f0f2f5' }}>Carregando...</div>}>
            <AuthFormContent />
        </Suspense>
    );
}

const styles: any = {
    container: { display: 'flex', height: '100dvh', width: '100vw', background: '#f0f2f5', overflow: 'hidden', position: 'fixed', top: 0, left: 0 },
    banner: { flex: '0 0 40%', background: '#055bb1', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden' },
    logoBox: { marginBottom: '10px', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    bannerTitle: { margin: 0, fontSize: '28px', fontWeight: 'bold', zIndex: 2 },
    bannerSubtitle: { fontSize: '16px', color: '#e2e8f0', marginTop: '10px', maxWidth: '300px', zIndex: 2 },
    bannerDecoration: { position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', zIndex: 1 },
    loginArea: { flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', overflow: 'hidden' },
    card: { background: '#fff', padding: '35px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
    header: { textAlign: 'center', marginBottom: '25px' },
    titleText: { margin: 0, fontSize: '22px', color: '#1a1a1a' },
    subtitleText: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
    badgeIndicacao: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', textAlign: 'center', marginBottom: '15px', fontWeight: '500' },
    inputGroup: { marginBottom: '15px' },
    label: { display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px', color: '#333' },
    input: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e1e1e1', boxSizing: 'border-box', fontSize: '15px', outlineColor: '#055bb1', color: '#000' },
    passwordContainer: { display: 'flex', alignItems: 'center', position: 'relative', width: '100%' },
    passwordInput: { width: '100%', padding: '12px', paddingRight: '60px', borderRadius: '10px', border: '1px solid #e1e1e1', boxSizing: 'border-box', fontSize: '15px', outlineColor: '#055bb1', color: '#000' },
    eyeBtn: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#055bb1', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', padding: '4px' },
    btn: { width: '100%', padding: '14px', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' },
    btnLink: { background: 'none', border: 'none', color: '#055bb1', fontSize: '12px', cursor: 'pointer' },
    btnLinkBold: { background: 'none', border: 'none', color: '#055bb1', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }
};