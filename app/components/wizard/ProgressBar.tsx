
import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ProgressBarProps {
    currentStep: number;
    steps: { id: number; title: string; icon: React.ReactNode }[];
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, steps }) => {
    return (
        <div className="py-2 px-3 sm:py-2.5 sm:px-5 bg-white/80 backdrop-blur-xl border-b border-border flex items-start justify-between gap-0.5 sm:gap-1.5 sticky top-0 z-10 shrink-0">
            {steps.map((s, idx) => {
                const isActive = s.id === currentStep;
                const isCompleted = s.id < currentStep;

                return (
                    <React.Fragment key={s.id}>
                        <div className="flex flex-col items-center gap-0.5 sm:gap-1 flex-1 relative min-h-9 sm:min-h-12 justify-start min-w-0">
                            <motion.div
                                animate={{
                                    scale: isActive ? 1.05 : 1,
                                    background: isCompleted ? '#22c55e' : isActive ? 'var(--primary)' : '#fff',
                                    borderColor: isCompleted ? '#22c55e' : isActive ? 'var(--primary)' : '#e2e8f0',
                                    color: isCompleted || isActive ? '#fff' : '#94a3b8'
                                }}
                                className={cn(
                                    "w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg border-2 flex items-center justify-center z-2 shrink-0",
                                    isActive && "shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                                )}
                            >
                                {isCompleted ? <Check size={12} strokeWidth={3} /> : React.isValidElement(s.icon) ? React.cloneElement(s.icon as React.ReactElement<{ size?: number }>, { size: 12 }) : s.icon}
                            </motion.div>

                            <span className={cn(
                                "hidden sm:block text-[7px] md:text-[8.5px] font-extrabold uppercase tracking-wider text-center max-w-[48px] md:max-w-[60px] min-h-3 leading-tight md:leading-3.5",
                                isActive && "text-primary",
                                isCompleted && !isActive && "text-green-600",
                                !isActive && !isCompleted && "text-slate-400"
                            )}>
                                {s.title}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className="flex-1 h-0.5 mt-2.5 sm:mt-3 bg-slate-200 rounded-sm overflow-hidden shrink-0 min-w-0">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: isCompleted ? '100%' : '0%' }}
                                    className="h-full bg-green-600"
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default ProgressBar;
