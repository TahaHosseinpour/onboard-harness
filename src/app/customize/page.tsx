'use client';

import {
  ArrowRightIcon,
  BrainIcon,
  ChatTeardropTextIcon,
  CheckIcon,
  LightbulbIcon,
  LightningIcon,
  PlusIcon,
  RobotIcon,
  ShieldCheckIcon,
  SparkleIcon,
  WrenchIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Automations } from '@/components/sections/automations';
import { Knowledge } from '@/components/sections/knowledge';
import { PageBody, PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { Block, BlockLabel, ListRow, MetaDot, Row, RowGroup } from '@/components/ui/patterns';
import { Badge, Glyph, Input, Label, Segmented, Switch, Textarea } from '@/components/ui/primitives';
import { accessMeta, agents, connections, rules as initialRules, skills, suggestions as initialSuggestions, type Access } from '@/lib/mock';
import { cn, fa, toman } from '@/lib/utils';

/* ───────────── Teach by talking ───────────── */

type Kind = 'skill' | 'rule' | 'automation';
const kindMeta: Record<Kind, { label: string; icon: typeof WrenchIcon; tone: 'primary' | 'warning' | 'info' }> = {
  skill: { label: 'مهارت', icon: WrenchIcon, tone: 'primary' },
  rule: { label: 'قانون', icon: ShieldCheckIcon, tone: 'warning' },
  automation: { label: 'اتوماسیون', icon: LightningIcon, tone: 'info' },
};

const examples: { text: string; kind: Kind }[] = [
  { text: 'هیچ‌وقت بدون تأیید من به مشتری ایمیل نفرست', kind: 'rule' },
  { text: 'گزارش‌ها را همیشه با یک خلاصهٔ سه‌خطی شروع کن', kind: 'skill' },
  { text: 'وقتی موجودی کالایی کم شد خبرم کن', kind: 'automation' },
];

function Teach() {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<{ text: string; kind: Kind } | null>(null);
  const [layer, setLayer] = useState('unit');

  const guess = (value: string): Kind => (/^(وقتی|هر وقت|هر بار|هنگامی که)/.test(value.trim()) ? 'automation' : /هیچ‌وقت|نکن|نفرست|ممنوع|بدون تأیید/.test(value) ? 'rule' : 'skill');
  const submit = (value = text) => value.trim() && setDraft({ text: value.trim(), kind: guess(value) });
  const meta = draft && kindMeta[draft.kind];

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center text-xl font-semibold">با حرف‌زدن یادش بدهید</h2>
      <p className="text-muted-foreground mt-2 text-center text-sm">یک جمله بنویسید؛ خودش تشخیص می‌دهد مهارت است، قانون یا اتوماسیون، و قبل از ذخیره نشانتان می‌دهد.</p>

      <div className="bg-background focus-within:border-primary/50 focus-within:ring-primary/10 shadow-float mt-6 rounded-3xl border focus-within:ring-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder="مثلاً: وقتی مشتری از تأخیر ارسال شکایت کرد، اول عذرخواهی کن و کد رهگیری بده"
          className="placeholder:text-muted-foreground block w-full resize-none bg-transparent px-5 pt-4 text-[0.9375rem] leading-7 outline-none"
        />
        <div className="flex justify-end p-2.5">
          <Button disabled={!text.trim()} onClick={() => submit()}>
            <SparkleIcon weight="fill" /> پیش‌نمایش
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {examples.map((example) => (
          <button
            key={example.text}
            onClick={() => {
              setText(example.text);
              setDraft(example);
            }}
            className="text-muted-foreground hover:bg-hover hover:text-foreground h-9 rounded-full border px-3.5 text-xs"
          >
            {example.text}
          </button>
        ))}
      </div>

      {draft && meta && (
        <div className="mt-8">
          <BlockLabel>پیش‌نمایش · هنوز چیزی ذخیره نشده</BlockLabel>
          <Block className="p-5">
            <div className="flex items-center gap-3">
              <Glyph size="lg" tone={meta.tone}>
                <meta.icon weight="fill" />
              </Glyph>
              <div className="min-w-0 flex-1">
                <div className="text-muted-foreground text-xs">این جمله تبدیل می‌شود به یک</div>
                <div className="text-base font-semibold">{meta.label} جدید</div>
              </div>
              <Segmented
                size="sm"
                value={draft.kind}
                onChange={(kind) => setDraft({ ...draft, kind })}
                options={(Object.keys(kindMeta) as Kind[]).map((k) => ({ value: k, label: kindMeta[k].label }))}
              />
            </div>
            <div className="bg-surface mt-4 rounded-xl px-4 py-3 text-sm leading-7">
              {draft.kind === 'rule' && (
                <>
                  <strong className="font-semibold">قانون:</strong> {draft.text}
                  <div className="mt-2">
                    <Badge tone="warning">سطح مجوز: با تأیید</Badge>
                  </div>
                </>
              )}
              {draft.kind === 'skill' && (
                <>
                  <strong className="font-semibold">هر وقت این کار پیش آمد:</strong> {draft.text}
                  <ol className="text-muted-foreground mt-2 list-decimal space-y-1 ps-5">
                    <li>موقعیت را تشخیص بده</li>
                    <li>طبق همین دستور عمل کن</li>
                    <li>نتیجه را مطابق لحن برند بنویس</li>
                  </ol>
                </>
              )}
              {draft.kind === 'automation' && (
                <>
                  <strong className="font-semibold">اتوماسیون:</strong> {draft.text}
                  <div className="mt-2 flex gap-2">
                    <Badge tone="info">با رخ‌دادن همین رویداد</Badge>
                    <Badge tone="primary">تحلیلگر فروش</Badge>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">برای چه کسی؟</span>
                <Segmented
                  size="sm"
                  value={layer}
                  onChange={setLayer}
                  options={[
                    { value: 'org', label: 'کل سازمان' },
                    { value: 'unit', label: 'واحد من' },
                    { value: 'person', label: 'فقط من' },
                  ]}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                  نه، ولش کن
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    toast.success(`${meta.label} ذخیره شد`, { description: draft.text });
                    setDraft(null);
                    setText('');
                  }}
                >
                  <CheckIcon /> تأیید و ذخیره
                </Button>
              </div>
            </div>
          </Block>
        </div>
      )}
    </div>
  );
}

