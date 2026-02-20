'use client';

import React, { useState } from 'react';
import Header from '../components/dashboard/Header';
import Dashboard from '../components/dashboard/Dashboard';
import AssessmentWizard from '../components/wizard/AssessmentWizard';
import { Case } from '@/types/dashboard';
import { useRouter } from 'next/navigation';

interface DashboardClientProps {
    initialCases: Case[];
    user: { name: string; role: string } | null;
}

export default function DashboardClient({ initialCases, user }: DashboardClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [cases, setCases] = useState<Case[]>(initialCases);
    const router = useRouter();

    const handleSelectCase = (id: string) => {
        const selectedCase = cases.find(c => c.id === id);
        if (!selectedCase) return;

        // Navigate to the new case detail page for all cases
        router.push(`/cases/${id}`);
    };

    const handleOpenWizard = () => {
        setIsWizardOpen(true);
    };

    const handleCompleteWizard = (newCase: Case) => {
        setCases([newCase, ...cases]);
        setIsWizardOpen(false);
        // Navigate to the new case detail page
        router.push(`/cases/${newCase.id}`);
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
                    cases={cases}
                    onSelectCase={handleSelectCase}
                    searchTerm={searchTerm}
                />
            </main>
            
            <AssessmentWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onComplete={handleCompleteWizard}
                initialData={null}
                onSaveDraft={(data) => console.log('Draft saved:', data)}
            />
        </div>
    );
}
