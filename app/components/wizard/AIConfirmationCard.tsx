
import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

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
    const isHighConfidence = (confidence || 0) > 0.8;

    return (
        <div className="bg-white rounded-[20px] p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-3 relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-primary-light text-primary flex items-center justify-center">
                        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 18 }) : icon}
                    </div>
                    <div>
                        <h4 className="text-[15px] font-extrabold text-slate-800 mb-0.5">{label}</h4>
                        {description && <p className="text-xs text-slate-500">{description}</p>}
                    </div>
                </div>

                {detectedValue !== null && (
                    <div className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1",
                        isHighConfidence ? "bg-purple-100 text-purple-800" : "bg-purple-50 text-purple-700"
                    )}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        AI: {detectedValue.toString()}
                    </div>
                )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
                {options.map(opt => {
                    const isSelected = userValue === opt;
                    const isSuggestion = detectedValue === opt;

                    return (
                        <button
                            key={opt}
                            onClick={() => onConfirm(opt)}
                            className={cn(
                                "py-2.5 px-2 rounded-xl border-2 font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 relative",
                                isSelected && !isSuggestion && "border-primary bg-primary text-white",
                                isSelected && isSuggestion && "border-purple-600 bg-purple-600 text-white",
                                isSuggestion && !isSelected && "border-purple-200 bg-purple-50 text-purple-700",
                                !isSelected && !isSuggestion && "border-slate-200 bg-white text-slate-500"
                            )}
                        >
                            {opt}
                            {isSelected && <Check size={12} />}
                        </button>
                    );
                })}
            </div>

            {/* Action/Feedback */}
            {detectedValue !== null && userValue !== detectedValue && userValue !== null && (
                <div className="flex items-center gap-1.5 py-1.5 px-3 bg-orange-50 rounded-[10px] border border-orange-100">
                    <AlertCircle size={12} className="text-orange-600" />
                    <span className="text-[11px] text-orange-800 font-semibold">Note: You have manually overridden the AI suggestion.</span>
                </div>
            )}
        </div>
    );
};
