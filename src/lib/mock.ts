// Sample data for the prototype. Nothing here is fetched or computed by a backend.
import type { Tone } from '@/components/ui/primitives';

export const APP_NAME = 'Onboard Harness';

export const org = { name: 'فروشگاه نیکان', unit: 'مدیریت', plan: 'سازمانی' };
export const me = { name: 'نیما رستگار', role: 'مدیر عملیات', initials: 'ن‌ر' };

/* ───────────── Agents, people, units ───────────── */

export type Agent = {
  id: string;
  name: string;
  role: string;
  unit: string;
  tone: Tone | 'chart2' | 'chart3' | 'chart4';
  initial: string;
  model: string;
  status: 'working' | 'idle' | 'waiting' | 'paused';
  budget: number;
  spent: number;
  skills: string[];
  manager: string;
};

export const agents: Agent[] = [
  { id: 'sales', name: 'تحلیلگر فروش', role: 'تحلیل فروش و پیش‌بینی', unit: 'فروش', tone: 'primary', initial: 'ف', model: 'Opus 5.5', status: 'working', budget: 12_000_000, spent: 7_400_000, skills: ['گزارش هفتگی فروش', 'تحلیل ریزش مشتری', 'پیش‌بینی تقاضا'], manager: 'مریم صادقی' },
  { id: 'marketing', name: 'دستیار مارکتینگ', role: 'کمپین و محتوا', unit: 'مارکتینگ', tone: 'chart4', initial: 'م', model: 'Sonnet 5.5', status: 'waiting', budget: 18_000_000, spent: 15_900_000, skills: ['ساخت کمپین پیامکی', 'تقویم محتوا', 'تحلیل رقبا'], manager: 'آرش کریمی' },
  { id: 'finance', name: 'حسابدار', role: 'مالی و تطبیق حساب', unit: 'مالی', tone: 'chart2', initial: 'ح', model: 'Opus 5.5', status: 'idle', budget: 8_000_000, spent: 2_100_000, skills: ['تطبیق بانکی', 'گزارش جریان نقدی', 'کنترل فاکتورها'], manager: 'الهام نوری' },
  { id: 'support', name: 'پشتیبان مشتری', role: 'پاسخ به تیکت‌ها', unit: 'پشتیبانی', tone: 'success', initial: 'پ', model: 'Haiku 5.5', status: 'working', budget: 6_000_000, spent: 3_300_000, skills: ['پاسخ به تیکت', 'جمع‌بندی شکایت‌ها'], manager: 'سینا احمدی' },
  { id: 'ops', name: 'هماهنگ‌کننده عملیات', role: 'موجودی و تأمین', unit: 'عملیات', tone: 'chart3', initial: 'ع', model: 'Sonnet 5.5', status: 'paused', budget: 9_000_000, spent: 4_800_000, skills: ['پایش موجودی', 'سفارش تأمین‌کننده'], manager: 'نیما رستگار' },
];

export const agentById = (id: string) => agents.find((a) => a.id === id) ?? agents[0];

export const agentStatus: Record<Agent['status'], { label: string; tone: Tone }> = {
  working: { label: 'در حال کار', tone: 'primary' },
  idle: { label: 'آماده', tone: 'neutral' },
  waiting: { label: 'منتظر تأیید', tone: 'warning' },
  paused: { label: 'متوقف', tone: 'danger' },
};

export const units = [
  { id: 'sales', name: 'فروش', head: 'مریم صادقی', people: 6, agents: 1, budget: 30_000_000, spent: 17_200_000 },
  { id: 'marketing', name: 'مارکتینگ', head: 'آرش کریمی', people: 4, agents: 1, budget: 40_000_000, spent: 33_500_000 },
  { id: 'finance', name: 'مالی', head: 'الهام نوری', people: 3, agents: 1, budget: 15_000_000, spent: 4_600_000 },
  { id: 'support', name: 'پشتیبانی', head: 'سینا احمدی', people: 5, agents: 1, budget: 12_000_000, spent: 6_900_000 },
  { id: 'ops', name: 'عملیات', head: 'نیما رستگار', people: 4, agents: 1, budget: 18_000_000, spent: 9_100_000 },
];

export const members = [
  { name: 'نیما رستگار', email: 'nima@nikan.shop', role: 'مالک', unit: 'مدیریت', access: 'همه‌چیز' },
  { name: 'مریم صادقی', email: 'maryam@nikan.shop', role: 'مدیر واحد', unit: 'فروش', access: 'فروش، داشبوردها' },
  { name: 'آرش کریمی', email: 'arash@nikan.shop', role: 'مدیر واحد', unit: 'مارکتینگ', access: 'مارکتینگ، کمپین‌ها' },
  { name: 'الهام نوری', email: 'elham@nikan.shop', role: 'مدیر واحد', unit: 'مالی', access: 'مالی، تأیید پرداخت' },
  { name: 'سینا احمدی', email: 'sina@nikan.shop', role: 'عضو', unit: 'پشتیبانی', access: 'تیکت‌ها' },
  { name: 'هستی مرادی', email: 'hasti@nikan.shop', role: 'عضو', unit: 'فروش', access: 'فقط مشاهده' },
];

/* ───────────── KPIs & briefing ───────────── */

export const kpis = [
  { id: 'revenue', label: 'فروش این هفته', value: '۲٫۸۴ میلیارد', unit: 'تومان', delta: -12.4, good: false, spark: [42, 45, 44, 48, 51, 47, 39, 36], source: 'پایگاه سفارش‌ها', updated: '۵ دقیقه پیش', verified: true },
  { id: 'orders', label: 'تعداد سفارش', value: '۱٬۹۴۶', unit: 'سفارش', delta: -8.1, good: false, spark: [30, 32, 31, 35, 36, 33, 29, 27], source: 'پایگاه سفارش‌ها', updated: '۵ دقیقه پیش', verified: true },
  { id: 'adcost', label: 'هزینه تبلیغات', value: '۴۱۲ میلیون', unit: 'تومان', delta: 23.6, good: false, spark: [20, 21, 20, 22, 24, 27, 29, 31], source: 'گوگل ادز + یکتانت', updated: '۱ ساعت پیش', verified: false },
  { id: 'nps', label: 'رضایت مشتری', value: '۴٫۶', unit: 'از ۵', delta: 2.2, good: true, spark: [41, 42, 42, 43, 44, 44, 45, 46], source: 'نظرسنجی پس از خرید', updated: 'دیروز', verified: true },
];

