'use client';

import React, { useState } from 'react';
import { Case } from '@/types/dashboard';
import ReportView from '@/app/components/report/ReportView';
import { useRouter } from 'next/navigation';
import { saveSurvey } from '@/lib/surveys/actions';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, AlertTriangle, Info, FileText, List } from 'lucide-react';

interface CaseDetailViewProps {
    caseData: Case;
}

const CaseDetailView: React.FC<CaseDetailViewProps> = ({ caseData }) => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'details' | 'ahr'>('details');
    const { aiReport } = caseData.mlData || {};
    const summary = aiReport?.Summary;

    const handleUpdateCase = async (updatedCase: Case) => {
        try {
            const result = await saveSurvey(updatedCase);
            if (result.error) {
                toast.error(`Failed to save: ${result.error}`);
            } else {
                toast.success('Report updated successfully');
                router.refresh();
            }
        } catch (error) {
            console.error(error);
            toast.error('An unexpected error occurred');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <div style={{
                background: '#fff',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{
                    maxWidth: '1280px',
                    margin: '0 auto',
                    padding: '0 24px',
                    height: '64px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => router.push('/')}
                            style={{
                                padding: '8px',
                                borderRadius: '50%',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                                Case {caseData.id}
                            </h1>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                                {caseData.address}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                        <button
                            onClick={() => setActiveTab('details')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: activeTab === 'details' ? '#fff' : 'transparent',
                                color: activeTab === 'details' ? '#0f172a' : '#64748b',
                                boxShadow: activeTab === 'details' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <List size={16} />
                            Case Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('ahr')}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: activeTab === 'ahr' ? '#fff' : 'transparent',
                                color: activeTab === 'ahr' ? '#0f172a' : '#64748b',
                                boxShadow: activeTab === 'ahr' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <FileText size={16} />
                            AHR Report
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
                {activeTab === 'details' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Applicant Info */}
                        <div style={{
                            background: '#fff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '24px' }}>
                                Applicant Information
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Name
                                    </label>
                                    <p style={{ fontSize: '15px', fontWeight: '500', color: '#0f172a', margin: 0 }}>
                                        {caseData.applicantName || 'Not specified'}
                                    </p>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Contact
                                    </label>
                                    <p style={{ fontSize: '15px', fontWeight: '500', color: '#0f172a', margin: 0 }}>
                                        {caseData.phoneNumber || 'Not specified'}
                                    </p>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Assessment Date
                                    </label>
                                    <p style={{ fontSize: '15px', fontWeight: '500', color: '#0f172a', margin: 0 }}>
                                        {caseData.assessmentDate ? new Date(caseData.assessmentDate).toLocaleDateString() : 'Not set'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* AI Analysis Summary */}
                        {summary ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                                {/* Strengths */}
                                <div style={{
                                    background: '#fff',
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    padding: '24px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <CheckCircle size={20} color="#10b981" />
                                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Strengths</h2>
                                    </div>
                                    <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#475569', whiteSpace: 'pre-line' }}>
                                        {summary.Strengths || 'No strengths identified.'}
                                    </div>
                                </div>

                                {/* Weaknesses */}
                                <div style={{
                                    background: '#fff',
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    padding: '24px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <AlertTriangle size={20} color="#f59e0b" />
                                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Weaknesses</h2>
                                    </div>
                                    <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#475569', whiteSpace: 'pre-line' }}>
                                        {summary.Weaknesses || 'No weaknesses identified.'}
                                    </div>
                                </div>

                                {/* Recommendation */}
                                {summary.Recommendation && (
                                    <div style={{
                                        gridColumn: '1 / -1',
                                        background: '#eff6ff',
                                        borderRadius: '16px',
                                        border: '1px solid #dbeafe',
                                        padding: '24px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <Info size={20} color="#2563eb" />
                                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e40af', margin: 0 }}>Recommendation</h2>
                                        </div>
                                        <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#1e3a8a', margin: 0 }}>
                                            {summary.Recommendation}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{
                                background: '#fff',
                                borderRadius: '16px',
                                border: '1px dashed #cbd5e1',
                                padding: '48px',
                                textAlign: 'center',
                                color: '#94a3b8'
                            }}>
                                <Info size={32} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                <p style={{ fontSize: '14px', fontWeight: '500' }}>No AI analysis data available for this case.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ahr' && (
                    <div style={{
                        background: '#fff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <ReportView
                            caseData={caseData}
                            onBack={() => setActiveTab('details')}
                            onUpdateCase={handleUpdateCase}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CaseDetailView;
