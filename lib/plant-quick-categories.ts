import type { LucideIcon } from "lucide-react";
import { Leaf, LeafyGreen, Flower2, Sprout, Flower } from "lucide-react";

/**
 * Najčastejšie hľadané kategórie rastlín pre quick-filter chips na home feed.
 * Klik nastaví vyhľadávací dotaz (q) na daný výraz.
 */
export const PLANT_QUICK_CATEGORIES: {
  id: string;
  label: string;
  /** Hodnota pre search query (plant_name ILIKE) */
  searchQuery: string;
  icon: LucideIcon;
}[] = [
  {
    id: "monstera",
    label: "Monstera",
    searchQuery: "Monstera",
    icon: Leaf,
  },
  {
    id: "philodendron",
    label: "Philodendron",
    searchQuery: "Philodendron",
    icon: LeafyGreen,
  },
  {
    id: "hoya",
    label: "Hoya",
    searchQuery: "Hoya",
    icon: Flower2,
  },
  {
    id: "pilea",
    label: "Pilea",
    searchQuery: "Pilea",
    icon: Sprout,
  },
  {
    id: "sukulenty",
    label: "Sukulenty",
    searchQuery: "sukulent",
    icon: Leaf,
  },
  {
    id: "orchidey",
    label: "Orchidey",
    searchQuery: "orchidea",
    icon: Flower,
  },
];
