<?php
ini_set("display_errors", "0");
ini_set("log_errors", "1");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start();
}

require_once __DIR__ . "/conexion.php";
require_once __DIR__ . "/util.php";

set_exception_handler(function($e){
  json_out(["ok"=>false,"error"=>"exception: ".$e->getMessage()], 500);
});

set_error_handler(function($severity, $message, $file, $line){
  throw new ErrorException($message, 0, $severity, $file, $line);
});

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

function is_date_iso($s) {
  return (bool)preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$s);
}

$action = $_GET["action"] ?? "";

/* =========================
   auth
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
  if ($actor > 0) audit_log($enlace, $actor, "logout", "usuarios", $actor, []);

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
   aulas
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
   franjas
========================= */

if ($action === "franjas_list") {
  need_login();
  $sql = "SELECT id, hora_inicio, hora_fin FROM franjas ORDER BY hora_inicio";
  $rs = mysqli_query($enlace, $sql);
  $franjas = [];
  while ($r = mysqli_fetch_assoc($rs)) $franjas[] = $r;
  json_out(["ok" => true, "franjas" => $franjas]);
}

/* =========================
   reservas
========================= */

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

  $sql = "SELECT
            r.id, r.usuario_id, r.aula_id, r.franja_id,
            r.fecha, r.estado, r.codigo_checkin, r.checkin_validado,
            a.codigo AS aula, a.nombre AS aula_nombre,
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

if ($action === "reservas_create") {
  need_role(["usuario","admin","encargado"]);
  $d = body_json();

  $aula_id = (int)($d["aula_id"] ?? 0);
  $franja_id = (int)($d["franja_id"] ?? 0);
  $fecha = (string)($d["fecha"] ?? "");

  if ($aula_id < 1 || $franja_id < 1 || !is_date_iso($fecha)) {
    json_out(["ok"=>false,"error"=>"datos inválidos"], 400);
  }

  $st = mysqli_prepare($enlace, "SELECT estado FROM aulas WHERE id=? LIMIT 1");
  mysqli_stmt_bind_param($st, "i", $aula_id);
  mysqli_stmt_execute($st);
  $rs = mysqli_stmt_get_result($st);
  $a = mysqli_fetch_assoc($rs);
  mysqli_stmt_close($st);
  if (!$a) json_out(["ok"=>false,"error"=>"aula no existe"], 400);
  if (strtolower((string)$a["estado"]) === "mantenimiento") {
    json_out(["ok"=>false,"error"=>"aula en mantenimiento"], 400);
  }

  $st = mysqli_prepare($enlace, "SELECT id FROM franjas WHERE id=? LIMIT 1");
  mysqli_stmt_bind_param($st, "i", $franja_id);
  mysqli_stmt_execute($st);
  $rs = mysqli_stmt_get_result($st);
  $f = mysqli_fetch_assoc($rs);
  mysqli_stmt_close($st);
  if (!$f) json_out(["ok"=>false,"error"=>"franja no existe"], 400);

  $st = mysqli_prepare($enlace, "SELECT id FROM reservas WHERE aula_id=? AND franja_id=? AND fecha=? AND estado <> 'cancelada' LIMIT 1");
  mysqli_stmt_bind_param($st, "iis", $aula_id, $franja_id, $fecha);
  mysqli_stmt_execute($st);
  $rs = mysqli_stmt_get_result($st);
  $ex = mysqli_fetch_assoc($rs);
  mysqli_stmt_close($st);
  if ($ex) json_out(["ok"=>false,"error"=>"ya existe una reserva en ese horario"], 400);

  $codigo = gen_checkin_code(4);

  $sql = "INSERT INTO reservas(usuario_id,aula_id,fecha,franja_id,estado,codigo_checkin,checkin_validado)
          VALUES(?,?,?,?, 'activa', ?, 0)";
  $st = mysqli_prepare($enlace, $sql);

  $uid = (int)$_SESSION["usuario_id"];
  mysqli_stmt_bind_param($st, "iiiss", $uid, $aula_id, $fecha, $franja_id, $codigo);

  if (!mysqli_stmt_execute($st)) {
    $err = mysqli_error($enlace);
    mysqli_stmt_close($st);
    json_out(["ok"=>false,"error"=>$err ?: "no se pudo reservar"], 400);
  }

  $rid = mysqli_insert_id($enlace);
  mysqli_stmt_close($st);

  audit_log($enlace, $uid, "create", "reservas", (int)$rid, [
    "aula_id"=>$aula_id,"franja_id"=>$franja_id,"fecha"=>$fecha,"codigo_checkin"=>$codigo
  ]);

  json_out(["ok"=>true, "id" => (int)$rid, "codigo_checkin"=>$codigo]);
}

if ($action === "checkin_validate") {
  need_role(["encargado","admin"]);
  $d = body_json();
  $codigo = trim((string)($d["codigo"] ?? ""));
  if ($codigo === "") json_out(["ok"=>false,"error"=>"código requerido"], 400);

  $sql = "SELECT id, checkin_validado
          FROM reservas
          WHERE codigo_checkin=? AND estado <> 'cancelada'
          LIMIT 1";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "s", $codigo);
  mysqli_stmt_execute($st);
  $rs = mysqli_stmt_get_result($st);
  $r = mysqli_fetch_assoc($rs);
  mysqli_stmt_close($st);

  if (!$r) json_out(["ok"=>false,"error"=>"código no existe"], 404);

  $ya = ((int)$r["checkin_validado"] === 1);
  if ($ya) {
    json_out(["ok"=>true, "ya_validado"=>true]);
  }

  $rid = (int)$r["id"];
  $actor = (int)$_SESSION["usuario_id"];

  $sql = "UPDATE reservas
          SET checkin_validado=1,
              checkin_validado_por=?,
              checkin_validado_en=NOW()
          WHERE id=? AND checkin_validado=0";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "ii", $actor, $rid);
  mysqli_stmt_execute($st);
  mysqli_stmt_close($st);

  audit_log($enlace, $actor, "update", "reservas", $rid, ["checkin_validado"=>1]);

  json_out(["ok"=>true, "ya_validado"=>false]);
}

