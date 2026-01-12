import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { EditorToolbar } from './EditorToolbar';
import { common, createLowlight } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

// Cria a instância do lowlight com as linguagens comuns (JS, HTML, CSS, Python, etc)
const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Desativamos o codeBlock padrão para usar o Lowlight no lugar
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border border-input rounded-lg overflow-hidden bg-background">
      <EditorToolbar editor={editor} />
      <div className="p-4 min-h-[200px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}