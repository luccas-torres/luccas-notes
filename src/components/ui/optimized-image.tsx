import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: "video" | "square" | "portrait" | "auto"; // video = 16/9
}

export function OptimizedImage({
  src,
  alt,
  className,
  aspectRatio = "auto",
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Mapeamento de proporções comuns
  const aspectRatioClasses = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    auto: "aspect-auto",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/30", // Fundo cinza enquanto carrega
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy" // Nativo do navegador: só baixa quando aparece na tela
        decoding="async" // Não bloqueia a renderização da página
        onLoad={() => setIsLoading(false)}
        className={cn(
          "h-full w-full object-cover transition-all duration-500 ease-in-out",
          isLoading ? "scale-105 blur-lg opacity-0" : "scale-100 blur-0 opacity-100"
        )}
        {...props}
      />
    </div>
  );
}   