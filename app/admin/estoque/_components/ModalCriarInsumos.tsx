// app/admin/estoque/_components/ModalCriarInsumos.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { FiX } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import { aplicarMascara } from "@/utils/formatters";
import { LISTA_UNIDADES_MEDIDA } from "@/utils/conversaoUnidades";

interface ModalCriarInsumosProps {
    uid: string;
    modalAberto: boolean;
    editandoId: string | null;
    insumoParaEditar?: any;
    onClose: () => void;
}

export function ModalCriarInsumos({
    uid,
    modalAberto,
    editandoId,
    insumoParaEditar,
    onClose
}: ModalCriarInsumosProps) {
    const { theme } = useTheme();

    const [dsNomeInsumo, setDsNomeInsumo] = useState("");
    const [dsMarcaInsumo, setDsMarcaInsumo] = useState("");
    const [dsFabricanteInsumo, setDsFabricanteInsumo] = useState("");
    const [dsUnidadeConsumoInsumo, setDsUnidadeConsumoInsumo] = useState("un");
    const [custoUnitarioExibicao, setCustoUnitarioExibicao] = useState("");
    const [nrEstoqueAtualInsumo, setNrEstoqueAtualInsumo] = useState("");
    const [nrEstoqueMinimoInsumo, setNrEstoqueMinimoInsumo] = useState("10");
    const [isComposicaoInsumo, setIsComposicaoInsumo] = useState(true);

    useEffect(() => {
        if (insumoParaEditar && editandoId) {
            setDsNomeInsumo(insumoParaEditar.dsNomeInsumo || insumoParaEditar.nome || "");
            setDsMarcaInsumo(insumoParaEditar.dsMarcaInsumo || insumoParaEditar.marca || "");
            setDsFabricanteInsumo(insumoParaEditar.dsFabricanteInsumo || insumoParaEditar.fabricante || "");
            setDsUnidadeConsumoInsumo(insumoParaEditar.dsUnidadeConsumoInsumo || insumoParaEditar.dsUnidadeMedida || insumoParaEditar.unidadeMedida || "un");
            
            const vlCusto = insumoParaEditar.vlCustoUnitarioInsumo ?? insumoParaEditar.vlCustoUnitario ?? insumoParaEditar.custoUnitario;
            if (vlCusto !== undefined && vlCusto !== null) {
                const centavos = Math.round(Number(vlCusto) * 100).toString();
                setCustoUnitarioExibicao(aplicarMascara(centavos, "dinheiro"));
            } else {
                setCustoUnitarioExibicao("");
            }

            setNrEstoqueAtualInsumo(String(insumoParaEditar.nrEstoqueAtualInsumo ?? insumoParaEditar.nrEstoqueAtual ?? insumoParaEditar.estoqueAtual ?? ""));
            setNrEstoqueMinimoInsumo(String(insumoParaEditar.nrEstoqueMinimoInsumo ?? insumoParaEditar.nrEstoqueMinimo ?? insumoParaEditar.estoqueMinimo ?? "10"));
            setIsComposicaoInsumo(insumoParaEditar.isComposicaoInsumo ?? insumoParaEditar.isComposicao ?? insumoParaEditar.usaNaComposicao ?? true);
        } else {
            setDsNomeInsumo("");
            setDsMarcaInsumo("");
            setDsFabricanteInsumo("");
            setDsUnidadeConsumoInsumo("un");
            setCustoUnitarioExibicao("");
            setNrEstoqueAtualInsumo("");
            setNrEstoqueMinimoInsumo("10");
            setIsComposicaoInsumo(true);
        }
    }, [insumoParaEditar, editandoId, modalAberto]);

    const converterParaNumeroPuro = (valorFormatado: string): number => {
        if (!valorFormatado) return 0;
        const limpo = valorFormatado.replace(/\./g, "").replace(",", ".");
        const num = parseFloat(limpo);
        return isNaN(num) ? 0 : num;
    };

    const salvarInsumo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uid) return;

        const vlCustoUnitarioInsumo = converterParaNumeroPuro(custoUnitarioExibicao);
        const estoqueNum = parseFloat(nrEstoqueAtualInsumo.replace(",", ".")) || 0;
        const minNum = parseFloat(nrEstoqueMinimoInsumo.replace(",", ".")) || 0;

        if (!dsNomeInsumo.trim() || isNaN(vlCustoUnitarioInsumo) || vlCustoUnitarioInsumo < 0) {
            alert("Preencha o nome do insumo e um custo unitário válido.");
            return;
        }

        try {
            const insumoData = {
                dsNomeInsumo: dsNomeInsumo.trim(),
                dsMarcaInsumo: dsMarcaInsumo.trim(),
                dsFabricanteInsumo: dsFabricanteInsumo.trim(),
                dsUnidadeConsumoInsumo,
                vlCustoUnitarioInsumo,
                nrEstoqueAtualInsumo: estoqueNum,
                nrEstoqueMinimoInsumo: minNum,
                isComposicaoInsumo,
                updatedAt: new Date().toISOString()
            };

            if (editandoId) {
                await updateDoc(doc(db, "lojistas", uid, "insumos_composicao", editandoId), insumoData);
            } else {
                const novoDocRef = doc(collection(db, "lojistas", uid, "insumos_composicao"));
                await setDoc(novoDocRef, {
                    ...insumoData,
                    createdAt: new Date().toISOString()
                });
            }

            onClose();
        } catch (error: any) {
            alert("Erro ao salvar insumo: " + error.message);
        }
    };

    if (!modalAberto) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '15px' }}>
            <div style={{ background: theme.bgCard, padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', border: `1px solid ${theme.border}`, maxHeight: '90vh', overflowY: 'auto' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 800, color: theme.textMain }}>
                        {editandoId ? "✏️ Editar Insumo" : "📦 Cadastrar Novo Insumo"}
                    </h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: theme.textSec, cursor: 'pointer' }}>
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={salvarInsumo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* Nome do Insumo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Nome do Insumo *</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Saco Segurança, Tinta Preta, Fita Cetim..." 
                            value={dsNomeInsumo}
                            onChange={(e) => setDsNomeInsumo(e.target.value)}
                            required
                            style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                        />
                    </div>

                    {/* Marca e Fabricante */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Marca</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Plastipel, Acrilex..." 
                                value={dsMarcaInsumo}
                                onChange={(e) => setDsMarcaInsumo(e.target.value)}
                                style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Fabricante</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Indústria XYZ..." 
                                value={dsFabricanteInsumo}
                                onChange={(e) => setDsFabricanteInsumo(e.target.value)}
                                style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Unidade de Consumo e Custo Base */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Unidade de Consumo *</label>
                            <select 
                                value={dsUnidadeConsumoInsumo}
                                onChange={(e) => setDsUnidadeConsumoInsumo(e.target.value)}
                                style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                            >
                                {LISTA_UNIDADES_MEDIDA.map((u) => (
                                    <option key={u.sigla} value={u.sigla}>
                                        {u.nome} ({u.sigla})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Custo Base Unitário (R$) *</label>
                            <input 
                                type="text" 
                                placeholder="0,00" 
                                value={custoUnitarioExibicao}
                                onChange={(e) => setCustoUnitarioExibicao(aplicarMascara(e.target.value, "dinheiro"))}
                                required
                                style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Estoque Inicial/Atual e Estoque Mínimo */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Estoque Inicial / Atual</label>
                            <input 
                                type="number" 
                                step="any"
                                placeholder="0" 
                                value={nrEstoqueAtualInsumo}
                                onChange={(e) => setNrEstoqueAtualInsumo(e.target.value)}
                                style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, textTransform: 'uppercase' }}>Estoque Mínimo (Alerta)</label>
                            <input 
                                type="number" 
                                step="any"
                                placeholder="10" 
                                value={nrEstoqueMinimoInsumo}
                                onChange={(e) => setNrEstoqueMinimoInsumo(e.target.value)}
                                style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Checkbox de Composição */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', background: theme.bgApp, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                        <input 
                            type="checkbox" 
                            id="usaComposicao"
                            checked={isComposicaoInsumo}
                            onChange={(e) => setIsComposicaoInsumo(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="usaComposicao" style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: theme.textMain, lineHeight: '1.4' }}>
                            Habilitar para composição de produtos (baixa automática na venda)
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                        <button type="button" onClick={onClose} style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Cancelar
                        </button>
                        <button type="submit" style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Salvar Insumo
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}