/* ───────────── Agent editor ───────────── */

function AgentEditor() {
  const [selected, setSelected] = useState(agents[0].id);
  const agent = agents.find((a) => a.id === selected)!;
  const [enabledSkills, setEnabledSkills] = useState<Record<string, boolean>>({});
  const isOn = (name: string) => enabledSkills[`${agent.id}:${name}`] ?? agent.skills.includes(name);
  const allSkills = [...new Set([...agent.skills, ...skills.map((s) => s.name)])];

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div>
        <BlockLabel
          action={
            <Button variant="outline" size="xs">
              <PlusIcon /> ایجنت جدید
            </Button>
          }
        >
          ایجنت‌ها
        </BlockLabel>
        <div className="space-y-px">
          {agents.map((a) => (
            <ListRow
              key={a.id}
              active={a.id === selected}
              onClick={() => setSelected(a.id)}
              icon={<Glyph tone={a.tone}>{a.initial}</Glyph>}
              title={a.name}
              meta={<span className="truncate">واحد {a.unit}</span>}
            />
          ))}
        </div>
      </div>

      <div key={agent.id} className="space-y-6">
        <div className="flex items-center gap-4">
          <Glyph tone={agent.tone} className="size-16 text-2xl">{agent.initial}</Glyph>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>نام</Label>
              <Input defaultValue={agent.name} />
            </div>
            <div>
              <Label>نقش</Label>
              <Input defaultValue={agent.role} />
            </div>
          </div>
        </div>

        <div>
          <BlockLabel>شخصیت و دستور کار</BlockLabel>
          <Textarea
            className="bg-popover min-h-28"
            defaultValue={`تو ${agent.name} واحد ${agent.unit} هستی. ${agent.role} کار اصلی توست. همیشه با عدد و منبع حرف بزن و هر اقدامی که اثر بیرونی دارد را برای تأیید بفرست.`}
          />
        </div>

        <div>
          <BlockLabel>مهارت‌ها</BlockLabel>
          <div className="flex flex-wrap gap-2">
            {allSkills.map((name) => (
              <button
                key={name}
                onClick={() => setEnabledSkills((prev) => ({ ...prev, [`${agent.id}:${name}`]: !isOn(name) }))}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors',
                  isOn(name) ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-hover',
                )}
              >
                {isOn(name) ? <CheckIcon className="size-4" /> : <PlusIcon className="size-4" />}
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <BlockLabel>تنظیمات</BlockLabel>
          <RowGroup>
            <Row label="سقف هزینهٔ ماهانه" description={`مصرف تا امروز: ${toman(agent.spent)}`}>
              <Input defaultValue={toman(agent.budget, false)} className="w-44" />
            </Row>
            <Row label="مدیر انسانی" description="تأییدها برای این شخص فرستاده می‌شود">
              <span className="text-sm font-medium">{agent.manager}</span>
            </Row>
            <Row label="اتصال‌ها" description="سرویس‌هایی که این ایجنت می‌بیند">
              <div className="flex -space-x-1.5 space-x-reverse">
                {connections.filter((c) => c.connected).slice(0, 4).map((c) => (
                  <Glyph key={c.id} size="sm" tone={c.tone} className="ring-popover ltr-nums text-[9px] ring-2">{c.initial}</Glyph>
                ))}
              </div>
            </Row>
            <Row label="اجازهٔ اجرای ابری" description="وقتی سیستم شما خاموش است هم کار کند">
              <Switch defaultChecked={agent.id !== 'finance'} />
            </Row>
          </RowGroup>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm">بازنشانی</Button>
          <Button size="sm" onClick={() => toast.success(`${agent.name} ذخیره شد`)}>
            ذخیرهٔ تغییرات
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Skills ───────────── */

function Skills() {
  const [selected, setSelected] = useState<string | null>(null);
  const skill = skills.find((s) => s.id === selected);

  if (skill)
    return (
      <div className="mx-auto max-w-3xl">
        <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1.5 text-sm">
          <ArrowRightIcon className="size-4" /> مهارت‌ها
        </button>
        <div className="space-y-5">
          <div>
            <Label>نام مهارت</Label>
            <Input defaultValue={skill.name} />
          </div>
          <div>
            <Label>چه زمانی استفاده شود</Label>
            <Textarea className="bg-popover" defaultValue={skill.desc} />
          </div>
          <div>
            <Label>مراحل</Label>
            <Textarea
              className="bg-popover min-h-44"
              defaultValue={'۱. دادهٔ مورد نیاز را از اتصال یا پوشهٔ مربوط بخوان.\n۲. با دورهٔ قبل مقایسه کن و موارد غیرعادی را جدا کن.\n۳. خروجی را با یک خلاصهٔ مدیریتی سه‌خطی شروع کن.\n۴. اگر اقدامی لازم است، آن را به صندوق تأیید بفرست.'}
            />
          </div>
          <RowGroup>
            <Row label="لایه" description="این مهارت برای چه کسانی فعال است">
              <Badge tone="primary">{skill.layer}</Badge>
            </Row>
            <Row label="ایجنت‌ها" description="چه کسانی از آن استفاده می‌کنند">
              <span className="text-sm">{skill.agents.map((id) => agents.find((a) => a.id === id)?.name).join('، ')}</span>
            </Row>
          </RowGroup>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => toast.success('مهارت ذخیره شد')}>
              ذخیره
            </Button>
          </div>
        </div>
      </div>
    );

  return (
    <>
      <BlockLabel
        action={
          <Button variant="outline" size="xs">
            <PlusIcon /> مهارت جدید
          </Button>
        }
      >
        {fa(skills.length)} مهارت · دستور کارهایی که ایجنت‌ها بلدند
      </BlockLabel>
      <RowGroup>
        {skills.map((s) => (
          <Row
            key={s.id}
            onClick={() => setSelected(s.id)}
            leading={
              <Glyph tone="primary">
                <WrenchIcon weight="fill" />
              </Glyph>
            }
            label={s.name}
            description={s.desc}
          >
            <span className="text-muted-foreground hidden text-xs md:inline">{fa(s.uses)} بار استفاده</span>
            <Badge tone={s.layer === 'سازمان' ? 'primary' : 'neutral'}>{s.layer}</Badge>
          </Row>
        ))}
      </RowGroup>
    </>
  );
}

/* ───────────── Rules ───────────── */

function Rules() {
  const [rules, setRules] = useState(initialRules);
  return (
    <>
      <BlockLabel
        action={
          <Button variant="outline" size="xs">
            <PlusIcon /> قانون جدید
          </Button>
        }
      >
        برای هر اقدام مشخص کنید: مجاز، با تأیید یا ممنوع
      </BlockLabel>
      <RowGroup>
        {rules.map((rule) => (
          <Row key={rule.id} label={rule.text} description={`دامنه: ${rule.scope}`}>
            <div className="bg-secondary inline-flex gap-0.5 rounded-full p-0.5">
              {(Object.keys(accessMeta) as Access[]).map((access) => {
                const on = rule.access === access;
                const tone = { allow: 'bg-success-soft text-success', ask: 'bg-warning-soft text-warning', deny: 'bg-danger-soft text-danger' }[access];
                return (
                  <button
                    key={access}
                    onClick={() => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, access } : r)))}
                    className={cn('h-7 rounded-full px-3 text-xs font-medium transition-colors', on ? tone : 'text-muted-foreground hover:text-foreground')}
                  >
                    {accessMeta[access].label}
                  </button>
                );
              })}
            </div>
          </Row>
        ))}
      </RowGroup>
    </>
  );
}

