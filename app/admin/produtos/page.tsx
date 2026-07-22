"use client";
import { excluirProdutoCompleto } from "@/utils/exclusao";
import { useEffect, useState, useRef, useCallback } from "react";
import { db, auth, storage } from "@/lib/firebase";
import {
  collection, addDoc, doc, query, orderBy, updateDoc,
  deleteDoc, onSnapshot, writeBatch, setDoc, getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadString, deleteObject } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FiDownload, FiSettings } from "react-icons/fi";

// --- IMPORTAÇÃO DOS ESTADOS E MODAIS ---
import { styles } from "./styles";
import RequisitosModal from "@/app/admin/_components/RequisitosModal";
import VariacoesModal from "@/app/admin/_components/VariacoesModal";
import CategoriaSubCat from "@/app/admin/_components/CategoriaSubCat";
import ModalGeradorSKU from "@/app/admin/_components/ModalGeradorSKU";
import EtiquetaModal from "@/app/admin/_components/EtiquetaModal";

import { getPlanoEfetivo } from "@/utils/planoAtivo";

// --- CONFIGURAÇÃO DE SEGURANÇA E PLANOS ---

const PALAVRAS_PROIBIDAS = [
  "admin", "master", "suporte", "festaemtopo", "root", "null",
  "undefined", "api", "vendas", "financeiro", "ajuda", "config",
  "sistema", "login", "auth", "teste", "gerente", "houseconviteria",
  "chefe"
];

