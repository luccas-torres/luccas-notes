import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ArticleCardProps {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  publishedAt?: string;
  createdAt: string;
  tags?: string[] | null; // Adicionado
}

export function ArticleCard({
  slug,
  title,
  excerpt,
  coverImage,
  publishedAt,
  createdAt,
  tags,
}: ArticleCardProps) {
  const date = publishedAt || createdAt;
  const formattedDate = format(new Date(date), "d 'de' MMMM, yyyy", {
    locale: ptBR,
  });

  return (
    <Link to={`/artigo/${slug}`} className="group block h-full">
      <article className="bg-card rounded-lg overflow-hidden shadow-soft transition-smooth hover:shadow-elevated hover:-translate-y-1 h-full flex flex-col">
        {coverImage && (
          <div className="aspect-[16/9] overflow-hidden">
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover transition-smooth group-hover:scale-105"
            />
          </div>
        )}
        <div className="p-6 flex flex-col flex-1">
          <div className="flex-1">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h2>
            {excerpt && (
              <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                {excerpt}
              </p>
            )}
          </div>
          
          <div className="mt-auto pt-4 space-y-3">
            {/* Exibição das Tags no Card */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-3">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}