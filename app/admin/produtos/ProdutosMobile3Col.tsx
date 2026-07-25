// app/admin/produtos/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { db, auth, storage } from "@/lib/firebase";
import {
  collection, doc, query, orderBy, updateDoc,
  setDoc, getDoc, addDoc, onSnapshot
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FiChevronLeft, FiChevronRight, FiMenu, FiPlus, FiX, FiEdit3 } from "react-icons/fi";

// --- IMPORTAÇÃO DOS SEUS COMPONENTES ---
import FormularioProduto from "./_components/FormularioProduto";
import SecaoLogistica from "./_components/SecaoLogistica";
import ListaProdutos from "./_components/ListaProdutos";

// --- IMPORTAÇÃO DE MODAIS E UTILITÁRIOS ---
import { styles } from "./styles";
import RequisitosModal from "@/app/admin/_components/RequisitosModal";
import VariacoesModal from "@/app/admin/_components/VariacoesModal";
import CategoriaSubCat from "@/app/admin/_components/CategoriaSubCat";
import ModalGeradorSKU from "@/app/admin/_components/ModalGeradorSKU";
import EtiquetaModal from "@/app/admin/_components/EtiquetaModal";
import { getPlanoEfetivo } from "@/utils/planoAtivo";
import ImageCropperModal from "@/utils/ImageCropperModalProduto";

const PALAVRAS_PROIBIDAS = [
  "admin", "master", "suporte", "festaemtopo", "root", "null",
  "undefined", "api", "vendas", "financeiro", "ajuda", "config",
  "sistema", "login", "auth", "teste", "gerente", "houseconviteria", "chefe"
];

