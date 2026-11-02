import HallOfFame from "@/components/HallOfFame";
import { getGames } from "@/lib/data/games";
export default async function SalonPage() {
  return <HallOfFame games={await getGames()} />;
}
