'use client';

import { ArrowUpIcon, CaretDownIcon, CheckIcon, CpuIcon, GearSixIcon, RobotIcon, ShieldCheckIcon, StopIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/overlays';
import { Hint } from '@/components/ui/primitives';
import type { Mode } from '@/lib/api';
import { modeLabel, useBackend } from '@/lib/backend';
import { useUi } from '@/lib/store';
import { cn } from '@/lib/utils';

const toolbarButton =
  'text-muted-foreground hover:bg-hover hover:text-foreground data-[state=open]:bg-hover flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs outline-none [&_svg]:size-3.5';

/** The message box. Under it, the three choices that shape a run: who leads it,
 *  which model answers, and how much it may do without asking. */
export function Composer({
  onSend,
  onStop,
  busy = false,
  placeholder = 'چه کاری انجام بدهم؟',
  autoFocus,
  large,
  className,
}: {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  large?: boolean;
  className?: string;
}) {
  const [text, setText] = useState('');
  const models = useBackend((s) => s.models);
  const agents = useBackend((s) => s.agents);
  const options = useUi((s) => s.runOptions);
  const setOptions = useUi((s) => s.setRunOptions);
  const setSettingsTab = useUi((s) => s.setSettingsTab);

  const model = models.find((m) => m.id === options.modelId) ?? models.find((m) => m.is_default) ?? models[0];
  const agent = agents.find((a) => a.id === options.agentId);

  const send = () => {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setText('');
  };

  return (
    <div className={cn('bg-background focus-within:border-primary/50 focus-within:ring-primary/10 shadow-float rounded-3xl border transition-[border-color,box-shadow] focus-within:ring-4', className)}>
      <textarea
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        rows={large ? 3 : 2}
        placeholder={placeholder}
        className="placeholder:text-muted-foreground block w-full resize-none bg-transparent px-5 pt-4 pb-1 text-[0.9375rem] leading-7 outline-none"
      />
      <div className="flex items-center gap-1 px-2.5 pb-2.5">
        <Menu>
          <MenuTrigger className={toolbarButton}>
            <RobotIcon />
            {agent ? agent.title : 'هماهنگ‌کننده'}
            <CaretDownIcon className="size-3!" />
          </MenuTrigger>
          <MenuContent align="start" side="top" className="w-72">
            <MenuLabel>چه کسی این کار را پیش ببرد؟</MenuLabel>
            <MenuItem onSelect={() => setOptions({ agentId: null })}>
              <span className="flex-1">هماهنگ‌کننده (پیش‌فرض)</span>
              {!agent && <CheckIcon className="text-primary!" />}
            </MenuItem>
            {agents.map((a) => (
              <MenuItem key={a.id} onSelect={() => setOptions({ agentId: a.id })} className="h-auto py-1.5">
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block">{a.title}</span>
                  <span className="text-muted-foreground block truncate text-[11px]">{a.description}</span>
                </span>
                {agent?.id === a.id && <CheckIcon className="text-primary!" />}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>

        <Menu>
          <MenuTrigger className={toolbarButton}>
            <CpuIcon />
            {model ? model.name : 'بدون مدل'}
            <CaretDownIcon className="size-3!" />
          </MenuTrigger>
          <MenuContent align="start" side="top" className="w-72">
            <MenuLabel>مدل این پیام</MenuLabel>
            {models.map((m) => (
              <MenuItem key={m.id} onSelect={() => setOptions({ modelId: m.id })} className="h-auto py-1.5">
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block">{m.name}</span>
                  <span className="text-muted-foreground ltr-nums block truncate text-end font-mono text-[11px]">{m.model}</span>
                </span>
                {model?.id === m.id && <CheckIcon className="text-primary!" />}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem asChild>
              <Link href="/settings" onClick={() => setSettingsTab('models')}>
                <GearSixIcon />
                تعریف و مدیریت مدل‌ها
              </Link>
            </MenuItem>
          </MenuContent>
        </Menu>

        <Menu>
          <MenuTrigger className={toolbarButton}>
            <ShieldCheckIcon />
            {modeLabel[options.mode].label}
            <CaretDownIcon className="size-3!" />
          </MenuTrigger>
          <MenuContent align="start" side="top" className="w-80">
            <MenuLabel>چقدر بدون پرسیدن پیش برود؟</MenuLabel>
            {(Object.keys(modeLabel) as Mode[]).map((key) => (
              <MenuItem key={key} onSelect={() => setOptions({ mode: key })} className="h-auto py-2">
                <span className="flex-1 leading-tight">
                  <span className="block">{modeLabel[key].label}</span>
                  <span className="text-muted-foreground block text-[11px]">{modeLabel[key].hint}</span>
                </span>
                {options.mode === key && <CheckIcon className="text-primary!" />}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>

        <div className="flex-1" />

        {busy ? (
          <Hint label="توقف" side="top">
            <Button size="icon" variant="secondary" onClick={onStop} aria-label="توقف">
              <StopIcon weight="fill" />
            </Button>
          </Hint>
        ) : (
          <Button size="icon" disabled={!text.trim()} onClick={send} aria-label="ارسال">
            <ArrowUpIcon weight="bold" />
          </Button>
        )}
      </div>
    </div>
  );
}
