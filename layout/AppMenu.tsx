import React from 'react';
import AppMenuitem from './AppMenuitem';
import { MenuProvider } from './context/menucontext';
import { AppMenuItem } from '@/types';

const model: AppMenuItem[] = [
    {
        label: 'Home',
        items: [{ label: 'Panel de control', icon: 'pi pi-fw pi-home', to: '/' }]
    },
    {
        label: 'Gestión comercial',
        items: [
            { label: 'Inventario', icon: 'pi pi-fw pi-box', to: '/inventory' },
            { label: 'Punto de venta', icon: 'pi pi-fw pi-shopping-cart', to: '/sales/pos' },
            { label: 'Reportes y facturas', icon: 'pi pi-fw pi-file', to: '/sales/reports' }
        ]
    }
];

const AppMenu = () => (
    <MenuProvider>
        <ul className="layout-menu">
            {model.map((item, index) => <AppMenuitem item={item} root index={index} key={item.label} />)}
        </ul>
    </MenuProvider>
);

export default AppMenu;
