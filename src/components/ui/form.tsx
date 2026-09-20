'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { refreshConstraintMessage } from '@/lib/constraint-message';

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('palma-label text-taupe-deep block', className)}
      {...props}
    />
  );
}

/**
 * Field behaviour: the border firms on hover, deepens to the institution's
 * accent on focus, and the whole control lifts a hair — the same tactile
 * language as a button, at input scale.
 */
const fieldBase = [
  'w-full border border-stone-deep bg-ivory-bright px-3.5 py-3 text-[0.9375rem] text-ink',
  'transition-[border-color,box-shadow,transform] duration-200 ease-(--ease-ceremonial)',
  'placeholder:text-taupe hover:border-taupe-deep',
  'focus:border-olive focus:outline-none focus:shadow-[0_1px_0_0_var(--color-olive)]',
  'disabled:opacity-50 aria-[invalid=true]:border-red-800',
].join(' ');

export function Input({ className, onInput, onInvalid, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(fieldBase, 'h-12', className)}
      onInput={(event) => {
        refreshConstraintMessage(event.currentTarget);
        onInput?.(event);
      }}
      onInvalid={(event) => {
        refreshConstraintMessage(event.currentTarget);
        onInvalid?.(event);
      }}
      {...props}
    />
  );
}

export function Textarea({
  className,
  onInput,
  onInvalid,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(fieldBase, 'min-h-32 resize-y leading-relaxed', className)}
      onInput={(event) => {
        refreshConstraintMessage(event.currentTarget);
        onInput?.(event);
      }}
      onInvalid={(event) => {
        refreshConstraintMessage(event.currentTarget);
        onInvalid?.(event);
      }}
      {...props}
    />
  );
}

/**
 * A select whose open list PALMA controls.
 *
 * A native `<select>` can be styled shut and not open: the popup is drawn by
 * the operating system, in the operating system's own typeface and blue
 * highlight, and no stylesheet reaches it. On a site that sets its own type
 * everywhere else, that popup is the one place the institution stops and
 * Windows starts.
 *
 * So the list is ours. The API is deliberately unchanged — pass `<option>`
 * children exactly as before, and `onChange` still receives something with
 * `event.target.value` — because twenty-seven call sites should not have to
 * know that the thing underneath them changed.
 *
 * Two details worth keeping in mind. The underlying primitive refuses an empty
 * string as an item value, and PALMA uses `<option value="">` in a dozen
 * places to mean "none", so empties travel through the list as a sentinel and
 * are turned back at the edges. And what a form actually submits is the hidden
 * input below rather than anything the primitive manages, so the value posted
 * is always the real one, sentinel included.
 */
type OptionData = { value: string; label: React.ReactNode; disabled?: boolean };

const EMPTY_SENTINEL = '__palma_empty__';
const toItem = (value: string) => (value === '' ? EMPTY_SENTINEL : value);
const fromItem = (value: string) => (value === EMPTY_SENTINEL ? '' : value);

function readOptions(children: React.ReactNode): OptionData[] {
  const found: OptionData[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === 'optgroup') {
      found.push(...readOptions((child.props as React.ComponentProps<'optgroup'>).children));
      return;
    }
    if (child.type !== 'option') return;

    const option = child.props as React.ComponentProps<'option'>;
    found.push({
      value: String(option.value ?? ''),
      label: option.children,
      disabled: option.disabled,
    });
  });

  return found;
}

export function Select({
  className,
  children,
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  required,
  'aria-invalid': ariaInvalid,
  ...props
}: React.ComponentProps<'select'>) {
  const options = React.useMemo(() => readOptions(children), [children]);
  const controlled = value !== undefined;

  const [internal, setInternal] = React.useState(() =>
    defaultValue !== undefined ? String(defaultValue) : (options[0]?.value ?? ''),
  );

  const current = controlled ? String(value) : internal;

  function handle(next: string) {
    const real = fromItem(next);
    if (!controlled) setInternal(real);
    // Existing handlers read `event.target.value`, so hand them that shape
    // rather than making every call site learn a new one.
    onChange?.({
      target: { value: real, name: name ?? '' },
      currentTarget: { value: real, name: name ?? '' },
    } as unknown as React.ChangeEvent<HTMLSelectElement>);
  }

  const selected = options.find((option) => option.value === current);

  return (
    <SelectPrimitive.Root
      value={toItem(current)}
      onValueChange={handle}
      disabled={disabled}
      required={required}
    >
      {/* What the form posts. The primitive manages the listbox; the value on
          the wire stays ours, so an empty option posts an empty string. */}
      {name ? <input type="hidden" name={name} value={current} /> : null}

      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={ariaInvalid}
        className={cn(
          fieldBase,
          'flex h-12 items-center justify-between gap-3 text-left',
          'data-[placeholder]:text-taupe',
          className,
        )}
        {...(props as React.ComponentProps<typeof SelectPrimitive.Trigger>)}
      >
        <SelectPrimitive.Value>{selected?.label}</SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            className="text-taupe size-3.5 shrink-0 transition-transform duration-200 ease-(--ease-ceremonial)"
            aria-hidden="true"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'border-stone-deep bg-ivory-bright text-ink z-50 overflow-hidden border shadow-[0_18px_40px_-24px_rgba(28,26,23,0.5)]',
            'max-h-72 min-w-(--radix-select-trigger-width)',
            'motion-safe:data-[state=open]:animate-(--animate-rise)',
          )}
        >
          <SelectPrimitive.ScrollUpButton className="text-taupe flex h-6 items-center justify-center">
            <ChevronUp className="size-3.5" aria-hidden="true" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value || EMPTY_SENTINEL}
                value={toItem(option.value)}
                disabled={option.disabled}
                className={cn(
                  'relative flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-[0.9375rem] outline-none select-none',
                  'data-[highlighted]:bg-stone/50 data-[highlighted]:text-ink',
                  'data-[state=checked]:text-olive data-[state=checked]:font-medium',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
                )}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator asChild>
                  <Check className="text-olive size-3.5 shrink-0" aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="text-taupe flex h-6 items-center justify-center">
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'border-stone-deep bg-ivory-bright mt-0.5 size-4.5 shrink-0 appearance-none border transition-colors',
        'checked:border-olive checked:bg-olive',
        "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 10%22 fill=%22none%22 stroke=%22%23F4F0E8%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M1 5 4.5 8.5 11 1.5%22/></svg>')] checked:bg-[length:11px] checked:bg-center checked:bg-no-repeat",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn('palma-field-shell flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor} className="palma-field-label">
        {label}
        {required ? <span className="text-champagne-deep ml-1">*</span> : null}
      </Label>
      {hint ? (
        <p id={hintId} className="text-taupe-deep text-[0.8125rem] leading-relaxed">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-[0.8125rem] font-medium text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckboxField({
  id,
  name,
  label,
  description,
  error,
  defaultChecked,
  disabled,
}: {
  id: string;
  name: string;
  label: string;
  description?: string;
  error?: string;
  defaultChecked?: boolean;
  /** A choice that is not currently available to make. */
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn('flex items-start gap-3', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
      >
        <Checkbox
          id={id}
          name={name}
          defaultChecked={defaultChecked}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={description ? `${id}-description` : undefined}
        />
        <span className="text-ink text-[0.9375rem] leading-relaxed">
          {label}
          {description ? (
            <span id={`${id}-description`} className="text-taupe-deep mt-1 block text-[0.8125rem]">
              {description}
            </span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p role="alert" className="pl-7.5 text-[0.8125rem] font-medium text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
