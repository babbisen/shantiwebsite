export const getPickupDateStyles = (dateStr: string): { bg: string; text: string } => {
  if (!dateStr) return { bg: 'bg-transparent', text: 'text-slate-500' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pickupDate = new Date(dateStr + 'T00:00:00');
  pickupDate.setHours(0, 0, 0, 0);
  const diffTime = pickupDate.getTime() - today.getTime();
  const daysUntilPickup = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysUntilPickup <= 0) return { bg: 'bg-red-600', text: 'text-white' };
  if (daysUntilPickup === 1) return { bg: 'bg-orange-600', text: 'text-white' };
  if (daysUntilPickup === 2) return { bg: 'bg-orange-400', text: 'text-slate-800' };
  if (daysUntilPickup === 3) return { bg: 'bg-yellow-400', text: 'text-slate-800' };
  if (daysUntilPickup === 4) return { bg: 'bg-orange-200', text: 'text-slate-800' };
  if (daysUntilPickup === 5) return { bg: 'bg-green-200', text: 'text-slate-800' };
  if (daysUntilPickup === 6) return { bg: 'bg-green-300', text: 'text-slate-800' };
  if (daysUntilPickup >= 7) return { bg: 'bg-green-500', text: 'text-white' };
  return { bg: 'bg-transparent', text: 'text-slate-500' };
};
