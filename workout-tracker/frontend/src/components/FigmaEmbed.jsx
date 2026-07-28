// src/components/FigmaEmbed.jsx
import React from "react";
import styles from "./FigmaEmbed.module.css";

/**
 * Props
 *   src        – the full embed URL (required)
 *   width      - CSS width
 *   height     - CSS height
 *   className  – optional extra class names
 */
export const FigmaEmbed = ({
  src,
  width = "var(--size-800)",
  height = "var(--size-450)",
  className,
}) => {
  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <iframe
        src={src}
        style={{
          border: "var(--size-1) solid rgb(var(--color-black-rgb) / var(--opacity-0-1))",
          width,
          height,
        }}
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
};
