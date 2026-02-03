<?php
require_once __DIR__ . "/conexion.php";
require_once __DIR__ . "/util.php";
require_once __DIR__ . "/auditoria.php";

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

$action = $_GET["action"] ?? "";
$d = body_json();

function me() { return $_SESSION["me"] ?? null; }
function require_login() {
  if (empty($_SESSION["me"])) json_out(["ok"=>false,"error"=>"no autenticado"], 401);
}
function require_role($roles) {
  $m = me();
  if (!$m) json_out(["ok"=>false,"error"=>"no autenticado"], 401);
  $rol = strtolower($m["rol"]);
  $roles = array_map("strtolower", $roles);
  if (!in_array($rol, $roles, true)) json_out(["ok"=>false,"error"=>"sin permisos"], 403);
}

function seed_admin_encargado() {
  global $enlace;

  $r = mysqli_query($enlace, "SELECT id FROM roles WHERE nombre='admin' LIMIT 1");
  $admin_role = mysqli_fetch_assoc($r)["id"] ?? null;

  $r = mysqli_query($enlace, "SELECT id FROM roles WHERE nombre='encargado' LIMIT 1");
  $enc_role = mysqli_fetch_assoc($r)["id"] ?? null;

  $st = mysqli_prepare($enlace, "SELECT id FROM usuarios WHERE nombre_usuario='admin' LIMIT 1");
  mysqli_stmt_execute($st);
  $res = mysqli_stmt_get_result($st);
  if (!mysqli_fetch_assoc($res)) {
    $hash = password_hash("1234", PASSWORD_BCRYPT);
    $sql = "INSERT INTO usuarios(nombres,apellidos,nombre_usuario,cedula,correo,telefono,password_hash,rol_id,activo)
            VALUES('admin','admin','admin','0000000000','admin@espe.edu.ec','0000000000',?,?,1)";
    $st2 = mysqli_prepare($enlace, $sql);
    mysqli_stmt_bind_param($st2, "si", $hash, $admin_role);
    mysqli_stmt_execute($st2);
  }

  $st = mysqli_prepare($enlace, "SELECT id FROM usuarios WHERE nombre_usuario='encargado' LIMIT 1");
  mysqli_stmt_execute($st);
  $res = mysqli_stmt_get_result($st);
  if (!mysqli_fetch_assoc($res)) {
    $hash = password_hash("1234", PASSWORD_BCRYPT);
    $sql = "INSERT INTO usuarios(nombres,apellidos,nombre_usuario,cedula,correo,telefono,password_hash,rol_id,activo)
            VALUES('encargado','encargado','encargado','0000000001','encargado@espe.edu.ec','0000000001',?,?,1)";
    $st2 = mysqli_prepare($enlace, $sql);
    mysqli_stmt_bind_param($st2, "si", $hash, $enc_role);
    mysqli_stmt_execute($st2);
  }
}
seed_admin_encargado();

/* ========= auth ========= */
if ($action === "login") {
  global $enlace;

  $miss = require_fields($d, ["nombre_usuario"]);
  if ($miss) json_out(["ok"=>false,"error"=>"falta nombre_usuario"], 400);

  $u = trim($d["nombre_usuario"]);
  $p = (string)($d["password"] ?? "");

  $sql = "SELECT u.id,u.nombres,u.apellidos,u.nombre_usuario,u.activo,u.password_hash,
                 r.nombre AS rol
          FROM usuarios u
          JOIN roles r ON r.id=u.rol_id
          WHERE u.nombre_usuario=? LIMIT 1";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "s", $u);
  mysqli_stmt_execute($st);
  $res = mysqli_stmt_get_result($st);
  $row = mysqli_fetch_assoc($res);

  if (!$row || intval($row["activo"]) !== 1) json_out(["ok"=>false,"error"=>"usuario no válido"], 401);

  $rol = strtolower($row["rol"]);
  $hash = $row["password_hash"];

  if ($rol === "admin" || $rol === "encargado") {
    if (!$hash || !password_verify($p, $hash)) json_out(["ok"=>false,"error"=>"credenciales incorrectas"], 401);
  } else {
    if ($hash && !password_verify($p, $hash)) json_out(["ok"=>false,"error"=>"credenciales incorrectas"], 401);
  }

  $_SESSION["me"] = [
    "id" => intval($row["id"]),
    "nombre_usuario" => $row["nombre_usuario"],
    "nombres" => $row["nombres"],
    "apellidos" => $row["apellidos"],
    "rol" => $row["rol"]
  ];

  audit_log($_SESSION["me"]["id"], "login", "usuarios", $_SESSION["me"]["id"], ["rol"=>$row["rol"]]);
  json_out(["ok"=>true, "me"=>$_SESSION["me"]]);
}

