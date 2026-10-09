'use client';

import { BrainIcon, CheckIcon, GavelIcon, PencilSimpleIcon, PlusIcon, StorefrontIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { AgentChip } from '@/components/shared/bits';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/overlays';
import { Block, BlockLabel, EmptyNote, MetaDot, RowGroup } from '@/components/ui/patterns';
import { Badge, Segmented, Textarea } from '@/components/ui/primitives';
import { businessProfile, decisions, memories as initialMemories } from '@/lib/mock';
import { fa } from '@/lib/utils';

/** A stored piece of text that flips into a textarea in place. */
function Editable({ value, onSave, className }: { value: string; onSave: (value: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!editing)
    return (
      <div className="group flex items-start gap-2">
        <p className={className ?? 'flex-1 text-sm leading-7'}>{value}</p>
        <Button variant="muted" size="icon-xs" className="opacity-0 group-hover:opacity-100" onClick={() => setEditing(true)} aria-label="ویرایش">
          <PencilSimpleIcon />
        </Button>
      </div>
    );
  return (
    <div className="space-y-2">
      <Textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="bg-background" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="xs" onClick={() => { setDraft(value); setEditing(false); }}>
          انصراف
        </Button>
        <Button size="xs" onClick={() => { onSave(draft); setEditing(false); toast.success('ذخیره شد'); }}>
          <CheckIcon /> ذخیره
        </Button>
      </div>
    </div>
  );
}

/** Business profile, visible memory and the decision log, switched by a segmented control. */
export function Knowledge() {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(businessProfile);
  const [memories, setMemories] = useState(initialMemories);

  return (
    <Tabs value={tab} onValueChange={setTab} className="mx-auto max-w-4xl">
      <Segmented
        className="mb-6"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'profile', label: 'پروفایل کسب‌وکار', icon: <StorefrontIcon /> },
          { value: 'memory', label: 'حافظه', icon: <BrainIcon /> },
          { value: 'decisions', label: 'تصمیم‌ها', icon: <GavelIcon /> },
        ]}
      />
        <TabsContent value="profile" className="outline-none">
          <BlockLabel>این چهار بخش در هر کاری به ایجنت‌ها داده می‌شود</BlockLabel>
          <RowGroup>
            {profile.map((item, index) => (
              <div key={item.key} className="grid gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-[9rem_1fr]">
                <div className="text-sm font-semibold">{item.key}</div>
                <Editable value={item.value} onSave={(value) => setProfile((prev) => prev.map((p, i) => (i === index ? { ...p, value } : p)))} />
              </div>
            ))}
          </RowGroup>
        </TabsContent>

        <TabsContent value="memory" className="outline-none">
          <BlockLabel
            action={
              <Button variant="outline" size="xs">
                <PlusIcon /> افزودن به حافظه
              </Button>
            }
          >
            {fa(memories.length)} مورد که ایجنت‌ها از کار با شما یاد گرفته‌اند
          </BlockLabel>
          {memories.length === 0 ? (
            <EmptyNote icon={<BrainIcon />} title="حافظه خالی است" />
          ) : (
            <div className="space-y-2">
              {memories.map((memory) => (
                <Block key={memory.id}>
                  <Editable value={memory.text} onSave={(text) => setMemories((prev) => prev.map((m) => (m.id === memory.id ? { ...m, text } : m)))} />
                  <div className="text-muted-foreground mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone={memory.scope === 'سازمان' ? 'primary' : 'neutral'}>{memory.scope}</Badge>
                    <AgentChip id={memory.agent} />
                    <MetaDot />
                    <span>منبع: {memory.source}</span>
                    <Button
                      variant="muted"
                      size="icon-xs"
                      className="ms-auto"
                      aria-label="فراموش کن"
                      onClick={() => {
                        setMemories((prev) => prev.filter((m) => m.id !== memory.id));
                        toast('از حافظه حذف شد');
                      }}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </Block>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="decisions" className="outline-none">
          <BlockLabel
            action={
              <Button variant="outline" size="xs">
                <PlusIcon /> ثبت تصمیم
              </Button>
            }
          >
            تصمیم‌هایی که ایجنت‌ها باید به آن‌ها پایبند بمانند
          </BlockLabel>
          <ol className="border-border/80 space-y-3 border-s ps-6">
            {decisions.map((decision) => (
              <li key={decision.id} className="relative">
                <span className="bg-primary ring-background absolute -start-[29px] top-5 size-2.5 rounded-full ring-4" />
                <Block>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">{decision.title}</h3>
                    <Badge>{decision.tag}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-7">
                    <span className="text-foreground font-medium">چرا: </span>
                    {decision.why}
                  </p>
                  <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                    <span>{decision.by}</span>
                    <MetaDot />
                    <span>{decision.when}</span>
                  </div>
                </Block>
              </li>
            ))}
          </ol>
        </TabsContent>
    </Tabs>
  );
}
