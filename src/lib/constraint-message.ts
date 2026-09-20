/**
 * What the browser says when a field is wrong, said properly.
 *
 * Left alone, the browser writes the message itself: "Please lengthen this
 * text to 20 characters or more (you are currently using 16 characters)."
 * It is accurate and it is nobody's voice. Worse, the wording changes between
 * Chrome, Firefox and Safari, so the one sentence PALMA cannot control is the
 * one a visitor sees at the moment they have made a mistake.
 *
 * `setCustomValidity` replaces the text inside the browser's own bubble. The
 * bubble itself cannot be styled by any stylesheet, so this does not try; it
 * only makes sure the words in it are ours, short, and about what to do next
 * rather than about character counts.
 */
export function constraintMessage(field: HTMLInputElement | HTMLTextAreaElement): string {
  const validity = field.validity;
  const length = field.value.trim().length;

  if (validity.valueMissing) return 'This one is needed.';

  if (validity.tooShort) {
    const min = Number(field.getAttribute('minLength') ?? 0);
    const left = min - length;
    // A password is the one field where saying more is unhelpful, since the
    // rule is the point rather than the length.
    if (field.getAttribute('type') === 'password') {
      return `Twelve characters at least. ${left} to go.`;
    }
    return left === 1 ? 'One more character.' : `A little more. ${left} characters to go.`;
  }

  if (validity.tooLong) {
    const max = Number(field.getAttribute('maxLength') ?? 0);
    return `That is longer than PALMA keeps. Trim it to ${max} characters.`;
  }

  if (validity.typeMismatch) {
    if (field.getAttribute('type') === 'email') return 'That is not an address PALMA can write to.';
    if (field.getAttribute('type') === 'url') return 'That is not a link PALMA can open.';
    return 'That is not the right kind of value.';
  }

  if (validity.patternMismatch) {
    return 'That is not the format PALMA expects here.';
  }

  if (validity.rangeUnderflow || validity.rangeOverflow || validity.stepMismatch) {
    return 'That number is outside what PALMA accepts here.';
  }

  return 'Check this one.';
}

/**
 * Keep the message current.
 *
 * Called on every input and again when the field is found invalid, because the
 * text has to be set before the browser opens the bubble, and cleared the
 * moment it stops being true, or the field stays invalid for ever holding a
 * message about a problem the person has already fixed.
 */
export function refreshConstraintMessage(field: HTMLInputElement | HTMLTextAreaElement): void {
  field.setCustomValidity('');
  if (!field.validity.valid) field.setCustomValidity(constraintMessage(field));
}
