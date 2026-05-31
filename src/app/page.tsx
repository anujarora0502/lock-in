"use client";

import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Clock3,
  Flame,
  Pencil,
  Plus,
  TimerReset,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type LockType = {
  id: string;
  name: string;
  color: string;
};

type LockSession = {
  id: string;
  type_id: string | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  lock_in_types?: Pick<LockType, "id" | "name" | "color"> | null;
};

type SupabaseLockSession = Omit<LockSession, "lock_in_types"> & {
  lock_in_types?: Pick<LockType, "id" | "name" | "color"> | Pick<LockType, "id" | "name" | "color">[] | null;
};

type DayStat = {
  date: Date;
  key: string;
  seconds: number;
};

const colors = ["#111827", "#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#ea580c"];


function dateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function longDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours === 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }

  return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
}

function buildDayWindow(page: number): DayStat[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOffset = page * 10;

  return Array.from({ length: 10 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - endOffset - (9 - index));

    return {
      date,
      key: dateKey(date),
      seconds: 0,
    };
  });
}

function normalizeSession(session: SupabaseLockSession): LockSession {
  return {
    ...session,
    lock_in_types: Array.isArray(session.lock_in_types)
      ? session.lock_in_types[0] ?? null
      : session.lock_in_types ?? null,
  };
}

function splitSessionByDay(startedAt: Date, endedAt: Date) {
  const segments: Array<{ startedAt: Date; endedAt: Date; duration: number }> = [];
  let segmentStart = new Date(startedAt);

  while (segmentStart < endedAt) {
    const nextMidnight = new Date(segmentStart);
    nextMidnight.setHours(24, 0, 0, 0);
    const segmentEnd = nextMidnight < endedAt ? nextMidnight : endedAt;
    const duration = Math.max(1, Math.round((segmentEnd.getTime() - segmentStart.getTime()) / 1000));

    segments.push({
      startedAt: new Date(segmentStart),
      endedAt: new Date(segmentEnd),
      duration,
    });
    segmentStart = new Date(segmentEnd);
  }

  return segments;
}

