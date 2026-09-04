// app/admin/financeiro/_tabsGestaoFinanceiro/tabPagamentos.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

export function TabPagamentos({ uid }: { uid: string }) {
    const { theme } = useTheme();
    const [pagamentos, setPagamentos] = useState<any[]>([]);
    const [modalAberto, setModalAberto] = useState(false);

    const [descricao, setDescricao] = useState("");
    const [valor, setValor] = useState("");
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
        setValor("");
        setVencimento("");
        setStatus("pendente");
        setModalAberto(false);
    };

    const salvarPagamento = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uid || !descricao.trim() || !valor) return;

        const valNum = parseFloat(valor.replace(",", ".")) || 0;

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

    const excluirPagamento = async (id: string) => {
        if (!confirm("Deseja excluir este registro de pagamento?")) return;
        await deleteDoc(doc(db, "lojistas", uid, "pagamentos_financeiro", id));
    };

    return (
        <div style={{ padding: '0px', fontFamily: 'system-ui, sans-serif', backgroundColor: theme.bgApp, color: theme.textMain, minHeight: '100vh', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 800 }}>💳 Contas a Pagar & Pagamentos</h2>
                    <p style={{ fontSize: '12px', color: theme.textSec, margin: '2px 0 0 0' }}>Controle despesas operacionais, contas fixas e boletos.</p>
                </div>
                <button 
                    onClick={() => { limparFormulario(); setModalAberto(true); }}
                    style={{ backgroundColor: theme.primary, color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <FiPlus size={16} /> Novo Pagamento
                </button>
            </div>

            <div style={{ background: theme.bgCard, borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: theme.bgApp, borderBottom: `1px solid ${theme.border}`, color: theme.textSec }}>
                            <th style={{ padding: '12px 16px' }}>Descrição</th>
                            <th style={{ padding: '12px 16px' }}>Vencimento</th>
                            <th style={{ padding: '12px 16px' }}>Valor</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagamentos.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>
                                    Nenhum pagamento cadastrado. 💳
                                </td>
                            </tr>
                        ) : (
                            pagamentos.map((item) => (
                                <tr key={item.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{item.descricao}</td>
                                    <td style={{ padding: '12px 16px', color: theme.textSec }}>{item.vencimento}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#ef4444' }}>
                                        R$ {Number(item.valor).toFixed(2).replace('.', ',')}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: item.status === 'pago' ? '#dcfce7' : '#fee2e2', color: item.status === 'pago' ? '#166534' : '#991b1b' }}>
                                            {item.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <button onClick={() => excluirPagamento(item.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}>
                                            <FiTrash2 size={12} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {modalAberto && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '15px' }}>
                    <div style={{ background: theme.bgCard, padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: `1px solid ${theme.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 800 }}>💳 Novo Pagamento</h3>
                            <button onClick={limparFormulario} style={{ background: 'transparent', border: 'none', color: theme.textSec, cursor: 'pointer' }}><FiX size={20} /></button>
                        </div>
                        <form onSubmit={salvarPagamento} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input type="text" placeholder="Descrição (ex: Aluguel, Conta de Luz)" value={descricao} onChange={e => setDescricao(e.target.value)} required style={{ padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px' }} />
                            <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} required style={{ padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px' }} />
                            <input type="text" placeholder="Valor (R$)" value={valor} onChange={e => setValor(e.target.value)} required style={{ padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px' }} />
                            <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px' }}>
                                <option value="pendente">Pendente</option>
                                <option value="pago">Pago</option>
                            </select>
                            <button type="submit" style={{ background: theme.primary, color: '#fff', border: 'none', padding: '9px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Salvar Pagamento</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}