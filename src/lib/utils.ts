import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getOptimizedImageUrl(url: string | null | undefined, width = 800) {
  if (!url) return "";
  
  // Verifica se é uma imagem do Supabase
  if (!url.includes("supabase.co")) return url;

  // Se já estiver otimizada (evita duplicação se o componente renderizar 2x)
  if (url.includes("width=")) return url;
  
  // Usa '&' se já tiver parâmetros (ex: tokens), senão usa '?'
  const separator = url.includes('?') ? '&' : '?';
  
  return `${url}${separator}width=${width}&format=webp&quality=80`;
}