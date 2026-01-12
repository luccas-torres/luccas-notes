import { Link, useLocation, useNavigate } from 'react-router-dom'; // Adicionado useLocation
import { Search, PenLine, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { useTheme } from '@/components/theme-provider';

interface HeaderProps {
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export function Header({ onSearch, showSearch = true }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation(); // Hook para ler a URL atual

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Função inteligente para o botão Escrever
  const handleWriteClick = () => {
    // Verifica se estamos em uma URL de artigo
    const isArticlePage = location.pathname.startsWith('/artigo/');
    
    if (isArticlePage) {
      // Pega o slug da URL atual (ex: /artigo/meu-slug -> meu-slug)
      const slug = location.pathname.split('/').pop();
      
      navigate('/admin', { 
        state: { 
          editSlug: slug,        // Diz ao Admin qual artigo abrir
          returnTo: location.pathname // Diz para onde voltar ao fechar
        } 
      });
    } else {
      // Comportamento padrão (vai para o Admin limpo)
      navigate('/admin');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-primary">
              Caderno de Estudos
            </h1>
          </Link>

          {showSearch && (
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar artigos..."
                  className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
          )}

          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="mr-2"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Alternar tema</span>
            </Button>

            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleWriteClick} // Usando a nova função
                >
                  <PenLine className="h-4 w-4 mr-2" />
                  Escrever
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                >
                  Sair
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Entrar
              </Button>
            )}
          </nav>
        </div>

        {showSearch && (
          <form onSubmit={handleSearch} className="mt-4 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar artigos..."
                className="pl-10 bg-muted/50 border-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        )}
      </div>
    </header>
  );
}