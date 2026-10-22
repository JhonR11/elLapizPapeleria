import type { CreateSaleInput, InventoryProduct, Sale, SaleItem } from '@/types/inventory';
import { INITIAL_PRODUCTS, INVENTORY_CATEGORIES } from './inventorySeed';

const PRODUCTS_KEY = 'sakai-inventory-products-v1';
const SALES_KEY = 'sakai-inventory-sales-v1';
const PRODUCT_PRICE_MIGRATION_KEY = 'sakai-inventory-cop-price-x1000-v1';
const PRODUCT_PRICE_MIGRATION_PENDING_KEY = `${PRODUCT_PRICE_MIGRATION_KEY}-pending`;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNonNegativeNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isProduct = (value: unknown): value is InventoryProduct =>
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.category) &&
    isNonNegativeNumber(value.buyPrice) &&
    isNonNegativeNumber(value.sellPrice) &&
    Number.isInteger(value.stock) &&
    isNonNegativeNumber(value.stock) &&
    Number.isInteger(value.minStock) &&
    isNonNegativeNumber(value.minStock) &&
    typeof value.image === 'string';

const isSaleItem = (value: unknown): value is SaleItem =>
    isRecord(value) &&
    isNonEmptyString(value.productId) &&
    isNonEmptyString(value.productName) &&
    Number.isInteger(value.quantity) &&
    typeof value.quantity === 'number' &&
    value.quantity > 0 &&
    isNonNegativeNumber(value.unitPrice) &&
    isNonNegativeNumber(value.subtotal);

const isSale = (value: unknown): value is Sale =>
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    typeof value.date === 'string' &&
    Number.isFinite(Date.parse(value.date)) &&
    typeof value.customerName === 'string' &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every(isSaleItem) &&
    (value.subtotal === undefined || isNonNegativeNumber(value.subtotal)) &&
    (value.taxRate === undefined || (typeof value.taxRate === 'number' && Number.isFinite(value.taxRate) && value.taxRate >= 0 && value.taxRate <= 1)) &&
    (value.tax === undefined || isNonNegativeNumber(value.tax)) &&
    isNonNegativeNumber(value.total);

const getStorage = (): Storage => {
    if (typeof window === 'undefined') {
        throw new Error('El almacenamiento solo está disponible en el navegador.');
    }

    try {
        return window.localStorage;
    } catch {
        throw new Error('No se pudo acceder al almacenamiento local del navegador.');
    }
};

const readCollection = <T>(key: string, isItem: (value: unknown) => value is T, initialValue: () => T[]): T[] => {
    const storage = getStorage();
    const raw = storage.getItem(key);

    if (raw === null) {
        const initial = initialValue();
        storage.setItem(key, JSON.stringify(initial));
        return initial;
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(isItem)) {
            return parsed;
        }
    } catch {
        // Recover malformed persisted JSON with the provided initial collection.
    }

    const recovered = initialValue();
    storage.setItem(key, JSON.stringify(recovered));
    return recovered;
};

const writeCollection = <T>(key: string, value: T[]): void => {
    getStorage().setItem(key, JSON.stringify(value));
};

const migrateStoredProductPricesToCop = (storage: Storage): void => {
    if (storage.getItem(PRODUCT_PRICE_MIGRATION_KEY) === 'done') {
        return;
    }

    const pending = storage.getItem(PRODUCT_PRICE_MIGRATION_PENDING_KEY);
    if (pending !== null) {
        try {
            const staged: unknown = JSON.parse(pending);
            if (Array.isArray(staged) && staged.every(isProduct)) {
                storage.setItem(PRODUCTS_KEY, pending);
                storage.setItem(PRODUCT_PRICE_MIGRATION_KEY, 'done');
                storage.removeItem(PRODUCT_PRICE_MIGRATION_PENDING_KEY);
                return;
            }
        } catch {
            storage.removeItem(PRODUCT_PRICE_MIGRATION_PENDING_KEY);
        }
        storage.removeItem(PRODUCT_PRICE_MIGRATION_PENDING_KEY);
    }

    const rawProducts = storage.getItem(PRODUCTS_KEY);
    if (rawProducts !== null) {
        try {
            const parsed: unknown = JSON.parse(rawProducts);
            if (Array.isArray(parsed) && parsed.every(isProduct)) {
                const converted = parsed.map((product) => ({
                    ...product,
                    buyPrice: product.buyPrice * 1000,
                    sellPrice: product.sellPrice * 1000
                }));

                if (!converted.every(isProduct)) {
                    throw new Error('Un precio supera el límite permitido para la conversión a COP.');
                }

                const serialized = JSON.stringify(converted);
                storage.setItem(PRODUCT_PRICE_MIGRATION_PENDING_KEY, serialized);
                storage.setItem(PRODUCTS_KEY, serialized);
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('límite permitido')) {
                throw error;
            }
        }
    }

    storage.setItem(PRODUCT_PRICE_MIGRATION_KEY, 'done');
    storage.removeItem(PRODUCT_PRICE_MIGRATION_PENDING_KEY);
};

