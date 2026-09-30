import {
  Smartphone,
  Battery,
  Camera,
  Headphones,
  Watch,
  Cpu,
  Wifi,
  Usb,
  Monitor,
  Gamepad2,
  Wrench,
  Package,
  CircuitBoard,
  Zap,
  Boxes,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  battery: Battery,
  camera: Camera,
  headphones: Headphones,
  watch: Watch,
  cpu: Cpu,
  wifi: Wifi,
  usb: Usb,
  display: Monitor,
  monitor: Monitor,
  gamepad: Gamepad2,
  tools: Wrench,
  wrench: Wrench,
  package: Package,
  board: CircuitBoard,
  charger: Zap,
  accessories: Boxes,
};

const FALLBACK = Package;

/** Renders a category's stored lucide icon key, with a safe fallback. */
export function CategoryIcon({
  name,
  className,
  size = 24,
}: {
  name: string | null | undefined;
  className?: string;
  size?: number;
}) {
  const Icon = (name ? ICONS[name.toLowerCase()] : undefined) ?? FALLBACK;
  return <Icon className={className} size={size} strokeWidth={1.6} aria-hidden="true" />;
}
