// app/admin/produtos/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { db, auth, storage } from "@/lib/firebase";
import {
    collection, doc, query, orderBy, updateDoc,
    setDoc, onSnapshot
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FiChevronLeft, FiChevronRight, FiMenu, FiX, FiPlus } from "react-icons/fi";

import FormularioProduto from "./_components/FormularioProduto";
import ListaProdutos from "./_components/ListaProdutos";
import { duplicarProduto } from "@/utils/duplicarProduto";

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

// ✨ Função auxiliar para converter o valor formatado da tela ("1,50") para número decimal real (1.5) para o Firebase
const converterParaNumeroBanco = (valor: any): number => {
    if (!valor) return 0;
    const limpo = valor.toString().replace(/\./g, "").replace(",", ".");
    const numero = parseFloat(limpo);
    return isNaN(numero) ? 0 : numero;
};

export default function CadastroProdutos() {
    const [uid, setUid] = useState<string | null>(null);
    const [planoLojista, setPlanoLojista] = useState("Bronze");
    const [planosMaster, setPlanosMaster] = useState<any>(null);
    const [limites, setLimites] = useState({ produtos: 0, categorias: 0 });

    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isOpenLeft, setIsOpenLeft] = useState(false);

    // Estado para controlar a Tela Deslizante de Cadastro/Edição
    const [isPainelAberto, setIsPainelAberto] = useState(false);

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
    const [estoque, setEstoque] = useState("");
    const [estoqueMinimo, setEstoqueMinimo] = useState("");
    const [ativo, setAtivo] = useState(true);

    const [dsTipoProduto, setDsTipoProduto] = useState("Fisico_Sem");
    const [nrDiasProducao, setNrDiasProducao] = useState("");

    // ✨ Novo estado para pesos e medidas por variação
    const [pesosDiferentesPorVariacao, setPesosDiferentesPorVariacao] = useState(false);

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
        const checkScreen = () => setIsMobile(window.innerWidth <= 768);
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

    const validarProdutoParaSalvar = () => {
        if (!nome || !nome.trim()) {
            alert("Preencha o Nome do produto.");
            return false;
        }
        if (!descricao || !descricao.trim()) {
            alert("Preencha a Descrição do produto.");
            return false;
        }
        if (!temVariaveisComPreco) {
            if (!precoBasico || parseFloat(precoBasico.replace(',', '.')) <= 0) {
                alert("Informe o preço de Venda.");
                return false;
            }
            if (!custoUnitario || parseFloat(custoUnitario.replace(',', '.')) < 0) {
                alert("Informe o Custo Unitário.");
                return false;
            }
        }
        if ((!imagens || imagens.length === 0) && (!files || files.length === 0)) {
            alert("Adicione pelo menos uma foto ao produto.");
            return false;
        }

        // ✨ Validação de frete restrita apenas a produtos que exigem frete
        const precisaFreteValidacao = dsTipoProduto !== 'digital_download' && dsTipoProduto !== 'Digital_Personalizado';
        if (precisaFreteValidacao) {
            if (pesosDiferentesPorVariacao) {
                const combos = gerarCombinacoes();
                for (const c of combos) {
                    const item = tabelaPrecos[c.key];
                    if (!item?.peso || !item?.comprimento || !item?.largura || !item?.altura) {
                        alert(`Por favor, preencha o peso e todas as dimensões da variação: ${c.v1} ${c.v2 ? `/ ${c.v2}` : ""}`);
                        return false;
                    }
                }
            } else {
                if (!peso || converterParaNumeroBanco(peso) <= 0 || !comprimento || converterParaNumeroBanco(comprimento) <= 0 || !largura || converterParaNumeroBanco(largura) <= 0 || !altura || converterParaNumeroBanco(altura) <= 0) {
                    alert("Preencha todas as Medidas para Cálculo (Peso, Comprimento, Largura e Altura) corretamente.");
                    return false;
                }
            }
        }
        return true;
    };

    async function salvar() {
        if (!uid) return;
        if (!validarProdutoParaSalvar()) return;

        if (!editId && produtos.length >= limites.produtos) {
            alert(`Limite de produtos atingido!`);
            return;
        }
        if (!validarTexto(nome) || !nome.trim()) return alert("Nome inválido.");
        if (!categoria) return alert("Selecione uma categoria.");

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

            // ✨ Regra exata de necessidade de frete (false para digital_download e Digital_Personalizado)
            const isPrecisaFrete = dsTipoProduto !== 'digital_download' && dsTipoProduto !== 'Digital_Personalizado';

            const dados: any = {
                lojistaId: uid, nome, sku, descricao, categoria, subcategoria,
                precoBasico: precoFinal, custoUnitario, estoque,
                estoqueMinimo: estoqueMinimo ? Number(estoqueMinimo) : 3,
                ativo,
                dsTipoProduto: dsTipoProduto || "Fisico_Sem",
                nrDiasProducao: nrDiasProducao ? Number(nrDiasProducao) : 0,
                pesosDiferentesPorVariacao,
                precisaFrete: isPrecisaFrete,

                // ✨ Conversão de pesos e medidas do produto principal para o Firebase
                peso: pesosDiferentesPorVariacao ? null : (isPrecisaFrete ? converterParaNumeroBanco(peso) : null),
                comprimento: pesosDiferentesPorVariacao ? null : (isPrecisaFrete ? converterParaNumeroBanco(comprimento) : null),
                largura: pesosDiferentesPorVariacao ? null : (isPrecisaFrete ? converterParaNumeroBanco(largura) : null),
                altura: pesosDiferentesPorVariacao ? null : (isPrecisaFrete ? converterParaNumeroBanco(altura) : null),

                imagens: novasImagens,
                capa: novasImagens[0] || "",
                temVariacoes: temVariaveisComPreco,
                nomeVar1, nomeVar2, requisitos,

                // ✨ Conversão de pesos e medidas nas variações para o Firebase
                variacoes: temVariaveisComPreco ? combos.map(c => ({
                    nome: c.v2 ? `${c.v1} / ${c.v2}` : c.v1,
                    v1: c.v1, v2: c.v2,
                    sku: novaTabelaPrecos[c.key]?.sku || "",
                    preco: novaTabelaPrecos[c.key]?.preco || precoBasico,
                    custo: novaTabelaPrecos[c.key]?.custo || custoUnitario,
                    estoque: novaTabelaPrecos[c.key]?.estoque || "",
                    foto: novaTabelaPrecos[c.key]?.foto || "",
                    peso: pesosDiferentesPorVariacao ? converterParaNumeroBanco(novaTabelaPrecos[c.key]?.peso) : null,
                    comprimento: pesosDiferentesPorVariacao ? converterParaNumeroBanco(novaTabelaPrecos[c.key]?.comprimento) : null,
                    largura: pesosDiferentesPorVariacao ? converterParaNumeroBanco(novaTabelaPrecos[c.key]?.largura) : null,
                    altura: pesosDiferentesPorVariacao ? converterParaNumeroBanco(novaTabelaPrecos[c.key]?.altura) : null
                })) : [],

                updatedAt: Date.now()
            };

            const docRef = doc(db, "lojistas", uid, "produtos", produtoId);
            if (editId) await updateDoc(docRef, dados);
            else await setDoc(docRef, { ...dados, destaque: false, createdAt: Date.now() });

            alert("Produto salvo com sucesso! ✅");
            limparForm();
            setIsPainelAberto(false);
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar produto.");
        }
        setLoading(false);
    }

    const limparForm = () => {
        setNome(""); setSku(""); setDescricao(""); setCategoria(""); setSubcategoria(""); setPrecoBasico(""); setCustoUnitario("");
        setEstoque(""); setEstoqueMinimo("");
        setDsTipoProduto("Fisico_Sem"); setNrDiasProducao("");
        setPesosDiferentesPorVariacao(false);
        setPeso(""); setComprimento(""); setLargura(""); setAltura(""); setImagens([]); setEditId(null); setFiles([]);
        setOpcoesVar1([]); setOpcoesVar2([]); setNomeVar1(""); setNomeVar2(""); setTabelaPrecos({});
        setRequisitos({ pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false });
        setProdutoIdAtual(null);
    };

    const carregarDadosProdutoParaEdicao = (p: any) => {
        setEditId(p.id);
        setNome(p.nome); setSku(p.sku || ""); setCategoria(p.categoria || ""); setSubcategoria(p.subcategoria || "");
        setPrecoBasico(p.precoBasico || "");
        setCustoUnitario(p.custoUnitario || "");
        setEstoque(p.estoque || "");
        setEstoqueMinimo(p.estoqueMinimo !== undefined && p.estoqueMinimo !== null ? String(p.estoqueMinimo) : "");
        setDsTipoProduto(p.dsTipoProduto || (p.precisaFrete === false ? "digital_download" : "Fisico_Sem"));
        setNrDiasProducao(p.nrDiasProducao !== undefined && p.nrDiasProducao !== null ? String(p.nrDiasProducao) : "");
        setPesosDiferentesPorVariacao(p.pesosDiferentesPorVariacao ?? false);
        setImagens(p.imagens || []); setDescricao(p.descricao || "");
        setPeso(p.peso !== undefined && p.peso !== null ? String(p.peso) : "");
        setComprimento(p.comprimento !== undefined && p.comprimento !== null ? String(p.comprimento) : "");
        setLargura(p.largura !== undefined && p.largura !== null ? String(p.largura) : "");
        setAltura(p.altura !== undefined && p.altura !== null ? String(p.altura) : "");
        setRequisitos(p.requisitos || { pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false });
        if (p.variacoes) {
            setNomeVar1(p.nomeVar1 || ""); setNomeVar2(p.nomeVar2 || "");
            const tab: any = {};
            p.variacoes.forEach((v: any) => {
                const key = v.v2 ? `${v.v1}-${v.v2}` : v.v1;
                tab[key] = {
                    preco: v.preco,
                    custo: v.custo,
                    estoque: v.estoque || "",
                    foto: v.foto || "",
                    sku: v.sku || "",
                    peso: v.peso !== undefined && v.peso !== null ? String(v.peso) : "",
                    comprimento: v.comprimento !== undefined && v.comprimento !== null ? String(v.comprimento) : "",
                    largura: v.largura !== undefined && v.largura !== null ? String(v.largura) : "",
                    altura: v.altura !== undefined && v.altura !== null ? String(v.altura) : ""
                };
            });
            setTabelaPrecos(tab);
            setOpcoesVar1([...new Set(p.variacoes.map((v: any) => v.v1))] as string[]);
            setOpcoesVar2([...new Set(p.variacoes.map((v: any) => v.v2).filter((v: any) => v))] as string[]);
        }
        setIsPainelAberto(true);
    };

    const handleDuplicar = (p: any) => {
        duplicarProduto(p, {
            setEditId, setProdutoIdAtual, setNome, setSku, setDescricao, setCategoria,
            setSubcategoria, setPrecoBasico, setCustoUnitario, setEstoque, setEstoqueMinimo, setAtivo,
            setEnvioTransportadora: () => { }, setPermiteRetirada: () => { }, setPeso, setComprimento,
            setLargura, setAltura, setImagens, setFiles, setRequisitos, setNomeVar1,
            setNomeVar2, setTabelaPrecos, setOpcoesVar1, setOpcoesVar2,
            isMobile: false, setIsOpenRight: () => { }
        });
        setDsTipoProduto(p.dsTipoProduto || "Fisico_Sem");
        setNrDiasProducao(p.nrDiasProducao ? String(p.nrDiasProducao) : "");
        setPesosDiferentesPorVariacao(p.pesosDiferentesPorVariacao ?? false);
        setIsPainelAberto(true);
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

    return (
        <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', background: '#f8fafc', position: 'relative', boxSizing: 'border-box' }}>

            <style jsx>{`
                @media (max-width: 768px) {
                    .mobile-header-card {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 12px !important;
                        padding: 12px !important;
                    }
                    .mobile-header-card button {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                }
            `}</style>

            {/* MODAIS GLOBAIS */}
            <div style={{ position: 'relative', zIndex: 5000 }}>
                {showDescModal && (
                    <div style={{ ...styles.modalOverlay, zIndex: 5000 }}>
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

                <VariacoesModal
                    key={showVarModal ? "aberto" : "fechado"}
                    showVarModal={showVarModal}
                    setShowVarModal={setShowVarModal}
                    nomeVar1={nomeVar1} setNomeVar1={setNomeVar1}
                    opcoesVar1={opcoesVar1} setOpcoesVar1={setOpcoesVar1}
                    nomeVar2={nomeVar2} setNomeVar2={setNomeVar2}
                    opcoesVar2={opcoesVar2} setOpcoesVar2={setOpcoesVar2}
                    onCancel={() => { setTabelaPrecos({}); setShowVarModal(false); }}
                    tabelaPrecos={tabelaPrecos}
                    onSave={(novaTabela: any) => setTabelaPrecos(novaTabela)}
                    gerarCombinacoes={gerarCombinacoes}
                    sugerirSkus={sugerirSkus}
                    pesosDiferentesPorVariacao={pesosDiferentesPorVariacao}
                    setPesosDiferentesPorVariacao={setPesosDiferentesPorVariacao}
                    lojistaId={uid || ""}
                />

                <EtiquetaModal isOpen={listaParaImprimir.length > 0} listaProdutos={listaParaImprimir} onClose={() => setListaParaImprimir([])} />
                {showCatManager && <CategoriaSubCat lojistaId={uid || ""} onClose={() => setShowCatManager(false)} limite={limites.categorias} />}
                {isModalSKUOpen && <ModalGeradorSKU lojistaId={uid || ""} onClose={() => setIsModalSKUOpen(false)} onSave={(codigo: string) => { setSku(codigo); setIsModalSKUOpen(false); }} />}
            </div>

            {/* TELA PRINCIPAL */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', padding: '15px', boxSizing: 'border-box' }}>

                <div className="mobile-header-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', background: '#fff', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>📦 Gerenciamento de Produtos</h2>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>Total de produtos no plano: {produtos.length} / {limites.produtos}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            limparForm();
                            setIsPainelAberto(true);
                        }}
                        style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <FiPlus size={16} /> Novo Produto
                    </button>
                </div>

                <div style={{ flex: 1, background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
                        onEditar={carregarDadosProdutoParaEdicao}
                        onDuplicar={handleDuplicar}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 10px', borderTop: '1px solid #e2e8f0', marginTop: '15px' }}>
                        <div style={{ width: '60px' }}></div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                            <button type="button" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} style={{ padding: '6px 10px', background: paginaAtual === 1 ? '#cbd5e1' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <FiChevronLeft size={14} />
                            </button>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>{paginaAtual} / {totalPaginas}</span>
                            <button type="button" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} style={{ padding: '6px 10px', background: paginaAtual === totalPaginas ? '#cbd5e1' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <FiChevronRight size={14} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '60px' }}>
                            <select value={itensPorPagina} onChange={e => setItensPorPagina(Number(e.target.value))} style={{ padding: '6px 4px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={40}>40</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAINEL / TELA DESLIZANTE LATERAL */}
            {isPainelAberto && (
                <div
                    onClick={() => setIsPainelAberto(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000 }}
                />
            )}

            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '650px',
                maxWidth: '90vw',
                height: '100vh',
                background: '#fff',
                zIndex: 4001,
                boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                transition: 'transform 0.3s ease-in-out',
                transform: isPainelAberto ? 'translateX(0)' : 'translateX(100%)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 25px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                        {editId ? "📝 Editar Produto" : "📦 Cadastrar Novo Produto"}
                    </h2>
                    <button type="button" onClick={() => setIsPainelAberto(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}>
                        <FiX />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                        estoque={estoque} setEstoque={setEstoque}
                        estoqueMinimo={estoqueMinimo} setEstoqueMinimo={setEstoqueMinimo}
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
                        tipoProduto={dsTipoProduto} setTipoProduto={setDsTipoProduto}
                        diasProducao={nrDiasProducao} setDiasProducao={setNrDiasProducao}
                        peso={peso} setPeso={setPeso}
                        comprimento={comprimento} setComprimento={setComprimento}
                        largura={largura} setLargura={setLargura}
                        altura={altura} setAltura={setAltura}
                        pesosDiferentesPorVariacao={pesosDiferentesPorVariacao}
                        setPesosDiferentesPorVariacao={setPesosDiferentesPorVariacao}
                    />
                </div>

                <div style={{ padding: '15px 25px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: '15px' }}>
                    <button type="button" onClick={salvar} style={{ ...styles.btnSave, flex: 2, padding: '12px', fontSize: '14px', borderRadius: '8px' }}>
                        {loading ? "Aguarde..." : editId ? "Atualizar Produto" : "Salvar Produto"}
                    </button>
                    <button type="button" onClick={() => { limparForm(); setIsPainelAberto(false); }} style={{ ...styles.btnCancel, flex: 1, padding: '12px', fontSize: '14px', borderRadius: '8px' }}>
                        Cancelar
                    </button>
                </div>
            </div>

            {arquivoParaCortar && (
                <div style={{ zIndex: 6000, position: 'relative' }}>
                    <ImageCropperModal file={arquivoParaCortar} onCropComplete={async (croppedBlob) => { setArquivoParaCortar(null); const arquivoFinal = new File([croppedBlob], `produto_${Date.now()}.jpg`, { type: "image/jpeg" }); if (tipoCropAtual === "principal") { setFiles(prev => [...prev, arquivoFinal]); } }} onCancel={() => setArquivoParaCortar(null)} />
                </div>
            )}
        </div>
    );
}