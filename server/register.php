<?php
ini_set("display_errors", "0");
ini_set("log_errors", "1");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

require_once __DIR__ . "/conexion.php";
require_once __DIR__ . "/util.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  json_out(["ok"=>false,"error"=>"método no permitido"], 405);
}

$d = body_json();

$falta = require_fields($d, ["nombres","apellidos","nombre_usuario","cedula","correo","telefono","password"]);
if ($falta) json_out(["ok"=>false,"error"=>"falta: ".$falta], 400);

$nombres = trim((string)$d["nombres"]);
$apellidos = trim((string)$d["apellidos"]);
$nombre_usuario = trim((string)$d["nombre_usuario"]);
$cedula = trim((string)$d["cedula"]);
$correo = trim((string)$d["correo"]);
$telefono = trim((string)$d["telefono"]);
$password = (string)$d["password"];

if (!email_espe($correo)) json_out(["ok"=>false,"error"=>"correo debe ser @espe.edu.ec"], 400);
if (!cedula_ec_valida($cedula)) json_out(["ok"=>false,"error"=>"cédula inválida"], 400);
if (strlen($nombre_usuario) < 3) json_out(["ok"=>false,"error"=>"nombre_usuario muy corto"], 400);
if (strlen($password) < 6) json_out(["ok"=>false,"error"=>"contraseña muy corta (mín 6)"], 400);

$sql = "SELECT id FROM usuarios WHERE nombre_usuario=? OR cedula=? OR correo=? LIMIT 1";
$st = mysqli_prepare($enlace, $sql);
mysqli_stmt_bind_param($st, "sss", $nombre_usuario, $cedula, $correo);
mysqli_stmt_execute($st);
$rs = mysqli_stmt_get_result($st);
$existe = mysqli_fetch_assoc($rs);
mysqli_stmt_close($st);

if ($existe) json_out(["ok"=>false,"error"=>"usuario/cedula/correo ya existe"], 409);

$rolId = 3;
$rs = mysqli_query($enlace, "SELECT id FROM roles WHERE LOWER(nombre)='usuario' LIMIT 1");
if ($rs) {
  $r = mysqli_fetch_assoc($rs);
  if ($r && (int)$r["id"] > 0) $rolId = (int)$r["id"];
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$sql = "INSERT INTO usuarios(nombres,apellidos,nombre_usuario,cedula,correo,telefono,password_hash,rol_id,activo)
        VALUES(?,?,?,?,?,?,?,?,1)";
$st = mysqli_prepare($enlace, $sql);
mysqli_stmt_bind_param($st, "sssssssi", $nombres, $apellidos, $nombre_usuario, $cedula, $correo, $telefono, $hash, $rolId);

if (!mysqli_stmt_execute($st)) {
  $err = mysqli_error($enlace);
  mysqli_stmt_close($st);
  json_out(["ok"=>false,"error"=>$err ?: "no se pudo registrar"], 400);
}

$newId = (int)mysqli_insert_id($enlace);
mysqli_stmt_close($st);

$_SESSION["usuario_id"] = $newId;

audit_log($enlace, $newId, "register", "usuarios", $newId, ["rol"=>"usuario"]);

$sql = "SELECT u.id,u.nombres,u.apellidos,u.nombre_usuario,u.correo,u.telefono,u.activo,
               r.nombre AS rol
        FROM usuarios u
        JOIN roles r ON r.id=u.rol_id
        WHERE u.id=? LIMIT 1";
$st = mysqli_prepare($enlace, $sql);
mysqli_stmt_bind_param($st, "i", $newId);
mysqli_stmt_execute($st);
$rs = mysqli_stmt_get_result($st);
$me = mysqli_fetch_assoc($rs);
mysqli_stmt_close($st);

json_out(["ok"=>true, "me"=>$me], 201);
