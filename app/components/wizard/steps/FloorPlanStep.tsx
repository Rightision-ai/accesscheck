
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { WizardStepProps } from '../types';

const FloorPlanStep: React.FC<WizardStepProps> = ({
    formData,
    handleUpdateField,
    handlePhotoUpload,
    isAnalyzing
}) => {
    const hasPlan = !!formData.floorPlan;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            style={{ padding: '16px', textAlign: 'center' }}
        >
            <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', marginBottom: '2px' }}>Floor Plan Analysis</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Upload a drawing to automate 80% of the accessibility assessment.</p>
            </div>

            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                <label
                    htmlFor="floorPlanUpload"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '32px 20px',
                        border: '2px dashed',
                        borderColor: isAnalyzing ? 'var(--primary)' : hasPlan ? '#22c55e' : '#cbd5e1',
                        background: isAnalyzing ? 'var(--primary-light)' : hasPlan ? '#f0fdf4' : '#f8fafc',
                        borderRadius: '20px',
                        cursor: isAnalyzing ? 'wait' : 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <input
                        type="file"
                        id="floorPlanUpload"
                        accept="image/*,.pdf"
                        hidden
                        onChange={handlePhotoUpload}
                        disabled={isAnalyzing}
                    />

                    <AnimatePresence mode="wait">
                        {isAnalyzing ? (
                            <motion.div
                                key="analyzing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                            >
                                <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                                <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '14px' }}>AI is scanning floor plan...</span>
                            </motion.div>
                        ) : hasPlan ? (
                            <motion.div
                                key="done"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                            >
                                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                    <CheckCircle size={28} />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontWeight: '800', color: '#166534', fontSize: '15px' }}>Plan Uploaded Successfully</span>
                                    <span style={{ fontSize: '12px', color: '#166534', opacity: 0.8 }}>Click to replace file</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                            >
                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    <Upload size={24} />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontWeight: '800', color: '#1e293b', fontSize: '15px' }}>Click to Upload Plan</span>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>PNG, JPG or PDF (Max 10MB)</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isAnalyzing && (
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', background: 'var(--primary)' }}
                        />
                    )}
                </label>

                <div
                    onClick={() => handleUpdateField('hasNoFloorPlan', !formData.hasNoFloorPlan)}
                    style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        background: formData.hasNoFloorPlan ? 'var(--primary-light)' : '#fff',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: formData.hasNoFloorPlan ? 'var(--primary)' : '#e2e8f0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{
                        width: '18px', height: '18px', borderRadius: '4px', border: '2px solid',
                        borderColor: formData.hasNoFloorPlan ? 'var(--primary)' : '#cbd5e1',
                        background: formData.hasNoFloorPlan ? 'var(--primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                    }}>
                        {formData.hasNoFloorPlan && <CheckCircle size={12} />}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: formData.hasNoFloorPlan ? 'var(--primary)' : '#475569' }}>
                        I don't have a floor plan (Estimate from photos)
                    </span>
                </div>
            </div>

            <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px', textAlign: 'left' }}>
                <AlertCircle size={18} color="var(--primary)" style={{ marginTop: '2px' }} />
                <div>
                    <span style={{ display: 'block', fontWeight: '800', fontSize: '13px', color: '#1e293b', marginBottom: '2px' }}>Pro Tip</span>
                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                        A clear, top-down drawing helps our engine detect door widths, stair counts, and dimensions with millimeter precision.
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default FloorPlanStep;
