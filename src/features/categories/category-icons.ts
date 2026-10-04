import {
  Activity,
  Apple,
  Baby,
  Brain,
  Briefcase,
  Camera,
  Car,
  Dumbbell,
  GraduationCap,
  Heart,
  HeartPulse,
  MessageCircle,
  Music,
  PawPrint,
  Scissors,
  Shapes,
  Smile,
  Sparkles,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Íconos que el super admin puede elegir para una categoría (se guarda la clave). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  brain: Brain,
  "message-circle": MessageCircle,
  smile: Smile,
  apple: Apple,
  activity: Activity,
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  heart: Heart,
  baby: Baby,
  dumbbell: Dumbbell,
  "graduation-cap": GraduationCap,
  music: Music,
  sparkles: Sparkles,
  scissors: Scissors,
  "paw-print": PawPrint,
  camera: Camera,
  car: Car,
  wrench: Wrench,
  briefcase: Briefcase,
  shapes: Shapes,
};

export function getCategoryIcon(icon: string): LucideIcon {
  return CATEGORY_ICONS[icon] ?? Shapes;
}
