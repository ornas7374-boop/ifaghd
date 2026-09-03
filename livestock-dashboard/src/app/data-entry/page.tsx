import { listAnimalTypes, listRecords, listYears } from "@/lib/queries";
import { mergeYears } from "@/lib/years";
import { DataEntryClient } from "./DataEntryClient";

export const dynamic = "force-dynamic";

export default async function DataEntryPage() {
  const animalTypes = listAnimalTypes();
  const records = listRecords();
  const years = mergeYears(listYears());

  return (
    <DataEntryClient initialAnimalTypes={animalTypes} initialRecords={records} years={years} />
  );
}
