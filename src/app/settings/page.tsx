'use client';

import {
  BellIcon,
  CloudIcon,
  CoinsIcon,
  CpuIcon,
  DesktopIcon,
  DevicesIcon,
  GlobeIcon,
  LaptopIcon,
  MoonIcon,
  PlugsConnectedIcon,
  ShieldCheckIcon,
  SunIcon,
  UserPlusIcon,
  UsersIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Connections } from '@/components/sections/connections';
import { Models } from '@/components/sections/models';
import { PageHeader } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/overlays';
import { BlockLabel, navRow, Row, RowGroup, subNav } from '@/components/ui/patterns';
import { Badge, Dot, Glyph, Input, Progress, Segmented, Switch } from '@/components/ui/primitives';
import { agents, devices, members, units } from '@/lib/mock';
import { useUi, type SettingsTab } from '@/lib/store';
import { cn, fa, toman } from '@/lib/utils';

type Tab = SettingsTab;

const tabs: { id: Tab; label: string; icon: Icon }[] = [
  { id: 'general', label: 'عمومی', icon: GlobeIcon },
  { id: 'connections', label: 'اتصال‌ها و پوشه‌ها', icon: PlugsConnectedIcon },
  { id: 'access', label: 'دسترسی ایجنت‌ها', icon: ShieldCheckIcon },
  { id: 'models', label: 'مدل‌ها', icon: CpuIcon },
  { id: 'budget', label: 'بودجه و سقف هزینه', icon: CoinsIcon },
  { id: 'members', label: 'اعضا و دسترسی‌ها', icon: UsersIcon },
  { id: 'devices', label: 'دستگاه‌ها و اجرا', icon: DevicesIcon },
];

function General() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="space-y-6">
      <div>
        <BlockLabel>زبان و منطقه</BlockLabel>
        <RowGroup>
          <Row label="زبان" description="رابط کاربری راست‌به‌چپ نمایش داده می‌شود">
            <Select defaultValue="fa" className="w-44" options={[{ value: 'fa', label: 'فارسی' }, { value: 'en', label: 'English' }]} />
          </Row>
          <Row label="تقویم" description="تاریخ‌ها در گزارش‌ها و اتوماسیون‌ها">
            <Select defaultValue="jalali" className="w-44" options={[{ value: 'jalali', label: 'شمسی' }, { value: 'gregorian', label: 'میلادی' }]} />
          </Row>
          <Row label="واحد پول" description="همهٔ مبالغ با این واحد نمایش داده می‌شود">
            <Select defaultValue="toman" className="w-44" options={[{ value: 'toman', label: 'تومان' }, { value: 'rial', label: 'ریال' }]} />
          </Row>
          <Row label="شروع هفته">
            <Select defaultValue="sat" className="w-44" options={[{ value: 'sat', label: 'شنبه' }, { value: 'mon', label: 'دوشنبه' }]} />
          </Row>
        </RowGroup>
      </div>

      <div>
        <BlockLabel>ظاهر</BlockLabel>
        <RowGroup>
          <Row label="حالت نمایش" description="روشن، تیره یا هماهنگ با سیستم">
            <Segmented
              value={mounted ? (theme ?? 'system') : 'system'}
              onChange={setTheme}
              options={[
                { value: 'light', label: 'روشن', icon: <SunIcon /> },
                { value: 'dark', label: 'تیره', icon: <MoonIcon /> },
                { value: 'system', label: 'سیستم', icon: <LaptopIcon /> },
              ]}
            />
          </Row>
        </RowGroup>
      </div>

      <div>
        <BlockLabel>اعلان‌ها</BlockLabel>
        <RowGroup>
          {[
            ['وقتی تأیید من لازم است', 'اعلان دسکتاپ و صدای کوتاه', true],
            ['وقتی ناهنجاری پیدا شد', 'افت فروش، افزایش هزینه و مانند آن', true],
            ['وقتی کاری تمام شد', 'فقط برای کارهایی که خودم شروع کرده‌ام', true],
          ].map(([label, description, on]) => (
            <Row key={label as string} leading={<BellIcon className="text-muted-foreground size-5" />} label={label} description={description}>
              <Switch defaultChecked={on as boolean} />
            </Row>
          ))}
        </RowGroup>
      </div>
    </div>
  );
}

function Budget() {
  const total = agents.reduce((s, a) => s + a.budget, 0);
  const spent = agents.reduce((s, a) => s + a.spent, 0);
  return (
    <div className="space-y-6">
      <div className="bg-popover rounded-xl border p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-muted-foreground text-sm">مصرف این ماه</div>
            <div className="mt-1 text-2xl font-semibold">{toman(spent)}</div>
          </div>
          <Badge tone="primary">{fa(Math.round((spent / total) * 100))}٪ از سقف {toman(total, false)}</Badge>
        </div>
        <Progress value={(spent / total) * 100} className="mt-4 h-2.5" />
      </div>

      <div>
        <BlockLabel>سقف‌ها</BlockLabel>
        <RowGroup>
          <Row label="سقف ماهانهٔ سازمان" description="با رسیدن به این مبلغ همهٔ کارهای غیرضروری متوقف می‌شود">
            <Input defaultValue="۵۳ میلیون" className="w-40" />
          </Row>
          <Row label="سقف هر کار" description="کاری که گران‌تر از این شود، قبل از ادامه می‌پرسد">
            <Input defaultValue="۵۰۰ هزار" className="w-40" />
          </Row>
          <Row label="هشدار در ۸۰٪ بودجه" description="به مدیر واحد و مالک اعلان می‌دهد">
            <Switch defaultChecked />
          </Row>
          <Row label="توقف خودکار در ۱۰۰٪" description="ایجنت تا ماه بعد یا افزایش سقف کاری شروع نمی‌کند">
            <Switch defaultChecked />
          </Row>
        </RowGroup>
      </div>

      <div>
        <BlockLabel>سقف هر واحد</BlockLabel>
        <RowGroup>
          {units.map((unit) => (
            <Row key={unit.id} label={unit.name} description={`مصرف: ${toman(unit.spent)}`}>
              <Progress value={(unit.spent / unit.budget) * 100} tone={unit.spent / unit.budget > 0.8 ? 'danger' : 'primary'} className="hidden w-32 sm:block" />
              <Input defaultValue={toman(unit.budget, false)} className="w-36" />
            </Row>
          ))}
        </RowGroup>
      </div>
    </div>
  );
}