export const briefing = {
  happened: [
    { text: 'گزارش هفتگی فروش آماده و در پوشهٔ «گزارش‌ها» ذخیره شد', agent: 'sales' },
    { text: 'تطبیق بانکی مهرماه بسته شد؛ ۳ مغایرت کوچک رفع شد', agent: 'finance' },
    { text: '۱۴۲ تیکت پاسخ داده شد، میانگین زمان پاسخ ۴ دقیقه', agent: 'support' },
  ],
  unusual: [
    { text: 'فروش دستهٔ «لوازم آشپزخانه» ۳۱٪ کمتر از میانگین چهار هفتهٔ اخیر', tone: 'danger' as Tone },
    { text: 'هزینهٔ هر کلیک در کمپین پاییزه ۲٫۳ برابر شده است', tone: 'warning' as Tone },
    { text: 'موجودی ۶ کالای پرفروش کمتر از ۵ روز فروش است', tone: 'warning' as Tone },
  ],
  pending: [
    { text: 'ارسال پیامک تخفیف به ۸٬۴۰۰ مشتری', agent: 'marketing' },
    { text: 'سفارش خرید از تأمین‌کننده به مبلغ ۳۲۰ میلیون تومان', agent: 'ops' },
    { text: 'اصلاح قیمت ۲۴ کالا در فایل قیمت‌گذاری', agent: 'sales' },
  ],
};

export const anomalies = [
  { id: 'a1', title: 'افت فروش لوازم آشپزخانه', detail: '۳۱٪ کمتر از میانگین ۴ هفته؛ بیشترین افت در تهران و اصفهان', metric: '−۳۱٪', tone: 'danger' as Tone, when: '۲ ساعت پیش', agent: 'sales' },
  { id: 'a2', title: 'افزایش هزینهٔ تبلیغات', detail: 'کمپین پاییزه از سقف روزانه ۱۸٪ جلوتر است', metric: '+۲۳٫۶٪', tone: 'warning' as Tone, when: '۳ ساعت پیش', agent: 'marketing' },
  { id: 'a3', title: 'رشد نرخ مرجوعی', detail: 'مرجوعی «قهوه‌ساز مدل K2» به ۷٫۸٪ رسیده (میانگین: ۲٫۱٪)', metric: '۷٫۸٪', tone: 'warning' as Tone, when: 'دیروز', agent: 'support' },
];

/* ───────────── Tasks ───────────── */

export type TaskStatus = 'running' | 'waiting' | 'done' | 'stopped';

export const taskStatus: Record<TaskStatus, { label: string; tone: Tone }> = {
  running: { label: 'در حال اجرا', tone: 'primary' },
  waiting: { label: 'منتظر تأیید', tone: 'warning' },
  done: { label: 'انجام شد', tone: 'success' },
  stopped: { label: 'متوقف', tone: 'neutral' },
};

export const tasks = [
  { id: 't1', title: 'تحلیل افت فروش لوازم آشپزخانه', agent: 'sales', status: 'running' as TaskStatus, when: 'همین حالا', where: 'local', goal: 'رشد فروش فصل پاییز' },
  { id: 't2', title: 'کمپین پیامکی تخفیف آخر هفته', agent: 'marketing', status: 'waiting' as TaskStatus, when: '۲۰ دقیقه پیش', where: 'cloud', goal: 'رشد فروش فصل پاییز' },
  { id: 't3', title: 'گزارش جریان نقدی مهرماه', agent: 'finance', status: 'done' as TaskStatus, when: 'امروز ۰۹:۱۲', where: 'local', goal: 'کنترل هزینه‌ها' },
  { id: 't4', title: 'جمع‌بندی شکایت‌های قهوه‌ساز K2', agent: 'support', status: 'done' as TaskStatus, when: 'دیروز', where: 'cloud', goal: 'رضایت مشتری ۴٫۷' },
  { id: 't5', title: 'پیشنهاد سفارش تأمین برای آبان', agent: 'ops', status: 'waiting' as TaskStatus, when: 'دیروز', where: 'local', goal: 'کنترل هزینه‌ها' },
  { id: 't6', title: 'اسلاید جلسهٔ هیئت‌مدیره', agent: 'sales', status: 'stopped' as TaskStatus, when: '۳ روز پیش', where: 'local', goal: '' },
  { id: 't7', title: 'مقایسهٔ قیمت با سه رقیب اصلی', agent: 'marketing', status: 'done' as TaskStatus, when: '۴ روز پیش', where: 'cloud', goal: 'رشد فروش فصل پاییز' },
];

export const planSteps = [
  { id: 's1', title: 'خواندن دادهٔ فروش ۸ هفتهٔ اخیر', detail: 'sales_1405.xlsx · ۲۳٬۴۱۰ ردیف', seconds: 2 },
  { id: 's2', title: 'تفکیک فروش بر اساس دسته و شهر', detail: '۱۲ دسته · ۳۱ شهر', seconds: 3 },
  { id: 's3', title: 'مقایسه با میانگین و پیدا کردن ناهنجاری', detail: 'روش: انحراف از میانگین متحرک ۴ هفته', seconds: 3 },
  { id: 's4', title: 'بررسی عوامل احتمالی (قیمت، موجودی، تبلیغات)', detail: 'قیمت رقبا · موجودی انبار · کمپین‌ها', seconds: 4 },
  { id: 's5', title: 'نوشتن گزارش و پیشنهاد اقدام', detail: 'سند + جدول + نمودار', seconds: 3 },
];

/* ───────────── Approvals ───────────── */

export type Change = { id: string; label: string; before: string; after: string };

export type Approval = {
  id: string;
  title: string;
  summary: string;
  agent: string;
  kind: 'document' | 'sheet' | 'campaign' | 'payment';
  risk: 'low' | 'medium' | 'high';
  cost: number;
  reversible: boolean;
  when: string;
  target: string;
  changes: Change[];
};

export const riskMeta: Record<Approval['risk'], { label: string; tone: Tone }> = {
  low: { label: 'ریسک کم', tone: 'success' },
  medium: { label: 'ریسک متوسط', tone: 'warning' },
  high: { label: 'ریسک زیاد', tone: 'danger' },
};

export const kindLabel: Record<Approval['kind'], string> = {
  document: 'سند',
  sheet: 'جدول',
  campaign: 'کمپین',
  payment: 'پرداخت',
};