if ($action === "logout") {
  $m = me();
  if ($m) audit_log($m["id"], "logout", "usuarios", $m["id"], null);
  session_destroy();
  json_out(["ok"=>true]);
}

if ($action === "register") {
  global $enlace;

  $miss = require_fields($d, ["nombres","apellidos","nombre_usuario","cedula","correo","telefono"]);
  if ($miss) json_out(["ok"=>false,"error"=>"falta ".$miss], 400);

  $correo = trim($d["correo"]);
  $ced = trim($d["cedula"]);

  if (!email_espe($correo)) json_out(["ok"=>false,"error"=>"correo debe ser @espe.edu.ec"], 400);
  if (!cedula_ec_valida($ced)) json_out(["ok"=>false,"error"=>"cédula no válida"], 400);

  $r = mysqli_query($enlace, "SELECT id FROM roles WHERE nombre='usuario' LIMIT 1");
  $rol_id = mysqli_fetch_assoc($r)["id"] ?? null;

  $pass = (string)($d["password"] ?? "");
  $hash = $pass !== "" ? password_hash($pass, PASSWORD_BCRYPT) : null;

  $sql = "INSERT INTO usuarios(nombres,apellidos,nombre_usuario,cedula,correo,telefono,password_hash,rol_id,activo)
          VALUES(?,?,?,?,?,?,?,?,1)";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param(
    $st,
    "sssssssi",
    $d["nombres"], $d["apellidos"], $d["nombre_usuario"], $ced, $correo, $d["telefono"], $hash, $rol_id
  );

  if (!mysqli_stmt_execute($st)) json_out(["ok"=>false,"error"=>"no se pudo registrar (usuario/correo/cédula ya existen)"], 409);

  $id = mysqli_insert_id($enlace);
  audit_log($id, "create", "usuarios", $id, ["registro"=>"usuario"]);
  json_out(["ok"=>true, "id"=>$id]);
}

/* ========= aulas ========= */
if ($action === "aulas_list") {
  require_login();
  global $enlace;

  $q = mysqli_query($enlace, "SELECT id,codigo,nombre,capacidad,estado FROM aulas ORDER BY nombre");
  $rows = [];
  while ($r = mysqli_fetch_assoc($q)) $rows[] = $r;
  json_out(["ok"=>true,"aulas"=>$rows]);
}

if ($action === "aulas_create") {
  require_role(["admin"]);
  global $enlace;

  $miss = require_fields($d, ["codigo","nombre","capacidad"]);
  if ($miss) json_out(["ok"=>false,"error"=>"falta ".$miss], 400);

  $estado = $d["estado"] ?? "disponible";
  $cap = intval($d["capacidad"]);
  $sql = "INSERT INTO aulas(codigo,nombre,capacidad,estado) VALUES(?,?,?,?)";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "ssis", $d["codigo"], $d["nombre"], $cap, $estado);

  if (!mysqli_stmt_execute($st)) json_out(["ok"=>false,"error"=>"no se pudo crear aula (código duplicado)"], 409);

  $id = mysqli_insert_id($enlace);
  audit_log(me()["id"], "create", "aulas", $id, $d);
  json_out(["ok"=>true,"id"=>$id]);
}

/* ========= franjas ========= */
if ($action === "franjas_list") {
  require_login();
  global $enlace;

  $q = mysqli_query($enlace, "SELECT id, hora_inicio, hora_fin FROM franjas ORDER BY hora_inicio");
  $rows = [];
  while ($r = mysqli_fetch_assoc($q)) $rows[] = $r;
  json_out(["ok"=>true,"franjas"=>$rows]);
}

/* ========= reservas ========= */
if ($action === "reservas_list") {
  require_login();
  global $enlace;
  $m = me();

  $scope = $_GET["scope"] ?? "mine";
  if ($scope === "all") require_role(["admin","encargado"]);

  $where = $scope === "all" ? "" : "WHERE r.usuario_id=" . intval($m["id"]);

  $sql = "SELECT r.id,r.fecha,r.estado,r.codigo_checkin,r.checkin_validado,r.checkin_validado_en,
                 a.nombre AS aula, f.hora_inicio, f.hora_fin,
                 u.nombre_usuario AS usuario
          FROM reservas r
          JOIN aulas a ON a.id=r.aula_id
          JOIN franjas f ON f.id=r.franja_id
          JOIN usuarios u ON u.id=r.usuario_id
          $where
          ORDER BY r.fecha DESC, f.hora_inicio ASC";
  $q = mysqli_query($enlace, $sql);
  $rows = [];
  while ($r = mysqli_fetch_assoc($q)) $rows[] = $r;

  json_out(["ok"=>true,"reservas"=>$rows]);
}

