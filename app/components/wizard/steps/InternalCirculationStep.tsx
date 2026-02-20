
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, HandHelping, Info, ArrowDownCircle } from 'lucide-react';
import { WizardStepProps } from '../types';
import { AIConfirmationCard } from '../AIConfirmationCard';

const InternalCirculationStep: React.FC<WizardStepProps> = ({
    formData,
    handleUpdateField,
    floorPlanAnalysis,
    aiSuggestions
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
            <div style={{ marginBottom: '0px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', marginBottom: '2px' }}>Internal Circulation</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Confirm internal doors, stairs and corridor widths.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Main Stairs Detection */}
                <AIConfirmationCard
                    label="Internal Stairs"
                    description="Presence of a staircase connecting main floors."
                    icon={<ArrowUpRight size={18} />}
                    detectedValue={
                        aiSuggestions?.has_stairs !== undefined ? (aiSuggestions.has_stairs ? 'Yes' : 'No') :
                        (floorPlanAnalysis?.internal_stairs?.detected ? 'Yes' : 'No')
                    }
                    confidence={floorPlanAnalysis?.internal_stairs?.confidence}
                    userValue={formData.internalStairs}
                    options={['Yes', 'No']}
                    onConfirm={(val) => handleUpdateField('internalStairs', val)}
                />

                <AnimatePresence>
                    {formData.internalStairs === 'Yes' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px' }}
                        >
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={subLabelStyle}>Stair Geometry</label>
                                    <select
                                        value={formData.internalStairsType || ''}
                                        onChange={(e) => handleUpdateField('internalStairsType', e.target.value)}
                                        style={selectStyle}
                                    >
                                        <option value="">Select Type...</option>
                                        <option value="Straight">Straight</option>
                                        <option value="Quarter Turn">Quarter Turn</option>
                                        <option value="Half Turn">Half Turn</option>
                                        <option value="Spiral">Spiral</option>
                                        <option value="Winding">Winding</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={subLabelStyle}>Handrails</label>
                                    <select
                                        value={formData.internalHandrails || ''}
                                        onChange={(e) => handleUpdateField('internalHandrails', e.target.value)}
                                        style={selectStyle}
                                    >
                                        <option value="">Select Side...</option>
                                        <option value="None">None</option>
                                        <option value="Left Side">Left Side</option>
                                        <option value="Right Side">Right Side</option>
                                        <option value="Both Sides">Both Sides</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Internal Lifts */}
                <AIConfirmationCard
                    label="Internal Lift / Stairlift"
                    description="Mechanical aids for level changes."
                    icon={<ArrowDownCircle size={18} />}
                    detectedValue={null}
                    userValue={formData.internalLift}
                    options={['None', 'Stairlift', 'Through-Floor Lift']}
                    onConfirm={(val) => handleUpdateField('internalLift', val)}
                />
            </div>
        </motion.div>
    );
};

const subLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '10px',
    fontWeight: '800',
    color: '#64748b',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    fontSize: '14px',
    outline: 'none'
};

export default InternalCirculationStep;
