import type { InventoryProduct } from '@/types/inventory';

export const INVENTORY_CATEGORIES = ['Electrónica', 'Hogar', 'Oficina', 'Accesorios'] as const;

export const INITIAL_PRODUCTS: InventoryProduct[] = [
    { id: 'product-001', name: 'Auriculares inalámbricos', category: 'Electrónica', buyPrice: 112000, sellPrice: 189900, stock: 18, minStock: 5, image: 'headphones' },
    { id: 'product-002', name: 'Teclado mecánico', category: 'Electrónica', buyPrice: 185000, sellPrice: 299900, stock: 12, minStock: 4, image: 'keyboard' },
    { id: 'product-003', name: 'Ratón ergonómico', category: 'Electrónica', buyPrice: 64000, sellPrice: 109900, stock: 3, minStock: 5, image: 'mouse' },
    { id: 'product-004', name: 'Lámpara de escritorio', category: 'Hogar', buyPrice: 78000, sellPrice: 129900, stock: 9, minStock: 3, image: 'desk-lamp' },
    { id: 'product-005', name: 'Botella térmica', category: 'Hogar', buyPrice: 42000, sellPrice: 69900, stock: 24, minStock: 6, image: 'bottle' },
    { id: 'product-006', name: 'Cuaderno de tapa dura', category: 'Oficina', buyPrice: 8500, sellPrice: 14900, stock: 32, minStock: 10, image: 'notebook' },
    { id: 'product-007', name: 'Bolígrafo de tinta gel', category: 'Oficina', buyPrice: 2500, sellPrice: 4900, stock: 7, minStock: 12, image: 'pen' },
    { id: 'product-008', name: 'Soporte para portátil', category: 'Accesorios', buyPrice: 65000, sellPrice: 109900, stock: 14, minStock: 4, image: 'laptop-stand' },
    { id: 'product-009', name: 'Cable USB-C trenzado', category: 'Accesorios', buyPrice: 9500, sellPrice: 19900, stock: 2, minStock: 8, image: 'usb-c-cable' },
    { id: 'product-010', name: 'Alfombrilla de escritorio', category: 'Accesorios', buyPrice: 32000, sellPrice: 54900, stock: 16, minStock: 5, image: 'desk-mat' }
];