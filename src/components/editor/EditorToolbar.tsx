import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Smile,
  Loader2,
  Terminal, // Ícone para o bloco de código
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditorToolbarProps {
  editor: Editor | null;
}

const EMOJIS = ['😀', '😂', '🤔', '👍', '👎', '❤️', '🔥', '✨', '🎉', '📚', '✅', '❌', '⚠️', '💡', '📝', '🧪', '🔬', '📊', '📈', '🎓'];

const LANGUAGES = [
  { value: 'javascript', label: 'JS' },
  { value: 'typescript', label: 'TS' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'python', label: 'Py' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'c++', label: 'C++'}
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [showLatexInput, setShowLatexInput] = useState(false);
  const [latexInput, setLatexInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (!editor) return null;

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images') // Certifique-se que este bucket existe e é público
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      if (data.publicUrl) {
        editor.chain().focus().setImage({ src: data.publicUrl }).run();
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível carregar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const insertLatex = () => {
    if (latexInput.trim()) {
      editor.chain().focus().insertContent(`$$${latexInput}$$`).run();
      setLatexInput('');
      setShowLatexInput(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
    disabled = false,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
    disabled?: boolean;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-8 w-8 ${isActive ? 'bg-muted text-primary' : ''}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );

  return (
    <div className="border-b border-border p-2 flex flex-wrap gap-1 items-center bg-card sticky top-0 z-10">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      {/* Undo/Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Refazer">
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Título 1">
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Título 2">
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Título 3">
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrito">
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Itálico">
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Sublinhado">
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Riscado">
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      
      {/* Code Inline */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Código Inline">
        <Code className="h-4 w-4" />
      </ToolbarButton>

      {/* NOVO: Code Block & Selector */}
      <div className="flex items-center gap-1 border-l border-r border-border/50 px-1 mx-1">
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleCodeBlock().run()} 
          isActive={editor.isActive('codeBlock')} 
          title="Bloco de Código"
        >
          <Terminal className="h-4 w-4" />
        </ToolbarButton>

        {editor.isActive('codeBlock') && (
          <select
            className="h-8 text-[10px] w-20 bg-background border border-input rounded px-1 outline-none focus:ring-1 focus:ring-ring"
            value={editor.getAttributes('codeBlock').language || 'javascript'}
            onChange={(e) => editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value }).run()}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Esquerda">
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Centro">
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Direita">
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justificar">
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists & Quote */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Lista Pontos">
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Lista Numérica">
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Citação">
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Media & Extras */}
      <ToolbarButton onClick={handleImageClick} title="Imagem" disabled={uploading}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      </ToolbarButton>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Emoji">
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-5 gap-1">
            {EMOJIS.map((emoji) => (
              <button key={emoji} className="p-2 hover:bg-muted rounded text-lg" onClick={() => insertEmoji(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={showLatexInput} onOpenChange={setShowLatexInput}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 font-mono" title="LaTeX">
            ∑
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Fórmula LaTeX:</p>
            <input
              type="text"
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm font-mono"
              placeholder="Ex: \frac{1}{2}"
              onKeyDown={(e) => e.key === 'Enter' && insertLatex()}
            />
            <Button size="sm" onClick={insertLatex} className="w-full">Inserir</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}