import { createFileRoute } from "@tanstack/react-router";
import { BirthdayExperience } from "@/components/birthday/experience";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <BirthdayExperience />;
}
