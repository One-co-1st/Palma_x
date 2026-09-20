'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, THead } from '@/components/ui/table';
import {
  commitCreatorImport,
  previewCreatorImport,
  type ImportState,
} from '@/server/actions/import';

const initial: ImportState = { status: 'idle' };

const SAMPLE = `name\tcountry\tcity\theadline\tlinks
Ama Mensah\tGH\tAccra\tDocumentary shorts on informal economies\thttps://youtube.com/@example
Ruairi Doyle\tIE\tCork\tLong-form audio essays\thttps://example.com https://open.spotify.com/show/x`;

/**
 * Preview, then commit.
 *
 * Two actions over one textarea rather than a wizard: the operator sees
 * exactly what would be written before anything is, and the same text is sent
 * to both — so what the preview promised is what the import does.
 */
export function CreatorImportForm() {
  const [preview, previewAction, previewing] = useActionState(previewCreatorImport, initial);
  const [commit, commitAction, committing] = useActionState(commitCreatorImport, initial);
  const [rows, setRows] = React.useState('');

  const state = commit.status !== 'idle' ? commit : preview;
  const plan = preview.preview;
  const done = commit.status === 'success';

  return (
    <div className="flex flex-col gap-8">
      {state.status !== 'idle' && state.message ? (
        <Notice
          tone={state.status === 'error' ? 'error' : done ? 'ceremonial' : 'neutral'}
          title={state.status === 'error' ? 'Not imported' : done ? 'Imported' : 'Preview'}
        >
          {state.message}
        </Notice>
      ) : null}

      {done ? null : (
        <>
          <form action={previewAction} className="flex flex-col gap-5">
            <Field
              htmlFor="rows"
              label="The list"
              required
              hint="One creator per line: name, country, city, headline, links. Tab-separated (paste from a spreadsheet) or comma-separated. City and headline are accepted so your existing list pastes cleanly. They are read, shown in the preview, and not stored on an unclaimed record."
            >
              <Textarea
                id="rows"
                name="rows"
                className="min-h-64 font-mono text-xs"
                value={rows}
                onChange={(event) => setRows(event.target.value)}
                placeholder={SAMPLE}
                required
              />
            </Field>

            <Button
              type="submit"
              variant="outline"
              size="md"
              disabled={previewing}
              className="self-start"
            >
              {previewing ? 'Reading…' : 'Preview the import'}
            </Button>
          </form>

          {plan && plan.problems.length > 0 ? (
            <div>
              <h3 className="palma-label text-taupe-deep mb-3">Lines PALMA could not read</h3>
              <ul className="border-stone-deep flex flex-col border-t">
                {plan.problems.map((problem, index) => (
                  <li
                    key={`${problem.line}-${index}`}
                    className="border-stone-deep/60 flex flex-wrap gap-x-4 border-b py-3 text-sm"
                  >
                    <span className="palma-label text-champagne-deep">
                      {problem.line === 0 ? 'List' : `Line ${problem.line}`}
                    </span>
                    <span className="text-taupe-deep">{problem.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="text-taupe mt-3 text-xs leading-relaxed">
                These are skipped, not guessed at. Fix them and preview again, or import the rest.
              </p>
            </div>
          ) : null}

          {plan && plan.rows.length > 0 ? (
            <div>
              <h3 className="palma-label text-taupe-deep mb-4">What would be written</h3>
              <Table>
                <THead>
                  <tr>
                    <th scope="col">Line</th>
                    <th scope="col">Name</th>
                    <th scope="col">Country</th>
                    <th scope="col">Links</th>
                    <th scope="col">Status</th>
                    <th scope="col">Not stored</th>
                  </tr>
                </THead>
                <TBody>
                  {plan.rows.map((row) => (
                    <tr key={row.line}>
                      <td className="text-taupe-deep">{row.line}</td>
                      <td className="font-display text-base">{row.displayName}</td>
                      <td className="text-taupe-deep">{row.countryCode}</td>
                      <td className="text-taupe-deep">{row.links}</td>
                      <td>
                        {row.exists ? (
                          <Badge variant="muted">Already in the archive</Badge>
                        ) : (
                          <Badge variant="olive">New</Badge>
                        )}
                      </td>
                      <td className="text-taupe-deep text-xs">
                        {row.dropped.length > 0 ? row.dropped.join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : null}

          {plan && plan.writable > 0 ? (
            <form
              action={commitAction}
              className="border-stone-deep flex flex-col gap-5 border-t pt-8"
            >
              <input type="hidden" name="rows" value={rows} />

              <Notice tone="warning" title="What this writes">
                {plan.writable} unclaimed, unpublished record{plan.writable === 1 ? '' : 's'}. Names
                already in the archive are left alone, an import never overwrites a record somebody
                may hold. Nothing becomes public until a moderator publishes it.
              </Notice>

              <Field htmlFor="confirm" label="Type IMPORT to confirm" required>
                <Input
                  id="confirm"
                  name="confirm"
                  required
                  autoComplete="off"
                  placeholder="IMPORT"
                />
              </Field>

              <Button type="submit" size="md" disabled={committing} className="self-start">
                {committing ? 'Writing…' : `Import ${plan.writable}`}
              </Button>
            </form>
          ) : null}
        </>
      )}
    </div>
  );
}
