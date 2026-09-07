// app/admin/produtos/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { db, auth, storage } from "@/lib/firebase";
import {
    collection, doc, query, orderBy, updateDoc,
    setDoc, onSnapshot, deleteField
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FiChevronLeft, FiChevronRight, FiMenu, FiX, FiPlus } from "react-icons/fi";

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

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

// ✨ Função auxiliar estritamente segura para converter valores de input para números reais sem corromper
const converterParaNumeroBanco = (valor: any): number => {
    if (valor === null || valor === undefined || valor === "") return 0;
    if (typeof valor === 'number') return valor;

    // Remove pontos de milhar e substitui a vírgula decimal por ponto para o banco
    const limpo = valor.toString().replace(/\./g, "").replace(",", ".");
    const numero = parseFloat(limpo);
    return isNaN(numero) ? 0 : numero;
};

export default function CadastroProdutos() {
    // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO INÍCIO DO COMPONENTE
    const { theme } = useTheme();

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
    const [ean, setEan] = useState(""); // ✨ Estado para o código de barras (EAN / GTIN)
    const [isModalSKUOpen, setIsModalSKUOpen] = useState(false);
    const [listaParaImprimir, setListaParaImprimir] = useState<any[]>([]);
    const [descricao, setDescricao] = useState("");
    const [categoria, setCategoria] = useState("");
    const [subcategoria, setSubcategoria] = useState("");
    const [precoBasico, setPrecoBasico] = useState("");
    const [custoUnitario, setCustoUnitario] = useState("");
    const [outrosCustos, setOutrosCustos] = useState("");
    const [estoque, setEstoque] = useState("");
    const [estoqueMinimo, setEstoqueMinimo] = useState("");
    const [ativo, setAtivo] = useState(true);

    const [dsTipoProduto, setDsTipoProduto] = useState("Fisico_Sem");
    const [nrDiasProducao, setNrDiasProducao] = useState("");

    // ✨ Estados para movimentação de estoque
    const [movimentarEstoque, setMovimentarEstoque] = useState<boolean>(true);
    const [movimentarEstoqueComposicao, setMovimentarEstoqueComposicao] = useState<boolean>(true);

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

    // ✨ Estados para Insumos Globais e Listagem de Insumos da Composição
    const [listaInsumos, setListaInsumos] = useState<any[]>([]);
    const [insumosComposicaoProduto, setInsumosComposicaoProduto] = useState<any[]>([]);

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

        const qProdutos = query(collection(db, "lojistas", uid, "produtos"), orderBy("nrCreatedAt", "desc"));
        const unsubProdutos = onSnapshot(qProdutos, (snap) => {
            setProdutos(snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    nome: data.dsNomeProduto || data.dsNome || data.nome || "",
                    categoria: data.dsCategoriaProduto || data.dsCategoria || data.categoria || "",
                    ativo: data.isAtivoProduto ?? data.isAtivo ?? data.ativo ?? true,
                    imagens: data.dsImagensProduto || data.dsImagens || data.imagens || [],
                    variacoes: data.variacoes || []
                };
            }));
        });

        const qCategorias = query(collection(db, "lojistas", uid, "categorias"), orderBy("nome", "asc"));
        const unsubCategorias = onSnapshot(qCategorias, (snap) => {
            setListaCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // ✨ Busca em tempo real dos insumos cadastrados pelo lojista para a composição
        const qInsumos = query(collection(db, "lojistas", uid, "insumos_composicao"), orderBy("dsNomeInsumo", "asc"));
        const unsubInsumos = onSnapshot(qInsumos, (snap) => {
            setListaInsumos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubLojista(); unsubProdutos(); unsubCategorias(); unsubInsumos(); };
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
        const precoItem = v?.vlPrecoProduto ?? v?.vlPreco ?? v?.preco;
        return precoItem && precoItem.toString().trim() !== "" && parseFloat(precoItem.toString().replace(/\./g, "").replace(",", ".")) > 0;
    });

    // ✨ Verifica se existe insumos na grade de variações
    const temInsumosNaGrade = Object.values(tabelaPrecos).some((v: any) => {
        return Array.isArray(v?.insumosComposicaoProduto) && v.insumosComposicaoProduto.length > 0;
    });

    const formatInput = (value: string, setter: (v: string) => void) => {
        const cleanValue = value.replace(/\D/g, "");
        if (!cleanValue) { setter(""); return; }
        setter((parseInt(cleanValue, 10) / 100).toFixed(2).replace('.', ','));
    };

    const gerarCombinacoes = () => {
        if (!opcoesVar1 || !Array.isArray(opcoesVar1)) return [];
        const var1Validas = opcoesVar1.filter(v => v !== null && v !== undefined && String(v).trim() !== "");
        if (var1Validas.length === 0) return [];

        const var2Validas = (opcoesVar2 && Array.isArray(opcoesVar2))
            ? opcoesVar2.filter(v => v !== null && v !== undefined && String(v).trim() !== "")
            : [];

        if (var2Validas.length === 0) {
            return var1Validas.map(v1 => ({ v1: String(v1), v2: "", key: String(v1) }));
        }

        const combos: any[] = [];
        var1Validas.forEach(v1 => {
            var2Validas.forEach(v2 => {
                combos.push({
                    v1: String(v1),
                    v2: String(v2),
                    key: `${String(v1)}___${String(v2)}`
                });
            });
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
            if (!novaTabela[c.key]?.dsSkuProduto && !novaTabela[c.key]?.sku) {
                const sufixo1 = c.v1 ? c.v1.substring(0, 3).toUpperCase() : "";
                const sufixo2 = c.v2 ? `-${c.v2.substring(0, 3).toUpperCase()}` : "";
                novaTabela[c.key] = { ...novaTabela[c.key], dsSkuProduto: `${sku}-${sufixo1}${sufixo2}`.toUpperCase() };
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
            if (!precoBasico || converterParaNumeroBanco(precoBasico) <= 0) {
                alert("Informe o preço de Venda.");
                return false;
            }
            if (!custoUnitario || converterParaNumeroBanco(custoUnitario) < 0) {
                alert("Informe o Custo Unitário.");
                return false;
            }
        }
        if ((!imagens || imagens.length === 0) && (!files || files.length === 0)) {
            alert("Adicione pelo menos uma foto ao produto.");
            return false;
        }

        const precisaFreteValidacao = dsTipoProduto !== 'digital_download' && dsTipoProduto !== 'Digital_Personalizado';
        if (precisaFreteValidacao) {
            if (pesosDiferentesPorVariacao) {
                const combos = gerarCombinacoes();
                for (const c of combos) {
                    const item = tabelaPrecos[c.key];
                    if (!item?.nrPesoProduto && !item?.peso || !item?.nrComprimentoProduto && !item?.comprimento || !item?.nrLarguraProduto && !item?.largura || !item?.nrAlturaProduto && !item?.altura) {
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
                const fotoItem = item.dsFotoProduto || item.dsFoto || item.foto;
                if (fotoItem && fotoItem.startsWith("data:image")) {
                    const storageRef = ref(storage, `lojistas/${uid}/produtos/${produtoId}/variacoes/${key}.jpg`);
                    const snapshot = await uploadString(storageRef, fotoItem, 'data_url');
                    novaTabelaPrecos[key].dsFotoProduto = await getDownloadURL(snapshot.ref);
                }
            }

            const combos = gerarCombinacoes();
            const precosValidos = Object.values(novaTabelaPrecos).map((v: any) => converterParaNumeroBanco(v.vlPrecoProduto ?? v.vlPreco ?? v.preco)).filter(p => p > 0);
            const precoFinalCalculado = precosValidos.length > 0 ? Math.min(...precosValidos) : converterParaNumeroBanco(precoBasico);

            const isPrecisaFrete = dsTipoProduto !== 'digital_download' && dsTipoProduto !== 'Digital_Personalizado';

            // 🌟 Array final padronizado com ID único e seguro para cada variação
            const variacoesArrayFinal = temVariaveisComPreco ? combos.map(c => {
                const itemVar = novaTabelaPrecos[c.key] || {};

                const v1Limpo = String(c.v1 || "").trim();
                const v2Limpo = String(c.v2 || "").trim();

                let nomeVariacaoCalculado = nome.trim();
                if (v1Limpo) nomeVariacaoCalculado += ` - ${v1Limpo}`;
                if (v2Limpo) nomeVariacaoCalculado += ` / ${v2Limpo}`;

                const insumosDestaVariacao = Array.isArray(itemVar.insumosComposicaoProduto) ? itemVar.insumosComposicaoProduto : [];
                const custoInsumosCalculado = insumosDestaVariacao.reduce((acc: number, ins: any) => {
                    const custoU = Number(ins.vlCustoUnitarioInsumo || 0);
                    const qtdC = Number(ins.nrQuantidadeConsumida || 0);
                    return acc + (custoU * qtdC);
                }, 0);

                const custoFinalItem = custoInsumosCalculado > 0
                    ? Number(custoInsumosCalculado.toFixed(4))
                    : converterParaNumeroBanco(itemVar.vlCustoUnitarioProduto ?? itemVar.vlCustoUnitario ?? itemVar.custo ?? custoUnitario);

                const estoqueVarBruto = itemVar.nrEstoqueProduto ?? itemVar.nrEstoque ?? itemVar.estoque ?? 0;
                const estoqueFinalItem = parseInt(estoqueVarBruto.toString().replace(/\D/g, ""), 10) || 0;

                // Garante que o ID da variação seja preservado ou gerado caso não exista
                const idVariacaoFinal = itemVar.idVariacao || `var_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

                return {
                    idVariacao: idVariacaoFinal, // 🌟 Mantém ou gera o ID da variação
                    dsNomeProduto: nomeVariacaoCalculado,
                    dsNomeVar1Produto: v1Limpo,
                    dsNomeVar2Produto: v2Limpo ? v2Limpo : null,
                    dsSkuProduto: itemVar.dsSkuProduto || itemVar.sku || itemVar.dsSku || "",
                    dsEANGTINProduto: itemVar.dsEANGTINProduto || itemVar.dsGtinProduto || itemVar.ean || itemVar.codigoBarras || "",
                    vlPrecoProduto: converterParaNumeroBanco(itemVar.vlPrecoProduto ?? itemVar.vlPreco ?? itemVar.preco ?? precoBasico),
                    vlCustoUnitarioProduto: custoFinalItem,
                    nrEstoqueProduto: estoqueFinalItem,
                    dsFotoProduto: itemVar.dsFotoProduto ?? itemVar.dsFoto ?? itemVar.foto ?? "",
                    nrPesoProduto: pesosDiferentesPorVariacao ? converterParaNumeroBanco(itemVar.nrPesoProduto ?? itemVar.nrPeso ?? itemVar.peso) : null,
                    nrComprimentoProduto: pesosDiferentesPorVariacao ? converterParaNumeroBanco(itemVar.nrComprimentoProduto ?? itemVar.nrComprimento ?? itemVar.comprimento) : null,
                    nrLarguraProduto: pesosDiferentesPorVariacao ? converterParaNumeroBanco(itemVar.nrLarguraProduto ?? itemVar.nrLargura ?? itemVar.largura) : null,
                    nrAlturaProduto: pesosDiferentesPorVariacao ? converterParaNumeroBanco(itemVar.nrAlturaProduto ?? itemVar.nrAltura ?? itemVar.altura) : null,
                    insumosComposicaoProduto: insumosDestaVariacao
                };
            }) : [];

            const custoInsumosGlobais = insumosComposicaoProduto.reduce((acc: number, ins: any) => {
                const custoU = Number(ins.vlCustoUnitarioInsumo || 0);
                const qtdC = Number(ins.nrQuantidadeConsumida || 0);
                return acc + (custoU * qtdC);
            }, 0);

            const custoUnitarioFinal = custoInsumosGlobais > 0
                ? Number(custoInsumosGlobais.toFixed(4))
                : converterParaNumeroBanco(custoUnitario);

            const dados: any = {
                dsLojistaIdProduto: uid,
                dsNomeProduto: nome,
                dsSkuProduto: sku,
                dsEANGTINProduto: ean,
                dsDescricaoProduto: descricao,
                dsCategoriaProduto: categoria,
                dsSubcategoriaProduto: subcategoria,

                vlPrecoBasicoProduto: converterParaNumeroBanco(precoFinalCalculado),
                vlCustoUnitarioProduto: custoUnitarioFinal,
                vlOutrosCustosProduto: converterParaNumeroBanco(outrosCustos),

                nrEstoqueProduto: converterParaNumeroBanco(estoque),
                nrEstoqueMinimoProduto: estoqueMinimo ? Number(estoqueMinimo) : 3,
                isAtivoProduto: ativo,
                dsTipoProduto: dsTipoProduto || "Fisico_Sem",
                nrDiasProducaoProduto: nrDiasProducao ? Number(nrDiasProducao) : 0,
                pesosDiferentesPorVariacao,
                isPrecisaFreteProduto: isPrecisaFrete,

                isMovimentarEstoque: movimentarEstoque,
                isMovimentarEstoqueComposicao: movimentarEstoqueComposicao,

                nrPesoProduto: pesosDiferentesPorVariacao ? null : (isPrecisaFrete ? converterParaNumeroBanco(peso) : null),
                nrComprimentoProduto: pesosDiferentesPorVariacao ? null : (isPrecisaFrete ? converterParaNumeroBanco(comprimento) : null),
                nrLarguraProduto: pesosDiferentesPorVariacao ? null : (isPrecisaFrete ? converterParaNumeroBanco(largura) : null),
                nrAlturaProduto: pesosDiferentesPorVariacao ? null : (isPrecisaFrete ? converterParaNumeroBanco(altura) : null),

                dsImagensProduto: novasImagens,
                dsCapaProduto: novasImagens[0] || "",
                isTemVariacoesProduto: temVariaveisComPreco,
                dsNomeVar1Produto: nomeVar1,
                dsNomeVar2Produto: nomeVar2,
                dsRequisitosProduto: requisitos,
                variacoes: variacoesArrayFinal,
                insumosComposicaoProduto: temInsumosNaGrade ? [] : insumosComposicaoProduto,

                nrUpdatedAt: Date.now()
            };

            const docRef = doc(db, "lojistas", uid, "produtos", produtoId);
            if (editId) {
                await updateDoc(docRef, {
                    ...dados,
                    nome: deleteField(),
                    categoria: deleteField(),
                    subcategoria: deleteField(),
                    descricao: deleteField(),
                    precoBasico: deleteField(),
                    custoUnitario: deleteField(),
                    estoque: deleteField(),
                    estoqueMinimo: deleteField(),
                    ativo: deleteField(),
                    capa: deleteField(),
                    imagens: deleteField(),
                    peso: deleteField(),
                    comprimento: deleteField(),
                    largura: deleteField(),
                    altura: deleteField(),
                    sku: deleteField(),
                    ean: deleteField(),
                    codigoBarras: deleteField(),
                    temVariacoes: deleteField(),
                    nomeVar1: deleteField(),
                    nomeVar2: deleteField(),
                    precisaFrete: deleteField(),
                    destaque: deleteField(),
                    diasProducao: deleteField(),
                    lojistaId: deleteField(),
                    updatedAt: deleteField(),
                    createdAt: deleteField(),
                    permiteRetirada: deleteField(),
                    envioTransportadora: deleteField(),
                    vlPrecoBasico: deleteField(),
                    vlCustoUnitario: deleteField(),
                    nrEstoque: deleteField(),
                    nrEstoqueMinimo: deleteField(),
                    nrPeso: deleteField(),
                    nrComprimento: deleteField(),
                    nrLargura: deleteField(),
                    nrAltura: deleteField(),
                    dsSku: deleteField(),
                    dsEANGTIN: deleteField(),
                    nrDiasProducao: deleteField(),
                    dsNome: deleteField(),
                    dsCategoria: deleteField(),
                    dsDescricao: deleteField(),
                    dsLojistaId: deleteField(),
                    dsSubcategoria: deleteField(),
                    dsCapa: deleteField(),
                    dsImagens: deleteField(),
                    dsNomeVar1: deleteField(),
                    dsNomeVar2: deleteField(),
                    dsRequisitos: deleteField(),
                    isAtivo: deleteField(),
                    isPrecisaFrete: deleteField(),
                    isTemVariacoes: deleteField()
                });
            } else {
                await setDoc(docRef, { ...dados, isDestaque: false, nrCreatedAt: Date.now() });
            }

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
        setNome(""); setSku(""); setEan(""); setDescricao(""); setCategoria(""); setSubcategoria(""); setPrecoBasico(""); setCustoUnitario("");
        setOutrosCustos("");
        setEstoque(""); setEstoqueMinimo("");
        setDsTipoProduto("Fisico_Sem"); setNrDiasProducao("");
        setMovimentarEstoque(true);
        setMovimentarEstoqueComposicao(true);
        setPesosDiferentesPorVariacao(false);
        setPeso(""); setComprimento(""); setLargura(""); setAltura(""); setImagens([]); setEditId(null); setFiles([]);
        setOpcoesVar1([]); setOpcoesVar2([]); setNomeVar1(""); setNomeVar2(""); setTabelaPrecos({});
        setInsumosComposicaoProduto([]);
        setRequisitos({ pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false });
        setProdutoIdAtual(null);
    };

    const carregarDadosProdutoParaEdicao = (p: any) => {
        if (!p) return;

        setEditId(p.id);
        setNome(p.dsNomeProduto || p.dsNome || p.nome || "");
        setSku(p.dsSkuProduto || p.dsSku || p.sku || "");
        setEan(p.dsEANGTINProduto || p.dsEANGTIN || p.ean || p.codigoBarras || "");

        setCategoria(p.dsCategoriaProduto || p.dsCategoria || p.categoria || "");
        setSubcategoria(p.dsSubcategoriaProduto || p.dsSubcategoria || p.subcategoria || "");
        setDescricao(p.dsDescricaoProduto || p.dsDescricao || p.descricao || "");

        const precoVal = p.vlPrecoBasicoProduto ?? p.vlPrecoBasico ?? p.precoBasico;
        setPrecoBasico(precoVal !== undefined && precoVal !== null && !isNaN(Number(precoVal)) ? Number(precoVal).toFixed(2).replace('.', ',') : "");

        const custoVal = p.vlCustoUnitarioProduto ?? p.vlCustoUnitario ?? p.custoUnitario;
        setCustoUnitario(custoVal !== undefined && custoVal !== null && !isNaN(Number(custoVal)) ? Number(custoVal).toFixed(2).replace('.', ',') : "");

        const outrosCustosVal = p.vlOutrosCustosProduto ?? p.vlOutrosCustos ?? p.outrosCustos;
        setOutrosCustos(outrosCustosVal !== undefined && outrosCustosVal !== null && !isNaN(Number(outrosCustosVal)) ? Number(outrosCustosVal).toFixed(2).replace('.', ',') : "");

        const estoqueVal = p.nrEstoqueProduto ?? p.nrEstoque ?? p.estoque;
        setEstoque(estoqueVal !== undefined && estoqueVal !== null ? String(estoqueVal) : "");

        const estoqueMinVal = p.nrEstoqueMinimoProduto ?? p.nrEstoqueMinimo ?? p.estoqueMinimo;
        setEstoqueMinimo(estoqueMinVal !== undefined && estoqueMinVal !== null ? String(estoqueMinVal) : "");

        setDsTipoProduto(p.dsTipoProduto || (p.precisaFrete === false ? "digital_download" : "Fisico_Sem"));

        const diasProdVal = p.nrDiasProducaoProduto ?? p.nrDiasProducao ?? p.diasProducao;
        setNrDiasProducao(diasProdVal !== undefined && diasProdVal !== null ? String(diasProdVal) : "");

        setMovimentarEstoque(p.isMovimentarEstoque ?? p.movimentarEstoque ?? true);
        setMovimentarEstoqueComposicao(p.isMovimentarEstoqueComposicao ?? p.movimentarEstoqueComposicao ?? true);

        setPesosDiferentesPorVariacao(p.pesosDiferentesPorVariacao ?? false);

        const listaImgs = p.dsImagensProduto || p.dsImagens || p.imagens || [];
        const capa = p.dsCapaProduto || p.dsCapa || p.capa || "";
        let todasImgs = [...listaImgs];
        if (capa && !todasImgs.includes(capa)) {
            todasImgs.unshift(capa);
        }
        setImagens(todasImgs);
        setFiles([]);

        const pesoVal = p.nrPesoProduto ?? p.nrPeso ?? p.peso;
        setPeso(pesoVal !== undefined && pesoVal !== null && !isNaN(Number(pesoVal)) ? Number(pesoVal).toFixed(2).replace('.', ',') : "");

        const compVal = p.nrComprimentoProduto ?? p.nrComprimento ?? p.comprimento;
        setComprimento(compVal !== undefined && compVal !== null && !isNaN(Number(compVal)) ? Number(compVal).toFixed(2).replace('.', ',') : "");

        const largVal = p.nrLarguraProduto ?? p.nrLargura ?? p.largura;
        setLargura(largVal !== undefined && largVal !== null && !isNaN(Number(largVal)) ? Number(largVal).toFixed(2).replace('.', ',') : "");

        const altVal = p.nrAlturaProduto ?? p.nrAltura ?? p.altura;
        setAltura(altVal !== undefined && altVal !== null && !isNaN(Number(altVal)) ? Number(altVal).toFixed(2).replace('.', ',') : "");

        setRequisitos(p.dsRequisitosProduto || p.dsRequisitos || p.requisitos || { pedeNome: false, pedeIdade: false, pedeData: false, pedeObs: false });

        setInsumosComposicaoProduto(p.insumosComposicaoProduto || p.insumosComposicao || []);

        setNomeVar1(p.dsNomeVar1Produto || "");
        setNomeVar2(p.dsNomeVar2Produto || "");

        if (p.variacoes && Array.isArray(p.variacoes)) {
            const tab: any = {};

            p.variacoes.forEach((v: any) => {
                const v1Val = v.dsNomeVar1Produto || v.dsModeloProduto || v.dsModelo || v.v1 || "";
                const v2Val = v.dsNomeVar2Produto !== undefined && v.dsNomeVar2Produto !== null ? String(v.dsNomeVar2Produto) : (v.nrTamanhoProduto !== undefined && v.nrTamanhoProduto !== null ? String(v.nrTamanhoProduto) : (v.nrTamanho !== undefined && v.nrTamanho !== null ? String(v.nrTamanho) : (v.v2 || "")));
                const key = v2Val ? `${v1Val}___${v2Val}` : v1Val;

                const vPreco = v.vlPrecoProduto ?? v.vlPreco ?? v.preco;
                const vCusto = v.vlCustoUnitarioProduto ?? v.vlCustoUnitario ?? v.custo;
                const vEstoque = v.nrEstoqueProduto ?? v.nrEstoque ?? v.estoque;
                
                // 🌟 Leitura corrigida para capturar o EAN e o ID único da variação corretamente
                const vEanVar = v.dsEANGTINProduto ?? v.dsGtinProduto ?? v.ean ?? v.codigoBarras ?? "";
                const vIdVar = v.idVariacao || `var_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

                const vPeso = v.nrPesoProduto ?? v.nrPeso ?? v.peso;
                const vComp = v.nrComprimentoProduto ?? v.nrComprimento ?? v.comprimento;
                const vLarg = v.nrLarguraProduto ?? v.nrLargura ?? v.largura;
                const vAlt = v.nrAlturaProduto ?? v.nrAltura ?? v.altura;

                tab[key] = {
                    idVariacao: vIdVar, // 🌟 Atribuído corretamente aqui
                    vlPrecoProduto: vPreco !== undefined && vPreco !== null && !isNaN(Number(vPreco)) ? Number(vPreco).toFixed(2).replace('.', ',') : "",
                    vlCustoUnitarioProduto: vCusto !== undefined && vCusto !== null && !isNaN(Number(vCusto)) ? Number(vCusto).toFixed(2).replace('.', ',') : "",
                    nrEstoqueProduto: vEstoque !== undefined && vEstoque !== null ? String(vEstoque) : "",
                    dsFotoProduto: v.dsFotoProduto || v.dsFoto || v.foto || "",
                    dsSkuProduto: v.dsSkuProduto || v.dsSku || v.sku || "",
                    dsEANGTINProduto: vEanVar, // 🌟 Atribuído corretamente aqui
                    nrPesoProduto: vPeso !== undefined && vPeso !== null && !isNaN(Number(vPeso)) ? Number(vPeso).toFixed(2).replace('.', ',') : "",
                    nrComprimentoProduto: vComp !== undefined && vComp !== null && !isNaN(Number(vComp)) ? Number(vComp).toFixed(2).replace('.', ',') : "",
                    nrLarguraProduto: vLarg !== undefined && vLarg !== null && !isNaN(Number(vLarg)) ? Number(vLarg).toFixed(2).replace('.', ',') : "",
                    nrAlturaProduto: vAlt !== undefined && vAlt !== null && !isNaN(Number(vAlt)) ? Number(vAlt).toFixed(2).replace('.', ',') : "",
                    insumosComposicaoProduto: v.insumosComposicaoProduto || v.insumosComposicao || []
                };
            });
            setTabelaPrecos(tab);

            const op1Unicas = Array.from(new Set(p.variacoes.map((v: any) => v.dsNomeVar1Produto || v.dsModeloProduto || v.dsModelo || v.v1).filter(Boolean))) as string[];
            const op2Unicas = Array.from(new Set(p.variacoes.map((v: any) => {
                const val = v.dsNomeVar2Produto !== undefined && v.dsNomeVar2Produto !== null ? String(v.dsNomeVar2Produto) : (v.nrTamanhoProduto !== undefined && v.nrTamanhoProduto !== null ? String(v.nrTamanhoProduto) : (v.nrTamanho !== undefined && v.nrTamanho !== null ? String(v.nrTamanho) : v.v2));
                return val;
            }).filter((val: any) => val !== undefined && val !== null && String(val).trim() !== ""))) as string[];

            setOpcoesVar1(op1Unicas);
            setOpcoesVar2(op2Unicas);
        } else {
            setTabelaPrecos({});
            setOpcoesVar1([]);
            setOpcoesVar2([]);
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
        setEan(p.dsEANGTINProduto || p.dsEANGTIN || p.ean || p.codigoBarras || "");
        setDsTipoProduto(p.dsTipoProduto || "Fisico_Sem");
        setNrDiasProducao(p.nrDiasProducaoProduto ? String(p.nrDiasProducaoProduto) : (p.nrDiasProducao ? String(p.nrDiasProducao) : ""));
        setMovimentarEstoque(p.isMovimentarEstoque ?? p.movimentarEstoque ?? true);
        setMovimentarEstoqueComposicao(p.isMovimentarEstoqueComposicao ?? p.movimentarEstoqueComposicao ?? true);
        setPesosDiferentesPorVariacao(p.pesosDiferentesPorVariacao ?? false);
        setInsumosComposicaoProduto(p.insumosComposicaoProduto || p.insumosComposicao || []);
        setIsPainelAberto(true);
    };

    const produtosFiltrados = produtos.filter(p => {
        const nomeProd = p.dsNomeProduto || p.dsNome || p.nome || "";
        const catProd = p.dsCategoriaProduto || p.dsCategoria || p.categoria || "";
        const ativoProd = p.isAtivoProduto ?? p.isAtivo ?? p.ativo ?? true;

        return nomeProd.toLowerCase().includes(busca.toLowerCase()) &&
            (filtroCategoria === "Todos" || catProd === filtroCategoria) &&
            (filtroStatus === "Todos" || (filtroStatus === "Visíveis" ? ativoProd : !ativoProd));
    });

    const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina) || 1;
    const indiceUltimoItem = paginaAtual * itensPorPagina;
    const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
    const produtosPaginados = produtosFiltrados.slice(indicePrimeiroItem, indiceUltimoItem);

    return (
        <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', background: theme.bgApp, color: theme.textMain, position: 'relative', boxSizing: 'border-box', transition: 'background 0.3s, color 0.3s' }}>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Amaranth:ital,wght@0,400;0,700;1,400;1,700&display=swap');

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

            <div style={{ position: 'relative', zIndex: 5000 }}>
                {showDescModal && (
                    <div style={{ ...styles.modalOverlay, zIndex: 5000 }}>
                        <div style={{ ...styles.modalContent, background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}` }}>
                            <h3 style={{ marginBottom: '10px', fontFamily: "'Amaranth', sans-serif", color: theme.textMain }}>Editar Descrição</h3>
                            <textarea
                                style={{
                                    ...styles.modalTextarea,
                                    fontFamily: "'Amaranth', sans-serif",
                                    background: theme.inputBg,
                                    color: theme.textMain,
                                    borderColor: theme.border
                                }}
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                                autoFocus
                            />
                            <button type="button" onClick={() => setShowDescModal(false)} style={{ ...styles.btnSave, background: theme.primary }}>Concluir</button>
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
                    listaInsumos={listaInsumos}
                />

                <EtiquetaModal isOpen={listaParaImprimir.length > 0} listaProdutos={listaParaImprimir} onClose={() => setListaParaImprimir([])} />
                {showCatManager && <CategoriaSubCat lojistaId={uid || ""} onClose={() => setShowCatManager(false)} limite={limites.categorias} />}
                {isModalSKUOpen && <ModalGeradorSKU lojistaId={uid || ""} onClose={() => setIsModalSKUOpen(false)} onSave={(codigo: string) => { setSku(codigo); setIsModalSKUOpen(false); }} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', padding: '15px', boxSizing: 'border-box' }}>

                <div className="mobile-header-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', background: theme.bgCard, padding: '15px 20px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: theme.textMain }}>📦 Gerenciamento de Produtos</h2>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: theme.textSec }}>Total de produtos no plano: {produtos.length} / {limites.produtos}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            limparForm();
                            setIsPainelAberto(true);
                        }}
                        style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <FiPlus size={16} /> Novo Produto
                    </button>
                </div>

                <div style={{ flex: 1, background: theme.bgCard, padding: '15px', borderRadius: '12px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 10px', borderTop: `1px solid ${theme.border}`, marginTop: '15px' }}>
                        <div style={{ width: '60px' }}></div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                            <button type="button" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} style={{ padding: '6px 10px', background: paginaAtual === 1 ? theme.border : theme.primary, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <FiChevronLeft size={14} />
                            </button>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>{paginaAtual} / {totalPaginas}</span>
                            <button type="button" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} style={{ padding: '6px 10px', background: paginaAtual === totalPaginas ? theme.border : theme.primary, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                <FiChevronRight size={14} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '60px' }}>
                            <select value={itensPorPagina} onChange={e => setItensPorPagina(Number(e.target.value))} style={{ padding: '6px 4px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain }}>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={40}>40</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

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
                background: theme.bgCard,
                color: theme.textMain,
                zIndex: 4001,
                boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                transition: 'transform 0.3s ease-in-out, background 0.3s, color 0.3s',
                transform: isPainelAberto ? 'translateX(0)' : 'translateX(100%)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 25px', borderBottom: `1px solid ${theme.border}`, background: theme.bgApp }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: theme.textMain }}>
                        {editId ? "📝 Editar Produto" : "📦 Cadastrar Novo Produto"}
                    </h2>
                    <button type="button" onClick={() => setIsPainelAberto(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: theme.textSec }}>
                        <FiX />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <FormularioProduto
                        nome={nome} setNome={setNome}
                        sku={sku} setSku={setSku}
                        ean={ean} setEan={setEan}
                        setIsModalSKUOpen={setIsModalSKUOpen}
                        categoria={categoria} setCategoria={setCategoria}
                        subcategoria={subcategoria} setSubcategoria={setSubcategoria}
                        listaCategorias={listaCategorias}
                        setShowCatManager={setShowCatManager}
                        descricao={descricao} setShowDescModal={setShowDescModal}
                        precoBasico={precoBasico} setPrecoBasico={setPrecoBasico}
                        custoUnitario={custoUnitario} setCustoUnitario={setCustoUnitario}
                        outrosCustos={outrosCustos} setOutrosCustos={setOutrosCustos}
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
                        listaInsumos={listaInsumos}
                        insumosComposicaoProduto={insumosComposicaoProduto}
                        setInsumosComposicaoProduto={setInsumosComposicaoProduto}
                        temInsumosNaGrade={temInsumosNaGrade}
                        movimentarEstoque={movimentarEstoque}
                        setMovimentarEstoque={setMovimentarEstoque}
                        movimentarEstoqueComposicao={movimentarEstoqueComposicao}
                        setMovimentarEstoqueComposicao={setMovimentarEstoqueComposicao}
                        tabelaPrecos={tabelaPrecos}
                    />
                </div>

                <div style={{ padding: '15px 25px', borderTop: `1px solid ${theme.border}`, background: theme.bgApp, display: 'flex', gap: '15px' }}>
                    <button type="button" onClick={salvar} style={{ ...styles.btnSave, flex: 2, padding: '12px', fontSize: '14px', borderRadius: '8px', background: theme.primary }}>
                        {loading ? "Aguarde..." : editId ? "Atualizar Produto" : "Salvar Produto"}
                    </button>
                    <button type="button" onClick={() => { limparForm(); setIsPainelAberto(false); }} style={{ ...styles.btnCancel, flex: 1, padding: '12px', fontSize: '14px', borderRadius: '8px', background: theme.border, color: theme.textMain }}>
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