const createId = (): string => {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    return `sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const validateProduct = (product: InventoryProduct): void => {
    if (!isProduct(product)) {
        throw new Error('El producto contiene campos inválidos o cantidades negativas.');
    }
}

export const storageService = {
    getCategories(): string[] {
        return [...INVENTORY_CATEGORIES];
    },

    getProducts(): InventoryProduct[] {
        const storage = getStorage();
        migrateStoredProductPricesToCop(storage);
        return readCollection(PRODUCTS_KEY, isProduct, () => INITIAL_PRODUCTS.map((product) => ({ ...product })));
    },

    getSales(): Sale[] {
        return readCollection(SALES_KEY, isSale, () => []);
    },

    saveProduct(product: InventoryProduct): InventoryProduct[] {
        validateProduct(product);
        const products = this.getProducts();
        const index = products.findIndex((item) => item.id === product.id);

        if (index === -1) {
            products.push({ ...product });
        } else {
            products[index] = { ...product };
        }

        writeCollection(PRODUCTS_KEY, products);
        return products;
    },

    deleteProduct(productId: string): InventoryProduct[] {
        if (!isNonEmptyString(productId)) {
            throw new Error('Se requiere un identificador de producto válido.');
        }

        const products = this.getProducts().filter((product) => product.id !== productId);
        writeCollection(PRODUCTS_KEY, products);
        return products;
    },

    createSale(input: CreateSaleInput): Sale {
        if (!isNonEmptyString(input.customerName) || !Array.isArray(input.items) || input.items.length === 0) {
            throw new Error('La venta requiere un cliente y al menos un producto.');
        }
        const taxRate = input.taxRate ?? 0;
        if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
            throw new Error('La tasa de impuesto debe estar entre 0 y 100 %.');
        }

        const quantities = new Map<string, number>();
        for (const item of input.items) {
            if (!isNonEmptyString(item.productId) || !Number.isInteger(item.quantity) || item.quantity <= 0) {
                throw new Error('Cada artículo debe tener un producto válido y una cantidad entera mayor que cero.');
            }

            quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
        }

        const storage = getStorage();
        const products = this.getProducts();
        const sales = this.getSales();
        const saleItems: SaleItem[] = [];

        quantities.forEach((quantity, productId) => {
            const product = products.find((item) => item.id === productId);
            if (!product) {
                throw new Error(`No existe el producto ${productId}.`);
            }
            if (quantity > product.stock) {
                throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}.`);
            }

            saleItems.push({
                productId: product.id,
                productName: product.name,
                quantity,
                unitPrice: product.sellPrice,
                subtotal: Number((quantity * product.sellPrice).toFixed(2))
            });
        });

        const subtotal = Number(saleItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
        const tax = Number((subtotal * taxRate).toFixed(2));
        const sale: Sale = {
            id: createId(),
            date: new Date().toISOString(),
            customerName: input.customerName.trim(),
            items: saleItems,
            subtotal,
            taxRate,
            tax,
            total: Number((subtotal + tax).toFixed(2))
        };

        for (const item of saleItems) {
            const product = products.find((candidate) => candidate.id === item.productId)!;
            product.stock -= item.quantity;
        }

        const previousProducts = storage.getItem(PRODUCTS_KEY);
        const previousSales = storage.getItem(SALES_KEY);
        try {
            storage.setItem(PRODUCTS_KEY, JSON.stringify(products));
            storage.setItem(SALES_KEY, JSON.stringify([...sales, sale]));
        } catch {
            try {
                if (previousProducts === null) storage.removeItem(PRODUCTS_KEY);
                else storage.setItem(PRODUCTS_KEY, previousProducts);
                if (previousSales === null) storage.removeItem(SALES_KEY);
                else storage.setItem(SALES_KEY, previousSales);
            } catch {
                throw new Error('No se pudo guardar la venta y tampoco restaurar el almacenamiento anterior.');
            }

            throw new Error('No se pudo guardar la venta; el inventario se restauró sin cambios.');
        }

        return sale;
    }
};