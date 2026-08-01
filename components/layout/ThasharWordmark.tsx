import type { CSSProperties } from "react";
import Image from "next/image";
import styles from "./ThasharWordmark.module.css";

/**
 * Wordmark „Created by THASHAR.DEV" w stopce.
 * Animacja błysku na hoverze jest czysto CSS-owa (bez JS), więc komponent
 * pozostaje serwerowy – Footer.tsx musi być w pełni synchroniczny.
 * `width` nadpisuje szerokość (zmienna --thb-width), np. "90px".
 */
export default function ThasharWordmark({
  width,
  className = "",
}: {
  width?: string;
  className?: string;
}) {
  return (
    <a
      href="https://thashar.dev"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Created by THASHAR.DEV – strona wykonawcy"
      className={`${styles.thb} ${className}`}
      style={width ? ({ "--thb-width": width } as CSSProperties) : undefined}
    >
      <Image
        src="/images/thashar-wordmark.webp"
        alt="Created by THASHAR.DEV"
        width={1024}
        height={290}
        className={styles.img}
      />
    </a>
  );
}
