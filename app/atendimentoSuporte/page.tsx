"use client";

import React, { useEffect } from "react";
import { FiAlertCircle, FiMessageCircle, FiMail } from "react-icons/fi";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function AtendimentoSuporte() {
  useEffect(() => {
    signOut(auth).catch(() => {});
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <FiAlertCircle size={64} color="#f59e0b" style={{ marginBottom: '20px' }} />
        <h1 style={styles.title}>Conta Suspensa</h1>
        <p style={styles.text}>
          Sua conta foi suspensa devido ao vencimento do plano ou por questões administrativas. 
          O acesso ao sistema está limitado no momento.
        </p>
        
        <div style={styles.buttonGroup}>
          <a href="https://wa.me/SEUNUMERO" style={styles.btnWhatsApp}>
            <FiMessageCircle size={20} /> Falar no WhatsApp
          </a>
          <a href="mailto:seuemail@exemplo.com" style={styles.btnEmail}>
            <FiMail size={20} /> Enviar E-mail
          </a>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    padding: '20px',
  },
  card: {
    background: '#fff',
    padding: '40px',
    borderRadius: '24px',
    textAlign: 'center',
    maxWidth: '500px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  title: { fontSize: '24px', color: '#1e293b', marginBottom: '15px' },
  text: { color: '#64748b', marginBottom: '30px', lineHeight: '1.6' },
  buttonGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
  btnWhatsApp: {
    background: '#25d366',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '12px',
    textDecoration: 'none',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  btnEmail: {
    background: '#3b82f6',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '12px',
    textDecoration: 'none',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  }
};