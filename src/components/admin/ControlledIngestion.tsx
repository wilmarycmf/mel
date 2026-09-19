import { useState } from 'react';
import {
  approveControlledCandidate,
  processControlledSource,
  rejectControlledCandidate,
  type ControlledCandidate,
} from '../../services/api';
import { Button } from '../ui-mini';


type ReviewState =
  | { kind: 'IDLE' }
  | { kind: 'PROCESSING' }
  | { kind: 'PENDING_REVIEW'; candidate: ControlledCandidate }
  | { kind: 'NOT_READY'; reason: string }
  | { kind: 'REJECTED'; reason?: string }
  | { kind: 'PUBLISHED'; candidate: ControlledCandidate };

export function ControlledIngestion(): JSX.Element {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ReviewState>({ kind: 'IDLE' });

  async function processSource() {
    setState({ kind: 'PROCESSING' });
    try {
      const result = await processControlledSource(url);
      if (result.status === 'PENDING_REVIEW') {
        setState({ kind: 'PENDING_REVIEW', candidate: result.candidate });
      } else if (result.status === 'NOT_READY') {
        setState({ kind: 'NOT_READY', reason: result.reason });
      } else {
        setState({ kind: 'REJECTED', reason: result.reason });
      }
    } catch {
      setState({ kind: 'NOT_READY', reason: 'SOURCE_UNREACHABLE' });
    }
  }

  async function approve() {
    if (state.kind !== 'PENDING_REVIEW') return;
    const candidate = await approveControlledCandidate(state.candidate.id);
    setState({ kind: 'PUBLISHED', candidate });
  }

  async function reject() {
    if (state.kind !== 'PENDING_REVIEW') return;
    await rejectControlledCandidate(state.candidate.id);
    setState({ kind: 'REJECTED' });
  }

  const candidate = state.kind === 'PENDING_REVIEW' || state.kind === 'PUBLISHED' ? state.candidate : null;

  return (
    <section aria-label="Source Review">
      <h2>Source Review</h2>
      <label>
        SOURCE URL
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          aria-label="Source URL"
        />
      </label>
      <Button onClick={() => void processSource()} disabled={state.kind === 'PROCESSING'}>
        {state.kind === 'PROCESSING' ? 'PROCESSING' : 'PROCESS SOURCE'}
      </Button>

      {state.kind === 'NOT_READY' ? <p>NOT READY — {state.reason}</p> : null}
      {state.kind === 'REJECTED' ? <p>REJECTED{state.reason ? ` — ${state.reason}` : ''}</p> : null}
      {state.kind === 'PUBLISHED' ? <p>PUBLISHED</p> : null}

      {candidate ? (
        <div>
          <p>{state.kind === 'PENDING_REVIEW' ? 'PENDING REVIEW' : 'PUBLISHED'}</p>
          <h3>{candidate.title}</h3>
          <p>{candidate.summary}</p>
          <p>Category: {candidate.category}</p>
          <p>Type: {candidate.type}</p>
          <p>Geography: {candidate.country} · {candidate.region}</p>
          {candidate.mainClaim ? <p>Main Claim: {candidate.mainClaim}</p> : null}
          {candidate.sources.map((source) => (
            <p key={source.url}>
              {source.publisher}: <a href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a>
            </p>
          ))}
          {candidate.evidenceQuotes?.length ? (
            <div>
              <p>Evidence</p>
              {candidate.evidenceQuotes.map((quote) => <p key={quote}>{quote}</p>)}
            </div>
          ) : null}
          {state.kind === 'PENDING_REVIEW' ? (
            <>
              <Button onClick={() => void approve()}>APPROVE</Button>
              <Button onClick={() => void reject()} variant="subtle">REJECT</Button>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
