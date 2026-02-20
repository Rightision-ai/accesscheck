import React from 'react';
import { ShieldCheck, ShieldAlert, AlertOctagon } from 'lucide-react';

interface ConfidenceBadgeProps {
    confidence: number; // 0.0 - 1.0
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence }) => {
    let color = 'bg-gray-100 text-gray-800';
    let icon = <ShieldAlert size={16} />;
    let label = 'Low Confidence';

    if (confidence >= 0.9) {
        color = 'bg-green-100 text-green-800 border-green-200';
        icon = <ShieldCheck size={16} />;
        label = 'AI Verified (High)';
    } else if (confidence >= 0.75) {
        color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        icon = <ShieldAlert size={16} />;
        label = 'AI Estimated (Medium)';
    } else {
        color = 'bg-red-100 text-red-800 border-red-200';
        icon = <AlertOctagon size={16} />;
        label = 'Manual Check Required';
    }

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${color}`}>
            {icon}
            <span>{label}</span>
            <span className="opacity-70 text-[10px]">({Math.round(confidence * 100)}%)</span>
        </div>
    );
};
