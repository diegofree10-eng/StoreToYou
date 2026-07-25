"use client";

import React, { useState, useRef } from "react";

export default function ImageCropperModalBanner({ 
  file, 
  onCropComplete, 
  onCancel 
}: { 
  file: File, 
  onCropComplete: (croppedBlob: Blob) => void, 
  onCancel: () => void 
}) {
  const [imgSrc] = useState<string>(() => URL.createObjectURL(file));
  const [zoom, setZoom] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mapeamento matemático 1:1 perfeito entre a tela do cropper e o arquivo final de 1100x380
  async function handleSave() {
    if (!imgRef.current || !containerRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1100;
    canvas.height = 380;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    const container = containerRef.current;

    // Fundo branco de segurança
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1100, 380);

    const containerWidth = container.clientWidth;   // 550px
    const containerHeight = container.clientHeight; // 190px

    // Fator de escala exato da tela para o tamanho real do banner (1100 / 550 = 2)
    const scaleFactor = 1100 / containerWidth;

    ctx.save();
    
    // Move para o centro exato do canvas final
    ctx.translate(1100 / 2, 380 / 2);
    
    // Aplica o deslocamento do arrasto e o zoom na mesma proporção visual
    ctx.translate(position.x * scaleFactor, position.y * scaleFactor);
    ctx.scale(zoom, zoom);

    const naturalAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let renderWidth = containerWidth;
    let renderHeight = containerHeight;

    if (naturalAspect > containerAspect) {
      renderHeight = containerWidth / naturalAspect;
    } else {
      renderWidth = containerHeight * naturalAspect;
    }

    // Desenha mantendo o tamanho proporcional exato sem esticar em nenhum eixo
    const drawW = renderWidth * scaleFactor;
    const drawH = renderHeight * scaleFactor;

    ctx.drawImage(
      img, 
      -drawW / 2, 
      -drawH / 2, 
      drawW, 
      drawH
    );
    
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) onCropComplete(blob);
    }, "image/jpeg", 0.95);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px', maxWidth: '650px', width: '90%', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Ajustar Banner da Loja</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.4' }}>
          Enquadre o banner na moldura. O resultado será salvo exatamente com essa proporção na vitrine (1100x380px).
        </p>

        {/* MOLDURA EXATA (550x190) COM OBJECT-FIT CONTAIN */}
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ 
            width: '550px', 
            height: '190px', 
            margin: '0 auto', 
            border: '2px dashed #6366f1', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            backgroundColor: '#f8fafc',
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            maxWidth: '100%'
          }}
        >
          <img 
            ref={imgRef} 
            src={imgSrc} 
            alt="Banner source" 
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }} 
          />
        </div>

        {/* BARRA DE ZOOM */}
        <div style={{ margin: '20px 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Zoom:</span>
          <input 
            type="range" 
            min="0.2" 
            max="3" 
            step="0.05" 
            value= {zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))} 
            style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }}
          />
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Aplicar e Salvar</button>
        </div>
      </div>
    </div>
  );
}
// cortador automático (Cropper) na tela onde cadastra ou edita a foto do BANNER