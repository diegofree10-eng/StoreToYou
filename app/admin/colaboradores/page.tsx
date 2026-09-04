// app/admin/colaboradores/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme, PALETA_LIGHT } from '@/context/ThemeContext';
import { UserPlus, Trash2, Users, Shield, Lock, CheckSquare, Square, Mail, Edit3, X, Eye, EyeOff } from 'lucide-react';
import { getPlanoEfetivo } from '@/utils/planoAtivo';

export default function PaginaColaboradores() {
    const themeContext = useTheme();
    const theme = themeContext ? themeContext.theme : PALETA_LIGHT;
    const isModoNoturno = themeContext ? themeContext.isModoNoturno : false;

    const [lojistaId, setLojistaId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [carregandoAcao, setCarregandoAcao] = useState(false);
    const [colaboradores, setColaboradores] = useState<any[]>([]);
    const [permitidoNoPlano, setPermitidoNoPlano] = useState<boolean | null>(null);

    // Estados do formulário de cadastro
    const [dsNomeColaborador, setDsNomeColaborador] = useState('');
    const [dsEmailColaborador, setDsEmailColaborador] = useState('');
    const [nrSenhaColaborador, setNrSenhaColaborador] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [nrPinColaborador, setNrPinColaborador] = useState('');
    const [mostrarPin, setMostrarPin] = useState(false);
    const [dsCargoColaborador, setDsCargoColaborador] = useState('Caixa / Operador');
    const [dsTelefoneColaborador, setDsTelefoneColaborador] = useState('');

    const [permissoes, setPermissoes] = useState({
        dash: false,
        produtos: false,
        pedidos: false,
        pdv: false,
        estoque: false,
        config: false
    });

    // Estados do Modal de Edição Completa
    const [colaboradorEditando, setColaboradorEditando] = useState<any>(null);
    const [editNome, setEditNome] = useState('');
    const [editCargo, setEditCargo] = useState('Caixa / Operador');
    const [editTelefone, setEditTelefone] = useState('');
    const [editPin, setEditPin] = useState('');
    const [mostrarEditPin, setMostrarEditPin] = useState(false);
    const [editNovaSenha, setEditNovaSenha] = useState('');
    const [mostrarEditSenha, setMostrarEditSenha] = useState(false);
    const [editPermissoes, setEditPermissoes] = useState({
        dash: false,
        produtos: false,
        pedidos: true,
        pdv: true,
        estoque: false,
        config: false
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const userSnap = await getDoc(doc(db, "usuarios", user.uid));
                if (userSnap.exists()) {
                    const idLoja = userSnap.data().dsLojaId || userSnap.data().lojaId;
                    setLojistaId(idLoja);

                    if (idLoja) {
                        const [lojaSnap, planosSnap] = await Promise.all([
                            getDoc(doc(db, "lojistas", idLoja)),
                            getDoc(doc(db, "configuracoes", "planos"))
                        ]);

                        if (lojaSnap.exists()) {
                            const dadosLoja = lojaSnap.data();
                            const planosConfig = planosSnap.exists() ? planosSnap.data() : null;

                            if (planosConfig) {
                                const planoEfetivo = getPlanoEfetivo(dadosLoja, planosConfig);
                                const liberado = Boolean(
                                    (planoEfetivo as any)?.colaboradores ??
                                    (planoEfetivo as any)?.configs?.colaboradores ??
                                    (planoEfetivo as any)?.dadosPlano?.colaboradores ??
                                    false
                                );
                                setPermitidoNoPlano(liberado);
                            } else {
                                setPermitidoNoPlano(false);
                            }
                        }

                        await carregarColaboradores(idLoja);
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleNomeChange = (val: string) => {
        setDsNomeColaborador(val);
        const formatado = val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
        setDsEmailColaborador(formatado);
    };

    const carregarColaboradores = async (idLoja: string) => {
        try {
            const ref = collection(db, "lojistas", idLoja, "colaboradores");
            const snapshot = await getDocs(ref);
            const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setColaboradores(lista);
        } catch (e) {
            console.error("Erro ao carregar lista:", e);
        }
    };

    const handleTogglePermissao = (key: string) => {
        setPermissoes(prev => ({ ...prev, [key]: !((prev as any)[key]) }));
    };

    const handleToggleEditPermissao = (key: string) => {
        setEditPermissoes(prev => ({ ...prev, [key]: !((prev as any)[key]) }));
    };

    const handleCadastrarColaborador = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lojistaId) return alert("Loja não identificada.");
        if (!dsNomeColaborador.trim()) return alert("Digite o nome do colaborador.");
        if (!dsEmailColaborador.trim()) return alert("Defina o e-mail de acesso.");
        if (!nrSenhaColaborador.trim()) return alert("Preencha a senha de acesso.");
        if (nrSenhaColaborador.length < 6) return alert("A senha deve ter no mínimo 6 caracteres.");

        const emailFinal = `${dsEmailColaborador.trim().toLowerCase()}@storetoyou.com.br`;

        setCarregandoAcao(true);
        try {
            const response = await fetch('/api/colaboradores/criar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lojistaId: lojistaId,
                    email: emailFinal,
                    senha: nrSenhaColaborador.trim(),
                    nome: dsNomeColaborador.trim(),
                    cargo: dsCargoColaborador,
                    telefone: dsTelefoneColaborador.trim(),
                    pin: nrPinColaborador.trim() || "0000",
                    permissoes: permissoes
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Erro ao cadastrar colaborador.");
            }

            alert(`✅ Colaborador cadastrado com sucesso!\nLogin: ${emailFinal}`);

            setDsNomeColaborador('');
            setDsEmailColaborador('');
            setNrSenhaColaborador('');
            setNrPinColaborador('');
            setDsTelefoneColaborador('');
            setDsCargoColaborador('Caixa / Operador');
            setPermissoes({ dash: false, produtos: false, pedidos: true, pdv: true, estoque: false, config: false });

            await carregarColaboradores(lojistaId);
        } catch (error: any) {
            alert("Erro ao cadastrar: " + error.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    const handleSalvarEdicaoCompleta = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lojistaId || !colaboradorEditando) return;

        setCarregandoAcao(true);
        try {
            const uidAuthFinal = colaboradorEditando.dsUidAuth || colaboradorEditando.uid || colaboradorEditando.id;

            const response = await fetch('/api/colaboradores/atualizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lojistaId: lojistaId,
                    colaboradorId: colaboradorEditando.id,
                    uid: uidAuthFinal,
                    nome: editNome.trim(),
                    cargo: editCargo,
                    telefone: editTelefone.trim(),
                    pin: editPin.trim() || "0000",
                    novaSenha: editNovaSenha.trim() || undefined,
                    permissoes: editPermissoes
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Erro ao atualizar dados.");
            }

            alert("✅ Dados atualizados com sucesso!");
            setColaboradorEditando(null);
            setEditNovaSenha('');
            await carregarColaboradores(lojistaId);
        } catch (error: any) {
            alert("Erro ao atualizar: " + error.message);
        } finally {
            setCarregandoAcao(false);
        }
    };

    const handleExcluirColaborador = async (id: string, uidAuth?: string) => {
        if (!lojistaId) return;
        if (!confirm("⚠️ Deseja realmente excluir este colaborador? O acesso dele será revogado.")) return;

        try {
            await deleteDoc(doc(db, "lojistas", lojistaId, "colaboradores", id));
            if (uidAuth) {
                await deleteDoc(doc(db, "usuarios", uidAuth));
            }
            setColaboradores(prev => prev.filter(col => col.id !== id));
            alert("✅ Colaborador removido com sucesso!");
        } catch (error: any) {
            alert("Erro ao excluir: " + error.message);
        }
    };

    if (loading) {
        return <div style={{ padding: "40px", textAlign: "center", color: theme.textSec, fontWeight: "600" }}>Carregando...</div>;
    }

    if (permitidoNoPlano === false) {
        return (
            <div style={{ maxWidth: "600px", margin: "60px auto", padding: "30px", background: theme.bgCard, borderRadius: "16px", border: `1px solid ${theme.border}`, textAlign: "center" }}>
                <Lock size={28} color="#ef4444" />
                <h2 style={{ margin: "10px 0", fontSize: "20px" }}>Recurso Indisponível no seu Plano</h2>
                <a href="/admin/config" style={{ color: theme.primary, fontWeight: "bold" }}>Fazer Upgrade</a>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "1100px", margin: "20px auto", padding: "0 16px", fontFamily: "sans-serif", color: theme.textMain }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <Users size={28} color={theme.primary} />
                <div>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800" }}>Colaboradores & Contas Internas</h2>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: theme.textSec }}>Gerencie os acessos, cargos e permissões da sua equipe.</p>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr", gap: "20px" }} className="grid-colaboradores">
                
                {/* FORMULÁRIO DE CADASTRO */}
                <div style={{ background: theme.bgCard, padding: "20px", borderRadius: "12px", border: `1px solid ${theme.border}`, height: "fit-content" }}>
                    <h3 style={{ margin: "0 0 15px 0", fontSize: "15px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                        <UserPlus size={18} color={theme.primary} /> Novo Colaborador
                    </h3>

                    <form onSubmit={handleCadastrarColaborador} style={{ display: "flex", flexDirection: "column", gap: "12px" }} autoComplete="off">
                        <div>
                            <label style={{ fontSize: "11px", fontWeight: "bold", color: theme.textSec, display: "block", marginBottom: "4px" }}>Nome Colaborador *</label>
                            <input
                                type="text"
                                placeholder="Ex: Vida"
                                value={dsNomeColaborador}
                                onChange={(e) => handleNomeChange(e.target.value)}
                                style={{ width: "100%", padding: "9px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: "11px", fontWeight: "bold", color: theme.textSec, display: "block", marginBottom: "4px" }}>Email Colaborador *</label>
                            <div style={{ display: "flex", alignItems: "center", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: "8px", overflow: "hidden" }}>
                                <input
                                    type="text"
                                    placeholder="ex: vida"
                                    value={dsEmailColaborador}
                                    onChange={(e) => setDsEmailColaborador(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                                    style={{ flex: 1, padding: "9px", border: "none", background: "transparent", color: theme.textMain, fontSize: "13px", outline: "none" }}
                                />
                                <span style={{ padding: "0 10px", fontSize: "12px", color: theme.textSec, background: theme.border + "33", borderLeft: `1px solid ${theme.border}`, height: "100%", display: "flex", alignItems: "center", fontWeight: "500" }}>
                                    @storetoyou.com.br
                                </span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: "11px", fontWeight: "bold", color: theme.textSec, display: "block", marginBottom: "4px" }}>Senha Colaborador (mín 6) *</label>
                            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <input
                                    type={mostrarSenha ? "text" : "password"}
                                    placeholder="******"
                                    autoComplete="new-password"
                                    value={nrSenhaColaborador}
                                    onChange={(e) => setNrSenhaColaborador(e.target.value)}
                                    style={{ width: "100%", padding: "9px", paddingRight: "36px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarSenha(!mostrarSenha)}
                                    style={{ position: "absolute", right: "8px", background: "none", border: "none", cursor: "pointer", color: theme.textSec, display: "flex", alignItems: "center" }}
                                    title={mostrarSenha ? "Ocultar senha" : "Ver senha"}
                                >
                                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
                            <div>
                                <label style={{ fontSize: "11px", fontWeight: "bold", color: theme.textSec, display: "block", marginBottom: "4px" }}>Cargo Colaborador</label>
                                <select
                                    value={dsCargoColaborador}
                                    onChange={(e) => setDsCargoColaborador(e.target.value)}
                                    style={{ width: "100%", padding: "9px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: "13px", outline: "none" }}
                                >
                                    <option value="Caixa / Operador">Caixa / Operador</option>
                                    <option value="Vendedor(a)">Vendedor(a)</option>
                                    <option value="Gerente">Gerente</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: "11px", fontWeight: "bold", color: theme.textSec, display: "block", marginBottom: "4px" }}>Pin Colaborador</label>
                                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                    <input
                                        type={mostrarPin ? "text" : "password"}
                                        maxLength={4}
                                        placeholder="1234"
                                        autoComplete="new-password"
                                        value={nrPinColaborador}
                                        onChange={(e) => setNrPinColaborador(e.target.value.replace(/\D/g, ""))}
                                        style={{ width: "100%", padding: "9px", paddingRight: "32px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: "13px", outline: "none", textAlign: "center", fontWeight: "bold", letterSpacing: "2px", boxSizing: "border-box" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setMostrarPin(!mostrarPin)}
                                        style={{ position: "absolute", right: "6px", background: "none", border: "none", cursor: "pointer", color: theme.textSec, display: "flex", alignItems: "center" }}
                                        title={mostrarPin ? "Ocultar PIN" : "Ver PIN"}
                                    >
                                        {mostrarPin ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* PERMISSÕES */}
                        <div style={{ padding: "12px", background: theme.inputBg, borderRadius: "8px", border: `1px solid ${theme.border}` }}>
                            <label style={{ fontSize: "12px", fontWeight: "bold", color: theme.textMain, display: "block", marginBottom: "8px" }}>Permissões de Telas:</label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                {[
                                    { key: 'pdv', label: 'PDV (Caixa)' },
                                    { key: 'pedidos', label: 'Pedidos' },
                                    { key: 'produtos', label: 'Produtos' },
                                    { key: 'estoque', label: 'Estoque' },
                                    { key: 'dash', label: 'Dashboard' },
                                    { key: 'config', label: 'Configurações' },
                                ].map(p => {
                                    const ativo = (permissoes as any)[p.key];
                                    return (
                                        <div key={p.key} onClick={() => handleTogglePermissao(p.key)} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: theme.textMain, fontWeight: "600" }}>
                                            {ativo ? <CheckSquare size={16} color={theme.primary} /> : <Square size={16} color={theme.textSec} />}
                                            <span>{p.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={carregandoAcao}
                            style={{ width: "100%", padding: "11px", background: theme.primary, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}
                        >
                            {carregandoAcao ? "Cadastrando..." : "Cadastrar Colaborador"}
                        </button>
                    </form>
                </div>

                {/* LISTAGEM */}
                <div style={{ background: theme.bgCard, padding: "20px", borderRadius: "12px", border: `1px solid ${theme.border}` }}>
                    <h3 style={{ margin: "0 0 15px 0", fontSize: "15px", fontWeight: "bold" }}>Equipe Cadastrada ({colaboradores.length})</h3>

                    {colaboradores.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 0", color: theme.textSec, fontSize: "13px" }}>Nenhum colaborador cadastrado.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "480px", overflowY: "auto" }}>
                            {colaboradores.map((col) => {
                                const nomeExibicao = col.dsNomeColaborador || col.nome;
                                const emailExibicao = col.dsEmailColaborador || col.email;
                                const cargoExibicao = col.dsCargoColaborador || col.cargo;
                                const pinExibicao = col.nrPinColaborador || col.pin || "0000";

                                return (
                                    <div key={col.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: theme.inputBg, borderRadius: "8px", border: `1px solid ${theme.border}` }}>
                                        <div>
                                            <div style={{ fontWeight: "bold", fontSize: "14px", color: theme.textMain }}>{nomeExibicao}</div>
                                            <div style={{ fontSize: "11px", color: theme.textSec, display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                                                <Mail size={12} /> {emailExibicao}
                                            </div>
                                            <div style={{ fontSize: "11px", color: theme.textSec, marginTop: "2px" }}>
                                                PIN: <strong>{pinExibicao}</strong> | <Shield size={11} color={theme.primary} /> {cargoExibicao}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setColaboradorEditando(col);
                                                    setEditNome(nomeExibicao);
                                                    setEditCargo(cargoExibicao || "Caixa / Operador");
                                                    setEditTelefone(col.dsTelefoneColaborador || col.telefone || "");
                                                    setEditPin(pinExibicao);
                                                    setEditNovaSenha("");
                                                    setEditPermissoes(col.permissoes || { dash: false, produtos: false, pedidos: true, pdv: true, estoque: false, config: false });
                                                    setMostrarEditPin(false);
                                                    setMostrarEditSenha(false);
                                                }}
                                                style={{ background: "transparent", border: `1px solid ${theme.border}`, cursor: "pointer", color: theme.primary, padding: "6px", borderRadius: "6px" }}
                                                title="Editar dados completos, senha e PIN"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleExcluirColaborador(col.id, col.dsUidAuth || col.uid)}
                                                style={{ background: "transparent", border: `1px solid ${theme.border}`, cursor: "pointer", color: "#ef4444", padding: "6px", borderRadius: "6px" }}
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>

            {/* MODAL DE EDIÇÃO COMPLETA */}
            {colaboradorEditando && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, overflowY: "auto", padding: "20px" }}>
                    <div style={{ background: theme.bgCard, padding: "24px", borderRadius: "12px", width: "420px", maxWidth: "100%", border: `1px solid ${theme.border}`, color: theme.textMain, maxHeight: "90vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>Editar Colaborador</h3>
                            <button onClick={() => setColaboradorEditando(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSec }}><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSalvarEdicaoCompleta} style={{ display: "flex", flexDirection: "column", gap: "12px" }} autoComplete="off">
                            <div>
                                <label style={{ fontSize: "11px", fontWeight: "bold", color: theme.textSec, display: "block", marginBottom: "4px" }}>Nome</label>
                                <input
                                    type="text"
                                    value={editNome}
                                    onChange={(e) => setEditNome(e.target.value)}
                                    style={{ width: "100%", padding: "9px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
                                <div>
                                    <label style={{ fontSize: "11px", fontWeight: "bold", color: theme.textSec, display: "block", marginBottom: "4px" }}>Cargo</label>
                                    <select
                                        value={editCargo}
                                        onChange={(e) => setEditCargo(e.target.value)}
                                        style={{ width: "100%", padding: "9px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: "13px", outline: "none" }}
                                    >
                                        <option value="Caixa / Operador">Caixa / Operador</option>
                                        <option value="Vendedor(a)">Vendedor(a)</option>
                                        <option value="Gerente">Gerente</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: "11px", fontWeight: "bold", color: theme.textSec, display: "block", marginBottom: "4px" }}>PIN (4 dígitos)</label>
                                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                        <input
                                            type={mostrarEditPin ? "text" : "password"}
                                            maxLength={4}
                                            value={editPin}
                                            onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ""))}
                                            style={{ width: "100%", padding: "9px", paddingRight: "32px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: "13px", textAlign: "center", fontWeight: "bold", letterSpacing: "2px", boxSizing: "border-box" }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setMostrarEditPin(!mostrarEditPin)}
                                            style={{ position: "absolute", right: "6px", background: "none", border: "none", cursor: "pointer", color: theme.textSec, display: "flex", alignItems: "center" }}
                                            title={mostrarEditPin ? "Ocultar PIN" : "Ver PIN"}
                                        >
                                            {mostrarEditPin ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: "11px", fontWeight: "bold", color: theme.textSec, display: "block", marginBottom: "4px" }}>Nova Senha (deixe em branco para não alterar)</label>
                                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                    <input
                                        type={mostrarEditSenha ? "text" : "password"}
                                        placeholder="Mínimo 6 caracteres"
                                        autoComplete="new-password"
                                        value={editNovaSenha}
                                        onChange={(e) => setEditNovaSenha(e.target.value)}
                                        style={{ width: "100%", padding: "9px", paddingRight: "36px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: "13px", boxSizing: "border-box" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setMostrarEditSenha(!mostrarEditSenha)}
                                        style={{ position: "absolute", right: "8px", background: "none", border: "none", cursor: "pointer", color: theme.textSec, display: "flex", alignItems: "center" }}
                                        title={mostrarEditSenha ? "Ocultar senha" : "Ver senha"}
                                    >
                                        {mostrarEditSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* PERMISSÕES NO MODAL */}
                            <div style={{ padding: "12px", background: theme.inputBg, borderRadius: "8px", border: `1px solid ${theme.border}` }}>
                                <label style={{ fontSize: "12px", fontWeight: "bold", color: theme.textMain, display: "block", marginBottom: "8px" }}>Permissões de Telas:</label>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                    {[
                                        { key: 'pdv', label: 'PDV (Caixa)' },
                                        { key: 'pedidos', label: 'Pedidos' },
                                        { key: 'produtos', label: 'Produtos' },
                                        { key: 'estoque', label: 'Estoque' },
                                        { key: 'dash', label: 'Dashboard' },
                                        { key: 'config', label: 'Configurações' },
                                    ].map(p => {
                                        const ativo = (editPermissoes as any)[p.key];
                                        return (
                                            <div key={p.key} onClick={() => handleToggleEditPermissao(p.key)} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: theme.textMain, fontWeight: "600" }}>
                                                {ativo ? <CheckSquare size={16} color={theme.primary} /> : <Square size={16} color={theme.textSec} />}
                                                <span>{p.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={carregandoAcao}
                                style={{ width: "100%", padding: "11px", background: theme.primary, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginTop: "10px", fontSize: "13px" }}
                            >
                                {carregandoAcao ? "Salvando..." : "Salvar Alterações"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}