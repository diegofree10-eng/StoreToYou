"use client";

import { Produto } from '@/types';
import { useCart } from "@/context/CartContext";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Gift, Copy, Check, Trash2, Plus, Minus } from "lucide-react";
import { FaInstagram, FaFacebook, FaWhatsapp, FaTiktok, FaYoutube, FaTwitter } from "react-icons/fa";
import { executarFluxoPedido } from "../_components/helperPedido";
import { useLoja } from "@/app/[lojista]/_components/LojaContext";

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
    cart: Produto[];
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

  const safeCart: Produto[] = useMemo(() => Array.isArray(cart) ? cart : [], [cart]);
  const temFrete = useMemo(() => safeCart.some(item => !isItemDigital(item)), [safeCart, isItemDigital]);

  const isLojaAberta = useMemo(() => {
    const lojaAtivaObj = dadosLoja || dadosLojaContext;
    if (!lojaAtivaObj) return true;
    if (lojaAtivaObj.sistema?.isLojaAberta === false) return false;
    return true;
  }, [dadosLoja, dadosLojaContext]);

  const [cliente, setCliente] = useState({ nome: "", cpf: "", cep: "", dsTelefone: "" });
  const [endereco, setEndereco] = useState({ rua: "", numero: "", bairro: "", cidade: "", uf: "", complemento: "" });
  const [personalizacoes, setPersonalizacoes] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (typeof window !== "undefined" && lojistaSlug) {
      const c = localStorage.getItem(`cliente_${lojistaSlug}`);
      const e = localStorage.getItem(`end_${lojistaSlug}`);
      const p = localStorage.getItem(`pers_${lojistaSlug}`);

      if (c) {
        try {
          const parsed = JSON.parse(c);
          setCliente({
            nome: parsed.nome || "",
            cpf: parsed.cpf || "",
            cep: parsed.cep || "",
            dsTelefone: parsed.dsTelefone || ""
          });
        } catch (err) { console.error("Erro ao parsear cliente", err); }
      }

      if (e) {
        try {
          const parsed = JSON.parse(e);
          setEndereco({
            rua: parsed.rua || "",
            numero: parsed.numero || "",
            bairro: parsed.bairro || "",
            cidade: parsed.cidade || "",
            uf: parsed.uf || "",
            complemento: parsed.complemento || ""
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

  const redesArray = Array.isArray(lojaObj?.redesSociais) ? lojaObj.redesSociais : [];
  const listaRedes = redesArray.map((item: any) => {
    const plat = (item.plataforma || "").toLowerCase();
    let icone = null;
    let urlFinal = item.url || "";

    if (plat.includes('insta')) {
      icone = <FaInstagram size={18} />;
      if (!urlFinal.startsWith('http')) {
        urlFinal = `https://instagram.com/${urlFinal.replace('@', '')}`;
      }
    } else if (plat.includes('tiktok')) {
      icone = <FaTiktok size={18} />;
      if (!urlFinal.startsWith('http')) {
        urlFinal = `https://tiktok.com/@${urlFinal.replace('@', '')}`;
      }
    } else if (plat.includes('face')) { icone = <FaFacebook size={18} />; }
    else if (plat.includes('youtube')) { icone = <FaYoutube size={18} />; }
    else if (plat.includes('twitter') || plat.includes('x')) { icone = <FaTwitter size={18} />; }

    return { key: plat, url: urlFinal, icon: icone };
  }).filter((r: any) => Boolean(r.icon) && Boolean(r.url));

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
    if (!cliente.cpf) return true;
    const limpo = cliente.cpf.replace(/\D/g, "");
    if (limpo.length < 11) return true;
    return validarCPFReal(cliente.cpf);
  }, [cliente.cpf]);

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
    const valorDoFrete = freteGratisAplicado ? 0 : Number(freteSel?.price || 0);
    return subComDesconto + valorDoFrete;
  }, [valorSubTotalComDesconto, freteSel?.price, temFrete, freteGratisConfig]);

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
      ? (cliente.cep.replace(/\D/g, "").length === 8 && endereco.numero.trim().length > 0 && freteSel !== null)
      : true;

    return cliente.nome.trim().length > 3 &&
      validarCPFReal(cliente.cpf) &&
      cliente.dsTelefone.replace(/\D/g, "").length >= 10 &&
      validacaoEntrega &&
      safeCart.length > 0;
  }, [cliente, endereco, freteSel, safeCart, isLojaAberta, temFrete]);

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
            currentLojistaId = docLoja.id;
            setLojistaId(docLoja.id);
            setDadosLoja(docLoja.data() as DadosLoja);
          }
        } catch (err) { console.error("Erro ao buscar lojista por dsSlug:", err); }
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
    if (!isLojaAberta) {
      alert("Loja em férias! Cupons temporariamente desativados.");
      return;
    }
    const lojaAtual = dadosLoja || dadosLojaContext;
    const cuponsObj = lojaAtual?.sistema?.cupons || lojaAtual?.cupons || lojaAtual?.dadosLoja?.cupons;

    if (!cuponsObj || typeof cuponsObj !== 'object') {
      return alert("Esta loja não possui cupons cadastrados.");
    }

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
    setCliente({ nome: "", cpf: "", cep: "", dsTelefone: "" });
    setEndereco({ rua: "", numero: "", bairro: "", cidade: "", uf: "", complemento: "" });
    setPersonalizacoes({});
    setFreteSel(null);
    setOpcoesFrete([]);
    router.push("/" + lojistaSlug);
  };

  const limparCupom = () => { setCupomDigitado(""); setDescontoAtivo({ valor: 0, tipo: "" }); };

  useEffect(() => {
    const cepClienteLimpo = (cliente?.cep || "").replace(/\D/g, "");

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
        const dadosCliente = await rVia.json();
        if (dadosCliente.erro) { throw new Error("CEP inválido"); }

        setEndereco(prev => ({
          ...prev,
          rua: dadosCliente.logradouro || "",
          bairro: dadosCliente.bairro || "",
          cidade: dadosCliente.localidade || "",
          uf: dadosCliente.uf || ""
        }));

        const rFrete = await fetch(`${window.location.origin}/api/frete/calcular`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cepDestino: cepClienteLimpo,
            lojistaId,
            itensFiltrados: safeCart,
            pacote: { peso: 0.5, altura: 10, largura: 20, comprimento: 20 }
          })
        });

        const listaBruta = await rFrete.json();
        let listaCalculada = Array.isArray(listaBruta) ? listaBruta.filter((f: any) => !f.error) : [];

        const lojaAtual = dadosLoja || dadosLojaContext;
        const cepLojaBruto = lojaAtual?.dadosLoja?.dsCepLoja || lojaAtual?.dsCepLoja || lojaAtual?.cep || lojaAtual?.CEP || "";
        const cepLojaLimpo = String(cepLojaBruto).replace(/\D/g, "");

        const mesmoCepLoja = cepLojaLimpo.length === 8 && cepClienteLimpo === cepLojaLimpo;
        const cidCli = dadosCliente.localidade?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cidLoj = (lojaAtual?.dadosLoja?.dsCidadeLoja || lojaAtual?.cidade || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (mesmoCepLoja || (cidCli && cidLoj && cidCli === cidLoj)) {
          listaCalculada.unshift({ id: "retirar_loja", name: "Retirar na Loja (Grátis)", price: 0 });
        }

        const permitidas = lojaAtual?.sistema?.dstransportadoras || lojaAtual?.transportadoras || {};
        let listaFiltrada = listaCalculada.filter((f: any) => {
          if (f.id === "retirar_loja") return true;
          const idLower = String(f.id).toLowerCase();
          const nomeEmpresa = String(f.company || "").toLowerCase();

          if (idLower.includes("correios") || idLower.includes("pac") || idLower.includes("sedex") || nomeEmpresa.includes("correios")) {
            return permitidas.correios !== false;
          }
          if (idLower.includes("azul") || nomeEmpresa.includes("azul")) {
            return permitidas.azul !== false;
          }
          if (idLower.includes("jadlog") || nomeEmpresa.includes("jadlog")) {
            return permitidas.jadlog !== false;
          }
          if (idLower.includes("latam") || nomeEmpresa.includes("latam")) {
            return permitidas.latam !== false;
          }
          return true;
        });

        let listaFinal = [];

        if (freteGratisConfig.atingido) {
          const opcaoGratuita = { id: "frete_gratis_ativado", name: "Frete Grátis Promocional", price: 0 };
          listaFinal = [opcaoGratuita];
          setFreteSel(opcaoGratuita);
        } else {
          listaFinal = listaFiltrada;

          if (listaFinal.length > 0) {
            const freteAnteriorValido = listaFinal.find(f => f.id === freteBackup?.id);
            setFreteSel(freteAnteriorValido || freteBackup || listaFinal[0]);
          } else {
            setFreteSel(null);
          }
        }

        setOpcoesFrete(listaFinal);
        setLoadingFrete(false);
      } catch (err) {
        console.error("Erro na cotação de frete:", err);
        setLoadingFrete(false);
      }
    }

    calcularTudo();
  }, [cliente?.cep, lojistaId, temFrete, safeCart]);

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
    if (!isLojaAberta) { alert("Loja em férias!"); return; }
    if (!podeFinalizar || !config.whatsapp || !lojistaId) return;
    const formaEnvio = !temFrete ? 'digital' : (freteSel?.id === 'retirar_loja' ? 'retirada' : 'transportadora');
    const logistica = { formaEnvio, servico: freteSel?.name || "N/A", valorFrete: freteSel?.price || 0, transportadoraId: formaEnvio === 'transportadora' ? (freteSel?.id || "padrao") : null };
    const itensProcessados = safeCart.map(item => ({ ...item, precisaFrete: !!item.precisaFrete, envioTransportadora: !!item.envioTransportadora, permiteRetirada: !!item.permiteRetirada, foto: item.foto || item.imagem || item.url || "", sku: item.sku || "SEM-SKU" }));
    const lojaAtual = dadosLoja || dadosLojaContext;
    await executarFluxoPedido({ lojistaId, lojistaSlug, cliente, endereco, personalizacoes, requisitosDoBanco, valorSubtotalProdutos, valorDesconto, totalGeral, safeCart: itensProcessados, freteSel: temFrete ? freteSel : { id: "sem_frete", name: "Entrega Digital", price: 0 }, freteBackup, freteGratisConfig, whatsappNumero: config.whatsapp.replace(/\D/g, ""), dadosLoja: lojaAtual, logistica: logistica });
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorComMascara = aplicarMascaraCEP(e.target.value);
    const novoCliente = { ...cliente, cep: valorComMascara };
    setCliente(novoCliente);
    if (typeof window !== "undefined") {
      localStorage.setItem(`cliente_${lojistaSlug}`, JSON.stringify(novoCliente));
    }
    const cepLimpo = valorComMascara.replace(/\D/g, "");
    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        if (!data.erro) {
          const novoEndereco = {
            ...endereco,
            rua: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            uf: data.uf || ""
          };
          setEndereco(novoEndereco);
          if (typeof window !== "undefined") {
            localStorage.setItem(`end_${lojistaSlug}`, JSON.stringify(novoEndereco));
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  const [buscandoCep, setBuscandoCep] = useState(false);

  return (
    <div style={{ backgroundColor: config.corFundoSite, color: config.corTexto, minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box', paddingBottom: '60px', overflowX: 'hidden', position: 'relative' }}>

      {/* TOPO DE AVISOS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '8px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', textAlign: 'center' }}>
        <span>🚚 Frete para todo o Brasil</span>
        <span className="hide-mobile">💳 Parcele em até 12x sem juros</span>
        <span>📞 Atendimento</span>
      </div>

      {/* HEADER DA LOJA */}
      <header className="header-loja" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
        alignItems: 'center',
        backgroundColor: config.corSecundaria,
        padding: '0 25px',
        height: '80px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
          <div onClick={() => router.push(`/${slugLojista}`)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', height: '100%' }}>
            <div className="logo-wrapper-header" style={{ width: '50px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', flexShrink: 0 }}>
              {logoUrl ? <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={nomeLoja} /> : <div>🛍️</div>}
            </div>
            <div className="nome-loja-header" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: '900', color: config.corTexto, whiteSpace: 'nowrap' }}>{nomeLoja.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="search-box-placeholder" style={{ display: 'flex', width: '340px', visibility: 'hidden' }}></div>

        <div className="header-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '18px', justifySelf: 'end' }}>
          <div className="redes-sociais-desktop" style={{ display: 'flex', gap: '12px', color: '#64748b' }}>
            {listaRedes.map((rede: any) => (
              <a key={rede.key} href={rede.url} target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>{rede.icon}</a>
            ))}
          </div>
        </div>
      </header>

      {!isLojaAberta && (
        <div style={{ width: '100%', backgroundColor: '#fee2e2', color: '#991b1b', textAlign: 'center', padding: '10px', fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #fecaca' }}>
          🔴 Loja em férias / modo vitrine. Os pedidos estão temporariamente desativados.
        </div>
      )}

      <main style={{ padding: '20px 15px 120px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
        {freteGratisConfig.ativo && safeCart.length > 0 && temFrete && (
          <div style={{ width: '100%', margin: '0 auto 20px', padding: '15px', borderRadius: '15px', backgroundColor: freteGratisConfig.atingido ? '#e6f4ea' : '#fff8e1', border: `1px solid ${freteGratisConfig.atingido ? '#34a853' : '#fbbc05'}`, display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', boxSizing: 'border-box' }}>
            <Gift size={22} color={freteGratisConfig.atingido ? '#34a853' : '#fbbc05'} />
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: freteGratisConfig.atingido ? '#137333' : '#b06000', textAlign: 'center' }}>
              {freteGratisConfig.atingido ? "🎉 Parabéns! Você atingiu o valor mínimo e ganhou FRETE GRÁTIS!" : `🛒 Faltam apenas R$ ${freteGratisConfig.falta.toFixed(2).replace('.', ',')} para você ganhar Frete Grátis!`}
            </span>
          </div>
        )}
        <h2 style={{ color: config.corTexto, textAlign: 'center', marginBottom: 25, fontSize: '1.6rem', fontWeight: '900', letterSpacing: '0.5px' }}>MEU CARRINHO</h2>

        {/* CONTAINER GERAL DOS 6 BLOCOS FIXOS */}
        <div style={styles.gridContainer}>

          {/* TOPO: DUAS COLUNAS (Blocos 1, 2, 4, 5, 6) */}
          <div style={styles.topRow}>

            {/* COLUNA ESQUERDA (Bloco 1 e Bloco 2) */}
            <div style={styles.colunaEsquerda}>

              {/* BLOCO 1: ITENS (Altura maior para caber 3 itens sem scroll) */}
              {/* BLOCO 1: ITENS COM LISTA VERTICAL E SCROLL INTERNO BLINDADO */}
              <div style={styles.bloco1Itens}>
                <h4 style={{ color: config.corTexto, margin: '0 0 15px 0', fontSize: '15px', fontWeight: 'bold' }}>ITENS NO CARRINHO</h4>
                
                {/* CONTAINER COM SCROLL VERTICAL */}
                <div style={{ height: '260px', overflowY: 'auto', paddingRight: '6px', boxSizing: 'border-box' }}>
                  {safeCart.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: '60px 0' }}>Seu carrinho está vazio.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {safeCart.map((item: any, idx: number) => {
                        const chaveUnica = `${item.cartItemId || item.id || 'prod'}_${idx}`;
                        const precoUnit = Number(item.preco || item.price || 0);
                        const qtd = Number(item.qty || 1);
                        const requisitosProduto = requisitosDoBanco[item.id] || [];

                        return (
                          <div key={chaveUnica} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                            
                            {/* LINHA DO PRODUTO (FOTO, NOME, PREÇO E BOTÕES) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                              <div style={{ width: '60px', height: '60px', borderRadius: '10px', backgroundColor: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                                {item.foto || item.imagem || item.url ? (
                                  <img src={item.foto || item.imagem || item.url} alt={item.dsNomeProduto || item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '20px' }}>📦</div>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', color: config.corTexto, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.dsNomeProduto || item.nome || "Produto"}
                                </h5>
                                <span style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: config.corPrimaria, marginBottom: '2px' }}>
                                  R$ {precoUnit.toFixed(2).replace('.', ',')}
                                </span>
                                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.variacao && item.variacao !== "Padrão" ? `Variação: ${item.variacao}` : ""}
                                  {item.selectedCor ? ` • Cor: ${item.selectedCor}` : ""}
                                  {item.selectedTamanho ? ` • Tam: ${item.selectedTamanho}` : ""}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const chaveReal = item.cartItemKey || item.cartItemId || item.id;
                                    setItemQty(chaveReal, Math.max(1, qtd - 1));
                                  }}
                                  style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Minus size={12} />
                                </button>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', width: '16px', textAlign: 'center' }}>{qtd}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const chaveReal = item.cartItemKey || item.cartItemId || item.id;
                                    setItemQty(chaveReal, qtd + 1);
                                  }}
                                  style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Plus size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const chaveReal = item.cartItemKey || item.cartItemId || item.id;
                                    removeFromCart(chaveReal);
                                  }}
                                  style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* CAIXA DE PERSONALIZAÇÃO LOGO ABAIXO DO PRODUTO */}
                            {Array.isArray(requisitosProduto) && requisitosProduto.length > 0 && (
                              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', width: '100%', boxSizing: 'border-box' }}>
                                <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: config.corTexto, marginBottom: '6px' }}>
                                  ✏️ Preencha os dados de personalização:
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {requisitosProduto.map((req: any) => {
                                    const campoId = String(req.id || req.nome || Math.random());
                                    const labelCampo = req.nome || req.label || "Campo";
                                    const valorAtual = personalizacoes[chaveUnica]?.[campoId] || "";

                                    return (
                                      <div key={campoId} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '600', color: '#64748b' }}>
                                          {labelCampo} {req.obrigatorio ? "*" : ""}
                                        </label>
                                        <input
                                          type="text"
                                          placeholder={`Digite ${labelCampo.toLowerCase()}...`}
                                          value={valorAtual}
                                          onChange={(e) => {
                                            const valorDigitado = e.target.value;
                                            setPersonalizacoes((prev: any) => {
                                              const novoEstado = {
                                                ...prev,
                                                [chaveUnica]: {
                                                  ...(prev[chaveUnica] || {}),
                                                  [campoId]: valorDigitado
                                                }
                                              };
                                              if (typeof window !== "undefined" && lojistaSlug) {
                                                localStorage.setItem(`pers_${lojistaSlug}`, JSON.stringify(novoEstado));
                                              }
                                              return novoEstado;
                                            });
                                          }}
                                          style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '11px',
                                            outline: 'none',
                                            backgroundColor: '#fff',
                                            color: '#1e293b',
                                            boxSizing: 'border-box'
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* BLOCO 2: ENDEREÇO (Mantém o tamanho original) */}
              <div style={styles.bloco2Endereco}>
                <h4 style={{ color: config.corTexto, margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>DADOS DO CLIENTE</h4>

                <input
                  placeholder="Nome Completo *"
                  style={styles.inputStyle}
                  value={cliente.nome || ""}
                  onChange={e => {
                    const c = { ...cliente, nome: e.target.value };
                    setCliente(c);
                    if (typeof window !== "undefined") localStorage.setItem(`cliente_${lojistaSlug}`, JSON.stringify(c));
                  }}
                />

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    placeholder="WhatsApp (com DDD) *"
                    style={{ ...styles.inputStyle, flex: 1, marginBottom: 0 }}
                    value={cliente.dsTelefone || ""}
                    onChange={e => {
                      const valor = e.target.value.replace(/\D/g, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
                      const novoCliente = { ...cliente, dsTelefone: valor };
                      setCliente(novoCliente);
                      if (typeof window !== "undefined") localStorage.setItem(`cliente_${lojistaSlug}`, JSON.stringify(novoCliente));
                    }}
                  />
                  <input
                    placeholder="CPF *"
                    style={{ ...styles.inputStyle, flex: 1, marginBottom: 0 }}
                    value={cliente.cpf || ""}
                    onChange={e => {
                      const c = { ...cliente, cpf: aplicarMascaraCPF(e.target.value) };
                      setCliente(c);
                      if (typeof window !== "undefined") localStorage.setItem(`cliente_${lojistaSlug}`, JSON.stringify(c));
                    }}
                  />
                </div>
                {!cpfValido && <p style={{ color: '#ff4d4d', fontSize: '11px', margin: '-5px 0 8px 0', fontWeight: 'bold' }}>⚠️ CPF inválido</p>}

                <h4 style={{ color: config.corTexto, margin: '12px 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>ENDEREÇO DE ENTREGA</h4>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    placeholder="CEP *"
                    style={{ ...styles.inputStyle, flex: '1.2', marginBottom: 0 }}
                    value={cliente.cep}
                    onChange={handleCepChange}
                  />
                  <input
                    placeholder="Rua / Avenida"
                    value={endereco.rua}
                    style={{ ...styles.inputStyle, flex: '3', backgroundColor: '#f1f5f9', marginBottom: 0 }}
                    readOnly
                  />
                  <input
                    placeholder="Nº *"
                    style={{ ...styles.inputStyle, flex: '0.8', marginBottom: 0 }}
                    value={endereco.numero}
                    onChange={e => {
                      const num = e.target.value.replace(/\D/g, "");
                      const end = { ...endereco, numero: num };
                      setEndereco(end);
                      if (typeof window !== "undefined") localStorage.setItem(`end_${lojistaSlug}`, JSON.stringify(end));
                    }}
                  />
                </div>

                <input
                  placeholder="Complemento / Ponto de referência"
                  style={styles.inputStyle}
                  value={endereco.complemento || ""}
                  onChange={e => {
                    const comp = { ...endereco, complemento: e.target.value };
                    setEndereco(comp);
                    if (typeof window !== "undefined") localStorage.setItem(`end_${lojistaSlug}`, JSON.stringify(comp));
                  }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input placeholder="Bairro" value={endereco.bairro} style={{ ...styles.inputStyle, flex: '1.5', backgroundColor: '#f1f5f9', marginBottom: 0 }} readOnly />
                  <input placeholder="Cidade" value={endereco.cidade} style={{ ...styles.inputStyle, flex: '2', backgroundColor: '#f1f5f9', marginBottom: 0 }} readOnly />
                  <input placeholder="UF" value={endereco.uf} style={{ ...styles.inputStyle, flex: '0.6', backgroundColor: '#f1f5f9', marginBottom: 0 }} readOnly />
                </div>
              </div>

            </div>

            {/* COLUNA DIREITA (Bloco 4, Bloco 5 e Bloco 6) */}
            <div style={styles.colunaDireita}>

              {/* BLOCO 4: RESUMO (Subtotal, Frete, Cupom, Total) */}
              <div style={styles.bloco4Resumo}>
                <h4 style={{ color: config.corTexto, margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>RESUMO DO PEDIDO</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: config.corTexto }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <b>R$ {Number(valorSubtotalProdutos || 0).toFixed(2).replace('.', ',')}</b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Frete:</span>
                    <b>{temFrete ? (freteSel ? (freteSel.price === 0 ? "Grátis" : `R$ ${Number(freteSel.price).toFixed(2).replace('.', ',')}`) : "0,00") : "Grátis"}</b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: descontoAtivo.valor > 0 ? '#16a34a' : config.corTexto }}>
                    <span>Cupom:</span>
                    <b>{descontoAtivo.valor > 0 ? `- R$ ${Number(valorDesconto || 0).toFixed(2).replace('.', ',')}` : "0,00"}</b>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <b>Total:</b>
                    <b style={{ color: config.corPrimaria }}>R$ {Number(totalGeral || 0).toFixed(2).replace('.', ',')}</b>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                  <input
                    placeholder="Cupom de desconto"
                    style={{ ...styles.inputStyle, flex: 1, marginBottom: 0, padding: '10px 12px' }}
                    value={cupomDigitado}
                    onChange={e => setCupomDigitado(e.target.value)}
                  />
                  {descontoAtivo.valor > 0 ? (
                    <button onClick={limparCupom} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', padding: '0 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remover</button>
                  ) : (
                    <button onClick={aplicarCupom} style={{ background: config.corPrimaria, color: '#fff', border: 'none', borderRadius: '10px', padding: '0 12px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Aplicar</button>
                  )}
                </div>
              </div>

              {/* BLOCO 5: PIX E BOTÕES */}
              <div style={styles.bloco5Pix}>
                <h4 style={{ color: config.corTexto, margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>PAGAMENTO VIA PIX</h4>

                {temCheckoutOnlineAtivo() ? (
                  <div style={{ textAlign: 'center', padding: '10px 0', color: '#64748b', fontSize: '12px' }}>
                    Checkout Online ativado.
                  </div>
                ) : qrCodeUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '6px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <img src={qrCodeUrl} alt="QR Code Pix" style={{ width: '120px', height: '120px', display: 'block' }} />
                    </div>
                    <button
                      onClick={() => {
                        if (payloadPixBruto) {
                          navigator.clipboard.writeText(payloadPixBruto);
                          setCopiadoPix(true);
                          setTimeout(() => setCopiadoPix(false), 3000);
                        }
                      }}
                      style={{ background: config.corPrimaria, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {copiadoPix ? <Check size={14} /> : <Copy size={14} />}
                      {copiadoPix ? "Copiado!" : "Copiar Código PIX"}
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '15px 0', color: '#64748b', fontSize: '12px' }}>
                    Preencha os dados e o endereço para gerar o QR Code.
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <button
                    disabled={!podeFinalizar || !isLojaAberta}
                    onClick={finalizarNoWhatsApp}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: podeFinalizar && isLojaAberta ? '#22c55e' : '#cbd5e1',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: podeFinalizar && isLojaAberta ? 'pointer' : 'not-allowed'
                    }}
                  >
                    FINALIZAR PEDIDO NO WHATSAPP
                  </button>

                  <button
                    onClick={limparTudo}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Limpar Carrinho e Dados
                  </button>
                </div>
              </div>

              {/* BLOCO 6: EM BRANCO PARA ALINHAR PERFEITAMENTE */}
              <div style={styles.bloco6Branco}></div>

            </div>

          </div>

          {/* ABAIXO: BLOCO 3 (LARGURA TOTAL DA PÁGINA COM DUAS LINHAS DE CARDS DE FRETE) */}
          {temFrete && (
            <div style={styles.bloco3Frete}>
              <h4 style={{ color: config.corTexto, margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', textAlign: 'center', }}>OPÇÕES DE FRETE</h4>

              {loadingFrete && <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: '5px 0' }}>Calculando frete...</p>}

              <div className="frete-grid-responsivo">
                {opcoesFrete && opcoesFrete.length > 0 ? (
                  opcoesFrete.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setFreteSel(f);
                        if (f.id !== "frete_gratis_ativado") {
                          setFreteBackup(f);
                        }
                      }}
                      style={{ ...styles.freteCard, borderColor: freteSel?.id === f.id ? config.corPrimaria : '#e2e8f0', background: freteSel?.id === f.id ? config.corSecundaria : '#fff', color: config.corTexto }}
                    >
                      <small style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</small>
                      <b style={{ display: 'block', fontSize: '12px' }}>{f.price === 0 ? "Grátis" : "R$ " + Number(f.price).toFixed(2).replace('.', ',')}</b>
                    </button>
                  ))
                ) : (
                  !loadingFrete && cliente.cep?.replace(/\D/g, "").length === 8 ? (
                    <p style={{ fontSize: '13px', color: '#ef4444', textAlign: 'center', gridColumn: '1 / -1', margin: 'auto' }}>
                      Nenhuma transportadora disponível para este CEP.
                    </p>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', gridColumn: '1 / -1', margin: 'auto' }}>
                      Digite o CEP nos dados acima para carregar as opções de frete.
                    </p>
                  )
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      <style jsx>{`
        .frete-grid-responsivo {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 1024px) {
          .header-loja {
            display: flex !important;
            flex-direction: column !important;
            height: auto !important;
            padding: 10px 15px !important;
            gap: 10px !important;
          }
          .header-loja > div:nth-child(1) {
            width: 100% !important;
            justify-content: flex-start !important;
          }
          .search-box-placeholder {
            display: none !important;
          }
          .header-actions-right {
            width: 100% !important;
            justify-self: auto !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-top: 1px solid #f1f5f9 !important;
            padding-top: 8px !important;
          }
          .redes-sociais-desktop {
            display: flex !important;
            gap: 12px !important;
          }
          .logo-wrapper-header {
            width: 35px !important;
            height: 45px !important;
          }
          .nome-loja-header span {
            font-size: 13px !important;
            max-width: 170px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .frete-grid-responsivo {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    boxSizing: 'border-box'
  },
  topRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    width: '100%',
    boxSizing: 'border-box',
    alignItems: 'flex-start'
  },
  colunaEsquerda: {
    flex: '2 1 650px',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  colunaDireita: {
    flex: '1 1 340px',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  bloco1Itens: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxSizing: 'border-box',
    width: '100%',
    border: '1px solid #f1f5f9',
    height: '350px', // 👈 Bloco 1 maior para caber 3 itens confortavelmente sem scroll
    maxHeight: '350px',
    overflowY: 'hidden'
  },
  bloco2Endereco: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxSizing: 'border-box',
    width: '100%',
    border: '1px solid #f1f5f9',
    height: '310px', // 👈 Bloco 2 mantido no tamanho original
    maxHeight: '310px'
  },
  bloco3Frete: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxSizing: 'border-box',
    width: '100%',
    border: '1px solid #f1f5f9',
    minHeight: '160px', // 👈 Largura total embaixo, dimensionado para 2 linhas de cards de frete
  },
  bloco4Resumo: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxSizing: 'border-box',
    width: '100%',
    border: '1px solid #f1f5f9',
    height: '235px', // 👈 Altura mantida
    maxHeight: '235px'
  },
  bloco5Pix: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxSizing: 'border-box',
    width: '100%',
    border: '1px solid #f1f5f9',
    height: '325px', // 👈 Altura mantida
    maxHeight: '325px'
  },
  bloco6Branco: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxSizing: 'border-box',
    width: '100%',
    border: '1px solid #f1f5f9',
    height: '80px', // 👈 Altura adaptada para fechar com perfeição
    maxHeight: '100px'
  },
  inputStyle: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: '10px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    outline: 'none',
    boxSizing: 'border-box',
    fontSize: '12px',
    backgroundColor: '#f8fafc',
    color: '#1e293b'
  },
  freteCard: {
    padding: '8px 6px',
    border: '2px solid',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'center',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
    width: '100%'
  }
};