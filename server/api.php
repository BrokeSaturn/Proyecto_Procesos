<?php
// server/api.php

// evita HTML por warnings/notices
ini_set("display_errors", "0");
ini_set("log_errors", "1");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start();
}

require_once __DIR__ . "/conexion.php";
require_once __DIR__ . "/util.php";

function json_out($arr, $code = 200) {
  http_response_code($code);
  header("Content-Type: application/json; charset=utf-8");
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

set_exception_handler(function($e){
  json_out(["ok"=>false,"error"=>"exception: ".$e->getMessage()], 500);
});

set_error_handler(function($severity, $message, $file, $line){
  throw new ErrorException($message, 0, $severity, $file, $line);
});

function body_json() {
  $raw = file_get_contents("php://input");
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

function need_login() {
  if (empty($_SESSION["usuario_id"])) {
    json_out(["ok" => false, "error" => "no autenticado"], 401);
  }
}

function need_role($roles) {
  need_login();
  $rol = strtolower((string)($_SESSION["rol"] ?? ""));
  $roles = array_map(fn($r) => strtolower((string)$r), $roles);
  if (!in_array($rol, $roles, true)) {
    json_out(["ok" => false, "error" => "no autorizado"], 403);
  }
}

function fetch_me_db($enlace, $id) {
  $sql = "SELECT u.id,u.nombres,u.apellidos,u.nombre_usuario,u.correo,u.telefono,u.activo,
                 r.nombre AS rol
          FROM usuarios u
          JOIN roles r ON r.id=u.rol_id
          WHERE u.id=? LIMIT 1";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "i", $id);
  mysqli_stmt_execute($st);
  $rs = mysqli_stmt_get_result($st);
  $me = mysqli_fetch_assoc($rs);
  mysqli_stmt_close($st);
  return $me ?: null;
}

$action = $_GET["action"] ?? "";

/* =========================
   AUTH
========================= */

if ($action === "login") {
  $d = body_json();
  $usuario = trim((string)($d["usuario"] ?? ""));
  $password = (string)($d["password"] ?? "");

  if ($usuario === "" || $password === "") {
    json_out(["ok" => false, "error" => "datos incompletos"], 400);
  }

  $sql = "SELECT u.id,u.nombres,u.apellidos,u.nombre_usuario,u.password_hash,u.activo,
                 r.nombre AS rol
          FROM usuarios u
          JOIN roles r ON r.id=u.rol_id
          WHERE u.nombre_usuario=? LIMIT 1";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "s", $usuario);
  mysqli_stmt_execute($st);
  $rs = mysqli_stmt_get_result($st);
  $row = mysqli_fetch_assoc($rs);
  mysqli_stmt_close($st);

  if (!$row) json_out(["ok"=>false,"error"=>"usuario o contraseña incorrectos"], 401);
  if ((int)$row["activo"] !== 1) json_out(["ok"=>false,"error"=>"usuario desactivado"], 403);

  if (!password_verify($password, (string)$row["password_hash"])) {
    json_out(["ok"=>false,"error"=>"usuario o contraseña incorrectos"], 401);
  }

  $_SESSION["usuario_id"] = (int)$row["id"];
  $_SESSION["rol"] = (string)$row["rol"];

  audit_log($enlace, (int)$row["id"], "login", "usuarios", (int)$row["id"], ["rol" => (string)$row["rol"]]);

  $me = fetch_me_db($enlace, (int)$row["id"]);
  json_out(["ok" => true, "me" => $me]);
}

if ($action === "logout") {
  $actor = (int)($_SESSION["usuario_id"] ?? 0);
  if ($actor > 0) {
    audit_log($enlace, $actor, "logout", "usuarios", $actor, []);
  }
  $_SESSION = [];
  if (ini_get("session.use_cookies")) {
    $p = session_get_cookie_params();
    setcookie(session_name(), "", time()-42000, $p["path"], $p["domain"], $p["secure"], $p["httponly"]);
  }
  session_destroy();
  json_out(["ok" => true]);
}

if ($action === "me") {
  need_login();
  $me = fetch_me_db($enlace, (int)$_SESSION["usuario_id"]);
  if (!$me) json_out(["ok"=>false,"error"=>"no autenticado"], 401);
  json_out(["ok" => true, "me" => $me]);
}

/* =========================
   AULAS (ADMIN)
========================= */

if ($action === "aulas_list") {
  need_login();
  $sql = "SELECT id,codigo,nombre,capacidad,estado FROM aulas ORDER BY codigo";
  $rs = mysqli_query($enlace, $sql);
  $aulas = [];
  while ($r = mysqli_fetch_assoc($rs)) $aulas[] = $r;
  json_out(["ok" => true, "aulas" => $aulas]);
}

if ($action === "aulas_create") {
  need_role(["admin"]);
  $d = body_json();

  $codigo = trim((string)($d["codigo"] ?? ""));
  $nombre = trim((string)($d["nombre"] ?? ""));
  $capacidad = (int)($d["capacidad"] ?? 0);
  $estado = strtolower(trim((string)($d["estado"] ?? "disponible")));
  if ($estado !== "disponible" && $estado !== "mantenimiento") $estado = "disponible";

  if ($codigo === "" || $nombre === "" || $capacidad < 1) {
    json_out(["ok" => false, "error" => "datos inválidos"], 400);
  }

  $sql = "INSERT INTO aulas(codigo,nombre,capacidad,estado) VALUES(?,?,?,?)";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "ssis", $codigo, $nombre, $capacidad, $estado);

  if (!mysqli_stmt_execute($st)) {
    $err = mysqli_error($enlace);
    mysqli_stmt_close($st);
    json_out(["ok"=>false,"error"=>$err ?: "no se pudo crear"], 400);
  }

  $newId = mysqli_insert_id($enlace);
  mysqli_stmt_close($st);

  audit_log($enlace, (int)$_SESSION["usuario_id"], "create", "aulas", (int)$newId, [
    "codigo"=>$codigo,"nombre"=>$nombre,"capacidad"=>$capacidad,"estado"=>$estado
  ]);

  json_out(["ok" => true, "id" => (int)$newId]);
}

if ($action === "aulas_set_estado") {
  need_role(["admin"]);
  $d = body_json();
  $id = (int)($d["id"] ?? 0);
  $estado = strtolower(trim((string)($d["estado"] ?? "")));
  if ($id < 1) json_out(["ok"=>false,"error"=>"id inválido"], 400);
  if ($estado !== "disponible" && $estado !== "mantenimiento") {
    json_out(["ok"=>false,"error"=>"estado inválido"], 400);
  }

  $sql = "UPDATE aulas SET estado=? WHERE id=?";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "si", $estado, $id);
  mysqli_stmt_execute($st);
  $aff = mysqli_stmt_affected_rows($st);
  mysqli_stmt_close($st);

  audit_log($enlace, (int)$_SESSION["usuario_id"], "update", "aulas", $id, ["estado"=>$estado]);

  json_out(["ok" => true, "updated" => (int)$aff]);
}

