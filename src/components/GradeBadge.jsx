export default function GradeBadge({ grade, sources, sd, titleFn }) {
  if (!grade) return <span className="muted">—</span>
  const title = titleFn ? titleFn(sources ?? 0, sd) : `Independent sources ${sources ?? 0}${sd != null ? `; SD ${sd}` : ''}`
  return (
    <span className={`badge badge-${grade.toLowerCase()}`} title={title} aria-label={title}>
      {grade}
    </span>
  )
}
