import Marketplace from "@/components/marketplace";
import { requireChatGPTUser } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
import { catalog } from "@/lib/catalog";
import atlas from "@/data/atlas.json";
import sentinel from "@/data/sentinel.json";
import nexus from "@/data/nexus.json";
import vector from "@/data/vector.json";
import pulse from "@/data/pulse.json";
import prism from "@/data/prism.json";
export default async function Home() {
  await requireChatGPTUser("/");
  const results = [atlas, sentinel, nexus, vector, pulse, prism];
  return (
    <Marketplace
      initialModels={catalog.map((m, i) => ({
        ...m,
        metrics: results[i].metrics,
        curve: results[i].decisions.map((d) => d.equity),
        sample: true,
      }))}
    />
  );
}
