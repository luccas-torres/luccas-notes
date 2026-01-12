import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Loader2, Clock, Tag, User } from 'lucide-react'; 
import { Header } from '@/components/Header';
import { CommentSection } from '@/components/CommentSection';
import { LatexRenderer } from '@/components/LatexRenderer';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge'; // Importe o Badge

interface Article {
  id: string;
  title: string;
  content: string;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string[] | null; // Adicionado
}

interface Comment {
  id: string;
  author_name: string | null;
  content: string;
  is_anonymous: boolean;
  created_at: string;
}

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    // O select('*') já traz as tags se a coluna existir no banco
    const { data: articleData, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();

    if (!articleError && articleData) {
      setArticle(articleData);
      fetchComments(articleData.id);
    }
    setLoading(false);
  };

  const fetchComments = async (articleId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-4">
            Artigo não encontrado
          </h1>
          <Link to="/" className="text-primary hover:underline">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    );
  }

  const date = article.published_at || article.created_at;
  const formattedDate = format(new Date(date), "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  const updatedDate = article.updated_at
    ? format(new Date(article.updated_at), "d 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      })
    : null;

  const wasUpdated =
    article.updated_at &&
    article.published_at &&
    new Date(article.updated_at).toDateString() !== new Date(article.published_at).toDateString();

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />

      <main className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <article className="max-w-3xl mx-auto animate-fade-in">
          <header className="mb-8">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              {article.title}
            </h1>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-muted-foreground text-sm">
              {/* Adicionado Autor */}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Publicado por Luccas Torres</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {/* Texto ajustado para não ficar repetitivo */}
                <time>em {formattedDate}</time>
              </div>
              
              {wasUpdated && (
                <div className="flex items-center gap-2 text-primary/80" title="Conteúdo atualizado recentemente">
                  <Clock className="h-4 w-4" />
                  <time>Atualizado em {updatedDate}</time>
                </div>
              )}
            </div>
          </header>

          {article.cover_image && (
            <figure className="mb-10">
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full rounded-lg shadow-elevated"
              />
            </figure>
          )}

          <div className="prose max-w-none mb-8">
            <LatexRenderer content={article.content} />
          </div>

          {/* Seção de Tags ao final do artigo */}
          {article.tags && article.tags.length > 0 && (
            <div className="border-t border-border pt-6 mb-10">
              <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span className="text-sm font-medium">Tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <CommentSection
            articleId={article.id}
            comments={comments}
            onCommentAdded={() => fetchComments(article.id)}
          />
        </article>
      </main>

      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Caderno de Estudos. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default ArticlePage;