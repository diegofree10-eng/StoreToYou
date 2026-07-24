import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

export function useCarrinhoLogica(lojistaSlug: string, safeCart: any[], isItemDigital: (item: any) => boolean) {
  const router = useRouter();

  const [dadosLoja, setDadosLoja] = useState<any | null>(null);
  const [lojistaId, setLojistaId] = useState<string | null>(null);
  const [cupomDigitado, setCupomDigitado] = useState("");
  const [descontoAtivo, setDescontoAtivo] = useState({ valor: 0, tipo: "" });
  const [requisitosDoBanco, setRequisitosDoBanco] = useState<Record<string, any>>({});
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [modalFreteMobileAberto, setModalFreteMobileAberto] = useState(false);

  const [cliente, setCliente] = useState({ nmNomeCliente: "", dsCpfCliente: "", dsCepCliente: "", dsTelefoneCliente: "", dsEmailCliente: "" });
  const [endereco, setEndereco] = useState({ dsRuaCliente: "", dsNumeroCliente: "", dsBairroCliente: "", dsCidadeCliente: "", dsUfCliente: "", dsComplementoCliente: "" });
  const [personalizacoes, setPersonalizacoes] = useState<Record<string, Record<string, string>>>({});
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [opcoesFrete, setOpcoesFrete] = useState<any[]>([]);
  const [freteSel, setFreteSel] = useState<any>(null);
  const [loadingFrete, setLoadingFrete] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [payloadPixBruto, setPayloadPixBruto] = useState("");
  const [freteBackup, setFreteBackup] = useState<any>(null);

  const temFrete = useMemo(() => safeCart.some(item => !isItemDigital(item)), [safeCart, isItemDigital]);
  const temItemDigitalNoCarrinho = useMemo(() => safeCart.some(item => item.envioTransportadora === false && item.permiteRetirada === false), [safeCart]);

  const isLojaAberta = useMemo(() => {
    const lojaAtivaObj = dadosLoja;
    if (!lojaAtivaObj) return true;
    if (lojaAtivaObj.sistema?.isLojaAberta === false) return false;
    return true;
  }, [dadosLoja]);

  // Carregar localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && lojistaSlug) {
      const c = localStorage.getItem(`cliente_${lojistaSlug}`);
      const e = localStorage.getItem(`end_${lojistaSlug}`);
      const p = localStorage.getItem(`pers_${lojistaSlug}`);
      if (c) { try { setCliente(JSON.parse(c)); } catch (err) {} }
      if (e) { try { setEndereco(JSON.parse(e)); } catch (err) {} }
      if (p) { try { setPersonalizacoes(JSON.parse(p)); } catch (err) {} }
    }
  }, [lojistaSlug]);

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

  return {
    dadosLoja, setDadosLoja, lojistaId, setLojistaId,
    cupomDigitado, setCupomDigitado, descontoAtivo, setDescontoAtivo,
    requisitosDoBanco, setRequisitosDoBanco, copiadoPix, setCopiadoPix,
    modalFreteMobileAberto, setModalFreteMobileAberto,
    cliente, setCliente, endereco, setEndereco,
    personalizacoes, setPersonalizacoes, buscandoCep, setBuscandoCep,
    opcoesFrete, setOpcoesFrete, freteSel, setFreteSel,
    loadingFrete, setLoadingFrete, qrCodeUrl, setQrCodeUrl,
    payloadPixBruto, setPayloadPixBruto, freteBackup, setFreteBackup,
    temFrete, temItemDigitalNoCarrinho, isLojaAberta,
    validarCPFReal, cpfValido, aplicarMascaraCPF, aplicarMascaraCEP
  };
}