'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, FileText, Shield, Clock } from 'lucide-react';
import { Case } from '@/types/dashboard';

interface CaseCardProps {
    caseData: Case;
    onClick: (id: string) => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ caseData, onClick }) => {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'Pending':
                return {
                    icon: Clock,
                    color: '#ea580c',
                    bg: '#fff7ed',
                    border: '#fed7aa',
                    label: 'In Progress'
                };
            case 'Completed':
                return {
                    icon: Shield,
                    color: '#059669',
                    bg: '#ecfdf5',
                    border: '#a7f3d0',
                    label: 'Finalized'
                };
            case 'Draft':
                return {
                    icon: FileText,
                    color: '#64748b',
                    bg: '#f8fafc',
                    border: '#e2e8f0',
                    label: 'Draft'
                };
            default:
                return {
                    icon: FileText,
                    color: '#64748b',
                    bg: '#f8fafc',
                    border: '#e2e8f0',
                    label: status
                };
        }
    };

    const statusConfig = getStatusConfig(caseData.status);
    const StatusIcon = statusConfig.icon;
    const displayImage = (caseData.evidence && caseData.evidence.length > 0)
        ? caseData.evidence[0]
        : caseData.thumbnail;

    return (
        <motion.div
            whileHover={{ translateY: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
            onClick={() => onClick(caseData.id)}
            style={{
                cursor: 'pointer',
                background: '#fff',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
            }}
        >
            {/* Property Image */}
            <div style={{ position: 'relative', height: '140px', overflow: 'hidden' }}>
                <img
                    src={displayImage || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80'}
                    alt={caseData.address}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: statusConfig.bg,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: `1px solid ${statusConfig.border}`,
                    backdropFilter: 'blur(8px)'
                }}>
                    <StatusIcon size={14} color={statusConfig.color} />
                    <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: statusConfig.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {statusConfig.label}
                    </span>
                </div>
            </div>

            {/* Card Content */}
            <div style={{ padding: '16px' }}>
                {/* Case ID */}
                <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#6366f1',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px'
                }}>
                    {caseData.id}
                </div>

                {/* Address */}
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '4px',
                    lineHeight: '1.3'
                }}>
                    {caseData.address || 'Address Pending'}
                </h3>

                {/* Applicant Name */}
                <div style={{
                    fontSize: '13px',
                    color: '#64748b',
                    marginBottom: '12px',
                    fontWeight: '500'
                }}>
                    {caseData.applicantName || 'Anonymous Client'}
                </div>

                {/* Meta Information */}
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#64748b'
                    }}>
                        <MapPin size={14} />
                        <span>{caseData.city || 'Location TBC'}</span>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#64748b'
                    }}>
                        <Calendar size={14} />
                        <span>{caseData.assessmentDate ? new Date(caseData.assessmentDate).toLocaleDateString() : 'Date TBC'}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default CaseCard;
