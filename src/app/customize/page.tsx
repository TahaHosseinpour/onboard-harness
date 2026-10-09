'use client';

import { BrainIcon, FloppyDiskIcon, PencilSimpleIcon, PlusIcon, RobotIcon, ShieldCheckIcon, TrashIcon, WrenchIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PageBody, PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { BlockLabel, EmptyNote, Row, RowGroup } from '@/components/ui/patterns';
import { Badge, Glyph, Input, Textarea } from '@/components/ui/primitives';
import { api, ApiError, type AgentProfile, type Skill } from '@/lib/api';
import { toolLabel, useBackend } from '@/lib/backend';
import { useUi } from '@/lib/store';
import { cn, fa } from '@/lib/utils';

type Access = 'allow' | 'ask' | 'deny';
type FileRule = { paths: string[]; operations: ('read' | 'write')[]; access: Access };
type Rules = { files: FileRule[]; tools: Record<string, Access> };

const accessLabel: Record<Access, string> = { allow: 'مجاز', ask: 'با تأیید', deny: 'ممنوع' };
const accessTone: Record<Access, string> = { allow: 'bg-success-soft text-success', ask: 'bg-warning-soft text-warning', deny: 'bg-danger-soft text-danger' };

function AccessPicker({ value, onChange }: { value: Access; onChange: (value: Access) => void }) {
  return (
    <div className="bg-secondary inline-flex gap-0.5 rounded-full p-0.5">
      {(Object.keys(accessLabel) as Access[]).map((access) => (
        <button key={access} onClick={() => onChange(access)} className={cn('h-7 rounded-full px-3 text-xs font-medium transition-colors', value === access ? accessTone[access] : 'text-muted-foreground hover:text-foreground')}>
          {accessLabel[access]}
        </button>
      ))}
    </div>
  );
}

/** Opens a harness file in the files screen, where it can be edited and saved. */
function useEditFile() {
  const router = useRouter();
  const setOpenFile = useUi((s) => s.setOpenFile);
  return (path: string) => {
    setOpenFile(path);
    router.push('/files');
  };
}

/* ───────────── Skills ───────────── */

function Skills() {
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [name, setName] = useState('');
  const edit = useEditFile();
  const load = useCallback(() => api.get<Skill[]>('/skills').then(setSkills), []);
  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id) return toast.error('نام مهارت را با حروف لاتین بنویسید (مثلاً monthly-report).');
    const path = `/.harness/skills/${id}/SKILL.md`;
    await api.put('/files/content', { path, content: `---\nname: ${id}\ndescription: یک جمله که بگوید این مهارت برای چه کاری است.\n---\n\n# ${id}\n\n## کی استفاده شود\n\n## مراحل\n1. \n` });
    setName('');
    edit(path);
  };

  return (
    <>
      <BlockLabel>مهارت یعنی روش انجام یک نوع کار. ایجنت فقط وقتی کار مرتبط پیش بیاید متن کاملش را می‌خواند.</BlockLabel>
      <div className="mb-3 flex gap-2">
        <Input dir="ltr" className="max-w-xs font-mono" placeholder="monthly-report" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
        <Button variant="outline" onClick={create} disabled={!name.trim()}>
          <PlusIcon /> مهارت جدید
        </Button>
      </div>
      {skills?.length === 0 ? (
        <EmptyNote icon={<WrenchIcon />} title="هنوز مهارتی نیست" />
      ) : (
        <RowGroup>
          {(skills ?? []).map((skill) => (
            <Row
              key={skill.id}
              onClick={() => edit(`/.harness/skills/${skill.id}/SKILL.md`)}
              leading={
                <Glyph tone="primary">
                  <WrenchIcon weight="fill" />
                </Glyph>
              }
              label={<span className="ltr-nums font-mono">{skill.name}</span>}
              description={<span dir="auto">{skill.description}</span>}
            >
              <Button variant="muted" size="xs">
                <PencilSimpleIcon /> ویرایش
              </Button>
            </Row>
          ))}
        </RowGroup>
      )}
    </>
  );
}