if ($action === "reservas_create") {
  require_role(["usuario","admin","encargado"]);
  global $enlace;

  $miss = require_fields($d, ["aula_id","fecha","franja_id"]);
  if ($miss) json_out(["ok"=>false,"error"=>"falta ".$miss], 400);

  $m = me();
  $usuario_id = intval($m["id"]);
  $aula_id = intval($d["aula_id"]);
  $franja_id = intval($d["franja_id"]);
  $fecha = $d["fecha"];

  $codigo = null;
  for ($i=0;$i<10;$i++){
    $c = gen_checkin_code();
    $st = mysqli_prepare($enlace, "SELECT id FROM reservas WHERE codigo_checkin=? LIMIT 1");
    mysqli_stmt_bind_param($st, "s", $c);
    mysqli_stmt_execute($st);
    $res = mysqli_stmt_get_result($st);
    if (!mysqli_fetch_assoc($res)) { $codigo = $c; break; }
  }
  if (!$codigo) json_out(["ok"=>false,"error"=>"no se pudo generar código"], 500);

  $sql = "INSERT INTO reservas(usuario_id,aula_id,fecha,franja_id,codigo_checkin)
          VALUES(?,?,?,?,?)";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "iiiss", $usuario_id, $aula_id, $fecha, $franja_id, $codigo);

  if (!mysqli_stmt_execute($st)) {
    $err = mysqli_error($enlace);
    if (stripos($err, "limite de 3 reservas") !== false) json_out(["ok"=>false,"error"=>"limite de 3 reservas por semana"], 409);
    if (stripos($err, "UNIQUE") !== false) json_out(["ok"=>false,"error"=>"aula ya reservada en esa franja"], 409);
    json_out(["ok"=>false,"error"=>"no se pudo reservar"], 500);
  }

  $id = mysqli_insert_id($enlace);
  audit_log($usuario_id, "create", "reservas", $id, ["aula_id"=>$aula_id,"fecha"=>$fecha,"franja_id"=>$franja_id,"codigo"=>$codigo]);
  json_out(["ok"=>true,"id"=>$id,"codigo_checkin"=>$codigo]);
}

if ($action === "checkin_validate") {
  require_role(["encargado","admin"]);
  global $enlace;

  $miss = require_fields($d, ["codigo"]);
  if ($miss) json_out(["ok"=>false,"error"=>"falta codigo"], 400);

  $codigo = trim($d["codigo"]);
  $validador = me()["id"];

  $st = mysqli_prepare($enlace, "SELECT id, checkin_validado FROM reservas WHERE codigo_checkin=? LIMIT 1");
  mysqli_stmt_bind_param($st, "s", $codigo);
  mysqli_stmt_execute($st);
  $res = mysqli_stmt_get_result($st);
  $row = mysqli_fetch_assoc($res);

  if (!$row) json_out(["ok"=>false,"error"=>"código no existe"], 404);
  if (intval($row["checkin_validado"]) === 1) json_out(["ok"=>true,"ya_validado"=>true]);

  $sql2 = "UPDATE reservas SET checkin_validado=1, checkin_validado_por=?, checkin_validado_en=NOW() WHERE id=?";
  $st2 = mysqli_prepare($enlace, $sql2);
  $rid = intval($row["id"]);
  mysqli_stmt_bind_param($st2, "ii", $validador, $rid);
  mysqli_stmt_execute($st2);

  audit_log($validador, "checkin", "reservas", $rid, ["codigo"=>$codigo]);
  json_out(["ok"=>true,"validado"=>true]);
}

/* ========= reportes ========= */
if ($action === "reportes_create") {
  require_login();
  global $enlace;

  $miss = require_fields($d, ["aula_id","descripcion","gravedad"]);
  if ($miss) json_out(["ok"=>false,"error"=>"falta ".$miss], 400);

  $m = me();
  $reportante = intval($m["id"]);
  $aula_id = intval($d["aula_id"]);
  $reserva_id = isset($d["reserva_id"]) ? intval($d["reserva_id"]) : null;
  $desc = $d["descripcion"];
  $grav = $d["gravedad"];

  $sql = "INSERT INTO reportes(reportante_id,reserva_id,aula_id,descripcion,gravedad)
          VALUES(?,?,?,?,?)";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "iiiss", $reportante, $reserva_id, $aula_id, $desc, $grav);

  if (!mysqli_stmt_execute($st)) json_out(["ok"=>false,"error"=>"no se pudo crear reporte"], 500);

  $id = mysqli_insert_id($enlace);
  audit_log($reportante, "create", "reportes", $id, ["aula_id"=>$aula_id,"gravedad"=>$grav]);
  json_out(["ok"=>true,"id"=>$id]);
}