function Members() {
  return (
    <div>
      <BlockLabel
        action={
          <Button size="xs" onClick={() => toast.success('دعوت‌نامه ارسال شد')}>
            <UserPlusIcon /> دعوت عضو
          </Button>
        }
      >
        {fa(members.length)} عضو
      </BlockLabel>
      <RowGroup>
        {members.map((member) => (
          <Row
            key={member.email}
            leading={<span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">{member.name.slice(0, 1)}</span>}
            label={member.name}
            description={
              <span className="flex flex-wrap items-center gap-x-2">
                <span className="ltr-nums">{member.email}</span>
                <span>· واحد {member.unit}</span>
                <span>· دسترسی: {member.access}</span>
              </span>
            }
          >
            <Select
              defaultValue={member.role}
              className="w-36"
              options={['مالک', 'مدیر واحد', 'عضو', 'ناظر'].map((role) => ({ value: role, label: role }))}
            />
          </Row>
        ))}
      </RowGroup>
    </div>
  );
}

function Devices() {
  return (
    <div className="space-y-6">
      <div>
        <BlockLabel>محل اجرای پیش‌فرض</BlockLabel>
        <RowGroup>
          <Row label="کارهای جدید کجا اجرا شوند؟" description="محلی به فایل‌های همین سیستم دسترسی دارد؛ ابری با خاموش‌شدن سیستم هم ادامه می‌دهد">
            <Segmented
              value="local"
              onChange={() => toast('محل اجرای پیش‌فرض تغییر کرد')}
              options={[
                { value: 'local', label: 'همین سیستم', icon: <DesktopIcon /> },
                { value: 'cloud', label: 'ابری', icon: <CloudIcon /> },
              ]}
            />
          </Row>
          <Row label="اجرا در پس‌زمینه" description="با بستن پنجره، کارهای در جریان متوقف نشوند">
            <Switch defaultChecked />
          </Row>
          <Row label="شروع خودکار با روشن‌شدن سیستم">
            <Switch />
          </Row>
        </RowGroup>
      </div>

      <div>
        <BlockLabel>دستگاه‌ها</BlockLabel>
        <RowGroup>
          {devices.map((device) => (
            <Row
              key={device.id}
              leading={
                <Glyph tone={device.status === 'online' ? 'primary' : 'neutral'}>
                  {device.mode === 'ابری' ? <CloudIcon weight="fill" /> : <DesktopIcon weight="fill" />}
                </Glyph>
              }
              label={
                <span className="flex items-center gap-2">
                  {device.name}
                  {device.current && <Badge tone="primary">همین دستگاه</Badge>}
                </span>
              }
              description={`${device.os} · اجرای ${device.mode} · آخرین فعالیت: ${device.last}`}
            >
              {device.running > 0 && <Badge tone="info">{fa(device.running)} کار در حال اجرا</Badge>}
              <span className={cn('flex items-center gap-1.5 text-xs', device.status === 'online' ? 'text-success' : 'text-muted-foreground')}>
                <Dot tone={device.status === 'online' ? 'success' : 'neutral'} pulse={device.status === 'online'} />
                {device.status === 'online' ? 'آنلاین' : 'آفلاین'}
              </span>
            </Row>
          ))}
        </RowGroup>
      </div>
    </div>
  );
}

const panes: Record<Tab, () => React.ReactNode> = {
  general: General,
  connections: () => <Connections view="services" />,
  access: () => <Connections view="access" />,
  models: Models, budget: Budget, members: Members, devices: Devices };

export default function SettingsPage() {
  const tab = useUi((s) => s.settingsTab);
  const setTab = useUi((s) => s.setSettingsTab);
  const current = tabs.find((t) => t.id === tab)!;
  const Pane = panes[tab];

  return (
    <>
      <PageHeader title="تنظیمات" meta={current.label} />
      <div className="flex min-h-0 flex-1">
        <nav className={subNav}>
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              data-active={tab === item.id}
              className={navRow}
            >
              <item.icon weight={tab === item.id ? 'fill' : 'bold'} className={cn(tab === item.id && 'text-primary')} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="scrollbar-minimal min-w-0 flex-1 overflow-y-auto">
          <div className={cn('mx-auto px-6 py-6', tab === 'connections' || tab === 'access' || tab === 'models' ? 'max-w-5xl' : 'max-w-3xl')}>
            <Pane />
          </div>
        </div>
      </div>
    </>
  );
}