export const approvals: Approval[] = [
  {
    id: 'ap1', title: 'ارسال پیامک تخفیف آخر هفته', summary: 'ارسال به ۸٬۴۰۰ مشتری که در ۶۰ روز اخیر خرید نکرده‌اند', agent: 'marketing', kind: 'campaign', risk: 'high', cost: 4_200_000, reversible: false, when: '۲۰ دقیقه پیش', target: 'پنل پیامک کاوه‌نگار',
    changes: [
      { id: 'c1', label: 'متن پیام', before: 'نیکان: ۱۰٪ تخفیف ویژهٔ شما تا جمعه. کد: PAYIZ10', after: 'نیکان: ۱۵٪ تخفیف لوازم آشپزخانه فقط تا جمعه. کد: ASHPAZ15 · لغو۱۱' },
      { id: 'c2', label: 'مخاطبان', before: 'همهٔ مشتریان (۲۳٬۱۰۰ نفر)', after: 'مشتریان غیرفعال ۶۰ روز اخیر (۸٬۴۰۰ نفر)' },
      { id: 'c3', label: 'زمان ارسال', before: 'بلافاصله', after: 'پنجشنبه ساعت ۱۸:۰۰' },
    ],
  },
  {
    id: 'ap2', title: 'سفارش خرید از تأمین‌کننده', summary: 'تأمین ۶ کالای پرفروش با موجودی کمتر از ۵ روز', agent: 'ops', kind: 'payment', risk: 'high', cost: 320_000_000, reversible: false, when: '۱ ساعت پیش', target: 'بازرگانی آریا',
    changes: [
      { id: 'c1', label: 'قهوه‌ساز K2', before: 'موجودی: ۱۸ عدد', after: 'سفارش: ۱۲۰ عدد · ۱۴۴ میلیون' },
      { id: 'c2', label: 'ست قابلمه ۸ پارچه', before: 'موجودی: ۹ عدد', after: 'سفارش: ۶۰ عدد · ۱۰۸ میلیون' },
      { id: 'c3', label: 'کتری برقی T5', before: 'موجودی: ۲۲ عدد', after: 'سفارش: ۸۰ عدد · ۶۸ میلیون' },
    ],
  },
  {
    id: 'ap3', title: 'اصلاح قیمت ۲۴ کالا', summary: 'هم‌سطح‌سازی قیمت با رقبا در دستهٔ لوازم آشپزخانه', agent: 'sales', kind: 'sheet', risk: 'medium', cost: 0, reversible: true, when: '۲ ساعت پیش', target: 'قیمت‌گذاری-پاییز.xlsx',
    changes: [
      { id: 'c1', label: 'قهوه‌ساز K2 · ستون قیمت', before: '۴٬۸۵۰٬۰۰۰', after: '۴٬۵۹۰٬۰۰۰' },
      { id: 'c2', label: 'مخلوط‌کن B7 · ستون قیمت', before: '۲٬۹۰۰٬۰۰۰', after: '۲٬۷۵۰٬۰۰۰' },
      { id: 'c3', label: 'توستر دوخانه · ستون قیمت', before: '۱٬۶۵۰٬۰۰۰', after: '۱٬۵۹۰٬۰۰۰' },
      { id: 'c4', label: '۲۱ ردیف دیگر', before: 'میانگین حاشیه سود: ۲۴٪', after: 'میانگین حاشیه سود: ۲۱٫۵٪' },
    ],
  },
  {
    id: 'ap4', title: 'به‌روزرسانی سیاست مرجوعی', summary: 'افزودن بند بازگشت وجه ۷۲ ساعته به سند سیاست‌ها', agent: 'support', kind: 'document', risk: 'low', cost: 0, reversible: true, when: 'دیروز', target: 'سیاست-مرجوعی.docx',
    changes: [
      { id: 'c1', label: 'بند ۳ · مهلت بازگشت وجه', before: 'بازگشت وجه حداکثر تا ۷ روز کاری انجام می‌شود.', after: 'بازگشت وجه حداکثر تا ۷۲ ساعت پس از تأیید مرجوعی انجام می‌شود.' },
      { id: 'c2', label: 'بند ۵ · کالاهای برقی', before: 'کالای برقی بازشده قابل مرجوعی نیست.', after: 'کالای برقی بازشده در صورت نقص فنی تا ۷ روز قابل مرجوعی است.' },
    ],
  },
  {
    id: 'ap5', title: 'پاسخ به شکایت مشتری ویژه', summary: 'ارسال ایمیل عذرخواهی همراه با کد تخفیف ۲۰٪', agent: 'support', kind: 'document', risk: 'low', cost: 380_000, reversible: false, when: 'دیروز', target: 'ایمیل · سارا محمدی',
    changes: [{ id: 'c1', label: 'متن ایمیل', before: '—', after: 'خانم محمدی عزیز، بابت تأخیر در ارسال سفارش‌تان عذرخواهی می‌کنیم. کد تخفیف ۲۰٪ برای خرید بعدی شما فعال شد.' }],
  },
];

/* ───────────── Files ───────────── */

export type FileKind = 'folder' | 'doc' | 'sheet' | 'slides' | 'pdf' | 'image';

export type FileItem = {
  id: string;
  name: string;
  kind: FileKind;
  place: 'local' | 'cloud';
  folder: string;
  size: string;
  modified: string;
  by: string;
};

export const folders = [
  { id: 'reports', name: 'گزارش‌ها', place: 'local' as const, path: 'D:\\Nikan\\Reports', count: 5 },
  { id: 'finance', name: 'مالی', place: 'local' as const, path: 'D:\\Nikan\\Finance', count: 3 },
  { id: 'marketing', name: 'مارکتینگ', place: 'cloud' as const, path: 'Google Drive / Marketing', count: 3 },
  { id: 'policies', name: 'سیاست‌ها و قراردادها', place: 'cloud' as const, path: 'OneDrive / Policies', count: 2 },
];

