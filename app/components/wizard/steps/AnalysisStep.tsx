
import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, FileText, Share2, ClipboardCheck } from 'lucide-react';
import { WizardStepProps } from '../types';

const AnalysisStep: React.FC<WizardStepProps> = ({
    formData,
    isAnalyzing,
    onNext // This will be used to trigger the final report/navigation
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            style={{ padding: '24px', textAlign: 'center' }}
        >
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                {isAnalyzing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                        <div className="analysis-pulse" style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'var(--primary-light)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', position: 'relative'
                        }}>
                            <Loader2 size={40} color="var(--primary)" className="animate-spin" />
                            <motion.div
                                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--primary)' }}
                            />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', marginBottom: '8px' }}>Analyzing Compliance</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
                                The Homingo ASE engine is processing 43 data points against enterprise accessibility standards.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: '#dcfce7', color: '#22c55e',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 40px rgba(34, 197, 94, 0.2)'
                        }}>
                            <ShieldCheck size={48} />
                        </div>

                        <div>
                            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Assessment Ready</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '15px' }}>
                                Analysis complete. A detailed grade and compliance report generated for {formData.fullName}.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                            <div style={statCardStyle}>
                                <ClipboardCheck size={18} color="var(--primary)" />
                                <div>
                                    <span style={statLabelStyle}>Compliance</span>
                                    <span style={statValueStyle}>92%</span>
                                </div>
                            </div>
                            <div style={statCardStyle}>
                                <FileText size={18} color="#22c55e" />
                                <div>
                                    <span style={statLabelStyle}>Findings</span>
                                    <span style={statValueStyle}>12 Logged</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', width: '100%', textAlign: 'left' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase' }}>Next Steps</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={bulletStyle}><div style={dotStyle} /> Review AI inferred observations</div>
                                <div style={bulletStyle}><div style={dotStyle} /> Download PDF Survey Report</div>
                                <div style={bulletStyle}><div style={dotStyle} /> Export data to Case Management</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const statCardStyle: React.CSSProperties = {
    padding: '20px',
    background: '#fff',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'left'
};

const statLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    color: '#64748b',
    marginBottom: '2px'
};

const statValueStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '800',
    color: '#1e293b'
};

const bulletStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569'
};

const dotStyle: React.CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--primary)'
};

export default AnalysisStep;
