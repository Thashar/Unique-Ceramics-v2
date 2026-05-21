"use client";

import dynamic from "next/dynamic";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

const JODIT_CONFIG = {
  height: 520,
  language: "pl",
  toolbarAdaptive: false,
  buttons: [
    "bold", "italic", "underline", "strikethrough", "|",
    "ul", "ol", "|",
    "fontsize", "|",
    "paragraph", "|",
    "left", "center", "right", "|",
    "link", "|",
    "undo", "redo", "|",
    "fullsize", "source",
  ],
  style: { font: "14px/1.6 Inter, Arial, sans-serif" },
  askBeforePasteHTML: false,
  askBeforePasteFromWord: false,
  defaultActionOnPaste: "insert_clear_html" as const,
};

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function RichEditor({ value, onChange }: Props) {
  return (
    <div className="rich-editor-wrap">
      <JoditEditor
        value={value}
        config={JODIT_CONFIG}
        onBlur={(newContent) => onChange(newContent)}
      />
    </div>
  );
}
