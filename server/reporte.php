<?php
require_once __DIR__ . "/session.php";
require_once __DIR__ . "/conexion.php";
require_once __DIR__ . "/auth.php";

header("Content-Type: application/json; charset=utf-8");

$action = $_GET["action"] ?? "";

function body_json() {
  $raw = file_get_contents("php://input");
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

function ok($arr = []) {
  echo json_encode(array_merge(["ok" => true], $arr));
  exit;
}

function fail($msg, $code = 400) {
  http_response_code($code);
  echo json_encode(["ok" => false, "error" => $msg]);
  exit;
}

function require_login() {
  if (empty($_SESSION["usuario_id"])) fail("no autenticado", 401);
}

function load_role_if_missing() {
  $rol = strtolower((string)($_SESSION["rol"] ?? ""));
  if ($rol !== "") return $rol;

  global $enlace;
  $uid = (int)($_SESSION["usuario_id"] ?? 0);
  if ($uid < 1) return "";

  $sql = "SELECT r.nombre AS rol
          FROM usuarios u
          JOIN roles r ON r.id=u.rol_id
          WHERE u.id=? LIMIT 1";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "i", $uid);
  mysqli_stmt_execute($st);
  $rs = mysqli_stmt_get_result($st);
  $row = mysqli_fetch_assoc($rs) ?: [];
  mysqli_stmt_close($st);

  $rol = strtolower((string)($row["rol"] ?? ""));
  if ($rol !== "") $_SESSION["rol"] = $rol;
  return $rol;
}

function require_role($roles = []) {
  require_login();
  $rol = load_role_if_missing();
  $roles = array_map(fn($x)=>strtolower((string)$x), $roles);
  if (!in_array($rol, $roles, true)) fail("no autorizado", 403);
}

function esc_like($s) {
  $s = (string)$s;
  $s = str_replace("\\", "\\\\", $s);
  $s = str_replace("%", "\\%", $s);
  $s = str_replace("_", "\\_", $s);
  return $s;
}

function ensure_enum($v, $allowed, $fallback) {
  $v = strtolower(trim((string)$v));
  return in_array($v, $allowed, true) ? $v : $fallback;
}

require_login();

/* =========================
   create (usuario crea reporte)
   ========================= */
if ($action === "create") {
  $d = body_json();
  $reserva_id = (int)($d["reserva_id"] ?? 0);
  $aula_id = (int)($d["aula_id"] ?? 0);
  $gravedad = ensure_enum($d["gravedad"] ?? "baja", ["baja","media","alta"], "baja");
  $descripcion = trim((string)($d["descripcion"] ?? ""));

  if ($reserva_id < 1 || $aula_id < 1) fail("datos incompletos");
  if ($descripcion === "") fail("descripción requerida");

  global $enlace;
  $uid = (int)$_SESSION["usuario_id"];

  $sql = "INSERT INTO reportes (fecha, reserva_id, aula_id, gravedad, descripcion, estado, reportante_id)
          VALUES (NOW(), ?, ?, ?, ?, 'pendiente', ?)";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "iissi", $reserva_id, $aula_id, $gravedad, $descripcion, $uid);
  if (!mysqli_stmt_execute($st)) fail("no se pudo crear reporte", 500);

  ok(["id" => mysqli_insert_id($enlace)]);
}

/* =========================
   count (conteo reportes por reserva)
   ========================= */
if ($action === "count") {
  $ids = trim((string)($_GET["ids"] ?? ""));
  if ($ids === "") ok(["counts" => new stdClass()]);

  $parts = array_filter(array_map("intval", explode(",", $ids)));
  if (!$parts) ok(["counts" => new stdClass()]);

  global $enlace;
  $in = implode(",", $parts);

  $sql = "SELECT reserva_id, COUNT(*) AS c
          FROM reportes
          WHERE reserva_id IN ($in)
          GROUP BY reserva_id";
  $q = mysqli_query($enlace, $sql);
  if (!$q) fail("error count", 500);

  $counts = [];
  while ($row = mysqli_fetch_assoc($q)) {
    $counts[(string)$row["reserva_id"]] = (int)$row["c"];
  }
  ok(["counts" => $counts]);
}

/* =========================
   list (encargado/admin)
   action=list&estado=todos|pendiente|resuelto&q=...
   ========================= */
if ($action === "list") {
  require_role(["encargado","admin"]);
  global $enlace;

  $estado = strtolower(trim((string)($_GET["estado"] ?? "todos")));
  $q = trim((string)($_GET["q"] ?? ""));

  $where = "1=1";
  $params = [];
  $types = "";

  if ($estado !== "todos") {
    $where .= " AND LOWER(rp.estado)=?";
    $params[] = $estado;
    $types .= "s";
  }

  if ($q !== "") {
    $qq = "%" . esc_like($q) . "%";
    $where .= " AND (
      urep.nombre_usuario LIKE ? OR
      uinf.nombre_usuario LIKE ? OR
      a.codigo LIKE ? OR
      a.nombre LIKE ? OR
      rp.descripcion LIKE ? OR
      rp.gravedad LIKE ?
    )";
    for ($i=0; $i<6; $i++) { $params[] = $qq; $types .= "s"; }
  }

  $sql = "
    SELECT
      rp.id,
      DATE_FORMAT(rp.fecha, '%Y-%m-%d %H:%i') AS fecha,
      rp.reserva_id,
      rp.aula_id,
      a.codigo AS aula_codigo,
      a.nombre AS aula_nombre,
      rp.gravedad,
      rp.estado,
      rp.descripcion,

      urep.nombre_usuario AS reportante,
      uinf.nombre_usuario AS infractor

    FROM reportes rp
    LEFT JOIN aulas a ON a.id = rp.aula_id
    LEFT JOIN usuarios urep ON urep.id = rp.reportante_id
    LEFT JOIN reservas rs ON rs.id = rp.reserva_id
    LEFT JOIN usuarios uinf ON uinf.id = rs.usuario_id
    WHERE $where
    ORDER BY rp.id DESC
    LIMIT 500
  ";

  $st = mysqli_prepare($enlace, $sql);
  if ($types !== "") mysqli_stmt_bind_param($st, $types, ...$params);
  if (!mysqli_stmt_execute($st)) fail("no se pudo listar reportes", 500);

  $res = mysqli_stmt_get_result($st);
  $rows = [];
  while ($row = mysqli_fetch_assoc($res)) {
    $rows[] = [
      "id" => (int)$row["id"],
      "fecha" => $row["fecha"],
      "reserva_id" => (int)($row["reserva_id"] ?? 0),
      "aula_id" => (int)($row["aula_id"] ?? 0),
      "aula_codigo" => $row["aula_codigo"] ?? "",
      "aula_nombre" => $row["aula_nombre"] ?? "",
      "gravedad" => $row["gravedad"] ?? "baja",
      "estado" => $row["estado"] ?? "pendiente",
      "descripcion" => $row["descripcion"] ?? "",
      "reportante" => $row["reportante"] ?? "",
      "infractor" => $row["infractor"] ?? "",
    ];
  }

  ok(["reportes" => $rows]);
}

