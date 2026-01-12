import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import katex from 'katex';
import renderMathInElement from 'katex/dist/contrib/auto-render';
import 'katex/dist/katex.min.css';
import hljs from 'highlight.js';
import { Copy, Check, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LatexRendererProps {
  content: string;
}

const CodeBlockActions = ({ preElement }: { preElement: HTMLPreElement }) => {
  const [copied, setCopied] = useState(false);
  const [isLight, setIsLight] = useState(false);

  const handleCopy = async () => {
    const code = preElement.innerText;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTheme = () => {
    setIsLight(!isLight);
    if (!isLight) {
      preElement.classList.add('code-light-mode');
    } else {
      preElement.classList.remove('code-light-mode');
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        // ALTERAÇÃO AQUI: Usamos a variável do tema do código para cor e hover
        // Isso garante contraste perfeito em qualquer modo
        className="h-6 w-6 text-[var(--code-fg)] hover:bg-[var(--code-fg)]/10 hover:text-[var(--code-fg)]"
        onClick={toggleTheme}
        title={isLight ? "Modo Escuro" : "Modo Claro"}
      >
        {isLight ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        // ALTERAÇÃO AQUI TAMBÉM
        className="h-6 w-6 text-[var(--code-fg)] hover:bg-[var(--code-fg)]/10 hover:text-[var(--code-fg)]"
        onClick={handleCopy}
        title="Copiar código"
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
};

export function LatexRenderer({ content }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = content;

      // 1. Renderiza LaTeX
      renderMathInElement(containerRef.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false,
        errorColor: '#cc0000',
      });

      // 2. Processa Blocos de Código
      const codeBlocks = containerRef.current.querySelectorAll('pre');
      
      codeBlocks.forEach((pre) => {
        const codeElement = pre.querySelector('code');
        if (codeElement) {
          hljs.highlightElement(codeElement as HTMLElement);
        }

        if (pre.parentNode?.querySelector('.code-actions-wrapper')) return;

        const actionsContainer = document.createElement('div');
        // Mantive a opacidade e transição como você gostou
        actionsContainer.className = 'code-actions-wrapper absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10';
        
        pre.classList.add('group');
        pre.appendChild(actionsContainer);

        const root = createRoot(actionsContainer);
        root.render(<CodeBlockActions preElement={pre} />);
      });
    }
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className="latex-content 
        [&_.katex-display]:overflow-hidden 
        [&_.katex-display]:max-w-full
        [&_.katex-display]:my-6
      "
    />
  );
}