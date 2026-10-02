// app/admin/config/page.tsx (ou o caminho equivalente do seu componente AdminConfig)
"use client";

import { useEffect, useState } from "react";
import { db, auth, storage } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection, query, orderBy, getDoc, updateDoc, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FiBell, FiAlertTriangle, FiXCircle } from "react-icons/fi";

// 🌟 Importando o hook do tema global (ThemeContext)
import { useTheme } from "@/context/ThemeContext";

import UpgradeModal from "@/app/admin/_components/UpgradeModal";
import CupomModal from "@/app/admin/_components/CupomModal";
import HorarioModal from "@/app/admin/_components/HorarioModal";

// Importação das Abas Modularizadas
import DadosPessoaisTab from "./tabsConfig/DadosPessoaisTab";
import DadosLojaTab from "./tabsConfig/DadosLojaTab";
import BannerTab from "./tabsConfig/BannerTab";
import PagamentosTab from "./tabsConfig/PagamentosTab";
import AparenciaTab from "./tabsConfig/AparenciaTab";
import SistemaTab from "./tabsConfig/SistemaTab";
import MensagensTab from "./tabsConfig/MensagensTab";
import AssinaturaTab from "./tabsConfig/AssinaturaTab";
import AtualizacoesTab from "./tabsConfig/AtualizacoesTab";

