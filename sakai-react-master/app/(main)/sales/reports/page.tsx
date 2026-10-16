'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Sale } from '@/types/inventory';
import { storageService } from '@/services/storageService';

const currency = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const formatCurrency = (value: number) => `COP$ ${currency.format(value)}`;
const dateTime = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
const invoiceNumber = (sale: Sale) => sale.id.slice(0, 8).toUpperCase();

const ReportsPage = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

    useEffect(() => setSales(storageService.getSales()), []);

    const filteredSales = useMemo(() => sales.filter((sale) => {
        const saleTime = new Date(sale.date).getTime();
        const start = dateFrom ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()).getTime() : Number.NEGATIVE_INFINITY;
        const end = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999).getTime() : Number.POSITIVE_INFINITY;
        return saleTime >= start && saleTime <= end;
    }).sort((left, right) => Date.parse(right.date) - Date.parse(left.date)), [sales, dateFrom, dateTo]);

    const filteredTotal = filteredSales.reduce((total, sale) => total + sale.total, 0);
    const detailSubtotal = selectedSale?.subtotal ?? selectedSale?.items.reduce((total, item) => total + item.subtotal, 0) ?? 0;

    return (
        <div className="grid">
            <div className="col-12 mb-2">
                <span className="text-primary font-semibold text-sm">ANÁLISIS</span>
                <h1 className="text-900 text-3xl font-semibold mt-2 mb-1">Reportes y facturas</h1>
                <p className="text-600 m-0">Consulta transacciones, filtra periodos y revisa comprobantes</p>
            </div>

            <div className="col-12">
                <div className="card">
                    <div className="grid align-items-end">
                        <div className="field col-12 sm:col-5 md:col-4 mb-0">
                            <label htmlFor="date-from">Desde</label>
                            <Calendar id="date-from" value={dateFrom} onChange={(event) => setDateFrom(event.value instanceof Date ? event.value : null)} dateFormat="dd/mm/yy" showIcon maxDate={dateTo ?? undefined} placeholder="Fecha inicial" className="w-full" />
                        </div>
                        <div className="field col-12 sm:col-5 md:col-4 mb-0">
                            <label htmlFor="date-to">Hasta</label>
                            <Calendar id="date-to" value={dateTo} onChange={(event) => setDateTo(event.value instanceof Date ? event.value : null)} dateFormat="dd/mm/yy" showIcon minDate={dateFrom ?? undefined} placeholder="Fecha final" className="w-full" />
                        </div>
                        <div className="col-12 sm:col-2 md:col-4 flex justify-content-end mb-0">
                            <Button label="Limpiar fechas" icon="pi pi-filter-slash" text severity="secondary" onClick={() => { setDateFrom(null); setDateTo(null); }} disabled={!dateFrom && !dateTo} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-6">
                <div className="card mb-0">
                    <span className="block text-600 font-medium mb-3">Facturas en el periodo</span>
                    <div className="text-900 font-semibold text-2xl">{filteredSales.length.toLocaleString('es-ES')}</div>
                </div>
            </div>
            <div className="col-12 md:col-6">
                <div className="card mb-0">
                    <span className="block text-600 font-medium mb-3">Ventas en el periodo</span>
                    <div className="text-900 font-semibold text-2xl">{formatCurrency(filteredTotal)}</div>
                </div>
            </div>

            <div className="col-12">
                <div className="card">
                    <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-2 mb-3">
                        <div><h2 className="text-900 text-xl font-semibold m-0">Historial de transacciones</h2><span className="text-500 text-sm">Selecciona una factura para consultar el comprobante</span></div>
                        <span className="text-600 text-sm">{filteredSales.length} resultados</span>
                    </div>
                    <DataTable value={filteredSales} dataKey="id" paginator rows={10} rowsPerPageOptions={[5, 10, 25]} responsiveLayout="scroll" emptyMessage="No hay facturas para el periodo seleccionado." onRowClick={(event) => setSelectedSale(event.data as Sale)} rowClassName={() => ({ 'cursor-pointer': true })}>
                        <Column header="N.º de factura" body={(sale: Sale) => <span className="font-semibold text-primary">{invoiceNumber(sale)}</span>} sortable sortField="id" />
                        <Column field="date" header="Fecha y hora" body={(sale: Sale) => dateTime.format(new Date(sale.date))} sortable sortField="date" />
                        <Column field="customerName" header="Cliente" sortable />
                        <Column header="Artículos" body={(sale: Sale) => sale.items.reduce((quantity, item) => quantity + item.quantity, 0)} />
                        <Column field="total" header="Total" body={(sale: Sale) => <span className="font-semibold">{formatCurrency(sale.total)}</span>} sortable />
                        <Column header="" body={(sale: Sale) => <Button icon="pi pi-eye" rounded text aria-label={`Ver factura ${invoiceNumber(sale)}`} tooltip="Ver factura" onClick={(event) => { event.stopPropagation(); setSelectedSale(sale); }} />} style={{ width: '4rem' }} />
                    </DataTable>
                </div>
            </div>

            <Dialog visible={selectedSale !== null} header={selectedSale ? `Factura ${invoiceNumber(selectedSale)}` : 'Factura'} modal className="invoice-print" style={{ width: 'min(42rem, 94vw)' }} onHide={() => setSelectedSale(null)} footer={<div className="flex justify-content-between"><Button label="Imprimir" icon="pi pi-print" text onClick={() => window.print()} /><Button label="Cerrar" icon="pi pi-times" onClick={() => setSelectedSale(null)} /></div>}>
                {selectedSale && <div className="p-2">
                    <div className="flex flex-column sm:flex-row sm:justify-content-between gap-3 border-bottom-1 surface-border pb-4 mb-4">
                        <div><span className="text-500 text-sm">NÚMERO DE FACTURA</span><div className="text-900 font-semibold text-2xl mt-1">{invoiceNumber(selectedSale)}</div></div>
                        <div className="sm:text-right"><span className="text-500 text-sm">FECHA DE EMISIÓN</span><div className="text-900 mt-1">{dateTime.format(new Date(selectedSale.date))}</div></div>
                    </div>
                    <div className="mb-4"><span className="text-500 text-sm">CLIENTE</span><div className="text-900 font-medium mt-1">{selectedSale.customerName}</div></div>
                    <DataTable value={selectedSale.items} dataKey="productId" responsiveLayout="scroll" size="small">
                        <Column field="productName" header="Producto" />
                        <Column field="quantity" header="Cant." style={{ width: '5rem' }} />
                        <Column field="unitPrice" header="Precio unitario" body={(item) => formatCurrency(item.unitPrice)} />
                        <Column field="subtotal" header="Importe" body={(item) => formatCurrency(item.subtotal)} />
                    </DataTable>
                    <div className="ml-auto mt-4" style={{ maxWidth: '18rem' }}>
                        <div className="flex justify-content-between text-600 mb-2"><span>Subtotal</span><span>{formatCurrency(detailSubtotal)}</span></div>
                        {(selectedSale.tax ?? 0) > 0 && <div className="flex justify-content-between text-600 mb-2"><span>Impuesto ({Math.round((selectedSale.taxRate ?? 0) * 100)} %)</span><span>{formatCurrency(selectedSale.tax ?? 0)}</span></div>}
                        <div className="flex justify-content-between text-900 font-semibold text-xl border-top-1 surface-border pt-3"><span>Total</span><span>{formatCurrency(selectedSale.total)}</span></div>
                    </div>
                    <div className="text-center text-500 text-sm mt-5">Gracias por su compra</div>
                </div>}
            </Dialog>
        </div>
    );
};

export default ReportsPage;
