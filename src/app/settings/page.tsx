import { SettingsForm } from "@/components/settings/SettingsForm";

export default function SettingsPage() {
  const serverEnv = {
    host: process.env.TYPESENSE_HOST ?? null,
    port: process.env.TYPESENSE_PORT ?? null,
    protocol: process.env.TYPESENSE_PROTOCOL ?? null,
    hasApiKey: !!process.env.TYPESENSE_API_KEY,
  };

  return <SettingsForm serverEnv={serverEnv} />;
}
