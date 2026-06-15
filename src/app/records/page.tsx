import { PlayerRecordsPage } from "@/components/records/player-records-page";
import { SiteHeader } from "@/components/site-header";

export default function RecordsPage() {
  return (
    <main className="min-h-screen text-[#101827]">
      <SiteHeader />
      <PlayerRecordsPage />
    </main>
  );
}
