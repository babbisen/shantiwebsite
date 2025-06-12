export const getPickupDateStyles = (
  dateStr: string
): { bg: string; text: string } => {
  if (!dateStr) return { bg: 'bg-transparent', text: 'text-slate-500' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pickupDate = new Date(dateStr + 'T00:00:00');
  pickupDate.setHours(0, 0, 0, 0);

  // Difference in days between today and the pickup date
  const diffMs = pickupDate.getTime() - today.getTime();
  const daysUntilPickup = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Date has passed
  if (daysUntilPickup < 0) {
    return { bg: 'bg-black', text: 'text-white' };
  }

  // Today or tomorrow
  if (daysUntilPickup <= 1) {
    return { bg: 'bg-red-600', text: 'text-white' };
  }

  // 2-4 days away
  if (daysUntilPickup >= 2 && daysUntilPickup <= 4) {
    return { bg: 'bg-orange-500', text: 'text-white' };
  }

  // 5-6 days away
  if (daysUntilPickup >= 5 && daysUntilPickup <= 6) {
    return { bg: 'bg-yellow-400', text: 'text-slate-800' };
  }

  // 7 or more days away
  if (daysUntilPickup >= 7) {
    return { bg: 'bg-green-500', text: 'text-white' };
  }

  return { bg: 'bg-transparent', text: 'text-slate-500' };
};
