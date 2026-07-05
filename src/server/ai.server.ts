import { getInventorySnapshot as getSnapshot } from "@/lib/data.functions";

export async function getInventorySnapshot() {
  try {
    return await getSnapshot();
  } catch {
    return null;
  }
}
