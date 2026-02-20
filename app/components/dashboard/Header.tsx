'use client';

import React from 'react';
import { Search, Bell, User, PlusCircle, LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth/actions';

interface HeaderProps {
    user: { name: string; role: string } | null;
    onOpenWizard: () => void;
    onSearch: (term: string) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onOpenWizard, onSearch }) => {
    return (
        <header className="glass" style={{
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            borderBottom: '1px solid var(--glass-border)',
            background: 'white' // Ensure background is white as 'glass' class might not be defined globally yet
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                    src="/homingo-logo.png"
                    alt="Homingo"
                    style={{ height: '45px', cursor: 'pointer' }}
                />
            </div>

            <div style={{ flex: 1, maxWidth: '500px', margin: '0 40px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-dim)'
                    }} />
                    <input
                        type="text"
                        placeholder="Search address, ID or client..."
                        onChange={(e) => onSearch && onSearch(e.target.value)}
                        className="glass"
                        style={{
                            width: '100%',
                            padding: '12px 16px 12px 48px',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            outline: 'none',
                            border: '1px solid #e5e7eb'
                        }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <button
                    onClick={onOpenWizard}
                    className="glass"
                    style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer'
                    }}
                >
                    <PlusCircle size={18} color="#6366f1" />
                    New Assessment
                </button>
                <Bell size={20} color="#94a3b8" style={{ cursor: 'pointer' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="text-right hidden lg:block">
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{user?.name || 'User'}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>{user?.role || 'OT'}</div>
                    </div>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '12px',
                        background: '#6366f1',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }}>
                        {user?.name ? user.name.charAt(0) : <User size={20} />}
                    </div>
                    <button
                        onClick={() => signOut()}
                        title="Sign Out"
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
