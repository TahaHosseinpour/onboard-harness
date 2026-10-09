'use client';

import { CheckCircleIcon, FolderOpenIcon, FolderPlusIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/overlays';
import { Block, BlockLabel, Row, RowGroup } from '@/components/ui/patterns';
import { Badge, Glyph } from '@/components/ui/primitives';
import { accessMatrix, accessMeta, agents, connections, localFolders, type Access } from '@/lib/mock';
import { cn, fa } from '@/lib/utils';

const order: Access[] = ['allow', 'ask', 'deny'];
const cellTone: Record<Access, string> = {
  allow: 'bg-success-soft text-success',
  ask: 'bg-warning-soft text-warning',
  deny: 'bg-danger-soft text-danger',
};

/** `services` shows connected apps and local folders; `access` shows the agent × connection permission matrix. */
export function Connections({ view }: { view: 'services' | 'access' }) {
  const [connected, setConnected] = useState<Record<string, boolean>>(() => Object.fromEntries(connections.map((c) => [c.id, c.connected])));
  const [matrix, setMatrix] = useState(accessMatrix);

  const active = connections.filter((c) => connected[c.id]);
  const cycle = (agentId: string, connId: string) =>
    setMatrix((prev) => {
      const current = prev[agentId][connId] ?? 'deny';
      return { ...prev, [agentId]: { ...prev[agentId], [connId]: order[(order.indexOf(current) + 1) % order.length] } };
    });

  return (
    <Tabs value={view}>
        <TabsContent value="services" className="space-y-6 outline-none">
          {[true, false].map((isConnected) => {
            const list = connections.filter((c) => !!connected[c.id] === isConnected);
            if (!list.length) return null;
            return (
              <div key={String(isConnected)}>
                <BlockLabel>{isConnected ? `متصل · ${fa(list.length)}` : 'قابل اتصال'}</BlockLabel>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((c) => (
                    <Block key={c.id} className="flex items-center gap-3">
                      <Glyph size="lg" tone={isConnected ? c.tone : 'neutral'} className="ltr-nums text-xs">
                        {c.initial}
                      </Glyph>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <span className="truncate">{c.name}</span>
                          {isConnected && <CheckCircleIcon weight="fill" className="text-success size-4 shrink-0" />}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {c.desc} · {c.category}
                        </div>
                      </div>
                      <Button
                        variant={isConnected ? 'ghost' : 'soft'}
                        size="xs"
                        onClick={() => {
                          setConnected((prev) => ({ ...prev, [c.id]: !isConnected }));
                          toast(isConnected ? `اتصال ${c.name} قطع شد` : `${c.name} متصل شد`);
                        }}
                      >
                        {isConnected ? 'قطع' : 'اتصال'}
                      </Button>
                    </Block>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="services" className="mt-8 outline-none">
          <BlockLabel
            action={
              <Button variant="outline" size="xs">
                <FolderPlusIcon /> افزودن پوشه
              </Button>
            }
          >
            پوشه‌هایی از این سیستم که ایجنت‌ها می‌بینند
          </BlockLabel>
          <RowGroup>
            {localFolders.map((folder) => (
              <Row
                key={folder.path}
                leading={
                  <Glyph tone="primary">
                    <FolderOpenIcon weight="fill" />
                  </Glyph>
                }
                label={<span className="ltr-nums block text-end font-mono text-sm">{folder.path}</span>}
                description={`${fa(folder.agents)} ایجنت دسترسی دارند · ${folder.size}`}
              >
                <Badge tone={folder.access === 'فقط خواندن' ? 'neutral' : 'primary'}>{folder.access}</Badge>
                <Button variant="muted" size="icon-sm" aria-label="حذف پوشه">
                  <TrashIcon />
                </Button>
              </Row>
            ))}
          </RowGroup>
          <p className="text-muted-foreground mt-3 text-xs">ایجنت‌ها خارج از این پوشه‌ها به هیچ فایلی روی سیستم شما دسترسی ندارند.</p>
        </TabsContent>

        <TabsContent value="access" className="outline-none">
          <BlockLabel
            action={
              <div className="flex items-center gap-2">
                {order.map((key) => (
                  <Badge key={key} tone={accessMeta[key].tone}>{accessMeta[key].label}</Badge>
                ))}
              </div>
            }
          >
            هر خانه را بزنید تا دسترسی عوض شود
          </BlockLabel>
          <div className="bg-popover scrollbar-minimal overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-muted-foreground px-4 py-3 text-start text-xs font-medium">ایجنت</th>
                  {active.map((c) => (
                    <th key={c.id} className="px-2 py-3 text-center text-xs font-medium whitespace-nowrap">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-border/70 divide-y">
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2.5 whitespace-nowrap">
                        <Glyph size="sm" tone={agent.tone}>{agent.initial}</Glyph>
                        <span className="font-medium">{agent.name}</span>
                      </span>
                    </td>
                    {active.map((c) => {
                      const access = matrix[agent.id]?.[c.id] ?? 'deny';
                      return (
                        <td key={c.id} className="px-2 py-2.5 text-center">
                          <button
                            onClick={() => cycle(agent.id, c.id)}
                            className={cn('h-7 min-w-20 rounded-full px-3 text-xs font-medium transition-colors hover:opacity-80', cellTone[access])}
                          >
                            {accessMeta[access].label}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
    </Tabs>
  );
}