/* =========================
   resolver (encargado/admin) POST {id}
   - intenta guardar resuelto_por_id/resuelto_fecha si existen
   - si no existen, hace fallback a solo estado='resuelto'
   ========================= */
if ($action === "resolver") {
  require_role(["encargado","admin"]);
  global $enlace;

  $d = body_json();
  $id = (int)($d["id"] ?? 0);
  if ($id < 1) fail("id inválido");

  $uid = (int)$_SESSION["usuario_id"];

  $sql1 = "UPDATE reportes
           SET estado='resuelto', resuelto_por_id=?, resuelto_fecha=NOW()
           WHERE id=? LIMIT 1";
  $st = mysqli_prepare($enlace, $sql1);
  mysqli_stmt_bind_param($st, "ii", $uid, $id);
  $ok1 = @mysqli_stmt_execute($st);
  mysqli_stmt_close($st);

  if (!$ok1) {
    $sql2 = "UPDATE reportes SET estado='resuelto' WHERE id=? LIMIT 1";
    $st2 = mysqli_prepare($enlace, $sql2);
    mysqli_stmt_bind_param($st2, "i", $id);
    if (!mysqli_stmt_execute($st2)) fail("no se pudo resolver", 500);
    mysqli_stmt_close($st2);
  }

  ok(["id" => $id]);
}

/* =========================
   multas_list (encargado/admin)
   ========================= */