/* ───────────── Agents ───────────── */

function Agents() {
  const agents = useBackend((s) => s.agents);
  const connect = useBackend((s) => s.connect);
  const edit = useEditFile();
  const [name, setName] = useState('');

  const create = async () => {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id) return toast.error('شناسهٔ ایجنت را با حروف لاتین بنویسید (مثلاً sales-analyst).');
    const path = `/.harness/agents/${id}.yaml`;
    await api.put('/files/content', { path, content: `name: ${id}\ntitle: ایجنت جدید\ndescription: یک جمله که بگوید این ایجنت برای چه کاری است.\nprompt: |\n  نقش و روش کار این ایجنت را اینجا بنویسید.\ntools: [calculate, read_table, aggregate_table]\n` });
    setName('');
    await connect();
    edit(path);
  };

  return (
    <>
      <BlockLabel>هر ایجنت یک نقش، دستور کار و فهرست ابزار دارد. در کادر پیام انتخاب می‌کنید کدام‌یک کار را پیش ببرد.</BlockLabel>
      <div className="mb-3 flex gap-2">
        <Input dir="ltr" className="max-w-xs font-mono" placeholder="sales-analyst" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
        <Button variant="outline" onClick={create} disabled={!name.trim()}>
          <PlusIcon /> ایجنت جدید
        </Button>
      </div>
      <RowGroup>
        {agents.map((agent: AgentProfile) => (
          <Row
            key={agent.id}
            onClick={() => edit(`/.harness/agents/${agent.id}.yaml`)}
            leading={
              <Glyph tone="info">
                <RobotIcon weight="fill" />
              </Glyph>
            }
            label={<span dir="auto">{agent.title}</span>}
            description={<span dir="auto">{agent.description}</span>}
          >
            <div className="hidden gap-1.5 lg:flex">
              {agent.tools.map((tool) => (
                <Badge key={tool} tone="outline">{toolLabel[tool] ?? tool}</Badge>
              ))}
            </div>
            <Button variant="muted" size="xs">
              <PencilSimpleIcon /> ویرایش
            </Button>
          </Row>
        ))}
      </RowGroup>
    </>
  );
}

/* ───────────── Rules ───────────── */

function RulesEditor() {
  const [rules, setRules] = useState<Rules | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    api.get<Rules>('/rules').then((data) => setRules({ files: data.files ?? [], tools: data.tools ?? {} }));
  }, []);
  if (!rules) return null;

  const change = (next: Rules) => {
    setRules(next);
    setDirty(true);
  };
  const save = async () => {
    try {
      await api.put('/rules', rules);
      setDirty(false);
      toast.success('قوانین ذخیره شد و از کار بعدی اعمال می‌شود.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'ذخیره ممکن نشد.');
    }
  };
  const setFile = (index: number, patch: Partial<FileRule>) => change({ ...rules, files: rules.files.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)) });

  return (
    <div className="space-y-6">
      <div>
        <BlockLabel
          action={
            <Button variant="outline" size="xs" onClick={() => change({ ...rules, files: [...rules.files, { paths: ['/**'], operations: ['write'], access: 'ask' }] })}>
              <PlusIcon /> قاعدهٔ فایل
            </Button>
          }
        >
          فایل‌ها · اولین قاعده‌ای که با مسیر جور باشد اعمال می‌شود
        </BlockLabel>
        <RowGroup>
          {rules.files.map((rule, index) => (
            <div key={index} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Input dir="ltr" className="h-8 min-w-48 flex-1 font-mono text-xs" value={rule.paths.join(', ')} onChange={(e) => setFile(index, { paths: e.target.value.split(',').map((p) => p.trim()).filter(Boolean) })} />
              <div className="bg-secondary inline-flex gap-0.5 rounded-full p-0.5">
                {(['read', 'write'] as const).map((operation) => (
                  <button
                    key={operation}
                    onClick={() => setFile(index, { operations: rule.operations.includes(operation) ? rule.operations.filter((o) => o !== operation) : [...rule.operations, operation] })}
                    className={cn('h-7 rounded-full px-3 text-xs font-medium', rule.operations.includes(operation) ? 'bg-background text-foreground dark:bg-accent' : 'text-muted-foreground')}
                  >
                    {operation === 'read' ? 'خواندن' : 'نوشتن'}
                  </button>
                ))}
              </div>
              <AccessPicker value={rule.access} onChange={(access) => setFile(index, { access })} />
              <Button variant="muted" size="icon-xs" aria-label="حذف قاعده" onClick={() => change({ ...rules, files: rules.files.filter((_, i) => i !== index) })}>
                <TrashIcon />
              </Button>
            </div>
          ))}
          {rules.files.length === 0 && <p className="text-muted-foreground px-4 py-4 text-sm">قاعده‌ای نیست؛ یعنی همهٔ فایل‌ها آزادند.</p>}
        </RowGroup>
      </div>

      <div>
        <BlockLabel>ابزارها</BlockLabel>
        <RowGroup>
          {Object.entries({ execute: rules.tools.execute ?? 'allow', ...rules.tools }).map(([tool, access]) => (
            <Row key={tool} label={toolLabel[tool] ?? tool} description={<span className="ltr-nums font-mono">{tool}</span>}>
              <AccessPicker value={access} onChange={(value) => change({ ...rules, tools: { ...rules.tools, [tool]: value } })} />
            </Row>
          ))}
        </RowGroup>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">حالت «فقط خواندن» و «خودکار» در کادر پیام این قوانین را سخت‌تر یا آسان‌تر می‌کند؛ «ممنوع» همیشه ممنوع می‌ماند.</p>
        <Button size="sm" disabled={!dirty} onClick={save}>
          <FloppyDiskIcon /> ذخیرهٔ قوانین
        </Button>
      </div>
    </div>
  );
}

