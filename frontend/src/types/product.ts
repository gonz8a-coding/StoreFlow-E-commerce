export interface ProductItem {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  created_at: string;
  updated_at: string;
}
