import { Metadata } from 'next';
import Layout from '../../layout/layout';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const metadata: Metadata = {
    title: 'Papelería El Lápiz | Gestión comercial',
    description: 'Sistema de inventario, ventas y facturación de Papelería El Lápiz.',
    robots: { index: false, follow: false },
    viewport: { initialScale: 1, width: 'device-width' },
    openGraph: {
        type: 'website',
        title: 'Papelería El Lápiz',
        description: 'Sistema de inventario, ventas y facturación de Papelería El Lápiz.',
        ttl: 604800
    },
    icons: {
        icon: '/favicon.ico'
    }
};

export default function AppLayout({ children }: AppLayoutProps) {
    return <Layout>{children}</Layout>;
}
