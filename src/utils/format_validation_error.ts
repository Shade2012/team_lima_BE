import { ValidationError } from "class-validator";

export function formatValidationErrors(errors: ValidationError[]) {
  const result: { field: string; error: string }[] = [];

  for (const err of errors) {
    if (err.constraints) {
      result.push({
        field: err.property,
        error: Object.values(err.constraints).join(', '),
      });
    }

    // Recursively handle nested array/object errors (@ValidateNested)
    if (err.children && err.children.length > 0) {
      const childErrors = formatValidationErrors(err.children);
      for (const child of childErrors) {
        result.push({
          field: `${err.property}.${child.field}`,
          error: child.error,
        });
      }
    }
  }

  return result;
}