export const files: FileItem[] = [
  { id: 'f1', name: 'گزارش هفتگی فروش - هفته ۲۹', kind: 'doc', place: 'local', folder: 'reports', size: '۴۸ کیلوبایت', modified: 'امروز ۰۸:۳۰', by: 'تحلیلگر فروش' },
  { id: 'f2', name: 'قیمت‌گذاری پاییز', kind: 'sheet', place: 'local', folder: 'reports', size: '۱۲۰ کیلوبایت', modified: 'امروز ۱۰:۱۵', by: 'تحلیلگر فروش' },
  { id: 'f3', name: 'ارائهٔ هیئت‌مدیره - مهر', kind: 'slides', place: 'local', folder: 'reports', size: '۲٫۱ مگابایت', modified: 'دیروز', by: 'نیما رستگار' },
  { id: 'f4', name: 'تحلیل افت فروش آشپزخانه', kind: 'doc', place: 'local', folder: 'reports', size: '۳۶ کیلوبایت', modified: 'همین حالا', by: 'تحلیلگر فروش' },
  { id: 'f5', name: 'نمودار فروش منطقه‌ای', kind: 'image', place: 'local', folder: 'reports', size: '۳۴۰ کیلوبایت', modified: '۲ روز پیش', by: 'تحلیلگر فروش' },
  { id: 'f6', name: 'جریان نقدی مهرماه', kind: 'sheet', place: 'local', folder: 'finance', size: '۸۸ کیلوبایت', modified: 'امروز ۰۹:۱۲', by: 'حسابدار' },
  { id: 'f7', name: 'صورت‌حساب بانک ملت', kind: 'pdf', place: 'local', folder: 'finance', size: '۱٫۴ مگابایت', modified: '۳ روز پیش', by: 'الهام نوری' },
  { id: 'f8', name: 'بودجه ۱۴۰۵', kind: 'sheet', place: 'local', folder: 'finance', size: '۲۱۰ کیلوبایت', modified: 'هفتهٔ پیش', by: 'الهام نوری' },
  { id: 'f9', name: 'تقویم محتوای آبان', kind: 'sheet', place: 'cloud', folder: 'marketing', size: '۵۴ کیلوبایت', modified: 'دیروز', by: 'دستیار مارکتینگ' },
  { id: 'f10', name: 'بریف کمپین پاییزه', kind: 'doc', place: 'cloud', folder: 'marketing', size: '۲۸ کیلوبایت', modified: '۲ روز پیش', by: 'آرش کریمی' },
  { id: 'f11', name: 'معرفی برند نیکان', kind: 'slides', place: 'cloud', folder: 'marketing', size: '۵٫۶ مگابایت', modified: 'ماه پیش', by: 'آرش کریمی' },
  { id: 'f12', name: 'سیاست مرجوعی', kind: 'doc', place: 'cloud', folder: 'policies', size: '۲۲ کیلوبایت', modified: 'دیروز', by: 'پشتیبان مشتری' },
  { id: 'f13', name: 'قرارداد بازرگانی آریا', kind: 'pdf', place: 'cloud', folder: 'policies', size: '۸۹۰ کیلوبایت', modified: '۲ ماه پیش', by: 'الهام نوری' },
];

export const versions = [
  { id: 'v5', label: 'نسخهٔ فعلی', by: 'تحلیلگر فروش', when: 'همین حالا', note: 'افزودن بخش «پیشنهاد اقدام»', current: true },
  { id: 'v4', label: 'نسخهٔ ۴', by: 'نیما رستگار', when: 'امروز ۱۰:۴۰', note: 'اصلاح عدد افت فروش تهران' },
  { id: 'v3', label: 'نسخهٔ ۳', by: 'تحلیلگر فروش', when: 'امروز ۱۰:۱۲', note: 'افزودن جدول تفکیک شهرها' },
  { id: 'v2', label: 'نسخهٔ ۲', by: 'تحلیلگر فروش', when: 'امروز ۰۹:۵۵', note: 'بازنویسی خلاصهٔ مدیریتی' },
  { id: 'v1', label: 'نسخهٔ ۱', by: 'تحلیلگر فروش', when: 'امروز ۰۹:۴۸', note: 'پیش‌نویس اولیه' },
];

export const docHtml = `
<h1>تحلیل افت فروش لوازم آشپزخانه</h1>
<p>فروش دستهٔ <strong>لوازم آشپزخانه</strong> در هفتهٔ ۲۹ نسبت به میانگین چهار هفتهٔ قبل <strong>۳۱٪ کاهش</strong> داشته است. این افت معادل حدود ۲۸۶ میلیون تومان درآمد ازدست‌رفته است.</p>
<h2>خلاصهٔ مدیریتی</h2>
<ul>
<li>بیشترین افت در <strong>تهران (۳۸٪−)</strong> و <strong>اصفهان (۳۴٪−)</strong> دیده می‌شود.</li>
<li>دو رقیب اصلی از ۱۲ مهر قیمت قهوه‌ساز و مخلوط‌کن را ۶ تا ۹ درصد کاهش داده‌اند.</li>
<li>موجودی «قهوه‌ساز K2» چهار روز در هفته صفر بوده است.</li>
</ul>
<h2>علت‌های احتمالی</h2>
<ol>
<li><strong>قیمت:</strong> میانگین قیمت ما در ۲۴ کالا ۵٫۴٪ بالاتر از رقباست.</li>
<li><strong>موجودی:</strong> ۶ کالای پرفروش کمتر از ۵ روز فروش موجودی دارند.</li>
<li><strong>تبلیغات:</strong> بودجهٔ کمپین پاییزه بیشتر صرف دستهٔ «دکوراسیون» شده است.</li>
</ol>
<blockquote>اگر قیمت ۲۴ کالا اصلاح و موجودی تأمین شود، برآورد می‌شود ۷۰٪ افت طی دو هفته جبران شود.</blockquote>
<h2>پیشنهاد اقدام</h2>
<p>اصلاح قیمت ۲۴ کالا، سفارش فوری تأمین ۶ کالا، و یک کمپین پیامکی هدفمند برای مشتریان غیرفعال. هر سه اقدام در صندوق تأیید منتظر تصمیم شماست.</p>
`;

export const sheetRows = [
  { A: 'قهوه‌ساز K2', B: 'آشپزخانه', C: 4850000, D: 4590000, E: 142, F: '=D2*E2' },
  { A: 'مخلوط‌کن B7', B: 'آشپزخانه', C: 2900000, D: 2750000, E: 96, F: '=D3*E3' },
  { A: 'توستر دوخانه', B: 'آشپزخانه', C: 1650000, D: 1590000, E: 121, F: '=D4*E4' },
  { A: 'کتری برقی T5', B: 'آشپزخانه', C: 1280000, D: 1280000, E: 188, F: '=D5*E5' },
  { A: 'ست قابلمه ۸ پارچه', B: 'آشپزخانه', C: 6400000, D: 6100000, E: 54, F: '=D6*E6' },
  { A: 'آینهٔ دکوری M3', B: 'دکوراسیون', C: 2100000, D: 2100000, E: 73, F: '=D7*E7' },
  { A: 'گلدان سرامیکی', B: 'دکوراسیون', C: 480000, D: 480000, E: 310, F: '=D8*E8' },
  { A: 'جمع کل', B: '', C: '', D: '', E: '=SUM(E2:E8)', F: '=SUM(F2:F8)' },
];

