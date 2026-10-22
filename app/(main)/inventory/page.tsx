'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber, type InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import type { InventoryProduct } from '@/types/inventory';
import { storageService } from '@/services/storageService';

const emptyProduct: InventoryProduct = { id: '', name: '', category: '', buyPrice: 0, sellPrice: 0, stock: 0, minStock: 0, image: '' };
const currency = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const formatCurrency = (value: number) => `COP$ ${currency.format(value)}`;

const InventoryPage = () => {
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [draft, setDraft] = useState<InventoryProduct>(emptyProduct);
    const [categories, setCategories] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [globalFilter, setGlobalFilter] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [deleteVisible, setDeleteVisible] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const toast = useRef<Toast>(null);

    useEffect(() => {
        setProducts(storageService.getProducts());
        setCategories(storageService.getCategories());
    }, []);

    const filteredProducts = useMemo(() => {
        const search = globalFilter.trim().toLocaleLowerCase('es');
        return products.filter((product) => {
            const matchesCategory = !categoryFilter || product.category === categoryFilter;
            const matchesSearch = !search || [product.name, product.category, product.id].some((value) => value.toLocaleLowerCase('es').includes(search));
            return matchesCategory && matchesSearch;
        });
    }, [products, categoryFilter, globalFilter]);

    const openNew = () => {
        setDraft({ ...emptyProduct });
        setSubmitted(false);
        setDialogVisible(true);
    };

    const openEdit = (product: InventoryProduct) => {
        setDraft({ ...product });
        setSubmitted(false);
        setDialogVisible(true);
    };

    const saveProduct = () => {
        setSubmitted(true);
        const valid = draft.name.trim() && draft.category && draft.buyPrice >= 0 && draft.sellPrice >= 0 && Number.isInteger(draft.stock) && draft.stock >= 0 && Number.isInteger(draft.minStock) && draft.minStock >= 0;
        if (!valid) return;

        const product: InventoryProduct = {
            ...draft,
            id: draft.id || (typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `product-${Date.now()}`),
            name: draft.name.trim(),
            image: draft.image.trim()
        };

        try {
            setProducts(storageService.saveProduct(product));
            setCategories(storageService.getCategories());
            setDialogVisible(false);
            toast.current?.show({ severity: 'success', summary: 'Producto guardado', detail: `${product.name} se guardó correctamente.`, life: 3000 });
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: 'No se pudo guardar', detail: error instanceof Error ? error.message : 'Error de almacenamiento.', life: 5000 });
        }
    };

    const deleteProduct = () => {
        try {
            setProducts(storageService.deleteProduct(draft.id));
            setDeleteVisible(false);
            toast.current?.show({ severity: 'success', summary: 'Producto eliminado', detail: `${draft.name} ya no está en el inventario.`, life: 3000 });
        } catch (error) {
            toast.current?.show({ severity: 'error', summary: 'No se pudo eliminar', detail: error instanceof Error ? error.message : 'Error de almacenamiento.', life: 5000 });
        }
    };

    const stockTemplate = (product: InventoryProduct) => {
        const severity = product.stock === 0 ? 'danger' : product.stock <= product.minStock ? 'warning' : 'success';
        const label = product.stock === 0 ? 'Agotado' : product.stock <= product.minStock ? 'Stock bajo' : 'Disponible';
        return <Tag value={`${label} · ${product.stock}`} severity={severity} />;
    };

    const actionsTemplate = (product: InventoryProduct) => (
        <div className="flex gap-2">
            <Button icon="pi pi-pencil" rounded text severity="secondary" aria-label={`Editar ${product.name}`} tooltip="Editar producto" onClick={() => openEdit(product)} />
            <Button icon="pi pi-trash" rounded text severity="danger" aria-label={`Eliminar ${product.name}`} tooltip="Eliminar producto" onClick={() => { setDraft(product); setDeleteVisible(true); }} />
        </div>
    );

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" text severity="secondary" onClick={() => setDialogVisible(false)} />
            <Button label="Guardar" icon="pi pi-check" onClick={saveProduct} />
        </div>
    );

    return (
        <div className="grid">
            <Toast ref={toast} />
            <div className="col-12 flex flex-column md:flex-row md:align-items-end md:justify-content-between gap-3 mb-2">
                <div><span className="text-primary font-semibold text-sm">CATÁLOGO</span><h1 className="text-900 text-3xl font-semibold mt-2 mb-1">Inventario</h1><p className="text-600 m-0">Administra productos, precios y disponibilidad</p></div>
                <Button label="Nuevo producto" icon="pi pi-plus" onClick={openNew} />
            </div>
            <div className="col-12">
                <div className="card">
                    <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4">
                        <div className="flex flex-column sm:flex-row gap-2 w-full md:w-auto">
                            <span className="p-input-icon-left"><i className="pi pi-search" /><InputText value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder="Buscar productos" /></span>
                            <Dropdown value={categoryFilter} options={[{ label: 'Todas las categorías', value: null }, ...categories.map((category) => ({ label: category, value: category }))]} onChange={(event) => setCategoryFilter(event.value)} placeholder="Categoría" className="w-full sm:w-14rem" />
                        </div>
                        <span className="text-600 text-sm">{filteredProducts.length} productos</span>
                    </div>
                    <DataTable value={filteredProducts} dataKey="id" paginator rows={10} rowsPerPageOptions={[5, 10, 25]} sortField="name" sortOrder={1} responsiveLayout="scroll" emptyMessage="No se encontraron productos.">
                        <Column field="name" header="Producto" sortable />
                        <Column field="category" header="Categoría" sortable />
                        <Column field="buyPrice" header="Precio compra" sortable body={(product: InventoryProduct) => formatCurrency(product.buyPrice)} />
                        <Column field="sellPrice" header="Precio venta" sortable body={(product: InventoryProduct) => formatCurrency(product.sellPrice)} />
                        <Column field="stock" header="Stock" sortable body={stockTemplate} />
                        <Column header="Acciones" body={actionsTemplate} style={{ width: '8rem' }} />
                    </DataTable>
                </div>
            </div>

            <Dialog visible={dialogVisible} header={draft.id ? 'Editar producto' : 'Nuevo producto'} modal className="p-fluid" style={{ width: 'min(42rem, 94vw)' }} footer={dialogFooter} onHide={() => setDialogVisible(false)}>
                <div className="grid mt-1">
                    <div className="field col-12 md:col-7">
                        <label htmlFor="product-name">Nombre *</label>
                        <InputText id="product-name" autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={submitted && !draft.name.trim() ? 'p-invalid' : ''} maxLength={100} />
                        {submitted && !draft.name.trim() && <small className="p-error">El nombre es obligatorio.</small>}
                    </div>
                    <div className="field col-12 md:col-5">
                        <label htmlFor="product-category">Categoría *</label>
                        <Dropdown id="product-category" value={draft.category} options={categories} onChange={(event) => setDraft({ ...draft, category: event.value })} placeholder="Selecciona" className={submitted && !draft.category ? 'p-invalid' : ''} />
                        {submitted && !draft.category && <small className="p-error">Selecciona una categoría.</small>}
                    </div>
                    <div className="field col-12 md:col-6">
                        <label htmlFor="buy-price">Precio de compra *</label>
                        <InputNumber id="buy-price" value={draft.buyPrice} onValueChange={(event: InputNumberValueChangeEvent) => setDraft({ ...draft, buyPrice: event.value ?? 0 })} prefix="COP$ " locale="es-CO" min={0} minFractionDigits={0} maxFractionDigits={0} />
                    </div>
                    <div className="field col-12 md:col-6">
                        <label htmlFor="sell-price">Precio de venta *</label>
                        <InputNumber id="sell-price" value={draft.sellPrice} onValueChange={(event: InputNumberValueChangeEvent) => setDraft({ ...draft, sellPrice: event.value ?? 0 })} prefix="COP$ " locale="es-CO" min={0} minFractionDigits={0} maxFractionDigits={0} />
                    </div>
                    <div className="field col-12 md:col-6">
                        <label htmlFor="product-stock">Existencias *</label>
                        <InputNumber id="product-stock" value={draft.stock} onValueChange={(event: InputNumberValueChangeEvent) => setDraft({ ...draft, stock: event.value ?? 0 })} min={0} minFractionDigits={0} maxFractionDigits={0} showButtons />
                    </div>
                    <div className="field col-12 md:col-6">
                        <label htmlFor="min-stock">Avisar al llegar a *</label>
                        <InputNumber id="min-stock" value={draft.minStock} onValueChange={(event: InputNumberValueChangeEvent) => setDraft({ ...draft, minStock: event.value ?? 0 })} min={0} minFractionDigits={0} maxFractionDigits={0} showButtons />
                    </div>
                    <div className="field col-12">
                        <label htmlFor="product-image">Referencia de imagen</label>
                        <InputText id="product-image" value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} placeholder="Opcional" maxLength={200} />
                    </div>
                </div>
            </Dialog>

            <Dialog visible={deleteVisible} header="Eliminar producto" modal style={{ width: 'min(28rem, 94vw)' }} onHide={() => setDeleteVisible(false)} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" text severity="secondary" onClick={() => setDeleteVisible(false)} /><Button label="Eliminar" icon="pi pi-trash" severity="danger" onClick={deleteProduct} /></div>}>
                <p>¿Quieres eliminar <strong>{draft.name}</strong> del inventario? Esta acción no se puede deshacer.</p>
            </Dialog>
        </div>
    );
};

export default InventoryPage;
