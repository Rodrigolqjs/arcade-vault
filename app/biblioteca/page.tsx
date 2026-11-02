import Library from "@/components/Library";
import { getGames } from "@/lib/data/games";
export default async function BibliotecaPage() {
  return <Library games={await getGames()} />;
}
