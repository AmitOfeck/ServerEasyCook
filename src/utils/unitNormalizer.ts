export function normalizeUnit( name: string, unit: string, quantity: number): { name: string; unit: string; quantity: number } {
    const round = (val: number) => Math.round(val * 1000) / 1000;
  
    if (unit === 'gram' && quantity >= 1000) {
      return { name, unit: 'kg', quantity: round(quantity / 1000) };
    }
    if (unit === 'kg' && quantity < 1) {
      return { name, unit: 'gram', quantity: round(quantity * 1000) };
    }
  
    if (unit === 'ml' && quantity >= 1000) {
      return { name, unit: 'liter', quantity: round(quantity / 1000) };
    }
    if (unit === 'liter' && quantity < 1) {
      return { name, unit: 'ml', quantity: round(quantity * 1000) };
    }
  
    return { name, unit, quantity: round(quantity) };
  }
  
  export function convertToBaseUnit(unit: string, quantity: number): number {
    switch (unit) {
      case 'gram':
      case 'ml':
        return quantity;
      case 'kg':
      case 'liter':
        return quantity * 1000;
      default:
        return quantity;
    }
  }
  