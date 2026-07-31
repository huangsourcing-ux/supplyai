import styles from "./list-skeleton.module.css";

export function ListSkeleton({
  items = 4,
  label,
  layout = "cards",
}: Readonly<{
  items?: number;
  label: string;
  layout?: "cards" | "rows";
}>) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={styles.status}
      role="status"
    >
      <span className={styles.visuallyHidden}>{label}</span>
      <div aria-hidden="true" className={styles.grid} data-layout={layout}>
        {Array.from({ length: items }, (_, index) => (
          <div className={styles.item} key={index}>
            {layout === "cards" ? <div className={styles.media} /> : null}
            <div className={styles.copy}>
              <div className={styles.line} />
              <div className={styles.line} />
              <div className={styles.line} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
