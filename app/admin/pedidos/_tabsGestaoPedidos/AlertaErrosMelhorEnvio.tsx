'use client';
import React from 'react';

interface AlertaErrosProps {
    erroMensagem: string | null;
    onLimparErro: () => void;
}

export default function AlertaErrosMelhorEnvio({ erroMensagem, onLimparErro }: AlertaErrosProps) {
    if (!erroMensagem) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.card}>
                <div style={styles.iconContainer}>
                    ⚠️
                </div>
                
                <h3 style={styles.titulo}>Atenção na Integração</h3>
                
                <p style={styles.mensagem}>
                    {erroMensagem}
                </p>

                <div style={styles.botoesContainer}>
                    <button 
                        onClick={onLimparErro}
                        style={styles.botaoFechar}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        borderTop: '5px solid #f59e0b',
        boxSizing: 'border-box'
    },
    iconContainer: {
        fontSize: '36px',
        marginBottom: '12px'
    },
    titulo: {
        margin: '0 0 10px 0',
        color: '#1e293b',
        fontSize: '18px',
        fontWeight: '700'
    },
    mensagem: {
        fontSize: '14px',
        color: '#475569',
        lineHeight: '1.5',
        marginBottom: '20px',
        wordBreak: 'break-word'
    },
    botoesContainer: {
        display: 'flex',
        justifyContent: 'center',
        width: '100%'
    },
    botaoFechar: {
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        width: '100%',
        transition: 'background-color 0.2s'
    }
};