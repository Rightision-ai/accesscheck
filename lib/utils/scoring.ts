export const BASE_CONSTANT = 0.45;

export const COEFFICIENTS = {
    Q1: {
        'Use a one-handed aid': 0.00,
        'Unable to leave bed': -0.32,
        'Use a two-handed aid': -0.14,
        'Personal assistance needed': -0.18,
        'Independent wheelchair user': -0.38,
        'Wheelchair with assistance': -0.34,
    },
    Q2: {
        'Straight stairs, one handrail': 0.00,
        'Straight stairs, both handrails': 0.06,
        'Staircase that turns': -0.09,
        'All on one level': 0.28,
    },
    Q3: {
        'Few steps': 0.00,
        'Steady slope': 0.04,
        'Steep slope': -0.06,
        'No steps, flat': 0.12,
    },
    Q4: {
        'Steps to garden': 0.00,
        'Steep slope': -0.05,
        'Steady slope': 0.03,
        'No steps, flat': 0.09,
    },
    Q5: { 'Less than 76 cm': 0.00, 'More than 76 cm': 0.14 },
    Q6: {
        'Bathe at sink, need help': 0.00,
        'Need help at all times': -0.20,
        'Need help to bathe': -0.12,
        'Use device': 0.08,
        'Sometimes need help': 0.04,
        'Can bathe myself': 0.17,
    },
    Q7: { 'Less than 73 cm': 0.00, '73–90 cm': 0.09, 'Over 90 cm': 0.20 },
    Q8: {
        'Shower, no steps': 0.00,
        'Shower cubicle with step': -0.08,
        'Shower over bath': -0.14,
        'Bath only, no shower': -0.22,
    },
    Q9: {
        '<900×900 mm': 0.00,
        '900×900–1200×1200 mm': 0.12,
        '>1200×1200 mm': 0.23,
    },
    Q10: {
        'Need help at all times': 0.00,
        'Need help with hygiene': 0.06,
        'Sometimes need help': 0.14,
        'Use independently': 0.28,
    },
    Q11: {
        'No wash/dry toilet': 0.00,
        'Have wash/dry toilet': 0.17,
    }
};

export const calculateScore = (data: any) => {
    let score = BASE_CONSTANT;
    let multipliers = { Q5: 1, Q7: 1, Q8: 1, Q9: 1, Q10: 1, Q2: 1, Q3: 1, Q4: 1 };

    const mobility = data.mobility || '';
    const isWheelchair = mobility.includes('wheelchair') || mobility.includes('Wheelchair');
    const isTwoHanded = mobility === 'Use a two-handed aid';

    // Step 3: Adaptive Weighting
    if (isWheelchair) {
        multipliers.Q5 *= 1.3;
        multipliers.Q7 *= 1.3;
        multipliers.Q8 *= 1.3;
        multipliers.Q9 *= 1.3;
        multipliers.Q10 *= 1.3;
    }
    if (isTwoHanded) {
        multipliers.Q2 *= 1.2;
        multipliers.Q3 *= 1.2;
        multipliers.Q4 *= 1.2;
    }

    // Apply Coefficients
    score += ((COEFFICIENTS.Q1 as any)[data.mobility] || 0);
    score += ((COEFFICIENTS.Q2 as any)[data.stairs] || 0) * multipliers.Q2;
    score += ((COEFFICIENTS.Q3 as any)[data.entrance] || 0) * multipliers.Q3;
    score += ((COEFFICIENTS.Q4 as any)[data.garden] || 0) * multipliers.Q4;
    score += ((COEFFICIENTS.Q5 as any)[data.doorWidth] || 0) * multipliers.Q5;
    score += ((COEFFICIENTS.Q6 as any)[data.bathing] || 0);
    score += ((COEFFICIENTS.Q7 as any)[data.bathroomDoor] || 0) * multipliers.Q7;
    score += ((COEFFICIENTS.Q8 as any)[data.showerType] || 0) * multipliers.Q8;
    score += ((COEFFICIENTS.Q9 as any)[data.showerSize] || 0) * multipliers.Q9;
    score += ((COEFFICIENTS.Q10 as any)[data.toilet] || 0) * multipliers.Q10;
    score += ((COEFFICIENTS.Q11 as any)[data.washDryToilet] || 0);

    // Step 5: Rule-Based Adjustments
    if (data.mobility === 'Unable to leave bed' && data.bathing === 'Need help at all times') score -= 0.25;
    if (isWheelchair && data.doorWidth === 'Less than 76 cm') score -= 0.15;
    if (isWheelchair && data.bathroomDoor === 'Less than 73 cm') score -= 0.10;
    if (data.stairs === 'All on one level' && data.entrance === 'No steps, flat') score += 0.08;
    if (data.stairs === 'All on one level' && data.garden === 'No steps, flat') score += 0.06;

    // New Human-Realism Rules
    if (isWheelchair && data.showerType === 'Shower over bath') score -= 0.25;
    if (isWheelchair && data.showerType === 'Bath only, no shower') score -= 0.30;
    if (isWheelchair && data.showerSize === '<900×900 mm') score -= 0.15;
    if (isWheelchair && data.bathing === 'Sometimes need help') score -= 0.05;
    if (isWheelchair && data.toilet === 'Sometimes need help') score -= 0.05;
    if (isWheelchair && (data.entrance === 'Few steps' || data.entrance === 'Steep slope')) score -= 0.10;
    if (isTwoHanded && data.entrance === 'Steep slope') score -= 0.08;
    if (data.mobility === 'Use a one-handed aid' && data.doorWidth === 'Less than 76 cm') score -= 0.07;
    if (data.mobility === 'Independent wheelchair user' && data.washDryToilet === 'No wash/dry toilet') score -= 0.05;
    if (data.mobility === 'Unable to leave bed' && data.stairs === 'All on one level') score += 0.05;
    if (data.showerType === 'Shower cubicle with step' && isWheelchair) score -= 0.18;
    if (data.inferredCount > 3) score -= 0.05;

    // Clamp and format
    const finalScore = Math.max(0, Math.min(1, score));
    const percentage = (finalScore * 100).toFixed(1);

    // Grade Assignment
    let grade = 'C';
    const p = parseFloat(percentage);
    if (p >= 95) grade = 'A+';
    else if (p >= 85) grade = 'A-';
    else if (p >= 75) grade = 'B+';
    else if (p >= 60) grade = 'B-';

    // High-risk mismatch downgrade
    const hasRisk = (isWheelchair && (data.showerType === 'Shower over bath' || data.showerType === 'Bath only, no shower')) ||
        (isWheelchair && (data.entrance === 'Steep slope')) ||
        (data.doorWidth === 'Less than 76 cm' && isWheelchair);

    if (hasRisk && grade !== 'C') {
        const grades = ['A+', 'A-', 'B+', 'B-', 'C'];
        const idx = grades.indexOf(grade);
        grade = grades[Math.min(grades.length - 1, idx + 1)];
    }

    return { percentage, grade, raw: finalScore };
};