export const slides = [
  { title: 'مرور عملکرد مهرماه', subtitle: 'ارائه به هیئت‌مدیره · فروشگاه نیکان', kind: 'cover' },
  { title: 'فروش ماهانه', subtitle: '۱۱٫۲ میلیارد تومان · ۶٪ کمتر از هدف', kind: 'chart' },
  { title: 'سه چالش اصلی', subtitle: 'قیمت رقبا · کمبود موجودی · هزینهٔ جذب', kind: 'bullets' },
  { title: 'برنامهٔ آبان', subtitle: 'اصلاح قیمت، تأمین موجودی، کمپین هدفمند', kind: 'bullets' },
  { title: 'درخواست از هیئت‌مدیره', subtitle: 'تأیید بودجهٔ ۳۲۰ میلیونی تأمین کالا', kind: 'cover' },
];

/* ───────────── Dashboards ───────────── */

export const dashboards = [
  { id: 'sales', name: 'فروش و درآمد', source: 'پایگاه سفارش‌ها', updated: '۵ دقیقه پیش' },
  { id: 'marketing', name: 'بازدهی تبلیغات', source: 'گوگل ادز + یکتانت', updated: '۱ ساعت پیش' },
  { id: 'support', name: 'پشتیبانی و رضایت', source: 'سامانهٔ تیکت', updated: '۱۰ دقیقه پیش' },
];

export const weeklySales = [
  { week: 'هفته ۲۲', sales: 3120, target: 3000, orders: 2140 },
  { week: 'هفته ۲۳', sales: 3260, target: 3050, orders: 2210 },
  { week: 'هفته ۲۴', sales: 3180, target: 3100, orders: 2175 },
  { week: 'هفته ۲۵', sales: 3410, target: 3150, orders: 2330 },
  { week: 'هفته ۲۶', sales: 3520, target: 3200, orders: 2390 },
  { week: 'هفته ۲۷', sales: 3340, target: 3250, orders: 2280 },
  { week: 'هفته ۲۸', sales: 3050, target: 3300, orders: 2060 },
  { week: 'هفته ۲۹', sales: 2840, target: 3350, orders: 1946 },
];

export const categorySales = [
  { name: 'دکوراسیون', value: 980, change: 6.2 },
  { name: 'آشپزخانه', value: 640, change: -31 },
  { name: 'خواب و حمام', value: 520, change: 2.4 },
  { name: 'نور و روشنایی', value: 410, change: -3.1 },
  { name: 'باغ و بالکن', value: 290, change: 11.8 },
];

export const channelShare = [
  { name: 'وب‌سایت', value: 46 },
  { name: 'اپلیکیشن', value: 31 },
  { name: 'اینستاگرام', value: 15 },
  { name: 'مارکت‌پلیس', value: 8 },
];

export const cityRows = [
  { city: 'تهران', sales: 1180, orders: 792, change: -18.4, share: 41.5, verified: true },
  { city: 'اصفهان', sales: 412, orders: 286, change: -14.2, share: 14.5, verified: true },
  { city: 'مشهد', sales: 356, orders: 251, change: -6.8, share: 12.5, verified: true },
  { city: 'شیراز', sales: 298, orders: 204, change: 3.1, share: 10.5, verified: true },
  { city: 'تبریز', sales: 231, orders: 162, change: -2.3, share: 8.1, verified: false },
  { city: 'کرج', sales: 204, orders: 148, change: 5.6, share: 7.2, verified: true },
  { city: 'سایر شهرها', sales: 159, orders: 103, change: -9.9, share: 5.7, verified: false },
];

/* ───────────── Goals & experiments ───────────── */

export const goals = [
  { id: 'g1', title: 'رشد فروش فصل پاییز', owner: 'مریم صادقی', unit: 'فروش', metric: 'فروش فصلی', current: 24.6, target: 42, unitLabel: 'میلیارد تومان', deadline: '۳۰ آذر ۱۴۰۵', progress: 58, expected: 67, status: 'risk' as const, agents: ['sales', 'marketing'], tasks: 9 },
  { id: 'g2', title: 'رضایت مشتری ۴٫۷', owner: 'سینا احمدی', unit: 'پشتیبانی', metric: 'امتیاز رضایت', current: 4.6, target: 4.7, unitLabel: 'از ۵', deadline: '۳۰ دی ۱۴۰۵', progress: 82, expected: 70, status: 'ahead' as const, agents: ['support'], tasks: 5 },
  { id: 'g3', title: 'کنترل هزینه‌ها', owner: 'الهام نوری', unit: 'مالی', metric: 'نسبت هزینه به درآمد', current: 31, target: 28, unitLabel: '٪', deadline: '۲۹ اسفند ۱۴۰۵', progress: 44, expected: 50, status: 'ontrack' as const, agents: ['finance', 'ops'], tasks: 7 },
  { id: 'g4', title: 'کاهش هزینهٔ جذب مشتری', owner: 'آرش کریمی', unit: 'مارکتینگ', metric: 'CAC', current: 186, target: 140, unitLabel: 'هزار تومان', deadline: '۳۰ آذر ۱۴۰۵', progress: 22, expected: 60, status: 'off' as const, agents: ['marketing'], tasks: 4 },
];

export const goalStatus = {
  ahead: { label: 'جلوتر از برنامه', tone: 'success' as Tone },
  ontrack: { label: 'طبق برنامه', tone: 'primary' as Tone },
  risk: { label: 'در خطر', tone: 'warning' as Tone },
  off: { label: 'عقب‌تر از برنامه', tone: 'danger' as Tone },
};

export const experiments = [
  { id: 'e1', hypothesis: 'ارسال رایگان بالای ۱ میلیون تومان، میانگین سبد را ۱۵٪ بالا می‌برد', goal: 'رشد فروش فصل پاییز', cost: 28_000_000, result: 'میانگین سبد +۱۱٪', status: 'won' as const, period: '۱ تا ۱۴ مهر' },
  { id: 'e2', hypothesis: 'پیامک یادآوری سبد رهاشده نرخ تکمیل خرید را دو برابر می‌کند', goal: 'رشد فروش فصل پاییز', cost: 6_500_000, result: 'نرخ تکمیل +۳۸٪', status: 'won' as const, period: '۵ تا ۱۹ مهر' },
  { id: 'e3', hypothesis: 'تبلیغ ویدیویی در اینستاگرام CAC را کاهش می‌دهد', goal: 'کاهش هزینهٔ جذب مشتری', cost: 45_000_000, result: 'CAC +۹٪ (بدتر شد)', status: 'lost' as const, period: '۱۰ تا ۲۴ مهر' },
  { id: 'e4', hypothesis: 'پاسخ خودکار در ۲ دقیقهٔ اول رضایت را بالا می‌برد', goal: 'رضایت مشتری ۴٫۷', cost: 2_000_000, result: 'در حال اندازه‌گیری', status: 'running' as const, period: 'از ۲۰ مهر' },
];

