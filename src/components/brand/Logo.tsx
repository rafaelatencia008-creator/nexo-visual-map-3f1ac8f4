/**
 * Nexo Pericial 360 — Logotipo oficial (LV-01.03)
 *
 * Componente SVG puro, sem imagem raster. Usa tokens de cor
 * (--primary, --brand-accent, --foreground) e a fonte --font-display.
 *
 * Uso:
 *   <Logo />                          // full: símbolo + wordmark
 *   <Logo variant="mark" />           // apenas o símbolo (para favicon/avatar)
 *   <Logo className="h-10" />         // controle de tamanho via className
 */

import type { SVGProps } from "react";

type LogoVariant = "full" | "mark";

interface LogoProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  variant?: LogoVariant;
  title?: string;
}

export function Logo({
  variant = "full",
  title = "Nexo Pericial 360",
  className,
  ...rest
}: LogoProps) {
  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label={title}
        className={className}
        {...rest}
      >
        <title>{title}</title>
        <BrandMark />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 320 64"
      role="img"
      aria-label={title}
      className={className}
      {...rest}
    >
      <title>{title}</title>
      <BrandMark />
      <g transform="translate(80, 0)">
        <text
          x="0"
          y="30"
          fontFamily="var(--font-display), Georgia, serif"
          fontSize="22"
          fontWeight={600}
          fill="var(--foreground)"
          letterSpacing="0.3"
        >
          Nexo Pericial
        </text>
        <text
          x="0"
          y="52"
          fontFamily="var(--font-display), Georgia, serif"
          fontSize="14"
          fontWeight={400}
          fill="var(--brand-accent)"
          letterSpacing="4"
        >
          3 6 0
        </text>
      </g>
    </svg>
  );
}

/**
 * Símbolo: escudo hexagonal (selo pericial) contendo um "N"
 * geométrico, com um traço horizontal em brand-accent (dourado)
 * evocando uma linha de assinatura/documento.
 */
function BrandMark() {
  return (
    <g>
      {/* Escudo hexagonal — contorno */}
      <path
        d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* N estilizado dentro do escudo */}
      <path
        d="M20 20 L20 44 M20 20 L44 44 M44 20 L44 44"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Linha de assinatura dourada */}
      <line
        x1="18"
        y1="50"
        x2="46"
        y2="50"
        stroke="var(--brand-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  );
}

export default Logo;
