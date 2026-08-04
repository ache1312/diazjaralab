import { createElement } from "react";

interface StructuralBlockNoticeProps {
  field: {
    description?: string;
  };
}

const openPrimaryContent = () => {
  window.dispatchEvent(new CustomEvent("djl:open-primary-content"));
};

export const StructuralBlockNotice = ({ field }: StructuralBlockNoticeProps) => createElement(
  "div",
  { "data-djl-structural-notice": "", role: "note" },
  createElement("strong", null, "Sección fija del sitio"),
  createElement(
    "p",
    null,
    field.description
      || "Edita su texto desde «Contenido» o selecciónalo directamente en la vista previa.",
  ),
  createElement(
    "button",
    { type: "button", onClick: openPrimaryContent },
    "Editar el texto",
  ),
);