/* ───────────── Memory ───────────── */

function Memory() {
  const [text, setText] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  useEffect(() => {
    api.get<{ content: string }>('/memory').then((memory) => {
      setText(memory.content);
      setSaved(memory.content);
    });
  }, []);
  const save = async () => {
    await api.put('/memory', { content: text });
    setSaved(text ?? '');
    toast.success('حافظه ذخیره شد.');
  };
  return (
    <div className="mx-auto max-w-3xl">
      <BlockLabel
        action={
          <Button size="xs" disabled={text === saved} onClick={save}>
            <FloppyDiskIcon /> ذخیره
          </Button>
        }
      >
        چیزهایی که در هر کار به ایجنت داده می‌شود · ایجنت هم می‌تواند به آن اضافه کند
      </BlockLabel>
      <Textarea dir="auto" className="bg-popover min-h-[55vh] font-mono text-sm leading-7" value={text ?? ''} onChange={(e) => setText(e.target.value)} />
      <p className="text-muted-foreground mt-2 text-xs">{fa((text ?? '').length)} نویسه · کوتاه نگهش دارید؛ هر خط در هر کار خوانده می‌شود.</p>
    </div>
  );
}

export default function CustomizePage() {
  return (
    <Tabs defaultValue="skills" className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="سفارشی‌سازی"
        tabs={
          <TabsList>
            <TabsTrigger value="skills">
              <WrenchIcon /> مهارت‌ها
            </TabsTrigger>
            <TabsTrigger value="agents">
              <RobotIcon /> ایجنت‌ها
            </TabsTrigger>
            <TabsTrigger value="rules">
              <ShieldCheckIcon /> قوانین و مجوزها
            </TabsTrigger>
            <TabsTrigger value="memory">
              <BrainIcon /> حافظه
            </TabsTrigger>
          </TabsList>
        }
      />
      <PageBody>
        <TabsContent value="skills" className="outline-none"><Skills /></TabsContent>
        <TabsContent value="agents" className="outline-none"><Agents /></TabsContent>
        <TabsContent value="rules" className="outline-none"><RulesEditor /></TabsContent>
        <TabsContent value="memory" className="outline-none"><Memory /></TabsContent>
      </PageBody>
    </Tabs>
  );
}
