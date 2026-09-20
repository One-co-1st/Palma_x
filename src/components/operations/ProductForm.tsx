'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { saveProduct, type ProductState } from '@/server/actions/product-library';

const initial: ProductState = { status: 'idle' };

/**
 * Writing a Library entry.
 *
 * Strengths and limitations are both required, and the form says why: an entry
 * with strengths and no limitations is an advertisement, and the Library's only
 * claim is that it is not one.
 *
 * There is no sponsor field on this form. Recording a partner is a separate
 * action against separate columns, so an editor writing a verdict is never
 * looking at who paid while they write it.
 */
export function ProductForm({
  categories,
  sponsors,
}: {
  categories: { key: string; label: string; note: string }[];
  sponsors: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(saveProduct, initial);

  return (
    <form action={action} className="flex max-w-200 flex-col gap-7">
      {state.status !== 'idle' ? (
        <Notice
          tone={state.status === 'error' ? 'error' : 'ceremonial'}
          title={state.status === 'error' ? 'Not saved' : 'Saved'}
        >
          {state.message}
          {state.status === 'error' && state.objections ? (
            <ul className="mt-3 flex flex-col gap-1.5">
              {state.objections.map((objection) => (
                <li key={objection}>{objection}</li>
              ))}
            </ul>
          ) : null}
        </Notice>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field htmlFor="brand" label="Brand">
          <Input id="brand" name="brand" required maxLength={80} />
        </Field>
        <Field htmlFor="name" label="Product">
          <Input id="name" name="name" required maxLength={120} />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field htmlFor="category" label="Category">
          <Select id="category" name="category" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {categories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          htmlFor="verdict"
          label="PALMA verdict"
          hint="Out of ten, one decimal place. An entry without one is a listing."
        >
          <Input id="verdict" name="verdict" type="number" min={0} max={10} step={0.1} />
        </Field>
      </div>

      <Field htmlFor="bestFor" label="Best for" hint="The line most readers act on. One sentence.">
        <Input id="bestFor" name="bestFor" maxLength={200} />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field htmlFor="strengths" label="Strengths" hint="One per line.">
          <Textarea id="strengths" name="strengths" rows={4} />
        </Field>
        <Field
          htmlFor="limitations"
          label="Limitations"
          hint="One per line. Required: an entry with none is an advertisement."
        >
          <Textarea id="limitations" name="limitations" rows={4} />
        </Field>
      </div>

      <Field
        htmlFor="review"
        label="The review"
        hint="At least 200 characters. A verdict without reasoning is a rating."
      >
        <Textarea id="review" name="review" rows={8} />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          htmlFor="testedBy"
          label="Tested by"
          hint="Who at PALMA actually used it, where that is true. Leave blank otherwise."
        >
          <Input id="testedBy" name="testedBy" maxLength={120} />
        </Field>

        <Field
          htmlFor="externalUrl"
          label="Where to find it"
          hint="Plain https, no query string. PALMA publishes no affiliate or tracking links."
        >
          <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://" />
        </Field>
      </div>

      <label className="border-stone-deep flex items-start gap-3 border-t pt-6 text-sm">
        <input type="checkbox" name="publish" className="mt-0.5" />
        <span className="text-taupe-deep leading-relaxed">
          Publish. Everything above must be complete, including at least one limitation. Leave this
          unticked to keep it as a draft.
        </span>
      </label>

      <div className="flex items-center gap-4">
        <Button type="submit" size="md" disabled={pending}>
          {pending ? 'Saving…' : 'Save entry'}
        </Button>
        {sponsors.length > 0 ? (
          <span className="text-taupe text-xs leading-relaxed">
            A partner is recorded separately, after the verdict is written.
          </span>
        ) : null}
      </div>
    </form>
  );
}
