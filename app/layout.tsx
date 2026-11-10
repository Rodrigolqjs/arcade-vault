import type { Metadata } from "next";
import {
  Courier_Prime,
  JetBrains_Mono,
  Press_Start_2P,
} from "next/font/google";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import { getCurrentPlayer } from "@/lib/data/auth";
import "./globals.css";
const pressStart2P = Press_Start_2P({
  variable: "--font-press-start-2p",
  weight: "400",
  subsets: ["latin"],
});
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description: "Juega y compite por la puntuación más alta.",
};
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Session in the Nav (SPEC 15): makes every page dynamic, most already were.
  const player = await getCurrentPlayer();
  return (
    <html
      lang="es"
      className={`${pressStart2P.variable} ${jetBrainsMono.variable} ${courierPrime.variable}`}
    >
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <div className="av-root">
          <Nav player={player} />
          <main className="av-main">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
