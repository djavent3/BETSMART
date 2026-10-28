export function americanToImpliedProb(odds: number): number {
  if (odds < 0) {
    return -odds / (-odds + 100);
  }
  return 100 / (odds + 100);
}

export function americanToDecimal(odds: number): number {
  if (odds < 0) {
    return 1 + 100 / -odds;
  }
  return 1 + odds / 100;
}

export function probToAmerican(prob: number): number {
  if (prob <= 0 || prob >= 1) return 0;
  if (prob >= 0.5) {
    return Math.round((-100 * prob) / (1 - prob));
  }
  return Math.round((100 * (1 - prob)) / prob);
}

export function deVigMultiplicative(sharpSideA: number, sharpSideB: number) {
  const impA = americanToImpliedProb(sharpSideA);
  const impB = americanToImpliedProb(sharpSideB);
  const totalImplied = impA + impB;
  const vigPct = Number(((totalImplied - 1) * 100).toFixed(2));

  const trueProbA = impA / totalImplied;
  const trueProbB = impB / totalImplied;

  return {
    trueProbA,
    trueProbB,
    fairOddsA: probToAmerican(trueProbA),
    fairOddsB: probToAmerican(trueProbB),
    vigPct,
  };
}

export function calculateEVAndKelly(
  trueWinProb: number,
  targetAmericanOdds: number,
  bankroll: number = 1000,
  kellyFraction: number = 0.25
) {
  const decimalOdds = americanToDecimal(targetAmericanOdds);
  const b = decimalOdds - 1;
  const q = 1 - trueWinProb;

  const ev = trueWinProb * b - q;
  const evPercentage = Number((ev * 100).toFixed(2));

  const fullKelly = (b * trueWinProb - q) / b;
  const adjustedKelly = Math.max(0, fullKelly * kellyFraction);
  const recommendedBetSize = Number((bankroll * adjustedKelly).toFixed(2));

  return {
    evPercentage,
    recommendedBetSize,
    isPositiveEV: evPercentage > 0,
  };
}
