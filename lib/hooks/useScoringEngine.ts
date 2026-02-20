import { useState, useMemo } from 'react';
import { calculateScore, COEFFICIENTS } from '@/lib/utils/scoring';

export { COEFFICIENTS };

export const useScoringEngine = (initialData: any = {}) => {
    const [data, setData] = useState({
        mobility: 'Independent wheelchair user',
        stairs: 'All on one level',
        entrance: 'No steps, flat',
        garden: 'No steps, flat',
        doorWidth: 'More than 76 cm',
        bathing: 'Can bathe myself',
        bathroomDoor: '73–90 cm',
        showerType: 'Shower, no steps',
        showerSize: '900×900–1200×1200 mm',
        toilet: 'Use independently',
        washDryToilet: 'No wash/dry toilet',
        inferredCount: 0,
        ...initialData
    });

    const calculation = useMemo(() => {
        const { percentage, grade, raw } = calculateScore(data);

        return {
            score: percentage,
            grade,
            raw,
            details: {
                mobility: data.mobility,
                subscores: {
                    MobilityAccess: 'Q2-Q5',
                    BathroomAccess: 'Q6-Q9',
                    IndependentUsability: 'Q1, Q10, Q11'
                }
            }
        };
    }, [data]);

    const updateClaim = (key: string, value: any) => {
        setData((prev: any) => ({ ...prev, [key]: value }));
    };

    return { calculation, updateClaim, data };
};
