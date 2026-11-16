import { Brain, Dumbbell, Droplet, Hand, Heart, Leaf, PawPrint, Scissors, Smile, Sparkles, Star, Stethoscope, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import type { StampIcon as StampIconName } from "@/types";

/** El diente, que lucide no tiene: el mismo trazo que los demás íconos. */
function Tooth(props: LucideProps) {
  const { size = 24, strokeWidth = 2, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M7 3c-2.2 0-4 1.8-4 4.2 0 2.3.9 3.6 1.6 5.5.6 1.7.7 3.9 1.5 6.1.4 1.1 1.8 1.3 2.3.1.7-1.6 1-3.9 2.6-3.9s1.9 2.3 2.6 3.9c.5 1.2 1.9 1 2.3-.1.8-2.2.9-4.4 1.5-6.1.7-1.9 1.6-3.2 1.6-5.5C21 4.8 19.2 3 17 3c-1.8 0-2.7 1-5 1S8.8 3 7 3z" />
    </svg>
  );
}

const ICONS: Record<StampIconName, ComponentType<LucideProps>> = {
  tooth: Tooth,
  brain: Brain,
  heart: Heart,
  leaf: Leaf,
  scissors: Scissors,
  sparkles: Sparkles,
  hand: Hand,
  droplet: Droplet,
  smile: Smile,
  star: Star,
  paw: PawPrint,
  stethoscope: Stethoscope,
  dumbbell: Dumbbell,
};

/** El sello de la tarjeta de fidelización (spec 052): el ícono que eligió el negocio. */
export function StampIcon({ icon, ...props }: { icon: StampIconName } & LucideProps) {
  const Icon = ICONS[icon] ?? Star;
  return <Icon aria-hidden {...props} />;
}
