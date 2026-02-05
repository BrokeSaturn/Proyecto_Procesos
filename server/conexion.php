<?php
$servidor = "localhost:3307";
$usuario = "root";
$clave = "1234";
$bd = "proyecto_proce";

$enlace = mysqli_connect($servidor, $usuario, $clave, $bd);
if (!$enlace) {
  http_response_code(500);
  header("Content-Type: application/json; charset=utf-8");
  echo json_encode(["ok"=>false,"error"=>"error de conexión a la base de datos"]);
  exit;
}

mysqli_set_charset($enlace, "utf8mb4");




