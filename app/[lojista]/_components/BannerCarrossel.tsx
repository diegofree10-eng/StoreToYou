"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface BannerCarrosselProps {
  banners?: any;
  slug: string;
}

export default function BannerCarrossel({ banners, slug }: BannerCarrosselProps) {
  const router = useRouter();
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Varredura flexível para encontrar os dados do banner em qualquer nível do objeto
  const bObj = 
    banners?.banners || 
    banners?.dadosLoja?.banners || 
    banners?.dadosLoja || 
    banners || {};

  // Filtra apenas os banners que realmente possuem imagem cadastrada e URL válida
  const listaBannersValidos = [
    { img: bObj?.dsBanner1 || bObj?.banner1, link: bObj?.dsLinkBanner1 || bObj?.linkBanner1 },
    { img: bObj?.dsBanner2 || bObj?.banner2, link: bObj?.dsLinkBanner2 || bObj?.linkBanner2 },
    { img: bObj?.dsBanner3 || bObj?.banner3, link: bObj?.dsLinkBanner3 || bObj?.linkBanner3 },
  ].filter((b) => Boolean(b.img) && typeof b.img === 'string' && b.img.startsWith('http'));

  // Transição automática a cada 5 segundos (pausa se o mouse estiver em cima)
  useEffect(() => {
    if (listaBannersValidos.length <= 1 || pausado) return;

    const intervalo = setInterval(() => {
      setIndiceAtual((prevIndex) => (prevIndex + 1) % listaBannersValidos.length);
    }, 5000);

    return () => clearInterval(intervalo);
  }, [listaBannersValidos.length, pausado]);

  if (listaBannersValidos.length === 0) {
    return (
      <div style={styles.bannerVazio}>
        <span>Loja pronta para arrasar nas vendas! 🚀</span>
      </div>
    );
  }

  const bannerAtivo = listaBannersValidos[indiceAtual];

  const handleClick = (e: React.MouseEvent) => {
    // Se clicar nas setas ou nos pontos, não dispara o clique do link do banner
    if ((e.target as HTMLElement).closest('.btn-controle-carrossel')) return;

    if (bannerAtivo.link) {
      router.push(`/${slug}/PagCategoria?cat=${encodeURIComponent(bannerAtivo.link)}`);
    }
  };

  const irParaAnterior = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndiceAtual((prev) => (prev === 0 ? listaBannersValidos.length - 1 : prev - 1));
  };

  const irParaProximo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndiceAtual((prev) => (prev + 1) % listaBannersValidos.length);
  };

  return (
    <div 
      className="banner-carrossel-wrapper" 
      onClick={handleClick}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <img
        src={bannerAtivo.img}
        alt={`Banner Promocional ${indiceAtual + 1}`}
        className="banner-imagem-responsiva"
        style={{
          cursor: bannerAtivo.link ? 'pointer' : 'default'
        }}
      />

      {/* Setas de Navegação Manual (Esquerda / Direita) */}
      {listaBannersValidos.length > 1 && (
        <>
          <button 
            className="btn-controle-carrossel seta-esq" 
            onClick={irParaAnterior}
            aria-label="Banner anterior"
          >
            <FiChevronLeft size={22} />
          </button>
          <button 
            className="btn-controle-carrossel seta-dir" 
            onClick={irParaProximo}
            aria-label="Próximo banner"
          >
            <FiChevronRight size={22} />
          </button>
        </>
      )}

      {/* Indicadores (Pontinhos) do Carrossel */}
      {listaBannersValidos.length > 1 && (
        <div style={styles.dotsContainer}>
          {listaBannersValidos.map((_, idx) => (
            <button
              key={idx}
              className="btn-controle-carrossel"
              style={{
                ...styles.dot,
                backgroundColor: idx === indiceAtual ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                width: idx === indiceAtual ? '22px' : '7px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIndiceAtual(idx);
              }}
              aria-label={`Ir para banner ${idx + 1}`}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .banner-carrossel-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 340px;
          max-height: 400px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
          background-color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .banner-imagem-responsiva {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.5s ease-in-out;
        }

        /* Estilo das Setas de Navegação */
        .btn-controle-carrossel {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.35);
          color: #fff;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.3s ease, background 0.3s ease;
          z-index: 10;
        }

        .banner-carrossel-wrapper:hover .btn-controle-carrossel {
          opacity: 1;
        }

        .btn-controle-carrossel:hover {
          background: rgba(0, 0, 0, 0.6);
        }

        .seta-esq { left: 12px; }
        .seta-dir { right: 12px; }

        @media (max-width: 768px) {
          .banner-carrossel-wrapper {
            min-height: 180px !important;
            max-height: 220px !important;
            border-radius: 8px !important;
            margin-top: 5px;
          }
          /* No mobile as setas ficam sempre visíveis para facilitar o toque */
          .btn-controle-carrossel {
            opacity: 0.8 !important;
            width: 30px;
            height: 30px;
          }
        }
      `}</style>
    </div>
  );
}

const styles: any = {
  bannerVazio: {
    width: '100%',
    height: '100%',
    minHeight: '220px',
    backgroundColor: '#e2e8f0',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: '13px',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '5px',
    zIndex: 10,
  },
  dot: {
    height: '7px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'width 0.3s ease, background-color 0.3s ease',
    padding: 0,
  },
};