import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, AlertCircle, Shield, Wrench, MessageSquare } from 'lucide-react';

const OBSERVATION_CATEGORIES = [
    { id: 'accessibility', label: 'Accessibility Issue', icon: AlertCircle, color: '#dc2626' },
    { id: 'safety', label: 'Safety Hazard', icon: Shield, color: '#ea580c' },
    { id: 'equipment', label: 'Equipment Required', icon: Wrench, color: '#2563eb' },
    { id: 'general', label: 'General Comment', icon: MessageSquare, color: '#059669' }
];

interface AddObservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (obs: any) => void;
    user: any;
    caseId: string;
}

const AddObservationModal: React.FC<AddObservationModalProps> = ({ isOpen, onClose, onSave, user, caseId }) => {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [content, setContent] = useState('');
    const [includeInReport, setIncludeInReport] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!selectedCategory || !content.trim()) {
            return;
        }

        setIsSaving(true);

        const observation = {
            id: `obs-${Date.now()}`,
            caseId,
            category: OBSERVATION_CATEGORIES.find(c => c.id === selectedCategory)?.label,
            content: content.trim(),
            authorName: user?.name || 'Unknown',
            authorRole: user?.role || 'OT',
            createdAt: new Date().toISOString(),
            includeInReport
        };

        await onSave(observation);

        // Reset form
        setSelectedCategory('');
        setContent('');
        setIncludeInReport(true);
        setIsSaving(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)'
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    background: '#fff',
                    borderRadius: '20px',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff'
                        }}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>
                                Add Professional Observation
                            </h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                Clinical note for case {caseId}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--text-dim)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                    {/* Category Selection */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: 'var(--text-main)',
                            marginBottom: '12px'
                        }}>
                            Category <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {OBSERVATION_CATEGORIES.map(cat => {
                                const Icon = cat.icon;
                                const isSelected = selectedCategory === cat.id;
                                return (
                                    <motion.div
                                        key={cat.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: `2px solid ${isSelected ? cat.color : 'var(--border)'}`,
                                            background: isSelected ? `${cat.color}10` : '#fff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            background: isSelected ? cat.color : 'var(--bg-surface)',
                                            color: isSelected ? '#fff' : cat.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Icon size={18} />
                                        </div>
                                        <span style={{
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            color: isSelected ? cat.color : 'var(--text-main)'
                                        }}>
                                            {cat.label}
                                        </span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Text Area */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: 'var(--text-main)',
                            marginBottom: '8px'
                        }}>
                            Observation Details <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <div style={{
                            display: 'block',
                            fontSize: '12px',
                            color: 'var(--text-dim)',
                            marginBottom: '4px',
                            fontStyle: 'italic',
                            wordWrap: 'break-word'
                        }}>
                            Professional commentary for the final report or internal reference.
                        </div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter detailed observations regarding the property's suitability, potential risks, or specific client needs..."
                            style={{
                                width: '100%',
                                minHeight: '160px',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                outline: 'none',
                                lineHeight: '1.6'
                            }}
                        />
                        <div style={{
                            marginTop: '8px',
                            fontSize: '11px',
                            color: 'var(--text-dim)',
                            textAlign: 'right'
                        }}>
                            {content.length} characters
                        </div>
                    </div>

                    {/* Report Inclusion Toggle */}
                    <div style={{
                        padding: '20px',
                        background: 'var(--bg-surface)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', borderRadius: '10px', background: includeInReport ? '#ecfdf5' : '#f8fafc', color: includeInReport ? '#10b981' : 'var(--text-dim)' }}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                                    Include in Final Report
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                    Visible to client in the clinical document
                                </div>
                            </div>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px' }}>
                            <input
                                type="checkbox"
                                checked={includeInReport}
                                onChange={(e) => setIncludeInReport(e.target.checked)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: includeInReport ? '#10b981' : '#cbd5e1',
                                transition: '0.3s',
                                borderRadius: '28px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '',
                                    height: '22px',
                                    width: '22px',
                                    left: includeInReport ? '27px' : '3px',
                                    bottom: '3px',
                                    background: '#fff',
                                    transition: '0.3s',
                                    borderRadius: '50%',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }} />
                            </span>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px 32px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        <strong>Author:</strong> {user?.name || 'Unknown'} ({user?.role || 'OT'})
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: '700',
                                color: 'var(--text-dim)',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!selectedCategory || !content.trim() || isSaving}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: '700',
                                color: '#fff',
                                background: (!selectedCategory || !content.trim()) ? '#cbd5e1' : 'var(--primary)',
                                border: 'none',
                                cursor: (!selectedCategory || !content.trim()) ? 'not-allowed' : 'pointer',
                                boxShadow: (!selectedCategory || !content.trim()) ? 'none' : '0 4px 12px var(--primary-glow)'
                            }}
                        >
                            {isSaving ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AddObservationModal;
