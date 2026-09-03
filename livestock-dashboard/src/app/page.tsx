import { listAnimalTypes, listRecords, listYears } from "@/lib/queries";
import { mergeYears } from "@/lib/years";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const animalTypes = listAnimalTypes();
  const records = listRecords();
  const years = mergeYears(listYears());

  return <DashboardClient animalTypes={animalTypes} records={records} years={years} />;
}