export default function Home() {
  const [types, setTypes] = useState<LockType[]>([]);
  const [sessions, setSessions] = useState<LockSession[]>([]);
  const [selectedType, setSelectedType] = useState<string>("total");
  const [recordType, setRecordType] = useState<string>("");
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState(colors[0]);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState("");
  const [editTypeColor, setEditTypeColor] = useState(colors[0]);
  const [recordingStartedAt, setRecordingStartedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const [page, setPage] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [appMessage, setAppMessage] = useState("");


  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    const [{ data: typeRows, error: typeError }, { data: sessionRows, error: sessionError }] = await Promise.all([
      supabase
        .from("lock_in_types")
        .select("id,name,color")
        .order("created_at", { ascending: true }),
      supabase
        .from("lock_in_sessions")
        .select("id,type_id,started_at,ended_at,duration_seconds,lock_in_types(id,name,color)")
        .order("started_at", { ascending: false }),
    ]);

    if (typeError || sessionError) {
      setAppMessage(typeError?.message ?? sessionError?.message ?? "Could not load lock-in data.");
      return;
    }

    setTypes(typeRows ?? []);
    setSessions(((sessionRows ?? []) as unknown as SupabaseLockSession[]).map(normalizeSession));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function addType() {
    if (!newTypeName.trim()) {
      setAppMessage("Enter a lock-in type name first.");
      return;
    }

    setIsBusy(true);
    setAppMessage("");
    const { data, error } = await supabase
      .from("lock_in_types")
      .insert({
        name: newTypeName.trim(),
        color: newTypeColor,
      })
      .select("id,name,color")
      .single();

    setIsBusy(false);

    if (error || !data) {
      setAppMessage(error?.message ?? "Could not add that lock-in type.");
      return;
    }

    setTypes((current) => [...current, data]);
    setRecordType(data.id);
    setNewTypeName("");
    setAppMessage(`Added ${data.name}.`);
  }

  function startEditingType(type: LockType) {
    setEditingTypeId(type.id);
    setEditTypeName(type.name);
    setEditTypeColor(type.color);
    setAppMessage("");
  }

  function cancelEditingType() {
    setEditingTypeId(null);
    setEditTypeName("");
    setEditTypeColor(colors[0]);
  }

  async function updateType() {
    if (!editingTypeId) {
      return;
    }

    if (!editTypeName.trim()) {
      setAppMessage("Enter a lock-in type name first.");
      return;
    }

    setIsBusy(true);
    setAppMessage("");
    const { data, error } = await supabase
      .from("lock_in_types")
      .update({
        name: editTypeName.trim(),
        color: editTypeColor,
      })
      .eq("id", editingTypeId)
      .select("id,name,color")
      .single();

    setIsBusy(false);

    if (error || !data) {
      setAppMessage(error?.message ?? "Could not update that lock-in type.");
      return;
    }

    setTypes((current) => current.map((type) => (type.id === data.id ? data : type)));
    setSessions((current) =>
      current.map((session) =>
        session.type_id === data.id
          ? {
              ...session,
              lock_in_types: data,
            }
          : session,
      ),
    );
    cancelEditingType();
    setAppMessage(`Updated ${data.name}.`);
  }

  function startRecording() {
    setAppMessage("");
    setRecordingStartedAt(new Date());
  }

  async function stopRecording() {
    if (!recordingStartedAt) {
      setAppMessage("No active recording to stop.");
      return;
    }

    const endedAt = new Date();
    const activeRecordType = recordType || types[0]?.id || null;
    const segments = splitSessionByDay(recordingStartedAt, endedAt);

    setIsBusy(true);
    setAppMessage("");
    const { data, error } = await supabase
      .from("lock_in_sessions")
      .insert(segments.map((segment) => ({
        type_id: activeRecordType,
        started_at: segment.startedAt.toISOString(),
        ended_at: segment.endedAt.toISOString(),
        duration_seconds: segment.duration,
      })))
      .select("id,type_id,started_at,ended_at,duration_seconds,lock_in_types(id,name,color)")
      .order("started_at", { ascending: false });

    setIsBusy(false);

    if (error || !data) {
      setAppMessage(error?.message ?? "Could not save this session.");
      return;
    }

    const newSessions = (data as unknown as SupabaseLockSession[]).map(normalizeSession);
    setSessions((current) => [...newSessions, ...current]);
    setRecordingStartedAt(null);
    setPage(0);
    setAppMessage("Session saved.");
  }

  const selectedSessions = useMemo(() => {
    if (selectedType === "total") {
      return sessions;
    }

    return sessions.filter((session) => session.type_id === selectedType);
  }, [selectedType, sessions]);

  const days = useMemo(() => {
    const windowDays = buildDayWindow(page);
    const totals = new Map(windowDays.map((day) => [day.key, day.seconds]));

    selectedSessions.forEach((session) => {
      const key = dateKey(new Date(session.started_at));
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) ?? 0) + session.duration_seconds);
      }
    });

    return windowDays.map((day) => ({
      ...day,
      seconds: totals.get(day.key) ?? 0,
    }));
  }, [page, selectedSessions]);

  const bestDay = useMemo(() => {
    const totals = new Map<string, DayStat>();

    selectedSessions.forEach((session) => {
      const date = new Date(session.started_at);
      date.setHours(0, 0, 0, 0);
      const key = dateKey(date);
      const current = totals.get(key);

      totals.set(key, {
        date,
        key,
        seconds: (current?.seconds ?? 0) + session.duration_seconds,
      });
    });

    return [...totals.values()].sort((a, b) => b.seconds - a.seconds)[0] ?? null;
  }, [selectedSessions]);

  const todaySeconds = selectedSessions.reduce((sum, session) => {
    if (dateKey(new Date(session.started_at)) !== dateKey(new Date())) {
      return sum;
    }

    return sum + session.duration_seconds;
  }, 0);
  const maxDaySeconds = Math.max(1, ...days.map((day) => day.seconds));
  const activeRecordType = recordType || types[0]?.id || "";
  const activeSeconds = recordingStartedAt
    ? Math.max(0, Math.round((now.getTime() - recordingStartedAt.getTime()) / 1000))
    : 0;

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Today is for focus</p>
          <h1>Lock In</h1>
        </div>
      </header>

      <section className="record-panel">
        <div>
          <p className="eyebrow">Current session</p>
          <strong>{recordingStartedAt ? formatTimer(activeSeconds) : "Ready"}</strong>
        </div>
        <select
          value={activeRecordType}
          onChange={(event) => setRecordType(event.target.value)}
          disabled={types.length === 0 || Boolean(recordingStartedAt)}
        >
          {types.length === 0 ? (
            <option value="">Add a type first</option>
          ) : (
            types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))
          )}
        </select>
        <button
          className={recordingStartedAt ? "record-button stop" : "record-button"}
          disabled={isBusy || types.length === 0}
          onClick={recordingStartedAt ? stopRecording : startRecording}
        >
          {recordingStartedAt ? <CircleStop size={22} /> : <Clock3 size={22} />}
          {recordingStartedAt ? "Stop" : "Record"}
        </button>
      </section>

      {appMessage && (
        <p className="app-message" role="status">
          {appMessage}
        </p>
      )}

      <section className="dashboard-grid">
        <div className="main-column">
          <section className="summary-grid">
            <div className="metric-card ink">
              <Flame size={22} />
              <span>Today locked in</span>
              <strong>{formatDuration(todaySeconds)}</strong>
            </div>
            <div className="metric-card">
              <CalendarDays size={22} />
              <span>Best day</span>
              <strong>{bestDay ? formatDuration(bestDay.seconds) : "0m"}</strong>
              <small>{bestDay ? longDayLabel(bestDay.date) : "No sessions yet"}</small>
            </div>
          </section>

          <section className="chart-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Last 10 days</p>
                <h2>{dayLabel(days[0].date)} - {dayLabel(days[9].date)}</h2>
              </div>
              <div className="pager">
                <button aria-label="Previous 10 days" onClick={() => setPage((current) => current + 1)}>
                  <ChevronLeft size={18} />
                </button>
                <button aria-label="Next 10 days" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="bar-chart" aria-label="Lock in time for visible 10 day window">
              {days.map((day) => (
                <div className="bar-item" key={day.key}>
                  <span className="bar-value">{day.seconds ? formatDuration(day.seconds) : ""}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${Math.max(6, (day.seconds / maxDaySeconds) * 100)}%` }}
                    />
                  </div>
                  <span className="bar-label">{dayLabel(day.date)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="side-panel">
          <section>
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Filter</p>
                <h2>Lock-in type</h2>
              </div>
              <BarChart3 size={20} />
            </div>
            <div className="filter-list">
              <button
                className={selectedType === "total" ? "filter-pill active" : "filter-pill"}
                onClick={() => setSelectedType("total")}
              >
                <span className="swatch total" />
                Total
              </button>
              {types.map((type) => (
                <div className="type-control" key={type.id}>
                  <div className="type-row">
                    <button
                      className={selectedType === type.id ? "filter-pill active" : "filter-pill"}
                      onClick={() => setSelectedType(type.id)}
                    >
                      <span className="swatch" style={{ background: type.color }} />
                      {type.name}
                    </button>
                    <button
                      className="mini-icon-button"
                      aria-label={`Edit ${type.name}`}
                      onClick={() => startEditingType(type)}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>

                  {editingTypeId === type.id && (
                    <div className="edit-type-panel">
                      <input
                        value={editTypeName}
                        onChange={(event) => setEditTypeName(event.target.value)}
                        placeholder="Type name"
                      />
                      <div className="color-row compact-colors">
                        {colors.map((color) => (
                          <button
                            key={color}
                            className={editTypeColor === color ? "color-dot selected" : "color-dot"}
                            style={{ background: color }}
                            aria-label={`Use ${color}`}
                            onClick={() => setEditTypeColor(color)}
                          />
                        ))}
                      </div>
                      <div className="edit-actions">
                        <button className="secondary-button" disabled={isBusy} onClick={updateType}>
                          <Check size={18} />
                          Save
                        </button>
                        <button className="quiet-button" disabled={isBusy} onClick={cancelEditingType}>
                          <X size={18} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="add-type">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">New type</p>
                <h2>Add focus lane</h2>
              </div>
              <Plus size={20} />
            </div>
            <input
              value={newTypeName}
              onChange={(event) => setNewTypeName(event.target.value)}
              placeholder="Study, Work, Reading"
            />
            <div className="color-row">
              {colors.map((color) => (
                <button
                  key={color}
                  className={newTypeColor === color ? "color-dot selected" : "color-dot"}
                  style={{ background: color }}
                  aria-label={`Use ${color}`}
                  onClick={() => setNewTypeColor(color)}
                />
              ))}
            </div>
            <button className="secondary-button" disabled={isBusy} onClick={addType}>
              <Plus size={18} />
              Add type
            </button>
          </section>

          <section className="recent-list">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Recent</p>
                <h2>Sessions</h2>
              </div>
              <TimerReset size={20} />
            </div>
            {sessions.slice(0, 5).map((session) => (
              <div className="recent-row" key={session.id}>
                <span
                  className="swatch"
                  style={{ background: session.lock_in_types?.color ?? "#111827" }}
                />
                <div>
                  <strong>{session.lock_in_types?.name ?? "Unsorted"}</strong>
                  <small>{dayLabel(new Date(session.started_at))}</small>
                </div>
                <span>{formatDuration(session.duration_seconds)}</span>
              </div>
            ))}
            {sessions.length === 0 && <p className="empty-text">Your completed sessions will appear here.</p>}
          </section>
        </aside>
      </section>
    </main>
  );
}
