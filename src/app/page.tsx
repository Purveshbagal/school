import { redirect } from "next/navigation";
import { getSession, getLandingPath } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  redirect((session && getLandingPath(session)) || "/login");
}
