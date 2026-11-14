import { useCallback, useLayoutEffect, useRef, useState } from "react";

const MAX_LANES = 3;
const LANE_GAP = 6;
const CURVE = 6;

/**
 * Draws the thread lines in the side gutters of the chat.
 *
 * Every thread gets a vertical rail on the side of its root message. The rail starts at the
 * root bubble, runs down past every reply, and branches into each reply on the same side.
 * Replies on the other side get a dot on the rail at their height. Overlapping threads are
 * put in separate lanes so their lines don't sit on top of each other.
 */
export default function ThreadRails({ messages, myId, activeThreadId }) {
  const [rails, setRails] = useState([]);
  // The svg's own ref, not one passed from the parent: a child's layout effect runs before the
  // parent element's ref is attached, so the container is reached through parentElement instead.
  const svgRef = useRef(null);

  const measure = useCallback(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;

    // group loaded messages by thread
    const threads = new Map();
    for (const m of messages) {
      if (m.parentId) {
        if (!threads.has(m.parentId)) threads.set(m.parentId, { rootId: m.parentId, replies: [] });
        threads.get(m.parentId).replies.push(m);
      }
    }
    if (!threads.size) {
      setRails([]);
      return;
    }

    const box = container.getBoundingClientRect();
    const gutter = parseFloat(getComputedStyle(container).paddingLeft) || 16;
    const width = box.width;
    const byId = new Map(messages.map((m) => [m._id, m]));

    const rectOf = (id) => {
      const el = container.querySelector(`[data-bubble="${CSS.escape(id)}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top - box.top, bottom: r.bottom - box.top, left: r.left - box.left, right: r.right - box.left };
    };

    const result = [];
    for (const thread of threads.values()) {
      const root = byId.get(thread.rootId);
      const rootRect = root ? rectOf(root._id) : null;
      // root is on an older page that isn't loaded: the rail comes in from the top
      const side = root ? (root.senderId === myId ? "right" : "left") : thread.replies[0].senderId === myId ? "right" : "left";
      const startY = rootRect ? rootRect.top + Math.min(18, (rootRect.bottom - rootRect.top) / 2) : 0;

      const nodes = thread.replies
        .map((reply) => {
          const rect = rectOf(reply._id);
          if (!rect) return null;
          const replySide = reply.senderId === myId ? "right" : "left";
          return {
            id: reply._id,
            y: rect.top + Math.min(18, (rect.bottom - rect.top) / 2),
            edge: replySide === side ? (side === "left" ? rect.left : rect.right) : null,
          };
        })
        .filter(Boolean);
      if (!nodes.length) continue;

      result.push({
        id: thread.rootId,
        side,
        startY,
        rootEdge: rootRect ? (side === "left" ? rootRect.left : rootRect.right) : null,
        endY: nodes[nodes.length - 1].y,
        nodes,
      });
    }

    // lanes: a thread takes the innermost lane that is free over its vertical span
    for (const side of ["left", "right"]) {
      const laneEnds = [];
      result
        .filter((r) => r.side === side)
        .sort((a, b) => a.startY - b.startY)
        .forEach((rail) => {
          let lane = laneEnds.findIndex((end) => end < rail.startY - 4);
          if (lane === -1) lane = Math.min(laneEnds.length, MAX_LANES - 1);
          laneEnds[lane] = Math.max(laneEnds[lane] ?? 0, rail.endY);
          const inset = Math.max(4, gutter * 0.55 - lane * LANE_GAP);
          rail.x = side === "left" ? inset : width - inset;
        });
    }

    setRails(result);
  }, [messages, myId]);

  useLayoutEffect(() => {
    // measuring the DOM after render is what layout effects are for; the rails must match the bubbles
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
    const container = svgRef.current?.parentElement;
    if (!container) return;
    // re-measure when images load, the window resizes, or bubbles change size
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    // new bubbles animate in with a transform, which ResizeObserver doesn't see
    const settle = setTimeout(measure, 450);
    return () => {
      observer.disconnect();
      clearTimeout(settle);
    };
  }, [measure]);

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      {rails.map((rail) => {
        const active = rail.id === activeThreadId;
        const dir = rail.side === "left" ? 1 : -1; // direction from rail towards the bubbles
        const x = rail.x;

        // root -> rail -> down to the last reply
        let d = "";
        if (rail.rootEdge !== null) {
          d += `M ${rail.rootEdge} ${rail.startY} H ${x + dir * CURVE} Q ${x} ${rail.startY} ${x} ${rail.startY + CURVE} `;
        } else {
          d += `M ${x} ${rail.startY} `;
        }
        const last = rail.nodes[rail.nodes.length - 1];
        d += `V ${last.y - (last.edge !== null ? CURVE : 0)} `;
        if (last.edge !== null) d += `Q ${x} ${last.y} ${x + dir * CURVE} ${last.y} H ${last.edge}`;

        // branches into the replies above the last one
        const branches = rail.nodes
          .slice(0, -1)
          .filter((n) => n.edge !== null)
          .map((n) => `M ${x} ${n.y - CURVE} Q ${x} ${n.y} ${x + dir * CURVE} ${n.y} H ${n.edge}`)
          .join(" ");

        const stroke = active ? "var(--accent)" : "color-mix(in oklab, var(--accent) 45%, transparent)";
        return (
          <g key={rail.id} style={{ transition: "opacity 0.2s" }}>
            <path d={d} fill="none" stroke={stroke} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
            {branches && (
              <path d={branches} fill="none" stroke={stroke} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
            )}
            {rail.nodes
              .filter((n) => n.edge === null)
              .map((n) => (
                <circle key={n.id} cx={x} cy={n.y} r={active ? 3.5 : 3} fill={stroke} />
              ))}
          </g>
        );
      })}
    </svg>
  );
}
