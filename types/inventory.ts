export interface InventoryProduct {
    id: string;
    name: string;
    category: string;
    buyPrice: number;
    sellPrice: number;
    stock: number;
    minStock: number;
    image: string;
}

export interface SaleItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface Sale {
    id: string;
    date: string;
    customerName: string;
    items: SaleItem[];
    subtotal?: number;
    taxRate?: number;
    tax?: number;
    total: number;
}

export interface SaleRequestItem {
    productId: string;
    quantity: number;
}

export interface CreateSaleInput {
    customerName: string;
    items: SaleRequestItem[];
    taxRate?: number;
}