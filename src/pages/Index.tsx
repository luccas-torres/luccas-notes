import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ArticleCard } from '@/components/ArticleCard';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, BookOpen, Github, Linkedin } from 'lucide-react'; // Ícones importados
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
  tags: string[] | null;
}

const ITEMS_PER_PAGE = 6;

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchArticles();
  }, [page, searchQuery]);

  const fetchArticles = async () => {
    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('articles')
      .select('id, slug, title, excerpt, cover_image, published_at, created_at, tags', { count: 'exact' })
      .eq('published', true)
      .order('published_at', { ascending: false })
      .range(from, to);

    if (searchQuery) {
      // Busca por Título, Resumo ou Tags (usando array contains)
      query = query.or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
    }

    const { data, count, error } = await query;

    if (!error && data) {
      setArticles(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setSearchParams({ page: newPage.toString() });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query !== searchQuery) {
      setSearchParams({ page: '1' });
    }
  };

  return (
    // Adicionado 'flex flex-col' para garantir que o footer vá para o final
    <div className="min-h-screen bg-background flex flex-col">
      <Header onSearch={handleSearch} />
      
      {/* Adicionado 'flex-1' para empurrar o footer */}
      <main className="container mx-auto px-4 py-12 flex-1">
        <section className="text-center mb-16 animate-fade-in">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Caderno de Estudos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Resumos, anotações e reflexões sobre temas diversos. Um espaço para compartilhar conhecimento e aprendizados.
          </p>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : articles.length > 0 ? (
          <>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
              {articles.map((article, index) => (
                <div
                  key={article.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ArticleCard
                    id={article.id}
                    slug={article.slug}
                    title={article.title}
                    excerpt={article.excerpt || undefined}
                    coverImage={article.cover_image || undefined}
                    publishedAt={article.published_at || undefined}
                    createdAt={article.created_at}
                    // tags={article.tags} // Descomente se seu ArticleCard já aceitar tags
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(page - 1)}
                      className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                     if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink
                            isActive={page === p}
                            onClick={() => handlePageChange(p)}
                            className="cursor-pointer"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (p === page - 2 || p === page + 2) {
                      return (
                        <PaginationItem key={p}>
                          <span className="flex h-9 w-9 items-center justify-center">...</span>
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(page + 1)}
                      className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-serif text-2xl text-foreground mb-2">
              {searchQuery ? 'Nenhum artigo encontrado' : 'Nenhum artigo publicado ainda'}
            </h2>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Tente buscar por outros termos.'
                : 'Os artigos aparecerão aqui quando forem publicados.'}
            </p>
          </div>
        )}
      </main>
      
      {/* Footer Atualizado com Links */}
      <footer className="border-t border-border py-8 mt-16 bg-muted/10">
        <div className="container mx-auto px-4 flex flex-col items-center gap-6">
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/luccas-torres"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors p-2 hover:bg-muted rounded-full"
              title="GitHub"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </a>
            <a
              href="https://www.linkedin.com/in/luccas-fontes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors p-2 hover:bg-muted rounded-full"
              title="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Caderno de Estudos. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;