export const experimentStatus = {
  won: { label: 'تأیید شد', tone: 'success' as Tone },
  lost: { label: 'رد شد', tone: 'danger' as Tone },
  running: { label: 'در جریان', tone: 'primary' as Tone },
};

/* ───────────── Automations ───────────── */

export const automations = [
  { id: 'au1', name: 'گزارش هفتگی فروش', trigger: 'schedule' as const, when: 'شنبه‌ها ساعت ۰۸:۰۰', agent: 'sales', enabled: true, lastRun: 'شنبه ۰۸:۰۰', lastStatus: 'ok' as const, runs: 29 },
  { id: 'au2', name: 'تطبیق بانکی روزانه', trigger: 'schedule' as const, when: 'هر روز ساعت ۰۷:۳۰', agent: 'finance', enabled: true, lastRun: 'امروز ۰۷:۳۰', lastStatus: 'ok' as const, runs: 214 },
  { id: 'au3', name: 'هشدار افت موجودی', trigger: 'event' as const, when: 'وقتی موجودی کالایی کمتر از ۵ روز فروش شد', agent: 'ops', enabled: true, lastRun: 'دیروز ۱۶:۴۲', lastStatus: 'approval' as const, runs: 37 },
  { id: 'au4', name: 'پاسخ اولیه به تیکت جدید', trigger: 'event' as const, when: 'وقتی تیکت جدیدی ثبت شد', agent: 'support', enabled: true, lastRun: '۴ دقیقه پیش', lastStatus: 'ok' as const, runs: 1842 },
  { id: 'au5', name: 'پایش قیمت رقبا', trigger: 'schedule' as const, when: 'دوشنبه و پنجشنبه ساعت ۱۰:۰۰', agent: 'marketing', enabled: false, lastRun: '۵ روز پیش', lastStatus: 'failed' as const, runs: 12 },
];

export const runHistory = [
  { when: 'امروز ۰۷:۳۰', duration: '۲ دقیقه و ۱۴ ثانیه', status: 'ok' as const, note: '۴۱۲ تراکنش تطبیق شد', cost: 18_000 },
  { when: 'دیروز ۰۷:۳۰', duration: '۲ دقیقه و ۴۰ ثانیه', status: 'ok' as const, note: '۳۸۷ تراکنش · ۱ مغایرت', cost: 21_000 },
  { when: '۱۶ مهر ۰۷:۳۰', duration: '۵ دقیقه و ۰۲ ثانیه', status: 'approval' as const, note: 'مغایرت ۴٫۲ میلیونی نیاز به تأیید داشت', cost: 34_000 },
  { when: '۱۵ مهر ۰۷:۳۰', duration: '۴۸ ثانیه', status: 'failed' as const, note: 'اتصال به بانک برقرار نشد', cost: 3_000 },
  { when: '۱۴ مهر ۰۷:۳۰', duration: '۲ دقیقه و ۰۹ ثانیه', status: 'ok' as const, note: '۳۹۵ تراکنش تطبیق شد', cost: 17_000 },
];

export const runStatus = {
  ok: { label: 'موفق', tone: 'success' as Tone },
  approval: { label: 'منتظر تأیید', tone: 'warning' as Tone },
  failed: { label: 'ناموفق', tone: 'danger' as Tone },
};

/* ───────────── Connections ───────────── */

export const connections = [
  { id: 'db', name: 'پایگاه سفارش‌ها', desc: 'PostgreSQL · فقط خواندن', category: 'داده', connected: true, initial: 'PG', tone: 'info' as Tone },
  { id: 'sheets', name: 'Google Sheets', desc: 'خواندن و نوشتن جدول‌ها', category: 'اسناد', connected: true, initial: 'GS', tone: 'success' as Tone },
  { id: 'drive', name: 'Google Drive', desc: 'پوشهٔ مارکتینگ', category: 'اسناد', connected: true, initial: 'GD', tone: 'warning' as Tone },
  { id: 'sms', name: 'کاوه‌نگار', desc: 'ارسال پیامک', category: 'ارتباط با مشتری', connected: true, initial: 'KN', tone: 'danger' as Tone },
  { id: 'accounting', name: 'سپیدار', desc: 'نرم‌افزار حسابداری', category: 'مالی', connected: true, initial: 'SP', tone: 'primary' as Tone },
  { id: 'ads', name: 'Google Ads', desc: 'گزارش و مدیریت کمپین', category: 'تبلیغات', connected: true, initial: 'GA', tone: 'info' as Tone },
  { id: 'ticket', name: 'رایچت', desc: 'تیکت و گفت‌وگوی آنلاین', category: 'ارتباط با مشتری', connected: false, initial: 'RC', tone: 'neutral' as Tone },
  { id: 'slack', name: 'Slack', desc: 'اعلان و گفت‌وگوی تیمی', category: 'ارتباط تیمی', connected: false, initial: 'SL', tone: 'neutral' as Tone },
  { id: 'crm', name: 'دیدار CRM', desc: 'مشتریان و فرصت‌های فروش', category: 'فروش', connected: false, initial: 'DC', tone: 'neutral' as Tone },
];

export type Access = 'allow' | 'ask' | 'deny';

export const accessMeta: Record<Access, { label: string; tone: Tone }> = {
  allow: { label: 'مجاز', tone: 'success' },
  ask: { label: 'با تأیید', tone: 'warning' },
  deny: { label: 'ممنوع', tone: 'danger' },
};

export const accessMatrix: Record<string, Record<string, Access>> = {
  sales: { db: 'allow', sheets: 'allow', drive: 'ask', sms: 'deny', accounting: 'deny', ads: 'ask' },
  marketing: { db: 'allow', sheets: 'allow', drive: 'allow', sms: 'ask', accounting: 'deny', ads: 'ask' },
  finance: { db: 'allow', sheets: 'allow', drive: 'deny', sms: 'deny', accounting: 'ask', ads: 'deny' },
  support: { db: 'allow', sheets: 'deny', drive: 'deny', sms: 'ask', accounting: 'deny', ads: 'deny' },
  ops: { db: 'allow', sheets: 'allow', drive: 'deny', sms: 'deny', accounting: 'ask', ads: 'deny' },
};

