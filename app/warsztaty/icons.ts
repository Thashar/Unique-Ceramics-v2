// Mapa nazw ikon z panelu na komponenty lucide. Zwykły moduł (bez "use client"),
// żeby mogła z niej korzystać zarówno strona serwerowa, jak i komponenty klienckie.
import {
  type LucideIcon,
  Cake, Gem, Building2, Leaf, Users, Gift,
  Package, GraduationCap, Flame, Camera, Coffee, CheckCircle,
  Star, Heart, Palette, Globe, Music, Award, Scissors,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Cake, Gem, Building2, Leaf, Users, Gift,
  Package, GraduationCap, Flame, Camera, Coffee, CheckCircle,
  Star, Heart, Palette, Globe, Music, Award, Scissors,
};

export { CheckCircle, Leaf };
