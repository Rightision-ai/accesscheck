
import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, AlertOctagon, Undo2 } from 'lucide-react';
import { WizardStepProps } from '../types';
import { AIConfirmationCard } from '../AIConfirmationCard';

const SafetyHazardsStep: React.FC<WizardStepProps> = ({
    formData,
    handleUpdateField,
    floorPlanAnalysis
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
            <div style={{ marginBottom: '4px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)', marginBottom: '4px' }}>Safety & Hazards</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Identify potential risks and compliance issues detected by AI.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Second Exit Confirmation */}
                <AIConfirmationCard
                    label="Emergency Exit (Second Exit)"
                    description="Presence of a secondary escape route (back door, etc.)"
                    icon={<Undo2 size={22} />}
                    detectedValue={floorPlanAnalysis?.second_exit?.detected ? 'Yes' : 'No'}
                    confidence={floorPlanAnalysis?.second_exit?.confidence}
                    userValue={formData.secondExit}
                    options={['Yes', 'No']}
                    onConfirm={(val) => handleUpdateField('secondExit', val)}
                />

                {/* Exit Location (Conditional) */}
                {formData.secondExit === 'Yes' && (
                    <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <label style={subLabelStyle}>Where does the second exit lead?</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {['Public Way / Street', 'Enclosed Garden'].map(loc => (
                                <button
                                    key={loc}
                                    onClick={() => handleUpdateField('secondExitLocation', loc)}
                                    style={{
                                        padding: '12px', borderRadius: '12px', border: '1px solid',
                                        borderColor: formData.secondExitLocation === loc ? 'var(--primary)' : '#cbd5e1',
                                        background: formData.secondExitLocation === loc ? 'var(--primary-light)' : '#fff',
                                        color: formData.secondExitLocation === loc ? 'var(--primary)' : '#64748b',
                                        fontWeight: '700', fontSize: '13px', cursor: 'pointer'
                                    }}
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
                            <InfoIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            A "Safe Exit" must lead directly to a public way.
                        </p>
                    </div>
                )}

                {/* Hazards Text Area */}
                <div style={{
                    background: '#fff',
                    borderRadius: '24px',
                    padding: '24px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ShieldAlert size={20} color="#ef4444" />
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>Known Hazards</h4>
                    </div>
                    <textarea
                        placeholder="e.g. Loose carpet on stairs, trailing wires in hallway, dim lighting in bathroom..."
                        value={formData.hazards || ''}
                        onChange={(e) => handleUpdateField('hazards', e.target.value)}
                        style={{
                            width: '100%', minHeight: '120px', padding: '16px', borderRadius: '16px',
                            border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '14px',
                            outline: 'none', resize: 'vertical', lineHeight: '1.5'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['Trip Hazards', 'Poor Lighting', 'Damp/Mould'].map(tag => (
                            <button
                                key={tag}
                                onClick={() => {
                                    const current = formData.hazards || '';
                                    if (!current.includes(tag)) handleUpdateField('hazards', current ? `${current}, ${tag}` : tag);
                                }}
                                style={{ padding: '4px 10px', borderRadius: '8px', background: '#f1f5f9', border: 'none', fontSize: '11px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
                            >
                                + {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const InfoIcon = ({ size, style }: { size: number, style?: React.CSSProperties }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
);

const subLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '800',
    color: '#64748b',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

export default SafetyHazardsStep;
