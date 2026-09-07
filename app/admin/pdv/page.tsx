// app/admin/pdv/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { X, Printer, Lock, Key, Eye, EyeOff } from "lucide-react"; 
import { executarFluxoPedido } from "@/app/[lojista]/_components/helperPedido";
import { aplicarMascara, validarCPFReal } from "@/utils/formatters";
import { useTheme, PALETA_LIGHT } from "@/context/ThemeContext";
import { imprimirRecibo } from "@/utils/impressaoPedido";

import ProdutosModalPdv from "./ProdutosModalPdv";
import PagamentoPdv from "./PagamentoPdv";

export default function PaginaPDV() {
  const themeContext = useTheme();
  const theme = themeContext ? themeContext.theme : PALETA_LIGHT;
  const isModoNoturno = themeContext ? themeContext.isModoNoturno : false;

  const [lojistaId, setLojistaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("Todos");
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [dadosLoja, setDadosLoja] = useState<any>({});
  const [tipoEntrega, setTipoEntrega] = useState<"retirada" | "entrega_local">("retirada");

  // 📦 Estados para o controle de Embalagens no PDV
  const [listaEmbalagens, setListaEmbalagens] = useState<any[]>([]);
  const [embalagemSelecionadaId, setEmbalagemSelecionadaId] = useState("");

  // Estados para o controle de Operador por PIN
  const [operadorLogado, setOperadorLogado] = useState<any>(null);
  const [pinDigitado, setPinDigitado] = useState("");
  const [mostrarPin, setMostrarPin] = useState(false);
  const [listaColaboradores, setListaColaboradores] = useState<any[]>([]);
  const [isDonoLoja, setIsDonoLoja] = useState(false);
  const [modalPinAberto, setModalPinAberto] = useState(false);

  // Estado para controlar a abertura do modal de produtos
  const [modalProdutosAberto, setModalProdutosAberto] = useState(false);

  // Estados de Entrada e Restante
  const [vlEntrada, setVlEntrada] = useState<number>(0);
  const [dsPrazoRestante, setDsPrazoRestante] = useState<string>("");

  const [ultimoPedidoGerado, setUltimoPedidoGerado] = useState<any | null>(null);

  const [cliente, setCliente] = useState({
    nmNomeCliente: "Cliente Balcão",
    dsCpfCliente: "",
    dsCepCliente: "",
    dsTelefoneCliente: "",
    dsEmailCliente: ""
  });

  const [endereco, setEndereco] = useState({
    dsRuaCliente: "",
    dsNumeroCliente: "",
    dsBairroCliente: "",
    dsCidadeCliente: "",
    dsUfCliente: "",
    dsComplementoCliente: ""
  });

  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [carregandoVenda, setCarregandoVenda] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [coresDisponiveis, setCoresDisponiveis] = useState<string[]>([]);
  const [corSelecionada, setCorSelecionada] = useState<string>("");
  const [tamanhosDisponiveis, setTamanhosDisponiveis] = useState<any[]>([]);
  const [variacaoEscolhida, setVariacaoEscolhida] = useState<any | null>(null);
  const [dadosPersonalizadosModal, setDadosPersonalizadosModal] = useState<any>({});
  const [itemEditandoCartId, setItemEditandoCartId] = useState<string | null>(null);

  // Função para buscar colaboradores atualizados do banco
  const carregarColaboradoresAtualizados = async (idLoja: string) => {
    try {
      const colabRef = collection(db, "lojistas", idLoja, "colaboradores");
      const snapColab = await getDocs(colabRef);
      const colabs = snapColab.docs.map(d => ({ id: d.id, ...d.data() }));
      setListaColaboradores(colabs);
      return colabs;
    } catch (e) {
      console.error("Erro ao carregar colaboradores:", e);
      return [];
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userSnap = await getDoc(doc(db, "usuarios", user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const idLoja = userData.lojaId || user.uid;
          setLojistaId(idLoja);

          if (userData.role === 'master' || userData.role === 'admin' || !userData.role) {
            setIsDonoLoja(true);
            setOperadorLogado({ nome: "Master", cargo: "Administrador" });
            setModalPinAberto(false);
          } else {
            const operadorSalvo = localStorage.getItem("operadorAtivoPdv");
            if (operadorSalvo) {
              try {
                setOperadorLogado(JSON.parse(operadorSalvo));
                setModalPinAberto(false);
              } catch (e) {
                setModalPinAberto(true);
              }
            } else {
              setModalPinAberto(true);
            }
          }

          if (idLoja) {
            const lojaRef = doc(db, "lojistas", idLoja);
            const lojaSnap = await getDoc(lojaRef);
            if (lojaSnap.exists()) {
              setDadosLoja(lojaSnap.data());
            }

            // 📦 Carregar embalagens cadastradas na subcoleção do lojista
            const embalagensRef = collection(db, "lojistas", idLoja, "embalagem");
            const snapEmbalagens = await getDocs(embalagensRef);
            const listaEmb = snapEmbalagens.docs.map(d => ({ id: d.id, ...d.data() }));
            setListaEmbalagens(listaEmb);

            const produtosRef = collection(db, "lojistas", idLoja, "produtos");
            const snapshot = await getDocs(produtosRef);

            const listaProdutos = snapshot.docs.map(d => {
              const data = d.data();
              const precoBruto = data.vlPrecoBasicoProduto ?? 0;
              const precoFormatado = typeof precoBruto === 'string'
                ? Number(precoBruto.replace(',', '.'))
                : Number(precoBruto || 0);

              const nomeProd = data.dsNomeProduto || "Produto sem nome";
              const capaProd = data.dsCapaProduto || (data.dsImagensProduto?.[0]) || "";
              const categoriaProd = data.dsCategoriaProduto || "Sem Categoria";
              const temVar = data.isTemVariacoesProduto ?? false;
              const varArr = data.variacoes || [];
              const reqArr = data.dsRequisitosProduto || [];
              const tipoProd = data.dsTipoProduto || "";

              return {
                id: d.id,
                ...data,
                nome: nomeProd,
                preco: isNaN(precoFormatado) ? 0 : precoFormatado,
                capa: capaProd,
                categoria: categoriaProd,
                temVariacoes: temVar,
                variacoes: varArr,
                requisitos: reqArr,
                dsTipoProduto: tipoProd,
              };
            });

            setProdutos(listaProdutos);

            const colabs = await carregarColaboradoresAtualizados(idLoja);

            if (colabs.length === 0 && userData.role !== 'master' && userData.role !== 'admin') {
              setOperadorLogado({ nome: "Master", cargo: "Administrador" });
              setModalPinAberto(false);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados do PDV:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const categorias = useMemo(() => {
    const cats = new Set(produtos.map(p => p.categoria || "Sem Categoria"));
    return ["Todos", ...Array.from(cats)];
  }, [produtos]);

  const valorEntregaLocal = useMemo(() => {
    if (!dadosLoja) return 0;
    const subObjLoja = dadosLoja?.dadosLoja || {};
    const sistemaRaiz = dadosLoja?.sistema || {};
    const sistemaSubLoja = subObjLoja?.sistema || {};

    const valBruto =
      sistemaRaiz.vlFreteLocal ??
      sistemaSubLoja.vlFreteLocal ??
      sistemaRaiz.vlEntregaLocal ??
      sistemaSubLoja.vlEntregaLocal ??
      dadosLoja.vlFreteLocal ??
      subObjLoja.vlFreteLocal ??
      dadosLoja.vlEntregaLocal ??
      subObjLoja.vlEntregaLocal ??
      0;

    if (typeof valBruto === "string") {
      const limpo = valBruto.replace(/\./g, "").replace(",", ".");
      return parseFloat(limpo) || 0;
    }
    return Number(valBruto) || 0;
  }, [dadosLoja]);

  const valorFreteAtual = tipoEntrega === "entrega_local" ? valorEntregaLocal : 0;

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorComMascara = aplicarMascara(e.target.value, 'cep');
    setCliente(prev => ({ ...prev, dsCepCliente: valorComMascara }));

    const cepLimpo = valorComMascara.replace(/\D/g, "");
    if (cepLimpo.length < 8) {
      setEndereco({ dsRuaCliente: "", dsNumeroCliente: "", dsBairroCliente: "", dsCidadeCliente: "", dsUfCliente: "", dsComplementoCliente: "" });
      return;
    }

    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setEndereco(prev => ({
            ...prev,
            dsRuaCliente: data.logradouro || "",
            dsBairroCliente: data.bairro || "",
            dsCidadeCliente: data.localidade || "",
            dsUfCliente: data.uf || ""
          }));
        } else {
          setEndereco({ dsRuaCliente: "", dsNumeroCliente: "", dsBairroCliente: "", dsCidadeCliente: "", dsUfCliente: "", dsComplementoCliente: "" });
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const lidarComCliqueProduto = (produto: any, variacaoEspecifica?: any) => {
    setDadosPersonalizadosModal({});
    const temReqs = Array.isArray(produto.requisitos) && produto.requisitos.length > 0;

    // Se veio uma variação específica direto (ex: via leitor de código de barras ou atalho)
    if (variacaoEspecifica) {
      adicionarAoCarrinhoDireto(produto, variacaoEspecifica);
      return;
    }

    if ((produto.temVariacoes && produto.variacoes && produto.variacoes.length > 0) || temReqs) {
      if (produto.temVariacoes && produto.variacoes && produto.variacoes.length > 0) {
        const coresUnicas = Array.from(new Set(produto.variacoes.map((v: any) => v.dsModeloProduto || v.dsNomeProduto || ""))).filter(Boolean) as string[];
        setCoresDisponiveis(coresUnicas);
        const primeiraCor = coresUnicas[0] || "";
        setCorSelecionada(primeiraCor);

        const tamanhosDaCor = produto.variacoes.filter((v: any) => (v.dsModeloProduto || v.dsNomeProduto || "") === primeiraCor);
        setTamanhosDisponiveis(tamanhosDaCor);
        setVariacaoEscolhida(tamanhosDaCor[0] || null);
      } else {
        setCoresDisponiveis([]);
        setTamanhosDisponiveis([]);
        setVariacaoEscolhida(null);
      }
      setProdutoSelecionado(produto);
    } else {
      adicionarAoCarrinhoDireto(produto, null);
    }
  };

  const handleTrocarCor = (cor: string, produto: any) => {
    setCorSelecionada(cor);
    const tamanhosDaCor = produto.variacoes.filter((v: any) => (v.dsModeloProduto || v.dsNomeProduto || "") === cor);
    setTamanhosDisponiveis(tamanhosDaCor);
    setVariacaoEscolhida(tamanhosDaCor[0] || null);
  };

  const adicionarAoCarrinhoDireto = (produto: any, variacao: any | null) => {
    const valorPrecoVar = variacao ? (variacao.vlPrecoProduto ?? variacao.preco ?? produto.preco) : produto.preco;
    const precoVenda = typeof valorPrecoVar === 'string' ? Number(valorPrecoVar.replace(',', '.')) : Number(valorPrecoVar || 0);

    const valorCustoVar = variacao ? (variacao.vlCustoUnitarioProduto ?? variacao.custo ?? 0) : (produto.vlCustoUnitarioProduto ?? 0);
    const custoVenda = typeof valorCustoVar === 'string' ? Number(valorCustoVar.replace(',', '.')) : Number(valorCustoVar || 0);

    const nomeVar = variacao ? (variacao.dsVariacaoProduto || variacao.dsNomeProduto || variacao.dsModeloProduto || "") : "";

    const cartItemId = `${produto.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    let variacaoLimpa = nomeVar;

    const nomeBase = produto.dsNomeProduto || produto.nome || "Produto sem nome";
    const tipoProd = String(produto.dsTipoProduto || "").toLowerCase();
    const isDigitalItem = tipoProd.includes('digital');

    const { descricao, dsDescricao, ...produtoSemDescricao } = produto;

    setCarrinho(prev => [
      ...prev,
      {
        ...produtoSemDescricao,
        ...variacao,
        cartItemId,
        id: produto.id,
        idProduto: produto.id,
        idVariacao: variacao?.idVariacao || null,
        nome: nomeBase,
        dsNomeProduto: nomeBase,
        preco: precoVenda,
        vlPrecoProduto: precoVenda,
        custo: custoVenda,
        vlCustoUnitarioProduto: custoVenda,
        quantidade: 1,
        qty: 1,
        foto: variacao?.dsFotoProduto || produto.capa,
        personalizacao: { ...dadosPersonalizadosModal },
        requisitos: produto.requisitos || [],
        variacaoStr: variacaoLimpa || "Padrão", 
        dsVariacaoProduto: variacaoLimpa,
        
        // ✨ Nomes padronizados das variações (v1 e v2)
        dsNomeVar1Produto: produto.dsNomeVar1Produto || null,
        v1: variacao?.v1 || variacao?.dsValorVar1 || null,
        dsNomeVar2Produto: produto.dsNomeVar2Produto || null,
        v2: variacao?.v2 || variacao?.dsValorVar2 || null,

        dsTipoProduto: produto.dsTipoProduto || "Fisico_Padrao",
        isPrecisaFreteProduto: isDigitalItem ? false : true,
        insumosComposicaoProduto: variacao?.insumosComposicaoProduto || produto.insumosComposicaoProduto || [],
        movimentarEstoque: true,
        movimentarEstoqueComposicao: true
      }
    ]);

    setProdutoSelecionado(null);
    setVariacaoEscolhida(null);
    setDadosPersonalizadosModal({});
  };

  const removerDoCarrinho = (cartItemId: string) => {
    setCarrinho(carrinho.filter(item => item.cartItemId !== cartItemId));
  };

  const alterarQuantidade = (quantia: number) => (cartItemId: string) => {
    setCarrinho(carrinho.map(item => {
      if (item.cartItemId === cartItemId) {
        const novaQtd = item.quantidade + quantia;
        return novaQtd > 0 ? { ...item, quantidade: novaQtd } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const calcularSubtotal = () => {
    return carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  };

  const calcularTotalGeral = () => {
    return calcularSubtotal() + valorFreteAtual;
  };

  const finalizarVenda = async () => {
    if (!lojistaId) {
      alert("ID da loja não identificado.");
      return;
    }
    if (carrinho.length === 0) {
      alert("O carrinho está vazio!");
      return;
    }

    if (cliente.dsCpfCliente && !validarCPFReal(cliente.dsCpfCliente)) {
      alert("CPF inválido! Por favor, verifique.");
      return;
    }

    setCarregandoVenda(true);
    try {
      const subtotal = calcularSubtotal();
      const totalGeral = calcularTotalGeral();

      const personalizacoesMap: Record<string, any> = {};
      carrinho.forEach((item, index) => {
        const chaveUnica = `${item.cartItemId}_${index}`;
        personalizacoesMap[chaveUnica] = item.personalizacao || {};
      });

      const safeCartFormatado = carrinho.map(item => {
        const tipoProdItem = String(item.dsTipoProduto || "").toLowerCase();
        const isDigital = tipoProdItem.includes('digital');
        const nomeLimpo = String(item.dsNomeProduto || "Produto").split(" (")[0].trim();

        return {
          ...item,
          idProduto: item.id || item.idProduto,
          idVariacao: item.idVariacao || null,
          dsNameProduto: nomeLimpo,
          dsNomeProduto: nomeLimpo,
          qty: Number(item.quantidade || item.qty || 1),
          nrQuantidadeProduto: Number(item.quantidade || item.qty || 1),
          price: Number(Number(item.preco || 0).toFixed(2)),
          vlPrecoProduto: Number(Number(item.preco || 0).toFixed(2)),
          custoUnitario: Number(Number(item.custo || item.custoUnitario || 0).toFixed(2)),
          vlCustoUnitarioProduto: Number(Number(item.custo || item.custoUnitario || 0).toFixed(2)),
          variacao: item.dsVariacaoProduto || item.variacao || "",
          dsVariacaoProduto: item.dsVariacaoProduto || item.variacao || "",
          dsNomeVar1Produto: item.dsNomeVar1Produto || null,
          v1: item.v1 || null,
          dsNomeVar2Produto: item.dsNomeVar2Produto || null,
          v2: item.v2 || null,
          dsTipoProduto: item.dsTipoProduto || "Fisico_Padrao",
          isPrecisaFreteProduto: isDigital ? false : (tipoEntrega === "entrega_local"),
          insumosComposicaoProduto: item.insumosComposicaoProduto || [],
          movimentarEstoque: true,
          movimentarEstoqueComposicao: true
        };
      });

      const objetoFreteSel = tipoEntrega === "retirada" ? {
        id: 'retirada',
        name: 'Retirar na Loja',
        price: 0,
        delivery_time: 0
      } : {
        id: 'entrega_local',
        name: 'Entrega Local',
        price: valorEntregaLocal,
        delivery_time: 1
      };

      const logistica = {
        dsFormaEntrega: tipoEntrega,
        isRetirada: tipoEntrega === 'retirada',
        dsServico: objetoFreteSel.name,
        dsTransportadoraId: tipoEntrega,
        vlFrete: valorFreteAtual,
        vlPrazo: objetoFreteSel.delivery_time,
        isFreteGratis: false,
        origem: "Pdv"
      };

      const contadorRef = doc(db, "lojistas", lojistaId, "config", "contador_pedidos");
      const contadorSnap = await getDoc(contadorRef);
      const proximoNumero = contadorSnap.exists() ? (contadorSnap.data().ultimoNumero || 0) + 1 : 1;

      const nomeOperadorFormatado = isDonoLoja || operadorLogado?.nome === "Master"
        ? "Master"
        : `${operadorLogado?.nome || operadorLogado?.dsNomeColaborador || "Balcão"} (${operadorLogado?.cargo || operadorLogado?.dsCargoColaborador || "Caixa"})`;

      // 📦 Localizar a embalagem selecionada pelo operador para passar ao helper
      const embalagemEscolhidaObj = listaEmbalagens.find(e => e.id === embalagemSelecionadaId);
      const embalagemDoCheckoutPayload = embalagemSelecionadaId ? {
        escolhida: {
          id: embalagemEscolhidaObj?.id || embalagemSelecionadaId,
          dsModeloEmbalagemEscolhida: embalagemEscolhidaObj?.dsNomeEmbalagem || embalagemEscolhidaObj?.nome || "Embalagem",
          vlCustoEmbalagemEscolhida: embalagemEscolhidaObj?.vlCustoUnitarioEmbalagem || embalagemEscolhidaObj?.custo || 0,
          dsTipoEmbalagem: embalagemEscolhidaObj?.dsTipoEmbalagem || "Caixa",
          insumosComposicaoEmbalagem: embalagemEscolhidaObj?.insumos_composicao || embalagemEscolhidaObj?.insumosComposicaoEmbalagem || []
        }
      } : null;

      const sucesso = await executarFluxoPedido({
        lojistaId,
        lojistaSlug: "pdv-balcao",
        cliente,
        endereco,
        safeCart: safeCartFormatado,
        personalizacoes: personalizacoesMap,
        requisitosDoBanco: {},
        valorSubtotalProdutos: subtotal,
        valorDesconto: 0,
        totalGeral,
        whatsappNumero: cliente.dsTelefoneCliente ? cliente.dsTelefoneCliente.replace(/\D/g, "") : "",
        dadosLoja,
        logistica,
        cupomDigitado: null,
        freteGratisConfig: null,
        payloadPixBruto: null,
        freteSel: objetoFreteSel,
        dsFormaPagamentoCarrinho: formaPagamento,
        vlEntrada: vlEntrada,
        vlRestante: Math.max(0, totalGeral - vlEntrada),
        dsPrazoRestante: dsPrazoRestante,
        dsOperadorCaixa: nomeOperadorFormatado,
        // 📦 Repassando a embalagem escolhida para o helper baixar do estoque
        embalagemDoCheckout: embalagemDoCheckoutPayload
      });

      if (sucesso) {
        const dadosUltimaVenda = {
          numeroPedido: proximoNumero,
          cliente: { ...cliente },
          carrinho: [...carrinho],
          subtotal,
          total: totalGeral,
          entrega: valorFreteAtual,
          operador: nomeOperadorFormatado,
          pagto: {
            tipo: formaPagamento,
            entrada: vlEntrada
          }
        };

        setUltimoPedidoGerado(dadosUltimaVenda);

        alert("Venda realizada com sucesso! Pedido gerado e estoque atualizado.");
        setCarrinho([]);
        setCliente({ nmNomeCliente: "Cliente Balcão", dsCpfCliente: "", dsCepCliente: "", dsTelefoneCliente: "", dsEmailCliente: "" });
        setEndereco({ dsRuaCliente: "", dsNumeroCliente: "", dsBairroCliente: "", dsCidadeCliente: "", dsUfCliente: "", dsComplementoCliente: "" });
        setTipoEntrega("retirada");
        setVlEntrada(0);
        setDsPrazoRestante("");
        setEmbalagemSelecionadaId(""); // Limpa a seleção da embalagem
      } else {
        throw new Error("Erro ao executar fluxo do pedido.");
      }
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      alert("Erro ao processar a venda.");
    } finally {
      setCarregandoVenda(false);
    }
  };

  const itemAtualEditando = carrinho.find(i => i.cartItemId === itemEditandoCartId);

  if (loading) {
   return <div style={{ padding: "30px", textAlign: "center", color: theme.textSec, fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>Carregando PDV...</div>;
  }

  return (
    <div style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      fontFamily: "sans-serif",
      boxSizing: "border-box",
      padding: "0px 10px 20px 10px",
      background: theme.bgApp,
      color: theme.textMain,
      transition: "background 0.3s, color 0.3s"
    }}>
      
      {modalPinAberto && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}`, textAlign: "center", width: "380px" }}>
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: `${theme.primary}15`, color: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px auto" }}>
              <Lock size={24} />
            </div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "bold" }}>Identificação do Caixa</h3>
            <p style={{ fontSize: "12px", color: theme.textSec, marginBottom: "20px" }}>Digite seu PIN de 4 dígitos para iniciar o atendimento e assinar as vendas:</p>

            <div style={{ position: "relative", width: "160px", margin: "0 auto 20px auto", display: "flex", alignItems: "center" }}>
              <input
                type={mostrarPin ? "text" : "password"}
                maxLength={4}
                placeholder="****"
                autoFocus
                autoComplete="new-password"
                name="pin-operador-pdv"
                value={pinDigitado}
                onChange={(e) => setPinDigitado(e.target.value.replace(/\D/g, ""))}
                style={{ width: "100%", padding: "12px", paddingRight: "36px", fontSize: "22px", textAlign: "center", letterSpacing: "8px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, outline: "none", fontWeight: "bold", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setMostrarPin(!mostrarPin)}
                style={{ position: "absolute", right: "8px", background: "none", border: "none", cursor: "pointer", color: theme.textSec, display: "flex", alignItems: "center" }}
                title={mostrarPin ? "Ocultar PIN" : "Ver PIN"}
              >
                {mostrarPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const colabEncontrado = listaColaboradores.find(c => (c.pin === pinDigitado || c.nrPinColaborador === pinDigitado));
                if (colabEncontrado) {
                  localStorage.setItem("operadorAtivoPdv", JSON.stringify(colabEncontrado));
                  localStorage.setItem("permissoesAtivasPdv", JSON.stringify(colabEncontrado.permissoes || {}));

                  setOperadorLogado(colabEncontrado);
                  setModalPinAberto(false);
                  setPinDigitado("");

                  window.location.reload();
                } else {
                  alert("❌ PIN inválido! Tente novamente.");
                  setPinDigitado("");
                }
              }}
              style={{ width: "100%", padding: "11px", background: theme.primary, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
            >
              Entrar no Caixa
            </button>
          </div>
        </div>
      )}

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: theme.bgCard,
        padding: "8px 16px",
        borderRadius: "8px",
        border: `1px solid ${theme.border}`,
        marginBottom: "10px",
        boxSizing: "border-box",
        flexWrap: "wrap",
        gap: "10px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: theme.textSec, display: "flex", alignItems: "center", gap: "4px" }}>
            <Key size={14} color={theme.primary} /> Operador: <strong style={{ color: theme.textMain }}>{isDonoLoja ? "Master" : (operadorLogado?.nome || operadorLogado?.dsNomeColaborador || "Não identificado")}</strong> {isDonoLoja ? "" : `(${operadorLogado?.cargo || operadorLogado?.dsCargoColaborador || "Caixa"})`}
          </span>

          {!modalPinAberto && !isDonoLoja && (
            <button
              type="button"
              onClick={async () => {
                localStorage.removeItem("operadorAtivoPdv");
                localStorage.removeItem("permissoesAtivasPdv");
                if (lojistaId) {
                  await carregarColaboradoresAtualizados(lojistaId);
                }
                setPinDigitado("");
                setModalPinAberto(true);
              }}
              style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textSec, fontSize: "11px", padding: "3px 8px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
            >
              Trocar Operador
            </button>
          )}
        </div>

        {ultimoPedidoGerado && (
          <button
            type="button"
            onClick={() => imprimirRecibo(ultimoPedidoGerado)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              background: theme.primary,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "11px",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            <Printer size={14} /> Imprimir Último Recibo
          </button>
        )}
      </div>

      <PagamentoPdv
        cliente={cliente}
        setCliente={setCliente}
        endereco={endereco}
        setEndereco={setEndereco}
        handleCepChange={handleCepChange}
        tipoEntrega={tipoEntrega}
        setTipoEntrega={setTipoEntrega}
        valorEntregaLocal={valorEntregaLocal}
        carrinho={carrinho}
        alterarQuantidade={alterarQuantidade}
        removerDoCarrinho={removerDoCarrinho}
        setItemEditandoCartId={setItemEditandoCartId}
        formaPagamento={formaPagamento}
        setFormaPagamento={setFormaPagamento}
        vlEntrada={vlEntrada}
        setVlEntrada={setVlEntrada}
        dsPrazoRestante={dsPrazoRestante}
        setDsPrazoRestante={setDsPrazoRestante}
        calcularSubtotal={calcularSubtotal}
        calcularTotalGeral={calcularTotalGeral}
        finalizarVenda={finalizarVenda}
        carregandoVenda={carregandoVenda}
        formatarMoeda={formatarMoeda}
        theme={theme}
        styles={styles}
        onAbrirModalProdutos={() => setModalProdutosAberto(true)}
        // 📦 Repassando as propriedades de embalagem para o componente PagamentoPdv
        listaEmbalagens={listaEmbalagens}
        embalagemSelecionadaId={embalagemSelecionadaId}
        setEmbalagemSelecionadaId={setEmbalagemSelecionadaId}
      />

      <ProdutosModalPdv
        isOpen={modalProdutosAberto}
        onClose={() => setModalProdutosAberto(false)}
        produtos={produtos}
        buscaProduto={buscaProduto}
        setBuscaProduto={setBuscaProduto}
        categoriaSelecionada={categoriaSelecionada}
        setCategoriaSelecionada={setCategoriaSelecionada}
        categorias={categorias}
        lidarComCliqueProduto={(p: any, variacao?: any) => {
          lidarComCliqueProduto(p, variacao);
        }}
        formatarMoeda={formatarMoeda}
        theme={theme}
      />

      {itemEditandoCartId && itemAtualEditando && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>Personalização do Produto</h4>
              <button type="button" onClick={() => setItemEditandoCartId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSec }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.isArray(itemAtualEditando.requisitos) && itemAtualEditando.requisitos.map((req: any, index: number) => {
                const labelCampo = req.label || req.nome || `Campo ${index + 1}`;
                const tipoCampo = req.tipo || "text";
                const valorAtual = itemAtualEditando.personalizacao?.[labelCampo] || "";

                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: theme.textSec }}>
                      {labelCampo} {req.obrigatorio ? "*" : ""}
                    </label>
                    <input
                      type={tipoCampo === "date" ? "date" : "text"}
                      autoComplete="off"
                      placeholder={`Digite ${labelCampo.toLowerCase()}...`}
                      value={valorAtual}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCarrinho(carrinho.map(c => c.cartItemId === itemAtualEditando.cartItemId ? {
                          ...c,
                          personalizacao: { ...c.personalizacao, [labelCampo]: val }
                        } : c));
                      }}
                      style={{ background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputModalBase }}
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setItemEditandoCartId(null)}
              style={{ width: '100%', padding: '9px', borderRadius: '8px', backgroundColor: theme.primary, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '10px' }}
            >
              Salvar e Fechar
            </button>
          </div>
        </div>
      )}

      {produtoSelecionado && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}` }}>
            <h3 style={{ marginTop: 0, color: theme.textMain, fontSize: "16px" }}>Configurar Produto</h3>
            <p style={{ fontSize: "13px", color: theme.textSec, fontWeight: "600", margin: "4px 0 15px 0" }}>{produtoSelecionado.nome}</p>

            {produtoSelecionado.temVariacoes && produtoSelecionado.variacoes.length > 0 && (
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: theme.textMain, display: "block", marginBottom: "6px" }}>Selecione o Modelo/Cor:</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {coresDisponiveis.map((cor, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTrocarCor(cor, produtoSelecionado)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: corSelecionada === cor ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                        background: corSelecionada === cor ? theme.bgApp : theme.inputBg,
                        color: theme.textMain,
                        fontWeight: "600",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      {cor}
                    </button>
                  ))}
                </div>

                <label style={{ fontSize: "12px", fontWeight: "bold", color: theme.textMain, display: "block", marginBottom: "6px" }}>Selecione a Variação:</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {tamanhosDisponiveis.map((v, idx) => {
                    const nomeVarItem = v.dsVariacaoProduto || v.dsNomeProduto || v.dsModeloProduto || "";
                    const precoVar = v.vlPrecoProduto ?? v.preco ?? produtoSelecionado.preco;
                    return (
                      <div
                        key={idx}
                        onClick={() => setVariacaoEscolhida(v)}
                        style={{
                          padding: "8px",
                          borderRadius: "8px",
                          border: variacaoEscolhida === v ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                          background: variacaoEscolhida === v ? theme.bgApp : theme.inputBg,
                          cursor: "pointer",
                          textAlign: "center"
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: theme.textMain }}>{nomeVarItem}</div>
                        <div style={{ fontSize: "10px", color: theme.primary, fontWeight: "bold" }}>{formatarMoeda(precoVar ? Number(precoVar.toString().replace(',', '.')) : produtoSelecionado.preco)}</div>
                        <div style={{ fontSize: "9px", color: theme.textSec }}>Est: {v.nrEstoqueProduto ?? v.estoque ?? 0}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setProdutoSelecionado(null)}
                style={{ flex: 1, padding: "10px", background: theme.border, border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", color: theme.textMain }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  adicionarAoCarrinhoDireto(produtoSelecionado, variacaoEscolhida);
                }}
                style={{ flex: 1, padding: "10px", background: theme.primary, border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", color: "#fff" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: ${isModoNoturno ? "#0f172a" : "#f1f5f9"};
        }
        ::-webkit-scrollbar-thumb {
          background: ${isModoNoturno ? "#334155" : "#cbd5e1"};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${isModoNoturno ? "#475569" : "#94a3b8"};
        }

        @media (max-width: 900px) {
          .pdv-grid-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
  </div>
  );
}

const styles: any = {
  btnQtd: { border: "none", width: "22px", height: "22px", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" },
  btnRemove: { background: "none", border: "none", cursor: "pointer", fontSize: "13px", padding: "0 4px" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 },
  modalContent: { padding: "20px", borderRadius: "12px", width: "400px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  inputModalBase: { width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
  inputPDVBase: { width: '100%', padding: '7px 9px', borderRadius: '6px', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }
};