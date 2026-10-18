import "server-only";
import { adminClient } from "./supabase";
import { validatePriceBook } from "./pricing";
export async function loadPriceBook() {
  const { data, error } = await adminClient()
    .from("price_books")
    .select("book")
    .eq("id", true)
    .single();
  if (error || !data)
    throw Error("Unable to load shared pricing. Please try again.");
  return validatePriceBook(data.book);
}
