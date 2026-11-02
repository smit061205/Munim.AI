import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// Opens a page's "add" form when the address asks for it, e.g. /plan?new=goal
// from the command palette, then takes the request out of the address
export default function useNewParam(name, open) {
  const [params, setParams] = useSearchParams();
  const requested = params.get("new") === name;

  useEffect(() => {
    if (!requested) return;
    open();
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
  }, [requested, open, params, setParams]);
}
