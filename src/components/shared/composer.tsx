'use client';

import { ArrowUpIcon, CaretDownIcon, CheckIcon, CloudIcon, CpuIcon, DesktopIcon, GearSixIcon, PaperclipIcon, StopIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/overlays';
import { Glyph, Hint } from '@/components/ui/primitives';
import { agents } from '@/lib/mock';
import { useUi } from '@/lib/store';
import { cn } from '@/lib/utils';

export type RunPlace = 'local' | 'cloud';

const places = {
  local: { label: 'همین سیستم', hint: 'به فایل‌های این سیستم دسترسی دارد', icon: DesktopIcon },
  cloud: { label: 'ابری', hint: 'با بسته‌بودن سیستم هم ادامه می‌دهد', icon: CloudIcon },
};

const toolbarButton =
  'text-muted-foreground hover:bg-hover hover:text-foreground data-[state=open]:bg-hover flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs outline-none [&_svg]:size-3.5';

/** The chat composer card, after Kortix: one rounded surface with the input on
 *  top and a quiet toolbar (attach, agent, run location) under it. */
export function Composer({
  onSend,
  onStop,
  busy = false,
  placeholder = 'چه کاری انجام بدهم؟',
  autoFocus,
  large,
  className,
}: {
  onSend: (text: string, options: { agent: string; place: RunPlace; model: string }) => void;
  onStop?: () => void;
  busy?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  large?: boolean;
  className?: string;
}) {
  const [text, setText] = useState('');
  const [agent, setAgent] = useState('auto');
  const [place, setPlace] = useState<RunPlace>('local');
  // The model is chosen here, per message, from the ones defined in Settings; it does not belong to an agent.
  const models = useUi((s) => s.models);
  const defaultModelId = useUi((s) => s.defaultModelId);
  const setSettingsTab = useUi((s) => s.setSettingsTab);
  const [modelId, setModelId] = useState<string | null>(null);
  const model = models.find((m) => m.id === (modelId ?? defaultModelId)) ?? models[0];
  const PlaceIcon = places[place].icon;
  const selectedAgent = agents.find((a) => a.id === agent);

  const send = () => {
    const value = text.trim();
    if (!value) return;
    onSend(value, { agent, place, model: model?.id ?? '' });
    setText('');
  };

  return (
    <div
      className={cn(
        'bg-background focus-within:border-primary/50 focus-within:ring-primary/10 shadow-float rounded-3xl border transition-[border-color,box-shadow] focus-within:ring-4',
        className,
      )}
    >
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
        <Hint label="پیوست فایل" side="top">
          <button className={cn(toolbarButton, 'px-1.5')} aria-label="پیوست فایل">
            <PaperclipIcon />
          </button>
        </Hint>

        <Menu>
          <MenuTrigger className={toolbarButton}>
            {selectedAgent ? (
              <Glyph size="sm" tone={selectedAgent.tone} className="size-4 rounded-full text-[9px]">
                {selectedAgent.initial}
              </Glyph>
            ) : null}
            {selectedAgent ? selectedAgent.name : 'انتخاب خودکار ایجنت'}
            <CaretDownIcon className="size-3!" />
          </MenuTrigger>
          <MenuContent align="start" side="top" className="w-64">
            <MenuLabel>چه کسی این کار را انجام دهد؟</MenuLabel>
            <MenuItem onSelect={() => setAgent('auto')}>
              <span className="flex-1">انتخاب خودکار</span>
              {agent === 'auto' && <CheckIcon className="text-primary!" />}
            </MenuItem>
            {agents.map((a) => (
              <MenuItem key={a.id} onSelect={() => setAgent(a.id)}>
                <Glyph size="sm" tone={a.tone}>{a.initial}</Glyph>
                <span className="flex-1">{a.name}</span>
                {agent === a.id && <CheckIcon className="text-primary!" />}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>

        <Menu>
          <MenuTrigger className={toolbarButton}>
            <PlaceIcon />
            {places[place].label}
            <CaretDownIcon className="size-3!" />
          </MenuTrigger>
          <MenuContent align="start" side="top" className="w-72">
            <MenuLabel>محل اجرا</MenuLabel>
            {(Object.keys(places) as RunPlace[]).map((key) => {
              const Icon = places[key].icon;
              return (
                <MenuItem key={key} onSelect={() => setPlace(key)} className="h-auto py-2">
                  <Icon />
                  <span className="flex-1 leading-tight">
                    <span className="block">{places[key].label}</span>
                    <span className="text-muted-foreground block text-xs">{places[key].hint}</span>
                  </span>
                  {place === key && <CheckIcon className="text-primary!" />}
                </MenuItem>
              );
            })}
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
              <MenuItem key={m.id} onSelect={() => setModelId(m.id)} className="h-auto py-1.5">
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
