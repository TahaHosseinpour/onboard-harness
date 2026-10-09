'use client';

import { BuildingsIcon, CoinsIcon, PaperPlaneTiltIcon, TreeStructureIcon, UsersIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { PageBody, PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger, Select, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { Block, BlockLabel, Row, RowGroup } from '@/components/ui/patterns';
import { Badge, Dot, Glyph, Label, Progress, Segmented, Textarea } from '@/components/ui/primitives';
import { agents, agentStatus, goals, me, units, type Agent } from '@/lib/mock';
import { cn, fa, toman } from '@/lib/utils';

const usageTone = (ratio: number) => (ratio > 0.85 ? 'danger' : ratio > 0.65 ? 'warning' : 'primary');

function AssignDialog({ agent, children }: { agent?: Agent; children: React.ReactNode }) {
  const [kind, setKind] = useState<'task' | 'goal'>('task');
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        title="سپردن به ایجنت"
        description="یک کار مشخص بدهید یا یک هدف را به او بسپارید تا خودش کارها را بچیند."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">انصراف</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button size="sm" onClick={() => toast.success(kind === 'task' ? 'کار سپرده شد' : 'هدف سپرده شد')}>
                <PaperPlaneTiltIcon className="-scale-x-100" /> بسپار
              </Button>
            </DialogClose>
          </>
        }
      >
        <div className="space-y-4">
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'task', label: 'یک کار' },
              { value: 'goal', label: 'یک هدف' },
            ]}
          />
          <div>
            <Label>ایجنت</Label>
            <Select defaultValue={agent?.id ?? agents[0].id} options={agents.map((a) => ({ value: a.id, label: a.name, hint: `واحد ${a.unit}` }))} />
          </div>
          {kind === 'goal' ? (
            <div>
              <Label>هدف</Label>
              <Select defaultValue={goals[0].id} options={goals.map((g) => ({ value: g.id, label: g.title }))} />
            </div>
          ) : (
            <div>
              <Label>شرح کار</Label>
              <Textarea placeholder="مثلاً: هر دوشنبه قیمت ۲۰ کالای پرفروش را با رقبا مقایسه کن" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One box in the org chart. People are outlined; agents carry their colour and live status. */
function Node({ title, subtitle, agent, root }: { title: string; subtitle: string; agent?: Agent; root?: boolean }) {
  return (
    <div className={cn('bg-popover flex w-44 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-start', root && 'border-primary/50')}>
      {agent ? (
        <Glyph tone={agent.tone}>{agent.initial}</Glyph>
      ) : (
        <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">{title.slice(0, 1)}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
          {agent && <Dot tone={agentStatus[agent.status].tone} pulse={agent.status === 'working'} />}
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function OrgChart() {
  return (
    <div className="scrollbar-minimal overflow-x-auto pb-4">
      <div className="mx-auto flex w-max flex-col items-center">
        <Node title={me.name} subtitle={me.role} root />
        <div className="bg-border h-6 w-px" />
        <div className="flex">
          {units.map((unit, index) => {
            const unitAgents = agents.filter((a) => a.unit === unit.name);
            return (
              <div key={unit.id} className="relative flex flex-col items-center px-1.5">
                {/* Horizontal rail joining the unit heads, trimmed at both ends. */}
                <div className={cn('bg-border absolute top-0 h-px', index === 0 ? 'start-1/2 end-0' : index === units.length - 1 ? 'start-0 end-1/2' : 'inset-x-0')} />
                <div className="bg-border h-6 w-px" />
                <Node title={unit.head} subtitle={`مدیر ${unit.name} · ${fa(unit.people)} نفر`} />
                {unitAgents.map((agent) => (
                  <div key={agent.id} className="flex flex-col items-center">
                    <div className="bg-border h-5 w-px" />
                    <AssignDialog agent={agent}>
                      <button className="hover:ring-primary/30 rounded-2xl transition-shadow hover:ring-4">
                        <Node title={agent.name} subtitle={agentStatus[agent.status].label} agent={agent} />
                      </button>
                    </AssignDialog>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-muted-foreground mt-6 text-center text-xs">روی هر ایجنت بزنید تا کار یا هدفی به او بسپارید.</p>
    </div>
  );
}

export default function TeamPage() {
  const totalBudget = agents.reduce((sum, a) => sum + a.budget, 0);
  const totalSpent = agents.reduce((sum, a) => sum + a.spent, 0);

  return (
    <Tabs defaultValue="chart" className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="تیم"
        meta={`${fa(agents.length)} ایجنت و ${fa(units.reduce((s, u) => s + u.people, 0))} نفر در ${fa(units.length)} واحد`}
        actions={
          <AssignDialog>
            <Button size="sm">
              <PaperPlaneTiltIcon className="-scale-x-100" /> سپردن کار یا هدف
            </Button>
          </AssignDialog>
        }
        tabs={
          <TabsList>
          <TabsTrigger value="chart">
            <TreeStructureIcon /> نمودار سازمانی
          </TabsTrigger>
          <TabsTrigger value="agents">
            <UsersIcon /> ایجنت‌ها
          </TabsTrigger>
          <TabsTrigger value="units">
            <BuildingsIcon /> واحدها و نقش‌ها
          </TabsTrigger>
          <TabsTrigger value="budget">
            <CoinsIcon /> بودجه و مصرف
          </TabsTrigger>
          </TabsList>
        }
      />

      <PageBody wide>
        <TabsContent value="chart" className="outline-none">
          <OrgChart />
        </TabsContent>

        <TabsContent value="agents" className="outline-none">
          <RowGroup>
            {agents.map((agent) => (
              <Row
                key={agent.id}
                leading={<Glyph tone={agent.tone} size="lg">{agent.initial}</Glyph>}
                label={
                  <span className="flex items-center gap-2">
                    {agent.name}
                    <Badge tone={agentStatus[agent.status].tone}>{agentStatus[agent.status].label}</Badge>
                  </span>
                }
                description={`${agent.role} · واحد ${agent.unit} · مدیر: ${agent.manager}`}
              >
                <div className="hidden gap-1.5 lg:flex">
                  {agent.skills.slice(0, 2).map((skill) => (
                    <Badge key={skill} tone="outline">{skill}</Badge>
                  ))}
                </div>
                <AssignDialog agent={agent}>
                  <Button variant="outline" size="xs">سپردن کار</Button>
                </AssignDialog>
              </Row>
            ))}
          </RowGroup>
        </TabsContent>

        <TabsContent value="units" className="outline-none">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {units.map((unit) => (
              <Block key={unit.id} className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base">{unit.name}</h3>
                  <Badge>{fa(unit.people)} نفر · {fa(unit.agents)} ایجنت</Badge>
                </div>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">مدیر واحد</dt>
                    <dd className="font-medium">{unit.head}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">نقش‌ها</dt>
                    <dd>مدیر · عضو · ناظر</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">ایجنت</dt>
                    <dd>{agents.find((a) => a.unit === unit.name)?.name}</dd>
                  </div>
                </dl>
              </Block>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6 outline-none">
          <Block className="p-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-muted-foreground text-sm">مصرف این ماه</div>
                <div className="mt-1 text-2xl font-semibold">{toman(totalSpent)}</div>
              </div>
              <div className="text-muted-foreground text-sm">از {toman(totalBudget)}</div>
            </div>
            <Progress value={(totalSpent / totalBudget) * 100} className="mt-4 h-2.5" />
          </Block>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <BlockLabel>به تفکیک ایجنت</BlockLabel>
              <RowGroup>
                {agents.map((agent) => {
                  const ratio = agent.spent / agent.budget;
                  return (
                    <div key={agent.id} className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Glyph size="sm" tone={agent.tone}>{agent.initial}</Glyph>
                        <span className="flex-1 text-sm font-medium">{agent.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {toman(agent.spent, false)} از {toman(agent.budget)}
                        </span>
                      </div>
                      <Progress value={ratio * 100} tone={usageTone(ratio)} className="mt-2.5" />
                    </div>
                  );
                })}
              </RowGroup>
            </div>
            <div>
              <BlockLabel>به تفکیک واحد</BlockLabel>
              <RowGroup>
                {units.map((unit) => {
                  const ratio = unit.spent / unit.budget;
                  return (
                    <div key={unit.id} className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex-1 text-sm font-medium">{unit.name}</span>
                        {ratio > 0.8 && <Badge tone="danger">نزدیک سقف</Badge>}
                        <span className="text-muted-foreground text-xs">
                          {toman(unit.spent, false)} از {toman(unit.budget)}
                        </span>
                      </div>
                      <Progress value={ratio * 100} tone={usageTone(ratio)} className="mt-2.5" />
                    </div>
                  );
                })}
              </RowGroup>
            </div>
          </div>
        </TabsContent>
      </PageBody>
    </Tabs>
  );
}
