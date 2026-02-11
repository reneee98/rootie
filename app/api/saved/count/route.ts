import { getUser } from "@/lib/auth";
import { getSavedListingsCount } from "@/lib/data/listings";

export async function GET() {
  const user = await getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const count = await getSavedListingsCount(user.id);

  return Response.json(
    { count },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
