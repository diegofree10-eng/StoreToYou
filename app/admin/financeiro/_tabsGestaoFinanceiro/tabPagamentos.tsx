// app/admin/financeiro/_tabsGestaoFinanceiro/tabPagamentos.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { FiPlus, FiTrash2, FiX, FiCheckCircle, FiClock, FiDollarSign } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import { aplicarMascara } from "@/utils/formatters";

export function TabPagamentos({ uid }: { uid: string }) {
    const { theme } = useTheme();
    const [pagamentos, setPagamentos] = useState<any[]>([]);
    const [modalAberto, setModalAberto] = useState(false);

    const [descricao, setDescricao] = useState("");
    const [valorTemp, setValorTemp] = useState("");
    const [vencimento, setVencimento] = useState("");
    const [status, setStatus] = useState("pendente");

    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, "lojistas", uid, "pagamentos_financeiro"), orderBy("vencimento", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            setPagamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [uid]);

    const limparFormulario = () => {
        setDescricao("");
        setValorTemp("");
        setVencimento("");
        setStatus("pendente");
        setModalAberto(false);
    };

    const converterParaNumeroPuro = (valorFormatado: string): number => {
        if (!valorFormatado) return 0;
        const limpo = valorFormatado.replace(/\./g, "").replace(",", ".");
        const num = parseFloat(limpo);
        return isNaN(num) ? 0 : num;
    };

    const salvarPagamento = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uid || !descricao.trim() || !valorTemp) return;

        const valNum = converterParaNumeroPuro(valorTemp);

        try {
            const novoDoc = doc(collection(db, "lojistas", uid, "pagamentos_financeiro"));
            await setDoc(novoDoc, {
                descricao: descricao.trim(),
                valor: valNum,
                vencimento: vencimento || new Date().toISOString().split('T')[0],
                status,
                createdAt: new Date().toISOString()
            });
            limparFormulario();
        } catch (error: any) {
            alert("Erro ao salvar pagamento: " + error.message);
        }
    };

    const alternarStatusPagamento = async (id: string, statusAtual: string) => {
        const novoStatus = statusAtual === 'pago' ? 'pendente' : 'pago';
        try {
            const pagamentoRef = doc(db, "lojistas", uid, "pagamentos_financeiro", id);
            await updateDoc(pagamentoRef, { status: novoStatus });
        } catch (error: any) {
            alert("Erro ao atualizar status do pagamento: " + error.message);
        }
    };

    const excluirPagamento = async (id: string) => {
        if (!confirm("Deseja excluir este registro de pagamento?")) return;
        try {
            await deleteDoc(doc(db, "lojistas", uid, "pagamentos_financeiro", id));
        } catch (error: any) {
            alert("Erro ao excluir pagamento: " + error.message);
        }
    };

    return (
        <div translate="no" style={{ padding: '0px', fontFamily: 'system-ui, sans-serif', backgroundColor: theme.bgApp, color: theme.textMain, minHeight: '100vh', boxSizing: 'border-box' }}>
            
            {/* Cabeçalho */}
            <div style={{ background: theme.bgApp, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 800 }}>💳 Contas a Pagar & Pagamentos</h2>
                        <p style={{ fontSize: '12px', color: theme.textSec, margin: '4px 0 0 0' }}>Controle despesas operacionais, contas fixas e boletos gerados automaticamente ou manualmente.</p>
                    </div>
                    <button 
                        onClick={() => { limparFormulario(); setModalAberto(true); }}
                        style={{ backgroundColor: theme.primary, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                    >
                        <FiPlus size={16} /> Novo Pagamento
                    </button>
                </div>
            </div>

            {/* Container da Tabela de Pagamentos */}
            <div style={{ background: theme.bgApp, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: theme.bgCard, borderBottom: `1px solid ${theme.border}`, color: theme.textSec }}>
                                <th style={{ padding: '14px 16px', width: '35%' }}>Descrição</th>
                                <th style={{ padding: '14px 16px', width: '15%' }}>Vencimento</th>
                                <th style={{ padding: '14px 16px', width: '15%' }}>Valor</th>
                                <th style={{ padding: '14px 16px', width: '15%' }}>Status</th>
                                <th style={{ padding: '14px 16px', width: '20%', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagamentos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '50px', color: theme.textSec }}>
                                        Nenhum pagamento cadastrado. 💳
                                    </td>
                                </tr>
                            ) : (
                                pagamentos.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s' }}>
                                        <td style={{ padding: '14px 16px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.descricao}
                                        </td>
                                        <td style={{ padding: '14px 16px', color: theme.textSec, whiteSpace: 'nowrap' }}>
                                            {item.vencimento ? new Date(item.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#ef4444', whiteSpace: 'nowrap' }}>
                                            R$ {Number(item.valor).toFixed(2).replace('.', ',')}
                                        </td>
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                            <span style={{ display: 'inline-block', width: '85px', textAlign: 'center', padding: '4px 0', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: item.status === 'pago' ? '#dcfce7' : '#fee2e2', color: item.status === 'pago' ? '#166534' : '#991b1b' }}>
                                                {item.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                                <button 
                                                    onClick={() => alternarStatusPagamento(item.id, item.status)} 
                                                    style={{ 
                                                        width: '115px', 
                                                        backgroundColor: item.status === 'pago' ? '#fef08a' : '#dcfce7', 
                                                        color: item.status === 'pago' ? '#854d0e' : '#166534', 
                                                        border: 'none', 
                                                        padding: '6px 0', 
                                                        borderRadius: '6px', 
                                                        cursor: 'pointer',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        textAlign: 'center',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {item.status === 'pago' ? 'Marcar Pendente' : 'Marcar Pago'}
                                                </button>

                                                <button 
                                                    onClick={() => excluirPagamento(item.id)} 
                                                    style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title="Excluir"
                                                >
                                                    <FiTrash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE PAGAMENTOS */}
            {modalAberto && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '15px', backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: theme.bgApp, color: theme.textMain, padding: '28px', borderRadius: '12px', width: '100%', maxWidth: '450px', border: `1px solid ${theme.border}`, boxSizing: 'border-box', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', margin: 0, fontWeight: 800 }}>💳 Novo Registro de Pagamento</h3>
                            <button onClick={limparFormulario} style={{ background: 'transparent', border: 'none', color: theme.textSec, cursor: 'pointer' }}><FiX size={22} /></button>
                        </div>

                        <form onSubmit={salvarPagamento} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Aluguel, Conta de Luz, Boleto..." 
                                    value={descricao} 
                                    onChange={e => setDescricao(e.target.value)} 
                                    required 
                                    style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }} 
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data de Vencimento</label>
                                    <input 
                                        type="date" 
                                        value={vencimento} 
                                        onChange={e => setVencimento(e.target.value)} 
                                        required 
                                        style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }} 
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor (R$)</label>
                                    <input 
                                        type="text" 
                                        placeholder="0,00" 
                                        value={valorTemp} 
                                        onChange={e => setValorTemp(aplicarMascara(e.target.value, "dinheiro"))} 
                                        required 
                                        style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }} 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Inicial</label>
                                <select 
                                    value={status} 
                                    onChange={e => setStatus(e.target.value)} 
                                    style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                >
                                    <option value="pendente">Pendente</option>
                                    <option value="pago">Pago</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={limparFormulario} style={{ background: 'transparent', color: theme.textSec, border: `1px solid ${theme.border}`, padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Salvar Pagamento</button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}