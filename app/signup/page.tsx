import { SignupScreen } from "@/components/auth/signup-screen";

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next } = await searchParams;

  return <SignupScreen nextPath={next} />;
}
