// app/admin/suporte/page.tsx
"use client";
import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { 
  FiHelpCircle, FiMessageSquare, FiMail, FiPhoneCall, 
  FiBookOpen, FiExternalLink, FiShield, FiClock 
} from "react-icons/fi";

export default function SuportePage() {
  const { theme, isModoNoturno } = useTheme();

  return (
    <div style={{ ...styles.container, background: theme.bgApp, color: theme.textMain }}>
      <div style={styles.header}>
        <h1 style={styles.title}>Suporte e Ajuda</h1>
        <p style={{ color: theme.textSec, fontSize: "14px" }}>
          Precisa de auxílio com o sistema? Nossa equipe está pronta para ajudar você e sua loja.
        </p>
      </div>

      {/* Cards de Canais de Atendimento */}
      <div style={styles.gridCards}>
        {/* WhatsApp */}
        <a 
          href="https://wa.me/5500000000000?text=Olá,%20preciso%20de%20suporte%20no%20sistema." 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ ...styles.cardLink, background: theme.bgCard, border: `1px solid ${theme.border}` }}
        >
          <div style={{ ...styles.iconBox, background: "#dcfce7", color: "#16a34a" }}>
            <FiPhoneCall size={24} />
          </div>
          <div>
            <h3 style={styles.cardTitle}>Atendimento via WhatsApp</h3>
            <p style={{ color: theme.textSec, fontSize: "13px", marginTop: "4px" }}>Fale diretamente com um de nossos atendentes em tempo real.</p>
          </div>
          <FiExternalLink style={styles.externalIcon} color={theme.textSec} />
        </a>

        {/* E-mail */}
        <a 
          href="mailto:suporte@storetoyou.com.br" 
          style={{ ...styles.cardLink, background: theme.bgCard, border: `1px solid ${theme.border}` }}
        >
          <div style={{ ...styles.iconBox, background: "#e0f2fe", color: "#0284c7" }}>
            <FiMail size={24} />
          </div>
          <div>
            <h3 style={styles.cardTitle}>Suporte por E-mail</h3>
            <p style={{ color: theme.textSec, fontSize: "13px", marginTop: "4px" }}>Envie sua dúvida detalhada e respondemos em até 24h úteis.</p>
          </div>
          <FiExternalLink style={styles.externalIcon} color={theme.textSec} />
        </a>

        {/* Central de Ajuda / Documentação */}
        <a 
          href="https://nextjs.org/docs" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ ...styles.cardLink, background: theme.bgCard, border: `1px solid ${theme.border}` }}
        >
          <div style={{ ...styles.iconBox, background: "#fef3c7", color: "#d97706" }}>
            <FiBookOpen size={24} />
          </div>
          <div>
            <h3 style={styles.cardTitle}>Manuais e Tutoriais</h3>
            <p style={{ color: theme.textSec, fontSize: "13px", marginTop: "4px" }}>Consulte guias de uso passo a passo sobre cada funcionalidade.</p>
          </div>
          <FiExternalLink style={styles.externalIcon} color={theme.textSec} />
        </a>
      </div>

      {/* Informações de Horário e Garantia */}
      <div style={{ ...styles.infoBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={styles.infoRow}>
          <FiClock size={20} color="#fdb813" />
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: "700" }}>Horário de Atendimento</h4>
            <p style={{ color: theme.textSec, fontSize: "13px", marginTop: "2px" }}>Segunda a Sexta-feira, das 08:00 às 18:00 (Exceto feriados).</p>
          </div>
        </div>

        <div style={styles.infoRow}>
          <FiShield size={20} color="#10b981" />
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: "700" }}>Suporte Master Garantido</h4>
            <p style={{ color: theme.textSec, fontSize: "13px", marginTop: "2px" }}>Seu plano ativo garante atendimento prioritário conforme as diretrizes contratadas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: "30px", minHeight: "100vh" },
  header: { marginBottom: "25px" },
  title: { fontSize: "24px", fontWeight: "800", marginBottom: "5px" },
  gridCards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "30px" },
  cardLink: { padding: "20px", borderRadius: "15px", display: "flex", alignItems: "center", gap: "15px", textDecoration: "none", position: "relative", transition: "transform 0.2s" },
  iconBox: { width: "50px", height: "50px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitle: { fontSize: "16px", fontWeight: "700" },
  externalIcon: { position: "absolute", top: "20px", right: "20px" },
  infoBox: { padding: "25px", borderRadius: "15px", display: "flex", flexDirection: "column", gap: "20px" },
  infoRow: { display: "flex", alignItems: "flex-start", gap: "15px" }
};