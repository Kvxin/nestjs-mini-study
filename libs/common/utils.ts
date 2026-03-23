import { Decimal } from '@prisma/client/runtime/library';

export function decimalToNumber(value: Decimal | number | string) {
  if (value instanceof Decimal) {
    return value.toNumber();
  }

  return Number(value);
}
