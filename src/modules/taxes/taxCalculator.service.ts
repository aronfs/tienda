export function calculateTaxExcluded(price: number, rate: number) {
  const taxAmount = price * (rate / 100);
  const total = price + taxAmount;
  return { subtotal: price, taxRate: rate, taxAmount, total };
}

export function calculateTaxIncluded(price: number, rate: number) {
  const subtotal = price / (1 + rate / 100);
  const taxAmount = price - subtotal;
  return { subtotal: Math.round(subtotal * 100) / 100, taxRate: rate, taxAmount: Math.round(taxAmount * 100) / 100, total: price };
}

export function calculateLineTotal(quantity: number, unitPrice: number, rate: number, includeTax: boolean): {
  lineSubtotal: number;
  taxRate: number;
  taxAmount: number;
  totalLine: number;
} {
  const lineTotal = quantity * unitPrice;
  if (includeTax) {
    const result = calculateTaxIncluded(lineTotal, rate);
    return { lineSubtotal: result.subtotal, taxRate: rate, taxAmount: result.taxAmount, totalLine: result.total };
  }
  const result = calculateTaxExcluded(lineTotal, rate);
  return { lineSubtotal: result.subtotal, taxRate: rate, taxAmount: result.taxAmount, totalLine: result.total };
}

export function calculateSaleTotals(
  lines: { quantity: number; unitPrice: number; taxRate: number }[],
  includeTax: boolean,
  discount: number = 0
) {
  let subtotal = 0;
  let totalTax = 0;

  for (const line of lines) {
    if (includeTax) {
      const result = calculateTaxIncluded(line.quantity * line.unitPrice, line.taxRate);
      subtotal += result.subtotal;
      totalTax += result.taxAmount;
    } else {
      const result = calculateTaxExcluded(line.quantity * line.unitPrice, line.taxRate);
      subtotal += result.subtotal;
      totalTax += result.taxAmount;
    }
  }

  subtotal = Math.round(subtotal * 100) / 100;
  totalTax = Math.round(totalTax * 100) / 100;

  let discountAmount = discount;
  if (discount > 0) {
    subtotal = subtotal - discount;
  }

  const total = Math.round((subtotal + totalTax) * 100) / 100;

  return { subtotal, taxTotal: totalTax, total, discount: discountAmount };
}