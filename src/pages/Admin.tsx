import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'; // useLocation adicionado
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropUtils';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  X,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string[] | null;
}

const Admin = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Hook para ler o estado vindo do Header
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteArticle, setDeleteArticle] = useState<Article | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [published, setPublished] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  // Estados do Cropper (Recorte)
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempImgUrl, setTempImgUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchArticles();
    }
  }, [user]);

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setArticles(data);
    }
    setLoading(false);
  };

  const openEditor = (article?: Article) => {
    if (article) {
      setEditingArticle(article);
      setTitle(article.title);
      setExcerpt(article.excerpt || '');
      setContent(article.content);
      setCoverImage(article.cover_image || '');
      setPublished(article.published);
      setTags(article.tags || []);
    } else {
      setEditingArticle(null);
      setTitle('');
      setExcerpt('');
      setContent('');
      setCoverImage('');
      setPublished(false);
      setTags([]);
    }
    setIsEditorOpen(true);
  };

  // Efeito para abrir o editor automaticamente se vier do Header ou URL
  useEffect(() => {
    // Verifica tanto query params (?edit=...) quanto state ({ editSlug: ... })
    const editSlug = searchParams.get('edit') || (location.state as any)?.editSlug;
    
    if (editSlug && articles.length > 0 && !isEditorOpen) {
      const articleToEdit = articles.find((a) => a.slug === editSlug);
      if (articleToEdit) {
        openEditor(articleToEdit);
        // Limpa o state para evitar reabrir ao dar refresh, mas mantém a URL limpa visualmente se desejar
        // window.history.replaceState({}, document.title); 
      }
    }
  }, [articles, searchParams, location.state, isEditorOpen]);

  const closeEditor = () => {
    // Verifica se existe um caminho de retorno no estado (vindo do Header)
    const state = location.state as { returnTo?: string } | null;
    
    if (state?.returnTo) {
      navigate(state.returnTo);
      return;
    }

    // Fallback para comportamento antigo (query param)
    const editSlug = searchParams.get('edit');
    if (editSlug) {
      navigate(`/artigo/${editSlug}`);
      return;
    }

    setSearchParams({});
    setIsEditorOpen(false);
    setEditingArticle(null);
    setTitle('');
    setExcerpt('');
    setContent('');
    setCoverImage('');
    setPublished(false);
    setTags([]);
  };

  // 1. Selecionar arquivo e abrir o Cropper
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setTempImgUrl(reader.result?.toString() || '');
        setIsCropperOpen(true);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      });
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  // 2. Capturar área recortada
  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // 3. Confirmar recorte e fazer upload
  const handleCropConfirm = async () => {
    if (!tempImgUrl || !croppedAreaPixels) return;

    setUploadingCover(true);
    try {
      const croppedImageBlob = await getCroppedImg(
        tempImgUrl,
        croppedAreaPixels,
        'new-cover.jpeg'
      );

      if (!croppedImageBlob) throw new Error('Falha ao gerar imagem');

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpeg`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(fileName, croppedImageBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('covers').getPublicUrl(fileName);
      setCoverImage(data.publicUrl);

      setIsCropperOpen(false);
      setTempImgUrl(null);

      toast({
        title: 'Capa atualizada',
        description: 'Imagem recortada e salva com sucesso.',
      });

    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível salvar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setUploadingCover(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Erro',
        description: 'Título e conteúdo são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const articleData = {
      title: title.trim(),
      slug: editingArticle?.slug || generateSlug(title),
      excerpt: excerpt.trim() || null,
      content,
      cover_image: coverImage.trim() || null,
      published,
      published_at: published && !editingArticle?.published_at ? new Date().toISOString() : editingArticle?.published_at,
      author_id: user!.id,
      tags: tags,
    };

    let error;

    if (editingArticle) {
      const { error: updateError } = await supabase
        .from('articles')
        .update(articleData)
        .eq('id', editingArticle.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('articles')
        .insert(articleData);
      error = insertError;
    }

    setSaving(false);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o artigo.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sucesso',
      description: editingArticle ? 'Artigo atualizado!' : 'Artigo criado!',
    });

    // Lógica de redirecionamento após salvar
    const state = location.state as { returnTo?: string; editSlug?: string } | null;
    
    // Se estávamos editando (seja por URL ou State), vamos para o artigo
    if (searchParams.get('edit') || state?.editSlug) {
      // Usa o novo slug (caso o título tenha mudado)
      navigate(`/artigo/${articleData.slug}`);
    } else {
      closeEditor();
      fetchArticles();
    }
  };

  const handleDelete = async () => {
    if (!deleteArticle) return;
    const { error } = await supabase.from('articles').delete().eq('id', deleteArticle.id);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Sucesso', description: 'Artigo excluído.' });
    setDeleteArticle(null);
    fetchArticles();
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      if (!tags.includes(currentTag.trim())) {
        setTags([...tags, currentTag.trim()]);
      }
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const togglePublished = async (article: Article) => {
    const newPublished = !article.published;
    const { error } = await supabase
      .from('articles')
      .update({
        published: newPublished,
        published_at: newPublished && !article.published_at ? new Date().toISOString() : article.published_at,
      })
      .eq('id', article.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao alterar status.', variant: 'destructive' });
      return;
    }
    fetchArticles();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-serif text-xl font-bold">Painel de Administração</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Artigo
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {articles.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-lg">
              <h2 className="font-serif text-2xl text-foreground mb-2">Nenhum artigo ainda</h2>
              <Button onClick={() => openEditor()}><Plus className="h-4 w-4 mr-2" />Criar Artigo</Button>
            </div>
          ) : (
            articles.map((article) => (
              <div key={article.id} className="bg-card p-6 rounded-lg shadow-soft flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {article.published ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full"><Eye className="h-3 w-3" />Publicado</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"><EyeOff className="h-3 w-3" />Rascunho</span>
                    )}
                  </div>
                  <h3 className="font-serif font-semibold text-lg truncate">{article.title}</h3>
                  <p className="text-sm text-muted-foreground">{format(new Date(article.updated_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => togglePublished(article)}>{article.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                  <Button variant="ghost" size="icon" onClick={() => openEditor(article)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteArticle(article)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingArticle ? 'Editar Artigo' : 'Novo Artigo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">{tag}<button onClick={() => removeTag(tag)}><X className="h-3 w-3" /></button></Badge>
                ))}
              </div>
              <Input id="tags" placeholder="Digite uma tag e pressione Enter" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)} onKeyDown={handleAddTag} />
            </div>

            {/* Cover Image Section */}
            <div className="space-y-2">
              <Label>Imagem de Capa</Label>
              <div className="flex flex-col gap-4">
                {/* Upload Area */}
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('cover-upload')?.click()}
                    className="w-full sm:w-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Escolher Imagem
                  </Button>
                  <Input
                    id="cover-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={onSelectFile}
                  />
                  <div className="text-xs text-muted-foreground">
                    Formato retangular (16:9) recomendado.
                  </div>
                </div>

                {/* Preview Area */}
                {coverImage ? (
                  <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted group">
                    <img src={coverImage} alt="Capa" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCoverImage('')}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover Capa
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-md border-2 border-dashed border-muted-foreground/25 flex items-center justify-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="h-8 w-8 opacity-50" />
                      <span className="text-sm">Nenhuma capa selecionada</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Resumo</Label>
              <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <RichTextEditor content={content} onChange={setContent} />
            </div>

            <div className="flex items-center gap-2">
              <Switch id="published" checked={published} onCheckedChange={setPublished} />
              <Label htmlFor="published">Publicar artigo</Label>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={closeEditor}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cropper Dialog */}
      <Dialog open={isCropperOpen} onOpenChange={setIsCropperOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ajustar Capa</DialogTitle>
          </DialogHeader>
          
          <div className="relative w-full h-80 bg-black rounded-md overflow-hidden my-4">
             {tempImgUrl && (
              <Cropper
                image={tempImgUrl}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9} // Proporção Retangular
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-12">Zoom</span>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
                className="flex-1"
              />
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCropperOpen(false); setTempImgUrl(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleCropConfirm} disabled={uploadingCover}>
                {uploadingCover ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Salvar Recorte'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteArticle} onOpenChange={() => setDeleteArticle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir artigo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;