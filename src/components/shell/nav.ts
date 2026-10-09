import {
  ChartBarIcon,
  ChatsCircleIcon,
  CheckSquareOffsetIcon,
  FolderSimpleIcon,
  HouseIcon,
  SlidersHorizontalIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react';

export type NavItem = { href: string; label: string; icon: Icon; badge?: number };

// Seven destinations. Goals live inside Dashboards; automations and knowledge
// inside Customize; connections inside Settings, which opens from the footer.
export const navItems: NavItem[] = [
  { href: '/', label: 'خانه', icon: HouseIcon },
  { href: '/tasks', label: 'کارها', icon: ChatsCircleIcon },
  { href: '/approvals', label: 'صندوق تأیید', icon: CheckSquareOffsetIcon, badge: 5 },
  { href: '/files', label: 'فایل‌ها', icon: FolderSimpleIcon },
  { href: '/dashboards', label: 'داشبوردها و اهداف', icon: ChartBarIcon },
  { href: '/team', label: 'تیم', icon: UsersThreeIcon },
  { href: '/customize', label: 'سفارشی‌سازی', icon: SlidersHorizontalIcon },
];
