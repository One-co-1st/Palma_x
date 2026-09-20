/**
 * State carried between the three steps of the nomination flow.
 *
 * This lives outside the `'use server'` module deliberately: every export of a
 * server-action file becomes a server reference, so a plain constant exported
 * from there would be fetched from the server on first render.
 */
export type NominationState = {
  step: 'details' | 'verify' | 'done';
  status: 'idle' | 'error' | 'success';
  message?: string;
  errors?: Record<string, string>;
  /** Draft carried between steps. Meaningless without the emailed code. */
  nominationId?: string;
  /** Shown back to the nominator so they know where the code went. */
  email?: string;
  reference?: string;
  creatorName?: string;
  categoryName?: string;
  /** True when the code could not be delivered (development without a key). */
  codeNotDelivered?: boolean;
};

export const initialNominationState: NominationState = { step: 'details', status: 'idle' };
