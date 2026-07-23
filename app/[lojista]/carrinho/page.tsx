"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useLoja } from "@/app/[lojista]/_components/LojaContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Gift, AlertCircle } from "lucide-react";
import { FaInstagram, FaFacebook, FaWhatsapp, FaTiktok, FaYoutube, FaTwitter } from "react-icons/fa";
import { executarFluxoPedido } from "../_components/helperPedido";

// Importando o layout e os componentes dos blocos
import CarrinhoLayoutGrid from "./_components/CarrinhoLayoutGrid";
import BlocoItensCarrinho from "./_components/BlocoItensCarrinho";
import BlocoDadosCliente from "./_components/BlocoDadosCliente";
import BlocoOpcoesFrete from "./_components/BlocoOpcoesFrete";
import BlocoResumoPedido from "./_components/BlocoResumoPedido";
import BlocoPagamentoPix from "./_components/BlocoPagamentoPix";

interface DadosLoja {
  nomeLoja: string;
  logoUrl?: string;
  whatsapp?: string;
  freteGratisAtivo?: boolean;
  valorMinimoFreteGratis?: string;
  transportadoras?: any;
  cidade?: string;
  tema?: any;
  lojaAberta?: boolean;
  isLojaAberta?: boolean;
  chavePix?: string;
  pix?: string;
  cupons?: any;
  plano?: string;
  mercadoPago?: { ativo?: boolean; sandbox?: boolean };
  pagseguro?: { ativo?: boolean; sandbox?: boolean };
  cep?: string;
  CEP?: string;
  dadosLoja?: any;
  aparencia?: any;
  categorias?: any[];
  sistema?: any;
  dsCepLoja?: string;
}