if ($action === "aulas_delete") {
  need_role(["admin"]);
  $d = body_json();
  $id = (int)($d["id"] ?? 0);
  if ($id < 1) json_out(["ok"=>false,"error"=>"id inválido"], 400);

  // no borrar si tiene reservas activas
  $sql = "SELECT COUNT(*) c FROM reservas WHERE aula_id=? AND estado <> 'cancelada'";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "i", $id);
  mysqli_stmt_execute($st);
  $rs = mysqli_stmt_get_result($st);
  $row = mysqli_fetch_assoc($rs);
  mysqli_stmt_close($st);
  if ((int)($row["c"] ?? 0) > 0) {
    json_out(["ok"=>false,"error"=>"no se puede eliminar: tiene reservas"], 400);
  }

  $sql = "DELETE FROM aulas WHERE id=?";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "i", $id);
  mysqli_stmt_execute($st);
  $aff = mysqli_stmt_affected_rows($st);
  mysqli_stmt_close($st);

  audit_log($enlace, (int)$_SESSION["usuario_id"], "delete", "aulas", $id, []);

  json_out(["ok" => true, "deleted" => (int)$aff]);
}

/* =========================
   FRANJAS + RESERVAS + DISPONIBILIDAD
========================= */

if ($action === "franjas_list") {
  need_login();
  $sql = "SELECT id, hora_inicio, hora_fin FROM franjas ORDER BY hora_inicio";
  $rs = mysqli_query($enlace, $sql);
  $franjas = [];
  while ($r = mysqli_fetch_assoc($rs)) $franjas[] = $r;
  json_out(["ok" => true, "franjas" => $franjas]);
}

