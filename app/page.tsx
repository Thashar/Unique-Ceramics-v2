import type { Metadata } from "next";
import HomePage, { homeMetadata } from "./HomePage";

export const revalidate = 3600;

// Treść i metadane siedzą w `HomePage` – ten sam komponent renderuje `/en`
export const metadata: Metadata = homeMetadata("pl");

export default function Home() {
  return <HomePage locale="pl" />;
}