export default function CadastroProdutos() {
  const [uid, setUid] = useState<string | null>(null);
  const [planoLojista, setPlanoLojista] = useState("Bronze");
  const [planosMaster, setPlanosMaster] = useState<any>(null);
  const [limites, setLimites] = useState({ produtos: 0, categorias: 0 });

  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // ESTADOS DE CONTROLE DAS GAVETAS MOBILE (MAIN 1 E MAIN 2)
  const [isOpenLeft, setIsOpenLeft] = useState(false);
  const [isOpenRight, setIsOpenRight] = useState(false);

  // ESTADOS DE PAGINAÇÃO
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(20);

  const [nome, setNome] = useState("");
  const [sku, setSku] = useState("");
  const [isModalSKUOpen, setIsModalSKUOpen] = useState(false);
  const [listaParaImprimir, setListaParaImprimir] = useState<any[]>([]);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [precoBasico, setPrecoBasico] = useState("");
  const [custoUnitario, setCustoUnitario] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [envioTransportadora, setEnvioTransportadora] = useState(true);
  const [permiteRetirada, setPermiteRetirada] = useState(false);

  const [peso, setPeso] = useState("");
  const [comprimento, setComprimento] = useState("");
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  
  const [files, setFiles] = useState<File[]>([]);
  const [imagens, setImagens] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [listaCategorias, setListaCategorias] = useState<any[]>([]);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showDescModal, setShowDescModal] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);
  const [requisitos, setRequisitos] = useState({
    pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false
  });
  
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [modoMassa, setModoMassa] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [showVarModal, setShowVarModal] = useState(false);

  const [nomeVar1, setNomeVar1] = useState("");
  const [opcoesVar1, setOpcoesVar1] = useState<string[]>([]);
  const [nomeVar2, setNomeVar2] = useState("");
  const [opcoesVar2, setOpcoesVar2] = useState<string[]>([]);
  const [tabelaPrecos, setTabelaPrecos] = useState<any>({});
  const [produtoIdAtual, setProdutoIdAtual] = useState<string | null>(null);

  const [arquivoParaCortar, setArquivoParaCortar] = useState<File | null>(null);
  const [tipoCropAtual, setTipoCropAtual] = useState<"principal" | "variacao">("principal");

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const getProdutoId = useCallback(() => {
    if (editId) return editId;
    if (!produtoIdAtual) {
      if (!uid) return "";
      const novoId = doc(collection(db, "lojistas", uid, "produtos")).id;
      setProdutoIdAtual(novoId);
      return novoId;
    }
    return produtoIdAtual;
  }, [editId, produtoIdAtual, uid]);

  useEffect(() => {
    const unsubMaster = onSnapshot(doc(db, "configuracoes", "planos"), (snap) => {
      if (snap.exists()) setPlanosMaster(snap.data());
    });
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else setUid(null);
    });
    return () => { unsubMaster(); unsubAuth(); };
  }, []);

  useEffect(() => {
    if (!uid || !planosMaster) return;

    const unsubLojista = onSnapshot(doc(db, "lojistas", uid), (docSnap) => {
      if (docSnap.exists()) {
        const planoAtivo = getPlanoEfetivo(docSnap.data(), planosMaster);
        setPlanoLojista(planoAtivo.nome);
        setLimites({
          produtos: planoAtivo.configs.limiteProdutos,
          categorias: planoAtivo.configs.limiteCategorias
        });
      }
    });

    const qProdutos = query(collection(db, "lojistas", uid, "produtos"), orderBy("createdAt", "desc"));
    const unsubProdutos = onSnapshot(qProdutos, (snap) => {
      setProdutos(snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, imagens: data.imagens || [], variacoes: data.variacoes || [] };
      }));
    });

    const qCategorias = query(collection(db, "lojistas", uid, "categorias"), orderBy("nome", "asc"));
    const unsubCategorias = onSnapshot(qCategorias, (snap) => {
      setListaCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubLojista(); unsubProdutos(); unsubCategorias(); };
  }, [uid, planosMaster]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroCategoria, filtroStatus, itensPorPagina]);

  const comprimirImagem = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 1000;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("Erro no canvas");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, size, size);
          const ratio = Math.min(size / img.width, size / img.height);
          const newWidth = img.width * ratio;
          const newHeight = img.height * ratio;
          const x = (size - newWidth) / 2;
          const y = (size - newHeight) / 2;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, x, y, newWidth, newHeight);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject("Erro ao gerar blob");
          }, "image/webp", 0.85);
        };
      };
      reader.onerror = reject;
    });
  };

  const validarTexto = (texto: string) => {
    const t = texto.toLowerCase();
    return !PALAVRAS_PROIBIDAS.some(p => t.includes(p));
  };

  const temVariaveisComPreco = Object.values(tabelaPrecos).some((v: any) => {
    return v?.preco && v.preco.toString().trim() !== "" && parseFloat(v.preco) > 0;
  });

  const formatInput = (value: string, setter: (v: string) => void) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) { setter(""); return; }
    setter((parseInt(cleanValue) / 100).toFixed(2));
  };

  const gerarCombinacoes = () => {
    if (opcoesVar1.length === 0) return [];
    if (opcoesVar2.length === 0) return opcoesVar1.filter(v => v.trim()).map(v1 => ({ v1, v2: "", key: v1 }));
    const combos: any[] = [];
    opcoesVar1.filter(v => v.trim()).forEach(v1 => {
      opcoesVar2.filter(v => v.trim()).forEach(v2 => { combos.push({ v1, v2, key: `${v1}-${v2}` }); });
    });
    return combos;
  };

  const sugerirSkus = (tabelaAtual: any, setTabela: any) => {
    if (!sku) {
      alert("Por favor, preencha o SKU Base do produto.");
      return;
    }
    const combos = gerarCombinacoes();
    const novaTabela = { ...tabelaAtual };
    combos.forEach(c => {
      if (!novaTabela[c.key]?.sku) {
        const sufixo1 = c.v1 ? c.v1.substring(0, 3).toUpperCase() : "";
        const sufixo2 = c.v2 ? `-${c.v2.substring(0, 3).toUpperCase()}` : "";
        novaTabela[c.key] = { ...novaTabela[c.key], sku: `${sku}-${sufixo1}${sufixo2}`.toUpperCase() };
      }
    });
    setTabela({ ...novaTabela });
  };

  async function salvar() {
    if (!uid) return;
    if (!editId && produtos.length >= limites.produtos) {
      alert(`Limite de produtos atingido!`);
      return;
    }
    if (!validarTexto(nome) || !nome.trim()) return alert("Nome inválido.");
    if (!categoria) return alert("Selecione uma categoria.");
    if (imagens.length === 0 && files.length === 0) return alert("Adicione pelo menos uma foto.");

    setLoading(true);
    try {
      const produtoId = getProdutoId();
      let novasImagens = [...imagens];

      for (let file of files) {
        const blob = await comprimirImagem(file);
        const fileName = `${Date.now()}-${file.name.split('.')[0]}.webp`;
        const storageRef = ref(storage, `lojistas/${uid}/produtos/${produtoId}/galeria/${fileName}`);
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        novasImagens.push(downloadURL);
      }

      const novaTabelaPrecos = { ...tabelaPrecos };
      for (const key of Object.keys(tabelaPrecos)) {
        const item = tabelaPrecos[key];
        if (item.foto && item.foto.startsWith("data:image")) {
          const storageRef = ref(storage, `lojistas/${uid}/produtos/${produtoId}/variacoes/${key}.jpg`);
          const snapshot = await uploadString(storageRef, item.foto, 'data_url');
          novaTabelaPrecos[key].foto = await getDownloadURL(snapshot.ref);
        }
      }

      const combos = gerarCombinacoes();
      const precosValidos = Object.values(novaTabelaPrecos).map((v: any) => parseFloat(v.preco)).filter(p => p > 0);
      const precoFinal = precosValidos.length > 0 ? Math.min(...precosValidos).toFixed(2) : precoBasico;

      const dados: any = {
        lojistaId: uid, nome, sku, descricao, categoria, subcategoria,
        precoBasico: precoFinal, custoUnitario, ativo,
        envioTransportadora, permiteRetirada, precisaFrete: envioTransportadora,
        peso: envioTransportadora ? peso : null,
        comprimento: envioTransportadora ? comprimento : null,
        largura: envioTransportadora ? largura : null,
        altura: envioTransportadora ? altura : null,
        imagens: novasImagens,
        capa: novasImagens[0] || "",
        temVariacoes: temVariaveisComPreco,
        nomeVar1, nomeVar2, requisitos,
        variacoes: temVariaveisComPreco ? combos.map(c => ({
          nome: c.v2 ? `${c.v1} / ${c.v2}` : c.v1,
          v1: c.v1, v2: c.v2,
          sku: novaTabelaPrecos[c.key]?.sku || "",
          preco: novaTabelaPrecos[c.key]?.preco || precoBasico,
          custo: novaTabelaPrecos[c.key]?.custo || custoUnitario,
          foto: novaTabelaPrecos[c.key]?.foto || ""
        })) : [],
        updatedAt: Date.now()
      };

      const docRef = doc(db, "lojistas", uid, "produtos", produtoId);
      if (editId) await updateDoc(docRef, dados);
      else await setDoc(docRef, { ...dados, destaque: false, createdAt: Date.now() });

      alert("Produto salvo com sucesso! ✅");
      limparForm();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar produto.");
    }
    setLoading(false);
  }

  const limparForm = () => {
    setNome(""); setSku(""); setDescricao(""); setCategoria(""); setSubcategoria(""); setPrecoBasico(""); setCustoUnitario("");
    setPeso(""); setComprimento(""); setLargura(""); setAltura(""); setImagens([]); setEditId(null); setFiles([]); setEnvioTransportadora(true); setPermiteRetirada(false);
    setOpcoesVar1([]); setOpcoesVar2([]); setNomeVar1(""); setNomeVar2(""); setTabelaPrecos({});
    setRequisitos({ pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false });
    setProdutoIdAtual(null);
  };

  const carregarDadosProdutoParaEdicao = (p: any) => {
    setEditId(p.id);
    setNome(p.nome); setSku(p.sku || ""); setCategoria(p.categoria || ""); setSubcategoria(p.subcategoria || "");
    setPrecoBasico(p.precoBasico || "");
    setEnvioTransportadora(p.envioTransportadora ?? true); setPermiteRetirada(p.permiteRetirada ?? false);
    setCustoUnitario(p.custoUnitario || ""); setImagens(p.imagens || []); setDescricao(p.descricao || "");
    setPeso(p.peso || ""); setComprimento(p.comprimento || "");
    setLargura(p.largura || ""); setAltura(p.altura || "");
    setRequisitos(p.requisitos || { pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false });
    if (p.variacoes) {
      setNomeVar1(p.nomeVar1 || ""); setNomeVar2(p.nomeVar2 || "");
      const tab: any = {};
      p.variacoes.forEach((v: any) => {
        const key = v.v2 ? `${v.v1}-${v.v2}` : v.v1;
        tab[key] = { preco: v.preco, custo: v.custo, foto: v.foto || "", sku: v.sku || "" };
      });
      setTabelaPrecos(tab);
      setOpcoesVar1([...new Set(p.variacoes.map((v: any) => v.v1))] as string[]);
      setOpcoesVar2([...new Set(p.variacoes.map((v: any) => v.v2).filter((v: any) => v))] as string[]);
    }
  };

  const produtosFiltrados = produtos.filter(p => {
    return p.nome?.toLowerCase().includes(busca.toLowerCase()) &&
      (filtroCategoria === "Todos" || p.categoria === filtroCategoria) &&
      (filtroStatus === "Todos" || (filtroStatus === "Visíveis" ? p.ativo : !p.ativo));
  });

  const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina) || 1;
  const indiceUltimoItem = paginaAtual * itensPorPagina;
  const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
  const produtosPaginados = produtosFiltrados.slice(indicePrimeiroItem, indiceUltimoItem);

  if (isMobile === null) return null;

  return (
    <div style={{ width: '100%', maxWidth: '100vw', height: '100vh', background: '#f8fafc', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
      {/* MODAIS GLOBAIS */}
      {showDescModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginBottom: '10px' }}>Editar Descrição</h3>
            <textarea style={styles.modalTextarea} value={descricao} onChange={e => setDescricao(e.target.value)} autoFocus />
            <button type="button" onClick={() => setShowDescModal(false)} style={styles.btnSave}>Concluir</button>
          </div>
        </div>
      )}

      {showReqModal && (
        <RequisitosModal lojistaId={uid || ""} config={requisitos} onSave={(novos: any) => { setRequisitos(novos); setShowReqModal(false); }} onClose={() => setShowReqModal(false)} />
      )}
      <VariacoesModal key={showVarModal ? "aberto" : "fechado"} showVarModal={showVarModal} setShowVarModal={setShowVarModal} nomeVar1={nomeVar1} setNomeVar1={setNomeVar1} opcoesVar1={opcoesVar1} setOpcoesVar1={setOpcoesVar1} nomeVar2={nomeVar2} setNomeVar2={setNomeVar2} opcoesVar2={opcoesVar2} setOpcoesVar2={setOpcoesVar2} onCancel={() => { setTabelaPrecos({}); setShowVarModal(false); }} tabelaPrecos={tabelaPrecos} onSave={(novaTabela: any) => setTabelaPrecos(novaTabela)} gerarCombinacoes={gerarCombinacoes} sugerirSkus={sugerirSkus} />
      <EtiquetaModal isOpen={listaParaImprimir.length > 0} listaProdutos={listaParaImprimir} onClose={() => setListaParaImprimir([])} />
      {showCatManager && <CategoriaSubCat lojistaId={uid || ""} onClose={() => setShowCatManager(false)} limite={limites.categorias} />}
      {isModalSKUOpen && <ModalGeradorSKU lojistaId={uid || ""} onClose={() => setIsModalSKUOpen(false)} onSave={(codigo: string) => { setSku(codigo); setIsModalSKUOpen(false); }} />}

      {/* RENDERIZAÇÃO CONDICIONAL POR DISPOSITIVO */}
      {!isMobile ? (
        /* ================= VERSÃO PC (3 Colunas Fixas) ================= */
        <div style={{ display: 'flex', flexDirection: 'row', width: '100vw', height: '100vh', overflow: 'hidden', boxSizing: 'border-box', background: '#f8fafc' }}>
          
          {/* Main 1: Sidebar / Plano */}
          <div style={{ width: '260px', minWidth: '260px', maxWidth: '260px', background: '#fff', padding: '15px', overflowY: 'auto', borderRight: '1px solid #e2e8f0', boxSizing: 'border-box', height: '100vh' }}>
            <h3 style={styles.sideTitle}>📊 Painel Geral</h3>
            <div style={styles.planCard}>
              <p style={styles.planTitle}>Uso do Plano: {planoLojista}</p>
              <div style={{ marginBottom: '8px' }}>
                <div style={styles.planStats}><span>📦 Produtos</span><span>{produtos.length} / {limites.produtos}</span></div>
                <div style={styles.progressBarBg}><div style={{ ...styles.progressBarFill, width: `${Math.min((produtos.length / limites.produtos) * 100, 100)}%`, background: '#10b981' }} /></div>
              </div>
              <div>
                <div style={styles.planStats}><span>📁 Categorias</span><span>{listaCategorias.length} / {limites.categorias}</span></div>
                <div style={styles.progressBarBg}><div style={{ ...styles.progressBarFill, width: `${Math.min((listaCategorias.length / limites.categorias) * 100, 100)}%`, background: '#3b82f6' }} /></div>
              </div>
            </div>
          </div>

          {/* Main 2: Formulário do Produto */}
          <div style={{ width: '380px', minWidth: '380px', maxWidth: '380px', background: '#fff', padding: '15px', overflowY: 'auto', borderRight: '1px solid #e2e8f0', boxSizing: 'border-box', height: '100vh' }}>
            <h3 style={styles.sideTitle}>{editId ? "📝 Editar Produto" : "📦 Novo Produto"}</h3>
            <FormularioProduto
              nome={nome} setNome={setNome} sku={sku} setSku={setSku} setIsModalSKUOpen={setIsModalSKUOpen}
              categoria={categoria} setCategoria={setCategoria} subcategoria={subcategoria} setSubcategoria={setSubcategoria}
              listaCategorias={listaCategorias} setShowCatManager={setShowCatManager} descricao={descricao} setShowDescModal={setShowDescModal}
              precoBasico={precoBasico} setPrecoBasico={setPrecoBasico} custoUnitario={custoUnitario} setCustoUnitario={setCustoUnitario}
              temVariaveisComPreco={temVariaveisComPreco} setShowVarModal={setShowVarModal} setShowReqModal={setShowReqModal}
              requisitos={requisitos} formatInput={formatInput} imagens={imagens} setImagens={setImagens}
              files={files} setFiles={setFiles} uploading={uploading} setTipoCropAtual={setTipoCropAtual} setArquivoParaCortar={setArquivoParaCortar}
            />
            <SecaoLogistica
              envioTransportadora={envioTransportadora} setEnvioTransportadora={setEnvioTransportadora}
              permiteRetirada={permiteRetirada} setPermiteRetirada={setPermiteRetirada}
              peso={peso} setPeso={setPeso} comprimento={comprimento} setComprimento={setComprimento}
              largura={largura} setLargura={setLargura} altura={altura} setAltura={setAltura} formatInput={formatInput}
            />
            <button type="button" onClick={salvar} style={styles.btnSave}>
              {loading ? "Aguarde..." : editId ? "Atualizar Produto" : "Salvar Produto"}
            </button>
            <button type="button" onClick={limparForm} style={styles.btnCancel}>
              {editId ? "✖ Cancelar" : "🧹 Limpar"}
            </button>
          </div>

          {/* Main 3: Cards de Produtos + Paginação */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100vh', background: '#f8fafc' }}>
            <ListaProdutos
              produtos={produtos} produtosFiltrados={produtosPaginados} busca={busca} setBusca={setBusca}
              filtroCategoria={filtroCategoria} setFiltroCategoria={setFiltroCategoria} filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus}
              modoMassa={modoMassa} setModoMassa={setModoMassa} selecionados={selecionados} setSelecionados={setSelecionados}
              listaCategorias={listaCategorias} uid={uid} setListaParaImprimir={setListaParaImprimir} onEditar={carregarDadosProdutoParaEdicao}
            />
            {/* Paginação PC */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 10px', borderTop: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', marginTop: '15px' }}>
              <select value={itensPorPagina} onChange={e => setItensPorPagina(Number(e.target.value))} style={{ padding: '6px', borderRadius: '6px' }}>
                <option value={10}>10</option><option value={20}>20</option><option value={40}>40</option>
              </select>
              {produtosFiltrados.length > itensPorPagina && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button type="button" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} style={{ padding: '8px 12px', background: paginaAtual === 1 ? '#cbd5e1' : '#334155', color: '#fff', border: 'none', borderRadius: '6px' }}><FiChevronLeft /> Ant</button>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Pág {paginaAtual} de {totalPaginas}</span>
                  <button type="button" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} style={{ padding: '8px 12px', background: paginaAtual === totalPaginas ? '#cbd5e1' : '#334155', color: '#fff', border: 'none', borderRadius: '6px' }}>Próx <FiChevronRight /></button>
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* ================= VERSÃO MOBILE ISOLADA (3 BLOCOS INDEPENDENTES) ================= */
        <div style={{ width: '100%', minHeight: '100vh', background: '#f8fafc', position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
          
          {/* BARRA SUPERIOR MOBILE */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 15px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 99, boxSizing: 'border-box', width: '100%' }}>
            <button type="button" onClick={() => setIsOpenLeft(true)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FiMenu /> <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Painel</span>
            </button>

            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Produtos</span>

            <button type="button" onClick={() => { limparForm(); setIsOpenRight(true); }} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FiEdit3 /> Novo
            </button>
          </div>

          {/* MAIN 3: TELA PRINCIPAL APENAS COM OS CARDS DE PRODUTOS */}
          <div style={{ width: '100%', padding: '10px', boxSizing: 'border-box', paddingBottom: '90px', flex: 1 }}>
            <ListaProdutos
              produtos={produtos}
              produtosFiltrados={produtosPaginados}
              busca={busca} setBusca={setBusca}
              filtroCategoria={filtroCategoria} setFiltroCategoria={setFiltroCategoria}
              filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus}
              modoMassa={modoMassa} setModoMassa={setModoMassa}
              selecionados={selecionados} setSelecionados={setSelecionados}
              listaCategorias={listaCategorias}
              uid={uid}
              setListaParaImprimir={setListaParaImprimir}
              onEditar={(p: any) => {
                carregarDadosProdutoParaEdicao(p);
                setIsOpenRight(true);
              }}
            />

            {/* Paginação Mobile */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderTop: '1px solid #e2e8f0', marginTop: '15px', background: '#fff', borderRadius: '8px', boxSizing: 'border-box' }}>
              <select value={itensPorPagina} onChange={e => setItensPorPagina(Number(e.target.value))} style={{ padding: '6px', fontSize: '11px', borderRadius: '6px' }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={40}>40</option>
              </select>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} style={{ padding: '6px 10px', background: paginaAtual === 1 ? '#cbd5e1' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px' }}>
                  <FiChevronLeft /> Ant
                </button>
                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{paginaAtual}/{totalPaginas}</span>
                <button type="button" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} style={{ padding: '6px 10px', background: paginaAtual === totalPaginas ? '#cbd5e1' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px' }}>
                  Próx <FiChevronRight />
                </button>
              </div>
            </div>
          </div>

          {/* BOTÃO FLUTUANTE (FAB) PARA ADICIONAR NOVO PRODUTO */}
          <button
            type="button"
            onClick={() => { limparForm(); setIsOpenRight(true); }}
            style={{ position: 'fixed', bottom: '20px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', background: '#10b981', color: '#fff', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', zIndex: 998, cursor: 'pointer' }}
          >
            <FiPlus />
          </button>

          {/* OVERLAY ESCURO COM FADE */}
          <div 
            onClick={() => { setIsOpenLeft(false); setIsOpenRight(false); }} 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              background: 'rgba(0,0,0,0.5)', 
              zIndex: 1999, 
              opacity: (isOpenLeft || isOpenRight) ? 1 : 0, 
              pointerEvents: (isOpenLeft || isOpenRight) ? 'auto' : 'none', 
              transition: 'opacity 0.3s ease-in-out' 
            }} 
          />

          {/* MAIN 1 (GAVETA ESQUERDA - PAINEL / PLANO) */}
          <div style={{ position: 'fixed', top: 0, left: 0, width: '85%', maxWidth: '320px', height: '100vh', background: '#fff', zIndex: 2000, boxShadow: '5px 0 15px rgba(0,0,0,0.1)', overflowY: 'auto', padding: '15px', boxSizing: 'border-box', transition: 'transform 0.3s ease-in-out', transform: isOpenLeft ? 'translateX(0)' : 'translateX(-100%)', visibility: isOpenLeft ? 'visible' : 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={styles.sideTitle}>📊 Painel & Plano</h3>
              <button type="button" onClick={() => setIsOpenLeft(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}><FiX /></button>
            </div>
            
            <div style={styles.planCard}>
              <p style={styles.planTitle}>Uso do Plano: {planoLojista}</p>
              <div style={{ marginBottom: '8px' }}>
                <div style={styles.planStats}><span>📦 Produtos</span><span>{produtos.length} / {limites.produtos}</span></div>
                <div style={styles.progressBarBg}><div style={{ ...styles.progressBarFill, width: `${Math.min((produtos.length / limites.produtos) * 100, 100)}%`, background: '#10b981' }} /></div>
              </div>
              <div>
                <div style={styles.planStats}><span>📁 Categorias</span><span>{listaCategorias.length} / {limites.categorias}</span></div>
                <div style={styles.progressBarBg}><div style={{ ...styles.progressBarFill, width: `${Math.min((listaCategorias.length / limites.categorias) * 100, 100)}%`, background: '#3b82f6' }} /></div>
              </div>
            </div>
          </div>

          {/* MAIN 2 (GAVETA DIREITA - FORMULÁRIO DE PRODUTO) */}
          <div style={{ position: 'fixed', top: 0, right: 0, width: '90%', maxWidth: '400px', height: '100vh', background: '#fff', zIndex: 2000, boxShadow: '-5px 0 15px rgba(0,0,0,0.1)', overflowY: 'auto', padding: '15px', boxSizing: 'border-box', transition: 'transform 0.3s ease-in-out', transform: isOpenRight ? 'translateX(0)' : 'translateX(100%)', visibility: isOpenRight ? 'visible' : 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={styles.sideTitle}>{editId ? "📝 Editar Produto" : "📦 Novo Produto"}</h3>
              <button type="button" onClick={() => setIsOpenRight(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}><FiX /></button>
            </div>

            <FormularioProduto
              nome={nome} setNome={setNome}
              sku={sku} setSku={setSku}
              setIsModalSKUOpen={setIsModalSKUOpen}
              categoria={categoria} setCategoria={setCategoria}
              subcategoria={subcategoria} setSubcategoria={setSubcategoria}
              listaCategorias={listaCategorias}
              setShowCatManager={setShowCatManager}
              descricao={descricao} setShowDescModal={setShowDescModal}
              precoBasico={precoBasico} setPrecoBasico={setPrecoBasico}
              custoUnitario={custoUnitario} setCustoUnitario={setCustoUnitario}
              temVariaveisComPreco={temVariaveisComPreco}
              setShowVarModal={setShowVarModal}
              setShowReqModal={setShowReqModal}
              requisitos={requisitos}
              formatInput={formatInput}
              imagens={imagens} setImagens={setImagens}
              files={files} setFiles={setFiles}
              uploading={uploading}
              setTipoCropAtual={setTipoCropAtual}
              setArquivoParaCortar={setArquivoParaCortar}
            />

            <SecaoLogistica
              envioTransportadora={envioTransportadora} setEnvioTransportadora={setEnvioTransportadora}
              permiteRetirada={permiteRetirada} setPermiteRetirada={setPermiteRetirada}
              peso={peso} setPeso={setPeso}
              comprimento={comprimento} setComprimento={setComprimento}
              largura={largura} setLargura={setLargura}
              altura={altura} setAltura={setAltura}
              formatInput={formatInput}
            />

            <button type="button" onClick={async () => { await salvar(); setIsOpenRight(false); }} style={styles.btnSave}>
              {loading ? "Aguarde..." : editId ? "Atualizar Produto" : "Salvar Produto"}
            </button>
            <button type="button" onClick={() => { limparForm(); setIsOpenRight(false); }} style={styles.btnCancel}>
              ✖ Cancelar
            </button>
          </div>

        </div>
      )}

      {arquivoParaCortar && (
        <ImageCropperModal file={arquivoParaCortar} onCropComplete={async (croppedBlob) => { setArquivoParaCortar(null); const arquivoFinal = new File([croppedBlob], `produto_${Date.now()}.jpg`, { type: "image/jpeg" }); if (tipoCropAtual === "principal") { setFiles(prev => [...prev, arquivoFinal]); } }} onCancel={() => setArquivoParaCortar(null)} />
      )}
    </div>
  );
}