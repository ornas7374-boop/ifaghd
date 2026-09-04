export interface AnimalType {
  id: number;
  key: string;
  name_ar: string;
  sort_order: number;
}

export interface ProductionRecord {
  id: number;
  year: number;
  month: number;
  animal_type_id: number;
  births: number;
  deaths: number;
  feed_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionRecordWithType extends ProductionRecord {
  animal_type_key: string;
  animal_type_name: string;
}

export interface RecordInput {
  year: number;
  month: number;
  animalTypeId: number;
  births: number;
  deaths: number;
  feedQuantity: number;
}
