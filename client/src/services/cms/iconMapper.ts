/**
 * Icon Mapper
 * 
 * Maps icon names from CMS to Lucide React icons.
 * This allows CMS to specify icons by name without importing all icons.
 */

import {
  Home,
  Building2,
  Landmark,
  FileText,
  Wrench,
  Target,
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  UserPlus,
  Upload,
  TrendingUp,
  Megaphone,
  Video,
  Rocket,
  Users,
  UsersRound,
  Image,
  CheckCircle,
  Star,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon registry mapping icon names to Lucide components
 */
const iconRegistry: Record<string, LucideIcon> = {
  // Partner Types
  Home,
  Building2,
  Landmark,
  FileText,
  Wrench,

  // Value Proposition
  Target,
  Sparkles,
  ShieldCheck,
  LayoutDashboard,

  // How It Works
  UserPlus,
  Upload,
  TrendingUp,

  // Features
  Megaphone,
  Video,
  Rocket,
  Users,
  UsersRound,
  Image,

  // Metrics
  CheckCircle,
  Star,
};

/**
 * Get icon component by name
 * 
 * @param iconName - Name of the icon (e.g., 'Home', 'Building2')
 * @returns Lucide icon component or fallback icon
 * 
 * @example
 * ```tsx
 * const Icon = getIconByName('Home');
 * return <Icon className="w-6 h-6" />;
 * ```
 */
export function getIconByName(iconName: string): LucideIcon {
  const icon = iconRegistry[iconName];
  
  if (!icon) {
    console.warn(`Icon "${iconName}" not found in registry, using fallback`);
    return Home; // Fallback icon
  }

  return icon;
}

/**
 * Check if an icon name exists in the registry
 * 
 * @param iconName - Name of the icon to check
 * @returns true if icon exists, false otherwise
 */
export function hasIcon(iconName: string): boolean {
  return iconName in iconRegistry;
}

/**
 * Get all available icon names
 * 
 * @returns Array of all registered icon names
 */
export function getAvailableIcons(): string[] {
  return Object.keys(iconRegistry);
}

/**
 * Register a new icon
 * 
 * @param name - Name to register the icon under
 * @param icon - Lucide icon component
 * 
 * @example
 * ```tsx
 * import { Calendar } from 'lucide-react';
 * registerIcon('Calendar', Calendar);
 * ```
 */
export function registerIcon(name: string, icon: LucideIcon): void {
  iconRegistry[name] = icon;
}
