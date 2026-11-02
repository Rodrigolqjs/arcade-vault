// Catalog types and UI constants. The games themselves live in public.games (see lib/data/games.ts).
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: GameColor;
}
export const CATS = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
] as const satisfies readonly ["TODOS", ...Category[]];
export type CategoryFilter = (typeof CATS)[number];
