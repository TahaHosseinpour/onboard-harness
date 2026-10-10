'use client';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ChatsCircleIcon,
  CheckSquareOffsetIcon,
  FolderOpenIcon,
  HardDrivesIcon,
  KeyIcon,
  MegaphoneIcon,
  PlugsConnectedIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  TargetIcon,
  TrendUpIcon,
  WalletIcon,
  WrenchIcon,
  type Icon,
} from '@phosphor-icons/react';
import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SEEN_KEY = 'onboarding-seen';

/** Whether this machine has been through the introduction. Storage can be unavailable; then it simply shows again. */
export function onboardingSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // nothing to remember it with; the introduction will be offered again
  }
}

function Point({ icon: IconComponent, title, children }: { icon: Icon; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="bg-primary-soft text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
        <IconComponent className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-muted-foreground mt-0.5 text-sm leading-7">{children}</p>
      </div>
    </li>
  );
}

/** A thing people hand to the agent, with the sentence they would type for it. */
function UseCase({ icon: IconComponent, title, example }: { icon: Icon; title: string; example: string }) {
  return (
    <li className="bg-popover rounded-xl border px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <IconComponent className="text-primary size-[18px] shrink-0" />
        {title}
      </div>
      <p className="text-muted-foreground mt-1.5 text-[0.8125rem] leading-6">«{example}»</p>
    </li>
  );
}

function Numbered({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">{number}</span>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-muted-foreground mt-0.5 text-sm leading-7">{children}</div>
      </div>
    </li>
  );
}

