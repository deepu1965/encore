import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormProps, type FieldValues } from 'react-hook-form';
import type { z } from 'zod';

/**
 * Thin wrapper standardizing React Hook Form + Zod across the app so every
 * form uses one schema language for validation (and, later, the same Zod
 * schemas back API request/response typing). Feature forms call
 * `useZodForm(schema, options)` instead of wiring the resolver each time.
 */
export function useZodForm<TSchema extends z.ZodType<FieldValues>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.input<TSchema>>, 'resolver'>,
) {
  return useForm<z.input<TSchema>>({
    ...options,
    // Cast is required because RHF's resolver generics don't perfectly line
    // up with zodResolver's inferred output type in strict mode.
    resolver: zodResolver(schema) as never,
  });
}
