// app/admin/financeiro/_tabsGestaoFinanceiro/ModalRegistroDespesa.tsx
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, query, orderBy, onSnapshot, runTransaction } from "firebase/firestore";
import { FiX, FiRepeat, FiLayers, FiDollarSign, FiHelpCircle } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import { aplicarMascara } from "@/utils/formatters";

export function ModalRegistroDespesa({ uid, isOpen, onClose }: { uid: string; isOpen: boolean; onClose: () => void }) {
    const { theme } = useTheme();
    const [tipoLancamento, setTipoLancamento] = useState<"avulsa" | "recorrente" | "parcelada">("avulsa");
    const [ajudaAbaAtiva, setAjudaAbaAtiva] = useState<string | null>(null);

    const [descricao, setDescricao] = useState("");
    const [fornecedor, setFornecedor] = useState("");
    const [naturezaDespesa, setNaturezaDespesa] = useState("operacional");
    const [numeroDocumento, setNumeroDocumento] = useState("");
    const [valorTemp, setValorTemp] = useState("");
    const [vencimento, setVencimento] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState("pendente");

    // Específico para parcelamento
    const [quantidadeParcelas, setQuantidadeParcelas] = useState("2");

    // Específico para recorrência fixa/variável por consumo
    const [diaVencimentoFixo, setDiaVencimentoFixo] = useState("10");

    const [modelosPadrao, setModelosPadrao] = useState<any[]>([]);

    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, "lojistas", uid, "config_despesas_fixas"), orderBy("nome", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            setModelosPadrao(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [uid]);

    const converterParaNumeroPuro = (valorFormatado: string): number => {
        if (!valorFormatado) return 0;
        const limpo = valorFormatado.replace(/\./g, "").replace(",", ".");
        const num = parseFloat(limpo);
        return isNaN(num) ? 0 : num;
    };

    const limparEFechar = () => {
        setDescricao("");
        setFornecedor("");
        setNaturezaDespesa("operacional");
        setNumeroDocumento("");
        setValorTemp("");
        setVencimento(new Date().toISOString().split('T')[0]);
        setStatus("pendente");
        setQuantidadeParcelas("2");
        setTipoLancamento("avulsa");
        setAjudaAbaAtiva(null);
        onClose();
    };

    const salvarDespesa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uid || !descricao.trim()) return;

        const valNum = tipoLancamento === "recorrente" ? converterParaNumeroPuro(valorTemp) : converterParaNumeroPuro(valorTemp);
        
        if (tipoLancamento !== "recorrente" && valNum <= 0) {
            alert("Informe um valor válido.");
            return;
        }

        const dataCriacaoIso = new Date().toISOString();

        try {
            const contadorRef = doc(db, "lojistas", uid, "configuracoes", "contador_despesas");
            let proximoNumero = 1;

            await runTransaction(db, async (transaction) => {
                const contadorDoc = await transaction.get(contadorRef);
                if (contadorDoc.exists()) {
                    proximoNumero = (contadorDoc.data().ultimaDespesa || 0) + 1;
                }
                transaction.set(contadorRef, { ultimaDespesa: proximoNumero }, { merge: true });
            });

            const numeroFormatado = String(proximoNumero).padStart(4, '0');

            // 🌟 Removido 'status' daqui para evitar duplicidade e conflitos ao espalhar
            const dadosComuns = {
                natureza: naturezaDespesa,
                nfDocumento: numeroDocumento.trim() || null,
                fornecedor: fornecedor.trim() || "Geral",
                createdAt: dataCriacaoIso
            };

            if (tipoLancamento === "avulsa") {
                const novoDoc = doc(collection(db, "lojistas", uid, "pagamentos_financeiro"));
                await setDoc(novoDoc, {
                    numeroDespesa: numeroFormatado,
                    descricao: descricao.trim(),
                    valor: valNum,
                    vencimento: vencimento,
                    status: status, // Definido de forma única aqui
                    tipo: "avulsa",
                    ...dadosComuns
                });

            } else if (tipoLancamento === "parcelada") {
                const totalParc = parseInt(quantidadeParcelas) || 1;
                const valorParcela = valNum / totalParc;
                const dataBase = new Date(vencimento + 'T00:00:00');

                for (let i = 1; i <= totalParc; i++) {
                    const dataParcela = new Date(dataBase);
                    dataParcela.setMonth(dataBase.getMonth() + (i - 1));
                    const dataVencIso = dataParcela.toISOString().split('T')[0];

                    const novoDoc = doc(collection(db, "lojistas", uid, "pagamentos_financeiro"));
                    await setDoc(novoDoc, {
                        numeroDespesa: `${numeroFormatado}-${i}`,
                        descricao: `${descricao.trim()} (${i}/${totalParc})`,
                        valor: Number(valorParcela.toFixed(2)),
                        vencimento: dataVencIso,
                        status: i === 1 ? status : "pendente", // Definido de forma única aqui
                        tipo: "parcelada",
                        parcelaAtual: i,
                        totalParcelas: totalParc,
                        ...dadosComuns
                    });
                }

            } else if (tipoLancamento === "recorrente") {
                const dia = parseInt(diaVencimentoFixo) || 10;
                const hoje = new Date();

                for (let i = 0; i < 12; i++) {
                    const dataRec = new Date(hoje.getFullYear(), hoje.getMonth() + i, dia);
                    const dataVencIso = dataRec.toISOString().split('T')[0];

                    const novoDoc = doc(collection(db, "lojistas", uid, "pagamentos_financeiro"));
                    await setDoc(novoDoc, {
                        numeroDespesa: `${numeroFormatado}-R${i+1}`,
                        descricao: `${descricao.trim()} (Mês ${dataRec.getMonth() + 1}/${dataRec.getFullYear()})`,
                        valor: i === 0 ? valNum : 0, 
                        vencimento: dataVencIso,
                        status: i === 0 ? status : "pendente", // Definido de forma única aqui
                        tipo: "recorrente",
                        ...dadosComuns
                    });
                }
            }

            limparEFechar();
        } catch (error: any) {
            alert("Erro ao registrar despesa: " + error.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '15px', backdropFilter: 'blur(2px)' }}>
            <div style={{ background: theme.bgApp, color: theme.textMain, padding: '28px', borderRadius: '12px', width: '100%', maxWidth: '520px', border: `1px solid ${theme.border}`, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', margin: 0, fontWeight: 800 }}>💳 Novo Lançamento Financeiro</h3>
                    <button onClick={limparEFechar} style={{ background: 'transparent', border: 'none', color: theme.textSec, cursor: 'pointer' }}><FiX size={22} /></button>
                </div>

                {/* Abas de Tipos de Lançamento */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '15px', background: theme.bgCard, padding: '4px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', background: tipoLancamento === 'avulsa' ? theme.primary : 'transparent', borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                            type="button"
                            onClick={() => { setTipoLancamento("avulsa"); setAjudaAbaAtiva(null); }}
                            style={{ flex: 1, background: 'transparent', color: tipoLancamento === 'avulsa' ? '#fff' : theme.textSec, border: 'none', padding: '8px 4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                            <FiDollarSign size={13} /> Avulsa
                        </button>
                        <button
                            type="button"
                            onClick={() => setAjudaAbaAtiva(ajudaAbaAtiva === 'avulsa' ? null : 'avulsa')}
                            style={{ background: 'transparent', border: 'none', color: tipoLancamento === 'avulsa' ? '#fff' : theme.textSec, padding: '0 6px', cursor: 'pointer', opacity: 0.8 }}
                        >
                            <FiHelpCircle size={13} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', background: tipoLancamento === 'parcelada' ? theme.primary : 'transparent', borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                            type="button"
                            onClick={() => { setTipoLancamento("parcelada"); setAjudaAbaAtiva(null); }}
                            style={{ flex: 1, background: 'transparent', color: tipoLancamento === 'parcelada' ? '#fff' : theme.textSec, border: 'none', padding: '8px 4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                            <FiLayers size={13} /> Parcelada
                        </button>
                        <button
                            type="button"
                            onClick={() => setAjudaAbaAtiva(ajudaAbaAtiva === 'parcelada' ? null : 'parcelada')}
                            style={{ background: 'transparent', border: 'none', color: tipoLancamento === 'parcelada' ? '#fff' : theme.textSec, padding: '0 6px', cursor: 'pointer', opacity: 0.8 }}
                        >
                            <FiHelpCircle size={13} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', background: tipoLancamento === 'recorrente' ? theme.primary : 'transparent', borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                            type="button"
                            onClick={() => { setTipoLancamento("recorrente"); setAjudaAbaAtiva(null); }}
                            style={{ flex: 1, background: 'transparent', color: tipoLancamento === 'recorrente' ? '#fff' : theme.textSec, border: 'none', padding: '8px 4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                            <FiRepeat size={13} /> Recorrente
                        </button>
                        <button
                            type="button"
                            onClick={() => setAjudaAbaAtiva(ajudaAbaAtiva === 'recorrente' ? null : 'recorrente')}
                            style={{ background: 'transparent', border: 'none', color: tipoLancamento === 'recorrente' ? '#fff' : theme.textSec, padding: '0 6px', cursor: 'pointer', opacity: 0.8 }}
                        >
                            <FiHelpCircle size={13} />
                        </button>
                    </div>

                </div>

                {ajudaAbaAtiva === 'avulsa' && (
                    <div style={{ background: theme.bgCard, border: `1px solid ${theme.primary}`, padding: '12px 14px', borderRadius: '8px', marginBottom: '15px', fontSize: '12px', color: theme.textSec, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong style={{ color: theme.textMain }}>💡 Despesa Avulsa:</strong>
                        <span>Utilize para contas de pagamento único e sem recorrência.</span>
                    </div>
                )}

                {ajudaAbaAtiva === 'parcelada' && (
                    <div style={{ background: theme.bgCard, border: `1px solid ${theme.primary}`, padding: '12px 14px', borderRadius: '8px', marginBottom: '15px', fontSize: '12px', color: theme.textSec, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong style={{ color: theme.textMain }}>💡 Compra Parcelada:</strong>
                        <span>Divide o valor informado igualmente nas parcelas mensais.</span>
                    </div>
                )}

                {ajudaAbaAtiva === 'recorrente' && (
                    <div style={{ background: theme.bgCard, border: `1px solid ${theme.primary}`, padding: '12px 14px', borderRadius: '8px', marginBottom: '15px', fontSize: '12px', color: theme.textSec, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong style={{ color: theme.textMain }}>💡 Conta Recorrente (Água, Luz, Internet):</strong>
                        <span>Gera a agenda para os próximos 12 meses. O primeiro mês pode receber uma estimativa e os demais meses podem ser criados zerados para que você preencha o valor exato quando a fatura chegar.</span>
                    </div>
                )}

                <form onSubmit={salvarDespesa} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Descrição da Conta</label>
                        <select
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                        >
                            <option value="">Selecione uma conta padrão ou digite abaixo...</option>
                            {modelosPadrao.map((m) => (
                                <option key={m.id} value={m.nome}>{m.nome}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Ou digite outra descrição (Ex: Conta de Energia)..."
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                            required
                            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Fornecedor / Concessionária</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Enel, Sabesp..." 
                                value={fornecedor}
                                onChange={e => setFornecedor(e.target.value)}
                                style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>NF / Nº Documento (Opcional)</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Instalação #123" 
                                value={numeroDocumento}
                                onChange={e => setNumeroDocumento(e.target.value)}
                                style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Natureza do Lançamento</label>
                        <select 
                            value={naturezaDespesa} 
                            onChange={e => setNaturezaDespesa(e.target.value)} 
                            style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                        >
                            <option value="operacional">Despesa Operacional Comum (Fixas / Variáveis)</option>
                            <option value="imobilizado">Investimento / Ativo Imobilizado</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>
                                {tipoLancamento === 'recorrente' ? 'Melhor Dia de Vencimento' : 'Data de Vencimento'}
                            </label>
                            {tipoLancamento === 'recorrente' ? (
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="31" 
                                    value={diaVencimentoFixo} 
                                    onChange={e => setDiaVencimentoFixo(e.target.value)} 
                                    required 
                                    style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }} 
                                />
                            ) : (
                                <input 
                                    type="date" 
                                    value={vencimento} 
                                    onChange={e => setVencimento(e.target.value)} 
                                    required 
                                    style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }} 
                                />
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>
                                {tipoLancamento === 'recorrente' ? 'Valor Estimado / Mês Atual (R$)' : 'Valor (R$)'}
                            </label>
                            <input 
                                type="text" 
                                placeholder="0,00 (Opcional p/ futuras)" 
                                value={valorTemp} 
                                onChange={e => setValorTemp(aplicarMascara(e.target.value, "dinheiro"))} 
                                required={tipoLancamento !== 'recorrente'} 
                                style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }} 
                            />
                        </div>
                    </div>

                    {tipoLancamento === 'parcelada' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: theme.bgCard, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.primary, textTransform: 'uppercase' }}>Quantidade de Parcelas</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input 
                                    type="number" 
                                    min="2" 
                                    max="48" 
                                    value={quantidadeParcelas} 
                                    onChange={e => setQuantidadeParcelas(e.target.value)} 
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.bgApp, color: theme.textMain, width: '100px', fontSize: '13px', outline: 'none' }} 
                                />
                                <span style={{ fontSize: '12px', color: theme.textSec }}>
                                    O sistema gerará {quantidadeParcelas} faturas mensais dividindo o valor igualmente.
                                </span>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Status Inicial (Mês Atual)</label>
                        <select 
                            value={status} 
                            onChange={e => setStatus(e.target.value)} 
                            style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMain, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                        >
                            <option value="pendente">Pendente (Em aberto)</option>
                            <option value="pago">Pago (À vista / Baixado)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button type="button" onClick={limparEFechar} style={{ background: 'transparent', color: theme.textSec, border: `1px solid ${theme.border}`, padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                        <button type="submit" style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            {tipoLancamento === 'parcelada' ? 'Gerar Parcelas' : tipoLancamento === 'recorrente' ? 'Agendar Recorrência (12 Meses)' : 'Salvar Lançamento'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
// app/admin/financeiro/_tabsGestaoFinanceiro/ModalRegistroDespesa.tsx