/* ───────────── Suggestions ───────────── */

function Suggestions() {
  const [items, setItems] = useState(initialSuggestions);
  if (!items.length) return null;
  return (
    <div className="space-y-3">
      <BlockLabel>پیشنهاد به‌روزرسانی از روی اصلاح‌های شما · قبل از اعمال تأیید کنید</BlockLabel>
      {items.map((item) => (
        <Block key={item.id} className="overflow-hidden p-0">
          <div className="flex items-start gap-3 px-5 py-4">
            <Glyph tone="warning">
              <LightbulbIcon weight="fill" />
            </Glyph>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">به‌روزرسانی مهارت «{item.skill}»</div>
              <p className="text-muted-foreground mt-0.5 text-sm">{item.reason}</p>
            </div>
          </div>
          <div className="divide-border/70 grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:divide-x-reverse">
            <div className="px-5 py-3.5">
              <div className="text-muted-foreground mb-1.5 text-xs font-medium">الان</div>
              <p className="text-sm leading-7">
                <span className="diff-del">{item.before}</span>
              </p>
            </div>
            <div className="px-5 py-3.5">
              <div className="text-muted-foreground mb-1.5 text-xs font-medium">پیشنهاد</div>
              <p className="text-sm leading-7">
                <span className="diff-add">{item.after}</span>
              </p>
            </div>
          </div>
          <div className="bg-surface flex justify-end gap-2 border-t px-5 py-3">
            <Button variant="ghost" size="sm" onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}>
              <XIcon /> نادیده بگیر
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setItems((prev) => prev.filter((i) => i.id !== item.id));
                toast.success('مهارت به‌روز شد', { description: item.skill });
              }}
            >
              <CheckIcon /> اعمال کن
            </Button>
          </div>
        </Block>
      ))}
    </div>
  );
}

