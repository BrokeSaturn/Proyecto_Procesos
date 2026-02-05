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

function need_roles($roles) {
  need_login();
  $rol = strtolower((string)($_SESSION["rol"] ?? ""));

  if ($rol === "") {
    global $enlace;
    $uid = (int)$_SESSION["usuario_id"];
    $st = mysqli_prepare($enlace, "SELECT r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=? LIMIT 1");
    mysqli_stmt_bind_param($st, "i", $uid);
    mysqli_stmt_execute($st);
    $rs = mysqli_stmt_get_result($st);
    $row = mysqli_fetch_assoc($rs);
    mysqli_stmt_close($st);
    $rol = strtolower((string)($row["rol"] ?? ""));
    if ($rol !== "") $_SESSION["rol"] = $rol;
  }

  $roles = array_map(fn($x)=>strtolower((string)$x), $roles);
  if (!in_array($rol, $roles, true)) json_out(["ok"=>false,"error"=>"no autorizado"], 403);
}

function ensure_enum($v, $allowed, $fallback) {
  $v = strtolower(trim((string)$v));
  return in_array($v, $allowed, true) ? $v : $fallback;
}

$action = $_GET["action"] ?? "";

/* ===== LISTAR REPORTES + INFRATOR (dueño de reserva) ===== */
if ($action === "list") {
  need_roles(["admin","encargado"]);

  // infractor = reservas.usuario_id (si existe reserva_id)
  $sql = "SELECT r.id, r.reportante_id, r.reserva_id, r.aula_id,
                 r.fecha, r.descripcion, r.gravedad, r.estado,
                 u.nombre_usuario AS reportante,
                 a.codigo AS aula_codigo, a.nombre AS aula_nombre,
                 rv.usuario_id AS infractor_id,
                 ui.nombre_usuario AS infractor
          FROM reportes r
          JOIN usuarios u ON u.id=r.reportante_id
          JOIN aulas a ON a.id=r.aula_id
          LEFT JOIN reservas rv ON rv.id=r.reserva_id
          LEFT JOIN usuarios ui ON ui.id=rv.usuario_id
          ORDER BY r.fecha DESC";
  $rs = mysqli_query($enlace, $sql);
  $rows = [];
  while ($x = mysqli_fetch_assoc($rs)) $rows[] = $x;

  json_out(["ok"=>true,"reportes"=>$rows]);
}

/* ===== RESOLVER (solo marcar resuelto) ===== */
if ($action === "resolve") {
  need_roles(["admin","encargado"]);
  $d = body_json();
  $id = (int)($d["id"] ?? 0);
  if ($id < 1) json_out(["ok"=>false,"error"=>"id inválido"], 400);

  $st = mysqli_prepare($enlace, "UPDATE reportes SET estado='resuelto' WHERE id=?");
  mysqli_stmt_bind_param($st, "i", $id);
  mysqli_stmt_execute($st);
  $aff = (int)mysqli_stmt_affected_rows($st);
  mysqli_stmt_close($st);

  json_out(["ok"=>true,"updated"=>$aff]);
}

/* ===== RESOLVER + MULTAR AL INFRACTOR (dueño de la reserva) ===== */
if ($action === "resolve_and_fine") {
  need_roles(["admin","encargado"]);
  $d = body_json();

  $reporte_id = (int)($d["reporte_id"] ?? 0);
  $motivo = trim((string)($d["motivo"] ?? ""));
  $gravedad = ensure_enum($d["gravedad"] ?? "baja", ["baja","media","alta"], "baja");
  $monto = (float)($d["monto"] ?? 0);

  if ($reporte_id < 1 || $motivo === "" || $monto <= 0) {
    json_out(["ok"=>false,"error"=>"datos inválidos"], 400);
  }

  $actor = (int)$_SESSION["usuario_id"];

  mysqli_begin_transaction($enlace);
  try {
    // traer infractor desde la reserva asociada al reporte
    $sql = "SELECT r.id, r.reserva_id, rv.usuario_id AS infractor_id
            FROM reportes r
            LEFT JOIN reservas rv ON rv.id=r.reserva_id
            WHERE r.id=? LIMIT 1";
    $st = mysqli_prepare($enlace, $sql);
    mysqli_stmt_bind_param($st, "i", $reporte_id);
    mysqli_stmt_execute($st);
    $rs = mysqli_stmt_get_result($st);
    $rep = mysqli_fetch_assoc($rs);
    mysqli_stmt_close($st);

    if (!$rep) throw new Exception("reporte no existe");
    $infractor_id = (int)($rep["infractor_id"] ?? 0);
    if ($infractor_id < 1) throw new Exception("este reporte no tiene reserva asociada; no se puede multar");

    // insertar multa al infractor
    $sql = "INSERT INTO multas(reporte_id,usuario_id,emitida_por,motivo,gravedad,monto)
            VALUES(?,?,?,?,?,?)";
    $st = mysqli_prepare($enlace, $sql);
    mysqli_stmt_bind_param($st, "iiissd", $reporte_id, $infractor_id, $actor, $motivo, $gravedad, $monto);
    if (!mysqli_stmt_execute($st)) throw new Exception(mysqli_error($enlace) ?: "no se pudo crear multa");
    $multa_id = (int)mysqli_insert_id($enlace);
    mysqli_stmt_close($st);

    // resolver reporte
    $st = mysqli_prepare($enlace, "UPDATE reportes SET estado='resuelto' WHERE id=?");
    mysqli_stmt_bind_param($st, "i", $reporte_id);
    mysqli_stmt_execute($st);
    mysqli_stmt_close($st);

    mysqli_commit($enlace);
    json_out(["ok"=>true, "multa_id"=>$multa_id, "usuario_multado"=>$infractor_id]);
  } catch (Exception $e) {
    mysqli_rollback($enlace);
    json_out(["ok"=>false,"error"=>$e->getMessage()], 400);
  }
}

json_out(["ok"=>false,"error"=>"acción no válida"], 404);
