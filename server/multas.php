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
  $roles = array_map(fn($x)=>strtolower((string)$x), $roles);
  if (!in_array($rol, $roles, true)) json_out(["ok"=>false,"error"=>"no autorizado"], 403);
}

$action = $_GET["action"] ?? "";

if ($action === "list") {
  need_roles(["admin","encargado"]);

  $sql = "SELECT m.id, m.reporte_id, m.usuario_id, m.emitida_por, m.fecha, m.motivo, m.gravedad, m.monto,
                 u.nombre_usuario AS usuario,
                 e.nombre_usuario AS emitida_por_usuario
          FROM multas m
          JOIN usuarios u ON u.id=m.usuario_id
          JOIN usuarios e ON e.id=m.emitida_por
          ORDER BY m.fecha DESC";
  $rs = mysqli_query($enlace, $sql);
  $rows = [];
  while ($x = mysqli_fetch_assoc($rs)) $rows[] = $x;

  json_out(["ok"=>true, "multas"=>$rows]);
}

json_out(["ok"=>false,"error"=>"acción no válida"], 404);
