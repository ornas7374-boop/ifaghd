import { listAnimalTypes, listRecords } from "@/lib/queries";
import { mergeYears } from "@/lib/years";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const animalTypes = listAnimalTypes();
  const records = listRecords();
  const years = mergeYears(records.map((r) => r.year));

  return <ReportsClient animalTypes={animalTypes} records={records} years={years} />;
}