export const localFolders = [
  { path: 'D:\\Nikan\\Reports', access: 'خواندن و نوشتن', agents: 3, size: '۱٫۲ گیگابایت' },
  { path: 'D:\\Nikan\\Finance', access: 'فقط خواندن', agents: 1, size: '۸۴۰ مگابایت' },
  { path: 'C:\\Users\\Nima\\Desktop\\ورودی', access: 'خواندن و نوشتن', agents: 5, size: '۶۲ مگابایت' },
];

/* ───────────── Knowledge ───────────── */

export const businessProfile = [
  { key: 'برند', value: 'نیکان؛ فروشگاه آنلاین لوازم خانه. لحن: صمیمی، محترمانه، بدون اغراق. هیچ‌وقت از «بهترین» و «ارزان‌ترین» استفاده نمی‌کنیم.' },
  { key: 'مشتری هدف', value: 'زوج‌های ۲۵ تا ۴۰ ساله در شهرهای بزرگ که خانهٔ جدید می‌چینند؛ حساس به کیفیت و زمان ارسال.' },
  { key: 'قیمت‌گذاری', value: 'حاشیهٔ سود هدف ۲۲ تا ۲۶ درصد. حداکثر تخفیف بدون تأیید مدیر فروش: ۱۵٪.' },
  { key: 'محدودیت‌ها', value: 'ارسال پیامک فقط بین ۹ صبح تا ۹ شب. پرداخت بالای ۵۰ میلیون تومان همیشه با تأیید مالی.' },
];

export const memories = [
  { id: 'm1', text: 'مدیر فروش گزارش‌ها را با «خلاصهٔ مدیریتی» سه‌خطی در ابتدا می‌خواهد.', scope: 'واحد فروش', source: 'اصلاح شما در ۱۲ مهر', agent: 'sales' },
  { id: 'm2', text: 'اعداد مالی همیشه به تومان و با جداکنندهٔ هزارگان نوشته شوند، نه ریال.', scope: 'سازمان', source: 'گفت‌وگو در ۳ مهر', agent: 'finance' },
  { id: 'm3', text: 'تأمین‌کنندهٔ اصلی «بازرگانی آریا» است؛ زمان تحویل معمول ۶ روز کاری.', scope: 'واحد عملیات', source: 'قرارداد بازرگانی آریا', agent: 'ops' },
  { id: 'm4', text: 'هفتهٔ کاری از شنبه شروع می‌شود و مقایسه‌ها هفته‌به‌هفته انجام شود.', scope: 'سازمان', source: 'تنظیم شما', agent: 'sales' },
  { id: 'm5', text: 'مشتریان ویژه (خرید سالانه بالای ۵۰ میلیون) پاسخ شخصی‌سازی‌شده می‌گیرند.', scope: 'واحد پشتیبانی', source: 'تصمیم ۲۸ شهریور', agent: 'support' },
];

export const decisions = [
  { id: 'd1', title: 'سقف تخفیف بدون تأیید ۱۵٪ شد', why: 'دو کمپین قبلی با تخفیف ۲۵٪ حاشیهٔ سود را زیر ۱۰٪ برد.', by: 'مریم صادقی', when: '۱۴ مهر ۱۴۰۵', tag: 'قیمت‌گذاری' },
  { id: 'd2', title: 'تبلیغ ویدیویی اینستاگرام متوقف شد', why: 'آزمایش دوهفته‌ای نشان داد CAC را ۹٪ بالا می‌برد.', by: 'آرش کریمی', when: '۲۴ مهر ۱۴۰۵', tag: 'مارکتینگ' },
  { id: 'd3', title: 'بازگشت وجه ۷۲ ساعته', why: 'شکایت‌های مربوط به تأخیر بازگشت وجه ۴۰٪ کل شکایت‌ها بود.', by: 'سینا احمدی', when: '۲۰ مهر ۱۴۰۵', tag: 'پشتیبانی' },
];

/* ───────────── Customization ───────────── */

export const skills = [
  { id: 'sk1', name: 'گزارش هفتگی فروش', desc: 'خواندن دادهٔ فروش، مقایسه با هفتهٔ قبل و نوشتن گزارش با خلاصهٔ مدیریتی', layer: 'واحد فروش', agents: ['sales'], uses: 29, updated: '۱۲ مهر' },
  { id: 'sk2', name: 'ساخت کمپین پیامکی', desc: 'انتخاب مخاطب، نوشتن متن طبق لحن برند و زمان‌بندی ارسال', layer: 'واحد مارکتینگ', agents: ['marketing'], uses: 14, updated: '۱۸ مهر' },
  { id: 'sk3', name: 'تطبیق بانکی', desc: 'تطبیق صورت‌حساب بانک با دفتر حسابداری و فهرست‌کردن مغایرت‌ها', layer: 'واحد مالی', agents: ['finance'], uses: 214, updated: '۲ مهر' },
  { id: 'sk4', name: 'پاسخ به تیکت', desc: 'پاسخ محترمانه طبق سیاست مرجوعی و ارجاع موارد حساس به انسان', layer: 'واحد پشتیبانی', agents: ['support'], uses: 1842, updated: '۲۰ مهر' },
  { id: 'sk5', name: 'نگارش با لحن برند', desc: 'قواعد نگارشی و لحن نیکان برای هر متن بیرونی', layer: 'سازمان', agents: ['marketing', 'support', 'sales'], uses: 96, updated: '۵ مهر' },
];

export const rules = [
  { id: 'r1', text: 'خواندن فایل‌های پوشهٔ گزارش‌ها', scope: 'سازمان', access: 'allow' as Access },
  { id: 'r2', text: 'ویرایش فایل‌های اکسل و ورد', scope: 'سازمان', access: 'ask' as Access },
  { id: 'r3', text: 'ارسال پیامک یا ایمیل به مشتری', scope: 'سازمان', access: 'ask' as Access },
  { id: 'r4', text: 'پرداخت یا ثبت سفارش خرید', scope: 'سازمان', access: 'ask' as Access },
  { id: 'r5', text: 'تخفیف بیشتر از ۱۵٪', scope: 'واحد فروش', access: 'deny' as Access },
  { id: 'r6', text: 'حذف فایل یا رکورد', scope: 'سازمان', access: 'deny' as Access },
  { id: 'r7', text: 'جست‌وجو در وب', scope: 'سازمان', access: 'allow' as Access },
  { id: 'r8', text: 'ارسال پیامک خارج از ۹ صبح تا ۹ شب', scope: 'واحد مارکتینگ', access: 'deny' as Access },
];

