import { redirect } from "next/navigation";

/** /welcome is deprecated — users land directly on the feed. */
export default function WelcomePage() {
  redirect("/");
}
