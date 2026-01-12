-- Tabela de artigos
CREATE TABLE public.articles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Tabela de comentários
CREATE TABLE public.comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
    author_name TEXT,
    author_email TEXT,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Artigos publicados são públicos para leitura
CREATE POLICY "Published articles are viewable by everyone" 
ON public.articles 
FOR SELECT 
USING (published = true);

-- Autor pode ver todos seus artigos (incluindo rascunhos)
CREATE POLICY "Authors can view their own articles" 
ON public.articles 
FOR SELECT 
USING (auth.uid() = author_id);

-- Autor pode criar artigos
CREATE POLICY "Authors can create articles" 
ON public.articles 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

-- Autor pode editar seus artigos
CREATE POLICY "Authors can update their own articles" 
ON public.articles 
FOR UPDATE 
USING (auth.uid() = author_id);

-- Autor pode deletar seus artigos
CREATE POLICY "Authors can delete their own articles" 
ON public.articles 
FOR DELETE 
USING (auth.uid() = author_id);

-- Comentários são públicos para leitura
CREATE POLICY "Comments are viewable by everyone" 
ON public.comments 
FOR SELECT 
USING (true);

-- Qualquer um pode criar comentários
CREATE POLICY "Anyone can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (true);

-- Autor do artigo pode deletar comentários
CREATE POLICY "Article authors can delete comments" 
ON public.comments 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.articles 
        WHERE articles.id = comments.article_id 
        AND articles.author_id = auth.uid()
    )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar slug único
CREATE OR REPLACE FUNCTION public.generate_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    final_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM public.articles WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::TEXT;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;