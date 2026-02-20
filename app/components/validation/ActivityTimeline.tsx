import React, { useState } from 'react';
import { AlertCircle, Shield, Wrench, MessageSquare, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { formatBritishDateTime } from '@/lib/utils/dateFormatter';

const TRUNCATE_LENGTH = 200;

interface ObservationEntryProps {
    obs: any;
    idx: number;
}

const ObservationEntry: React.FC<ObservationEntryProps> = ({ obs, idx }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const Icon = getCategoryIcon(obs.category);
    const color = getCategoryColor(obs.category);
    const initials = obs.authorName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?';

    const shouldTruncate = obs.content.length > TRUNCATE_LENGTH;
    const displayContent = (shouldTruncate && !isExpanded)
        ? obs.content.slice(0, TRUNCATE_LENGTH) + '...'
        : obs.content;

    return (
        <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
            {/* Avatar/Initial Circle */}
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '800',
                flexShrink: 0,
                boxShadow: '0 0 0 4px #fff, 0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 1
            }}>
                {initials}
            </div>

            {/* Content Card */}
            <div className="observation-card" style={{
                flex: 1,
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                maxWidth: '100%'
            }}>
                {/* Header */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '4px',
                        flexWrap: 'wrap',
                        gap: '8px'
                    }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                                {obs.authorName || 'Unknown'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '600' }}>
                                {obs.authorRole || 'OT'}
                            </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600', textAlign: 'right' }}>
                            {formatBritishDateTime(obs.createdAt).replace(',', ' -')}
                        </div>
                    </div>

                    {/* Tags Container */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {/* Category Tag */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: `${color}15`,
                        }}>
                            <Icon size={12} style={{ color }} />
                            <span style={{ fontSize: '11px', fontWeight: '800', color }}>
                                {obs.category}
                            </span>
                        </div>

                        {/* Visibility Tag */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: obs.includeInReport ? '#ecfdf5' : '#f8fafc',
                            border: `1px solid ${obs.includeInReport ? '#10b98140' : 'var(--border)'}`
                        }}>
                            <div style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: obs.includeInReport ? '#10b981' : 'var(--text-dim)'
                            }} />
                            <span style={{
                                fontSize: '10px', fontWeight: '800',
                                color: obs.includeInReport ? '#047857' : 'var(--text-dim)',
                                textTransform: 'uppercase'
                            }}>
                                {obs.includeInReport ? 'In Report' : 'Internal Only'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Observation Content */}
                <p className="observation-content" style={{
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: 'var(--text-main)',
                    margin: 0,
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word'
                }}>
                    {displayContent}
                </p>

                {/* Read More/Less Button */}
                {shouldTruncate && (
                    <button
                        className="read-more-btn no-print"
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            marginTop: '12px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'var(--bg-surface)';
                            e.currentTarget.style.color = 'var(--primary)';
                        }}
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp size={14} />
                                Show Less
                            </>
                        ) : (
                            <>
                                <ChevronDown size={14} />
                                Read More
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'Safety Hazard': return Shield;
        case 'Equipment Required': return Wrench;
        case 'General Comment': return MessageSquare;
        default: return AlertCircle;
    }
};

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'Accessibility Issue': return '#dc2626';
        case 'Safety Hazard': return '#ea580c';
        case 'Equipment Required': return '#2563eb';
        case 'General Comment': return '#059669';
        default: return '#6b7280';
    }
};

interface ActivityTimelineProps {
    observations: any[];
    onAddFollowup: (observationId: string, text: string) => void;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ observations, onAddFollowup }) => {
    // Sort observations by date (newest first)
    const sortedObservations = [...observations].sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (sortedObservations.length === 0) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                background: 'var(--bg-surface)',
                borderRadius: '16px',
                border: '1px dashed var(--border)'
            }}>
                <Clock size={32} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
                <p style={{ color: 'var(--text-dim)', fontSize: '14px', fontWeight: '600' }}>
                    No observations recorded yet
                </p>
                <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
                    Click "Add Observation" to record your first professional note
                </p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            {/* Timeline vertical line */}
            <div className="timeline-line" style={{
                position: 'absolute',
                left: '20px',
                top: '30px',
                bottom: '30px',
                width: '2px',
                background: 'linear-gradient(to bottom, var(--border) 0%, transparent 100%)'
            }} />

            {/* Timeline entries */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                width: '100%',
                maxWidth: '100%'
            }}>
                {sortedObservations.map((obs, idx) => (
                    <ObservationEntry key={obs.id || idx} obs={obs} idx={idx} />
                ))}
            </div>

            {/* Print-specific styles */}
            <style>{`
                @media print {
                    .no-print, .read-more-btn {
                        display: none !important;
                    }
                    
                    .observation-card {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    
                    .observation-content {
                        height: auto !important;
                        overflow: visible !important;
                        max-height: none !important;
                    }
                    
                    .timeline-line {
                        display: none !important;
                    }
                }
                
                @media (max-width: 768px) {
                    .observation-card {
                        padding: 12px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default ActivityTimeline;
