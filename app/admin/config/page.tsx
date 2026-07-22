"use client";

import { useEffect, useState } from "react";
import { db, auth, storage } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection, query, orderBy, getDoc, updateDoc, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FiBell, FiMessageSquare } from "react-icons/fi";

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

export default function AdminConfig() {
  interface ConfigState {
    dadosPessoais: { [key: string]: any };
    dadosLoja: { [key: string]: any };
    banners: { [key: string]: any };
    pagamentos: { [key: string]: any };
    aparencia: { [key: string]: any };
    sistema: { [key: string]: any };
    historicoMensagens: any[];
    financeiro: { [key: string]: any };
    redesSociais: any[];
    historicoPagamentos?: any[];
  }

  const [config, setConfig] = useState<ConfigState>({
    dadosPessoais: { dsNomeResponsavel: "", dsCpfResponsavel: "", dsEmailResponsavel: "", dsRuaResponsavel: "", nrNumeroResponsavel: "", dsBairroResponsavel: "", dsCidadeResponsavel: "", dsUfResponsavel: "", dsCepResponsavel: "", dsTelResponsavel: "", dsRole: "" },
    dadosLoja: { dsNomeLoja: "Nova Loja", dsRuaLoja: "", nrNumeroLoja: "", dsCepLoja: "", dsBairroLoja: "", dsCidadeLoja: "", dsUfLoja: "", nrCnpjCpfLoja: "", dsStatusLoja: "ativo", dsPlanoLoja: "Bronze", nrWhatssapLoja: "", dsSeguimentoLoja: "", dsSlug: "", dsLogoLoja: "", redesSociais: [] },
    banners: { dsDesktop: [], dsMobile: [], dsBanner1: "", dsBanner2: "", dsBanner3: "", dsLinkBanner1: "", dsLinkBanner2: "", dsLinkBanner3: "" },
    pagamentos: { dsChavePix: "", dsMercadoPago: { publicKey: "", accessToken: "", ativo: false }, dsPagSeguro: { token: "", email: "", ativo: false } },
    aparencia: { dscorFundo: "#f8fafc", dscorPrincipal: "#FF8C00", dscorSecundaria: "#F5F5DC", dscorTextoCard: "#1e293b" },
    sistema: { isFreteGratisAtivo: false, vlFreteGratisMinimo: 0, dsTokenMelhorEnvio: "", dstransportadoras: { correios: true, jadlog: true, azul: true, latam: true }, cupons: {}, horarios: {}, isLojaAberta: true },
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
  const [msgHistoricoAberta, setMsgHistoricoAberta] = useState<any>(null);
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

  useEffect(() => {
    if (!uid) return;

    const unsubMensagens = onSnapshot(
      query(collection(db, "lojistas", uid, "mensagens"), orderBy("dataEnvio", "desc")),
      (snap) => {
        const mensagens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setConfig((prev: ConfigState) => ({ ...prev, historicoMensagens: mensagens }));
      }
    );

    const unsubAssinaturas = onSnapshot(
      query(collection(db, "lojistas", uid, "assinaturas"), orderBy("tsAssinaturaLojista", "desc")),
      (snap) => {
        const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setConfig((prev: any) => ({ ...prev, historicoPagamentos: lista }));
      }
    );

    const unsubCategorias = onSnapshot(query(collection(db, "lojistas", uid, "categorias"), orderBy("nome", "asc")), (snap) => {
      setListaCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProdutos = onSnapshot(query(collection(db, "lojistas", uid, "produtos")), (snap) => {
      setContagemProdutos(snap.size);
    });

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

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        const carregarDadosConfiguracao = async () => {
          try {
            const snap = await getDoc(doc(db, "lojistas", user.uid));
            if (snap.exists()) {
              const dados = snap.data();
              setDadosAntigos(dados);
              setConfig((prev: ConfigState) => ({ ...prev, ...dados }));
              if (dados.mensagemMaster && !dados.mensagemMaster.lida) setAvisoPopup(dados.mensagemMaster);
            }
          } catch (error) {
            console.error(error);
          } finally {
            setLoading(false);
          }
        };
        carregarDadosConfiguracao();
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
      // 1. Tratamento da Logo da Loja (se houver nova, limpa a antiga ou substitui)
      if (novaLogo) {
        const storageRef = ref(storage, `logos_lojistas/${uid}`);
        await uploadBytes(storageRef, novaLogo);
        dadosParaSalvar.dadosLoja.dsLogoLoja = await getDownloadURL(storageRef);
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

      // Função auxiliar para gerenciar a troca de banners salvos
      const processarBanner = async (arquivoNovo: File | null, numero: number) => {
        if (!arquivoNovo) return config.banners[`dsBanner${numero}`]; // Retorna o atual se não mudou

        const campoUrlAntiga = config.banners[`dsBanner${numero}`];

        // Se já existia um banner antigo no Storage, deleta ele fisicamente antes
        if (campoUrlAntiga && typeof campoUrlAntiga === 'string' && campoUrlAntiga.startsWith('http')) {
          try {
            const refAntiga = ref(storage, campoUrlAntiga);
            await deleteObject(refAntiga);
          } catch (e) {
            console.warn(`Aviso: Não foi possível deletar o banner ${numero} antigo do Storage:`, e);
          }
        }

        // Faz o upload da nova imagem comprimida
        const blob = await comprimirImagem(arquivoNovo);
        const refNovo = ref(storage, `banners/${uid}/banner${numero}.jpg`);
        await uploadBytes(refNovo, blob);
        return await getDownloadURL(refNovo);
      };

      // 2. Processa e substitui os banners se houver novos arquivos selecionados
      if (arquivoBanner1) {
        dadosParaSalvar.banners.dsBanner1 = await processarBanner(arquivoBanner1, 1);
      }
      if (arquivoBanner2) {
        dadosParaSalvar.banners.dsBanner2 = await processarBanner(arquivoBanner2, 2);
      }
      if (arquivoBanner3) {
        dadosParaSalvar.banners.dsBanner3 = await processarBanner(arquivoBanner3, 3);
      }

      // 3. Salva tudo atualizado no Firestore
      await setDoc(doc(db, "lojistas", uid), dadosParaSalvar, { merge: true });
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

  const solicitarUpgrade = async (novoPlano: string) => {
    if (!uid) return;

    try {
      const subColRef = collection(db, "lojistas", uid, "assinaturas", "registro_inicial", "up_upgrade");

      await addDoc(subColRef, {
        tsDataSolicitacao: new Date(),
        dsLojaId: uid,
        dsLojaNome: config.dadosLoja.dsNomeLoja || "Loja Sem Nome",
        dsPlanoAtual: config.dadosLoja.dsPlanoLoja || "Bronze",
        dsPlanoDesejado: novoPlano,
        dsStatusUpgrade: "pendente"
      });

      await updateDoc(doc(db, "lojistas", uid), {
        "sistema.dsStatusUpgrade": "pendente"
      });

      alert("Solicitação de upgrade enviada com sucesso!");
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

  // Funções de gerenciamento de redes sociais para passar via props
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
        background: estaVencendo ? '#fef2f2' : '#fff'
      }}>
        <div style={{ ...styles.medalhaBox, background: `${info.cor}15` }}>
          {info.medalhaUrl ? <img src={info.medalhaUrl} style={styles.imgFull} alt="Medalha do Plano" /> : "🏅"}
        </div>

        <div style={{ flex: 1, marginLeft: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: info.cor, textTransform: 'uppercase' }}>
                Plano {planoBase}
              </span>
              {isOuroAtivo && (
                <span style={{ marginLeft: '8px', fontSize: '9px', background: '#d97706', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  PERÍODO DE TESTE OURO
                </span>
              )}
            </div>
            <span style={{ fontSize: '10px', fontWeight: '800', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              {config.dadosLoja?.ciclo || 'mensal'}
            </span>
          </div>

          <div style={{ ...styles.infoGrid, gridTemplateColumns: '1fr 1fr 1fr', marginTop: '10px' }}>
            <div style={styles.infoItem}>
              <small style={styles.infoLabel}>Criação</small>
              <span style={styles.infoValue}>{dataCriacao?.toLocaleDateString('pt-BR') || '---'}</span>
            </div>
            <div style={styles.infoItem}>
              <small style={styles.infoLabel}>{isOuroAtivo ? "Fim do Teste Plano Ouro" : "Vencimento"}</small>
              <span style={{ ...styles.infoValue, color: estaVencendo ? '#ef4444' : '#1e293b', fontWeight: estaVencendo ? '900' : '700' }}>
                {dataVencimento?.toLocaleDateString('pt-BR') || '---'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <small style={styles.infoLabel}>Status</small>
              <span style={{ ...styles.infoValue, color: estaVencendo ? '#ef4444' : '#10b981', fontWeight: '800' }}>
                {estaVencendo ? `Vence em ${diasRestantes}d!` : "Em dia"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={styles.center}>Sincronizando...</div>;

  return (
    <div style={styles.page}>
      {avisoPopup && (
        <div style={styles.overlay}>
          <div style={styles.popupCard}>
            <div style={styles.popupHeader}><FiBell size={24} /> AVISO IMPORTANTE</div>
            <p style={styles.popupText}>{avisoPopup.texto}</p>
            <button type="button" onClick={confirmarLeituraMaster} style={styles.btnPopupConfirm}>OK, ESTOU CIENTE</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px' }}>⚙️ Configurações</h2>
        {renderSeloPlano()}

        <div style={styles.tabBar}>
          <button type="button" style={abaAtiva === 'pessoal' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('pessoal')}>DADOS PESSOAIS</button>
          <button type="button" style={abaAtiva === 'loja' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('loja')}>DADOS DA LOJA</button>
          <button type="button" style={abaAtiva === 'banner' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('banner')}>BANNERS</button>
          <button type="button" style={abaAtiva === 'pagamentos' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('pagamentos')}>PAGAMENTOS</button>
          <button type="button" style={abaAtiva === 'aparencia' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('aparencia')}>APARÊNCIA</button>
          <button type="button" style={abaAtiva === 'sistema' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('sistema')}>SISTEMA / CUPONS</button>
          <button type="button" style={abaAtiva === 'mensagens' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('mensagens')}>MENSAGENS</button>
          <button type="button" style={abaAtiva === 'assinatura' ? styles.tabBtnActive : styles.tabBtn} onClick={() => setAbaAtiva('assinatura')}>ASSINATURA</button>
        </div>

        {/* Renderização das Abas Modularizadas */}
        {abaAtiva === 'pessoal' && <DadosPessoaisTab config={config} setConfig={setConfig} buscarCep={buscarCep} />}
        {abaAtiva === 'loja' && <DadosLojaTab config={config} setConfig={setConfig} buscarCep={buscarCep} novaLogo={novaLogo} setNovaLogo={setNovaLogo} setShowHorarioModal={setShowHorarioModal} adicionarRedeSocial={adicionarRedeSocial} atualizarRedeSocial={atualizarRedeSocial} removerRedeSocial={removerRedeSocial} />}
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
          />
        )}
        {abaAtiva === 'pagamentos' && <PagamentosTab config={config} setConfig={setConfig} masterLiberouMeioPagamento={masterLiberouMeioPagamento} />}
        {abaAtiva === 'aparencia' && <AparenciaTab config={config} setConfig={setConfig} masterLiberou={masterLiberou} />}
        {abaAtiva === 'sistema' && <SistemaTab config={config} setConfig={setConfig} masterLiberou={masterLiberou} setShowCupomModal={setShowCupomModal} showToken={showToken} setShowToken={setShowToken} />}
        {abaAtiva === 'mensagens' && <MensagensTab config={config} confirmarLeituraMensagem={confirmarLeituraMensagem} />}
        {abaAtiva === 'assinatura' && <AssinaturaTab config={config} planosConfig={planosConfig} setShowUpgradeModal={setShowUpgradeModal} />}

        {abaAtiva !== 'mensagens' && abaAtiva !== 'assinatura' && (
          <button type="button" onClick={handleSalvar} disabled={salvando} style={salvando ? styles.btnDisabled : styles.btnSalvar}>
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
    </div>
  );
}

const styles: any = {
  page: { padding: "40px 20px", background: "#f8fafc", minHeight: "100vh", display: "flex", justifyContent: "center" },
  card: { background: "#fff", padding: "35px", borderRadius: "24px", width: "100%", maxWidth: "970px", boxShadow: "0 10px 15px rgba(0,0,0,0.05)" },
  seloCard: { display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: '#fff', borderRadius: '20px', marginBottom: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  medalhaBox: { width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imgFull: { width: '100%', height: '100%', objectFit: 'cover' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '5px' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  infoLabel: { fontSize: '9px', fontWeight: '800', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' },
  infoValue: { fontSize: '12px', fontWeight: '700', color: '#1e293b' },
  tabBar: { display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', overflowX: 'auto' },
  tabBtn: { padding: '12px', background: 'none', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer', color: '#94a3b8', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' },
  tabBtnActive: { padding: '12px', background: 'none', border: 'none', borderBottom: '3px solid #2563eb', cursor: 'pointer', color: '#2563eb', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' },
  btnSalvar: { width: "100%", padding: "16px", background: "#059669", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", marginTop: '30px' },
  btnDisabled: { width: "100%", padding: "16px", background: "#94a3b8", color: "#fff", border: "none", borderRadius: "12px", cursor: "not-allowed", marginTop: '30px' },
  center: { textAlign: "center", marginTop: "100px" },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  popupCard: { background: '#fff', padding: '30px', borderRadius: '24px', maxWidth: '450px', width: '100%', textAlign: 'center' },
  popupHeader: { fontSize: '14px', fontWeight: '900', color: '#3b82f6', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  popupText: { fontSize: '16px', color: '#475569', marginBottom: '30px', fontWeight: '500' },
  btnPopupConfirm: { width: '100%', padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }
};