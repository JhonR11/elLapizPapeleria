'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { Chart } from 'primereact/chart';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import type { ChartData, ChartOptions } from 'chart.js';
import type { InventoryProduct, Sale } from '@/types/inventory';
import { storageService } from '@/services/storageService';

const currency = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const formatCurrency = (value: number) => `COP$ ${currency.format(value)}`;

const Dashboard = () => {
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);

    useEffect(() => {
        setProducts(storageService.getProducts());
        setSales(storageService.getSales());
    }, []);

    const categories = storageService.getCategories();
    const today = new Date();
    const todaySales = sales.filter((sale) => new Date(sale.date).toDateString() === today.toDateString());
    const lowStock = products.filter((product) => product.stock <= product.minStock);
    const inventoryValue = products.reduce((total, product) => total + product.buyPrice * product.stock, 0);

    const salesChartData = useMemo<ChartData<'bar'>>(() => {
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            return date;
        });
        return {
            labels: days.map((date) => date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Ventas',
                data: days.map((date) => sales.filter((sale) => new Date(sale.date).toDateString() === date.toDateString()).reduce((total, sale) => total + sale.total, 0)),
                backgroundColor: '#1d8f78',
                borderRadius: 5,
                maxBarThickness: 34
            }]
        };
    }, [sales]);

    const invoiceChartData = useMemo<ChartData<'line'>>(() => {
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            return date;
        });
        return {
            labels: days.map((date) => date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Facturas emitidas',
                data: days.map((date) => sales.filter((sale) => new Date(sale.date).toDateString() === date.toDateString()).length),
                borderColor: '#4586b5',
                backgroundColor: 'rgba(69, 134, 181, 0.16)',
                pointBackgroundColor: '#4586b5',
                pointRadius: 4,
                fill: true,
                tension: 0.35
            }]
        };
    }, [sales]);

    const categoryChartData = useMemo<ChartData<'doughnut'>>(() => ({
        labels: categories,
        datasets: [{
            data: categories.map((category) => products.filter((product) => product.category === category).length),
            backgroundColor: ['#1d8f78', '#e7a83e', '#4586b5', '#d56c55'],
            hoverBackgroundColor: ['#167762', '#d2932c', '#34749f', '#c15740'],
            borderWidth: 0
        }]
    }), [categories, products]);

    const chartOptions: ChartOptions = {
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: 'var(--text-color)' } } },
        scales: {
            x: { ticks: { color: 'var(--text-color-secondary)' }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: 'var(--text-color-secondary)' }, grid: { color: 'var(--surface-border)' } }
        }
    };

    const metrics = [
        { label: 'Productos', value: products.length.toLocaleString('es-ES'), icon: 'pi-box', color: '#1d8f78', note: 'referencias activas' },
        { label: 'Valor del inventario', value: formatCurrency(inventoryValue), icon: 'pi-wallet', color: '#4586b5', note: 'a precio de compra' },
        { label: 'Ventas de hoy', value: formatCurrency(todaySales.reduce((total, sale) => total + sale.total, 0)), icon: 'pi-chart-line', color: '#d56c55', note: `${todaySales.length} facturas emitidas` },
        { label: 'Facturas emitidas', value: sales.length.toLocaleString('es-ES'), icon: 'pi-receipt', color: '#bd8a2d', note: 'histórico completo' }
    ];

    return (
        <div className="grid">
            <div className="col-12 flex flex-column md:flex-row md:align-items-end md:justify-content-between gap-3 mb-2">
                <div>
                    <span className="text-primary font-semibold text-sm">OPERACIONES</span>
                    <h1 className="text-900 text-3xl font-semibold mt-2 mb-1">Panel de control</h1>
                    <p className="text-600 m-0">Resumen de inventario y actividad comercial</p>
                </div>
                <Link href="/sales/pos" className="p-button p-component no-underline"><i className="pi pi-plus mr-2" />Nueva venta</Link>
            </div>

            {metrics.map((metric) => (
                <div className="col-12 sm:col-6 xl:col-3" key={metric.label}>
                    <div className="card mb-0 h-full">
                        <div className="flex justify-content-between align-items-start gap-3">
                            <div className="min-w-0">
                                <span className="block text-600 font-medium mb-3">{metric.label}</span>
                                <div className="text-900 font-semibold text-2xl" style={{ overflowWrap: 'anywhere' }}>{metric.value}</div>
                                <span className="block text-500 text-sm mt-2">{metric.note}</span>
                            </div>
                            <span className="flex align-items-center justify-content-center border-round" style={{ color: metric.color, background: `${metric.color}1c`, width: '2.75rem', height: '2.75rem', flexShrink: 0 }}>
                                <i className={`pi ${metric.icon} text-xl`} />
                            </span>
                        </div>
                    </div>
                </div>
            ))}

            <div className="col-12 xl:col-8">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-4">
                        <div><h2 className="text-900 text-xl font-semibold m-0">Ventas recientes</h2><span className="text-500 text-sm">Ingresos de los últimos siete días</span></div>
                        <i className="pi pi-chart-bar text-primary text-xl" />
                    </div>
                    <div style={{ height: '18rem' }}><Chart type="bar" data={salesChartData} options={chartOptions} /></div>
                </div>
            </div>
            <div className="col-12 xl:col-4">
                <div className="card h-full">
                    <h2 className="text-900 text-xl font-semibold mt-0 mb-1">Productos por categoría</h2>
                    <span className="text-500 text-sm">Distribución del catálogo</span>
                    <div className="flex align-items-center justify-content-center mt-3" style={{ height: '18rem' }}>
                        {products.length > 0 ? <Chart type="doughnut" data={categoryChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-color)', usePointStyle: true, padding: 18 } } } }} /> : <span className="text-500">No hay productos registrados</span>}
                    </div>
                </div>
            </div>

            <div className="col-12">
                <div className="card">
                    <div className="mb-4">
                        <h2 className="text-900 text-xl font-semibold m-0">Facturación diaria</h2>
                        <span className="text-500 text-sm">Cantidad de facturas emitidas durante los últimos siete días</span>
                    </div>
                    <div style={{ height: '16rem' }}><Chart type="line" data={invoiceChartData} options={chartOptions} /></div>
                </div>
            </div>

            <div className="col-12">
                <div className="card">
                    <div className="flex align-items-center justify-content-between gap-3 mb-3">
                        <div><h2 className="text-900 text-xl font-semibold m-0">Alertas de stock</h2><span className="text-500 text-sm">Productos en o por debajo del mínimo configurado</span></div>
                        <Link href="/inventory" className="text-primary font-medium no-underline">Ver inventario <i className="pi pi-arrow-right ml-1" /></Link>
                    </div>
                    <DataTable value={lowStock} dataKey="id" rows={5} paginator responsiveLayout="scroll" emptyMessage="No hay productos con stock bajo.">
                        <Column field="name" header="Producto" sortable />
                        <Column field="category" header="Categoría" sortable />
                        <Column field="stock" header="Disponible" sortable body={(product: InventoryProduct) => <span className="font-semibold">{product.stock}</span>} />
                        <Column field="minStock" header="Mínimo" sortable />
                        <Column header="Estado" body={(product: InventoryProduct) => <Tag value={product.stock === 0 ? 'Agotado' : 'Reponer'} severity={product.stock === 0 ? 'danger' : 'warning'} />} />
                    </DataTable>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