const steps: { title: string; lead: string; body: React.ReactNode }[] = [
  {
    title: 'به آنبورد هارنس خوش آمدید',
    lead: 'یک ایجنت که روی سیستم خودتان و داخل پوشه‌ای که شما انتخاب می‌کنید کار می‌کند. کار را به زبان ساده می‌نویسید؛ او انجام می‌دهد و شما تصمیم می‌گیرید.',
    body: (
      <ul className="space-y-5">
        <Point icon={HardDrivesIcon} title="همه‌چیز روی سیستم خودتان">
          سرور، حساب کاربری و ثبت‌نامی در کار نیست. فایل‌ها و سابقهٔ کارها در پوشهٔ خودتان می‌مانند.
        </Point>
        <Point icon={KeyIcon} title="با مدل و کلید خودتان">
          نشانی سرویس و کلید API خودتان را می‌دهید. تنها چیزی که از سیستم بیرون می‌رود، گفتگو با همان سرویس است.
        </Point>
        <Point icon={ShieldCheckIcon} title="کنترل دست شماست">
          پیش از تغییر هر فایل یا اجرای هر فرمان، ایجنت می‌ایستد و از شما می‌پرسد.
        </Point>
      </ul>
    ),
  },
  {
    title: 'مغز دوم کسب‌وکارتان',
    lead: 'آمارها، اهداف و اسناد کسب‌وکارتان را یک‌جا در پوشه می‌گذارید. آنبورد هارنس کارهای گذشته را تحلیل می‌کند، کارهای وقت‌گیر را انجام می‌دهد و برای قدم بعدی مشورت می‌دهد.',
    body: (
      <ul className="grid gap-2.5 sm:grid-cols-2">
        <UseCase icon={MegaphoneIcon} title="مارکتینگ: تحلیل کمپین‌ها" example="کمپین‌های فروش سه ماه گذشته را مقایسه کن؛ کدام ارزش تکرار دارد و کدام را متوقف کنیم؟" />
        <UseCase icon={WalletIcon} title="مالی: درآمد و نقدینگی" example="درآمد و هزینهٔ این فصل را تحلیل کن و بگو نقدینگی‌مان تا آخر سال چه وضعی دارد" />
        <UseCase icon={ReceiptIcon} title="حسابداری: سند زدن" example="فاکتورها و رسیدهای این ماه را در پوشه گذاشته‌ام؛ سندشان را در فایل اکسل دفتر بزن" />
        <UseCase icon={TrendUpIcon} title="فروش: پیش‌بینی" example="با فروش دو سال گذشته، فروش سه ماه آینده را پیش‌بینی کن و فرض‌هایت را بنویس" />
        <UseCase icon={ChartBarIcon} title="تحلیل داده و هوش تجاری" example="چرا فروش مهر از شهریور کمتر شد؟ کدام محصول‌ها و شهرها افت داشتند؟" />
        <UseCase icon={TargetIcon} title="اهداف و مشورت" example="این اهداف امسال ماست و این هم وضعیت فعلی؛ از برنامه عقبیم؟ پیشنهادت برای ماه بعد چیست؟" />
      </ul>
    ),
  },
  {
    title: 'چطور کار می‌کند؟',
    lead: 'هر کار یک گفتگو است و هر قدم ایجنت را همان لحظه می‌بینید.',
    body: (
      <ul className="space-y-5">
        <Point icon={FolderOpenIcon} title="فضای کاری یعنی یک پوشه">
          ایجنت فقط همان پوشه را می‌بیند. فایل‌هایتان را آنجا بگذارید؛ نتیجه‌ها هم همان‌جا ساخته می‌شوند.
        </Point>
        <Point icon={ChatsCircleIcon} title="کار را می‌نویسید، برنامه را می‌بینید">
          ایجنت برای کار برنامه می‌چیند و هر اقدامش (خواندن فایل، محاسبه، نوشتن) یک خط ساده در گفتگو است. هر وقت خواستید متوقفش کنید.
        </Point>
        <Point icon={CheckSquareOffsetIcon} title="صندوق تأیید">
          اقدام‌هایی که چیزی را عوض می‌کنند منتظر شما می‌مانند: تأیید، ویرایش یا رد. زیر کادر پیام انتخاب می‌کنید ایجنت «با تأیید»، «خودکار» یا «فقط خواندن» کار کند.
        </Point>
        <Point icon={WrenchIcon} title="به سلیقهٔ خودتان">
          در «سفارشی‌سازی» مهارت، ایجنت تخصصی، قوانین دسترسی و حافظه را تنظیم می‌کنید.
        </Point>
      </ul>
    ),
  },
  {
    title: 'فعال‌سازی در سه قدم',
    lead: 'دو دقیقه وقت می‌گیرد.',
    body: (
      <>
        <ol className="space-y-5">
          <Numbered number="۱" title="یک پوشه انتخاب کنید">
            در صفحهٔ بعد پوشهٔ فضای کاری را انتخاب می‌کنید. یک پوشهٔ جدا برای همین کار بسازید، نه کل درایو.
          </Numbered>
          <Numbered number="۲" title="مدل خودتان را وصل کنید">
            در «تنظیمات ← مدل‌ها ← تعریف مدل» سه چیز وارد کنید: نشانی سرویس (Base URL)، کلید API و نام مدل. OpenAI، Anthropic، OpenRouter، Ollama محلی و هر سرویس سازگار با آن‌ها کار می‌کند. کلید در مخزن امن سیستم‌عامل نگه‌داری می‌شود.
          </Numbered>
          <Numbered number="۳" title="اولین کار را بسپارید">
            در صفحهٔ خانه بنویسید چه می‌خواهید و Enter بزنید. مدل و سطح اختیار را زیر همان کادر عوض می‌کنید.
          </Numbered>
        </ol>
        <p className="bg-secondary text-muted-foreground mt-6 flex items-start gap-2.5 rounded-xl px-4 py-3 text-[0.8125rem] leading-6">
          <PlugsConnectedIcon className="mt-1 size-4 shrink-0" />
          هنوز کلید ندارید؟ «مدل نمایشی» از اول هست و بدون کلید و اینترنت یک کار نمونه را بازپخش می‌کند تا روند را ببینید. برای کار واقعی باید مدل خودتان را وصل کنید.
        </p>
      </>
    ),
  },
];

/** The introduction shown on first launch: what the app is, what to use it for, how it works, how to switch it on. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;

  const finish = () => {
    markSeen();
    onDone();
  };

  return (
    <div className="bg-sidebar flex h-dvh flex-col">
      <div className="desktop-strip app-drag" />
      <div className="scrollbar-minimal flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="bg-background flex w-full max-w-2xl flex-col rounded-2xl border p-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={36} height={36} priority />
            <div className="flex flex-1 items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
              {steps.map((item, i) => (
                <span key={item.title} className={cn('h-1.5 rounded-full transition-all duration-200', i === index ? 'bg-primary w-8' : i < index ? 'bg-primary/40 w-4' : 'bg-secondary w-4')} />
              ))}
            </div>
            {!last && (
              <Button variant="muted" size="xs" onClick={finish}>
                رد کردن
              </Button>
            )}
          </div>

          <h1 className="mt-7 text-xl font-semibold tracking-tight">{step.title}</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-7">{step.lead}</p>
          <div className="mt-7 min-h-[19rem]">{step.body}</div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" className={cn(index === 0 && 'invisible')} onClick={() => setIndex(index - 1)}>
              <ArrowRightIcon /> قبلی
            </Button>
            {last ? (
              <Button onClick={finish}>شروع کنیم</Button>
            ) : (
              <Button onClick={() => setIndex(index + 1)}>
                بعدی <ArrowLeftIcon />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
