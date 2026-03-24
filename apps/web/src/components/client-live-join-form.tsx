"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ClientLiveJoinForm() {
  const router = useRouter();
  const [runId, setRunId] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = runId.trim();
    if (!id) return;
    router.push(`/live/${encodeURIComponent(id)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="client-live-form">
      <label htmlFor="runId">Run ID</label>
      <input
        id="runId"
        name="runId"
        type="text"
        value={runId}
        onChange={(e) => setRunId(e.target.value)}
        placeholder="Ex: cm9ab12cd0001xyz"
        className="client-live-form__input"
      />
      <button type="submit" className="public-btn public-btn--primary">
        Ouvrir /live/[runId]
      </button>
    </form>
  );
}
