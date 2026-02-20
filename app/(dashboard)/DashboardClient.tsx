'use client';

import React, { useState } from 'react';
import Header from '../components/dashboard/Header';
import Dashboard from '../components/dashboard/Dashboard';
import { Case } from '@/types/dashboard';
import { useRouter } from 'next/navigation';

interface DashboardClientProps {
    initialCases: Case[];
    user: { name: string; role: string } | null;
}

export default function DashboardClient({ initialCases, user }: DashboardClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const handleSelectCase = (id: string) => {
        const selectedCase = initialCases.find(c => c.id === id);
        if (!selectedCase) return;

        if (selectedCase.status === 'Draft') {
            router.push(`/assessments/new?id=${id}`);
        } else if (selectedCase.status === 'Completed') {
            router.push(`/assessments/${id}/report`);
        } else {
            router.push(`/assessments/${id}/validate`);
        }
    };

    const handleOpenWizard = () => {
        router.push('/assessments/new');
    };

    return (
        <div className="app-container">
            <Header
                user={user}
                onOpenWizard={handleOpenWizard}
                onSearch={setSearchTerm}
            />
            <main style={{ minHeight: 'calc(100vh - 80px)' }}>
                <Dashboard
                    user={user}
                    cases={initialCases}
                    onSelectCase={handleSelectCase}
                    searchTerm={searchTerm}
                />
            </main>
        </div>
    );
}
