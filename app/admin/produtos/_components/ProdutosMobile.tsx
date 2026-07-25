// app/admin/produtos/_components/ProdutosMobile.tsx
"use client";

import React, { useState } from "react";
import { FiMenu, FiPlus, FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { styles } from "../styles";

import FormularioProduto from "./FormularioProduto";
import SecaoLogistica from "./SecaoLogistica";
import ListaProdutos from "./ListaProdutos";

interface ProdutosMobileProps {
  produtos: any[];
  produtosPaginados: any[];
  produtosFiltrados: any[];
  busca: string;
  setBusca: (v: string) => void;
  filtroCategoria: string;
  setFiltroCategoria: (v: string) => void;
  filtroStatus: string;
  setFiltroStatus: (v: string) => void;
  modoMassa: boolean;
  setModoMassa: (v: boolean) => void;
  selecionados: string[];
  setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
  listaCategorias: any[];
  uid: string | null;
  setListaParaImprimir: (v: any[]) => void;
  
  // Estados do formulário
  nome: string; setNome: (v: string) => void;
  sku: string; setSku: (v: string) => void;
  setIsModalSKUOpen: (v: boolean) => void;
  categoria: string; setCategoria: (v: string) => void;
  subcategoria: string; setSubcategoria: (v: string) => void;
  setShowCatManager: (v: boolean) => void;
  descricao: string; setShowDescModal: (v: boolean) => void;
  precoBasico: string; setPrecoBasico: (v: string) => void;
  custoUnitario: string; setCustoUnitario: (v: string) => void;
  temVariaveisComPreco: boolean;
  setShowVarModal: (v: boolean) => void;
  setShowReqModal: (v: boolean) => void;
  requisitos: any;
  formatInput: (value: string, setter: (v: string) => void) => void;
  imagens: string[]; setImagens: React.Dispatch<React.SetStateAction<string[]>>;
  files: File[]; setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  uploading: boolean;
  setTipoCropAtual: (v: "principal" | "variacao") => void;
  setArquivoParaCortar: (file: File | null) => void;
  
  envioTransportadora: boolean; setEnvioTransportadora: (v: boolean) => void;
  permiteRetirada: boolean; setPermiteRetirada: (v: boolean) => void;
  peso: string; setPeso: (v: string) => void;
  comprimento: string; setComprimento: (v: string) => void;
  largura: string; setLargura: (v: string) => void;
  altura: string; setAltura: (v: string) => void;
  
  salvar: () => void;
  limparForm: () => void;
  loading: boolean;
  editId: string | null;
  planoLojista: string;
  limites: { produtos: number; categorias: number };
  
  // Paginação
  paginaAtual: number;
  setPaginaAtual: React.Dispatch<React.SetStateAction<number>>;
  totalPaginas: number;
  itensPorPagina: number;
  setItensPorPagina: (v: number) => void;
  
  onEditarProduto: (p: any) => void;
}

export default function ProdutosMobile(props: ProdutosMobileProps) {
  const [isOpenLeft, setIsOpenLeft] = useState(false);   // Main 1: Gaveta Esquerda -> Direita (Menu/Plano)
  const [isOpenRight, setIsOpenRight] = useState(false); // Main 2: Gaveta Direita -> Esquerda (Formulário)

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f8fafc' }}>
      
      {/* BARRA SUPERIOR MOBILE COM BOTÃO HAMBÚRGUER (Main 1) */}
      <div style={styles.mobileTopBar}>
        <button type="button" onClick={() => setIsOpenLeft(true)} style={styles.btnMenu}>
          <FiMenu /> <span style={{ fontSize: '13px', marginLeft: '6px', fontWeight: 'bold' }}>Painel / Plano</span>
        </button>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Produtos</span>
      </div>

      {/* TELA PRINCIPAL: Main 3 (Cards de Produtos) */}
      <div style={{ width: '100%', padding: '10px', boxSizing: 'border-box', paddingBottom: '90px', flex: 1 }}>
        <ListaProdutos
          produtos={props.produtos}
          produtosFiltrados={props.produtosPaginados}
          busca={props.busca} setBusca={props.setBusca}
          filtroCategoria={props.filtroCategoria} setFiltroCategoria={props.setFiltroCategoria}
          filtroStatus={props.filtroStatus} setFiltroStatus={props.setFiltroStatus}
          modoMassa={props.modoMassa} setModoMassa={props.setModoMassa}
          selecionados={props.selecionados} setSelecionados={props.setSelecionados}
          listaCategorias={props.listaCategorias}
          uid={props.uid}
          setListaParaImprimir={props.setListaParaImprimir}
          onEditar={(p: any) => {
            props.onEditarProduto(p);
            setIsOpenRight(true); // Abre a Main 2 (Formulário) deslizando da direita
          }}
        />

        {/* Controles de Paginação Mobile */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '12px', borderTop: '1px solid #e2e8f0', marginTop: '15px', background: '#fff', borderRadius: '8px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>
            <span>Exibir:</span>
            <select
              value={props.itensPorPagina}
              onChange={e => props.setItensPorPagina(Number(e.target.value))}
              style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11px' }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={40}>40</option>
            </select>
          </div>

          {props.produtosFiltrados.length > props.itensPorPagina && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                disabled={props.paginaAtual === 1}
                onClick={() => props.setPaginaAtual(p => Math.max(p - 1, 1))}
                style={{ padding: '6px 10px', background: props.paginaAtual === 1 ? '#cbd5e1' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
              >
                <FiChevronLeft /> Ant
              </button>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155' }}>
                {props.paginaAtual} / {props.totalPaginas}
              </span>
              <button
                type="button"
                disabled={props.paginaAtual === props.totalPaginas}
                onClick={() => props.setPaginaAtual(p => Math.min(p + 1, props.totalPaginas))}
                style={{ padding: '6px 10px', background: props.paginaAtual === props.totalPaginas ? '#cbd5e1' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
              >
                Próx <FiChevronRight />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTÃO FLUTUANTE (FAB) PARA ADICIONAR NOVO PRODUTO (Abre Main 2) */}
      <button
        type="button"
        onClick={() => { props.limparForm(); setIsOpenRight(true); }}
        style={styles.fabAdd}
      >
        <FiPlus />
      </button>

      {/* OVERLAY ESCURO COMPARTILHADO */}
      {(isOpenLeft || isOpenRight) && (
        <div 
          onClick={() => { setIsOpenLeft(false); setIsOpenRight(false); }}
          style={styles.overlay}
        />
      )}

      {/* GAVETA ESQUERDA: Main 1 (Sidebar / Plano - Desliza Esquerda -> Direita) */}
      <div
        style={{
          ...styles.drawerLeft,
          transform: isOpenLeft ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={styles.sideTitle}>📊 Informações & Plano</h3>
          <button type="button" onClick={() => setIsOpenLeft(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>
            <FiX />
          </button>
        </div>

        <div style={styles.planCard}>
          <p style={styles.planTitle}>Uso do Plano: {props.planoLojista}</p>
          <div style={{ marginBottom: '8px' }}>
            <div style={styles.planStats}>
              <span>📦 Produtos</span>
              <span>{props.produtos.length} / {props.limites.produtos}</span>
            </div>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${Math.min((props.produtos.length / props.limites.produtos) * 100, 100)}%`, background: props.produtos.length >= props.limites.produtos ? '#ef4444' : '#10b981' }} />
            </div>
          </div>
          <div>
            <div style={styles.planStats}>
              <span>📁 Categorias</span>
              <span>{props.listaCategorias.length} / {props.limites.categorias}</span>
            </div>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${Math.min((props.listaCategorias.length / props.limites.categorias) * 100, 100)}%`, background: props.listaCategorias.length >= props.limites.categorias ? '#ef4444' : '#3b82f6' }} />
            </div>
          </div>
        </div>
      </div>

      {/* GAVETA DIREITA: Main 2 (Coluna do Produto / Formulário - Desliza Direita -> Esquerda) */}
      <div
        style={{
          ...styles.drawerRight,
          transform: isOpenRight ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={styles.sideTitle}>{props.editId ? "📝 Editar Produto" : "📦 Novo Produto"}</h3>
          <button type="button" onClick={() => setIsOpenRight(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>
            <FiX />
          </button>
        </div>

        <FormularioProduto
          nome={props.nome} setNome={props.setNome}
          sku={props.sku} setSku={props.setSku}
          setIsModalSKUOpen={props.setIsModalSKUOpen}
          categoria={props.categoria} setCategoria={props.setCategoria}
          subcategoria={props.subcategoria} setSubcategoria={props.setSubcategoria}
          listaCategorias={props.listaCategorias}
          setShowCatManager={props.setShowCatManager}
          descricao={props.descricao} setShowDescModal={props.setShowDescModal}
          precoBasico={props.precoBasico} setPrecoBasico={props.setPrecoBasico}
          custoUnitario={props.custoUnitario} setCustoUnitario={props.setCustoUnitario}
          temVariaveisComPreco={props.temVariaveisComPreco}
          setShowVarModal={props.setShowVarModal}
          setShowReqModal={props.setShowReqModal}
          requisitos={props.requisitos}
          formatInput={props.formatInput}
          imagens={props.imagens} setImagens={props.setImagens}
          files={props.files} setFiles={props.setFiles}
          uploading={props.uploading}
          setTipoCropAtual={props.setTipoCropAtual}
          setArquivoParaCortar={props.setArquivoParaCortar}
        />

        <SecaoLogistica
          envioTransportadora={props.envioTransportadora} setEnvioTransportadora={props.setEnvioTransportadora}
          permiteRetirada={props.permiteRetirada} setPermiteRetirada={props.setPermiteRetirada}
          peso={props.peso} setPeso={props.setPeso}
          comprimento={props.comprimento} setComprimento={props.setComprimento}
          largura={props.largura} setLargura={props.setLargura}
          altura={props.altura} setAltura={props.setAltura}
          formatInput={props.formatInput}
        />

        <button type="button" onClick={() => { props.salvar(); setIsOpenRight(false); }} style={styles.btnSave}>
          {props.loading ? "Aguarde..." : props.editId ? "Atualizar Produto" : "Salvar Produto"}
        </button>
        <button type="button" onClick={() => { props.limparForm(); setIsOpenRight(false); }} style={styles.btnCancel}>
          ✖ Cancelar
        </button>
      </div>

    </div>
  );
}