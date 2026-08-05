// app/admin/produtos/_components/FormularioProduto.tsx
"use client";

import React, { useState } from "react";
import { FiSettings, FiCamera, FiSliders, FiGrid } from "react-icons/fi";
import { styles } from "../styles";

interface FormularioProdutoProps {
  nome: string;
  setNome: (v: string) => void;
  sku: string;
  setSku: (v: string) => void;
  setIsModalSKUOpen: (v: boolean) => void;
  categoria: string;
  setCategoria: (v: string) => void;
  subcategoria: string;
  setSubcategoria: (v: string) => void;
  listaCategorias: any[];
  setShowCatManager: (v: boolean) => void;
  descricao: string;
  setShowDescModal: (v: boolean) => void;
  precoBasico: string;
  setPrecoBasico: (v: string) => void;
  custoUnitario: string;
  setCustoUnitario: (v: string) => void;
  estoque: string;
  setEstoque: (v: string) => void;
  estoqueMinimo?: string;
  setEstoqueMinimo?: (v: string) => void;
  temVariaveisComPreco: boolean;
  setShowVarModal: (v: boolean) => void;
  setShowReqModal: (v: boolean) => void;
  requisitos: any;
  formatInput: (value: string, setter: (v: string) => void) => void;
  imagens: string[];
  setImagens: React.Dispatch<React.SetStateAction<string[]>>;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  uploading: boolean;
  setTipoCropAtual: (v: "principal" | "variacao") => void;
  setArquivoParaCortar: (file: File | null) => void;
  envioTransportadora?: boolean;
  setEnvioTransportadora?: (v: boolean) => void;
  permiteRetirada?: boolean;
  setPermiteRetirada?: (v: boolean) => void;
  peso?: string;
  setPeso?: (v: string) => void;
  comprimento?: string;
  setComprimento?: (v: string) => void;
  largura?: string;
  setLargura?: (v: string) => void;
  altura?: string;
  setAltura?: (v: string) => void;
}