export default function AdminConfig() {
  // 🌟 CONSUMINDO O TEMA GLOBALMENTE NO INÍCIO DO COMPONENTE
  const { theme } = useTheme();

  interface ConfigState {
    dadosPessoais: { [key: string]: any };
    dadosLoja: { [key: string]: any };
    banners: { [key: string]: any };
    pagamentos: { [key: string]: any };
    aparencia: {
      dscorFundo?: string;
      dscorPrincipal?: string;
      dscorSecundaria?: string;
      dscorTextoCard?: string;
      isModoNoturno?: boolean;
      configuracoesWhatsapp?: { msgProducao?: string; msgEnviado?: string; msgConcluido?: string };
      [key: string]: any;
    };
    sistema: { [key: string]: any };
    atualizacao: { [key: string]: any };
    historicoMensagens: any[];
    financeiro: { [key: string]: any };
    redesSociais: any[];
    historicoPagamentos?: any[];
    indicadoPor?: string; // 🌟 Tipagem estrita adicionada
  }

  const [config, setConfig] = useState<ConfigState>({
    dadosPessoais: { dsNomeResponsavel: "", dsCpfResponsavel: "", dsEmailResponsavel: "", dsRuaResponsavel: "", nrNumeroResponsavel: "", dsBairroResponsavel: "", dsCidadeResponsavel: "", dsUfResponsavel: "", dsCepResponsavel: "", dsTelResponsavel: "", dsRole: "" },
    dadosLoja: { dsNomeLoja: "Nova Loja", dsRuaLoja: "", nrNumeroLoja: "", dsCepLoja: "", dsBairroLoja: "", dsCidadeLoja: "", dsUfLoja: "", nrCnpjCpfLoja: "", dsStatusLoja: "ativo", dsPlanoLoja: "Bronze", nrWhatssapLoja: "", dsSeguimentoLoja: "", dsSlug: "", dsLogoLoja: "", redesSociais: [] },
    banners: { dsDesktop: [], dsMobile: [], dsBanner1: "", dsBanner2: "", dsBanner3: "", dsLinkBanner1: "", dsLinkBanner2: "", dsLinkBanner3: "" },
    pagamentos: { dsChavePix: "", dsMercadoPago: { publicKey: "", accessToken: "", ativo: false }, dsPagSeguro: { token: "", email: "", ativo: false } },

    // 🌟 Organizado perfeitamente dentro do mapa aparencia
    aparencia: {
      dscorFundo: "#f8fafc",
      dscorPrincipal: "#FF8C00",
      dscorSecundaria: "#F5F5DC",
      dscorTextoCard: "#1e293b",
      isModoNoturno: false,
      configuracoesWhatsapp: { msgProducao: "", msgEnviado: "", msgConcluido: "" }
    },

    sistema: { isFreteGratisAtivo: false, vlFreteGratisMinimo: 0, dsTokenMelhorEnvio: "", dstransportadoras: { correios: true, jadlog: true, azul: true, latam: true }, cupons: {}, horarios: {}, isLojaAberta: true, dsVersaoSistema: "1.0.0" },
    atualizacao: { nrVersaoSistemaLogista: "0.0.0", nrVersaoSchemaLogista: 0 },
    historicoMensagens: [],
    financeiro: { vlLucroReal: 0, vlMetaFaturamentoMensal: 0, vlTicketMedio: 0 },
    redesSociais: [],
    historicoPagamentos: []
  });

  const [uid, setUid] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState("pessoal");
  const [dadosAntigos, setDadosAntigos] = useState<any>({});
  const [contagemProdutos, setContagemProdutos] = useState(0);
  const [planosConfig, setPlanosConfig] = useState<any>(null);
  const [avisoPopup, setAvisoPopup] = useState<any>(null);
  const [listaCategorias, setListaCategorias] = useState<any[]>([]);
  const [showToken, setShowToken] = useState(false);

  const [showCupomModal, setShowCupomModal] = useState(false);
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [novaLogo, setNovaLogo] = useState<File | null>(null);
  const [arquivoBanner1, setArquivoBanner1] = useState<File | null>(null);
  const [arquivoBanner2, setArquivoBanner2] = useState<File | null>(null);
  const [arquivoBanner3, setArquivoBanner3] = useState<File | null>(null);

  // Modo Noturno verificado via Tema Global
  const isModoNoturno = theme.bgApp === "#0f172a";

  useEffect(() => {
    if (!uid) return;

    const unsubMensagens = onSnapshot(
      query(collection(db, "lojistas", uid, "mensagens"), orderBy("dataEnvio", "desc")),
      (snap) => {
        const mensagens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setConfig((prev: ConfigState) => ({ ...prev, historicoMensagens: mensagens }));
      },
      (error) => { console.warn("Erro temporário em mensagens:", error); }
    );

    const unsubAssinaturas = onSnapshot(
      query(collection(db, "lojistas", uid, "assinaturas"), orderBy("tsAssinaturaLojista", "desc")),
      (snap) => {
        const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setConfig((prev: any) => ({ ...prev, historicoPagamentos: lista }));
      },
      (error) => { console.warn("Erro temporário em assinaturas:", error); }
    );

    const unsubCategorias = onSnapshot(
      query(collection(db, "lojistas", uid, "categorias"), orderBy("nome", "asc")),
      (snap) => {
        setListaCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => { console.warn("Erro temporário em categorias:", error); }
    );

    const unsubProdutos = onSnapshot(
      query(collection(db, "lojistas", uid, "produtos")),
      (snap) => {
        setContagemProdutos(snap.size);
      },
      (error) => { console.warn("Erro temporário em produtos:", error); }
    );

    return () => {
      unsubMensagens();
      unsubAssinaturas();
      unsubCategorias();
      unsubProdutos();
    };
  }, [uid]);

  useEffect(() => {
    const unsubPlanos = onSnapshot(doc(db, "configuracoes", "planos"), (docSnap) => {
      if (docSnap.exists()) setPlanosConfig(docSnap.data());
    });

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "usuarios", user.uid);
          const userSnap = await getDoc(userDocRef);

          let lojaIdReal = user.uid;
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.lojaId) {
              lojaIdReal = userData.lojaId;
            }
          }

          setUid(lojaIdReal);

          const snap = await getDoc(doc(db, "lojistas", lojaIdReal));
          if (snap.exists()) {
            let dados = snap.data();

            setDadosAntigos(dados);
            setConfig((prev: ConfigState) => ({ ...prev, ...dados }));

            if (dados.mensagemMaster && !dados.mensagemMaster.lida) {
              setAvisoPopup(dados.mensagemMaster);
            }
          }
        } catch (error) {
          console.error("Erro ao carregar configurações da loja:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubPlanos();
      unsubAuth();
    };
  }, []);

  const tratarLinkRede = (plataforma: string, url: string) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `https://${url}`;
  };

  const buscarCep = async (cep: string, tipo: 'loja' | 'pessoal') => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro) {
        if (tipo === 'loja') {
          setConfig((prev: ConfigState) => ({
            ...prev,
            dadosLoja: {
              ...prev.dadosLoja,
              dsRuaLoja: data.logradouro,
              dsBairroLoja: data.bairro,
              dsCidadeLoja: data.localidade,
              dsUfLoja: data.uf
            }
          }));
        } else {
          setConfig((prev: ConfigState) => ({
            ...prev,
            dadosPessoais: {
              ...prev.dadosPessoais,
              dsRuaResponsavel: data.logradouro,
              dsBairroResponsavel: data.bairro,
              dsCidadeResponsavel: data.localidade,
              dsUfResponsavel: data.uf
            }
          }));
        }
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const handleSalvar = async () => {
    if (!uid) return;

    const dP = config.dadosPessoais;
    const dL = config.dadosLoja;

    const camposObrigatorios = [
      { valor: dP.dsNomeResponsavel, nome: "Nome do Responsável" },
      { valor: dP.dsCpfResponsavel, nome: "CPF" },
      { valor: dP.dsEmailResponsavel, nome: "E-mail Pessoal" },
      { valor: dP.dsTelResponsavel, nome: "Telefone" },
      { valor: dP.dsRuaResponsavel, nome: "Rua do Responsável" },
      { valor: dL.dsRuaLoja, nome: "Rua da Loja" },
      { valor: dL.dsCepLoja, nome: "CEP da Loja" },
      { valor: dL.dsCidadeLoja, nome: "Cidade da Loja" }
    ];

    const campoVazio = camposObrigatorios.find(c => !c.valor || c.valor.toString().trim() === "");

    if (campoVazio) {
      alert(`⚠️ Por favor, preencha o campo obrigatório: ${campoVazio.nome}`);
      return;
    }

    setSalvando(true);

    const redesFormatadas = (config.dadosLoja.redesSociais || []).map((r: any) => ({
      ...r,
      url: tratarLinkRede(r.plataforma, r.url)
    }));

    const dadosParaSalvar = {
      ...config,
      dadosLoja: {
        ...config.dadosLoja,
        redesSociais: redesFormatadas
      },
      updatedAt: Date.now()
    };

    try {
      if (novaLogo) {
        const storageRef = ref(storage, `logos_lojistas/${uid}`);
        await uploadBytes(storageRef, novaLogo);
        (dadosParaSalvar.dadosLoja as any).dsLogoLoja = await getDownloadURL(storageRef);
      }

      const comprimirImagem = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              const MAX_WIDTH = 1500;
              const scaleSize = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(); }, "image/jpeg", 0.7);
            };
          };
        });
      };

      const processarBanner = async (arquivoNovo: File | null, numero: number) => {
        if (!arquivoNovo) return config.banners[`dsBanner${numero}`];
        const campoUrlAntiga = config.banners[`dsBanner${numero}`];

        if (campoUrlAntiga && typeof campoUrlAntiga === 'string' && campoUrlAntiga.startsWith('http')) {
          try {
            const refAntiga = ref(storage, campoUrlAntiga);
            await deleteObject(refAntiga);
          } catch (e) {
            console.warn(`Aviso: Não foi possível deletar o banner ${numero} antigo do Storage:`, e);
          }
        }

        const blob = await comprimirImagem(arquivoNovo);
        const refNovo = ref(storage, `banners/${uid}/banner${numero}.jpg`);
        await uploadBytes(refNovo, blob);
        return await getDownloadURL(refNovo);
      };

      if (arquivoBanner1) dadosParaSalvar.banners.dsBanner1 = await processarBanner(arquivoBanner1, 1);
      if (arquivoBanner2) dadosParaSalvar.banners.dsBanner2 = await processarBanner(arquivoBanner2, 2);
      if (arquivoBanner3) dadosParaSalvar.banners.dsBanner3 = await processarBanner(arquivoBanner3, 3);

      await setDoc(doc(db, "lojistas", uid), dadosParaSalvar, { merge: true });

      const indicadoPor = config.indicadoPor || dadosAntigos?.indicadoPor;
      if (indicadoPor) {
        const indicacaoRef = doc(db, "lojistas", indicadoPor, "indicacoes", uid);
        const indicacaoSnap = await getDoc(indicacaoRef);

        if (indicacaoSnap.exists()) {
          await updateDoc(indicacaoRef, {
            nomeIndicado: dL.dsNomeLoja || "Loja",
            NomeResponsavelIndicado: dP.dsNomeResponsavel || "",
            CidadeResponsavelIndicado: dP.dsCidadeResponsavel || "",
            UfResponsavelIndicado: dP.dsUfResponsavel || ""
          });
        }
      }

      setDadosAntigos(dadosParaSalvar);

      alert("Configurações salvas com sucesso! ✅");
      setArquivoBanner1(null);
      setArquivoBanner2(null);
      setArquivoBanner3(null);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar configurações.");
    } finally {
      setSalvando(false);
    }
  };

  const solicitarUpgrade = async ({ planoAtual, planoDesejado, valorNovoPlano }: any) => {
    if (!uid) return;

    try {
      const idSolicitacao = `UPG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

      // 🚀 Salva apenas na subcoleção de controle de aprovação do Master (up_upgrade)
      const subColRef = doc(db, "lojistas", uid, "assinaturas", "registro_inicial", "up_upgrade", idSolicitacao);
      await setDoc(subColRef, {
        id: idSolicitacao,
        tsDataSolicitacao: Timestamp.now(),
        dsLojaId: uid,
        dsLojaNome: config.dadosLoja.dsNomeLoja || "Loja Sem Nome",
        dsPlanoAtual: planoAtual,
        dsPlanoDesejado: planoDesejado,
        tipoRegistro: "upgrade",
        vlNovoPlano: Number(valorNovoPlano || 0),
        dsStatusUpgrade: "pendente"
      });

      // Atualiza o status geral na loja indicando que há um upgrade pendente
      await updateDoc(doc(db, "lojistas", uid), {
        "sistema.dsStatusUpgrade": "pendente"
      });

      alert("🚀 Solicitação de upgrade enviada com sucesso! O Master analisará em breve.");
      setShowUpgradeModal(false);
    } catch (error) {
      console.error("Erro ao solicitar upgrade:", error);
      alert("Erro ao enviar solicitação.");
    }
  };

  const confirmarLeituraMaster = async () => {
    if (!uid) return;
    try {
      setAvisoPopup(null);
      await updateDoc(doc(db, "lojistas", uid), { "mensagemMaster.lida": true });
    } catch (error) { console.error(error); }
  };

  const confirmarLeituraMensagem = async (msgId: string) => {
    if (!uid) return;
    try {
      const msgRef = doc(db, "lojistas", uid, "mensagens", msgId);
      await updateDoc(msgRef, { lida: true });
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const masterLiberouMeioPagamento = (nomeGateway: "mercado_pago" | "pagseguro") => {
    const meuPlano = config.dadosLoja.dsPlanoLoja || "Bronze";
    if (!planosConfig || !planosConfig[meuPlano]) return false;
    const liberadosNoPlano = planosConfig[meuPlano].meios_pagamento;
    return Array.isArray(liberadosNoPlano) ? liberadosNoPlano.includes(nomeGateway) : false;
  };

  const masterLiberou = (chaveTecnica: string) => {
    const planoVigente = config.sistema?.dsPlanoTeste === "Ouro" ? "Ouro" : (config.dadosLoja?.dsPlanoLoja || "Bronze");
    if (!planosConfig || !planosConfig[planoVigente]) return false;
    return planosConfig[planoVigente][chaveTecnica] === true;
  };

  const adicionarRedeSocial = () => {
    const novasRedes = [...(config.dadosLoja.redesSociais || []), { plataforma: 'instagram', url: '' }];
    setConfig({ ...config, dadosLoja: { ...config.dadosLoja, redesSociais: novasRedes } });
  };

  const atualizarRedeSocial = (index: number, campo: string, valor: string) => {
    const novasRedes = [...(config.dadosLoja.redesSociais || [])];
    novasRedes[index] = { ...novasRedes[index], [campo]: valor };
    setConfig({ ...config, dadosLoja: { ...config.dadosLoja, redesSociais: novasRedes } });
  };

  const removerRedeSocial = (index: number) => {
    const novasRedes = config.dadosLoja.redesSociais.filter((_: any, i: number) => i !== index);
    setConfig({ ...config, dadosLoja: { ...config.dadosLoja, redesSociais: novasRedes } });
  };

  // 🚨 COMPONENTE DE BANNER DE ALERTA DE VENCIMENTO OU SUSPENSÃO
  function renderBannerAlerta() {
    const statusLoja = config.dadosLoja?.dsStatusLoja || "ativo";
    const isOuroAtivo = config.sistema?.dsPlanoTeste === "Ouro";
    const tsVencimento = isOuroAtivo ? config.sistema?.tsVencimentoTeste : config.dadosLoja?.tsVencimentoLoja;
    const dataVencimento = tsVencimento?.seconds ? new Date(tsVencimento.seconds * 1000) : null;

    if (statusLoja === "suspenso") {
      return (
        <div style={{
          background: isModoNoturno ? '#7f1d1d' : '#fee2e2',
          border: '1px solid #ef4444',
          color: isModoNoturno ? '#fca5a5' : '#991b1b',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <FiXCircle size={24} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.5' }}>
            <strong style={{ display: 'block', fontSize: '14px', fontWeight: '900', marginBottom: '2px' }}>
              Acesso Suspenso Temporariamente
            </strong>
            Sua assinatura consta como suspensa por falta de regularização. Entre em contato com o suporte ou envie o comprovante de pagamento via WhatsApp para reativar seu acesso.
          </div>
        </div>
      );
    }

    if (!dataVencimento) return null;

    const hoje = new Date();
    const diffDays = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 5) return null;

    const isVencido = diffDays < 0;
    const corBg = isVencido
      ? (isModoNoturno ? '#7f1d1d' : '#fee2e2')
      : (isModoNoturno ? '#78350f' : '#fef3c7');
    const corBorda = isVencido ? '#ef4444' : '#f59e0b';
    const corTexto = isVencido
      ? (isModoNoturno ? '#fca5a5' : '#991b1b')
      : (isModoNoturno ? '#fcd34d' : '#92400e');

    return (
      <div style={{
        background: corBg,
        border: `1px solid ${corBorda}`,
        color: corTexto,
        padding: '16px 20px',
        borderRadius: '12px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        {isVencido ? <FiXCircle size={24} style={{ flexShrink: 0 }} /> : <FiAlertTriangle size={24} style={{ flexShrink: 0 }} />}

        <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.5' }}>
          <strong style={{ display: 'block', fontSize: '14px', fontWeight: '900', marginBottom: '2px' }}>
            {isVencido ? "Sua assinatura venceu!" : `Atenção: Sua assinatura vence em ${diffDays} dia(s)!`}
          </strong>
          {isVencido
            ? `O plano expirou em ${dataVencimento.toLocaleDateString('pt-BR')}. Regularize o pagamento para evitar a suspensão dos serviços da plataforma.`
            : `Evite interrupções no funcionamento da sua loja efetuando o pagamento da mensalidade até o dia ${dataVencimento.toLocaleDateString('pt-BR')}.`
          }
        </div>
      </div>
    );
  }

  function renderSeloPlano() {
    const isOuroAtivo = config.sistema?.dsPlanoTeste === "Ouro";
    const planoBase = config.dadosLoja?.dsPlanoLoja || "Bronze";
    const info = planosConfig?.[planoBase] || { cor: "#94a3b8" };

    const tsVencimento = isOuroAtivo ? config.sistema?.tsVencimentoTeste : config.dadosLoja?.tsVencimentoLoja;
    const dataVencimento = tsVencimento?.seconds ? new Date(tsVencimento.seconds * 1000) : null;
    const dataCriacao = config.dadosLoja?.tsCriacaoLoja?.seconds ? new Date(config.dadosLoja.tsCriacaoLoja.seconds * 1000) : null;

    const hoje = new Date();
    const diasRestantes = dataVencimento ? Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const estaVencendo = diasRestantes <= 5;

    return (
      <div style={{
        ...styles.seloCard,
        border: `1px solid ${isOuroAtivo ? '#d97706' : info.cor + '40'}`,
        background: theme.bgCard
      }}>
        <div style={{ ...styles.medalhaBox, background: `${info.cor}15`, border: `2px solid ${info.cor}30` }}>
          {info.medalhaUrl ? <img src={info.medalhaUrl} style={styles.imgFull} alt="Medalha do Plano" /> : <span style={{ fontSize: '28px' }}>🏅</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '900', color: info.cor, textTransform: 'uppercase' }}>
                Plano {planoBase}
              </span>
              {isOuroAtivo && (
                <span style={{ fontSize: '9px', background: '#d97706', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  TESTE OURO
                </span>
              )}
            </div>
            <span style={{ fontSize: '10px', fontWeight: '800', background: theme.bgApp, color: theme.textSec, padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', border: `1px solid ${theme.border}` }}>
              {config.dadosLoja?.ciclo || 'mensal'}
            </span>
          </div>

          <div style={styles.infoGrid}>
            <div style={{ ...styles.infoItem, background: theme.bgApp, border: `1px solid ${theme.border}` }}>
              <small style={{ ...styles.infoLabel, color: theme.textSec }}>Criação</small>
              <span style={{ ...styles.infoValue, color: theme.textMain }}>{dataCriacao?.toLocaleDateString('pt-BR') || '---'}</span>
            </div>
            <div style={{ ...styles.infoItem, background: theme.bgApp, border: `1px solid ${theme.border}` }}>
              <small style={{ ...styles.infoLabel, color: theme.textSec }}>{isOuroAtivo ? "Fim do Teste" : "Vencimento"}</small>
              <span style={{ ...styles.infoValue, color: estaVencendo ? '#ef4444' : theme.textMain, fontWeight: estaVencendo ? '900' : '700' }}>
                {dataVencimento?.toLocaleDateString('pt-BR') || '---'}
              </span>
            </div>
            <div style={{ ...styles.infoItem, background: theme.bgApp, border: `1px solid ${theme.border}` }}>
              <small style={{ ...styles.infoLabel, color: theme.textSec }}>Status</small>
              <span style={{ ...styles.infoValue, color: estaVencendo ? '#ef4444' : '#10b981', fontWeight: '800' }}>
                {estaVencendo ? `Vence em ${diasRestantes}d!` : "Em dia"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ ...styles.center, color: theme.textMain }}>Sincronizando...</div>;

  return (
    <div style={{ ...styles.page, background: theme.bgApp, color: theme.textMain }}>
      {avisoPopup && (
        <div style={styles.overlay}>
          <div style={{ ...styles.popupCard, background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textMain }}>
            <div style={styles.popupHeader}><FiBell size={24} /> AVISO IMPORTANTE</div>
            <p style={{ ...styles.popupText, color: theme.textSec }}>{avisoPopup.texto}</p>
            <button type="button" onClick={confirmarLeituraMaster} style={styles.btnPopupConfirm}>OK, ESTOU CIENTE</button>
          </div>
        </div>
      )}

      <div style={{ ...styles.card, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: theme.textMain }}>⚙️ Configurações</h2>
          <span style={{ fontSize: '11px', fontWeight: '800', background: theme.bgApp, color: theme.textSec, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
            Versão: {config.atualizacao?.nrVersaoSistemaLogista || config.sistema?.dsVersaoSistema || "0.0.0"}
          </span>
        </div>

        {/* 🚨 RENDERIZAÇÃO DO BANNER DE ALERTA */}
        {renderBannerAlerta()}

        {renderSeloPlano()}

        <div style={{ ...styles.tabBar, borderBottom: `1px solid ${theme.border}` }}>
          <button type="button" style={abaAtiva === 'pessoal' ? { ...styles.tabBtnActive, color: theme.primary, borderBottomColor: theme.primary } : { ...styles.tabBtn, color: theme.textSec }} onClick={() => setAbaAtiva('pessoal')}>DADOS PESSOAIS</button>
          <button type="button" style={abaAtiva === 'loja' ? { ...styles.tabBtnActive, color: theme.primary, borderBottomColor: theme.primary } : { ...styles.tabBtn, color: theme.textSec }} onClick={() => setAbaAtiva('loja')}>DADOS DA LOJA</button>
          <button type="button" style={abaAtiva === 'banner' ? { ...styles.tabBtnActive, color: theme.primary, borderBottomColor: theme.primary } : { ...styles.tabBtn, color: theme.textSec }} onClick={() => setAbaAtiva('banner')}>BANNERS</button>
          <button type="button" style={abaAtiva === 'pagamentos' ? { ...styles.tabBtnActive, color: theme.primary, borderBottomColor: theme.primary } : { ...styles.tabBtn, color: theme.textSec }} onClick={() => setAbaAtiva('pagamentos')}>PAGAMENTOS</button>
          <button type="button" style={abaAtiva === 'aparencia' ? { ...styles.tabBtnActive, color: theme.primary, borderBottomColor: theme.primary } : { ...styles.tabBtn, color: theme.textSec }} onClick={() => setAbaAtiva('aparencia')}>APARÊNCIA</button>
          <button type="button" style={abaAtiva === 'sistema' ? { ...styles.tabBtnActive, color: theme.primary, borderBottomColor: theme.primary } : { ...styles.tabBtn, color: theme.textSec }} onClick={() => setAbaAtiva('sistema')}>SISTEMA / CUPONS</button>
          <button type="button" style={abaAtiva === 'mensagens' ? { ...styles.tabBtnActive, color: theme.primary, borderBottomColor: theme.primary } : { ...styles.tabBtn, color: theme.textSec }} onClick={() => setAbaAtiva('mensagens')}>MENSAGENS</button>
          <button type="button" style={abaAtiva === 'assinatura' ? { ...styles.tabBtnActive, color: theme.primary, borderBottomColor: theme.primary } : { ...styles.tabBtn, color: theme.textSec }} onClick={() => setAbaAtiva('assinatura')}>ASSINATURA</button>
          <button type="button" style={abaAtiva === 'atualizacoes' ? { ...styles.tabBtnActive, color: theme.primary, borderBottomColor: theme.primary } : { ...styles.tabBtn, color: theme.textSec }} onClick={() => setAbaAtiva('atualizacoes')}>ATUALIZAÇÕES</button>
        </div>

        {abaAtiva === 'pessoal' && <DadosPessoaisTab config={config} setConfig={setConfig} buscarCep={buscarCep} theme={theme} />}
        {abaAtiva === 'loja' && <DadosLojaTab config={config} setConfig={setConfig} buscarCep={buscarCep} novaLogo={novaLogo} setNovaLogo={setNovaLogo} setShowHorarioModal={setShowHorarioModal} adicionarRedeSocial={adicionarRedeSocial} atualizarRedeSocial={atualizarRedeSocial} removerRedeSocial={removerRedeSocial} theme={theme} />}
        {abaAtiva === 'banner' && (
          <BannerTab
            uid={uid}
            config={config}
            setConfig={setConfig}
            listaCategorias={listaCategorias}
            arquivoBanner1={arquivoBanner1}
            arquivoBanner2={arquivoBanner2}
            arquivoBanner3={arquivoBanner3}
            setArquivoBanner1={setArquivoBanner1}
            setArquivoBanner2={setArquivoBanner2}
            setArquivoBanner3={setArquivoBanner3}
            theme={theme}
          />
        )}
        {abaAtiva === 'pagamentos' && <PagamentosTab config={config} setConfig={setConfig} masterLiberouMeioPagamento={masterLiberouMeioPagamento} uid={uid} theme={theme} />}
        {abaAtiva === 'aparencia' && <AparenciaTab config={config} setConfig={setConfig} masterLiberou={masterLiberou} theme={theme} />}
        {abaAtiva === 'sistema' && <SistemaTab config={config} setConfig={setConfig} masterLiberou={masterLiberou} setShowCupomModal={setShowCupomModal} showToken={showToken} setShowToken={setShowToken} theme={theme} />}
        {abaAtiva === 'mensagens' && <MensagensTab config={config} lojistaId={uid} confirmarLeituraMensagem={confirmarLeituraMensagem} theme={theme} />}
        {abaAtiva === 'assinatura' && <AssinaturaTab config={config} planosConfig={planosConfig} setShowUpgradeModal={setShowUpgradeModal} theme={theme} />}
        {abaAtiva === 'atualizacoes' && <AtualizacoesTab config={config} theme={theme} />}

        {abaAtiva !== 'mensagens' && abaAtiva !== 'assinatura' && abaAtiva !== 'atualizacoes' && (
          <button type="button" onClick={handleSalvar} disabled={salvando} style={{ ...styles.btnSalvar, background: theme.primary, opacity: salvando ? 0.6 : 1 }}>
            {salvando ? "Processando..." : "💾 Salvar Alterações"}
          </button>
        )}

        <CupomModal
          show={showCupomModal}
          onClose={() => setShowCupomModal(false)}
          cupons={config.sistema.cupons}
          setCupons={(n: any) => setConfig({ ...config, sistema: { ...config.sistema, cupons: n } })}
          limiteCupons={planosConfig?.[config.dadosLoja.dsPlanoLoja]?.limiteCupons || 0}
          planoAtivo={config.dadosLoja.dsPlanoLoja || "Bronze"}
        />

        <HorarioModal
          show={showHorarioModal}
          onClose={() => setShowHorarioModal(false)}
          horarios={config.sistema.horarios}
          setHorarios={(n: any) => setConfig({ ...config, sistema: { ...config.sistema, horarios: n } })}
        />

        <UpgradeModal
          show={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          planos={planosConfig}
          planoAtual={config.dadosLoja.dsPlanoLoja}
          onSolicitar={solicitarUpgrade}
        />
      </div>

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
      `}</style>
    </div>
  );
}

