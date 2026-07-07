export interface OrderRow {
  id: string;
  customerName: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'SHIPPED';
  createdAt: string;
}

export interface LowStockAlert {
  productName: string;
  stock: number;
}
