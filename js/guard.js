export async function requireAuth(rolesPermitidos = []) {
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) window.location.reload();
  });

  const url = new URL("../server/api.php", window.location.href);
  url.searchParams.set("action", "me");

  let res;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    window.location.href = new URL("../index.html", window.location.href).toString();
    return null;
  }

  const data = await res.json().catch(() => null);
  if (!data || !data.ok) {
    window.location.href = new URL("../index.html", window.location.href).toString();
    return null;
  }

  const me = data.me;
  const rol = String(me?.rol || "").toLowerCase();

  if (rolesPermitidos.length > 0) {
    const permitidos = rolesPermitidos.map((r) => String(r).toLowerCase());
    if (!permitidos.includes(rol)) {
      window.location.href = new URL("../index.html", window.location.href).toString();
      return null;
    }
  }

  history.pushState(null, "", location.href);
  window.addEventListener("popstate", () => history.pushState(null, "", location.href));

  return me;
}

export function startIdleLogout(minutos = 3) {
  const ms = Math.max(1, minutos) * 60 * 1000;
  let t = null;

  async function logoutNow() {
    try {
      const url = new URL("../server/api.php", window.location.href);
      url.searchParams.set("action", "logout");
      await fetch(url.toString(), { method: "POST", credentials: "include" });
    } catch {}
    window.location.href = new URL("../index.html", window.location.href).toString();
  }

  function reset() {
    if (t) clearTimeout(t);
    t = setTimeout(logoutNow, ms);
  }

  ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, reset, { passive: true })
  );

  reset();
}