const styles: any = {
  page: { padding: "0px 16px 40px 16px", minHeight: "100vh", display: "flex", justifyContent: "center", boxSizing: "border-box", transition: "background 0.3s" },
  card: { padding: "20px", borderRadius: "0 0 24px 24px", width: "100%", maxWidth: "970px", boxShadow: "0 10px 15px rgba(0,0,0,0.05)", marginTop: "0px", boxSizing: "border-box", transition: "background 0.3s" },

  seloCard: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%', transition: 'background 0.3s' },
  medalhaBox: { minWidth: '56px', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  imgFull: { width: '100%', height: '100%', objectFit: 'contain' },

  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', marginTop: '10px', width: '100%' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 10px', borderRadius: '8px', boxSizing: 'border-box' },
  infoLabel: { fontSize: '9px', fontWeight: '800', textTransform: 'uppercase' },
  infoValue: { fontSize: '11px', fontWeight: '700', wordBreak: 'break-word' },

  tabBar: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '25px', paddingBottom: '12px' },
  tabBtn: { padding: '12px', background: 'none', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' },
  tabBtnActive: { padding: '12px', background: 'none', border: 'none', borderBottom: '3px solid', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' },
  btnSalvar: { width: "100%", padding: "16px", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", marginTop: '30px' },
  center: { textAlign: "center", marginTop: "100px" },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  popupCard: { padding: '30px', borderRadius: '24px', maxWidth: '450px', width: '100%', textAlign: 'center' },
  popupHeader: { fontSize: '14px', fontWeight: '900', color: '#3b82f6', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  popupText: { fontSize: '16px', marginBottom: '30px', fontWeight: '500' },
  btnPopupConfirm: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }
};