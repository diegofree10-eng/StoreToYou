"use client";

import { useState, FormEvent } from "react";
import { auth, db } from "@/lib/firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

const PALAVRAS_PROIBIDAS = ["admin", "master", "suporte", "root", "config", "sistema", "teste"];

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [showPassword, setShowPassword] = useState(false); // 👈 1. Estado para controlar a visibilidade da senha
    const [nomeLoja, setNomeLoja] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAuth = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                const userCredential = await signInWithEmailAndPassword(auth, email, senha);
                const lojaRef = doc(db, "lojistas", userCredential.user.uid);
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

                const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
                const user = userCredential.user;
                const slugGerado = nomeLimpo.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]/g, "-")
                    .replace(/-+/g, "-");

                await setDoc(doc(db, "usuarios", user.uid), {
                    lojaId: user.uid,
                    email: email,
                    role: email === "diegofree10@gmail.com" ? "master" : "admin",
                    criadoEm: Date.now()
                }, { merge: true });

                await setDoc(doc(db, "lojistas", user.uid), {
                    uid: user.uid,
                    email: email,
                    dataCadastro: Date.now(),
                    ultimoLogin: serverTimestamp(),
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

                await addDoc(collection(db, "lojistas", user.uid, "categorias"), { nome: "Geral" });

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
                        src="/logo.png"
                        alt="Logo Store ToYou"
                        style={{ height: '90px', width: 'auto', borderRadius: '8px' }}
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

                    {/* 👈 2. CAMPO DE SENHA MODIFICADO COM O BOTÃO DE VISIBILIDADE */}
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
                        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                            <button type="button" onClick={handleRecuperarSenha} style={styles.btnLink}>Esqueceu a senha?</button>
                        </div>
                    )}

                    <button type="submit" disabled={loading} style={{ ...styles.btn, background: loading ? '#cbd5e1' : '#055bb1' }}>
                        {loading ? "Processando..." : (isLogin ? "Entrar" : "Criar Loja")}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '25px' }}>
                        <button type="button" onClick={() => setIsLogin(!isLogin)} style={styles.btnLinkBold}>
                            {isLogin ? "Cadastre-se grátis" : "Já tenho conta"}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
        @media (max-width: 850px) {
          .auth-wrapper { flex-direction: column !important; overflow-y: auto !important; }
          .auth-banner { flex: 0 0 auto !important; width: 100% !important; padding: 40px 20px !important; }
          .auth-area { padding-top: 20px !important; width: 100% !important; }
          .auth-card { padding: 30px 20px !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; }
          .banner-subtitle { display: none; }
        }
      `}</style>
        </div>
    );
}

const styles: any = {
    container: { display: 'flex', height: '100vh', width: '100vw', background: '#f0f2f5', overflow: 'hidden' },
    banner: { flex: '0 0 40%', background: '#055bb1', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden' },
    logoCircle: { width: '60px', height: '60px', background: '#fdb813', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#055bb1', fontWeight: 'bold', fontSize: '28px', marginBottom: '20px', zIndex: 2 },
    bannerTitle: { margin: 0, fontSize: '28px', fontWeight: 'bold', zIndex: 2 },
    bannerSubtitle: { fontSize: '16px', color: '#e2e8f0', marginTop: '10px', maxWidth: '300px', zIndex: 2 },
    bannerDecoration: { position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', zIndex: 1 },
    loginArea: { flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
    card: { background: '#fff', padding: '45px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
    header: { textAlign: 'center', marginBottom: '35px' },
    titleText: { margin: 0, fontSize: '24px', color: '#1a1a1a' },
    subtitleText: { fontSize: '14px', color: '#64748b', marginTop: '5px' },
    inputGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#333' },
    input: { width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e1e1e1', boxSizing: 'border-box', fontSize: '16px', outlineColor: '#055bb1', color: '#000' },
    // 👈 3. NOVOS ESTILOS PARA O CONTAINER E BOTÃO DO CAMPO DE SENHA
    passwordContainer: { display: 'flex', alignItems: 'center', position: 'relative', width: '100%' },
    passwordInput: { width: '100%', padding: '14px', paddingRight: '60px', borderRadius: '10px', border: '1px solid #e1e1e1', boxSizing: 'border-box', fontSize: '16px', outlineColor: '#055bb1', color: '#000' },
    eyeBtn: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#055bb1', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', padding: '4px' },
    btn: { width: '100%', padding: '16px', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
    btnLink: { background: 'none', border: 'none', color: '#055bb1', fontSize: '13px', cursor: 'pointer' },
    btnLinkBold: { background: 'none', border: 'none', color: '#055bb1', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }
};