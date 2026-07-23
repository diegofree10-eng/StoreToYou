"use client";

import React, { useState, useRef } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

export default function ImageCropperModal({ file, onCropComplete, onCancel }: { file: File, onCropComplete: (croppedBlob: Blob) => void, onCancel: () => void }) {
  const [imgSrc, setImgSrc] = useState<string>(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1)); // Força proporção 1:1 (quadrado)
  }

  async function handleSave() {
    if (!imgRef.current || !completedCrop) return;

    const canvas = document.createElement("canvas");
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    // Define a resolução final limpa e nítida (ex: 800x800)
    canvas.width = 800;
    canvas.height = 800;

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
      800,
      800
    );

    canvas.toBlob((blob) => {
      if (blob) onCropComplete(blob);
    }, "image/jpeg", 0.9);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', maxWidth: '500px', width: '90%', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>Ajustar Foto para o Card</h3>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '15px', lineHeight: '1.4' }}>
          Arraste para enquadrar a parte principal do produto. <br />
          <strong style={{ color: '#ee4d2d' }}>💡 Dica:</strong> Para evitar o corte, envie fotos quadradas (ex: <strong style={{ color: '#1e293b' }}>800x800 pixels</strong>).
        </p>
        
        <div style={{ maxHeight: '350px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
          <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} aspect={1}>
            <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="Crop source" style={{ maxHeight: '350px' }} />
          </ReactCrop>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Cortar e Salvar</button>
        </div>
      </div>
    </div>
  );
} 

// cortador automático (Cropper) na tela onde o lojista cadastra ou edita o produto