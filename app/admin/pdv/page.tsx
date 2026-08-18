// app/admin/pdv/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Edit3, X, Store, Truck } from "lucide-react";
import { executarFluxoPedido } from "@/app/[lojista]/_components/helperPedido";
import { aplicarMascara, validarCPFReal } from "@/utils/formatters";
import { useTheme, PALETA_LIGHT, PALETA_DARK } from "@/context/ThemeContext";

export default function PaginaPDV() {
  // Pegando o tema de forma segura (com fallback direto para o localStorage se necessário)
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userSnap = await getDoc(doc(db, "usuarios", user.uid));
        if (userSnap.exists()) {
          const idLoja = userSnap.data().lojaId;
          setLojistaId(idLoja);

          if (idLoja) {
            const lojaRef = doc(db, "lojistas", idLoja);
            const lojaSnap = await getDoc(lojaRef);
            if (lojaSnap.exists()) {
              setDadosLoja(lojaSnap.data());
            }

            const produtosRef = collection(db, "lojistas", idLoja, "produtos");
            const snapshot = await getDocs(produtosRef);

            const listaProdutos = snapshot.docs.map(d => {
              const data = d.data();
              const precoFormatado = typeof data.precoBasico === 'string'
                ? Number(data.precoBasico.replace(',', '.'))
                : Number(data.precoBasico || 0);

              return {
                id: d.id,
                nome: data.nome || "Produto sem nome",
                preco: isNaN(precoFormatado) ? 0 : precoFormatado,
                capa: data.capa || "",
                categoria: data.categoria || "Sem Categoria",
                temVariacoes: data.temVariacoes || false,
                variacoes: data.variacoes || [],
                requisitos: data.requisitos || [],
                dsTipoProduto: data.dsTipoProduto || data.tipoProduto || "", // 🌟 Captura corretamente o tipo do produto
                ...data
              };
            });

            setProdutos(listaProdutos);
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

  const lidarComCliqueProduto = (produto: any) => {
    setDadosPersonalizadosModal({});
    const temReqs = Array.isArray(produto.requisitos) && produto.requisitos.length > 0;

    if ((produto.temVariacoes && produto.variacoes && produto.variacoes.length > 0) || temReqs) {
      if (produto.temVariacoes && produto.variacoes && produto.variacoes.length > 0) {
        const coresUnicas = Array.from(new Set(produto.variacoes.map((v: any) => v.v1))).filter(Boolean) as string[];
        setCoresDisponiveis(coresUnicas);
        const primeiraCor = coresUnicas[0] || "";
        setCorSelecionada(primeiraCor);

        const tamanhosDaCor = produto.variacoes.filter((v: any) => v.v1 === primeiraCor);
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
    const tamanhosDaCor = produto.variacoes.filter((v: any) => v.v1 === cor);
    setTamanhosDisponiveis(tamanhosDaCor);
    setVariacaoEscolhida(tamanhosDaCor[0] || null);
  };

  const adicionarAoCarrinhoDireto = (produto: any, variacao: any | null) => {
    const precoVenda = variacao && variacao.preco ? Number(variacao.preco.toString().replace(',', '.')) : produto.preco;
    const custoVenda = variacao && variacao.custo ? Number(variacao.custo.toString().replace(',', '.')) : 0;

    const cartItemId = `${produto.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const variacaoStr = variacao ? `${variacao.v1} / ${variacao.v2}` : "Padrão";
    const nomeItemFormatado = variacao ? `${produto.nome} (${variacaoStr})` : produto.nome;

    // 🌟 Identifica se o produto individualmente é digital
    const tipoProd = String(produto.dsTipoProduto || produto.tipoProduto || "").toLowerCase();
    const isDigitalItem = tipoProd.includes('digital');

    setCarrinho(prev => [
      ...prev,
      {
        cartItemId,
        id: produto.id,
        nome: nomeItemFormatado,
        preco: precoVenda,
        custo: custoVenda,
        quantidade: 1,
        foto: variacao?.foto || produto.capa,
        personalizacao: { ...dadosPersonalizadosModal },
        requisitos: produto.requisitos || [],
        variacaoStr: variacaoStr,
        variacao: variacaoStr !== "Padrão" ? variacaoStr : "",
        dsTipoProduto: produto.dsTipoProduto || produto.tipoProduto || "",
        precisaFrete: !isDigitalItem // 🌟 Se for digital, o item individualmente não precisa de frete
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

      // 🌟 Respeita a individualidade de cada item (Digital vs Físico)
      const safeCartFormatado = carrinho.map(item => {
        const tipoProdItem = String(item.dsTipoProduto || "").toLowerCase();
        const isDigital = tipoProdItem.includes('digital');

        return {
          ...item,
          idProduto: item.id,
          qty: item.quantidade,
          price: item.preco,
          dsNomeProduto: item.nome,
          dsTipoProduto: item.dsTipoProduto || "",
          precisaFrete: isDigital ? false : (tipoEntrega === "entrega_local")
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
        isFreteGratis: false
      };

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
        dsFormaPagamentoCarrinho: formaPagamento // 🌟 Repassa o valor selecionado no select do PDV para o helper
      });

      if (sucesso) {
        alert("Venda realizada com sucesso! Pedido gerado e estoque atualizado.");
        setCarrinho([]);
        setCliente({ nmNomeCliente: "Cliente Balcão", dsCpfCliente: "", dsCepCliente: "", dsTelefoneCliente: "", dsEmailCliente: "" });
        setEndereco({ dsRuaCliente: "", dsNumeroCliente: "", dsBairroCliente: "", dsCidadeCliente: "", dsUfCliente: "", dsComplementoCliente: "" });
        setTipoEntrega("retirada");
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

  const produtosFiltrados = produtos.filter(p => {
    const atendeCategoria = categoriaSelecionada === "Todos" || (p.categoria || "Sem Categoria") === categoriaSelecionada;
    const atendeBusca = p.nome?.toLowerCase().includes(buscaProduto.toLowerCase());
    return atendeCategoria && atendeBusca;
  });

  const itemAtualEditando = carrinho.find(i => i.cartItemId === itemEditandoCartId);

  if (loading) {
    return <div style={{ padding: "30px", textAlign: "center", color: theme.textSec, fontWeight: "600" }}>Carregando PDV...</div>;
  }

  return (
    <div style={{
      height: "calc(98vh - 40px)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "sans-serif",
      boxSizing: "border-box",
      padding: "0px 10px",
      background: theme.bgApp,
      color: theme.textMain,
      transition: "background 0.3s, color 0.3s"
    }}>
      <h2 style={{ color: theme.textMain, fontSize: '16px', marginBottom: '6px', fontWeight: '800', textTransform: 'uppercase', flexShrink: 0 }}>
        💳 Ponto de Venda (PDV / Caixa)
      </h2>

      <div className="pdv-main-container" style={{ display: "flex", gap: "15px", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* LADO ESQUERDO: Produtos & Busca */}
        <div style={{ background: theme.bgCard, padding: "14px", borderRadius: "12px", border: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", flex: 1.7, minHeight: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <h3 style={{ margin: 0, color: theme.textMain, fontSize: "14px", fontWeight: "800", textTransform: 'uppercase' }}>🛍️ Produtos</h3>
              <input
                type="text"
                placeholder="Pesquisar produto..."
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${theme.border}`, fontSize: "13px", outline: "none", background: theme.inputBg, color: theme.textMain, flex: "1 1 180px", maxWidth: "220px" }}
              />
            </div>

            {/* Abas de Categoria */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
              {categorias.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoriaSelecionada(cat)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    background: categoriaSelecionada === cat ? theme.primary : theme.border,
                    color: categoriaSelecionada === cat ? "#fff" : theme.textSec,
                    transition: "all 0.2s"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", overflowY: "auto", flex: 1, paddingRight: "4px", alignContent: "start" }} className="produtos-grid-pdv">
            {produtosFiltrados.length === 0 ? (
              <p style={{ fontSize: "13px", color: theme.textSec, gridColumn: "1 / -1", textAlign: "center", padding: "20px" }}>Nenhum produto encontrado.</p>
            ) : (
              produtosFiltrados.map(p => (
                <div
                  key={p.id}
                  onClick={() => lidarComCliqueProduto(p)}
                  style={{ border: `1px solid ${theme.border}`, padding: "8px", borderRadius: "8px", cursor: "pointer", textAlign: "center", background: theme.bgApp, transition: "all 0.2s", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                >
                  {p.capa ? (
                    <img src={p.capa} alt={p.nome} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "contain", background: theme.bgCard, borderRadius: "6px", marginBottom: "6px" }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1 / 1", background: theme.border, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: theme.textSec, marginBottom: "6px" }}>Sem foto</div>
                  )}
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "11px", color: theme.textMain, marginBottom: "2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.nome}</div>
                    <div style={{ color: theme.primary, fontWeight: "700", fontSize: "12px" }}>{formatarMoeda(p.preco)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LADO DIREITO: Carrinho, Dados do Cliente & Pagamento */}
        <div style={{ background: theme.bgCard, padding: "14px", borderRadius: "12px", border: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1.3, minHeight: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto", paddingRight: "4px" }}>
            <h3 style={{ marginTop: 0, color: theme.textMain, fontSize: "14px", fontWeight: "800", textTransform: 'uppercase', flexShrink: 0 }}>🛒 Carrinho & Cliente</h3>

            {/* BLOCO DE DADOS DO CLIENTE */}
            <div style={{ background: theme.bgApp, padding: '10px', borderRadius: '10px', border: `1px solid ${theme.border}`, marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '6px' }}>👤 Dados do Cliente</span>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <input
                  type="text"
                  placeholder="Nome Completo *"
                  value={cliente.nmNomeCliente}
                  onChange={(e) => setCliente(prev => ({ ...prev, nmNomeCliente: e.target.value }))}
                  style={{ flex: 2, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
                <input
                  type="text"
                  placeholder="WhatsApp *"
                  value={cliente.dsTelefoneCliente}
                  onChange={(e) => setCliente(prev => ({ ...prev, dsTelefoneCliente: aplicarMascara(e.target.value, 'tel') }))}
                  style={{ flex: 1.5, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <input
                  type="text"
                  placeholder="CPF"
                  value={cliente.dsCpfCliente}
                  onChange={(e) => setCliente(prev => ({ ...prev, dsCpfCliente: aplicarMascara(e.target.value, 'cpf') }))}
                  style={{ flex: 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
                <input
                  type="text"
                  placeholder="CEP"
                  value={cliente.dsCepCliente}
                  onChange={handleCepChange}
                  style={{ flex: 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <input
                  type="text"
                  placeholder="Rua / Endereço"
                  value={endereco.dsRuaCliente}
                  onChange={(e) => setEndereco(prev => ({ ...prev, dsRuaCliente: e.target.value }))}
                  style={{ flex: 2.5, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
                <input
                  type="text"
                  placeholder="Nº"
                  value={endereco.dsNumeroCliente}
                  onChange={(e) => setEndereco(prev => ({ ...prev, dsNumeroCliente: e.target.value }))}
                  style={{ flex: 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={endereco.dsCidadeCliente}
                  onChange={(e) => setEndereco(prev => ({ ...prev, dsCidadeCliente: e.target.value }))}
                  style={{ flex: 2, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
                <input
                  type="text"
                  placeholder="UF"
                  value={endereco.dsUfCliente}
                  onChange={(e) => setEndereco(prev => ({ ...prev, dsUfCliente: e.target.value }))}
                  style={{ flex: 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}`, ...styles.inputPDVBase }}
                />
              </div>
            </div>

            {/* TIPO DE ENTREGA */}
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textSec, display: 'block', marginBottom: '6px' }}>🚚 TIPO DE ENTREGA</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>

                <button
                  type="button"
                  onClick={() => setTipoEntrega("retirada")}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: tipoEntrega === "retirada" ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                    background: tipoEntrega === "retirada" ? theme.bgApp : theme.bgCard,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Store size={14} color={theme.primary} /> Retirar na Loja
                  </div>
                  <div style={{ fontSize: '10px', color: theme.textSec, marginTop: '2px' }}>⏱️ Disponível na loja • <b>Grátis</b></div>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoEntrega("entrega_local")}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: tipoEntrega === "entrega_local" ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                    background: tipoEntrega === "entrega_local" ? theme.bgApp : theme.bgCard,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Truck size={14} color={theme.primary} /> Entrega Local
                  </div>
                  <div style={{ fontSize: '10px', color: theme.textSec, marginTop: '2px' }}>⏱️ Até 1 dia útil • <b>{formatarMoeda(valorEntregaLocal)}</b></div>
                </button>

              </div>
            </div>

            {/* LISTA DE ITENS DO CARRINHO */}
            <div style={{ margin: "4px 0", borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, padding: "6px 0" }}>
              {carrinho.length === 0 ? (
                <p style={{ fontSize: "12px", color: theme.textSec, textAlign: "center", margin: "10px 0" }}>O carrinho está vazio</p>
              ) : (
                carrinho.map((item) => {
                  const requisitosLista = Array.isArray(item.requisitos) ? item.requisitos : [];
                  const possuiReq = requisitosLista.length > 0;

                  return (
                    <div key={item.cartItemId} style={{ display: "flex", flexDirection: "column", paddingBottom: "8px", marginBottom: "6px", borderBottom: `1px solid ${theme.border}`, gap: "4px" }}>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                        {item.foto && <img src={item.foto} alt="" style={{ width: "30px", height: "30px", objectFit: "cover", borderRadius: "6px", marginRight: "6px" }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "600", color: theme.textMain }}>{item.nome}</div>
                          {item.personalizacao && Object.values(item.personalizacao).some(Boolean) && (
                            <div style={{ fontSize: "10px", color: theme.textSec, marginTop: "2px" }}>
                              {Object.entries(item.personalizacao).map(([k, v]) => v ? <span key={k}>{k}: {String(v)} | </span> : null)}
                            </div>
                          )}
                          <div style={{ color: theme.textSec, fontSize: "11px", fontWeight: "bold" }}>{formatarMoeda(item.preco)} un</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <button onClick={() => alterarQuantidade(-1)(item.cartItemId)} style={{ ...styles.btnQtd, background: theme.border, color: theme.textMain }}>-</button>
                          <span style={{ fontWeight: "bold", fontSize: "12px", color: theme.textMain }}>{item.quantidade}</span>
                          <button onClick={() => alterarQuantidade(1)(item.cartItemId)} style={{ ...styles.btnQtd, background: theme.border, color: theme.textMain }}>+</button>
                          <strong style={{ marginLeft: "4px", color: theme.textMain }}>{formatarMoeda(item.preco * item.quantidade)}</strong>
                          <button onClick={() => removerDoCarrinho(item.cartItemId)} style={styles.btnRemove} title="Remover item">🗑️</button>
                        </div>
                      </div>

                      {possuiReq && (
                        <button
                          type="button"
                          onClick={() => setItemEditandoCartId(item.cartItemId)}
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${theme.primary}`,
                            background: theme.bgApp,
                            color: theme.primary,
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit3 size={11} />
                          Preencher dados de personalização
                        </button>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ flexShrink: 0, paddingTop: '8px' }}>
            <div style={{ margin: "4px 0" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", color: theme.textSec, display: "block", marginBottom: "2px" }}>Forma de Pagamento:</label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                style={{ width: "100%", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${theme.border}`, fontSize: "12px", outline: "none", background: theme.inputBg, color: theme.textMain }}
              >
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
              </select>
            </div>

            {/* Resumo de valores */}
            <div style={{ background: theme.bgApp, padding: "6px 8px", borderRadius: "8px", margin: "6px 0", display: "flex", flexDirection: "column", gap: "2px", border: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSec }}>
                <span>Subtotal Produtos:</span>
                <span>{formatarMoeda(calcularSubtotal())}</span>
              </div>
              {tipoEntrega === "entrega_local" && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: theme.textSec }}>
                  <span>Taxa de Entrega Local:</span>
                  <span>{formatarMoeda(valorEntregaLocal)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "bold", color: theme.textMain, borderTop: `1px solid ${theme.border}`, paddingTop: "4px", marginTop: "2px" }}>
                <span>Total Geral:</span>
                <span style={{ color: theme.primary }}>{formatarMoeda(calcularTotalGeral())}</span>
              </div>
            </div>

            <button
              onClick={finalizarVenda}
              disabled={carregandoVenda || carrinho.length === 0}
              style={{
                width: "100%",
                padding: "9px",
                background: theme.primary,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "13px",
                cursor: "pointer",
                opacity: carregandoVenda || carrinho.length === 0 ? 0.6 : 1,
                transition: "opacity 0.2s"
              }}
            >
              {carregandoVenda ? "Processando Venda..." : "Finalizar Venda"}
            </button>
          </div>
        </div>

      </div>

      {/* MODAL DE PERSONALIZAÇÃO */}
      {itemEditandoCartId && itemAtualEditando && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>Personalização do Produto</h4>
              <button
                type="button"
                onClick={() => setItemEditandoCartId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textSec }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.isArray(itemAtualEditando.requisitos) && itemAtualEditando.requisitos.map((req: any, index: number) => {
                const labelCampo = req.nome || req.label || `Campo ${index + 1}`;
                const tipoCampo = req.tipo || "text";
                const valorAtual = itemAtualEditando.personalizacao?.[labelCampo] || "";

                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: theme.textSec }}>
                      {labelCampo} {req.obrigatorio ? "*" : ""}
                    </label>
                    <input
                      type={tipoCampo === "date" ? "date" : "text"}
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
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                backgroundColor: theme.primary,
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Salvar e Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE VARIAÇÃO */}
      {produtoSelecionado && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}` }}>
            <h3 style={{ marginTop: 0, color: theme.textMain, fontSize: "16px" }}>Configurar Produto</h3>
            <p style={{ fontSize: "13px", color: theme.textSec, fontWeight: "600", margin: "4px 0 15px 0" }}>{produtoSelecionado.nome}</p>

            {produtoSelecionado.temVariacoes && produtoSelecionado.variacoes.length > 0 && (
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontSize: "12px", fontWeight: "bold", color: theme.textMain, display: "block", marginBottom: "6px" }}>Selecione a Cor:</label>
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

                <label style={{ fontSize: "12px", fontWeight: "bold", color: theme.textMain, display: "block", marginBottom: "6px" }}>Selecione o Tamanho:</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {tamanhosDisponiveis.map((v, idx) => (
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
                      <div style={{ fontSize: "12px", fontWeight: "bold", color: theme.textMain }}>{v.v2}</div>
                      <div style={{ fontSize: "10px", color: theme.primary, fontWeight: "bold" }}>{formatarMoeda(v.preco ? Number(v.preco.toString().replace(',', '.')) : produtoSelecionado.preco)}</div>
                      <div style={{ fontSize: "9px", color: theme.textSec }}>Est: {v.estoque || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setProdutoSelecionado(null)}
                style={{ flex: 1, padding: "10px", background: theme.border, border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", color: theme.textMain }}
              >
                Cancelar
              </button>
              <button
                onClick={() => adicionarAoCarrinhoDireto(produtoSelecionado, variacaoEscolhida)}
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

        @media (max-width: 1200px) {
          .produtos-grid-pdv {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }

        @media (max-width: 900px) {
          .pdv-main-container {
            flex-direction: column !important;
            overflow-y: auto !important;
            height: auto !important;
          }
          .pdv-main-container > div {
            min-height: 350px !important;
            height: auto !important;
          }
          .produtos-grid-pdv {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }

        @media (max-width: 600px) {
          .produtos-grid-pdv {
            grid-template-columns: repeat(2, 1fr) !important;
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