if ($action === "reportes_list") {
  require_role(["encargado","admin"]);
  global $enlace;

  $sql = "SELECT rp.id,rp.fecha,rp.descripcion,rp.gravedad,rp.estado,
                 u.nombre_usuario AS reportante,
                 a.nombre AS aula
          FROM reportes rp
          JOIN usuarios u ON u.id=rp.reportante_id
          JOIN aulas a ON a.id=rp.aula_id
          ORDER BY rp.fecha DESC";
  $q = mysqli_query($enlace, $sql);
  $rows = [];
  while ($r = mysqli_fetch_assoc($q)) $rows[] = $r;
  json_out(["ok"=>true,"reportes"=>$rows]);
}

if ($action === "reportes_resolver") {
  require_role(["encargado","admin"]);
  global $enlace;

  $miss = require_fields($d, ["id"]);
  if ($miss) json_out(["ok"=>false,"error"=>"falta id"], 400);

  $id = intval($d["id"]);
  mysqli_query($enlace, "UPDATE reportes SET estado='resuelto' WHERE id=$id");
  audit_log(me()["id"], "update", "reportes", $id, ["estado"=>"resuelto"]);
  json_out(["ok"=>true]);
}

/* ========= multas ========= */
if ($action === "multas_create") {
  require_role(["encargado","admin"]);
  global $enlace;

  $miss = require_fields($d, ["reporte_id","usuario_id","motivo","gravedad","monto"]);
  if ($miss) json_out(["ok"=>false,"error"=>"falta ".$miss], 400);

  $emitida_por = me()["id"];
  $reporte_id = intval($d["reporte_id"]);
  $usuario_id = intval($d["usuario_id"]);
  $motivo = $d["motivo"];
  $gravedad = $d["gravedad"];
  $monto = floatval($d["monto"]);

  $sql = "INSERT INTO multas(reporte_id,usuario_id,emitida_por,motivo,gravedad,monto)
          VALUES(?,?,?,?,?,?)";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "iiissd", $reporte_id, $usuario_id, $emitida_por, $motivo, $gravedad, $monto);

  if (!mysqli_stmt_execute($st)) json_out(["ok"=>false,"error"=>"no se pudo emitir multa"], 500);

  $id = mysqli_insert_id($enlace);
  audit_log($emitida_por, "create", "multas", $id, ["reporte_id"=>$reporte_id,"usuario_id"=>$usuario_id,"monto"=>$monto]);

  mysqli_query($enlace, "UPDATE reportes SET estado='resuelto' WHERE id=$reporte_id");

  json_out(["ok"=>true,"id"=>$id]);
}

if ($action === "multas_list") {
  require_role(["encargado","admin"]);
  global $enlace;

  $sql = "SELECT m.id,m.fecha,m.motivo,m.gravedad,m.monto,
                 u.nombre_usuario AS usuario,
                 e.nombre_usuario AS emitida_por
          FROM multas m
          JOIN usuarios u ON u.id=m.usuario_id
          JOIN usuarios e ON e.id=m.emitida_por
          ORDER BY m.fecha DESC";
  $q = mysqli_query($enlace, $sql);
  $rows = [];
  while ($r = mysqli_fetch_assoc($q)) $rows[] = $r;
  json_out(["ok"=>true,"multas"=>$rows]);
}

/* ========= usuarios crud (admin) ========= */
if ($action === "usuarios_list") {
  require_role(["admin"]);
  global $enlace;

  $sql = "SELECT u.id,u.nombres,u.apellidos,u.nombre_usuario,u.cedula,u.correo,u.telefono,u.activo,
                 r.nombre AS rol
          FROM usuarios u
          JOIN roles r ON r.id=u.rol_id
          ORDER BY u.id DESC";
  $q = mysqli_query($enlace, $sql);
  $rows = [];
  while ($r = mysqli_fetch_assoc($q)) $rows[] = $r;
  json_out(["ok"=>true,"usuarios"=>$rows]);
}

if ($action === "usuarios_delete") {
  require_role(["admin"]);
  global $enlace;

  $miss = require_fields($d, ["id"]);
  if ($miss) json_out(["ok"=>false,"error"=>"falta id"], 400);

  $id = intval($d["id"]);
  mysqli_query($enlace, "UPDATE usuarios SET activo=0, actualizado_en=NOW() WHERE id=$id");
  audit_log(me()["id"], "delete_soft", "usuarios", $id, ["activo"=>0]);
  json_out(["ok"=>true]);
}

json_out(["ok"=>false,"error"=>"acción no válida"], 404);
