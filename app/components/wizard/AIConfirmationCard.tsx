
import React from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, Info } from 'lucide-react';

interface AIConfirmationCardProps {
    label: string;
    description?: string;
    icon: React.ReactNode;
    detectedValue: string | boolean | null;
    userValue: string | boolean | null;
    options: string[];
    onConfirm: (value: string) => void;
    confidence?: number;
}

export const AIConfirmationCard: React.FC<AIConfirmationCardProps> = ({
    label,
    description,
    icon,
    detectedValue,
    userValue,
    options,
    onConfirm,
    confidence
}) => {
    const isConfirmed = detectedValue === userValue && userValue !== null;
    const isHighConfidence = (confidence || 0) > 0.8;

    return (
        <div style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '16px',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 18 }) : icon}
                    </div>
                    <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '2px' }}>{label}</h4>
                        {description && <p style={{ fontSize: '12px', color: '#64748b' }}>{description}</p>}
                    </div>
                </div>

                {detectedValue !== null && (
                    <div style={{
                        padding: '3px 10px', borderRadius: '20px',
                        background: isHighConfidence ? '#dcfce7' : '#fef9c3',
                        color: isHighConfidence ? '#166534' : '#854d0e',
                        fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                        AI: {detectedValue.toString()}
                    </div>
                )}
            </div>

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                {options.map(opt => {
                    const isSelected = userValue === opt;
                    const isSuggestion = detectedValue === opt;

                    return (
                        <button
                            key={opt}
                            onClick={() => onConfirm(opt)}
                            style={{
                                padding: '10px 8px',
                                borderRadius: '12px',
                                border: '2px solid',
                                borderColor: isSelected ? 'var(--primary)' : isSuggestion ? 'var(--primary-light)' : '#e2e8f0',
                                background: isSelected ? 'var(--primary)' : '#fff',
                                color: isSelected ? '#fff' : isSuggestion ? 'var(--primary)' : '#64748b',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                position: 'relative'
                            }}
                        >
                            {opt}
                            {isSuggestion && !isSelected && <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--primary)', color: '#fff', borderRadius: '50%', padding: '2px' }}><Info size={9} /></div>}
                            {isSelected && <Check size={12} />}
                        </button>
                    );
                })}
            </div>

            {/* Action/Feedback */}
            {detectedValue !== null && userValue !== detectedValue && userValue !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fff7ed', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                    <AlertCircle size={12} color="#ea580c" />
                    <span style={{ fontSize: '11px', color: '#9a3412', fontWeight: '600' }}>Note: You have manually overridden the AI suggestion.</span>
                </div>
            )}
        </div>
    );
};
