import { useMemo, useState } from "react";
import type { Project } from "../data";

export function useProjectFilter(projects: Project[]) {
  const [query, setQuery] = useState("");

  const allTags = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.tags))).sort(),
    [projects]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      p.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [projects, query]);

  return { query, setQuery, filtered, allTags };
}
