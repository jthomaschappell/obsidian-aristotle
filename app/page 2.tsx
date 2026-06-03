import StudyAgent from "@/components/StudyAgent";

export default function Home() {
  const apiKeyFromEnv = process.env.API_KEY ?? "";
  return <StudyAgent apiKeyFromEnv={apiKeyFromEnv} />;
}