export const suggestions = [
  { id: 'su1', skill: 'گزارش هفتگی فروش', reason: 'در ۳ گزارش اخیر، خودتان جدول «تفکیک شهرها» را اضافه کردید.', before: 'گزارش شامل خلاصهٔ مدیریتی و نمودار روند فروش است.', after: 'گزارش شامل خلاصهٔ مدیریتی، نمودار روند فروش و جدول تفکیک شهرها است.' },
  { id: 'su2', skill: 'ساخت کمپین پیامکی', reason: 'دو بار عبارت «لغو۱۱» را به انتهای متن پیامک اضافه کردید.', before: 'متن پیامک حداکثر ۷۰ نویسه باشد.', after: 'متن پیامک حداکثر ۷۰ نویسه باشد و با «لغو۱۱» تمام شود.' },
];

export const layers = [
  { id: 'org', name: 'سازمان', desc: 'برای همه اعمال می‌شود', skills: 4, rules: 6, memories: 12 },
  { id: 'unit', name: 'واحد', desc: 'تنظیمات سازمان را دقیق‌تر می‌کند', skills: 11, rules: 5, memories: 23 },
  { id: 'person', name: 'فرد', desc: 'ترجیح‌های شخصی شما', skills: 2, rules: 1, memories: 8 },
];

/* ───────────── Settings ───────────── */

export const models = [
  { value: 'Opus 5.5', label: 'Opus 5.5', hint: 'دقیق‌ترین' },
  { value: 'Sonnet 5.5', label: 'Sonnet 5.5', hint: 'متعادل' },
  { value: 'Haiku 5.5', label: 'Haiku 5.5', hint: 'سریع و ارزان' },
];

export const devices = [
  { id: 'dv1', name: 'لپ‌تاپ نیما', os: 'Windows 11', status: 'online' as const, mode: 'محلی', running: 2, last: 'همین حالا', current: true },
  { id: 'dv2', name: 'سیستم واحد مالی', os: 'Windows 10', status: 'online' as const, mode: 'محلی', running: 0, last: '۱۰ دقیقه پیش', current: false },
  { id: 'dv3', name: 'فضای ابری سازمان', os: 'Cloud', status: 'online' as const, mode: 'ابری', running: 3, last: 'همین حالا', current: false },
  { id: 'dv4', name: 'مک‌بوک آرش', os: 'macOS 15', status: 'offline' as const, mode: 'محلی', running: 0, last: 'دیروز', current: false },
];

export const notifications = [
  { id: 'n1', title: 'تأیید لازم است', text: 'دستیار مارکتینگ می‌خواهد به ۸٬۴۰۰ نفر پیامک بفرستد', when: '۲۰ دقیقه پیش', tone: 'warning' as Tone, unread: true },
  { id: 'n2', title: 'ناهنجاری', text: 'فروش لوازم آشپزخانه ۳۱٪ افت کرده است', when: '۲ ساعت پیش', tone: 'danger' as Tone, unread: true },
  { id: 'n3', title: 'کار انجام شد', text: 'گزارش جریان نقدی مهرماه آماده است', when: 'امروز ۰۹:۱۲', tone: 'success' as Tone, unread: false },
  { id: 'n4', title: 'سقف بودجه', text: 'دستیار مارکتینگ به ۸۸٪ بودجهٔ ماهانه رسیده است', when: 'دیروز', tone: 'warning' as Tone, unread: false },
];

/* ───────────── Workspace filesystem ───────────── */

// The harness lives in one folder. Everything the user makes and everything the
// harness itself needs (dashboards, skills, rules…) is a file under this root.
export const workspace = { name: 'فروشگاه نیکان', path: 'D:\Nikan' };

export const folderPath: Record<string, string> = {
  reports: 'گزارش‌ها',
  finance: 'مالی',
  marketing: 'مارکتینگ',
  policies: 'سیاست‌ها و قراردادها',
};

export type SystemKind = 'dashboard' | 'skill' | 'rule' | 'automation' | 'agent' | 'memory';

export const systemFolders: { id: SystemKind; name: string; dir: string; href: string }[] = [
  { id: 'dashboard', name: 'داشبوردها', dir: '.harness/dashboards', href: '/dashboards' },
  { id: 'agent', name: 'ایجنت‌ها', dir: '.harness/agents', href: '/customize' },
  { id: 'skill', name: 'مهارت‌ها', dir: '.harness/skills', href: '/customize' },
  { id: 'rule', name: 'قوانین', dir: '.harness/rules', href: '/customize' },
  { id: 'automation', name: 'اتوماسیون‌ها', dir: '.harness/automations', href: '/customize' },
  { id: 'memory', name: 'دانش و حافظه', dir: '.harness/memory', href: '/customize' },
];

export type SystemFile = { id: string; name: string; file: string; kind: SystemKind; size: string; modified: string; by: string };

export const systemFiles: SystemFile[] = [
  ...dashboards.map((d, i) => ({ id: `sys-d${i}`, name: d.name, file: `${d.id}.dashboard.json`, kind: 'dashboard' as const, size: '۱۲ کیلوبایت', modified: d.updated, by: 'سیستم' })),
  ...agents.map((a) => ({ id: `sys-a-${a.id}`, name: a.name, file: `${a.id}.agent.yaml`, kind: 'agent' as const, size: '۳ کیلوبایت', modified: 'هفتهٔ پیش', by: a.manager })),
  ...skills.map((s) => ({ id: `sys-${s.id}`, name: s.name, file: `${s.id}.skill.md`, kind: 'skill' as const, size: '۴ کیلوبایت', modified: s.updated, by: 'نیما رستگار' })),
  { id: 'sys-rules', name: 'قوانین و مجوزها', file: 'rules.yaml', kind: 'rule', size: '۲ کیلوبایت', modified: '۱۴ مهر', by: 'نیما رستگار' },
  ...automations.map((a) => ({ id: `sys-${a.id}`, name: a.name, file: `${a.id}.automation.yaml`, kind: 'automation' as const, size: '۱ کیلوبایت', modified: a.lastRun, by: 'سیستم' })),
  { id: 'sys-profile', name: 'پروفایل کسب‌وکار', file: 'profile.md', kind: 'memory', size: '۲ کیلوبایت', modified: '۵ مهر', by: 'نیما رستگار' },
  { id: 'sys-memory', name: 'حافظه', file: 'memory.md', kind: 'memory', size: '۶ کیلوبایت', modified: 'امروز', by: 'سیستم' },
  { id: 'sys-decisions', name: 'تصمیم‌ها', file: 'decisions.md', kind: 'memory', size: '۳ کیلوبایت', modified: '۲۴ مهر', by: 'سیستم' },
];
