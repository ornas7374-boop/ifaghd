import { listAnimalTypes, listRecords } from "@/lib/queries";
import { mergeYears } from "@/lib/years";
import { RecordsClient } from "./RecordsClient";

export default async function RecordsPage() {
  const animalTypes = listAnimalTypes();
  const records = listRecords();
  const years = mergeYears(records.map((r) => r.year));

  return <RecordsClient initialAnimalTypes={animalTypes} initialRecords={records} years={years} />;
}
