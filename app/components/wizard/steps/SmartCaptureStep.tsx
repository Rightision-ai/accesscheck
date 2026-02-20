
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image as ImageIcon, Trash2, CheckCircle, Info, Plus, RefreshCw } from 'lucide-react';
import { WizardStepProps } from '../types';

const CAPTURE_CATEGORIES = [
    { id: 'entrance', title: 'Main Entrance', desc: 'Door and structural steps.', required: true },
    { id: 'hallway', title: 'Hallway', desc: 'Long shot showing width.', required: true },
    { id: 'stairs', title: 'Internal Stairs', desc: 'From bottom looking up.', condition: (d: any) => d.internalStairs === 'Yes' },
    { id: 'kitchen', title: 'Kitchen', desc: 'Floor space and turning circle.', required: true },
    { id: 'bathroom', title: 'Bathroom', desc: 'Toilet space and shower type.', required: true },
    { id: 'garden', title: 'Garden Access', desc: 'Door threshold to garden.', condition: (d: any) => d.gardenAccess === 'Yes' || d.propertyAccessGarden === 'Yes' },
];

const SmartCaptureStep: React.FC<WizardStepProps> = ({
    formData,
    handleUpdateField,
    handlePhotoUpload,
    isProcessing,
    processingCategory
}) => {
    const categoryPhotos = formData.categoryPhotos || {};

    const removePhoto = (catId: string, photoIndex: number) => {
        const currentCatPhotos = [...(categoryPhotos[catId] || [])];
        currentCatPhotos.splice(photoIndex, 1);

        const updatedCategoryPhotos = { ...categoryPhotos, [catId]: currentCatPhotos };
        handleUpdateField('categoryPhotos', updatedCategoryPhotos);

        // Keep global photos list in sync
        const allCategorizedPhotos = Object.values(updatedCategoryPhotos).flat();
        handleUpdateField('photos', allCategorizedPhotos);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            style={{ padding: '20px' }}
        >
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div style={{ padding: '2px 8px', background: 'var(--primary)', color: '#fff', borderRadius: '4px', fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Guided Evidence
                            </div>
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '2px', color: 'var(--primary)' }}>Smart Capture</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                            Upload up to 3 photos per category for millimetre-perfect AI verification.
                        </p>
                    </div>
                    {isProcessing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--primary-light)', borderRadius: '10px', color: 'var(--primary)', fontWeight: '700', fontSize: '12px' }}>
                            <RefreshCw className="animate-spin" size={14} />
                            Processing...
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {CAPTURE_CATEGORIES.filter(cat => !cat.condition || cat.condition(formData)).map(cat => {
                    const currentPhotos = categoryPhotos[cat.id] || [];
                    const isFull = currentPhotos.length >= 3;

                    return (
                        <div key={cat.id} style={{
                            background: '#fff',
                            borderRadius: '20px',
                            padding: '16px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', marginBottom: '2px' }}>{cat.title}</h4>
                                    <p style={{ fontSize: '11px', color: '#64748b' }}>{cat.desc}</p>
                                    {isProcessing && processingCategory === cat.id && (
                                        <div style={{ 
                                            marginTop: '8px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '4px', 
                                            fontSize: '10px', 
                                            color: 'var(--primary)', 
                                            fontWeight: '700' 
                                        }}>
                                            <RefreshCw className="animate-spin" size={10} />
                                            Analyzing...
                                        </div>
                                    )}
                                </div>
                                {cat.required && currentPhotos.length === 0 ? (
                                    <span style={{ fontSize: '8px', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>Required</span>
                                ) : currentPhotos.length > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e' }}>
                                        <CheckCircle size={12} />
                                        <span style={{ fontSize: '10px', fontWeight: '800' }}>{currentPhotos.length}/3</span>
                                    </div>
                                ) : null}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {currentPhotos.map((photo: string, idx: number) => (
                                    <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                        <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            onClick={() => removePhoto(cat.id, idx)}
                                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                                {!isFull && (
                                    <label style={{
                                        aspectRatio: '1',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '1px dashed #cbd5e1',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        gridColumn: currentPhotos.length === 0 ? 'span 3' : 'span 1',
                                        height: currentPhotos.length === 0 ? '80px' : 'auto'
                                    }}
                                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)', e.currentTarget.style.background = 'var(--primary-light)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1', e.currentTarget.style.background = '#f8fafc')}
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            hidden
                                            onChange={(e) => handlePhotoUpload && handlePhotoUpload(e, cat.id)}
                                            multiple={false}
                                            disabled={isProcessing}
                                        />
                                        <Camera size={currentPhotos.length === 0 ? 20 : 16} color="#94a3b8" />
                                        {currentPhotos.length === 0 && <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginTop: '4px' }}>Add Photo</span>}
                                    </label>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default SmartCaptureStep;