export default function CustomizePage() {
  return (
    <Tabs defaultValue="teach" className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="سفارشی‌سازی"
        tabs={
          <TabsList>
            <TabsTrigger value="teach">
              <ChatTeardropTextIcon /> آموزش با حرف‌زدن
            </TabsTrigger>
            <TabsTrigger value="agents">
              <RobotIcon /> ایجنت‌ها
            </TabsTrigger>
            <TabsTrigger value="skills">
              <WrenchIcon /> مهارت‌ها
              <span className="bg-primary text-primary-foreground flex size-[18px] items-center justify-center rounded-full text-[11px]">{fa(initialSuggestions.length)}</span>
            </TabsTrigger>
            <TabsTrigger value="rules">
              <ShieldCheckIcon /> قوانین و مجوزها
            </TabsTrigger>
            <TabsTrigger value="automations">
              <LightningIcon /> اتوماسیون‌ها
            </TabsTrigger>
            <TabsTrigger value="knowledge">
              <BrainIcon /> دانش
            </TabsTrigger>
          </TabsList>
        }
      />
      <PageBody>
        <TabsContent value="teach" className="py-6 outline-none">
          <Teach />
        </TabsContent>
        <TabsContent value="agents" className="outline-none">
          <AgentEditor />
        </TabsContent>
        {/* Suggested skill updates sit above the skills they would change. */}
        <TabsContent value="skills" className="space-y-8 outline-none">
          <Suggestions />
          <div>
            <Skills />
          </div>
        </TabsContent>
        <TabsContent value="rules" className="outline-none">
          <Rules />
        </TabsContent>
        <TabsContent value="automations" className="outline-none">
          <Automations />
        </TabsContent>
        <TabsContent value="knowledge" className="outline-none">
          <Knowledge />
        </TabsContent>
      </PageBody>
    </Tabs>
  );
}
