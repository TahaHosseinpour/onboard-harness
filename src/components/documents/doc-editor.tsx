'use client';

import {
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  TextBIcon,
  TextHOneIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  type Icon,
} from '@phosphor-icons/react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { Hint, Separator } from '@/components/ui/primitives';
import { docHtml } from '@/lib/mock';
import { cn } from '@/lib/utils';

function Tool({ icon: IconComp, label, active, onClick }: { icon: Icon; label: string; active?: boolean; onClick: () => void }) {
  return (
    <Hint label={label}>
      <button
        type="button"
        aria-label={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={cn('text-muted-foreground hover:bg-hover hover:text-foreground flex size-7 items-center justify-center rounded-md', active && 'bg-primary-soft text-primary')}
      >
        <IconComp className="size-4" />
      </button>
    </Hint>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();
  return (
    <div className="flex h-10 shrink-0 items-center gap-0.5 border-b px-3">
      <Tool icon={ArrowUUpRightIcon} label="واگرد" onClick={() => chain().undo().run()} />
      <Tool icon={ArrowUUpLeftIcon} label="ازنو" onClick={() => chain().redo().run()} />
      <Separator vertical className="mx-1.5" />
      <Tool icon={TextHOneIcon} label="عنوان ۱" active={editor.isActive('heading', { level: 1 })} onClick={() => chain().toggleHeading({ level: 1 }).run()} />
      <Tool icon={TextHTwoIcon} label="عنوان ۲" active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <Separator vertical className="mx-1.5" />
      <Tool icon={TextBIcon} label="پررنگ" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
      <Tool icon={TextItalicIcon} label="کج" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
      <Tool icon={TextStrikethroughIcon} label="خط‌خورده" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} />
      <Separator vertical className="mx-1.5" />
      <Tool icon={ListBulletsIcon} label="فهرست" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()} />
      <Tool icon={ListNumbersIcon} label="فهرست شماره‌دار" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()} />
      <Tool icon={QuotesIcon} label="نقل‌قول" active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()} />
    </div>
  );
}

/** Word-style editor: a toolbar over a page sheet on a tinted desk. */
export function DocEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: docHtml,
    immediatelyRender: false,
    editorProps: { attributes: { class: 'doc-prose min-h-[60vh]', dir: 'rtl' } },
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {editor && <Toolbar editor={editor} />}
      <div className="bg-surface scrollbar-minimal min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="bg-background shadow-float mx-auto max-w-[780px] rounded-md border px-14 py-12">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
