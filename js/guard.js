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
  } catch (e) {
    window.location.href = new URL("../index.html", window.location.href).toString();
    return null;
  }

  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    window.location.href = new URL("../index.html", window.location.href).toString();
    return null;
  }

  if (!data.ok) {
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

export function startIdleLogout(minutes = 3) {
  const ms = Math.max(1, minutes) * 60 * 1000;

  const logoutUrl = new URL("../server/api.php", window.location.href);
  logoutUrl.searchParams.set("action", "logout");

  const goIndex = () => {
    window.location.href = new URL("../index.html", window.location.href).toString();
  };

  let t = null;

  const reset = () => {
    if (t) clearTimeout(t);
    t = setTimeout(async () => {
      try {
        await fetch(logoutUrl.toString(), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: "{}",
        });
      } catch {}
      goIndex();
    }, ms);
  };

  ["mousemove","mousedown","keydown","scroll","touchstart","click"].forEach((ev) => {
    window.addEventListener(ev, reset, { passive: true });
  });

  reset();
}
