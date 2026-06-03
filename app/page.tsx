import StudyAgent from "@/components/StudyAgent";
import { resolveApiKeyFromEnv } from "@/lib/constants";

export default function Home() {
  return <StudyAgent apiKeyFromEnv={resolveApiKeyFromEnv()} />;
}