/* =========================
   disponibilidad
========================= */

if ($action === "disponibilidad") {
  need_login();

  $from = (string)($_GET["from"] ?? "");
  $to   = (string)($_GET["to"] ?? "");
  if (!is_date_iso($from) || !is_date_iso($to)) {
    json_out(["ok"=>false,"error"=>"from/to inválidos (yyyy-mm-dd)"], 400);
  }

  $aulas = [];
  $rs = mysqli_query($enlace, "SELECT id,codigo,nombre,capacidad,estado FROM aulas ORDER BY codigo");
  while ($r = mysqli_fetch_assoc($rs)) $aulas[] = $r;

  $franjas = [];
  $rs = mysqli_query($enlace, "SELECT id,hora_inicio,hora_fin FROM franjas ORDER BY hora_inicio");
  while ($r = mysqli_fetch_assoc($rs)) $franjas[] = $r;

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
   reportes
========================= */

if ($action === "reportes_create") {
  need_role(["usuario","admin","encargado"]);
  $d = body_json();

  $aula_id = (int)($d["aula_id"] ?? 0);
  $descripcion = trim((string)($d["descripcion"] ?? ""));
  $gravedad = strtolower(trim((string)($d["gravedad"] ?? "baja")));
  $reserva_id = isset($d["reserva_id"]) ? (int)$d["reserva_id"] : null;

  if ($aula_id < 1 || $descripcion === "") {
    json_out(["ok"=>false,"error"=>"datos inválidos"], 400);
  }
  if (!in_array($gravedad, ["baja","media","alta"], true)) $gravedad = "baja";

  $sql = "INSERT INTO reportes(reportante_id,reserva_id,aula_id,descripcion,gravedad,estado)
          VALUES(?,?,?,?,?,'pendiente')";
  $st = mysqli_prepare($enlace, $sql);

  $actor = (int)$_SESSION["usuario_id"];
  mysqli_stmt_bind_param($st, "iiiss", $actor, $reserva_id, $aula_id, $descripcion, $gravedad);

  if (!mysqli_stmt_execute($st)) {
    $err = mysqli_error($enlace);
    mysqli_stmt_close($st);
    json_out(["ok"=>false,"error"=>$err ?: "no se pudo crear reporte"], 400);
  }

  $rid = mysqli_insert_id($enlace);
  mysqli_stmt_close($st);

  audit_log($enlace, $actor, "create", "reportes", (int)$rid, [
    "aula_id"=>$aula_id,"gravedad"=>$gravedad,"reserva_id"=>$reserva_id
  ]);

  json_out(["ok"=>true, "id"=>(int)$rid]);
}

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

/* =========================
   multas
========================= */

if ($action === "multas_list") {
  need_role(["admin","encargado"]);

  $sql = "SELECT m.id, m.fecha, m.motivo, m.gravedad, m.monto,
                 u.nombre_usuario AS usuario,
                 m.reporte_id
          FROM multas m
          JOIN usuarios u ON u.id=m.usuario_id
          ORDER BY m.fecha DESC";
  $rs = mysqli_query($enlace, $sql);
  $rows = [];
  while ($r = mysqli_fetch_assoc($rs)) $rows[] = $r;

  json_out(["ok"=>true, "multas"=>$rows]);
}

if ($action === "multas_create") {
  need_role(["admin","encargado"]);
  $d = body_json();

  $reporte_id = (int)($d["reporte_id"] ?? 0);
  $usuario_id = (int)($d["usuario_id"] ?? 0);
  $motivo = trim((string)($d["motivo"] ?? ""));
  $gravedad = strtolower(trim((string)($d["gravedad"] ?? "baja")));
  $monto = (float)($d["monto"] ?? 0);

  if ($reporte_id < 1 || $usuario_id < 1 || $motivo === "" || $monto <= 0) {
    json_out(["ok"=>false,"error"=>"datos inválidos"], 400);
  }
  if (!in_array($gravedad, ["baja","media","alta"], true)) $gravedad = "baja";

  $actor = (int)$_SESSION["usuario_id"];

  $sql = "INSERT INTO multas(reporte_id,usuario_id,emitida_por,motivo,gravedad,monto)
          VALUES(?,?,?,?,?,?)";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "iiissd", $reporte_id, $usuario_id, $actor, $motivo, $gravedad, $monto);

  if (!mysqli_stmt_execute($st)) {
    $err = mysqli_error($enlace);
    mysqli_stmt_close($st);
    json_out(["ok"=>false,"error"=>$err ?: "no se pudo emitir multa"], 400);
  }
  $mid = mysqli_insert_id($enlace);
  mysqli_stmt_close($st);

  audit_log($enlace, $actor, "create", "multas", (int)$mid, [
    "reporte_id"=>$reporte_id,"usuario_id"=>$usuario_id,"monto"=>$monto,"gravedad"=>$gravedad
  ]);

  json_out(["ok"=>true, "id"=>(int)$mid]);
}

json_out(["ok" => false, "error" => "acción no válida"], 404);
