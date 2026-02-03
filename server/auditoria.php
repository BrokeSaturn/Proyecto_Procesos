<?php
require_once __DIR__ . "/conexion.php";

function audit_log($actor_id, $accion, $tabla, $registro_id = null, $detalle = null) {
  global $enlace;
  $detalle_json = $detalle === null ? null : json_encode($detalle, JSON_UNESCAPED_UNICODE);

  $sql = "INSERT INTO auditoria(actor_id,accion,tabla,registro_id,detalle)
          VALUES (?,?,?,?,?)";
  $st = mysqli_prepare($enlace, $sql);
  mysqli_stmt_bind_param($st, "issis", $actor_id, $accion, $tabla, $registro_id, $detalle_json);
  mysqli_stmt_execute($st);
}
