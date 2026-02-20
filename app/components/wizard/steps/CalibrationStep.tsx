
import React from 'react';
import { motion } from 'framer-motion';
import { Ruler, HelpCircle } from 'lucide-react';
import { WizardStepProps } from '../types';
import { CalibrationGuide } from '../CalibrationGuide';

const CalibrationStep: React.FC<WizardStepProps> = ({
    formData,
    handleUpdateField,
    handlePhotoUpload
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            style={{ padding: '16px', textAlign: 'center' }}
        >
            <div style={{ marginBottom: '16px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '10px',
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 8px'
                }}>
                    <Ruler size={16} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', marginBottom: '2px' }}>AI Calibration</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px', maxWidth: '440px', margin: '0 auto', lineHeight: '1.4' }}>
                    Reference object needed for <strong>millimetre-perfect</strong> calculations. Place an A4 paper or credit card.
                </p>
            </div>

            <div style={{
                maxWidth: '540px',
                margin: '0 auto',
                background: '#fff',
                padding: '24px',
                borderRadius: '24px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <CalibrationGuide
                    onPhotoCaptured={(file) => {
                        if (handlePhotoUpload) {
                            handlePhotoUpload({ target: { files: [file] } } as any);
                        }
                        handleUpdateField('calibrationWidth', '21.0');
                    }}
                    calibrationStatus={formData.calibrationWidth ? 'VALID' : 'PENDING'}
                    feedbackMessage={formData.calibrationWidth ? "Calibration Success" : "Align reference to the guide."}
                />
            </div>

            <div style={{
                marginTop: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'var(--bg-surface)',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
            }}>
                <HelpCircle size={14} color="var(--primary)" />
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: '700' }}>
                    Reference: A4 Paper (210mm) or Credit Card (85.6mm)
                </span>
            </div>
        </motion.div>
    );
};

export default CalibrationStep;