if ($action === "reservas_list") {
  need_login();
  $scope = strtolower((string)($_GET["scope"] ?? ""));
  $rol = strtolower((string)($_SESSION["rol"] ?? ""));

  $where = "";
  if ($scope === "all") {
    if (!in_array($rol, ["admin","encargado"], true)) {
      json_out(["ok"=>false,"error"=>"no autorizado"], 403);
    }
  } else {
    $where = "WHERE r.usuario_id=".(int)$_SESSION["usuario_id"];
  }

  $sql = "SELECT r.id, r.fecha, r.estado, r.codigo_checkin, r.checkin_validado,
                 a.codigo AS aula_codigo, a.nombre AS aula_nombre,
                 f.hora_inicio, f.hora_fin,
                 u.nombre_usuario AS usuario
          FROM reservas r
          JOIN aulas a ON a.id=r.aula_id
          JOIN franjas f ON f.id=r.franja_id
          JOIN usuarios u ON u.id=r.usuario_id
          $where
          ORDER BY r.fecha DESC, f.hora_inicio";
  $rs = mysqli_query($enlace, $sql);
  $rows = [];
  while ($r = mysqli_fetch_assoc($rs)) $rows[] = $r;
  json_out(["ok" => true, "reservas" => $rows]);
}

if ($action === "disponibilidad") {
  need_login();

  $from = (string)($_GET["from"] ?? "");
  $to   = (string)($_GET["to"] ?? "");
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
    json_out(["ok"=>false,"error"=>"from/to inválidos (YYYY-MM-DD)"], 400);
  }

  // aulas
  $aulas = [];
  $rs = mysqli_query($enlace, "SELECT id,codigo,nombre,capacidad,estado FROM aulas ORDER BY codigo");
  while ($r = mysqli_fetch_assoc($rs)) $aulas[] = $r;

  // franjas
  $franjas = [];
  $rs = mysqli_query($enlace, "SELECT id,hora_inicio,hora_fin FROM franjas ORDER BY hora_inicio");
  while ($r = mysqli_fetch_assoc($rs)) $franjas[] = $r;

  // reservas rango
  $sql = "SELECT r.id, r.fecha, r.estado, r.checkin_validado, r.aula_id, r.franja_id,
                 u.nombre_usuario AS usuario
          FROM reservas r
          JOIN usuarios u ON u.id=r.usuario_id
          WHERE r.fecha BETWEEN ? AND ?
            AND r.estado <> 'cancelada'";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "ss", $from, $to);
  mysqli_stmt_execute($st);
  $rs = mysqli_stmt_get_result($st);
  $reservas = [];
  while ($r = mysqli_fetch_assoc($rs)) $reservas[] = $r;
  mysqli_stmt_close($st);

  json_out(["ok"=>true, "aulas"=>$aulas, "franjas"=>$franjas, "reservas"=>$reservas]);
}

/* =========================
   REPORTES (ADMIN / ENCARGADO)
========================= */

if ($action === "reportes_list") {
  need_role(["admin","encargado"]);

  $sql = "SELECT r.id, r.fecha, r.descripcion, r.gravedad, r.estado,
                 u.nombre_usuario AS reportante,
                 a.codigo AS aula
          FROM reportes r
          JOIN usuarios u ON u.id=r.reportante_id
          JOIN aulas a ON a.id=r.aula_id
          ORDER BY r.fecha DESC";
  $rs = mysqli_query($enlace, $sql);
  $rows = [];
  while ($r = mysqli_fetch_assoc($rs)) $rows[] = $r;
  json_out(["ok" => true, "reportes" => $rows]);
}

if ($action === "reportes_resolver") {
  need_role(["admin","encargado"]);
  $d = body_json();
  $id = (int)($d["id"] ?? 0);
  if ($id < 1) json_out(["ok"=>false,"error"=>"id inválido"], 400);

  $sql = "UPDATE reportes SET estado='resuelto' WHERE id=?";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "i", $id);
  mysqli_stmt_execute($st);
  $aff = mysqli_stmt_affected_rows($st);
  mysqli_stmt_close($st);

  audit_log($enlace, (int)$_SESSION["usuario_id"], "update", "reportes", $id, ["estado"=>"resuelto"]);

  json_out(["ok" => true, "updated" => (int)$aff]);
}

json_out(["ok" => false, "error" => "acción no válida"], 404);
