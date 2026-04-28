// src/components/FigmaEmbed.jsx
import React from "react";
import styles from "./FigmaEmbed.module.css";

/**
 * Props
 *   src        – the full embed URL (required)
 *   width      – CSS width (default "800px")
 *   height     – CSS height (default "450px")
 *   className  – optional extra class names
 */
export const FigmaEmbed = ({
  src,
  width = "800px",
  height = "450px",
  className,
}) => {
  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <iframe
        src={src}
        style={{
          border: "1px solid rgba(0, 0, 0, 0.1)",
          width,
          height,
        }}
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
};