if ($action === "multas_list") {
  require_role(["encargado","admin"]);
  global $enlace;

  // IMPORTANTE: usamos esquema con m.emitida_por (no emitida_por_id)
  $sql = "
    SELECT
      m.id,
      DATE_FORMAT(m.fecha, '%Y-%m-%d %H:%i') AS fecha,
      m.motivo,
      m.gravedad,
      m.monto,
      u.nombre_usuario AS usuario,
      ue.nombre_usuario AS emitida_por
    FROM multas m
    LEFT JOIN usuarios u  ON u.id  = m.usuario_id
    LEFT JOIN usuarios ue ON ue.id = m.emitida_por
    ORDER BY m.id DESC
    LIMIT 500
  ";
  $q = mysqli_query($enlace, $sql);
  if (!$q) fail("no se pudo listar multas", 500);

  $rows = [];
  while ($r = mysqli_fetch_assoc($q)) {
    $rows[] = [
      "id" => (int)$r["id"],
      "fecha" => $r["fecha"] ?? "",
      "usuario" => $r["usuario"] ?? "",
      "motivo" => $r["motivo"] ?? "",
      "gravedad" => $r["gravedad"] ?? "baja",
      "monto" => (float)($r["monto"] ?? 0),
      "emitida_por" => $r["emitida_por"] ?? "",
    ];
  }
  ok(["multas" => $rows]);
}

/* =========================
   multas_create (encargado/admin) POST
   {reporte_id, usuario_id, motivo, gravedad, monto}
   ========================= */
if ($action === "multas_create") {
  require_role(["encargado","admin"]);
  global $enlace;

  $d = body_json();
  $reporte_id = (int)($d["reporte_id"] ?? 0);
  $usuario_id = (int)($d["usuario_id"] ?? 0);
  $motivo = trim((string)($d["motivo"] ?? ""));
  $gravedad = ensure_enum($d["gravedad"] ?? "baja", ["baja","media","alta"], "baja");
  $monto = (float)($d["monto"] ?? 0);

  if ($reporte_id < 1 || $usuario_id < 1) fail("datos incompletos");
  if ($motivo === "") fail("motivo requerido");
  if (!($monto > 0)) fail("monto inválido");

  $emitida_por = (int)$_SESSION["usuario_id"];

  mysqli_begin_transaction($enlace);
  try {
    $sql1 = "INSERT INTO multas (fecha, usuario_id, motivo, gravedad, monto, emitida_por, reporte_id)
             VALUES (NOW(), ?, ?, ?, ?, ?, ?)";
    $st1 = mysqli_prepare($enlace, $sql1);
    mysqli_stmt_bind_param($st1, "issdii", $usuario_id, $motivo, $gravedad, $monto, $emitida_por, $reporte_id);
    if (!mysqli_stmt_execute($st1)) throw new Exception("no se pudo crear multa");
    $newId = (int)mysqli_insert_id($enlace);
    mysqli_stmt_close($st1);

    // marcar reporte como resuelto (con fallback)
    $sqlA = "UPDATE reportes
             SET estado='resuelto', resuelto_por_id=?, resuelto_fecha=NOW()
             WHERE id=? LIMIT 1";
    $stA = mysqli_prepare($enlace, $sqlA);
    mysqli_stmt_bind_param($stA, "ii", $emitida_por, $reporte_id);
    $okA = @mysqli_stmt_execute($stA);
    mysqli_stmt_close($stA);

    if (!$okA) {
      $sqlB = "UPDATE reportes SET estado='resuelto' WHERE id=? LIMIT 1";
      $stB = mysqli_prepare($enlace, $sqlB);
      mysqli_stmt_bind_param($stB, "i", $reporte_id);
      @mysqli_stmt_execute($stB);
      mysqli_stmt_close($stB);
    }

    mysqli_commit($enlace);
    ok(["id" => $newId]);
  } catch (Exception $e) {
    mysqli_rollback($enlace);
    fail($e->getMessage(), 500);
  }
}

/* =========================
   kpis (encargado/admin)
   ========================= */
if ($action === "kpis") {
  require_role(["encargado","admin"]);
  global $enlace;

  $q1 = mysqli_query($enlace, "SELECT COUNT(*) c FROM reportes");
  $total_reportes = (int)(mysqli_fetch_assoc($q1)["c"] ?? 0);

  $q2 = mysqli_query($enlace, "SELECT COUNT(*) c FROM reportes WHERE LOWER(estado) <> 'resuelto'");
  $pend_reportes = (int)(mysqli_fetch_assoc($q2)["c"] ?? 0);

  $q3 = mysqli_query($enlace, "SELECT COUNT(*) c FROM multas");
  $total_multas = (int)(mysqli_fetch_assoc($q3)["c"] ?? 0);

  $q4 = mysqli_query($enlace, "SELECT COUNT(*) c FROM reservas WHERE checkin_validado=1");
  $total_checkins = (int)(mysqli_fetch_assoc($q4)["c"] ?? 0);

  ok([
    "kpis" => [
      "reportes_total" => $total_reportes,
      "reportes_pend" => $pend_reportes,
      "multas" => $total_multas,
      "checkins" => $total_checkins
    ]
  ]);
}

fail("acción inválida", 404);
