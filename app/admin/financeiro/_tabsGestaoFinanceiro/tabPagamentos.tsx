// app/admin/financeiro/_tabsGestaoFinanceiro/tabPagamentos.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { FiPlus, FiTrash2, FiCheck, FiClock, FiEdit3, FiX } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import { ModalRegistroDespesa } from "./ModalRegistroDespesa";
import { aplicarMascara } from "@/utils/formatters";

export function TabPagamentos({ uid, termoBusca = "", filtroStatus = "todos" }: { uid: string; termoBusca?: string; filtroStatus?: string }) {
    const { theme } = useTheme();
    const [pagamentos, setPagamentos] = useState<any[]>([]);
    const [modalAberto, setModalAberto] = useState(false);

    // Estados para o Modal de Edição / Baixa de Valor
    const [modalBaixaAberto, setModalBaixaAberto] = useState(false);
    const [itemParaBaixar, setItemParaBaixar] = useState<any | null>(null);
    const [valorBaixaTemp, setValorBaixaTemp] = useState("");

    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, "lojistas", uid, "pagamentos_financeiro"), orderBy("vencimento", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            setPagamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [uid]);

    const converterParaNumeroPuro = (valorFormatado: string): number => {
        if (!valorFormatado) return 0;
        const limpo = valorFormatado.replace(/\./g, "").replace(",", ".");
        const num = parseFloat(limpo);
        return isNaN(num) ? 0 : num;
    };

    // Abre o modal de baixa se for pagar, ou altera direto se for retornar para pendente
    const lidarComCliqueStatus = (item: any) => {
        if (item.status === 'pago') {
            // Se já está pago e quer voltar para pendente
            alternarStatusPagamentoDireto(item.id, 'pendente', item.descricao);
        } else {
            // Se está pendente e quer pagar, abre o modal para conferir/ajustar o valor real
            setItemParaBaixar(item);
            const centavos = Math.round((Number(item.valor) || 0) * 100).toString();
            setValorBaixaTemp(aplicarMascara(centavos, "dinheiro"));
            setModalBaixaAberto(true);
        }
    };

    const alternarStatusPagamentoDireto = async (id: string, novoStatus: string, descricao: string) => {
        const acaoTexto = novoStatus === 'pago' ? 'marcar esta conta como PAGA' : 'retornar esta conta para PENDENTE';
        const confirmar = window.confirm(`Deseja realmente ${acaoTexto}?\n\nConta: "${descricao}"`);
        if (!confirmar) return;

        try {
            const pagamentoRef = doc(db, "lojistas", uid, "pagamentos_financeiro", id);
            await updateDoc(pagamentoRef, { 
                status: novoStatus,
                dataPagamento: novoStatus === 'pago' ? new Date().toISOString() : null
            });
        } catch (error: any) {
            alert("Erro ao atualizar status do pagamento: " + error.message);
        }
    };

    const confirmarBaixaComValorReal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemParaBaixar) return;

        const valNum = converterParaNumeroPuro(valorBaixaTemp);
        if (valNum <= 0) {
            alert("Informe um valor válido para a baixa.");
            return;
        }

        try {
            const pagamentoRef = doc(db, "lojistas", uid, "pagamentos_financeiro", itemParaBaixar.id);
            await updateDoc(pagamentoRef, {
                status: 'pago',
                valor: valNum,
                dataPagamento: new Date().toISOString()
            });

            setModalBaixaAberto(false);
            setItemParaBaixar(null);
            setValorBaixaTemp("");
        } catch (error: any) {
            alert("Erro ao efetuar baixa do pagamento: " + error.message);
        }
    };

    const excluirPagamento = async (id: string, descricao: string) => {
        const confirmar = window.confirm(`ATENÇÃO: Deseja realmente excluir permanentemente este registro?\n\nConta: "${descricao}"`);
        if (!confirmar) return;

        try {
            await deleteDoc(doc(db, "lojistas", uid, "pagamentos_financeiro", id));
        } catch (error: any) {
            alert("Erro ao excluir pagamento: " + error.message);
        }
    };

    // Aplicação dos filtros globais (Busca + Status/Vencimentos)
    const pagamentosFiltrados = pagamentos.filter(item => {
        const textoBusca = termoBusca.toLowerCase();
        const matchTexto = 
            (item.descricao || "").toLowerCase().includes(textoBusca) ||
            (item.fornecedor || "").toLowerCase().includes(textoBusca) ||
            (item.numeroDespesa || "").toLowerCase().includes(textoBusca);

        const hojeStr = new Date().toISOString().split('T')[0];

        if (filtroStatus === 'vencidos') {
            return matchTexto && item.status === 'pendente' && item.vencimento < hojeStr;
        }
        if (filtroStatus === 'hoje') {
            return matchTexto && item.status === 'pendente' && item.vencimento === hojeStr;
        }
        if (filtroStatus === 'pendente') {
            return matchTexto && item.status === 'pendente';
        }
        if (filtroStatus === 'pago') {
            return matchTexto && item.status === 'pago';
        }
        return matchTexto;
    });

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
                        onClick={() => setModalAberto(true)}
                        style={{ backgroundColor: theme.primary, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                    >
                        <FiPlus size={16} /> Novo Pagamento / Despesa
                    </button>
                </div>
            </div>

            {/* Container da Tabela de Pagamentos */}
            <div style={{ background: theme.bgApp, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: theme.bgCard, borderBottom: `1px solid ${theme.border}`, color: theme.textSec }}>
                                <th style={{ padding: '14px 16px', width: '12%' }}>Nº / Pedido</th>
                                <th style={{ padding: '14px 16px', width: '38%' }}>Descrição</th>
                                <th style={{ padding: '14px 16px', width: '15%' }}>Vencimento</th>
                                <th style={{ padding: '14px 16px', width: '15%' }}>Valor</th>
                                <th style={{ padding: '10px 12px', width: '10%', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '10px 12px', width: '10%', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagamentosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: theme.textSec }}>
                                        Nenhum pagamento encontrado com os filtros atuais. 💳
                                    </td>
                                </tr>
                            ) : (
                                pagamentosFiltrados.map((item) => {
                                    const isPago = item.status === 'pago';
                                    const valorZerado = Number(item.valor || 0) === 0;
                                    return (
                                        <tr key={item.id} style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s' }}>
                                            <td style={{ padding: '14px 16px', fontWeight: 'bold', color: theme.primary, whiteSpace: 'nowrap' }}>
                                                {item.numeroDespesa ? `#${item.numeroDespesa}` : '----'}
                                            </td>
                                            <td style={{ padding: '14px 16px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.descricao}>
                                                {item.descricao}
                                                {valorZerado && !isPago && (
                                                    <span style={{ display: 'inline-block', marginLeft: '8px', fontSize: '10px', background: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                        Aguardando Valor
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 16px', color: theme.textSec, whiteSpace: 'nowrap' }}>
                                                {item.vencimento ? new Date(item.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                            </td>
                                            <td style={{ padding: '14px 16px', fontWeight: 'bold', color: valorZerado ? theme.textSec : '#ef4444', whiteSpace: 'nowrap' }}>
                                                R$ {Number(item.valor || 0).toFixed(2).replace('.', ',')}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <span style={{ display: 'inline-block', width: '80px', textAlign: 'center', padding: '4px 0', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: isPago ? '#dcfce7' : '#fee2e2', color: isPago ? '#166534' : '#991b1b' }}>
                                                    {isPago ? 'PAGO' : 'PENDENTE'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                    
                                                    {/* Botão de Pagar / Retornar Pendente */}
                                                    <button 
                                                        onClick={() => lidarComCliqueStatus(item)} 
                                                        style={{ 
                                                            backgroundColor: isPago ? '#fef08a' : '#dcfce7', 
                                                            color: isPago ? '#854d0e' : '#166534', 
                                                            border: 'none', 
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px', 
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                        }}
                                                        title={isPago ? "Marcar como Pendente" : valorZerado ? "Informar Valor Real e Pagar" : "Marcar como Pago"}
                                                    >
                                                        {isPago ? <FiClock size={15} /> : valorZerado ? <FiEdit3 size={15} /> : <FiCheck size={15} />}
                                                    </button>

                                                    {/* Botão de Excluir */}
                                                    <button 
                                                        onClick={() => excluirPagamento(item.id, item.descricao)} 
                                                        style={{ 
                                                            backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                                                            color: '#ef4444', 
                                                            border: 'none', 
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px', 
                                                            cursor: 'pointer', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center' 
                                                        }}
                                                        title="Excluir Lançamento"
                                                    >
                                                        <FiTrash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE BAIXA / CONFIRMAÇÃO DE VALOR REAL */}
            {modalBaixaAberto && itemParaBaixar && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '15px', backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: theme.bgApp, color: theme.textMain, padding: '28px', borderRadius: '12px', width: '100%', maxWidth: '420px', border: `1px solid ${theme.border}`, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 800 }}>💵 Confirmar Pagamento da Conta</h3>
                            <button onClick={() => setModalBaixaAberto(false)} style={{ background: 'transparent', border: 'none', color: theme.textSec, cursor: 'pointer' }}><FiX size={20} /></button>
                        </div>

                        <p style={{ fontSize: '13px', color: theme.textSec, margin: '0 0 16px 0' }}>
                            Conta: <strong style={{ color: theme.textMain }}>{itemParaBaixar.descricao}</strong><br />
                            Vencimento: {new Date(itemParaBaixar.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>

                        <form onSubmit={confirmarBaixaComValorReal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Valor Real Pago (R$)</label>
                                <input
                                    type="text"
                                    placeholder="0,00"
                                    value={valorBaixaTemp}
                                    onChange={(e) => setValorBaixaTemp(aplicarMascara(e.target.value, "dinheiro"))}
                                    required
                                    autoFocus
                                    style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' }}
                                />
                                <span style={{ fontSize: '11px', color: theme.textSec }}>
                                    Informe o valor exato que veio na fatura para registrar a baixa correta no financeiro.
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setModalBaixaAberto(false)} style={{ background: 'transparent', color: theme.textSec, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Confirmar Pagamento</button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

            {/* Modal de Novo Registro */}
            <ModalRegistroDespesa 
                uid={uid} 
                isOpen={modalAberto} 
                onClose={() => setModalAberto(false)} 
            />

        </div>
    );
}
// app/admin/financeiro/_tabsGestaoFinanceiro/tabPagamentos.tsx