import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import type { ComponentProps } from "react";

type FontAwesome6Name = ComponentProps<typeof FontAwesome6>["name"];

const CATEGORY_ICON_NAMES: Readonly<Record<string, FontAwesome6Name>> = {
  armchair: "couch",
  bed: "bed",
  blocks: "cubes-stacked",
  "cup-saucer": "mug-saucer",
  cpu: "microchip",
  footprints: "shoe-prints",
  lightbulb: "lightbulb",
  package: "box",
  wrench: "wrench",
};

export function resolveCategoryIconName(icon: string | null): FontAwesome6Name {
  if (icon === null) return "shapes";
  return CATEGORY_ICON_NAMES[icon] ?? "shapes";
}

export function CategoryIcon({
  color,
  icon,
  size = 28,
}: Readonly<{ color: string; icon: string | null; size?: number }>) {
  const name = resolveCategoryIconName(icon);

  return (
    <FontAwesome6
      accessible={false}
      color={color}
      name={name}
      size={size}
      testID={`category-icon-${name}`}
    />
  );
}