export default function CarrinhoIdentidadeVisual() {
  const { cart, setItemQty, removeFromCart, clearCart } = useCart() as {
    cart: any[];
    setItemQty: (key: string, qty: number) => void;
    removeFromCart: (key: string) => void;
    clearCart: () => void;
  };
  const router = useRouter();
  const params = useParams();
  const { dadosLoja: dadosLojaContext } = useLoja();

  const lojistaSlug = (params?.lojista as string) || (params?.slug as string) || "";
  const slugLojista = lojistaSlug;

  const isItemDigital = useCallback((item: any) =>
    item.precisaFrete === false &&
    item.envioTransportadora === false &&
    item.permiteRetirada === false, []);

  const [dadosLoja, setDadosLoja] = useState<DadosLoja | null>(null);
  const [lojistaId, setLojistaId] = useState<string | null>(null);
  const [cupomDigitado, setCupomDigitado] = useState("");
  const [descontoAtivo, setDescontoAtivo] = useState({ valor: 0, tipo: "" });
  const [requisitosDoBanco, setRequisitosDoBanco] = useState<Record<string, any>>({});
  const [copiadoPix, setCopiadoPix] = useState(false);

  const safeCart = useMemo(() => Array.isArray(cart) ? cart : [], [cart]);
  const temFrete = useMemo(() => safeCart.some(item => !isItemDigital(item)), [safeCart, isItemDigital]);

  // Validação se existe pelo menos um item digital no carrinho
  const temItemDigitalNoCarrinho = useMemo(() => {
    return safeCart.some(item => item.envioTransportadora === false && item.permiteRetirada === false);
  }, [safeCart]);

  const isLojaAberta = useMemo(() => {
    const lojaAtivaObj = dadosLoja || dadosLojaContext;
    if (!lojaAtivaObj) return true;
    if (lojaAtivaObj.sistema?.isLojaAberta === false) return false;
    return true;
  }, [dadosLoja, dadosLojaContext]);

  // Estados padronizados com o sufixo Cliente
  const [cliente, setCliente] = useState({ nmNomeCliente: "", dsCpfCliente: "", dsCepCliente: "", dsTelefoneCliente: "", dsEmailCliente: "" });
  const [endereco, setEndereco] = useState({ dsRuaCliente: "", dsNumeroCliente: "", dsBairroCliente: "", dsCidadeCliente: "", dsUfCliente: "", dsComplementoCliente: "" });
  const [personalizacoes, setPersonalizacoes] = useState<Record<string, Record<string, string>>>({});
  const [buscandoCep, setBuscandoCep] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && lojistaSlug) {
      const c = localStorage.getItem(`cliente_${lojistaSlug}`);
      const e = localStorage.getItem(`end_${lojistaSlug}`);
      const p = localStorage.getItem(`pers_${lojistaSlug}`);

      if (c) {
        try {
          const parsed = JSON.parse(c);
          setCliente({
            nmNomeCliente: parsed.nmNomeCliente || parsed.nome || "",
            dsCpfCliente: parsed.dsCpfCliente || parsed.cpf || "",
            dsCepCliente: parsed.dsCepCliente || parsed.cep || "",
            dsTelefoneCliente: parsed.dsTelefoneCliente || parsed.dsTelefone || "",
            dsEmailCliente: parsed.dsEmailCliente || parsed.email || ""
          });
        } catch (err) { console.error("Erro ao parsear cliente", err); }
      }

      if (e) {
        try {
          const parsed = JSON.parse(e);
          setEndereco({
            dsRuaCliente: parsed.dsRuaCliente || parsed.rua || "",
            dsNumeroCliente: parsed.dsNumeroCliente || parsed.numero || "",
            dsBairroCliente: parsed.dsBairroCliente || parsed.bairro || "",
            dsCidadeCliente: parsed.dsCidadeCliente || parsed.cidade || "",
            dsUfCliente: parsed.dsUfCliente || parsed.uf || "",
            dsComplementoCliente: parsed.dsComplementoCliente || parsed.complemento || ""
          });
        } catch (err) { console.error("Erro ao parsear endereço", err); }
      }

      if (p) {
        try { setPersonalizacoes(JSON.parse(p)); } catch (err) { console.error("Erro ao parsear personalizacoes", err); }
      }
    }
  }, [lojistaSlug]);

  const [opcoesFrete, setOpcoesFrete] = useState<any[]>([]);
  const [freteSel, setFreteSel] = useState<any>(null);
  const [loadingFrete, setLoadingFrete] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [payloadPixBruto, setPayloadPixBruto] = useState("");
  const [freteBackup, setFreteBackup] = useState<any>(null);

  const lojaObj = dadosLoja?.dadosLoja || dadosLoja || dadosLojaContext?.dadosLoja || dadosLojaContext || {};
  const ap = dadosLoja?.aparencia || dadosLojaContext?.aparencia || dadosLoja?.tema || dadosLojaContext?.tema || {};

  const nomeLoja = lojaObj?.dsNomeLoja || lojaObj?.nomeLoja || lojistaSlug || "Loja";
  const logoUrl = lojaObj?.dsLogoLoja || lojaObj?.logoUrl || "";

  const config = useMemo(() => ({
    corPrimaria: ap?.dscorPrincipal || ap?.corPrincipal || "#6366f1",
    corSecundaria: ap?.dscorSecundaria || ap?.corSecundaria || "#fdf5eb",
    corFundoSite: ap?.dscorFundo || ap?.corFundo || "#f8fafc",
    corTexto: ap?.dscorTextoCard || ap?.corTexto || "#1e293b",
    whatsapp: lojaObj?.nrWhatssapLoja || lojaObj?.whatsapp || ""
  }), [ap, lojaObj]);

  const validarCPFReal = (cpf: string): boolean => {
    const limpo = cpf.replace(/\D/g, "");
    if (limpo.length !== 11 || /^(\d)\1{10}$/.test(limpo)) return false;
    let soma = 0; let resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(limpo.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(limpo.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.substring(10, 11))) return false;
    return true;
  };

  const cpfValido = useMemo(() => {
    if (!cliente.dsCpfCliente) return true;
    const limpo = cliente.dsCpfCliente.replace(/\D/g, "");
    if (limpo.length < 11) return true;
    return validarCPFReal(cliente.dsCpfCliente);
  }, [cliente.dsCpfCliente]);

  const aplicarMascaraCPF = (valor: string) => {
    const limpo = valor.replace(/\D/g, "");
    if (limpo.length > 11) return valor.substring(0, 14);
    return limpo.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").substring(0, 14);
  };

  const aplicarMascaraCEP = (valor: string) => {
    const limpo = valor.replace(/\D/g, "");
    return limpo.replace(/(\d{5})(\d)/, "$1-$2").substring(0, 9);
  };

  const valorSubtotalProdutos = useMemo(() => {
    if (!Array.isArray(safeCart) || safeCart.length === 0) return 0;
    return safeCart.reduce((acc, item) => {
      const preco = Number(item.preco || item.price || 0);
      const qtd = Number(item.qty || 1);
      return acc + (preco * qtd);
    }, 0);
  }, [safeCart]);

  const freteGratisConfig = useMemo(() => {
    const lojaAtual = dadosLoja || dadosLojaContext;
    const ativoFrete = lojaAtual?.sistema?.isFreteGratisAtivo || lojaAtual?.freteGratisAtivo || dadosLojaContext?.freteGratisAtivo;
    if (!ativoFrete) return { ativo: false, atingido: false, minimo: 0, falta: 0 };
    const valorMinimoStr = lojaAtual?.sistema?.vlFreteGratisMinimo || lojaAtual?.valorMinimoFreteGratis || dadosLojaContext?.valorMinimoFreteGratis || "0";
    const valorLimpo = String(valorMinimoStr).replace(/\./g, "").replace(",", ".");
    const valorMinimo = parseFloat(valorLimpo) || 0;
    const atingido = valorSubtotalProdutos >= valorMinimo;
    const falta = Math.max(0, valorMinimo - valorSubtotalProdutos);
    return { ativo: true, atingido, minimo: valorMinimo, falta };
  }, [dadosLoja, dadosLojaContext, valorSubtotalProdutos]);

  const valorDesconto = useMemo(() => {
    if (descontoAtivo.tipo === "fixo") return Number(descontoAtivo.valor || 0);
    if (descontoAtivo.tipo === "porcentagem") return valorSubtotalProdutos * (Number(descontoAtivo.valor || 0) / 100);
    return 0;
  }, [valorSubtotalProdutos, descontoAtivo]);

  const valorSubTotalComDesconto = useMemo(() => {
    const sub = Number(valorSubtotalProdutos || 0) - Number(valorDesconto || 0);
    return Math.max(0, sub);
  }, [valorSubtotalProdutos, valorDesconto]);

  const totalGeral = useMemo(() => {
    const subComDesconto = Number(valorSubTotalComDesconto || 0);
    if (!temFrete) return subComDesconto;
    const freteGratisAplicado = freteGratisConfig.ativo && freteGratisConfig.atingido;
    const ehRetirada = freteSel?.id === "retirar_loja" || freteSel?.formaEnvio === "retirada";
    const valorDoFrete = (freteGratisAplicado || ehRetirada) ? 0 : Number(freteSel?.price || 0);
    return subComDesconto + valorDoFrete;
  }, [valorSubTotalComDesconto, freteSel, temFrete, freteGratisConfig]);

  const lojistaAtivouEPlanoLiberou = useCallback((gateway: "mercado_pago" | "pagseguro") => {
    const lojaAtivaObj = dadosLoja || dadosLojaContext;
    if (!lojaAtivaObj) return false;
    const ativoNoLojista = gateway === "mercado_pago" ? !!lojaAtivaObj.mercadoPago?.ativo : !!lojaAtivaObj.pagseguro?.ativo;
    if (!ativoNoLojista) return false;
    const sandboxAtivo = lojaAtivaObj?.pagseguro?.sandbox === true || lojaAtivaObj?.mercadoPago?.sandbox === true;
    if (sandboxAtivo) return true;
    const plano = lojaAtivaObj.plano || "Bronze";
    if (gateway === "mercado_pago") return plano === "Prata" || plano === "Ouro";
    if (gateway === "pagseguro") return plano === "Ouro";
    return false;
  }, [dadosLoja, dadosLojaContext]);

  const temCheckoutOnlineAtivo = useCallback(() => lojistaAtivouEPlanoLiberou("mercado_pago") || lojistaAtivouEPlanoLiberou("pagseguro"), [lojistaAtivouEPlanoLiberou]);

  const podeFinalizar = useMemo(() => {
    if (!isLojaAberta) return false;
    const validacaoEntrega = temFrete
      ? (cliente.dsCepCliente.replace(/\D/g, "").length === 8 && endereco.dsNumeroCliente.trim().length > 0 && freteSel !== null)
      : true;

    const validacaoEmailDigital = temItemDigitalNoCarrinho ? (cliente.dsEmailCliente && cliente.dsEmailCliente.includes("@")) : true;

    const resultado = cliente.nmNomeCliente.trim().length > 3 &&
      validarCPFReal(cliente.dsCpfCliente) &&
      cliente.dsTelefoneCliente.replace(/\D/g, "").length >= 10 &&
      validacaoEntrega &&
      validacaoEmailDigital &&
      safeCart.length > 0;

    return !!resultado; // 👈 Garante estritamente um valor booleano (true ou false)
  }, [cliente, endereco, freteSel, safeCart, isLojaAberta, temFrete, temItemDigitalNoCarrinho]);
  
  useEffect(() => {
    async function carregarDadosLojista() {
      let currentLojistaId = lojistaId;
      if (slugLojista && !currentLojistaId) {
        try {
          let q = query(collection(db, "lojistas"), where("dsSlug", "==", slugLojista), limit(1));
          let querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            q = query(collection(db, "lojistas"), where("dadosLoja.dsSlug", "==", slugLojista), limit(1));
            querySnapshot = await getDocs(q);
          }

          if (!querySnapshot.empty) {
            const docLoja = querySnapshot.docs[0];
            setLojistaId(docLoja.id);
            setDadosLoja(docLoja.data() as DadosLoja);
          }
        } catch (err) { console.error("Erro ao buscar lojista:", err); }
      }
    }
    carregarDadosLojista();
  }, [slugLojista, lojistaId]);

  useEffect(() => {
    if (!lojistaId || safeCart.length === 0) return;
    async function sincronizarRequisitos() {
      try {
        const novosRequisitos: Record<string, any> = {};
        for (const item of safeCart) {
          if (item.id && !novosRequisitos[item.id]) {
            const produtoRef = doc(db, "lojistas", lojistaId!, "produtos", item.id);
            const snap = await getDoc(produtoRef);
            if (snap.exists() && snap.data().requisitos) {
              novosRequisitos[item.id] = snap.data().requisitos;
            }
          }
        }
        setRequisitosDoBanco(prev => ({ ...prev, ...novosRequisitos }));
      } catch (err) { console.error(err); }
    }
    sincronizarRequisitos();
  }, [safeCart, lojistaId]);

  const aplicarCupom = () => {
    if (!isLojaAberta) { alert("Loja em férias!"); return; }
    const lojaAtual = dadosLoja || dadosLojaContext;
    const cuponsObj = lojaAtual?.sistema?.cupons || lojaAtual?.cupons || lojaAtual?.dadosLoja?.cupons;
    if (!cuponsObj || typeof cuponsObj !== 'object') return alert("Esta loja não possui cupons cadastrados.");

    const codigoLimpo = cupomDigitado.toUpperCase().trim();
    const cupomEncontrado = cuponsObj[codigoLimpo];

    if (cupomEncontrado && (cupomEncontrado.ativo === true || cupomEncontrado.ativo === "true")) {
      setDescontoAtivo({ valor: Number(cupomEncontrado.valor), tipo: cupomEncontrado.tipo });
      alert("Cupom aplicado com sucesso!");
    } else {
      alert("Cupom inválido ou expirado.");
    }
  };

  const limparTudo = () => {
    clearCart();
    localStorage.removeItem(`cliente_${lojistaSlug}`);
    localStorage.removeItem(`end_${lojistaSlug}`);
    localStorage.removeItem(`pers_${lojistaSlug}`);
    setCliente({ nmNomeCliente: "", dsCpfCliente: "", dsCepCliente: "", dsTelefoneCliente: "", dsEmailCliente: "" });
    setEndereco({ dsRuaCliente: "", dsNumeroCliente: "", dsBairroCliente: "", dsCidadeCliente: "", dsUfCliente: "", dsComplementoCliente: "" });
    setPersonalizacoes({});
    setFreteSel(null);
    setOpcoesFrete([]);
    router.push("/" + lojistaSlug);
  };

  const limparCupom = () => { setCupomDigitado(""); setDescontoAtivo({ valor: 0, tipo: "" }); };

  useEffect(() => {
    const cepClienteLimpo = (cliente?.dsCepCliente || "").replace(/\D/g, "");
    if (safeCart.length === 0 || !temFrete || cepClienteLimpo.length !== 8 || !lojistaId) {
      setOpcoesFrete([]);
      setFreteSel(null);
      setLoadingFrete(false);
      return;
    }
    setLoadingFrete(true);

    async function calcularTudo() {
      try {
        const rVia = await fetch(`https://viacep.com.br/ws/${cepClienteLimpo}/json/`);
        const dadosClienteVia = await rVia.json();

        // Tratamento seguro para CEP inválido
        if (dadosClienteVia.erro) {
          setEndereco({ dsRuaCliente: "", dsNumeroCliente: "", dsBairroCliente: "", dsCidadeCliente: "", dsUfCliente: "", dsComplementoCliente: "" });
          setOpcoesFrete([]);
          setFreteSel(null);
          setLoadingFrete(false);
          return;
        }

        setEndereco(prev => ({
          ...prev,
          dsRuaCliente: dadosClienteVia.logradouro || "",
          dsBairroCliente: dadosClienteVia.bairro || "",
          dsCidadeCliente: dadosClienteVia.localidade || "",
          dsUfCliente: dadosClienteVia.uf || ""
        }));

        const rFrete = await fetch(`${window.location.origin}/api/frete/calcular`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cepDestino: cepClienteLimpo, lojistaId, itensFiltrados: safeCart, pacote: { peso: 0.5, altura: 10, largura: 20, comprimento: 20 } })
        });

        const listaBruta = await rFrete.json();
        let listaCalculada = Array.isArray(listaBruta) ? listaBruta.filter((f: any) => !f.error) : [];

        const lojaAtual = dadosLoja || dadosLojaContext;
        const cepLojaBruto = lojaAtual?.dadosLoja?.dsCepLoja || lojaAtual?.dsCepLoja || lojaAtual?.cep || lojaAtual?.CEP || "";
        const cepLojaLimpo = String(cepLojaBruto).replace(/\D/g, "");
        const mesmoCepLoja = cepLojaLimpo.length === 8 && cepClienteLimpo === cepLojaLimpo;
        const cidCli = dadosClienteVia.localidade?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cidLoj = (lojaAtual?.dadosLoja?.dsCidadeLoja || lojaAtual?.cidade || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (mesmoCepLoja || (cidCli && cidLoj && cidCli === cidLoj)) {
          listaCalculada.unshift({ id: "retirar_loja", name: "Retirar na Loja (Grátis)", price: 0 });
        }

        if (freteGratisConfig.atingido) {
          const opcaoGratuita = { id: "frete_gratis_ativado", name: "Frete Grátis Promocional", price: 0 };
          setOpcoesFrete([opcaoGratuita]);
          setFreteSel(opcaoGratuita);
        } else {
          setOpcoesFrete(listaCalculada);
          if (listaCalculada.length > 0) {
            setFreteSel(freteBackup || listaCalculada[0]);
          } else {
            setFreteSel(null);
          }
        }
        setLoadingFrete(false);
      } catch (err) {
        console.error("Erro no frete:", err);
        setLoadingFrete(false);
      }
    }
    calcularTudo();
  }, [cliente?.dsCepCliente, lojistaId, temFrete, safeCart, freteGratisConfig.atingido]);

  useEffect(() => {
    if (temCheckoutOnlineAtivo()) { setQrCodeUrl(""); setPayloadPixBruto(""); return; }
    const lojaAtual = dadosLoja || dadosLojaContext;
    const chavePixBrutaObjeto = lojaAtual?.pagamentos?.dsChavePix || lojaAtual?.chavePix || lojaAtual?.pix || "";
    const chavePixValor = typeof chavePixBrutaObjeto === 'object' && chavePixBrutaObjeto !== null
      ? (chavePixBrutaObjeto.valor || "")
      : String(chavePixBrutaObjeto);

    const fontPix = chavePixValor.trim();
    if (!fontPix || totalGeral <= 0) { setQrCodeUrl(""); setPayloadPixBruto(""); return; }

    let chaveFormatada = fontPix;
    const apenasNumeros = chaveFormatada.replace(/\D/g, "");
    if (!chaveFormatada.includes("@") && chaveFormatada.length <= 15 && !/[a-zA-Z]/.test(chaveFormatada)) {
      if (apenasNumeros.length >= 10 && apenasNumeros.length <= 13) {
        chaveFormatada = apenasNumeros.startsWith("55") ? `+${apenasNumeros}` : `+55${apenasNumeros}`;
      }
    }

    const v = totalGeral.toFixed(2);
    const f = (id: string, val: string) => id + String(val.length).padStart(2, "0") + val;
    let payload = f("00", "01") + f("26", f("00", "br.gov.bcb.pix") + f("01", chaveFormatada)) + f("52", "0000") + f("53", "986") + f("54", v) + f("58", "BR") + f("59", "LOJA") + f("60", "CIDADE") + f("62", f("05", "***")) + "6304";

    const crc16 = (s: string) => {
      let c = 0xFFFF;
      for (let i = 0; i < s.length; i++) {
        c ^= s.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) { if ((c & 0x8000) !== 0) c = (c << 1) ^ 0x1021; else c <<= 1; }
      }
      return (c & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
    };

    const payloadFinal = payload + crc16(payload);
    setPayloadPixBruto(payloadFinal);
    setQrCodeUrl("https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(payloadFinal));
  }, [dadosLoja, dadosLojaContext, totalGeral, temCheckoutOnlineAtivo]);

  const finalizarNoWhatsApp = async () => {
    if (!isLojaAberta) {
      alert("Loja em férias!");
      return;
    }

    if (!config.whatsapp) {
      alert("O número do WhatsApp da loja não está configurado.");
      return;
    }

    if (!lojistaId) {
      alert("ID da loja não encontrado.");
      return;
    }

    if (!podeFinalizar) {
      alert("Por favor, preencha todos os campos obrigatórios corretamente (Nome, WhatsApp, CPF, Endereço e E-mail se houver produto digital).");
      return;
    }

    try {
      const formaEnvio = !temFrete ? 'digital' : (freteSel?.id === 'retirar_loja' ? 'retirada' : 'transportadora');
      const logistica = {
        formaEnvio,
        servico: freteSel?.name || "N/A",
        valorFrete: freteSel?.price || 0,
        transportadoraId: formaEnvio === 'transportadora' ? (freteSel?.id || "padrao") : null
      };

      const itensProcessados = safeCart.map(item => ({
        ...item,
        precisaFrete: !!item.precisaFrete,
        foto: item.foto || item.imagem || item.url || "",
        sku: item.sku || "SEM-SKU"
      }));

      const lojaAtual = dadosLoja || dadosLojaContext;

      let numeroLimpo = config.whatsapp.replace(/\D/g, "");
      if (!numeroLimpo.startsWith("55") && numeroLimpo.length >= 10) {
        numeroLimpo = "55" + numeroLimpo;
      }

      await executarFluxoPedido({
        lojistaId,
        lojistaSlug,
        cliente,
        endereco,
        personalizacoes,
        requisitosDoBanco,
        valorSubtotalProdutos,
        valorDesconto,
        totalGeral,
        safeCart: itensProcessados,
        freteSel: temFrete ? freteSel : { id: "sem_frete", name: "Entrega Digital", price: 0 },
        freteBackup,
        freteGratisConfig,
        whatsappNumero: numeroLimpo,
        dadosLoja: lojaAtual,
        logistica,
        cupomDigitado
      });

    } catch (error) {
      console.error("Erro crítico ao finalizar pedido no WhatsApp:", error);
      alert("Ocorreu um erro ao gerar o pedido. Tente novamente.");
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorComMascara = aplicarMascaraCEP(e.target.value);
    const novoCliente = { ...cliente, dsCepCliente: valorComMascara };
    setCliente(novoCliente);
    if (typeof window !== "undefined") localStorage.setItem(`cliente_${lojistaSlug}`, JSON.stringify(novoCliente));

    const cepLimpo = valorComMascara.replace(/\D/g, "");

    if (cepLimpo.length < 8) {
      const enderecoVazio = { dsRuaCliente: "", dsNumeroCliente: "", dsBairroCliente: "", dsCidadeCliente: "", dsUfCliente: "", dsComplementoCliente: "" };
      setEndereco(enderecoVazio);
      setOpcoesFrete([]);
      setFreteSel(null);
      if (typeof window !== "undefined") localStorage.removeItem(`end_${lojistaSlug}`);
      return;
    }

    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        if (!data.erro) {
          const novoEndereco = {
            ...endereco,
            dsRuaCliente: data.logradouro || "",
            dsBairroCliente: data.bairro || "",
            dsCidadeCliente: data.localidade || "",
            dsUfCliente: data.uf || ""
          };
          setEndereco(novoEndereco);
          if (typeof window !== "undefined") localStorage.setItem(`end_${lojistaSlug}`, JSON.stringify(novoEndereco));
        } else {
          setEndereco({ dsRuaCliente: "", dsNumeroCliente: "", dsBairroCliente: "", dsCidadeCliente: "", dsUfCliente: "", dsComplementoCliente: "" });
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  return (
    <div style={{ backgroundColor: config.corFundoSite, color: config.corTexto, minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box', paddingBottom: '0px' }}>

      {/* TOPO DE AVISOS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '8px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', textAlign: 'center' }}>
        <span>🚚 Frete para todo o Brasil</span>
        <span>💳 Pague com pix</span>
        <span>📞 Atendimento</span>
      </div>

      {/* HEADER DA LOJA */}
      <header className="header-loja" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', backgroundColor: config.corSecundaria, padding: '0 25px', height: '80px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
          <div onClick={() => router.push(`/${slugLojista}`)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', height: '100%' }}>
            <div style={{ width: '50px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
              {logoUrl ? <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={nomeLoja} /> : <div>🛍️</div>}
            </div>
            <span style={{ fontSize: '15px', fontWeight: '900', color: config.corTexto }}>{nomeLoja.toUpperCase()}</span>
          </div>
        </div>
      </header>

      {!isLojaAberta && (
        <div style={{ width: '100%', backgroundColor: '#fee2e2', color: '#991b1b', textAlign: 'center', padding: '10px', fontSize: '13px', fontWeight: 'bold' }}>
          🔴 Loja em férias / modo vitrine. Pedidos temporariamente desativados.
        </div>
      )}

      <main style={{ padding: '20px 15px 10px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
        {freteGratisConfig.ativo && safeCart.length > 0 && temFrete && (
          <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto 20px auto', padding: '15px', borderRadius: '15px', backgroundColor: freteGratisConfig.atingido ? '#e6f4ea' : '#fff8e1', border: `1px solid ${freteGratisConfig.atingido ? '#34a853' : '#fbbc05'}`, display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', boxSizing: 'border-box' }}>
            <Gift size={22} color={freteGratisConfig.atingido ? '#34a853' : '#fbbc05'} />
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: freteGratisConfig.atingido ? '#137333' : '#b06000' }}>
              {freteGratisConfig.atingido ? "🎉 Parabéns! Você ganhou FRETE GRÁTIS!" : `🛒 Faltam R$ ${freteGratisConfig.falta.toFixed(2).replace('.', ',')} para ganhar Frete Grátis!`}
            </span>
          </div>
        )}

        <h2 style={{ color: config.corTexto, textAlign: 'center', marginBottom: 25, fontSize: '1.6rem', fontWeight: '900' }}>MEU CARRINHO</h2>

        {/* GRID DOS 6 BLOCOS FIXOS */}
        <CarrinhoLayoutGrid
          temFrete={temFrete}
          bloco1={
            <BlocoItensCarrinho
              safeCart={safeCart}
              config={config}
              requisitosDoBanco={requisitosDoBanco}
              personalizacoes={personalizacoes}
              setPersonalizacoes={setPersonalizacoes}
              setItemQty={setItemQty}
              removeFromCart={removeFromCart}
              lojistaSlug={lojistaId || lojistaSlug}
            />
          }
          bloco2={
            <BlocoDadosCliente
              cliente={cliente}
              setCliente={setCliente}
              endereco={endereco}
              setEndereco={setEndereco}
              handleCepChange={handleCepChange}
              cpfValido={cpfValido}
              aplicarMascaraCPF={aplicarMascaraCPF}
              config={config}
              stylesInput={stylesInput}
              temItemDigital={temItemDigitalNoCarrinho}
            />
          }
          bloco3={
            <BlocoOpcoesFrete
              opcoesFrete={opcoesFrete}
              freteSel={freteSel}
              setFreteSel={setFreteSel}
              setFreteBackup={setFreteBackup}
              loadingFrete={loadingFrete}
              clienteCep={cliente.dsCepCliente}
              config={config}
            />
          }
          bloco4={
            <BlocoResumoPedido
              valorSubtotalProdutos={valorSubtotalProdutos}
              temFrete={temFrete}
              freteSel={freteSel}
              descontoAtivo={descontoAtivo}
              valorDesconto={valorDesconto}
              totalGeral={totalGeral}
              cupomDigitado={cupomDigitado}
              setCupomDigitado={setCupomDigitado}
              aplicarCupom={aplicarCupom}
              limparCupom={limparCupom}
              config={config}
              stylesInput={stylesInput}
            />
          }
          bloco5={
            <BlocoPagamentoPix
              temCheckoutOnlineAtivo={temCheckoutOnlineAtivo}
              qrCodeUrl={qrCodeUrl}
              payloadPixBruto={payloadPixBruto}
              copiadoPix={copiadoPix}
              setCopiadoPix={setCopiadoPix}
              podeFinalizar={podeFinalizar}
              isLojaAberta={isLojaAberta}
              finalizarNoWhatsApp={finalizarNoWhatsApp}
              limparTudo={limparTudo}
              config={config}
            />
          }
          bloco6={
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
              <AlertCircle size={24} color="#d97706" />
              <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4', margin: 0 }}>
                ⚠️ Após o pagamento via Pix, por favor envie o comprovante diretamente para o nosso WhatsApp. <b>O pedido só entrará em produção após a confirmação do pagamento.</b>
              </p>
            </div>
          }
        />
      </main>

      {/* RODAPÉ DA LOJA DE PONTA A PONTA */}
      <footer style={{
        backgroundColor: config.corSecundaria,
        width: '100%',
        margin: '5px 0 0 0',
        borderTop: '1px solid #e2e8f0',
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '12px 25px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {logoUrl ? <img src={logoUrl} style={{ width: '25px', height: '25px', objectFit: 'contain' }} alt={nomeLoja} /> : <span>🛍️</span>}
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: config.corTexto }}>{nomeLoja.toUpperCase()}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
            Todos os direitos reservados © {new Date().getFullYear()}
          </div>
        </div>
      </footer>

    </div>
  );
}

const stylesInput = {
  inputStyle: {
    width: '100%',
    padding: '8px 10px',
    marginBottom: '8px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontSize: '11px',
    backgroundColor: '#f8fafc',
    color: '#1e293b'
  }
};