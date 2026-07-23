"use client";

import { Produto } from '@/types';
import { useCart } from "@/context/CartContext";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Gift } from "lucide-react";
import { FaInstagram, FaFacebook, FaWhatsapp, FaTiktok, FaYoutube, FaTwitter } from "react-icons/fa";
import { executarFluxoPedido } from "../_components/helperPedido";
import { useLoja } from "@/app/[lojista]/_components/LojaContext";

import ItemCarrinho from "./_components/ItemCarrinho";
import SecaoClienteEndereco from "./_components/BlocoDadosCliente";
import ResumoPedidoCard from "./_components/BlocoResumoPedido";

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
    if (temCheckoutOnlineAtivo()) { setQrCodeUrl(""); return; }
    const lojaAtual = dadosLoja || dadosLojaContext;

    const chavePixBrutaObjeto = lojaAtual?.pagamentos?.dsChavePix || lojaAtual?.chavePix || lojaAtual?.pix || "";
    const chavePixValor = typeof chavePixBrutaObjeto === 'object' && chavePixBrutaObjeto !== null
      ? (chavePixBrutaObjeto.valor || "")
      : String(chavePixBrutaObjeto);

    const fontPix = chavePixValor.trim();
    if (!fontPix || totalGeral <= 0) { setQrCodeUrl(""); return; }

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

    setQrCodeUrl("https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(payload + crc16(payload)));
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

  const atualizarSubCampoPersonalizacao = (key: string, campoId: string, valorBruto: string) => {
    if (!isLojaAberta) return;
    setPersonalizacoes(prev => ({ ...prev, [key]: { ...prev[key], [String(campoId)]: valorBruto } }));
  };

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

        <div style={styles.grid}>
          {/* COLUNA ESQUERDA: Itens + Dados do Cliente/Endereço */}
          <div style={styles.mainColumn}>
            <ItemCarrinho
              safeCart={safeCart}
              isLojaAberta={isLojaAberta}
              corPrimaria={config.corPrimaria}
              corSecundaria={config.corSecundaria}
              corTexto={config.corTexto}
              requisitosDoBanco={requisitosDoBanco}
              personalizacoes={personalizacoes}
              setItemQty={setItemQty}
              removeFromCart={removeFromCart}
              atualizarSubCampoPersonalizacao={atualizarSubCampoPersonalizacao}
              isItemDigital={isItemDigital}
            />

            <SecaoClienteEndereco
              cliente={cliente}
              endereco={endereco}
              setCliente={setCliente}
              setEndereco={setEndereco}
              aplicarMascaraCPF={aplicarMascaraCPF}
              aplicarMascaraCEP={aplicarMascaraCEP}
              cpfValido={cpfValido}
              temFrete={temFrete}
              safeCartLength={safeCart.length}
              loadingFrete={loadingFrete}
              opcoesFrete={opcoesFrete}
              setOpcoesFrete={setOpcoesFrete}
              freteSel={freteSel}
              setFreteSel={setFreteSel}
              setFreteBackup={setFreteBackup}
              corPrimaria={config.corPrimaria}
              corSecundaria={config.corSecundaria}
              corTexto={config.corTexto}
              lojistaSlug={lojistaId || lojistaSlug}
            />
          </div>

          {/* COLUNA DIREITA: Resumo e Pagamento */}
          <div style={summaryColumnStyle}>
            <ResumoPedidoCard
              valorSubtotalProdutos={valorSubtotalProdutos}
              valorDesconto={valorDesconto}
              valorSubTotalComDesconto={valorSubTotalComDesconto}
              temFrete={temFrete}
              freteGratisConfig={freteGratisConfig}
              freteSel={freteSel}
              totalGeral={totalGeral}
              cupomDigitado={cupomDigitado}
              setCupomDigitado={setCupomDigitado}
              descontoAtivo={descontoAtivo}
              aplicarCupom={aplicarCupom}
              limparCupom={limparCupom}
              temCheckoutOnlineAtivo={temCheckoutOnlineAtivo}
              qrCodeUrl={qrCodeUrl}
              dadosLoja={dadosLoja}
              dadosLojaContext={dadosLojaContext}
              isLojaAberta={isLojaAberta}
              podeFinalizar={podeFinalizar}
              finalizarNoWhatsApp={finalizarNoWhatsApp}
              limparTudo={limparTudo}
              corPrimaria={config.corPrimaria}
              corTexto={config.corTexto}
            />
          </div>
        </div>
      </main>

      <style jsx>{`
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
        }
      `}</style>
    </div>
  );
}

const summaryColumnStyle: React.CSSProperties = { 
  flex: '1 1 340px', 
  width: '100%', 
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column'
};

const styles: Record<string, React.CSSProperties> = {
  grid: { 
    display: 'flex', 
    gap: '25px', 
    flexWrap: 'wrap', 
    width: '100%', 
    boxSizing: 'border-box', 
    alignItems: 'stretch' // 👈 Mantém as duas colunas esticadas com a mesma altura exata
  },
  mainColumn: { 
    flex: '2 1 650px', 
    width: '100%', 
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px' 
  }
};