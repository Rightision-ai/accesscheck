'use client';

import React, { useState, useMemo } from 'react';
import { Filter, Grid as GridIcon, List, FileText, Shield, Clock } from 'lucide-react';
import CaseCard from './CaseCard';
import { Case } from '@/types/dashboard';
import { useRouter } from 'next/navigation';

interface DashboardProps {
    user: any;
    cases: Case[];
    onSelectCase: (id: string) => void;
    searchTerm: string;
}

const Dashboard: React.FC<DashboardProps> = ({ user, cases, onSelectCase, searchTerm }) => {
    const [activeFilter, setActiveFilter] = useState('All Cases');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    // Calculate statistics
    const stats = useMemo(() => {
        const total = cases.length;
        const finalized = cases.filter(c => c.status === 'Completed').length;
        const inProgress = cases.filter(c => c.status === 'Pending').length;
        const drafts = cases.filter(c => c.status === 'Draft').length;

        return { total, finalized, inProgress, drafts };
    }, [cases]);

    // Filter and sort cases
    const filteredCases = useMemo(() => {
        let filtered = cases;

        // Apply status filter
        if (activeFilter === 'Finalized') {
            filtered = filtered.filter(c => c.status === 'Completed');
        } else if (activeFilter === 'In Progress') {
            filtered = filtered.filter(c => c.status === 'Pending');
        } else if (activeFilter === 'Drafts') {
            filtered = filtered.filter(c => c.status === 'Draft');
        }

        // Apply search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                c.applicantName?.toLowerCase().includes(lowerTerm) ||
                c.address?.toLowerCase().includes(lowerTerm) ||
                c.id?.toLowerCase().includes(lowerTerm) ||
                c.city?.toLowerCase().includes(lowerTerm)
            );
        }

        // Apply sort
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                case 'oldest':
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                default:
                    return 0;
            }
        });

        return filtered;
    }, [cases, activeFilter, searchTerm, sortBy]);

    const filters = ['All Cases', 'Finalized', 'In Progress', 'Drafts'];

    return (
        <div style={{
            padding: '32px 48px',
            background: 'linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%)',
            minHeight: 'calc(100vh - 80px)'
        }}>
            {/* Header Section */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    color: '#0f172a',
                    marginBottom: '8px',
                    letterSpacing: '-0.5px'
                }}>
                    Assessment Registry
                </h1>
                <p style={{
                    fontSize: '15px',
                    color: '#64748b',
                    fontWeight: '500'
                }}>
                    Official record of accessibility assessments and property evaluations
                </p>
            </div>

            {/* Statistics Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px',
                marginBottom: '32px'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '24px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                    }}>
                        <FileText size={24} color="#fff" />
                        <span style={{
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.9)',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            Total Assessments
                        </span>
                    </div>
                    <div style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        color: '#fff',
                        lineHeight: '1'
                    }}>
                        {stats.total}
                    </div>
                </div>

                <div style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '2px solid #10b981',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                    }}>
                        <Shield size={24} color="#10b981" />
                        <span style={{
                            fontSize: '13px',
                            color: '#64748b',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            Finalized Reports
                        </span>
                    </div>
                    <div style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        color: '#10b981',
                        lineHeight: '1'
                    }}>
                        {stats.finalized}
                    </div>
                </div>

                <div style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '2px solid #f59e0b',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                    }}>
                        <Clock size={24} color="#f59e0b" />
                        <span style={{
                            fontSize: '13px',
                            color: '#64748b',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            In Progress
                        </span>
                    </div>
                    <div style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        color: '#f59e0b',
                        lineHeight: '1'
                    }}>
                        {stats.inProgress}
                    </div>
                </div>

                <div style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '2px solid #94a3b8',
                    boxShadow: '0 4px 12px rgba(148, 163, 184, 0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                    }}>
                        <FileText size={24} color="#94a3b8" />
                        <span style={{
                            fontSize: '13px',
                            color: '#64748b',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            Draft Queue
                        </span>
                    </div>
                    <div style={{
                        fontSize: '36px',
                        fontWeight: '800',
                        color: '#94a3b8',
                        lineHeight: '1'
                    }}>
                        {stats.drafts}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div style={{
                background: '#fff',
                padding: '20px 24px',
                borderRadius: '16px',
                marginBottom: '24px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                {/* Filters */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    background: '#f8fafc',
                    padding: '4px',
                    borderRadius: '10px'
                }}>
                    {filters.map(filter => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '700',
                                background: activeFilter === filter ? '#6366f1' : 'transparent',
                                color: activeFilter === filter ? '#fff' : '#64748b',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Sort & View Mode */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            padding: '8px 32px 8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            fontSize: '13px',
                            color: '#475569',
                            outline: 'none',
                            cursor: 'pointer',
                            fontWeight: '600',
                            background: '#fff'
                        }}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>

                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: '#f8fafc',
                        padding: '4px',
                        borderRadius: '8px'
                    }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '8px',
                                borderRadius: '6px',
                                background: viewMode === 'grid' ? '#fff' : 'transparent',
                                color: viewMode === 'grid' ? '#6366f1' : '#94a3b8',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            <GridIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '8px',
                                borderRadius: '6px',
                                background: viewMode === 'list' ? '#fff' : 'transparent',
                                color: viewMode === 'list' ? '#6366f1' : '#94a3b8',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {filteredCases.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '80px 0',
                    color: '#94a3b8'
                }}>
                    <Filter size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No cases found</h3>
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>Try adjusting your filters or search criteria</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '24px'
                }}>
                    {filteredCases.map(caseData => (
                        <CaseCard key={caseData.id} caseData={caseData} onClick={onSelectCase} />
                    ))}
                </div>
            ) : (
                <div style={{
                    background: '#fff',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{
                                background: '#f8fafc',
                                textAlign: 'left',
                                color: '#64748b',
                                fontSize: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Case ID</th>
                                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Property</th>
                                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Applicant</th>
                                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Date</th>
                                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Status</th>
                                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCases.map((c) => (
                                <tr
                                    key={c.id}
                                    style={{
                                        borderTop: '1px solid #f1f5f9',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <td style={{
                                        padding: '16px 24px',
                                        fontWeight: '700',
                                        color: '#6366f1'
                                    }}>
                                        {c.id}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontWeight: '600', color: '#0f172a' }}>
                                            {c.address || 'Address Pending'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                            {c.city || 'Location TBC'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#475569', fontWeight: '500' }}>
                                        {c.applicantName || 'Anonymous'}
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#64748b' }}>
                                        {c.assessmentDate ? new Date(c.assessmentDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            background: c.status === 'Completed' ? '#ecfdf5' :
                                                c.status === 'Draft' ? '#f8fafc' : '#fff7ed',
                                            color: c.status === 'Completed' ? '#059669' :
                                                c.status === 'Draft' ? '#64748b' : '#ea580c',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.3px'
                                        }}>
                                            <div style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: 'currentColor'
                                            }} />
                                            {c.status === 'Completed' ? 'Finalized' :
                                                c.status === 'Pending' ? 'In Progress' : c.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <button
                                            onClick={() => onSelectCase(c.id)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                background: '#6366f1',
                                                color: '#fff',
                                                fontSize: '13px',
                                                fontWeight: '700',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            Open Record
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
