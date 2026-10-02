// app/admin/_components/ModalSuporte.tsx
"use client";
import React, { useState } from "react";
import { db, auth } from "@/lib/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { FiX, FiSend, FiCheckCircle, FiClock, FiPackage, FiUser, FiMessageSquare, FiImage } from "react-icons/fi";
import ImageCropperModal from "@/utils/ImageCropperModal"; // 🌟 Importando o seu cropper

export default function ModalSuporte({ 
  ticket, 
  chaveMes, 
  onClose, 
  theme, 
  isMaster = false 
}: { 
  ticket: any, 
  chaveMes: string, 
  onClose: () => void, 
  theme: any, 
  isMaster?: boolean 
}) {
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);
  
  // Estados para controle do Cropper e Zoom de Imagem
  const [arquivoParaCropper, setArquivoParaCropper] = useState<File | null>(null);
  const [imagemZoomUrl, setImagemZoomUrl] = useState<string | null>(null);

  const isAberto = ticket.dsStatus === "aberto" || ticket.dsStatus === "em_andamento";

  // Disparado quando o usuário escolhe a foto no input file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArquivoParaCropper(file);
      e.target.value = ""; // Limpa o input para permitir selecionar a mesma foto dnv se precisar
    }
  };

  // Quando o usuário conclui o corte no ImageCropperModal
  const handleCropComplete = async (croppedBlob: Blob) => {
    setArquivoParaCropper(null);
    setEnviando(true);

    try {
      const storage = getStorage(db.app);
      const nomeArquivo = `suporte_${Date.now()}.jpg`;
      const storageRef = ref(storage, `master_dashboard/tickets_suporte/anexos/${chaveMes}/${ticket.dsCodigoTicket}/${nomeArquivo}`);

      // Faz o upload da imagem leve gerada pelo cropper
      await uploadBytes(storageRef, croppedBlob);
      const downloadURL = await getDownloadURL(storageRef);

      // Envia a mensagem contendo a URL da imagem anexada
      const functions = getFunctions(db.app, "southamerica-east1");
      const atualizarFn = httpsCallable(functions, "atualizarStatusOuResponderTicket");
      const whatsappFn = httpsCallable(functions, "enviarNotificacaoWhatsApp");

      const textoMensagemFinal = resposta.trim() ? resposta : "📸 [Evidência anexada]";

      await atualizarFn({
        codigoTicket: ticket.dsCodigoTicket,
        chaveMes,
        novaResposta: textoMensagemFinal,
        novoStatus: ticket.dsStatus,
        origemEnvio: isMaster ? "Master" : "Lojista",
        anexoUrl: downloadURL // 🌟 URL da imagem otimizada
      });

      // 🌟 Disparando o WhatsApp com o ID e telefone da loja corretos
      whatsappFn({
        codigoTicket: ticket.dsCodigoTicket,
        lojaId: ticket.lojistaId || ticket.lojaId,
        telefoneLoja: ticket.telefoneLoja || "",
        mensagemTexto: textoMensagemFinal,
        autorTipo: isMaster ? "Master" : "Lojista"
      }).catch(err => console.log("Aviso de WhatsApp não crítico:", err));

      setResposta("");
      alert("Evidência enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao enviar anexo:", error);
      alert("Erro ao enviar imagem: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarResposta = async (novoStatus?: string) => {
    if (!resposta.trim() && !novoStatus) return;

    setEnviando(true);
    try {
      const functions = getFunctions(db.app, "southamerica-east1");
      const atualizarFn = httpsCallable(functions, "atualizarStatusOuResponderTicket");
      const whatsappFn = httpsCallable(functions, "enviarNotificacaoWhatsApp");

      await atualizarFn({
        codigoTicket: ticket.dsCodigoTicket,
        chaveMes,
        novaResposta: resposta,
        novoStatus: novoStatus || ticket.dsStatus,
        origemEnvio: isMaster ? "Master" : "Lojista"
      });

      // 🌟 Disparando o WhatsApp com o ID e telefone da loja corretos
      whatsappFn({
        codigoTicket: ticket.dsCodigoTicket,
        lojaId: ticket.lojistaId || ticket.lojaId,
        telefoneLoja: ticket.telefoneLoja || "",
        mensagemTexto: resposta,
        autorTipo: isMaster ? "Master" : "Lojista"
      }).catch(err => console.log("Aviso de WhatsApp não crítico:", err));

      setResposta("");
      if (novoStatus) {
        alert("Status do ticket atualizado com sucesso!");
        onClose();
      } else {
        alert("Resposta enviada com sucesso!");
      }
    } catch (error: any) {
      console.error("Erro ao enviar resposta:", error);
      alert("Erro ao processar solicitação: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modalContainer, background: theme.bgApp, border: `1px solid ${theme.border}`, color: theme.textMain }}>
        
        {/* Cabeçalho do Modal */}
        <div style={{ ...styles.modalHeader, borderBottom: `1px solid ${theme.border}`, background: theme.bgCard }}>
          <div>
            <span style={{ fontSize: "16px", fontWeight: "800", color: theme.primary, marginRight: "10px" }}>
              {ticket.dsCodigoTicket}
            </span>
            <span style={{ fontSize: "12px", fontWeight: "700", background: theme.inputBg, color: theme.textMain, padding: "3px 8px", border: `1px solid ${theme.border}`, borderRadius: "6px" }}>
              🏪 {ticket.nmLoja || "Loja"}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSec }}>
            <FiX size={20} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div style={styles.modalBody}>
          
          {/* Informações Principais */}
          <div style={{ ...styles.infoBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: theme.textSec }}>
                Módulo: <strong style={{ color: theme.textMain }}>{ticket.dsTipoOcorrencia}</strong>
              </span>
              <span style={{ 
                padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
                backgroundColor: isAberto ? "#fef3c7" : "#dcfce7",
                color: isAberto ? "#d97706" : "#16a34a"
              }}>
                {isAberto ? "⚡ ABERTO" : "✅ RESOLVIDO"}
              </span>
            </div>

            <p style={{ fontSize: "14px", fontWeight: "600", color: theme.textMain, marginBottom: "10px" }}>
              {ticket.dsDescricaoProblema}
            </p>

            {ticket.pedidoVinculado && (
              <div style={{ fontSize: "12px", color: theme.textSec, background: theme.inputBg, border: `1px solid ${theme.border}`, padding: "6px 10px", borderRadius: "6px" }}>
                📦 Pedido Vinculado: <strong style={{ color: theme.textMain }}>#{ticket.pedidoVinculado.nrNumeroPedido}</strong> - Cliente: {ticket.pedidoVinculado.nmCliente}
              </div>
            )}
          </div>

          {/* Histórico de Conversas / Mensagens */}
          <h4 style={{ fontSize: "14px", fontWeight: "700", color: theme.textMain, margin: "15px 0 10px 0" }}>Histórico de Atendimento</h4>
          <div style={{ ...styles.chatContainer, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
            {(!ticket.historicoMensagens || ticket.historicoMensagens.length === 0) ? (
              <p style={{ fontSize: "13px", color: theme.textSec, textAlign: "center", padding: "20px" }}>
                Nenhuma resposta registrada ainda. Utilize o campo abaixo para interagir.
              </p>
            ) : (
              ticket.historicoMensagens.map((msg: any, idx: number) => {
                const isMasterMsg = msg.autorTipo === "Master";
                const textoMensagem = msg.mensagem || msg.resposta || msg.dsMensagem || "Mensagem sem texto";

                return (
                  <div key={idx} style={{ 
                    ...styles.msgBubble, 
                    background: isMasterMsg ? theme.bgCard : theme.inputBg, 
                    border: `1px solid ${isMasterMsg ? theme.primary : theme.border}`,
                    marginLeft: isMasterMsg ? "0px" : "15px",
                    marginRight: isMasterMsg ? "15px" : "0px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", color: isMasterMsg ? theme.primary : theme.textSec, marginBottom: "4px" }}>
                      <span>{isMasterMsg ? "🛡️ Suporte Master" : `🏪 ${ticket.nmLoja || "Lojista"}`}</span>
                      <span style={{ color: theme.textSec, fontWeight: "normal" }}>
                        {new Date(msg.data || msg.tsCriacao).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: theme.textMain, margin: "0 0 6px 0" }}>
                      {textoMensagem}
                    </p>

                    {/* Exibição da Imagem Anexada (se houver) com suporte a Zoom */}
                    {msg.anexoUrl && (
                      <div style={{ marginTop: "6px" }}>
                        <img 
                          src={msg.anexoUrl} 
                          alt="Evidência" 
                          onClick={() => setImagemZoomUrl(msg.anexoUrl)}
                          style={{ maxWidth: "180px", maxHeight: "180px", borderRadius: "8px", border: `1px solid ${theme.border}`, cursor: "pointer", objectFit: "cover", display: "block" }}
                          title="Clique para ampliar a imagem"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Campo de Envio de Resposta */}
          {isAberto ? (
            <div style={{ marginTop: "15px" }}>
              <textarea 
                placeholder="Escreva sua resposta ou orientações aqui..."
                value={resposta}
                onChange={e => setResposta(e.target.value)}
                rows={3}
                style={{ ...styles.textarea, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                
                {/* Botão para Anexar Foto com Cropper */}
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textMain, padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                  <FiImage size={15} color={theme.primary} /> Anexar Evidência
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} disabled={enviando} />
                </label>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button 
                    onClick={() => handleEnviarResposta()}
                    disabled={enviando}
                    style={{ ...styles.btnEnviar, background: theme.primary }}
                  >
                    <FiSend size={15} /> {enviando ? "Enviando..." : "Enviar Resposta"}
                  </button>

                  <button 
                    onClick={() => handleEnviarResposta("resolvido")}
                    disabled={enviando}
                    style={{ ...styles.btnConcluir, background: "#16a34a" }}
                  >
                    <FiCheckCircle size={15} /> Concluir / Fechar Chamado
                  </button>
                </div>

              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "15px", background: "#dcfce7", color: "#16a34a", borderRadius: "10px", fontSize: "13px", fontWeight: "700", marginTop: "15px" }}>
              Este chamado encontra-se resolvido e encerrado.
            </div>
          )}

        </div>

      </div>

      {/* 🌟 MODAL DO CROPPER (Caso um arquivo tenha sido selecionado) */}
      {arquivoParaCropper && (
        <ImageCropperModal 
          file={arquivoParaCropper}
          onCropComplete={handleCropComplete}
          onCancel={() => setArquivoParaCropper(null)}
        />
      )}

      {/* 🌟 MODAL DE ZOOM DA IMAGEM EM TELA CHEIA */}
      {imagemZoomUrl && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 11000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }} onClick={() => setImagemZoomUrl(null)}>
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setImagemZoomUrl(null)} style={{ position: "absolute", top: "-40px", right: "0px", background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
              <FiX size={28} />
            </button>
            <img src={imagemZoomUrl} alt="Zoom Evidência" style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: "12px", objectFit: "contain", border: "2px solid #fff" }} />
          </div>
        </div>
      )}

    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" },
  modalContainer: { width: "100%", maxWidth: "650px", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" },
  modalHeader: { padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalBody: { padding: "24px", overflowY: "auto", flex: 1 },
  infoBox: { padding: "16px", borderRadius: "12px", marginBottom: "15px" },
  chatContainer: { padding: "12px", borderRadius: "12px", maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" },
  msgBubble: { padding: "10px 14px", borderRadius: "10px" },
  textarea: { width: "100%", padding: "12px 14px", borderRadius: "10px", outline: "none", fontSize: "13px", resize: "vertical", marginBottom: "10px", boxSizing: "border-box" },
  btnEnviar: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "10px", color: "#fff", border: "none", fontWeight: "700", fontSize: "13px", cursor: "pointer" },
  btnConcluir: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "10px", color: "#fff", border: "none", fontWeight: "700", fontSize: "13px", cursor: "pointer" }
};