'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Header from '../components/dashboard/Header';
import Dashboard from '../components/dashboard/Dashboard';
import AssessmentWizard from '../components/wizard/AssessmentWizard';
import { Case } from '@/types/dashboard';
import { useRouter } from 'next/navigation';
import { saveSurveyClient } from '@/lib/surveys/client';
import { toast } from 'sonner';

interface DashboardClientProps {
    initialCases: Case[];
    user: { name: string; role: string } | null;
}

export default function DashboardClient({ initialCases, user }: DashboardClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardInitialData, setWizardInitialData] = useState<Partial<Case> | null>(null);
    const [cases, setCases] = useState<Case[]>(initialCases);
    const router = useRouter();

    const handleSelectCase = (id: string) => {
        const selectedCase = cases.find(c => c.id === id);
        if (!selectedCase) return;

        if (selectedCase.status === 'Draft') {
            setWizardInitialData({
                id: selectedCase.id,
                ...(selectedCase.mlData?.wizardData || {}),
                evidence: selectedCase.evidence,
                photos: selectedCase.evidence || (selectedCase.mlData?.wizardData as any)?.photos,
            });
            setIsWizardOpen(true);
        } else {
            router.push(`/cases/${id}`);
        }
    };

    const handleOpenWizard = () => {
        setWizardInitialData(null);
        setIsWizardOpen(true);
    };

    const handleCompleteWizard = async (newCase: Case) => {
        setIsWizardOpen(false);
        try {
            const result = await saveSurveyClient(newCase);
            if (result.error) {
                toast.error(`Failed to save: ${result.error}`);
                return;
            }
            toast.success('Assessment saved successfully');
            const realId = (result.id ?? newCase.id).toString();
            setCases(prev => {
                const exists = prev.find(c => c.id === realId);
                if (exists) return prev.map(c => c.id === realId ? { ...newCase, id: realId } : c);
                return [{ ...newCase, id: realId }, ...prev];
            });
            router.push(`/cases/${realId}`);
        } catch (error) {
            console.error(error);
            toast.error('An unexpected error occurred');
        }
    };

    return (
        <div className="app-container">
            <Header
                user={user}
                onOpenWizard={handleOpenWizard}
                onSearch={setSearchTerm}
            />
            <main className="min-h-[calc(100vh-80px)] pb-24 md:pb-0">
                <Dashboard
                    user={user}
                    cases={cases}
                    onSelectCase={handleSelectCase}
                    searchTerm={searchTerm}
                />
            </main>

            <AssessmentWizard
                isOpen={isWizardOpen}
                onClose={() => {
                    setIsWizardOpen(false);
                    setWizardInitialData(null);
                }}
                onComplete={handleCompleteWizard}
                initialData={wizardInitialData}
                onSaveDraft={(draftCase) => {
                    setCases(prev => {
                        const exists = prev.find(c => c.id === draftCase.id);
                        if (exists) return prev.map(c => c.id === draftCase.id ? draftCase : c);
                        return [draftCase, ...prev];
                    });
                    setIsWizardOpen(false);
                    setWizardInitialData(null);
                }}
            />

            {/* Mobile FAB: New Assessment */}
            <button
                onClick={handleOpenWizard}
                className="md:hidden fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full bg-primary text-white shadow-[0_4px_20px_rgba(99,102,241,0.4)] flex items-center justify-center cursor-pointer hover:bg-primary/90 active:scale-95 transition-all"
                aria-label="New Assessment"
            >
                <Plus size={28} strokeWidth={2.5} />
            </button>
        </div>
    );
}
