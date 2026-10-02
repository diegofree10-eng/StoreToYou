// utils/ComprovanteCropperModal.tsx
"use client";

import React, { useState, useRef } from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

export default function ComprovanteCropperModal({ 
  file, 
  onCropComplete, 
  onCancel 
}: { 
  file: File, 
  onCropComplete: (croppedBlob: Blob) => void, 
  onCancel: () => void 
}) {
  const [imgSrc, setImgSrc] = useState<string>(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    // Define um corte inicial cobrindo 90% da imagem no formato livre (sem aspect ratio fixo)
    setCrop({
      unit: '%',
      width: 90,
      height: 90,
      x: 5,
      y: 5,
    });
  }

  async function handleSave() {
    if (!imgRef.current || !completedCrop) return;

    const canvas = document.createElement("canvas");
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    // Define uma largura máxima otimizada para legibilidade e economia de espaço (ex: 1000px)
    const targetWidth = completedCrop.width * scaleX > 1000 ? 1000 : completedCrop.width * scaleX;
    const targetHeight = (completedCrop.height * scaleY) * (targetWidth / (completedCrop.width * scaleX));

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      targetWidth,
      targetHeight
    );

    // Converte para blob JPEG compactado a 85% de qualidade (perfeito para texto nítido e arquivo leve)
    canvas.toBlob((blob) => {
      if (blob) onCropComplete(blob);
    }, "image/jpeg", 0.85);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', maxWidth: '500px', width: '90%', textAlign: 'center', boxSizing: 'border-box' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
          Enquadrar Comprovante de Pagamento
        </h3>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '15px', lineHeight: '1.4' }}>
          Arraste e ajuste a seleção para focar na área onde aparecem o <strong style={{ color: '#059669' }}>valor, data e ID</strong> da transferência.
        </p>
        
        <div style={{ maxHeight: '350px', overflow: 'hidden', display: 'flex', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px', padding: '10px' }}>
          <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)}>
            <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="Comprovante source" style={{ maxHeight: '330px', objectFit: 'contain' }} />
          </ReactCrop>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onCancel} 
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Confirmar e Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
// utils/ComprovanteCropperModal.tsx