export default function CadastroProdutos() {
  const [uid, setUid] = useState<string | null>(null);
  const [planoLojista, setPlanoLojista] = useState("Bronze");
  const [planosMaster, setPlanosMaster] = useState<any>(null);
  const [limites, setLimites] = useState({ produtos: 0, categorias: 0 });

  const [nome, setNome] = useState("");
  const [sku, setSku] = useState("");
  const [isModalSKUOpen, setIsModalSKUOpen] = useState(false);
  const [listaParaImprimir, setListaParaImprimir] = useState<any[]>([]); // ESTADO NOVO
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

  const getProdutoId = useCallback(() => {
    if (editId) return editId;
    if (!produtoIdAtual) {
      if (!uid) return ""; // Proteção caso o uid ainda não tenha carregado
      const novoId = doc(collection(db, "lojistas", uid, "produtos")).id;
      setProdutoIdAtual(novoId);
      return novoId;
    }
    return produtoIdAtual;
  }, [editId, produtoIdAtual, uid]);
  // --- SINCRONIZAÇÃO DE LIMITES ---

  // Substitua o useEffect de carregamento por este bloco único e limpo:

  useEffect(() => {
    // Inicializa o listener de Planos do Banco
    const unsubMaster = onSnapshot(doc(db, "configuracoes", "planos"), (snap) => {
      if (snap.exists()) setPlanosMaster(snap.data());
    });

    // Ouve autenticação
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setUid(user.uid);
    });

    return () => { unsubMaster(); unsubAuth(); };
  }, []);

  // Este segundo useEffect é o ÚNICO responsável por recalcular quando algo muda
  // --- SINCRONIZAÇÃO DE LIMITES E DADOS ---
  useEffect(() => {
    // 1. Escuta as configurações globais de planos
    const unsubMaster = onSnapshot(doc(db, "configuracoes", "planos"), (snap) => {
      if (snap.exists()) setPlanosMaster(snap.data());
    });

    // 2. Ouve o estado de autenticação
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else setUid(null);
    });

    return () => { unsubMaster(); unsubAuth(); };
  }, []);

  // --- CARREGAMENTO DE DADOS DO LOJISTA (Reage sempre que uid ou planosMaster mudar) ---
  useEffect(() => {
    if (!uid || !planosMaster) return; // ESPERA os dois estarem prontos

    // Listener de Configurações do Lojista
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

    // Listener de PRODUTOS (Agora dentro do bloco que garante o uid)
    const qProdutos = query(collection(db, "lojistas", uid, "produtos"), orderBy("createdAt", "desc"));
    const unsubProdutos = onSnapshot(qProdutos, (snap) => {
      setProdutos(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          imagens: data.imagens || [],      // Se for undefined, vira []
          variacoes: data.variacoes || []    // Se for undefined, vira []
        };
      }));
    });

    // Listener de CATEGORIAS
    const qCategorias = query(collection(db, "lojistas", uid, "categorias"), orderBy("nome", "asc"));
    const unsubCategorias = onSnapshot(qCategorias, (snap) => {
      setListaCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubLojista();
      unsubProdutos();
      unsubCategorias();
    };
  }, [uid, planosMaster]);


  const exportarProdutosCSV = () => {
    if (planoLojista === "Bronze") {
      alert("A exportação de relatórios está disponível apenas nos planos Prata e Ouro.");
      return;
    }
    if (produtosFiltrados.length === 0) {
      alert("Não há produtos para exportar.");
      return;
    }
    const cabecalho = ["SKU", "ID Produto", "Nome", "Variacao/Grade", "Categoria", "Preco Venda", "Custo", "Status", "Peso(kg)", "Medidas", "Personalizavel"];
    const linhas: any[] = [];
    produtosFiltrados.forEach(p => {
      const sku = p.sku || "SEM-SKU";
      if (p.temVariacoes && p.variacoes && p.variacoes.length > 0) {
        p.variacoes.forEach((v: any) => {
          linhas.push([sku, p.id, `"${p.nome?.replace(/"/g, '""')}"`, `"${v.nome?.replace(/"/g, '""')}"`, `"${p.categoria || ""}"`, v.preco || p.precoBasico, v.custo || p.custoUnitario || "0.00", p.ativo ? "Visivel" : "Oculto", p.peso || "0", `${p.comprimento || 0}x${p.largura || 0}x${p.altura || 0}`, p.requisitos ? "Sim" : "Nao"]);
        });
      } else {
        linhas.push([sku, p.id, `"${p.nome?.replace(/"/g, '""')}"`, "Unico", `"${p.categoria || ""}"`, p.precoBasico, p.custoUnitario || "0.00", p.ativo ? "Visivel" : "Oculto", p.peso || "0", `${p.comprimento || 0}x${p.largura || 0}x${p.altura || 0}`, p.requisitos ? "Sim" : "Nao"]);
      }
    });
    const csvContent = "\ufeff" + [cabecalho.join(";"), ...linhas.map(l => l.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_produtos_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    link.click();
  };

  const comprimirImagem = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 1000; // Tamanho padrão de saída
          canvas.width = size;
          canvas.height = size;

          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("Erro no canvas");

          // 1. Fundo branco (evita transparência estranha e padroniza)
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, size, size);

          // 2. Cálculo para centralizar a imagem sem esticar (mantém a proporção)
          const ratio = Math.min(size / img.width, size / img.height);
          const newWidth = img.width * ratio;
          const newHeight = img.height * ratio;
          const x = (size - newWidth) / 2;
          const y = (size - newHeight) / 2;

          // 3. Desenha a imagem centralizada
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, x, y, newWidth, newHeight);

          // 4. Exporta com qualidade alta em WebP
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject("Erro ao gerar blob");
          }, "image/webp", 0.85); // 0.85 é o equilíbrio perfeito entre peso e nitidez
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

  const calcularLucro = (venda: string, custo: string) => {
    const v = parseFloat(venda);
    const c = parseFloat(custo);
    if (!v || !c || c === 0) return null;
    return (((v - c) / c) * 100).toFixed(0);
  };

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
      alert("Por favor, preencha o SKU Base do produto antes de gerar as variações.");
      return;
    }
    const combos = gerarCombinacoes();
    const novaTabela = { ...tabelaAtual };
    combos.forEach(c => {
      if (!novaTabela[c.key]?.sku) {
        const sufixo1 = c.v1 ? c.v1.substring(0, 3).toUpperCase() : "";
        const sufixo2 = c.v2 ? `-${c.v2.substring(0, 3).toUpperCase()}` : "";
        novaTabela[c.key] = {
          ...novaTabela[c.key],
          sku: `${sku}-${sufixo1}${sufixo2}`.toUpperCase()
        };
      }
    });
    setTabela({ ...novaTabela });
  };

  async function uploadImagens() {
    if (!uid) return;
    const pid = getProdutoId();

    if (imagens.length + files.length > 4) return alert("Máximo 4 fotos.");
    if (files.some(f => f.size > 5 * 1024 * 1024)) return alert("Arquivo muito grande.");

    setUploading(true);
    for (let file of files) {
      try {
        const blob = await comprimirImagem(file);
        const fileName = `${Date.now()}-${file.name.split('.')[0]}.webp`;

        const storageRef = ref(storage, `lojistas/${uid}/produtos/${pid}/galeria/${fileName}`);
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        setImagens(prev => [...prev, downloadURL]);
      } catch (e) { console.error("Erro no upload:", e); }
    }
    setFiles([]);
    setUploading(false);
  }

  async function acaoEmMassa(tipo: string) {
    if (selecionados.length === 0 || !uid) return;

    // LÓGICA ESPECIAL PARA EXCLUSÃO (Limpa fotos + documento)
    if (tipo === 'excluir') {
      if (!confirm(`Excluir ${selecionados.length} produtos e todas as fotos associadas?`)) return;

      try {
        setLoading(true);
        // Itera sobre os produtos selecionados e usa a função utilitária
        for (const id of selecionados) {
          const p = produtos.find(item => item.id === id);
          if (p) {
            await excluirProdutoCompleto(uid!, p);
          }
        }

        setSelecionados([]);
        setModoMassa(false);
        alert("Produtos e fotos excluídos com sucesso!");
      } catch (e) {
        console.error("Erro na exclusão em massa:", e);
        alert("Erro ao excluir.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // LÓGICA PARA OUTROS TIPOS (mostrar, ocultar, preco)
    const batch = writeBatch(db);
    let precoFormatado = "";
    if (tipo === 'preco') {
      const p = prompt("Digite o novo preço (ex: 1250 para R$ 12,50):");
      if (!p) return;
      const apenasNumeros = p.replace(/\D/g, "");
      if (!apenasNumeros) return alert("Valor inválido.");
      precoFormatado = (parseInt(apenasNumeros) / 100).toFixed(2);
    }

    for (const id of selecionados) {
      const pref = doc(db, "lojistas", uid, "produtos", id);
      if (tipo === 'ocultar') batch.update(pref, { ativo: false });
      if (tipo === 'mostrar') batch.update(pref, { ativo: true });
      if (tipo === 'preco') batch.update(pref, { precoBasico: precoFormatado });
    }

    try {
      await batch.commit();
      setSelecionados([]);
      setModoMassa(false);
    } catch (e) {
      alert("Erro ao processar.");
    }
  }

  async function salvar() {
    if (!uid) return;
    if (!editId && produtos.length >= limites.produtos) {
      alert(`Limite atingido!`);
      return;
    }
    if (!validarTexto(nome) || !nome.trim()) return alert("Nome inválido.");
    if (!categoria) return alert("Selecione uma categoria.");
    if (imagens.length === 0 && files.length === 0) return alert("Adicione uma foto.");

    setLoading(true);
    try {
      const produtoId = getProdutoId();
      let novasImagens = [...imagens]; // As que já estão na nuvem

      // 1. UPLOAD DAS NOVAS FOTOS (apenas as que o usuário selecionou agora)
      for (let file of files) {
        const blob = await comprimirImagem(file);
        const fileName = `${Date.now()}-${file.name.split('.')[0]}.webp`;
        const storageRef = ref(storage, `lojistas/${uid}/produtos/${produtoId}/galeria/${fileName}`);
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        novasImagens.push(downloadURL);
      }

      // 2. LIMPEZA INTELIGENTE (só deleta se não estiver mais na lista)
      if (editId) {
        const docRefAntigo = doc(db, "lojistas", uid, "produtos", editId);
        const docSnapAntigo = await getDoc(docRefAntigo);
        if (docSnapAntigo.exists()) {
          const dadosAntigos = docSnapAntigo.data();
          const fotosAntigas = dadosAntigos.imagens || [];
          for (const url of fotosAntigas) {
            if (!novasImagens.includes(url)) {
              try { await deleteObject(ref(storage, url)); } catch (e) { console.warn("Erro ao deletar:", e); }
            }
          }
        }
      }

      // 3. RESTANTE DO SEU CÓDIGO DE VARIAÇÕES E SALVAMENTO
      const novaTabelaPrecos = { ...tabelaPrecos };
      const keys = Object.keys(tabelaPrecos);
      for (const key of keys) {
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
        imagens: novasImagens, // Usa a lista atualizada
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

      alert("Sucesso!");
      limparForm();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar.");
    }
    setLoading(false);
  }
  const limparForm = () => {
    setNome(""); setSku(""); setDescricao(""); setCategoria(""); setSubcategoria(""); setPrecoBasico(""); setCustoUnitario("");
    setPeso(""); setComprimento(""); setLargura(""); setAltura(""); setImagens([]); setEditId(null); setFiles([]); setEnvioTransportadora(true); setPermiteRetirada(false);
    setOpcoesVar1([]); setOpcoesVar2([]); setNomeVar1(""); setNomeVar2(""); setTabelaPrecos({});
    setRequisitos({ pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false });

    // ADICIONE ISSO:
    setProdutoIdAtual(null);
  };

  const handleConfirmarGrade = (novaTabela: any) => { setTabelaPrecos(novaTabela); };

  const resetarCamposVariacoes = () => {
    setNomeVar1(""); setOpcoesVar1([]); setNomeVar2(""); setOpcoesVar2([]); setTabelaPrecos({}); setShowVarModal(false);
  };

  const produtosFiltrados = produtos.filter(p => {
    return p.nome?.toLowerCase().includes(busca.toLowerCase()) &&
      (filtroCategoria === "Todos" || p.categoria === filtroCategoria) &&
      (filtroStatus === "Todos" || (filtroStatus === "Visíveis" ? p.ativo : !p.ativo));
  });

  return (
    <div style={styles.page}>
      {showDescModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginBottom: '10px' }}>Editar Descrição</h3>
            <textarea style={styles.modalTextarea} value={descricao} onChange={e => setDescricao(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={() => setShowDescModal(false)} style={styles.btnSave}>Concluir</button>
            </div>
          </div>
        </div>
      )}

      {showReqModal && (
        <RequisitosModal
          lojistaId={uid || ""}
          config={requisitos}
          onSave={(novos: any) => { setRequisitos(novos); setShowReqModal(false); }}
          onClose={() => setShowReqModal(false)}
        />
      )}

      <VariacoesModal
        key={showVarModal ? "aberto" : "fechado"}
        showVarModal={showVarModal}
        setShowVarModal={setShowVarModal}
        nomeVar1={nomeVar1} setNomeVar1={setNomeVar1}
        opcoesVar1={opcoesVar1} setOpcoesVar1={setOpcoesVar1}
        nomeVar2={nomeVar2} setNomeVar2={setNomeVar2}
        opcoesVar2={opcoesVar2} setOpcoesVar2={setOpcoesVar2}
        onCancel={resetarCamposVariacoes}
        tabelaPrecos={tabelaPrecos}
        onSave={handleConfirmarGrade}
        gerarCombinacoes={gerarCombinacoes}
        sugerirSkus={sugerirSkus}
      />

      <EtiquetaModal
        isOpen={listaParaImprimir.length > 0}
        listaProdutos={listaParaImprimir}
        onClose={() => setListaParaImprimir([])}
      />

      {showCatManager && (
        <CategoriaSubCat
          lojistaId={uid || ""}
          onClose={() => setShowCatManager(false)}
          limite={limites.categorias}
        />
      )}

      {isModalSKUOpen && (
        <ModalGeradorSKU
          lojistaId={uid || ""}
          onClose={() => setIsModalSKUOpen(false)}
          onSave={(codigo: string) => { setSku(codigo); setIsModalSKUOpen(false); }}
        />
      )}

      <div style={styles.sidebar}>
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '11px', margin: '0 0 8px 0', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Uso do Plano: {planoLojista}</p>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
              <span>📦 Produtos</span>
              <span>{produtos.length} / {limites.produtos}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((produtos.length / limites.produtos) * 100, 100)}%`, height: '100%', background: produtos.length >= limites.produtos ? '#ef4444' : '#10b981', transition: '0.3s' }} />
            </div>
          </div>
          <div style={{ marginBottom: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
              <span>📁 Categorias</span>
              <span>{listaCategorias.length} / {limites.categorias}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((listaCategorias.length / limites.categorias) * 100, 100)}%`, height: '100%', background: listaCategorias.length >= limites.categorias ? '#ef4444' : '#3b82f6', transition: '0.3s' }} />
            </div>
          </div>
        </div>

        <h3 style={styles.sideTitle}>{editId ? "📝 Editar Produto" : "📦 Novo Produto"}</h3>
        <input style={styles.input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do Produto *" />

        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block', marginTop: '10px' }}>SKU (Código)</label>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
          <input style={{ ...styles.input, marginBottom: 0 }} value={sku} onChange={e => setSku(e.target.value.toUpperCase())} placeholder="Ex: CAM-AZU-G" />
          <button type="button" onClick={() => setIsModalSKUOpen(true)} style={{ padding: '0 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Gen</button>
        </div>

        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
          <select style={{ ...styles.input, marginBottom: 0, flex: 1 }} value={categoria} onChange={e => { setCategoria(e.target.value); setSubcategoria(""); }}>
            <option value="">Categoria... *</option>
            {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          <button onClick={() => setShowCatManager(true)} style={styles.btnActionSmall}><FiSettings /></button>
        </div>

        {categoria && listaCategorias.find(c => c.nome === categoria)?.subcategorias?.length > 0 && (
          <select style={styles.input} value={subcategoria} onChange={e => setSubcategoria(e.target.value)}>
            <option value="">Subcategoria (Opcional)</option>
            {listaCategorias.find(c => c.nome === categoria).subcategorias.map((sub: string, i: number) => (
              <option key={i} value={sub}>{sub}</option>
            ))}
          </select>
        )}

        <button onClick={() => setShowVarModal(true)} style={{ ...styles.btnUpload, border: '1px solid #ee4d2d', color: '#ee4d2d', fontWeight: 'bold', marginBottom: '10px' }}>
          {temVariaveisComPreco ? "⚙️ Editar Grade" : "➕ Adicionar Grade"}
        </button>

        <button onClick={() => setShowReqModal(true)} style={{ ...styles.btnUpload, border: '1px solid #d946ef', color: '#d946ef', fontWeight: 'bold', marginBottom: '10px' }}>
          🎯 Personalização ({Object.values(requisitos || {}).filter(Boolean).length})
        </button>

        <div style={{ ...styles.boxGray, marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block' }}>Configurações de Entrega</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ ...styles.checkLabel, cursor: 'pointer' }}>
              <input type="checkbox" checked={envioTransportadora} onChange={e => setEnvioTransportadora(e.target.checked)} />
              <span>Envio por Transportadora</span>
            </label>
            <label style={{ ...styles.checkLabel, cursor: 'pointer' }}>
              <input type="checkbox" checked={permiteRetirada} onChange={e => setPermiteRetirada(e.target.checked)} />
              <span>Permitir Retirada na Loja</span>
            </label>
          </div>
        </div>

        <textarea style={styles.textarea} value={descricao} onClick={() => setShowDescModal(true)} readOnly placeholder="Descrição... *" />

        {envioTransportadora ? (
          <div style={styles.boxGray}>
            <label style={styles.miniLabel}>Medidas Melhor Envio *</label>
            <div style={styles.grid2}>
              <input style={styles.inputSmall} value={peso} onChange={e => formatInput(e.target.value, setPeso)} placeholder="Peso kg" />
              <input style={styles.inputSmall} value={comprimento} onChange={e => formatInput(e.target.value, setComprimento)} placeholder="Comp cm" />
              <input style={styles.inputSmall} value={largura} onChange={e => formatInput(e.target.value, setLargura)} placeholder="Larg cm" />
              <input style={styles.inputSmall} value={altura} onChange={e => formatInput(e.target.value, setAltura)} placeholder="Alt cm" />
            </div>
          </div>
        ) : (
          <div style={{ ...styles.boxGray, background: '#fef2f2', border: '1px solid #fee2e2' }}>
            <p style={{ fontSize: '11px', color: '#b91c1c', margin: 0, fontWeight: 'bold', textAlign: 'center' }}>
              {permiteRetirada ? '🏪 Produto para Retirada' : '📧 Produto Digital'}
            </p>
          </div>
        )}

        <div style={{ ...styles.boxGray, opacity: temVariaveisComPreco ? 0.6 : 1 }}>
          <label style={styles.miniLabel}>Valores R$</label>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input disabled={temVariaveisComPreco} style={{ ...styles.input, marginBottom: 0 }} value={temVariaveisComPreco ? "Grade" : precoBasico} onChange={e => formatInput(e.target.value, setPrecoBasico)} placeholder="Venda" />
            <input disabled={temVariaveisComPreco} style={{ ...styles.input, marginBottom: 0 }} value={temVariaveisComPreco ? "Grade" : custoUnitario} onChange={e => formatInput(e.target.value, setCustoUnitario)} placeholder="Custo" />
          </div>
        </div>

        <div style={styles.previewGrid}>
          {imagens.map((img, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={img} style={styles.imgThumb} />
              <button onClick={() => setImagens(imagens.filter((_, idx) => idx !== i))} style={styles.btnDelImg}>×</button>
            </div>
          ))}
          {files.map((f, i) => (
            <img key={i} src={URL.createObjectURL(f)} style={{ ...styles.imgThumb, border: '2px solid #3b82f6' }} />
          ))}
        </div>

        <button style={styles.btnUpload}>
          <input type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files || []))} style={styles.fileInvis} />
          {uploading ? "Enviando..." : "📷 Fotos *"}
        </button>
        {/*{files.length > 0 && <button onClick={uploadImagens} style={styles.btnConfirmImgs}>Confirmar Fotos</button>}*/}

        <button onClick={salvar} style={styles.btnSave}>{loading ? "Aguarde..." : editId ? "Atualizar Produto" : "Salvar Produto"}</button>
        <button onClick={limparForm} style={styles.btnCancel}>{editId ? "✖ Cancelar" : "🧹 Limpar"}</button>
      </div>

      <div style={styles.main}>
        <div style={styles.topHeader}>
          <div style={styles.filterRow}>
            <input style={styles.searchBar} placeholder="🔍 Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} />
            <select style={styles.selectTop} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="Todos">Categorias</option>
              {listaCategorias.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
            <select style={styles.selectStatus} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="Todos">Status</option>
              <option value="Visíveis">✅</option>
              <option value="Ocultos">🚫</option>
            </select>
            <button onClick={() => setModoMassa(!modoMassa)} style={{ ...styles.btnGeneric, background: modoMassa ? '#3b82f6' : '#fff', color: modoMassa ? '#fff' : '#3b82f6' }}>Massa</button>
            <button onClick={exportarProdutosCSV} style={{ ...styles.btnGeneric, background: '#10b981', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FiDownload /> Exportar
            </button>
          </div>

          {modoMassa && (
            <div style={styles.massPanel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => setSelecionados(selecionados.length === produtosFiltrados.length ? [] : produtosFiltrados.map(p => p.id))} style={{ ...styles.btnMass, borderColor: '#cbd5e1' }}>
                  {selecionados.length === produtosFiltrados.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </button>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e40af' }}>{selecionados.length} itens selecionados</span>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => acaoEmMassa('mostrar')} style={{ ...styles.btnMass, color: '#059669' }}>👁️ Mostrar</button>
                <button onClick={() => acaoEmMassa('ocultar')} style={{ ...styles.btnMass, color: '#64748b' }}>🚫 Ocultar</button>
                <button onClick={() => acaoEmMassa('preco')} style={{ ...styles.btnMass, color: '#3b82f6' }}>💰 Preço</button>
                <button onClick={() => acaoEmMassa('excluir')} style={{ ...styles.btnMass, color: '#ef4444', borderColor: '#fecaca' }}>🗑️ Excluir</button>
                <button onClick={() => {
                  const selecionadosObj = produtos.filter(p => selecionados.includes(p.id));
                  setListaParaImprimir(selecionadosObj);
                }} style={{ ...styles.btnMass, color: '#f59e0b' }}>🖨️ Imprimir Selecionados</button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.productGrid}>
          {produtosFiltrados.map(p => {
            const lucro = calcularLucro(p.precoBasico, p.custoUnitario);
            return (
              <div key={p.id} style={{ ...styles.card, opacity: p.ativo ? 1 : 0.6 }}>
                {p.destaque && <span style={styles.starBadge}>⭐</span>}
                {modoMassa && <input type="checkbox" style={styles.cardCheck} checked={selecionados.includes(p.id)} onChange={e => e.target.checked ? setSelecionados([...selecionados, p.id]) : setSelecionados(selecionados.filter(id => id !== p.id))} />}
                <img src={p.capa} style={styles.cardImg} alt={p.nome} />
                <div style={styles.cardBody}>
                  <h4 style={styles.cardTitle}>{p.nome}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <span style={styles.cardPrice}>R$ {p.precoBasico}</span>
                    {lucro && <span style={styles.markupTag}>+{lucro}%</span>}
                  </div>
                  <div style={styles.cardActions}>
                    <button onClick={() => uid && updateDoc(doc(db, "lojistas", uid, "produtos", p.id), { destaque: !p.destaque })} style={styles.btnSlim}>{p.destaque ? "⭐ Destacado" : "☆ Destacar"}</button>
                    <button onClick={() => {
                      // (sua lógica de editar mantida)
                      setEditId(p.id); setNome(p.nome); setSku(p.sku || ""); setCategoria(p.categoria || ""); setSubcategoria(p.subcategoria || "");
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
                    }} style={styles.btnSlim}>✏️ Editar</button>

                    {/* Botão Ocultar/Mostrar */}
                    <button onClick={() => uid && updateDoc(doc(db, "lojistas", uid, "produtos", p.id), { ativo: !p.ativo })} style={styles.btnSlim}>{p.ativo ? "🚫 Ocultar" : "👁️ Mostrar"}</button>

                    {/* Botão Imprimir Etiqueta (NOVA POSIÇÃO) */}

                    <button
                      onClick={async () => {
                        if (!uid) return;
                        setLoading(true);
                        try {
                          await excluirProdutoCompleto(uid, p);
                          alert("Produto excluído com sucesso!");
                        } catch (e) {
                          console.error(e);
                          alert("Erro ao excluir produto.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      style={styles.btnDelete}
                    >
                      🗑️ Excluir
                    </button>
                    <button onClick={() => setListaParaImprimir([p])} style={{ ...styles.btnSlim, background: '#f59e0b', color: '#fff', fontSize: '12px' }}>🖨️ Etiqueta</button>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}