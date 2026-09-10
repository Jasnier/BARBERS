export type ServiceCategory = string;

export interface Service {
  service_id: string;
  name: string;
  description: string;
  price: number;
  duration_min: number;
  category: ServiceCategory;
  active: boolean;
}
