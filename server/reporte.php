<?php
ini_set("display_errors", "0");
ini_set("log_errors", "1");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");
if (session_status() !== PHP_SESSION_ACTIVE) session_start();

require_once __DIR__ . "/conexion.php";
require_once __DIR__ . "/util.php";

function need_login() {
  if (empty($_SESSION["usuario_id"])) json_out(["ok"=>false,"error"=>"no autenticado"], 401);
}

function role_now($enlace) {
  $rol = strtolower((string)($_SESSION["rol"] ?? ""));
  if ($rol !== "") return $rol;

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
  $row = mysqli_fetch_assoc($rs);
  mysqli_stmt_close($st);

  $rol = strtolower((string)($row["rol"] ?? ""));
  if ($rol !== "") $_SESSION["rol"] = $rol;
  return $rol;
}

function ensure_enum($v, $allowed, $fallback) {
  $v = strtolower(trim((string)$v));
  return in_array($v, $allowed, true) ? $v : $fallback;
}

$action = $_GET["action"] ?? "";

if ($action === "count") {
  need_login();

  $idsRaw = trim((string)($_GET["ids"] ?? ""));
  if ($idsRaw === "") json_out(["ok"=>true, "counts"=>new stdClass()]);

  $ids = array_values(array_filter(array_map("intval", explode(",", $idsRaw)), fn($x)=>$x>0));
  if (!$ids) json_out(["ok"=>true, "counts"=>new stdClass()]);

  $place = implode(",", array_fill(0, count($ids), "?"));
  $types = str_repeat("i", count($ids));

  $sql = "SELECT reserva_id, COUNT(*) AS c
          FROM reportes
          WHERE reserva_id IN ($place)
          GROUP BY reserva_id";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, $types, ...$ids);
  mysqli_stmt_execute($st);
  $rs = mysqli_stmt_get_result($st);

  $counts = [];
  while ($r = mysqli_fetch_assoc($rs)) {
    $counts[(string)$r["reserva_id"]] = (int)$r["c"];
  }
  mysqli_stmt_close($st);

  json_out(["ok"=>true, "counts"=>$counts]);
}

if ($action === "create") {
  need_login();

  $d = body_json();
  $reserva_id = (int)($d["reserva_id"] ?? 0);
  $aula_id = (int)($d["aula_id"] ?? 0);
  $descripcion = trim((string)($d["descripcion"] ?? ""));
  $gravedad = ensure_enum($d["gravedad"] ?? "baja", ["baja","media","alta"], "baja");

  if ($reserva_id < 1 || $aula_id < 1 || $descripcion === "") {
    json_out(["ok"=>false,"error"=>"datos inválidos"], 400);
  }

  $uid = (int)$_SESSION["usuario_id"];
  $rol = role_now($enlace);

  // si es usuario normal: solo puede reportar sus reservas
  if ($rol === "usuario") {
    $sql = "SELECT id FROM reservas WHERE id=? AND usuario_id=? AND aula_id=? LIMIT 1";
    $st = mysqli_prepare($enlace, $sql);
    mysqli_stmt_bind_param($st, "iii", $reserva_id, $uid, $aula_id);
    mysqli_stmt_execute($st);
    $rs = mysqli_stmt_get_result($st);
    $ok = mysqli_fetch_assoc($rs);
    mysqli_stmt_close($st);

    if (!$ok) json_out(["ok"=>false,"error"=>"no autorizado (reserva no te pertenece)"], 403);
  }

  $sql = "INSERT INTO reportes(reportante_id,reserva_id,aula_id,descripcion,gravedad,estado)
          VALUES(?,?,?,?,?,'pendiente')";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "iiiss", $uid, $reserva_id, $aula_id, $descripcion, $gravedad);

  if (!mysqli_stmt_execute($st)) {
    $err = mysqli_error($enlace);
    mysqli_stmt_close($st);
    json_out(["ok"=>false,"error"=>$err ?: "no se pudo crear reporte"], 400);
  }

  $newId = (int)mysqli_insert_id($enlace);
  mysqli_stmt_close($st);

  if (function_exists("audit_log")) {
    audit_log($enlace, $uid, "create", "reportes", $newId, [
      "reserva_id"=>$reserva_id, "aula_id"=>$aula_id, "gravedad"=>$gravedad
    ]);
  }

  json_out(["ok"=>true, "id"=>$newId], 201);
}

json_out(["ok"=>false,"error"=>"acción no válida"], 404);