export default function FormularioProduto({
  nome, setNome,
  sku, setSku,
  setIsModalSKUOpen,
  categoria, setCategoria,
  subcategoria, setSubcategoria,
  listaCategorias,
  setShowCatManager,
  descricao, setShowDescModal,
  precoBasico, setPrecoBasico,
  custoUnitario, setCustoUnitario,
  estoque, setEstoque,
  estoqueMinimo = "", setEstoqueMinimo = () => {},
  temVariaveisComPreco,
  setShowVarModal,
  setShowReqModal,
  requisitos,
  formatInput,
  imagens, setImagens,
  files, setFiles,
  uploading,
  setTipoCropAtual,
  setArquivoParaCortar,
  envioTransportadora = true, setEnvioTransportadora = () => {},
  permiteRetirada = false, setPermiteRetirada = () => {},
  peso = "", setPeso = () => {},
  comprimento = "", setComprimento = () => {},
  largura = "", setLargura = () => {},
  altura = "", setAltura = () => {}
}: FormularioProdutoProps) {

  const [indiceArrastado, setIndiceArrastado] = useState<number | null>(null);

  const totalImagensCount = imagens.length + files.length;

  const removerImagemUnificada = (indexGlobal: number) => {
    if (indexGlobal < imagens.length) {
      setImagens(imagens.filter((_, idx) => idx !== indexGlobal));
    } else {
      const fileIndex = indexGlobal - imagens.length;
      setFiles(files.filter((_, idx) => idx !== fileIndex));
    }
  };

  const moverPosicaoImagem = (indexOrigem: number, indexDestino: number) => {
    if (indexDestino < 0 || indexDestino >= totalImagensCount || indexOrigem === indexDestino) return;

    const listaCompleta: { tipo: 'url' | 'file'; valor: string | File }[] = [
      ...imagens.map(url => ({ tipo: 'url' as const, valor: url })),
      ...files.map(file => ({ tipo: 'file' as const, valor: file }))
    ];

    const [itemMovido] = listaCompleta.splice(indexOrigem, 1);
    listaCompleta.splice(indexDestino, 0, itemMovido);

    const novasImagens: string[] = [];
    const novosFiles: File[] = [];

    listaCompleta.forEach(item => {
      if (item.tipo === 'url') novasImagens.push(item.valor as string);
      else novosFiles.push(item.valor as File);
    });

    setImagens(novasImagens);
    setFiles(novosFiles);
  };

  const isProdutoDigital = !envioTransportadora && !permiteRetirada;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      <style jsx>{`
        @media (max-width: 768px) {
          .imagens-container-mobile {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 6px !important;
            overflow-x: visible !important;
            width: 100% !important;
          }
          .slot-imagem-mobile {
            min-width: 0 !important;
            width: 100% !important;
            height: auto !important;
            aspect-ratio: 1 / 1 !important;
          }
        }
        .btn-moderno:hover {
          filter: brightness(0.95);
          transform: translateY(-1px);
        }
        .btn-moderno:active {
          transform: translateY(0);
        }
      `}</style>

      {/* 1. SEÇÃO DE IMAGENS */}
      <div>
        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'block' }}>
          Imagens do Produto (A 1ª foto é a Capa — Toque para definir)
        </label>
        <div className="imagens-container-mobile" style={{ display: 'flex', gap: '10px', alignItems: 'center', overflowX: 'auto', paddingBottom: '5px' }}>
          
          {/* Slot Principal / Capa */}
          <div
            className="slot-imagem-mobile"
            draggable={totalImagensCount > 0}
            onDragStart={() => setIndiceArrastado(0)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (indiceArrastado !== null) {
                moverPosicaoImagem(indiceArrastado, 0);
                setIndiceArrastado(null);
              }
            }}
            onClick={() => {
              if (totalImagensCount > 1 && indiceArrastado !== null && indiceArrastado !== 0) {
                moverPosicaoImagem(indiceArrastado, 0);
                setIndiceArrastado(null);
              }
            }}
            style={{
              minWidth: '100px',
              width: '100px',
              height: '100px',
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              background: '#f8fafc',
              overflow: 'hidden',
              cursor: totalImagensCount > 0 ? 'pointer' : 'default'
            }}
          >
            {totalImagensCount > 0 ? (
              <>
                <img 
                  src={0 < imagens.length ? imagens[0] : URL.createObjectURL(files[0 - imagens.length])} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  alt="Capa" 
                />
                <div style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', padding: '1px 4px', borderRadius: '3px' }}>
                  Capa ⭐
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removerImagemUnificada(0);
                  }}
                  style={styles.btnDelImg}
                >
                  ×
                </button>
              </>
            ) : (
              <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>Capa Principal</span>
            )}
          </div>

          {/* Slots Secundários (3 miniaturas) */}
          {[1, 2, 3].map((slotIndex) => {
            const temImagem = slotIndex < totalImagensCount;
            let imgSrc = "";
            if (temImagem) {
              imgSrc = slotIndex < imagens.length ? imagens[slotIndex] : URL.createObjectURL(files[slotIndex - imagens.length]);
            }

            return (
              <div
                className="slot-imagem-mobile"
                key={slotIndex}
                draggable={temImagem}
                onDragStart={() => setIndiceArrastado(slotIndex)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (indiceArrastado !== null) {
                    moverPosicaoImagem(indiceArrastado, slotIndex);
                    setIndiceArrastado(null);
                  }
                }}
                onClick={() => {
                  if (temImagem) {
                    if (indiceArrastado === null) {
                      setIndiceArrastado(slotIndex);
                    } else {
                      moverPosicaoImagem(indiceArrastado, slotIndex);
                      setIndiceArrastado(null);
                    }
                  }
                }}
                style={{
                  minWidth: '70px',
                  width: '70px',
                  height: '70px',
                  border: indiceArrastado === slotIndex ? '2px solid #2563eb' : '1px dashed #cbd5e1',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  background: indiceArrastado === slotIndex ? '#eff6ff' : '#f8fafc',
                  overflow: 'hidden',
                  cursor: temImagem ? 'pointer' : 'default'
                }}
              >
                {temImagem ? (
                  <>
                    <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Slot ${slotIndex}`} />
                    {indiceArrastado === slotIndex && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(37, 99, 235, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>
                        Selecionada
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removerImagemUnificada(slotIndex);
                      }}
                      style={styles.btnDelImg}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: '10px', color: '#cbd5e1' }}>+{slotIndex + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Botão de Upload Modernizado e Limpo */}
        <label className="btn-moderno" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          marginTop: '10px',
          padding: '10px 16px',
          background: '#f1f5f9',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          color: '#334155',
          fontSize: '13px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxSizing: 'border-box'
        }}>
          <FiCamera size={16} color="#0284c7" />
          <span>{uploading ? "Enviando..." : "Adicionar Fotos"}</span>
          <input
            type="file"
            accept="image/*"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                setTipoCropAtual("principal");
                setArquivoParaCortar(e.target.files[0]);
              }
            }}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '5px 0' }} />

      {/* 2. INFORMAÇÕES BÁSICAS DO PRODUTO */}
      <div>
        <h3 style={styles.sideTitle}>📦 Informações Básicas do Produto</h3>

        <input
          style={{ ...styles.input, marginBottom: '10px' }}
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Nome do Produto *"
        />

        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
          <select
            style={{ ...styles.input, marginBottom: 0, flex: 1 }}
            value={categoria}
            onChange={e => { setCategoria(e.target.value); setSubcategoria(""); }}
          >
            <option value="">Categoria... *</option>
            {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          <button type="button" onClick={() => setShowCatManager(true)} style={styles.btnActionSmall}>
            <FiSettings />
          </button>
        </div>

        {categoria && listaCategorias.find(c => c.nome === categoria)?.subcategorias?.length > 0 && (
          <select style={{ ...styles.input, marginBottom: '10px' }} value={subcategoria} onChange={e => setSubcategoria(e.target.value)}>
            <option value="">Subcategoria (Opcional)</option>
            {listaCategorias.find(c => c.nome === categoria).subcategorias.map((sub: string, i: number) => (
              <option key={i} value={sub}>{sub}</option>
            ))}
          </select>
        )}

        <textarea
          style={{ ...styles.textarea, marginBottom: '10px' }}
          value={descricao}
          onClick={() => setShowDescModal(true)}
          readOnly
          placeholder="Descrição... *"
        />

        {/* Botões de Ação Internos Modernizados (Grade e Personalização) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          <button
            type="button"
            onClick={() => setShowVarModal(true)}
            className="btn-moderno"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 12px',
              background: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FiGrid size={15} color="#2563eb" />
            <span>{temVariaveisComPreco ? "Editar Grade" : "Variações"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowReqModal(true)}
            className="btn-moderno"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 12px',
              background: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <FiSliders size={15} color="#c026d3" />
            <span>Personalização ({Object.values(requisitos || {}).filter(Boolean).length})</span>
          </button>
        </div>
      </div>

      {/* 3. VALORES E ESTOQUE */}
      <div style={{ ...styles.boxGray, opacity: temVariaveisComPreco ? 0.6 : 1, marginBottom: '15px' }}>
        <label style={styles.miniLabel}>Valores e Estoque</label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            disabled={temVariaveisComPreco}
            style={{ ...styles.input, marginBottom: 0 }}
            value={temVariaveisComPreco ? "Grade" : (precoBasico || "")}
            onChange={e => formatInput(e.target.value, setPrecoBasico)}
            placeholder="Venda (R$)"
          />
          <input
            disabled={temVariaveisComPreco}
            style={{ ...styles.input, marginBottom: 0 }}
            value={temVariaveisComPreco ? "Grade" : (custoUnitario || "")}
            onChange={e => formatInput(e.target.value, setCustoUnitario)}
            placeholder="Custo (R$)"
          />
          <input
            disabled={temVariaveisComPreco}
            style={{ ...styles.input, marginBottom: 0 }}
            value={temVariaveisComPreco ? "Grade" : (estoque || "")}
            onChange={e => {
              const cleanValue = e.target.value.replace(/\D/g, "");
              setEstoque(cleanValue);
            }}
            placeholder="Estoque"
          />
        </div>
      </div>

      <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '5px 0' }} />

      {/* 4. CONFIGURAÇÕES DE LOGÍSTICA E FRETE */}
      <div>
        <h3 style={styles.sideTitle}>🚚 Configurações de Logística e Frete</h3>

        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>
            Modalidades Disponíveis
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#334155' }}>
              <input
                type="checkbox"
                checked={envioTransportadora}
                onChange={e => setEnvioTransportadora(e.target.checked)}
              />
              Envio por Transportadora
            </label>
            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#334155' }}>
              <input
                type="checkbox"
                checked={permiteRetirada}
                onChange={e => setPermiteRetirada(e.target.checked)}
              />
              Permitir Retirada na Loja
            </label>
          </div>

          {isProdutoDigital && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#d90618', fontWeight: 'bold', background: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>
              ℹ️ <b>Produto Digital</b>.
            </div>
          )}
        </div>

        {envioTransportadora && (
          <>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block' }}>
              Medidas para Cálculo (Melhor Envio) *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '10px' }}>
              <input
                style={{ ...styles.input, marginBottom: 0 }}
                value={peso}
                onChange={e => setPeso(e.target.value)}
                placeholder="Peso kg"
              />
              <input
                style={{ ...styles.input, marginBottom: 0 }}
                value={comprimento}
                onChange={e => setComprimento(e.target.value)}
                placeholder="Comp cm"
              />
              <input
                style={{ ...styles.input, marginBottom: 0 }}
                value={largura}
                onChange={e => setLargura(e.target.value)}
                placeholder="Larg cm"
              />
              <input
                style={{ ...styles.input, marginBottom: 0 }}
                value={altura}
                onChange={e => setAltura(e.target.value)}
                placeholder="Alt cm"
              />
            </div>
          </>
        )}
      </div>

      <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '5px 0' }} />

      {/* 📦 ALERTA DE ESTOQUE MÍNIMO */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block' }}>
          ⚠️ Alerta de Estoque Mínimo (Aviso quando atingir X unidades)
        </label>
        <input
          style={{ ...styles.input, marginBottom: 0 }}
          value={estoqueMinimo}
          onChange={e => {
            const cleanValue = e.target.value.replace(/\D/g, "");
            setEstoqueMinimo(cleanValue);
          }}
          placeholder="Ex: 5 (Padrão: 3)"
        />
      </div>

      <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '5px 0' }} />

      {/* 5. SKU (CÓDIGO) */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block' }}>
          SKU (Código)
        </label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            style={{ ...styles.input, marginBottom: 0 }}
            value={sku}
            onChange={e => setSku(e.target.value.toUpperCase())}
            placeholder="Ex: CAM-AZU-G"
          />
          <button
            type="button"
            onClick={() => setIsModalSKUOpen(true)}
            style={{ padding: '0 15px', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            Gen
          </button>
        </div>
      </div>

    </div>
  );
}