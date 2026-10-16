'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox, type CheckboxChangeEvent } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber, type InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import type { InventoryProduct, Sale } from '@/types/inventory';
import { storageService } from '@/services/storageService';

interface CartEntry {
    productId: string;
    quantity: number;
}

const TAX_RATE = 0.21;
const currency = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const formatCurrency = (value: number) => `COP$ ${currency.format(value)}`;

const PosPage = () => {
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [cart, setCart] = useState<CartEntry[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [customerName, setCustomerName] = useState('');
    const [taxEnabled, setTaxEnabled] = useState(false);
    const [receipt, setReceipt] = useState<Sale | null>(null);
    const toast = useRef<Toast>(null);

    useEffect(() => setProducts(storageService.getProducts()), []);

    const availableProducts = products.filter((product) => product.stock > 0);
    const cartLines = useMemo(() => cart.flatMap((entry) => {
        const product = products.find((candidate) => candidate.id === entry.productId);
        return product ? [{ ...entry, product, subtotal: entry.quantity * product.sellPrice }] : [];
    }), [cart, products]);
    const subtotal = cartLines.reduce((sum, line) => sum + line.subtotal, 0);
    const tax = taxEnabled ? Number((subtotal * TAX_RATE).toFixed(2)) : 0;
    const total = Number((subtotal + tax).toFixed(2));

    const addProduct = () => {
        const product = products.find((item) => item.id === selectedProductId);
        if (!product) {
            toast.current?.show({ severity: 'warn', summary: 'Selecciona un producto', detail: 'Elige un producto disponible para añadirlo al carrito.', life: 3000 });
            return;
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            toast.current?.show({ severity: 'warn', summary: 'Cantidad no válida', detail: 'La cantidad debe ser un entero mayor que cero.', life: 3000 });
            return;
        }
        const currentQuantity = cart.find((item) => item.productId === product.id)?.quantity ?? 0;
        if (currentQuantity + quantity > product.stock) {
            toast.current?.show({ severity: 'error', summary: 'Stock insuficiente', detail: `Quedan ${product.stock} unidades de ${product.name}.`, life: 4000 });
            return;
        }
        setCart((current) => {
            const existing = current.find((item) => item.productId === product.id);
            return existing
                ? current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item)
                : [...current, { productId: product.id, quantity }];
        });
        setSelectedProductId(null);
        setQuantity(1);
    };

    const updateQuantity = (productId: string, nextQuantity: number | null) => {
        if (nextQuantity === null || nextQuantity < 1 || !Number.isInteger(nextQuantity)) return;
        const product = products.find((item) => item.id === productId);
        if (!product || nextQuantity > product.stock) {
            toast.current?.show({ severity: 'error', summary: 'Stock insuficiente', detail: `Disponible: ${product?.stock ?? 0}.`, life: 3000 });
            return;
        }
        setCart((current) => current.map((item) => item.productId === productId ? { ...item, quantity: nextQuantity } : item));
    };

    const finishSale = () => {
        if (!customerName.trim()) {
            toast.current?.show({ severity: 'warn', summary: 'Falta el cliente', detail: 'Escribe el nombre del cliente para emitir la factura.', life: 3500 });
            return;
        }
        if (cart.length === 0) {
            toast.current?.show({ severity: 'warn', summary: 'Carrito vacío', detail: 'Añade al menos un producto antes de cobrar.', life: 3500 });
            return;
        }

        try {
            const sale = storageService.createSale({
                customerName: customerName.trim(),
                items: cart.map(({ productId, quantity: itemQuantity }) => ({ productId, quantity: itemQuantity })),
                taxRate: taxEnabled ? TAX_RATE : 0
            });
            setProducts(storageService.getProducts());
            setCart([]);
            setCustomerName('');
            setReceipt(sale);
            toast.current?.show({ severity: 'success', summary: 'Venta completada', detail: `Factura ${sale.id.slice(0, 8).toUpperCase()} emitida.`, life: 3000 });
        } catch (error) {
            setProducts(storageService.getProducts());
            toast.current?.show({ severity: 'error', summary: 'No se pudo completar', detail: error instanceof Error ? error.message : 'Error al guardar la venta.', life: 5000 });
        }
    };

    const removeLine = (productId: string) => setCart((current) => current.filter((item) => item.productId !== productId));
    const receiptDate = receipt ? new Date(receipt.date).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '';

    return (
        <div className="grid">
            <Toast ref={toast} />
            <div className="col-12 mb-2">
                <span className="text-primary font-semibold text-sm">VENTAS</span>
                <h1 className="text-900 text-3xl font-semibold mt-2 mb-1">Punto de venta</h1>
                <p className="text-600 m-0">Prepara el pedido, verifica existencias y emite la factura</p>
            </div>

            <div className="col-12 xl:col-8">
                <div className="card">
                    <h2 className="text-900 text-xl font-semibold mt-0 mb-4">Añadir productos</h2>
                    <div className="grid align-items-end">
                        <div className="field col-12 md:col-7 mb-0">
                            <label htmlFor="pos-product">Buscar en el inventario</label>
                            <Dropdown id="pos-product" value={selectedProductId} options={availableProducts} optionLabel="name" optionValue="id" filter showClear onChange={(event) => setSelectedProductId(event.value)} placeholder="Escribe el nombre del producto" className="w-full" itemTemplate={(product: InventoryProduct) => <div className="flex justify-content-between gap-3"><span>{product.name} <small className="text-500">· {product.category}</small></span><span className="text-500">{formatCurrency(product.sellPrice)} · {product.stock} disp.</span></div>} valueTemplate={(product: InventoryProduct | null) => product ? product.name : <span className="text-500">Selecciona un producto</span>} />
                        </div>
                        <div className="field col-6 md:col-2 mb-0">
                            <label htmlFor="pos-quantity">Cantidad</label>
                            <InputNumber id="pos-quantity" value={quantity} onValueChange={(event: InputNumberValueChangeEvent) => setQuantity(event.value ?? 1)} min={1} maxFractionDigits={0} showButtons className="w-full" />
                        </div>
                        <div className="field col-6 md:col-3 mb-0">
                            <Button label="Añadir" icon="pi pi-plus" onClick={addProduct} className="w-full" />
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h2 className="text-900 text-xl font-semibold m-0">Detalle del pedido</h2>
                        <Tag value={`${cartLines.length} ${cartLines.length === 1 ? 'producto' : 'productos'}`} severity="info" />
                    </div>
                    <DataTable value={cartLines} dataKey="productId" responsiveLayout="scroll" emptyMessage="Añade productos para iniciar la venta.">
                        <Column header="Producto" body={(line: (typeof cartLines)[number]) => <div><span className="font-medium text-900">{line.product.name}</span><small className="block text-500 mt-1">{line.product.category}</small></div>} />
                        <Column header="Precio" body={(line: (typeof cartLines)[number]) => formatCurrency(line.product.sellPrice)} />
                        <Column header="Cantidad" body={(line: (typeof cartLines)[number]) => <InputNumber value={line.quantity} onValueChange={(event) => updateQuantity(line.productId, event.value ?? null)} min={1} max={line.product.stock} maxFractionDigits={0} showButtons inputStyle={{ width: '4rem' }} />} />
                        <Column header="Importe" body={(line: (typeof cartLines)[number]) => <span className="font-semibold">{formatCurrency(line.subtotal)}</span>} />
                        <Column header="" body={(line: (typeof cartLines)[number]) => <Button icon="pi pi-times" rounded text severity="danger" aria-label={`Quitar ${line.product.name}`} tooltip="Quitar del pedido" onClick={() => removeLine(line.productId)} />} style={{ width: '3.5rem' }} />
                    </DataTable>
                </div>
            </div>

            <div className="col-12 xl:col-4">
                <div className="card">
                    <h2 className="text-900 text-xl font-semibold mt-0 mb-4">Cobro</h2>
                    <div className="field">
                        <label htmlFor="customer-name">Nombre del cliente *</label>
                        <InputText id="customer-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Cliente mostrador" maxLength={120} />
                    </div>
                    <div className="flex align-items-center gap-2 border-bottom-1 surface-border pb-3 mb-3">
                        <Checkbox inputId="tax-enabled" checked={taxEnabled} onChange={(event: CheckboxChangeEvent) => setTaxEnabled(Boolean(event.checked))} />
                        <label htmlFor="tax-enabled" className="cursor-pointer">Aplicar impuesto (21 %)</label>
                    </div>
                    <div className="flex justify-content-between text-600 mb-3"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    {taxEnabled && <div className="flex justify-content-between text-600 mb-3"><span>Impuesto (21 %)</span><span>{formatCurrency(tax)}</span></div>}
                    <div className="flex justify-content-between align-items-center text-900 text-xl font-semibold mb-4"><span>Total</span><span>{formatCurrency(total)}</span></div>
                    <Button label="Finalizar venta" icon="pi pi-check" iconPos="right" onClick={finishSale} disabled={!cart.length} className="w-full" />
                    <p className="text-500 text-sm text-center mt-3 mb-0">Al cobrar, el inventario se actualizará automáticamente.</p>
                </div>
            </div>

            <Dialog visible={receipt !== null} header="Factura emitida" modal style={{ width: 'min(36rem, 94vw)' }} onHide={() => setReceipt(null)} footer={<div className="flex justify-content-end"><Button label="Listo" icon="pi pi-check" onClick={() => setReceipt(null)} /></div>}>
                {receipt && <div className="surface-ground p-4 border-round">
                    <div className="flex justify-content-between gap-3 border-bottom-1 surface-border pb-3 mb-3"><div><span className="text-500 text-sm">NÚMERO DE FACTURA</span><div className="text-900 font-semibold text-xl mt-1">{receipt.id.slice(0, 8).toUpperCase()}</div></div><div className="text-right"><span className="text-500 text-sm">FECHA</span><div className="text-900 mt-1">{receiptDate}</div></div></div>
                    <div className="mb-3"><span className="text-500 text-sm">CLIENTE</span><div className="text-900 font-medium mt-1">{receipt.customerName}</div></div>
                    {receipt.items.map((item) => <div className="flex justify-content-between gap-3 py-2 border-bottom-1 surface-border" key={item.productId}><span>{item.quantity} × {item.productName}</span><span>{formatCurrency(item.subtotal)}</span></div>)}
                    <div className="flex justify-content-between text-600 mt-3"><span>Subtotal</span><span>{formatCurrency(receipt.subtotal ?? receipt.total)}</span></div>
                    {(receipt.tax ?? 0) > 0 && <div className="flex justify-content-between text-600 mt-2"><span>Impuesto ({Math.round((receipt.taxRate ?? 0) * 100)} %)</span><span>{formatCurrency(receipt.tax ?? 0)}</span></div>}
                    <div className="flex justify-content-between text-900 font-semibold text-xl mt-3"><span>Total pagado</span><span>{formatCurrency(receipt.total)}</span></div>
                </div>}
            </Dialog>
        </div>
    );
};

export default PosPage;
