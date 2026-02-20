
import React from 'react';
import { motion } from 'framer-motion';
import { Bed, Bath, Toilet, MapPin, Users } from 'lucide-react';
import { WizardStepProps } from '../types';
import { AIConfirmationCard } from '../AIConfirmationCard';

const FacilitiesStep: React.FC<WizardStepProps> = ({
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
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', marginBottom: '2px' }}>Facilities & Rooms</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Verify layout of kitchens and bathrooms.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* AI-First Bedroom Detection (Special Case with Number Input) */}
                <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '16px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bed size={18} />
                            </div>
                            <div>
                                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '2px' }}>Accommodation</h4>
                                <p style={{ fontSize: '12px', color: '#64748b' }}>Total bedrooms and occupancy limits.</p>
                            </div>
                        </div>
                        {floorPlanAnalysis && (
                            <div style={{ padding: '4px 12px', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: '800' }}>
                                AI Detection Active
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Bed size={16} color="#64748b" />
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Bedrooms</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button onClick={() => handleUpdateField('bedrooms', Math.max(0, (formData.bedrooms || 0) - 1))} style={counterButtonStyle}>-</button>
                                <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)', minWidth: '20px', textAlign: 'center' }}>{formData.bedrooms || 0}</span>
                                <button onClick={() => handleUpdateField('bedrooms', (formData.bedrooms || 0) + 1)} style={counterButtonStyle}>+</button>
                            </div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Users size={16} color="#64748b" />
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Occupants</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button onClick={() => handleUpdateField('bedSpaces', Math.max(1, (formData.bedSpaces || 1) - 1))} style={counterButtonStyle}>-</button>
                                <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)', minWidth: '20px', textAlign: 'center' }}>{formData.bedSpaces || 1}</span>
                                <button onClick={() => handleUpdateField('bedSpaces', (formData.bedSpaces || 1) + 1)} style={counterButtonStyle}>+</button>
                            </div>
                        </div>
                    </div>
                </div>

                <AIConfirmationCard
                    label="Bathroom Location"
                    description="Floor where the primary bathing facility is located."
                    icon={<MapPin size={18} />}
                    detectedValue={null}
                    userValue={formData.bathroomLocation}
                    options={['Ground Floor', 'First Floor', 'Split Level', 'Second Floor+']}
                    onConfirm={(val) => handleUpdateField('bathroomLocation', val)}
                />

                <AIConfirmationCard
                    label="Bathing Facilities"
                    description="Type of primary bathing equipment."
                    icon={<Bath size={18} />}
                    detectedValue={aiSuggestions?.bathing_type || null}
                    userValue={formData.bathingType}
                    options={['Bath Only', 'Over-Bath Shower', 'Shower Cubicle', 'Level Access Shower']}
                    onConfirm={(val) => handleUpdateField('bathingType', val)}
                />

                <AIConfirmationCard
                    label="Toilet Type"
                    description="Configuration of the primary WC."
                    icon={<Toilet size={18} />}
                    detectedValue={aiSuggestions?.toilet_type || null}
                    userValue={formData.toiletType}
                    options={['Standard', 'Raised Height', 'Wash/Dry (Smart)']}
                    onConfirm={(val) => handleUpdateField('toiletType', val)}
                />
            </div>
        </motion.div>
    );
};

const counterButtonStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    color: '#64748b',
    transition: 'all 0.2s'
};

export default FacilitiesStep;
