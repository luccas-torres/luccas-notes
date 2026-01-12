import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, User, Trash2, Clock } from 'lucide-react'; // Adicionado Clock
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import ReCAPTCHA from "react-google-recaptcha"; // Adicionado ReCAPTCHA

interface Comment {
  id: string;
  author_name: string | null;
  content: string;
  is_anonymous: boolean;
  created_at: string;
}

interface CommentSectionProps {
  articleId: string;
  comments: Comment[];
  onCommentAdded: () => void;
}

export function CommentSection({ articleId, comments, onCommentAdded }: CommentSectionProps) {
  // Estados do Design Original
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados de Proteção (Novos)
  const [cooldown, setCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<ReCAPTCHA>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  // Lógica de Cooldown (Anti-Flood)
  useEffect(() => {
    const lastCommentTime = localStorage.getItem(`last_comment_${articleId}`);
    if (lastCommentTime) {
      const secondsPassed = (Date.now() - parseInt(lastCommentTime)) / 1000;
      if (secondsPassed < 60) {
        setCooldown(Math.ceil(60 - secondsPassed));
      }
    }
  }, [articleId]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validações
    if (!content.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, escreva um comentário.',
        variant: 'destructive',
      });
      return;
    }

    // Validação do Robô
    if (!captchaToken) {
      toast({
        title: "Verificação necessária",
        description: "Confirme que você não é um robô.",
        variant: "destructive",
      });
      return;
    }

    // Validação de Flood
    if (cooldown > 0) {
      toast({
        title: "Aguarde um momento",
        description: `Você poderá comentar novamente em ${cooldown} segundos.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // 2. Envio (Payload Original)
    const { error } = await supabase
      .from('comments')
      .insert({
        article_id: articleId,
        author_name: isAnonymous ? null : name || null,
        author_email: isAnonymous ? null : email || null,
        content: content.trim(),
        is_anonymous: isAnonymous,
      });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o comentário.',
        variant: 'destructive',
      });
      return;
    }

    // 3. Sucesso e Limpeza
    const now = Date.now();
    localStorage.setItem(`last_comment_${articleId}`, now.toString());
    setCooldown(60); // Ativa cooldown de 1 min

    toast({
      title: 'Sucesso',
      description: 'Comentário enviado com sucesso!',
    });

    setName('');
    setEmail('');
    setContent('');
    setIsAnonymous(false);
    setCaptchaToken(null);
    captchaRef.current?.reset(); // Reseta o checkbox
    onCommentAdded();
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o comentário.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sucesso',
      description: 'Comentário excluído.',
    });
    onCommentAdded();
  };

  return (
    <section className="mt-16 pt-8 border-t border-border">
      <h3 className="font-serif text-2xl font-semibold mb-8 flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-accent" />
        Comentários ({comments.length})
      </h3>

      {/* Formulário (Layout Original preservado) */}
      <form onSubmit={handleSubmit} className="bg-muted/30 rounded-lg p-6 mb-8">
        <h4 className="font-medium mb-4">Deixe seu comentário</h4>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
            />
            <label htmlFor="anonymous" className="text-sm text-muted-foreground cursor-pointer">
              Comentar anonimamente
            </label>
          </div>

          {!isAnonymous && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Seu nome (opcional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="Seu e-mail (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <Textarea
            placeholder="Escreva seu comentário..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />

          {/* ReCAPTCHA Inserido discretamente aqui */}
          {siteKey && (
            <div className="py-2">
              <ReCAPTCHA
                ref={captchaRef}
                sitekey={siteKey}
                onChange={setCaptchaToken}
                theme="light"
              />
            </div>
          )}

          {/* Botão com lógica de Cooldown */}
          <Button type="submit" disabled={isSubmitting || cooldown > 0}>
            {isSubmitting ? (
              'Enviando...'
            ) : cooldown > 0 ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-pulse" />
                Aguarde {cooldown}s
              </>
            ) : (
              'Enviar comentário'
            )}
          </Button>
        </div>
      </form>

      {/* Lista de Comentários (Layout Original preservado) */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-card rounded-lg p-6 shadow-soft animate-fade-in">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {comment.is_anonymous || !comment.author_name
                        ? 'Anônimo'
                        : comment.author_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), "d 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-foreground leading-relaxed">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}