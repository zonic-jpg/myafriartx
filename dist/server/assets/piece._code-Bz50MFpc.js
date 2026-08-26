import { jsxs, jsx } from "react/jsx-runtime";
import { useRouter } from "@tanstack/react-router";
function PieceErrorComponent({
  error,
  reset
}) {
  const router = useRouter();
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl p-8", children: [
    /* @__PURE__ */ jsxs("p", { className: "text-sm text-destructive", children: [
      "Could not load piece: ",
      error.message
    ] }),
    /* @__PURE__ */ jsx("button", { className: "mt-3 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground", onClick: () => {
      reset();
      router.invalidate();
    }, children: "Retry" })
  ] });
}
export {
  PieceErrorComponent as errorComponent
};
