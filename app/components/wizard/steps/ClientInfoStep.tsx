
import React from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, Phone, Calendar as CalendarIcon, Building2 } from 'lucide-react';
import { WizardStepProps } from '../types';

const ClientInfoStep: React.FC<WizardStepProps> = ({ formData, handleUpdateField }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
            <div style={{ marginBottom: '4px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)', marginBottom: '4px' }}>Client Information</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Enter the primary details for the assessment case.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Row 1: Door No, Street No, Building Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr', gap: '16px' }}>
                    <div className="input-group">
                        <label style={labelStyle}>Door No</label>
                        <input
                            type="text"
                            placeholder="00"
                            value={formData.doorNo || ''}
                            onChange={(e) => handleUpdateField('doorNo', e.target.value)}
                            style={inputStyle}
                            autoComplete="address-line1"
                        />
                    </div>
                    <div className="input-group">
                        <label style={labelStyle}>Street No</label>
                        <input
                            type="text"
                            placeholder="00"
                            value={formData.streetNo || ''}
                            onChange={(e) => handleUpdateField('streetNo', e.target.value)}
                            style={inputStyle}
                            autoComplete="off"
                        />
                    </div>
                    <div className="input-group">
                        <label style={labelStyle}>Building Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Skyline Towers"
                            value={formData.buildingName || ''}
                            onChange={(e) => handleUpdateField('buildingName', e.target.value)}
                            style={inputStyle}
                            autoComplete="off"
                        />
                    </div>
                </div>

                {/* Row 2: Street */}
                <div className="input-group">
                    <label style={labelStyle}>Street</label>
                    <input
                        type="text"
                        placeholder="Street Name"
                        value={formData.street || ''}
                        onChange={(e) => handleUpdateField('street', e.target.value)}
                        style={inputStyle}
                        autoComplete="address-line2"
                    />
                </div>

                {/* Row 3: Postcode, Your Full Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px' }}>
                    <div className="input-group">
                        <label style={labelStyle}>Postcode</label>
                        <input
                            type="text"
                            placeholder="Postcode"
                            value={formData.postcode || ''}
                            onChange={(e) => handleUpdateField('postcode', e.target.value)}
                            style={inputStyle}
                            autoComplete="postal-code"
                        />
                    </div>
                    <div className="input-group">
                        <label style={labelStyle}>Your Full Name</label>
                        <input
                            type="text"
                            placeholder="e.g. John Smith"
                            value={formData.fullName || ''}
                            onChange={(e) => handleUpdateField('fullName', e.target.value)}
                            style={inputStyle}
                            autoComplete="name"
                        />
                    </div>
                </div>

                {/* Row 4: Your Phone Number, Date of Inspection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                        <label style={labelStyle}>Your Phone Number</label>
                        <input
                            type="tel"
                            placeholder="e.g. 07700 900000"
                            value={formData.phoneNumber || ''}
                            onChange={(e) => handleUpdateField('phoneNumber', e.target.value)}
                            style={inputStyle}
                            autoComplete="tel"
                        />
                    </div>
                    <div className="input-group">
                        <label style={labelStyle}>Date of Inspection</label>
                        <input
                            type="date"
                            value={formData.assessmentDate || ''}
                            readOnly
                            style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                            autoComplete="off"
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-dim)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: '#fff',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
};

export default ClientInfoStep;
